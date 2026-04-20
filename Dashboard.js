import React, { useEffect, useState, useCallback } from "react";
import {
    StyleSheet, Text, TouchableOpacity, View,
    ScrollView, StatusBar, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { useProfileStore } from "../store/profile";
import { useNotificationStore } from "../store/notification";
import { useAuthContext } from "../context";
import { API_BASE_URL } from "../utils/apiBase";

const API   = API_BASE_URL;
const BRAND = "#4F46E5";
const BG    = "#F5F7FA";
const CARD  = "#FFFFFF";

// Secondary features -- accessible but not shouted
const MORE_FEATURES = [
    { label: "Profile",    screen: "Profile",             icon: "person-circle-outline",   color: "#4F46E5", bg: "#EEF2FF" },
    { label: "Leave",      screen: "LeaveLog",            icon: "calendar-number-outline", color: "#8B5CF6", bg: "#EDE9FE" },
    { label: "Room",       screen: "RoomAllocation",      icon: "bed-outline",             color: "#0EA5E9", bg: "#E0F2FE" },
    { label: "Transport",  screen: "TransportManagement", icon: "bus-outline",             color: "#06B6D4", bg: "#CFFAFE" },
    { label: "Billing & Invoice", screen: "BillingInvoice", icon: "receipt-outline",         color: "#10B981", bg: "#D1FAE5" },
    { label: "Complaints", screen: "ComplaintBox",        icon: "chatbubble-ellipses-outline", color: "#EF4444", bg: "#FEE2E2" },
    { label: "Review",     screen: "Review",              icon: "star-outline",            color: "#6366F1", bg: "#E0E7FF" },
    { label: "Nearby",     screen: "NearbyHostels",       icon: "location-outline",        color: "#EC4899", bg: "#FCE7F3" },
];

export default function Dashboard({ navigation }) {
    const user                                   = useProfileStore((s) => s.profile);
    const { token }                              = useAuthContext();
    const { unreadCount, fetchNotifications }    = useNotificationStore();

    const [dues,       setDues]       = useState(null);   // { amount, dueDate, hasExtraMess? }
    const [monthEst,   setMonthEst]   = useState(null);   // estimate strip when no challan yet / running mess
    const [attendance, setAttendance] = useState(null);   // { percentage, present, total }
    const [nextBus,    setNextBus]    = useState(null);   // { routeName, departureTime }
    const [loading,    setLoading]    = useState(true);

    const loadData = useCallback(async () => {
        if (!token) return;
        const h = { Authorization: `Bearer ${token}` };

        const [challanRes, transportRes, attRes, overviewRes] = await Promise.allSettled([
            axios.get(`${API}/challan/my`, { headers: h }),
            axios.get(`${API}/transport`,  { headers: h }),
            axios.get(`${API}/attendance`, { headers: h }),
            axios.get(`${API}/challan/my-month-overview`, { headers: h }),
        ]);

        setDues(null);
        setMonthEst(null);

        const o = overviewRes.status === "fulfilled" ? overviewRes.value.data : null;
        if (o) {
            if (o.monthlyChallan?.status === "unpaid") {
                setDues({
                    amount: o.balanceWithChallan ?? o.monthlyChallan.totalAmount,
                    dueDate: o.monthlyChallan.dueDate,
                    hasExtraMess: (o.messUnbilledTotal ?? 0) > 0,
                });
            } else if (o.phase === "month_open" && o.projectedTotalNoChallanYet != null) {
                setMonthEst({
                    kind: "projected",
                    month: o.month,
                    projected: o.projectedTotalNoChallanYet,
                    roomRent: o.roomRent,
                    mess: o.messUnbilledTotal,
                });
            } else if (o.phase === "monthly_paid" && (o.messUnbilledTotal ?? 0) > 0) {
                setMonthEst({
                    kind: "running_mess",
                    month: o.month,
                    mess: o.messUnbilledTotal,
                });
            }
        } else if (challanRes.status === "fulfilled") {
            const list = challanRes.value.data?.challans ?? [];
            const unpaid = list.filter((c) => c.status !== "paid");
            if (unpaid.length > 0) {
                const c = unpaid[0];
                setDues({ amount: c.totalAmount, dueDate: c.dueDate, hasExtraMess: false });
            }
        }

        // Next bus: first route alphabetically
        if (transportRes.status === "fulfilled") {
            const routes = transportRes.value.data ?? [];
            if (routes.length > 0) {
                setNextBus({ routeName: routes[0].routeName, departureTime: routes[0].departureTime });
            }
        }

        // Attendance percentage
        if (attRes.status === "fulfilled") {
            const records = attRes.value.data ?? [];
            if (records.length > 0) {
                const present = records.filter(r => r.status === "present").length;
                setAttendance({ percentage: Math.round((present / records.length) * 100), present, total: records.length });
            }
        }

        setLoading(false);
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchNotifications(token);
            loadData();
        }
    }, [token]);

    if (!user) return (
        <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={BRAND} />
        </View>
    );

    const sapId     = user.email?.split("@")[0] ?? "";
    const initials  = user.fullName?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "S";
    const firstName = user.fullName?.split(" ")[0] ?? "Student";

    const attColor = attendance
        ? attendance.percentage >= 75 ? "#10B981" : "#EF4444"
        : "#9CA3AF";

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={BRAND} />

            {/* ── HEADER: identity, not navigation ── */}
            <View style={styles.header}>
                <SafeAreaView edges={["top"]} style={styles.headerInner}>
                    <View style={styles.topRow}>
                        <TouchableOpacity
                            style={styles.profileArea}
                            onPress={() => navigation.navigate("Profile")}
                            activeOpacity={0.8}
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                            <View>
                                <Text style={styles.greeting}>Good to see you,</Text>
                                <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.bellBtn}
                            onPress={() => navigation.navigate("NotificationsAlerts")}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="notifications-outline" size={20} color={BRAND} />
                            {unreadCount > 0 && (
                                <View style={styles.bellBadge}>
                                    <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Meta -- small, secondary info */}
                    <View style={styles.metaRow}>
                        <Text style={styles.metaText}>SAP {sapId}</Text>
                        {user.room?.roomNumber && (
                            <>
                                <View style={styles.metaDot} />
                                <Text style={styles.metaText}>Room {user.room.roomNumber}</Text>
                            </>
                        )}
                        <View style={styles.metaDot} />
                        <Text style={styles.activeChip}>Active</Text>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                {/* ════════════════════════════════════════
                    ZONE 1 -- HIGH PRIORITY
                    Dues alert dominates when present.
                    When clear, small calm banner.
                    User knows immediately: action needed or not.
                ════════════════════════════════════════ */}

                {loading ? (
                    <View style={styles.skeletonBanner} />
                ) : dues ? (
                    <TouchableOpacity
                        style={styles.duesBanner}
                        onPress={() => navigation.navigate("BillingInvoice")}
                        activeOpacity={0.88}
                    >
                        <View style={styles.duesIconWrap}>
                            <Ionicons name="alert-circle" size={24} color="#fff" />
                        </View>
                        <View style={styles.duesBody}>
                            <Text style={styles.duesTitle}>Pending Payment</Text>
                            <Text style={styles.duesAmount}>PKR {(dues.amount ?? 0).toLocaleString()}</Text>
                            {dues.dueDate && (
                                <Text style={styles.duesMeta}>
                                    Due {new Date(dues.dueDate).toLocaleDateString("en-PK", { month: "long", day: "numeric" })}
                                </Text>
                            )}
                            {dues.hasExtraMess ? (
                                <Text style={styles.duesMeta}>Includes monthly challan + new mess logged this month</Text>
                            ) : null}
                        </View>
                        <View style={styles.duesCta}>
                            <Text style={styles.duesCtaText}>View</Text>
                            <Ionicons name="chevron-forward" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                ) : monthEst?.kind === "projected" ? (
                    <TouchableOpacity
                        style={styles.estimateBanner}
                        onPress={() => navigation.navigate("BillingInvoice")}
                        activeOpacity={0.88}
                    >
                        <View style={styles.estimateIconWrap}>
                            <Ionicons name="calculator-outline" size={22} color="#312E81" />
                        </View>
                        <View style={styles.duesBody}>
                            <Text style={styles.estimateTitle}>Estimated · {monthEst.month}</Text>
                            <Text style={styles.estimateAmount}>PKR {(monthEst.projected ?? 0).toLocaleString()}</Text>
                            <Text style={styles.estimateMeta}>
                                Room PKR {(monthEst.roomRent ?? 0).toLocaleString()} + mess PKR {(monthEst.mess ?? 0).toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.duesCta}>
                            <Text style={[styles.duesCtaText, { color: "#312E81" }]}>Details</Text>
                            <Ionicons name="chevron-forward" size={14} color="#312E81" />
                        </View>
                    </TouchableOpacity>
                ) : monthEst?.kind === "running_mess" ? (
                    <TouchableOpacity
                        style={styles.runningMessBanner}
                        onPress={() => navigation.navigate("BillingInvoice")}
                        activeOpacity={0.88}
                    >
                        <Ionicons name="restaurant-outline" size={18} color="#C2410C" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.runningMessTitle}>Running mess · {monthEst.month}</Text>
                            <Text style={styles.runningMessAmt}>PKR {(monthEst.mess ?? 0).toLocaleString()} unbilled</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#EA580C" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.clearBanner}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.clearText}>No pending dues</Text>
                    </View>
                )}


                {/* ════════════════════════════════════════
                    ZONE 2 -- CONTEXT
                    Two status cards. Informational, not nav.
                    User understands their standing at a glance.
                    Size difference: attendance bigger = more important.
                ════════════════════════════════════════ */}

                <View style={styles.statusRow}>
                    {/* Attendance -- wider, more critical */}
                    <TouchableOpacity
                        style={[styles.statusCard, { flex: 1.15 }]}
                        onPress={() => navigation.navigate("Attendance")}
                        activeOpacity={0.85}
                    >
                        <View style={styles.statusCardTop}>
                            <View style={[styles.statusIconBox, { backgroundColor: "#EEF2FF" }]}>
                                <Ionicons name="calendar-outline" size={15} color={BRAND} />
                            </View>
                            <Text style={styles.statusLabel}>Attendance</Text>
                        </View>
                        {attendance ? (
                            <>
                                <Text style={[styles.statusBigValue, { color: attColor }]}>
                                    {attendance.percentage}%
                                </Text>
                                <View style={styles.progressTrack}>
                                    <View style={[styles.progressFill, {
                                        width: `${attendance.percentage}%`,
                                        backgroundColor: attColor,
                                    }]} />
                                </View>
                                <Text style={styles.statusSubText}>{attendance.present} of {attendance.total} days</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.statusBigValue}>--</Text>
                                <Text style={styles.statusSubText}>Tap to view</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Next bus -- narrower, time info only */}
                    <TouchableOpacity
                        style={[styles.statusCard, { flex: 1 }]}
                        onPress={() => navigation.navigate("TransportManagement")}
                        activeOpacity={0.85}
                    >
                        <View style={styles.statusCardTop}>
                            <View style={[styles.statusIconBox, { backgroundColor: "#CFFAFE" }]}>
                                <Ionicons name="bus-outline" size={15} color="#06B6D4" />
                            </View>
                            <Text style={styles.statusLabel}>Next Bus</Text>
                        </View>
                        {nextBus ? (
                            <>
                                <Text style={styles.statusBigValue}>{nextBus.departureTime}</Text>
                                <Text style={styles.statusSubText} numberOfLines={2}>{nextBus.routeName}</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.statusBigValue}>--</Text>
                                <Text style={styles.statusSubText}>No routes</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>


                {/* ════════════════════════════════════════
                    ZONE 3 -- PRIMARY ACTIONS (3 max)
                    List rows, not a grid.
                    Each has a title + descriptive sub-label.
                    User knows exactly what each action does.
                    No guessing from icon alone.
                ════════════════════════════════════════ */}

                <Text style={styles.zoneLabel}>Quick Actions</Text>

                {[
                    {
                        icon: "finger-print-outline",
                        bg: "#EEF2FF", color: BRAND,
                        title: "Mark Attendance",
                        sub: "Scan the warden QR to check in",
                        screen: "Attendance",
                    },
                    {
                        icon: "restaurant-outline",
                        bg: "#FFEDD5", color: "#F97316",
                        title: "Mess",
                        sub: "View today's menu and meal schedule",
                        screen: "Mess",
                    },
                    {
                        icon: "construct-outline",
                        bg: "#FEF3C7", color: "#F59E0B",
                        title: "Services",
                        sub: "Request maintenance or room services",
                        screen: "Services",
                    },
                ].map((action) => (
                    <TouchableOpacity
                        key={action.screen}
                        style={styles.actionRow}
                        onPress={() => navigation.navigate(action.screen)}
                        activeOpacity={0.85}
                    >
                        <View style={[styles.actionIconBox, { backgroundColor: action.bg }]}>
                            <Ionicons name={action.icon} size={22} color={action.color} />
                        </View>
                        <View style={styles.actionBody}>
                            <Text style={styles.actionTitle}>{action.title}</Text>
                            <Text style={styles.actionSub}>{action.sub}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                ))}


                {/* ════════════════════════════════════════
                    ZONE 4 -- EVERYTHING ELSE
                    Horizontal scroll. Small chips.
                    Visually de-emphasized. There when needed,
                    not competing for attention.
                ════════════════════════════════════════ */}

                <Text style={styles.zoneLabel}>More</Text>

                <View style={styles.moreGrid}>
                    {MORE_FEATURES.map((f) => (
                        <TouchableOpacity
                            key={f.screen}
                            style={styles.moreGridTile}
                            onPress={() => navigation.navigate(f.screen)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.moreTileIcon, { backgroundColor: f.bg ?? "#F3F4F6" }]}>
                                <Ionicons name={f.icon} size={20} color={f.color} />
                            </View>
                            <Text style={styles.moreTileLabel}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root:       { flex: 1, backgroundColor: BG },
    loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },

    // ── Header
    header:      { backgroundColor: BRAND, paddingBottom: 18 },
    headerInner: { paddingHorizontal: 20, paddingTop: 8 },
    topRow: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 12,
    },
    profileArea: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 12 },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
        alignItems: "center", justifyContent: "center",
    },
    avatarText: { color: "#fff", fontSize: 15, fontWeight: "800" },
    greeting:   { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500" },
    name:       { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 1 },
    bellBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "#fff",
        alignItems: "center", justifyContent: "center",
    },
    bellBadge: {
        position: "absolute", top: -2, right: -2,
        backgroundColor: "#EF4444",
        borderRadius: 10, minWidth: 18, height: 18,
        alignItems: "center", justifyContent: "center",
        paddingHorizontal: 3,
        borderWidth: 1.5, borderColor: "#fff",
    },
    bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
    metaRow:    { flexDirection: "row", alignItems: "center", gap: 7 },
    metaDot:    { width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" },
    metaText:   { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500" },
    activeChip: { color: "#A7F3D0", fontSize: 12, fontWeight: "700" },

    // ── Scroll
    scroll:       { flex: 1 },
    scrollContent:{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

    // ── Zone 1: Dues
    skeletonBanner: {
        height: 84, backgroundColor: "#E5E7EB",
        borderRadius: 16, marginBottom: 14,
    },
    duesBanner: {
        backgroundColor: "#EF4444",
        borderRadius: 16, padding: 16,
        flexDirection: "row", alignItems: "center", gap: 14,
        marginBottom: 14,
        shadowColor: "#EF4444",
        shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14,
        elevation: 8,
    },
    duesIconWrap: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center", justifyContent: "center",
    },
    duesBody:     { flex: 1 },
    duesTitle:    { color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" },
    duesAmount:   { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 1 },
    duesMeta:     { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 },
    duesCta:      { flexDirection: "row", alignItems: "center", gap: 2 },
    duesCtaText:  { color: "#fff", fontSize: 13, fontWeight: "700" },

    clearBanner: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#ECFDF5",
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        marginBottom: 14,
        borderWidth: 1, borderColor: "#D1FAE5",
    },
    clearText: { color: "#065F46", fontSize: 13, fontWeight: "600" },

    estimateBanner: {
        backgroundColor: "#EEF2FF",
        borderRadius: 16, padding: 16,
        flexDirection: "row", alignItems: "center", gap: 14,
        marginBottom: 14,
        borderWidth: 1, borderColor: "#C7D2FE",
    },
    estimateIconWrap: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "#E0E7FF",
        alignItems: "center", justifyContent: "center",
    },
    estimateTitle: { color: "#3730A3", fontSize: 11, fontWeight: "700" },
    estimateAmount: { color: "#1E1B4B", fontSize: 20, fontWeight: "800", marginTop: 2 },
    estimateMeta: { color: "#6366F1", fontSize: 11, marginTop: 3, fontWeight: "500" },

    runningMessBanner: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: "#FFF7ED",
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
        marginBottom: 14,
        borderWidth: 1, borderColor: "#FDBA74",
    },
    runningMessTitle: { color: "#9A3412", fontSize: 12, fontWeight: "700" },
    runningMessAmt: { color: "#C2410C", fontSize: 15, fontWeight: "800", marginTop: 2 },

    // ── Zone 2: Status cards
    statusRow:  { flexDirection: "row", gap: 12, marginBottom: 22 },
    statusCard: {
        backgroundColor: CARD,
        borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: "#F0F0F0",
        shadowColor: "#000", shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
    },
    statusCardTop:  { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
    statusIconBox:  { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    statusLabel:    { fontSize: 10, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
    statusBigValue: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 6 },
    progressTrack:  { height: 4, backgroundColor: "#F3F4F6", borderRadius: 2, marginBottom: 6, overflow: "hidden" },
    progressFill:   { height: "100%", borderRadius: 2 },
    statusSubText:  { fontSize: 11, color: "#9CA3AF", fontWeight: "500" },

    // ── Zone 3: Zone labels
    zoneLabel: {
        fontSize: 12, fontWeight: "800", color: "#6B7280",
        textTransform: "uppercase", letterSpacing: 0.8,
        marginBottom: 10,
    },

    // ── Zone 3: Action rows (list, not grid)
    actionRow: {
        backgroundColor: CARD,
        borderRadius: 14, padding: 14,
        flexDirection: "row", alignItems: "center", gap: 14,
        marginBottom: 10,
        borderWidth: 1, borderColor: "#F3F4F6",
        shadowColor: "#000", shadowOpacity: 0.03,
        shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1,
    },
    actionIconBox: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    actionBody:    { flex: 1 },
    actionTitle:   { fontSize: 14, fontWeight: "700", color: "#111827" },
    actionSub:     { fontSize: 12, color: "#9CA3AF", marginTop: 2, lineHeight: 17 },

    // ── Zone 4: More grid
    moreGrid: {
        flexDirection: "row", flexWrap: "wrap", gap: 12,
    },
    moreGridTile: {
        width: "22%",
        backgroundColor: CARD,
        borderRadius: 14, paddingVertical: 14,
        alignItems: "center", gap: 8,
        borderWidth: 1, borderColor: "#F0F0F0",
        shadowColor: "#000", shadowOpacity: 0.03,
        shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1,
    },
    moreTileIcon: {
        width: 40, height: 40, borderRadius: 11,
        alignItems: "center", justifyContent: "center",
    },
    moreTileLabel: { fontSize: 11, fontWeight: "700", color: "#374151" },
});
