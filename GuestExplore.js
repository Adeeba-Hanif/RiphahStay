import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { messMenu, transportRoutes as fallbackTransportRoutes, nearbyGirlsHostels } from "../dummyData";
import { API_BASE_URL } from "../utils/apiBase";

const BRAND = "#4F46E5";
const BG    = "#F5F7FA";
const CARD  = "#FFFFFF";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABEL = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };

const HOSTEL_FEATURES = [
    { icon: "wifi-outline",          label: "Free Wi-Fi",           desc: "High-speed internet in all rooms" },
    { icon: "shield-checkmark-outline", label: "24/7 Security",    desc: "CCTV and warden supervision" },
    { icon: "flash-outline",         label: "Generator Backup",     desc: "Uninterrupted power supply" },
    { icon: "restaurant-outline",    label: "Mess Facility",        desc: "3 meals/day with weekly menu" },
    { icon: "car-outline",           label: "Transport",            desc: "University bus service daily" },
    { icon: "water-outline",         label: "Laundry",              desc: "Paid laundry & ironing service" },
];

const PRICING = [
    { type: "Single Room",  price: "PKR 100,000/mo",  note: "Floor A · 1 bed" },
    { type: "Double Room",  price: "PKR 100,000/mo",  note: "Floor B · 2 beds" },
    { type: "Triple Room",  price: "PKR 100,000/mo",  note: "Floor C · 3 beds" },
];

const TABS = ["Features", "Pricing", "Mess", "Transport"];

