import React, { useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    View,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    ScrollView,
    Switch,
} from "react-native";
import axios from "axios";
import Layout from "../components/Layout";
import Input from "../components/Input";
import LongTextButton from "../components/LongTextButton";
import Typography from "../components/Typography";
import { useProfileStore } from "../store/profile";
import { useAuthContext } from "../context";
import { API_BASE_URL } from "../utils/apiBase";

const BASE_URL = API_BASE_URL;

const TOP_TABS = ["Paid", "Included"];
const PAID_SUBTABS = ["Laundry", "Ironing", "Meals"];
const INCLUDED_SUBTABS = ["Transport", "Wi-Fi"];

export default function ServicesScreen() {
    const { token } = useAuthContext();
    const user = useProfileStore((s) => s.user || s.profile);
    const setUser = useProfileStore((s) => s.setProfile || s.setUser);
    const userRoomId =
        user?.room?._id || user?.roomId || user?.assignedRoomId;

    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);

    // API data
    const [laundryPrice, setLaundryPrice] = useState(0);
    const [ironingPrice, setIroningPrice] = useState(0);
    const [wifiServices, setWifiServices] = useState([]);
    const [transports, setTransports] = useState([]);
    const [messPlans, setMessPlans] = useState([]);

    // user choices (dayKey -> {breakfast, lunch, dinner})
    const [messChoices, setMessChoices] = useState({});

    // user inputs
    const [laundryCount, setLaundryCount] = useState(0);
    const [ironingCount, setIroningCount] = useState(0);

    const [laundrySaving, setLaundrySaving] = useState(false);
    const [ironingSaving, setIroningSaving] = useState(false);

    const [activeTopTab, setActiveTopTab] = useState("Paid");
    const [activePaidSub, setActivePaidSub] = useState("Laundry");
    const [activeIncSub, setActiveIncSub] = useState("Transport");

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                setErr(null);

                const res = await axios.get(`${BASE_URL}/service/all`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const payload = res.data?.data || {};
                const services = payload.services || [];

                const laundry = services.find((s) => s.type === "laundry");
                const ironing = services.find((s) => s.type === "ironing");
                const wifi = services.filter((s) => s.type === "wifi");

                setLaundryPrice(laundry?.pricePerItem || 0);
                setIroningPrice(ironing?.pricePerItem || 0);
                setWifiServices(wifi);
                setTransports(payload.transports || []);

                const plans = payload.messPlans || [];
                setMessPlans(plans);

                // hydrate choices from user
                const userMessChoices = user?.messChoices || user?.mess?.choices || {};
                const normalized = {};
                plans.forEach((plan) => {
                    const key = dayToKey(plan.day);
                    normalized[key] = {
                        breakfast: userMessChoices[key]?.breakfast ?? true,
                        lunch: userMessChoices[key]?.lunch ?? true,
                        dinner: userMessChoices[key]?.dinner ?? true,
                    };
                });
                setMessChoices(normalized);
            } catch (error) {
                console.log("services/all error:", error?.response?.data || error.message);
                setErr("Failed to load services.");
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchAll();
    }, [token, user]);

    const laundryTotal = (laundryCount || 0) * (laundryPrice || 0);
    const ironingTotal = (ironingCount || 0) * (ironingPrice || 0);

    const submitServiceRequest = async ({ serviceName, count, price, setBusy }) => {
        if (!count || count <= 0) {
            Alert.alert("No quantity", "Please enter a valid quantity.");
            return;
        }

        try {
            setBusy(true);
            const payload = {
                serviceName,
                items: count,
                perItemPrice: price,
            };
            const res = await axios.post(`${BASE_URL}/service/request`, payload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.data?.success) {
                Alert.alert("Success", `Your ${serviceName} request has been submitted.`);
            } else {
                Alert.alert("Error", res.data?.message || "Failed to submit request.");
            }
        } catch (error) {
            console.log("service/request error:", error?.response?.data || error.message);
            Alert.alert("Error", "Could not submit request. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const handleToggleMeal = async (dayKey, mealKey, value) => {
        // optimistic
        setMessChoices((prev) => ({
            ...prev,
            [dayKey]: {
                ...(prev[dayKey] || {}),
                [mealKey]: value,
            },
        }));

        try {
            const res = await axios.put(
                `${BASE_URL}/user/student/me`,
                {
                    messChoices: {
                        [dayKey]: {
                            [mealKey]: value,
                        },
                    },
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (setUser) setUser(res.data);
        } catch (err) {
            console.log("toggle mess err", err?.response?.data || err.message);
            Alert.alert("Error", "Failed to update mess choice");
        }
    };

    const { userWifi, otherWifi } = useMemo(() => {
        if (!userRoomId || !wifiServices.length) {
            return { userWifi: null, otherWifi: wifiServices };
        }
        const uw = wifiServices.find((w) =>
            Array.isArray(w.wifiRooms)
                ? w.wifiRooms.some(
                    (id) => id === userRoomId || id?._id === userRoomId
                )
                : Array.isArray(w.roomsServed)
                    ? w.roomsServed.some(
                        (id) => id === userRoomId || id?._id === userRoomId
                    )
                    : false
        );
        return {
            userWifi: uw || null,
            otherWifi: wifiServices.filter((w) => w !== uw),
        };
    }, [wifiServices, userRoomId]);

    if (loading) {
        return (
            <Layout title="Services" showBack>
                <ActivityIndicator />
            </Layout>
        );
    }

    if (err) {
        return (
            <Layout title="Services" showBack>
                <Typography style={{ color: "red" }}>{err}</Typography>
            </Layout>
        );
    }

    return (
        <Layout title="Services" showBack>
            {/* top tabs */}
            <View style={styles.topTabs}>
                {TOP_TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.topTab, activeTopTab === tab && styles.topTabActive]}
                        onPress={() => setActiveTopTab(tab)}
                    >
                        <Typography
                            style={[
                                styles.topTabText,
                                activeTopTab === tab && styles.topTabTextActive,
                            ]}
                        >
                            {tab}
                        </Typography>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={{ flex: 1 }}>
                {/* sub tabs */}
                <View style={styles.subTabs}>
                    {(activeTopTab === "Paid" ? PAID_SUBTABS : INCLUDED_SUBTABS).map(
                        (sub) => {
                            const isActive =
                                activeTopTab === "Paid"
                                    ? activePaidSub === sub
                                    : activeIncSub === sub;
                            return (
                                <TouchableOpacity
                                    key={sub}
                                    style={[styles.subTab, isActive && styles.subTabActive]}
                                    onPress={() =>
                                        activeTopTab === "Paid"
                                            ? setActivePaidSub(sub)
                                            : setActiveIncSub(sub)
                                    }
                                >
                                    <Typography
                                        style={[
                                            styles.subTabText,
                                            isActive && styles.subTabTextActive,
                                        ]}
                                    >
                                        {sub}
                                    </Typography>
                                </TouchableOpacity>
                            );
                        }
                    )}
                </View>

                <View style={styles.content}>
                    {/* PAID -> Laundry */}
                    {activeTopTab === "Paid" && activePaidSub === "Laundry" ? (
                        <View style={styles.block}>
                            <Typography style={styles.blockTitle}>Laundry</Typography>
                            <Typography style={styles.muted}>
                                Rs. {laundryPrice} per item
                            </Typography>
                            <View style={styles.row}>
                                <Input
                                    label=""
                                    type="number"
                                    value={String(laundryCount)}
                                    onChangeText={(val) => setLaundryCount(Number(val) || 0)}
                                    style={{ flex: 1 }}
                                    inputStyle={styles.input}
                                    placeholder="0"
                                />
                                <Typography style={styles.total}>Rs. {laundryTotal}</Typography>
                            </View>
                            <LongTextButton
                                text={laundrySaving ? "Requesting..." : "Request Laundry"}
                                onPress={() =>
                                    submitServiceRequest({
                                        serviceName: "laundry",
                                        count: laundryCount,
                                        price: laundryPrice,
                                        setBusy: setLaundrySaving,
                                    })
                                }
                                disabled={laundrySaving}
                                style={{ marginTop: 10 }}
                            />
                        </View>
                    ) : null}

                    {/* PAID -> Ironing */}
                    {activeTopTab === "Paid" && activePaidSub === "Ironing" ? (
                        <View style={styles.block}>
                            <Typography style={styles.blockTitle}>Ironing</Typography>
                            <Typography style={styles.muted}>
                                Rs. {ironingPrice} per item
                            </Typography>
                            <View style={styles.row}>
                                <Input
                                    label=""
                                    type="number"
                                    value={String(ironingCount)}
                                    onChangeText={(val) => setIroningCount(Number(val) || 0)}
                                    style={{ flex: 1 }}
                                    inputStyle={styles.input}
                                    placeholder="0"
                                />
                                <Typography style={styles.total}>Rs. {ironingTotal}</Typography>
                            </View>
                            <LongTextButton
                                text={ironingSaving ? "Requesting..." : "Request Ironing"}
                                onPress={() =>
                                    submitServiceRequest({
                                        serviceName: "ironing",
                                        count: ironingCount,
                                        price: ironingPrice,
                                        setBusy: setIroningSaving,
                                    })
                                }
                                disabled={ironingSaving}
                                style={{ marginTop: 10 }}
                            />
                        </View>
                    ) : null}

                    {/* PAID -> Meals (row style) */}
                    {activeTopTab === "Paid" && activePaidSub === "Meals" ? (
                        <View style={styles.block}>
                            <Typography style={styles.blockTitle}>Meal Plans</Typography>
                            <Typography style={styles.muted}>
                                Toggle meals you want to take.
                            </Typography>
                            {messPlans.length === 0 ? (
                                <Typography style={styles.muted}>
                                    No meal plans found.
                                </Typography>
                            ) : (
                                messPlans.map((plan) => {
                                    const dayKey = dayToKey(plan.day);
                                    const choices = messChoices[dayKey] || {
                                        breakfast: true,
                                        lunch: true,
                                        dinner: true,
                                    };

                                    // helper to render one meal row
                                    const renderMealRow = (mealKey, label) => {
                                        const mealData = plan.meals?.[mealKey];
                                        const items = mealData?.items?.length
                                            ? mealData.items.join(", ")
                                            : "";
                                        return (
                                            <View style={styles.mealRow} key={mealKey}>
                                                <View style={{ flex: 1 }}>
                                                    <Typography style={styles.mealType}>
                                                        {label}
                                                    </Typography>
                                                    <Typography style={styles.mealItems}>
                                                        {items}
                                                    </Typography>
                                                </View>
                                                <Switch
                                                    value={!!choices[mealKey]}
                                                    onValueChange={(val) =>
                                                        handleToggleMeal(dayKey, mealKey, val)
                                                    }
                                                />
                                            </View>
                                        );
                                    };

                                    return (
                                        <View key={plan._id || plan.day} style={styles.mealCard}>
                                            <Typography style={styles.mealDay}>{plan.day}</Typography>
                                            {renderMealRow("breakfast", "Breakfast")}
                                            {renderMealRow("lunch", "Lunch")}
                                            {renderMealRow("dinner", "Dinner")}
                                        </View>
                                    );
                                })
                            )}
                        </View>
                    ) : null}
                    {/* INCLUDED -> Transport */}
                    {activeTopTab === "Included" && activeIncSub === "Transport" ? (
                        <View style={styles.block}>
                            <Typography style={styles.blockTitle}>Transport</Typography>
                            {transports.length === 0 ? (
                                <Typography style={styles.muted}>
                                    No transport routes found.
                                </Typography>
                            ) : (
                                transports.map((t) => (
                                    <View key={t._id} style={styles.transportCard}>
                                        <Typography style={styles.transportRoute}>
                                            {t.routeName}
                                        </Typography>
                                        <Typography style={styles.transportSub}>
                                            {t.from} → {t.to}
                                        </Typography>
                                        <Typography style={styles.transportDetail}>
                                            🕒 Departure: {t.departureTime}
                                        </Typography>
                                        {t.returnTime ? (
                                            <Typography style={styles.transportDetail}>
                                                🔁 Return: {t.returnTime}
                                            </Typography>
                                        ) : null}
                                        <Typography style={styles.transportDetail}>
                                            🧑‍✈️ Driver: {t.driverName || "N/A"} • 🚌{" "}
                                            {t.busNumber || "N/A"}
                                        </Typography>
                                        <Typography style={styles.transportSeats}>
                                            Seats Available: {t.availableSeats ?? "N/A"}
                                        </Typography>
                                    </View>
                                ))
                            )}
                        </View>
                    ) : null}

                    {/* INCLUDED -> Wi-Fi */}
                    {activeTopTab === "Included" && activeIncSub === "Wi-Fi" ? (
                        <View style={styles.block}>
                            <Typography style={styles.blockTitle}>Wi-Fi</Typography>
                            {userWifi ? (
                                <View style={styles.userWifiCard}>
                                    <Typography style={styles.userWifiName}>
                                        {userWifi.name}
                                    </Typography>
                                    <Typography style={styles.userWifiDesc}>
                                        {userWifi.description || "WiFi for your room"}
                                    </Typography>
                                    {userWifi.password ? (
                                        <Typography style={styles.userWifiPassword}>
                                            Password: {userWifi.password}
                                        </Typography>
                                    ) : null}
                                </View>
                            ) : null}

                            {!userWifi && !otherWifi.length ? (
                                <Typography style={styles.muted}>
                                    No Wi-Fi services found.
                                </Typography>
                            ) : (
                                otherWifi.map((w) => (
                                    <View key={w._id} style={styles.listRow}>
                                        <Typography style={styles.listTitle}>{w.name}</Typography>
                                        <Typography style={styles.listSub}>
                                            {w.description || "Covers specific rooms"}
                                        </Typography>
                                    </View>
                                ))
                            )}
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </Layout>
    );
}

const dayToKey = (day) => {
    if (!day) return "";
    const d = day.toLowerCase();
    if (d.startsWith("mon")) return "mon";
    if (d.startsWith("tue")) return "tue";
    if (d.startsWith("wed")) return "wed";
    if (d.startsWith("thu")) return "thu";
    if (d.startsWith("fri")) return "fri";
    if (d.startsWith("sat")) return "sat";
    if (d.startsWith("sun")) return "sun";
    return d;
};

const styles = StyleSheet.create({
    topTabs: {
        flexDirection: "row",
        backgroundColor: "#e2e8f0",
        borderRadius: 999,
        padding: 4,
        marginBottom: 10,
        gap: 6,
    },
    topTab: {
        flex: 1,
        borderRadius: 999,
        paddingVertical: 8,
        alignItems: "center",
    },
    topTabActive: {
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    topTabText: {
        fontWeight: "500",
        color: "#475569",
    },
    topTabTextActive: {
        color: "#0f172a",
    },
    subTabs: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10,
    },
    subTab: {
        backgroundColor: "#f8fafc",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    subTabActive: {
        backgroundColor: "#0f172a",
    },
    subTabText: {
        color: "#0f172a",
        fontSize: 13,
    },
    subTabTextActive: {
        color: "#fff",
    },
    content: {
        gap: 14,
        paddingBottom: 30,
    },
    block: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "rgba(15,23,42,0.03)",
    },
    blockTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 6,
        color: "#0f172a",
    },
    muted: {
        color: "#94a3b8",
        marginBottom: 10,
    },
    row: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },
    input: {
        textAlign: "center",
    },
    total: {
        fontWeight: "600",
        color: "#0f172a",
    },
    mealCard: {
        backgroundColor: "#f8fafc",
        borderRadius: 10,
        padding: 10,
        marginBottom: 6,
    },
    mealDay: {
        fontWeight: "600",
        marginBottom: 8,
    },
    mealRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 6,
    },
    mealType: {
        fontWeight: "500",
        color: "#0f172a",
    },
    mealItems: {
        flex: 1,
        color: "#475569",
        fontSize: 12,
    },
    transportCard: {
        backgroundColor: "#f8fafc",
        borderRadius: 10,
        padding: 10,
        marginBottom: 6,
    },
    transportRoute: {
        fontWeight: "600",
    },
    transportSub: {
        color: "#475569",
        marginBottom: 4,
    },
    transportDetail: {
        color: "#475569",
        fontSize: 13,
    },
    transportSeats: {
        marginTop: 4,
        fontWeight: "500",
        color: "#16a34a",
    },
    userWifiCard: {
        backgroundColor: "#e0f2fe",
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
    },
    userWifiName: {
        fontWeight: "600",
    },
    userWifiDesc: {
        color: "#475569",
    },
    userWifiPassword: {
        marginTop: 4,
        fontWeight: "500",
    },
    listRow: {
        marginBottom: 6,
    },
    listTitle: {
        fontWeight: "500",
    },
    listSub: {
        color: "#94a3b8",
    },
});
