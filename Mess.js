/**
 * Mess Screen — four tabs
 *   1. Month — calendar of the selected month, per-day B/L/D, add meal with date + category
 *   2. Meal Plan — day-of-week preferences + Log Today
 *   3. History — unbilled meal lines (billed on the main monthly hostel challan)
 *   4. Monthly bill — how mess charges join room rent on the office-generated challan
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import axios from "axios";
import Layout from "../components/Layout";
import { useAuthContext } from "../context";
import { useProfileStore } from "../store/profile";
import { API_BASE_URL } from "../utils/apiBase";

const BASE_URL = API_BASE_URL;

/** Must match backend `user.messChoices` (mon–sun) */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
};
const MEALS = ["breakfast", "lunch", "dinner"];
const MEAL_PRICES = { breakfast: 100, lunch: 180, dinner: 200 };

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local calendar key yyyy-mm-dd (for grouping API dates) */
function localDateKey(isoOrDate) {
    const d = new Date(isoOrDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function noonLocalFromParts(year, monthIndex, day) {
    return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function todayKey() {
    return localDateKey(new Date());
}

const DEFAULT_DAY_CHOICES = () => ({
    breakfast: true,
    lunch: true,
    dinner: true,
});

function choicesFromProfile(messChoices) {
    const o = {};
    DAY_KEYS.forEach((k) => {
        const row = messChoices?.[k];
        o[k] =
            row && typeof row === "object"
                ? { ...DEFAULT_DAY_CHOICES(), ...row }
                : { ...DEFAULT_DAY_CHOICES() };
    });
    return o;
}

// ─── helpers ────────────────────────────────────────────────────────────────
const mealLabel = (m) => m.charAt(0).toUpperCase() + m.slice(1);
const fmt = (d) => new Date(d).toLocaleDateString("en-PK", { day:"numeric", month:"short" });
const authH = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = ["Month", "Meal Plan", "History", "Bill"];

export default function MessScreen({ navigation }) {
    const { token } = useAuthContext();
    const profile   = useProfileStore((s) => s.profile);
    const setProfile = useProfileStore((s) => s.setProfile);

    const [tab, setTab] = useState("Month");

    // ── Meal Plan state (shape matches API: mon…sun → meals) ─────────────────
    const [choices, setChoices] = useState(() => choicesFromProfile(undefined));
    const [savingPlan, setSavingPlan] = useState(false);
    const [loggingToday, setLoggingToday] = useState(false);

    // ── History state ────────────────────────────────────────────────────────
    const [records, setRecords]     = useState([]);
    const [allMonthRecords, setAllMonthRecords] = useState([]);
    const [pendingTotal, setPTotal] = useState(0);
    const [loadingRec, setLoadRec]  = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    /** First day of the month being viewed (calendar + API month filter) */
    const [viewMonth, setViewMonth] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const monthLabel = useMemo(
        () =>
            `${viewMonth.toLocaleString("default", { month: "long" })} ${viewMonth.getFullYear()}`,
        [viewMonth]
    );
    const [billOverview, setBillOverview] = useState(null);
    const [loadingOverview, setLoadingOverview] = useState(false);

    const [mealModalOpen, setMealModalOpen] = useState(false);
    const [modalDay, setModalDay] = useState(null);
    const [postingMeal, setPostingMeal] = useState(null);

    // ── Sync meal toggles from profile (API uses mon…sun) ────────────────────
    useEffect(() => {
        setChoices(choicesFromProfile(profile?.messChoices));
    }, [profile]);

    // Refetch profile when screen opens so Zustand matches DB after navigation
    useFocusEffect(
        useCallback(() => {
            if (!token) return undefined;
            let cancelled = false;
            (async () => {
                try {
                    const res = await axios.get(`${BASE_URL}/user/student/me`, authH(token));
                    if (!cancelled && res.data) setProfile(res.data);
                } catch (e) {
                    console.warn("Mess: refresh profile failed", e?.message);
                }
            })();
            return () => { cancelled = true; };
        }, [token, setProfile])
    );

    const fetchRecords = useCallback(async () => {
        if (!token) return;
        setLoadRec(true);
        try {
            const res = await axios.get(
                `${BASE_URL}/mess/my-records?month=${encodeURIComponent(monthLabel)}`,
                authH(token)
            );
            const unbilled = res.data.unbilled || [];
            const billed = res.data.billed || [];
            setRecords(unbilled);
            setAllMonthRecords([...unbilled, ...billed]);
            setPTotal(res.data.pendingTotal || 0);
        } catch (err) {
            console.error("fetchRecords error", err?.response?.data || err.message);
        } finally {
            setLoadRec(false);
            setRefreshing(false);
        }
    }, [token, monthLabel]);

    const fetchBillOverview = useCallback(async () => {
        if (!token) return;
        setLoadingOverview(true);
        try {
            const res = await axios.get(`${BASE_URL}/challan/my-month-overview`, {
                ...authH(token),
                params: { month: monthLabel },
            });
            setBillOverview(res.data || null);
        } catch (e) {
            console.warn("Mess: month overview", e?.message);
            setBillOverview(null);
        } finally {
            setLoadingOverview(false);
        }
    }, [token, monthLabel]);

    useEffect(() => {
        if (tab === "Month" || tab === "History" || tab === "Bill") fetchRecords();
    }, [tab, fetchRecords]);

    useEffect(() => {
        if (tab === "Bill") fetchBillOverview();
    }, [tab, fetchBillOverview]);

    const mealsByDay = useMemo(() => {
        const map = {};
        for (const r of allMonthRecords) {
            const k = localDateKey(r.date);
            if (!map[k]) {
                map[k] = { breakfast: false, lunch: false, dinner: false };
            }
            if (r.mealType && map[k][r.mealType] !== undefined) {
                map[k][r.mealType] = true;
            }
        }
        return map;
    }, [allMonthRecords]);

    const { daysInMonth, startPad, gridYear, gridMonthIndex } = useMemo(() => {
        const y = viewMonth.getFullYear();
        const m = viewMonth.getMonth();
        const dim = new Date(y, m + 1, 0).getDate();
        const pad = new Date(y, m, 1).getDay();
        return { daysInMonth: dim, startPad: pad, gridYear: y, gridMonthIndex: m };
    }, [viewMonth]);

    const canGoNextMonth = useMemo(() => {
        const n = new Date();
        const curFirst = new Date(n.getFullYear(), n.getMonth(), 1);
        const nextView = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
        return nextView.getTime() <= curFirst.getTime();
    }, [viewMonth]);

    const openDayModal = (dayNum) => {
        const d = noonLocalFromParts(gridYear, gridMonthIndex, dayNum);
        const endToday = new Date();
        endToday.setHours(23, 59, 59, 999);
        if (d > endToday) {
            Alert.alert("Future date", "You can log meals up to today only.");
            return;
        }
        setModalDay(dayNum);
        setMealModalOpen(true);
    };

    const postMeal = async (mealType) => {
        if (!modalDay || !token) return;
        const d = noonLocalFromParts(gridYear, gridMonthIndex, modalDay);
        setPostingMeal(mealType);
        try {
            await axios.post(
                `${BASE_URL}/mess/log-my-meal`,
                { mealType, date: d.toISOString() },
                authH(token)
            );
            setMealModalOpen(false);
            setModalDay(null);
            await fetchRecords();
            await fetchBillOverview();
            Alert.alert("Logged", `${mealLabel(mealType)} added for ${fmt(d)}.`);
        } catch (err) {
            const msg = err?.response?.data?.message || "Could not log meal";
            Alert.alert("Could not log", msg);
        } finally {
            setPostingMeal(null);
        }
    };

    const shiftViewMonth = (delta) => {
        setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    // ── Toggle meal choice ───────────────────────────────────────────────────
    const toggle = (dayKey, meal) => {
        setChoices((prev) => ({
            ...prev,
            [dayKey]: { ...prev[dayKey], [meal]: !prev[dayKey]?.[meal] },
        }));
    };

    // Rough total if you ate every opted meal once per weekday cycle (not billing — hostel is monthly)
    const mealPlanWeekTotal = DAY_KEYS.reduce((sum, dayKey) => {
        const meals = choices[dayKey];
        MEALS.forEach((m) => {
            if (meals?.[m]) sum += MEAL_PRICES[m];
        });
        return sum;
    }, 0);

    // ── Save meal plan ───────────────────────────────────────────────────────
    const savePlan = async () => {
        setSavingPlan(true);
        try {
            const res = await axios.put(
                `${BASE_URL}/user/student/me`,
                { messChoices: choices },
                authH(token)
            );
            if (res.data) setProfile(res.data);
            Alert.alert("Saved", "Your meal preferences have been updated.");
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Could not save plan");
        } finally {
            setSavingPlan(false);
        }
    };

    // ── Log today's meals ────────────────────────────────────────────────────
    const logToday = async () => {
        setLoggingToday(true);
        try {
            const res = await axios.post(`${BASE_URL}/mess/log-my-choices`, {}, authH(token));
            const { logged, skipped } = res.data;
            Alert.alert(
                "Today Logged",
                logged.length
                    ? `Logged: ${logged.join(", ")}${skipped.length ? `\nSkipped: ${skipped.join(", ")}` : ""}`
                    : `Nothing to log (${skipped.join(", ")})`
            );
            if (logged.length) fetchRecords();
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Could not log today");
        } finally {
            setLoggingToday(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <Layout title="Mess & Food" showBack>
            <View style={styles.screenBody}>
            {/* Tab bar */}
            <View style={styles.tabBar}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, tab === t && styles.tabActive]}
                        onPress={() => setTab(t)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]} numberOfLines={1}>
                            {t}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── TAB 1: MONTH CALENDAR ─────────────────────────────────── */}
            {tab === "Month" && (
                <ScrollView
                    style={styles.tabScroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchRecords();
                                fetchBillOverview();
                            }}
                        />
                    }
                    contentContainerStyle={{ gap: 14, paddingBottom: 24 }}
                >
                    <View style={styles.monthHeader}>
                        <TouchableOpacity
                            onPress={() => shiftViewMonth(-1)}
                            style={styles.monthNavBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Text style={styles.monthNavText}>‹</Text>
                        </TouchableOpacity>
                        <View style={{ alignItems: "center", flex: 1 }}>
                            <Text style={styles.monthTitle}>{monthLabel}</Text>
                            <Text style={styles.monthSub}>{daysInMonth} days · tap a day to add breakfast, lunch, or dinner</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => canGoNextMonth && shiftViewMonth(1)}
                            style={[styles.monthNavBtn, !canGoNextMonth && { opacity: 0.25 }]}
                            disabled={!canGoNextMonth}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Text style={styles.monthNavText}>›</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.hint}>
                        Each meal uses the hostel rate (breakfast Rs. {MEAL_PRICES.breakfast}, lunch Rs.{" "}
                        {MEAL_PRICES.lunch}, dinner Rs. {MEAL_PRICES.dinner}) and adds to your mess total for{" "}
                        {monthLabel}.
                    </Text>

                    {loadingRec && allMonthRecords.length === 0 ? (
                        <View style={styles.center}>
                            <ActivityIndicator color="#4F46E5" />
                        </View>
                    ) : (
                        <View style={styles.calCard}>
                            <View style={styles.weekRow}>
                                {WEEKDAY_SHORT.map((w) => (
                                    <Text key={w} style={styles.weekCell}>
                                        {w}
                                    </Text>
                                ))}
                            </View>
                            <View style={styles.calGrid}>
                                {Array.from({ length: startPad }).map((_, i) => (
                                    <View key={`pad-${i}`} style={styles.dayCell} />
                                ))}
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
                                    const k = localDateKey(
                                        noonLocalFromParts(gridYear, gridMonthIndex, dayNum)
                                    );
                                    const slot = mealsByDay[k];
                                    const isToday = k === todayKey();
                                    const d = noonLocalFromParts(gridYear, gridMonthIndex, dayNum);
                                    const isFuture = d > new Date();
                                    return (
                                        <TouchableOpacity
                                            key={dayNum}
                                            style={[styles.dayCell, isToday && styles.dayCellToday, isFuture && styles.dayCellFuture]}
                                            onPress={() => openDayModal(dayNum)}
                                            activeOpacity={isFuture ? 1 : 0.75}
                                            disabled={isFuture}
                                        >
                                            <Text style={[styles.dayNum, isFuture && styles.dayNumMuted]}>
                                                {dayNum}
                                            </Text>
                                            <View style={styles.mealDots}>
                                                <View style={[styles.dot, slot?.breakfast && styles.dotBreakfast]} />
                                                <View style={[styles.dot, slot?.lunch && styles.dotLunch]} />
                                                <View style={[styles.dot, slot?.dinner && styles.dotDinner]} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    )}

                    <View style={styles.legendRow}>
                        <View style={styles.legendDot} />
                        <Text style={styles.legendItem}>Breakfast</Text>
                        <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                        <Text style={styles.legendItem}>Lunch</Text>
                        <View style={[styles.legendDot, { backgroundColor: "#6366F1" }]} />
                        <Text style={styles.legendItem}>Dinner</Text>
                        <Text style={styles.legendHint}>  · filled = logged</Text>
                    </View>
                </ScrollView>
            )}

            {/* ── TAB 2: MEAL PLAN ──────────────────────────────────────── */}
            {tab === "Meal Plan" && (
                <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                    <Text style={styles.hint}>
                        Set which meals you eat each day of the week, then tap "Log Today" to instantly record today's meals. You can also tap any day on the Month calendar to log individually.
                    </Text>

                    {DAY_KEYS.map((dayKey) => (
                        <View key={dayKey} style={styles.dayCard}>
                            <Text style={styles.dayTitle}>{DAY_LABEL[dayKey]}</Text>
                            {MEALS.map((meal) => {
                                const on = !!choices[dayKey]?.[meal];
                                return (
                                    <View key={meal} style={styles.mealRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.mealName}>
                                                {mealLabel(meal)}
                                                <Text style={styles.mealPrice}> · Rs. {MEAL_PRICES[meal]}</Text>
                                            </Text>
                                        </View>
                                        <Switch
                                            value={on}
                                            onValueChange={() => toggle(dayKey, meal)}
                                            thumbColor={on ? "#4F46E5" : "#E5E7EB"}
                                            trackColor={{ true: "#C7D2FE", false: "#E5E7EB" }}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    ))}

                    {/* Meal-plan preview (one repeating week of toggles) */}
                    <View style={styles.estimateRow}>
                        <Text style={styles.estimateLabel}>Meal plan · one week (preview)</Text>
                        <Text style={styles.estimateValue}>Rs. {mealPlanWeekTotal.toLocaleString()}</Text>
                    </View>

                    {/* Action buttons */}
                    <TouchableOpacity
                        style={[styles.primaryBtn, savingPlan && { opacity: 0.6 }]}
                        onPress={savePlan}
                        disabled={savingPlan}
                    >
                        {savingPlan
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Save Meal Plan</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryBtn, loggingToday && { opacity: 0.6 }]}
                        onPress={logToday}
                        disabled={loggingToday}
                    >
                        {loggingToday
                            ? <ActivityIndicator color="#4F46E5" />
                            : <Text style={styles.secondaryBtnText}>Log Today's Meals</Text>}
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* ── TAB 3: HISTORY ──────────────────────────────────────── */}
            {tab === "History" && (
                <ScrollView
                    style={styles.tabScroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRecords(); }} />}
                    contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
                >
                    <Text style={styles.hint}>
                        Unbilled meals for {monthLabel}. These amounts are added to your main monthly challan (room + meals) when the office generates it.
                    </Text>

                    {loadingRec ? (
                        <View style={styles.center}>
                            <ActivityIndicator color="#4F46E5" />
                        </View>
                    ) : allMonthRecords.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🍽</Text>
                            <Text style={styles.emptyTitle}>No meals logged yet</Text>
                            <Text style={styles.emptyText}>Go to the Month tab and tap any past day to log a meal. Each meal will appear here and roll into your monthly challan.</Text>
                        </View>
                    ) : (
                        <>
                            {records.length > 0 && (
                                <>
                                    <View style={styles.historySection}>
                                        <Text style={styles.historySectionLabel}>🟡 Pending (not yet billed)</Text>
                                        <Text style={styles.historySectionSub}>These will be added to your next monthly challan</Text>
                                    </View>
                                    {records.map((r) => (
                                        <View key={r._id} style={styles.recordRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.recordName}>{r.itemName}</Text>
                                                <Text style={styles.recordDate}>{fmt(r.date)}</Text>
                                            </View>
                                            <Text style={styles.recordAmt}>Rs. {(r.price * r.quantity).toLocaleString()}</Text>
                                        </View>
                                    ))}
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Pending total</Text>
                                        <Text style={styles.totalValue}>Rs. {pendingTotal.toLocaleString()}</Text>
                                    </View>
                                </>
                            )}

                            {allMonthRecords.filter(r => r.isBilled).length > 0 && (
                                <>
                                    <View style={[styles.historySection, { marginTop: records.length > 0 ? 8 : 0 }]}>
                                        <Text style={[styles.historySectionLabel, { color: "#16A34A" }]}>✅ Billed (already on challan)</Text>
                                        <Text style={styles.historySectionSub}>Included in your issued monthly challan</Text>
                                    </View>
                                    {allMonthRecords.filter(r => r.isBilled).map((r) => (
                                        <View key={r._id} style={[styles.recordRow, styles.recordRowBilled]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.recordName, { color: "#6B7280" }]}>{r.itemName}</Text>
                                                <Text style={styles.recordDate}>{fmt(r.date)}</Text>
                                            </View>
                                            <Text style={[styles.recordAmt, { color: "#16A34A" }]}>Rs. {(r.price * r.quantity).toLocaleString()}</Text>
                                        </View>
                                    ))}
                                </>
                            )}

                            {records.length === 0 && allMonthRecords.filter(r => r.isBilled).length > 0 && (
                                <View style={styles.allBilledNote}>
                                    <Text style={styles.allBilledNoteText}>✅ All your mess meals for {monthLabel} have been billed and included in your monthly challan.</Text>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            )}

            {/* ── TAB 4: MONTHLY BILL (info) ───────────────────────────── */}
            {tab === "Bill" && (
                <ScrollView style={styles.tabScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
                    <Text style={styles.hint}>
                        Room fee and your meal lines for the month are combined on one hostel challan. The office generates it from Admin → Finance.
                    </Text>

                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Hostel + mess · {billOverview?.month ?? monthLabel}</Text>
                        {loadingOverview ? (
                            <ActivityIndicator color="#4F46E5" style={{ marginVertical: 12 }} />
                        ) : billOverview ? (
                            <>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Room rent (month)</Text>
                                    <Text style={styles.summaryValue2}>
                                        {billOverview.roomRent != null
                                            ? `Rs. ${billOverview.roomRent.toLocaleString()}`
                                            : "—"}
                                    </Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Mess (unbilled lines)</Text>
                                    <Text style={styles.summaryValue2}>
                                        Rs. {(billOverview.messUnbilledTotal ?? 0).toLocaleString()}
                                    </Text>
                                </View>
                                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8, marginTop: 4 }]}>
                                    <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>
                                        {billOverview.monthlyChallan ? "On issued challan" : "Estimated before challan"}
                                    </Text>
                                    <Text style={[styles.summaryValue2, { color: "#4F46E5", fontWeight: "800", fontSize: 16 }]}>
                                        {billOverview.monthlyChallan
                                            ? `Rs. ${Number(billOverview.monthlyChallan.totalAmount).toLocaleString()} (${billOverview.monthlyChallan.status})`
                                            : billOverview.projectedTotalNoChallanYet != null
                                              ? `Rs. ${billOverview.projectedTotalNoChallanYet.toLocaleString()}`
                                              : "—"}
                                    </Text>
                                </View>
                                {billOverview.monthlyChallan &&
                                ((Number(billOverview.monthlyChallan.roomSubtotal) || 0) > 0 ||
                                    (Number(billOverview.monthlyChallan.messSubtotal) || 0) > 0) ? (
                                    <Text style={styles.summaryFoot}>
                                        Challan split: room Rs.{" "}
                                        {(Number(billOverview.monthlyChallan.roomSubtotal) || 0).toLocaleString()} · mess Rs.{" "}
                                        {(Number(billOverview.monthlyChallan.messSubtotal) || 0).toLocaleString()}
                                    </Text>
                                ) : null}
                            </>
                        ) : null}
                    </View>

                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>This Month's Mess Charges · {monthLabel}</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Pending (unbilled) meals</Text>
                            <Text style={styles.summaryValue2}>{loadingRec ? "…" : `${records.length} meal${records.length !== 1 ? "s" : ""}`}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Billed (on challan)</Text>
                            <Text style={[styles.summaryValue2, { color: "#16A34A" }]}>
                                {loadingRec ? "…" : `${allMonthRecords.filter(r => r.isBilled).length} meal${allMonthRecords.filter(r => r.isBilled).length !== 1 ? "s" : ""}`}
                            </Text>
                        </View>
                        <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8, marginTop: 4 }]}>
                            <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>Pending mess total</Text>
                            <Text style={[styles.summaryValue2, { color: "#4F46E5", fontWeight: "800", fontSize: 16 }]}>
                                Rs. {pendingTotal.toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => navigation.navigate("BillingInvoice")}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryBtnText}>Open Billing & hostel challans</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}
            </View>

            <Modal
                visible={mealModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setMealModalOpen(false);
                    setModalDay(null);
                }}
            >
                <View style={styles.modalOuter}>
                    <Pressable
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => {
                            setMealModalOpen(false);
                            setModalDay(null);
                        }}
                    />
                    <View style={styles.modalCardWrap} pointerEvents="box-none">
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Add meal</Text>
                            {modalDay != null ? (
                                <Text style={styles.modalDate}>
                                    {(() => {
                                        const md = noonLocalFromParts(
                                            gridYear,
                                            gridMonthIndex,
                                            modalDay
                                        );
                                        const dk = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][
                                            md.getDay()
                                        ];
                                        return `${fmt(md)} · ${DAY_LABEL[dk]}`;
                                    })()}
                                </Text>
                            ) : null}
                            <Text style={styles.modalHint}>
                                Tap a meal to log it. You can add all 3 (one at a time). Already logged meals show "Logged".
                            </Text>
                            {MEALS.map((m) => {
                                const k =
                                    modalDay != null
                                        ? localDateKey(
                                              noonLocalFromParts(
                                                  gridYear,
                                                  gridMonthIndex,
                                                  modalDay
                                              )
                                          )
                                        : "";
                                const taken = k && mealsByDay[k]?.[m];
                                return (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.mealPickRow, taken && styles.mealPickDisabled]}
                                        onPress={() => !taken && !postingMeal && postMeal(m)}
                                        disabled={!!taken || !!postingMeal}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.mealPickLabel}>
                                            {mealLabel(m)} · Rs. {MEAL_PRICES[m]}
                                        </Text>
                                        {taken ? (
                                            <Text style={styles.mealPickBadge}>Logged</Text>
                                        ) : postingMeal === m ? (
                                            <ActivityIndicator size="small" color="#4F46E5" />
                                        ) : (
                                            <Text style={styles.mealPickAdd}>+ Add</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={() => {
                                    setMealModalOpen(false);
                                    setModalDay(null);
                                }}
                            >
                                <Text style={styles.modalCloseText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Layout>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screenBody: {
        flex: 1,
        minHeight: 0,
    },
    tabScroll: {
        flex: 1,
    },
    tabBar: {
        flexDirection: "row",
        backgroundColor: "#F3F4F6",
        borderRadius: 10,
        padding: 3,
        marginBottom: 14,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    tabActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    tabText: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
    tabTextActive: { color: "#111827" },
    monthHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    monthNavBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#EEF2FF",
        alignItems: "center",
        justifyContent: "center",
    },
    monthNavText: { fontSize: 22, color: "#4F46E5", fontWeight: "700" },
    monthTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
    monthSub: { fontSize: 11, color: "#9CA3AF", marginTop: 2, textAlign: "center", paddingHorizontal: 8 },
    calCard: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 10,
    },
    weekRow: { flexDirection: "row", marginBottom: 6 },
    weekCell: {
        flex: 1,
        textAlign: "center",
        fontSize: 10,
        fontWeight: "700",
        color: "#9CA3AF",
        paddingVertical: 4,
    },
    calGrid: { flexDirection: "row", flexWrap: "wrap" },
    dayCell: {
        width: "14.28%",
        aspectRatio: 0.85,
        paddingVertical: 6,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
    },
    dayCellToday: {
        backgroundColor: "#EEF2FF",
        borderWidth: 1.5,
        borderColor: "#4F46E5",
    },
    dayCellFuture: { opacity: 0.45 },
    dayNum: { fontSize: 14, fontWeight: "700", color: "#111827" },
    dayNumMuted: { color: "#D1D5DB" },
    mealDots: { flexDirection: "row", gap: 3, marginTop: 4 },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: "#E5E7EB",
    },
    dotOn: { backgroundColor: "#4F46E5" },
    dotBreakfast: { backgroundColor: "#10B981" },
    dotLunch:     { backgroundColor: "#F59E0B" },
    dotDinner:    { backgroundColor: "#6366F1" },
    legendRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#10B981",
    },
    legendItem: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
    legendHint: { fontSize: 11, color: "#9CA3AF" },
    historySection: {
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    historySectionLabel: { fontSize: 13, fontWeight: "700", color: "#F59E0B" },
    historySectionSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
    recordRowBilled: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
    allBilledNote: {
        backgroundColor: "#F0FDF4",
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: "#BBF7D0",
        alignItems: "center",
    },
    allBilledNoteText: { fontSize: 13, color: "#166534", textAlign: "center", lineHeight: 20 },

    modalOuter: {
        flex: 1,
        justifyContent: "center",
        padding: 20,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
    },
    modalCardWrap: {
        width: "100%",
        zIndex: 2,
        elevation: 8,
    },
    modalCard: {
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 18,
        gap: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
    modalDate: { fontSize: 14, color: "#4F46E5", fontWeight: "600" },
    modalHint: { fontSize: 12, color: "#9CA3AF", marginBottom: 4 },
    mealPickRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    mealPickDisabled: { opacity: 0.55 },
    mealPickLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
    mealPickBadge: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
    mealPickAdd: { fontSize: 13, fontWeight: "800", color: "#4F46E5" },
    modalClose: { alignItems: "center", paddingVertical: 8, marginTop: 4 },
    modalCloseText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
    hint: { fontSize: 12, color: "#9CA3AF", textAlign: "center" },
    dayCard: {
        backgroundColor: "#FFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
    },
    dayTitle: { fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 8 },
    mealRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 7,
        borderBottomWidth: 0.5,
        borderBottomColor: "#F3F4F6",
    },
    mealName: { fontSize: 14, color: "#374151" },
    mealPrice: { color: "#4F46E5", fontWeight: "600" },
    estimateRow: {
        backgroundColor: "#F5F3FF",
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    estimateLabel: { fontSize: 14, color: "#374151", fontWeight: "600" },
    estimateValue: { fontSize: 18, fontWeight: "800", color: "#4F46E5" },
    primaryBtn: {
        backgroundColor: "#4F46E5",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
    },
    primaryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
    secondaryBtn: {
        borderWidth: 1.5,
        borderColor: "#C7D2FE",
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: "center",
        backgroundColor: "#EEF2FF",
    },
    secondaryBtnText: { color: "#4F46E5", fontWeight: "700", fontSize: 14 },
    center: { paddingVertical: 40, alignItems: "center" },
    emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
    emptyText: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
    recordRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFF",
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    recordName: { fontSize: 13, color: "#374151", fontWeight: "600" },
    recordDate: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
    recordAmt: { fontSize: 14, fontWeight: "700", color: "#111827" },
    totalRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#F5F3FF",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    totalLabel: { fontSize: 14, fontWeight: "700", color: "#374151" },
    totalValue: { fontSize: 16, fontWeight: "800", color: "#4F46E5" },
    summaryCard: {
        backgroundColor: "#FFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 16,
        gap: 8,
    },
    summaryTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 4 },
    summaryRow: { flexDirection: "row", justifyContent: "space-between" },
    summaryLabel: { fontSize: 13, color: "#9CA3AF" },
    summaryValue2: { fontSize: 13, fontWeight: "600", color: "#111827" },
    summaryFoot: { fontSize: 11, color: "#6B7280", marginTop: 4, lineHeight: 16 },
    challanCard: {
        backgroundColor: "#FFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 16,
        gap: 10,
    },
    challanHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    challanTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
    challanId: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    challanRow: { flexDirection: "row", justifyContent: "space-between" },
    challanLabel: { fontSize: 12, color: "#9CA3AF" },
    challanValue: { fontSize: 13, color: "#374151" },
    downloadBtn: {
        backgroundColor: "#4F46E5",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 4,
    },
    downloadBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
});