export default function GuestExplore({ navigation }) {
    const [activeTab,  setActiveTab]  = useState("Features");
    const [activeDay,  setActiveDay]  = useState("monday");
    const [apiRoutes, setApiRoutes] = useState(null);

    const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/transport/public`);
                const list = res.data?.routes;
                if (!cancelled && Array.isArray(list) && list.length > 0) {
                    setApiRoutes(list);
                }
            } catch {
                if (!cancelled) setApiRoutes(null);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={BRAND} />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView edges={["top"]} style={styles.headerInner}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
                            <Ionicons name="chevron-back" size={22} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>Explore RiphahStay</Text>
                            <Text style={styles.headerSub}>Browsing as Guest</Text>
                        </View>
                        <View style={{ width: 36 }} />
                    </View>

                    {/* Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
                        {TABS.map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.tabActive]}
                                onPress={() => setActiveTab(tab)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <Text style={styles.sectionTitle}>Nearby girls&apos; hostels</Text>
                <Text style={styles.nearbyIntro}>
                    15 women-only hostels near Riphah International University, Gulberg Greens, Islamabad — same demo list as the map (scroll cards horizontally).
                </Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.nearbyCarousel}
                    contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
                >
                    {nearbyGirlsHostels.map((h) => (
                        <View key={h.id} style={styles.nearbyCard}>
                            <Text style={styles.nearbyCardName} numberOfLines={2}>{h.name}</Text>
                            <Text style={styles.nearbyCardLoc} numberOfLines={2}>{h.location}</Text>
                            <Text style={styles.nearbyCardRate}>Rs. {h.averageRate.toLocaleString()}/mo · ★ {h.rating.toFixed(1)}</Text>
                        </View>
                    ))}
                </ScrollView>
                <View style={styles.nearbyActions}>
                    <TouchableOpacity
                        style={styles.nearbyBtnPrimary}
                        onPress={() => navigation.navigate("GuestNearbyHostels", { initialAudience: "girls" })}
                        activeOpacity={0.88}
                    >
                        <Ionicons name="map-outline" size={18} color="#fff" />
                        <Text style={styles.nearbyBtnPrimaryText}>Open map · girls&apos; hostels</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.nearbyBtnSecondary}
                        onPress={() => navigation.navigate("GuestNearbyHostels", { initialAudience: "all" })}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.nearbyBtnSecondaryText}>All nearby hostels on map</Text>
                        <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
                    </TouchableOpacity>
                </View>

                {/* ── Features tab ── */}
                {activeTab === "Features" && (
                    <>
                        <Text style={styles.sectionTitle}>Hostel Facilities</Text>
                        {HOSTEL_FEATURES.map((f) => (
                            <View key={f.label} style={styles.featureRow}>
                                <View style={styles.featureIconBox}>
                                    <Ionicons name={f.icon} size={20} color={BRAND} />
                                </View>
                                <View style={styles.featureBody}>
                                    <Text style={styles.featureLabel}>{f.label}</Text>
                                    <Text style={styles.featureDesc}>{f.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </>
                )}

                {/* ── Pricing tab ── */}
                {activeTab === "Pricing" && (
                    <>
                        <Text style={styles.sectionTitle}>Room Pricing</Text>
                        {PRICING.map((p) => (
                            <View key={p.type} style={styles.pricingCard}>
                                <View style={styles.pricingLeft}>
                                    <Text style={styles.pricingType}>{p.type}</Text>
                                    <Text style={styles.pricingNote}>{p.note}</Text>
                                </View>
                                <Text style={styles.pricingAmount}>{p.price}</Text>
                            </View>
                        ))}
                        <View style={styles.noteBox}>
                            <Ionicons name="information-circle-outline" size={15} color="#6366F1" />
                            <Text style={styles.noteText}>Prices include Wi-Fi and transport. Mess is optional and billed separately.</Text>
                        </View>
                    </>
                )}

                {/* ── Mess tab ── */}
                {activeTab === "Mess" && (
                    <>
                        <Text style={styles.sectionTitle}>Weekly Menu</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPicker}>
                            {DAYS.map((d) => (
                                <TouchableOpacity
                                    key={d}
                                    style={[styles.dayChip, activeDay === d && styles.dayChipActive, d === today && styles.dayChipToday]}
                                    onPress={() => setActiveDay(d)}
                                >
                                    <Text style={[styles.dayChipText, activeDay === d && styles.dayChipTextActive]}>
                                        {DAY_LABEL[d]}
                                    </Text>
                                    {d === today && <View style={styles.todayDot} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {["breakfast", "lunch", "dinner"].map((meal) => {
                            const items = messMenu[activeDay]?.[meal] ?? [];
                            const mealIcons = { breakfast: "sunny-outline", lunch: "partly-sunny-outline", dinner: "moon-outline" };
                            const mealColors = { breakfast: "#F59E0B", lunch: "#10B981", dinner: "#6366F1" };
                            return (
                                <View key={meal} style={styles.mealCard}>
                                    <View style={styles.mealHeader}>
                                        <Ionicons name={mealIcons[meal]} size={16} color={mealColors[meal]} />
                                        <Text style={[styles.mealTitle, { color: mealColors[meal] }]}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                                    </View>
                                    <View style={styles.mealItems}>
                                        {items.map((item, i) => (
                                            <View key={i} style={styles.mealItem}>
                                                <View style={[styles.mealDot, { backgroundColor: mealColors[meal] }]} />
                                                <Text style={styles.mealItemText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}

                {/* ── Transport tab ── */}
                {activeTab === "Transport" && (
                    <>
                        <Text style={styles.sectionTitle}>Bus Schedule</Text>
                        {apiRoutes
                            ? apiRoutes.map((r) => (
                                <View key={r._id} style={styles.routeCard}>
                                    <View style={styles.routeLeft}>
                                        <Text style={styles.routeEmoji}>🚌</Text>
                                    </View>
                                    <View style={styles.routeBody}>
                                        <Text style={styles.routeName}>{r.routeName}</Text>
                                        <Text style={styles.routeMeta}>
                                            Driver: {r.driverName || "—"}  ·  {r.busNumber || "—"}
                                        </Text>
                                        <Text style={styles.routeDir}>
                                            {r.from} → {r.to}
                                        </Text>
                                    </View>
                                    <View style={styles.routeTime}>
                                        <Text style={styles.routeDep}>{r.departureTime}</Text>
                                        <Text style={styles.routeArr}>{r.returnTime || "—"}</Text>
                                    </View>
                                </View>
                            ))
                            : Object.values(fallbackTransportRoutes).map((r) => (
                                <View key={r.id} style={styles.routeCard}>
                                    <View style={styles.routeLeft}>
                                        <Text style={styles.routeEmoji}>🚌</Text>
                                    </View>
                                    <View style={styles.routeBody}>
                                        <Text style={styles.routeName}>{r.name}</Text>
                                        <Text style={styles.routeMeta}>Driver: {r.driverName}  ·  {r.vehicleNumber}</Text>
                                        <Text style={styles.routeDir}>{r.direction === "to_university" ? "Hostel → University" : "University → Hostel"}</Text>
                                    </View>
                                    <View style={styles.routeTime}>
                                        <Text style={styles.routeDep}>{r.departureTime}</Text>
                                        <Text style={styles.routeArr}>{r.arrivalTime}</Text>
                                    </View>
                                </View>
                            ))}
                    </>
                )}

                {/* CTA to sign in */}
                <TouchableOpacity style={styles.ctaBanner} onPress={() => navigation.navigate("Login")} activeOpacity={0.88}>
                    <Ionicons name="log-in-outline" size={18} color="#fff" />
                    <Text style={styles.ctaText}>Sign in to book a room or apply for services</Text>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root:   { flex: 1, backgroundColor: BG },
    header: { backgroundColor: BRAND },
    headerInner: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0 },
    headerRow: {
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 14,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center", justifyContent: "center",
    },
    headerCenter: { flex: 1, alignItems: "center" },
    headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
    headerSub:   { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },

    tabRow: { flexDirection: "row", marginBottom: 0, paddingBottom: 12 },
    tab: {
        paddingHorizontal: 16, paddingVertical: 7,
        borderRadius: 20, marginRight: 8,
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    tabActive:     { backgroundColor: "#fff" },
    tabText:       { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "600" },
    tabTextActive: { color: BRAND },

    scroll:       { flex: 1 },
    scrollContent:{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

    sectionTitle: {
        fontSize: 12, fontWeight: "800", color: "#6B7280",
        textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12,
    },

    // Features
    featureRow: {
        backgroundColor: CARD, borderRadius: 14, padding: 14,
        flexDirection: "row", alignItems: "center", gap: 14,
        marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0",
    },
    featureIconBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center",
    },
    featureBody: { flex: 1 },
    featureLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
    featureDesc:  { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

    // Pricing
    pricingCard: {
        backgroundColor: CARD, borderRadius: 14, padding: 16,
        flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10,
        borderWidth: 1, borderColor: "#F0F0F0",
    },
    pricingLeft:   {},
    pricingType:   { fontSize: 14, fontWeight: "700", color: "#111827" },
    pricingNote:   { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
    pricingAmount: { fontSize: 14, fontWeight: "800", color: BRAND },
    noteBox: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: "#EEF2FF", borderRadius: 10, padding: 12,
        marginTop: 4,
    },
    noteText: { flex: 1, fontSize: 12, color: "#4338CA", lineHeight: 17 },

    // Mess
    dayPicker: { flexDirection: "row", marginBottom: 16 },
    dayChip: {
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, marginRight: 8,
        backgroundColor: CARD, borderWidth: 1, borderColor: "#E5E7EB",
        alignItems: "center",
    },
    dayChipActive: { backgroundColor: BRAND, borderColor: BRAND },
    dayChipToday:  { borderColor: BRAND },
    dayChipText:       { fontSize: 13, fontWeight: "600", color: "#6B7280" },
    dayChipTextActive: { color: "#fff" },
    todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: BRAND, marginTop: 3 },

    mealCard: {
        backgroundColor: CARD, borderRadius: 14, padding: 14,
        marginBottom: 12, borderWidth: 1, borderColor: "#F0F0F0",
    },
    mealHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    mealTitle:  { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
    mealItems:  { gap: 6 },
    mealItem:   { flexDirection: "row", alignItems: "center", gap: 8 },
    mealDot:    { width: 6, height: 6, borderRadius: 3 },
    mealItemText: { fontSize: 13, color: "#374151" },

    // Transport
    routeCard: {
        backgroundColor: CARD, borderRadius: 14, padding: 14,
        flexDirection: "row", alignItems: "center", gap: 12,
        marginBottom: 10, borderWidth: 1, borderColor: "#F0F0F0",
    },
    routeLeft:  {},
    routeEmoji: { fontSize: 24 },
    routeBody:  { flex: 1 },
    routeName:  { fontSize: 13, fontWeight: "700", color: "#111827" },
    routeMeta:  { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
    routeDir:   { fontSize: 11, color: "#6B7280", marginTop: 2 },
    routeTime:  { alignItems: "flex-end" },
    routeDep:   { fontSize: 13, fontWeight: "700", color: BRAND },
    routeArr:   { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

    // CTA
    ctaBanner: {
        marginTop: 12,
        backgroundColor: BRAND,
        borderRadius: 14, padding: 16,
        flexDirection: "row", alignItems: "center", gap: 12,
    },
    ctaText: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "600" },

    nearbyIntro: {
        fontSize: 12,
        color: "#9CA3AF",
        lineHeight: 17,
        marginBottom: 12,
    },
    nearbyCarousel: { marginBottom: 12 },
    nearbyCard: {
        width: 200,
        backgroundColor: CARD,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: "#FCE7F3",
    },
    nearbyCardName: { fontSize: 13, fontWeight: "700", color: "#111827" },
    nearbyCardLoc: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
    nearbyCardRate: { fontSize: 12, fontWeight: "600", color: BRAND, marginTop: 8 },
    nearbyActions: { gap: 10, marginBottom: 22 },
    nearbyBtnPrimary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: BRAND,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    nearbyBtnPrimaryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    nearbyBtnSecondary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 10,
    },
    nearbyBtnSecondaryText: { color: "#4F46E5", fontSize: 13, fontWeight: "600" },
});
