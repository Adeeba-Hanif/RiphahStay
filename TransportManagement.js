import React, { useEffect, useState, useMemo, useRef } from "react";
import {
    View, Text, StyleSheet, ActivityIndicator,
    RefreshControl, ScrollView,
} from "react-native";
import axios from "axios";
import Layout from "../components/Layout";
import Typography from "../components/Typography";
import { useAuthContext } from "../context";
import { API_BASE_URL } from "../utils/apiBase";

const API_BASE = API_BASE_URL;

// Convert "8:00 AM" → minutes since midnight for sorting
const timeToMinutes = (t = "") => {
    if (!t) return 0;
    const parts = t.trim().split(" ");
    if (parts.length < 2) return 0;
    const [time, period] = parts;
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + (m || 0);
};

function useCountdown(targetMinutes) {
    const [remaining, setRemaining] = useState("");
    const timerRef = useRef(null);

    useEffect(() => {
        const tick = () => {
            const now   = new Date();
            const nowM  = now.getHours() * 60 + now.getMinutes();
            const diff  = targetMinutes - nowM;
            if (diff <= 0) {
                setRemaining("Departing now");
            } else {
                const h = Math.floor(diff / 60);
                const m = diff % 60;
                setRemaining(h > 0 ? `${h}h ${m}m away` : `${m} min away`);
            }
        };
        tick();
        timerRef.current = setInterval(tick, 30000);
        return () => clearInterval(timerRef.current);
    }, [targetMinutes]);

    return remaining;
}

export default function TransportManagement() {
    const { token } = useAuthContext();
    const [routes, setRoutes]     = useState([]);
    const [loading, setLoading]   = useState(true);
    const [refresh, setRefresh]   = useState(false);
    const [error, setError]       = useState("");

    const fetchRoutes = async (isRefresh = false) => {
        if (isRefresh) setRefresh(true);
        else setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_BASE}/transport`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRoutes(res.data.routes || []);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to load transport routes");
        } finally {
            setLoading(false);
            setRefresh(false);
        }
    };

    useEffect(() => { if (token) fetchRoutes(); }, [token]);

    // Find next upcoming route by departure time
    const nextRoute = useMemo(() => {
        if (!routes.length) return null;
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const upcoming = routes
            .map((r) => ({ ...r, _min: timeToMinutes(r.departureTime) }))
            .filter((r) => r._min > currentMinutes)
            .sort((a, b) => a._min - b._min);
        const found = upcoming[0] || routes[0];
        return found ? { ...found, _min: found._min ?? timeToMinutes(found.departureTime) } : null;
    }, [routes]);

    return (
        <Layout title="Transport" showBack scroll={false}>
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
                refreshControl={
                    <RefreshControl refreshing={refresh} onRefresh={() => fetchRoutes(true)} />
                }
            >
                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingText}>Loading routes…</Text>
                    </View>
                ) : error ? (
                    <View style={styles.center}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : routes.length === 0 ? (
                    <View style={styles.center}>
                        <Text style={styles.emptyText}>No transport routes available</Text>
                        <Text style={styles.emptySubText}>Check back later or contact the hostel admin</Text>
                    </View>
                ) : (
                    <>
                        {/* Next departing route highlight */}
                        {nextRoute && (
                            <>
                                <Typography variant="heading" style={styles.sectionHeading}>
                                    Next Departure
                                </Typography>
                                <RouteCard route={nextRoute} highlighted nextMinutes={nextRoute._min} />
                            </>
                        )}

                        {/* All routes */}
                        <Typography variant="heading" style={styles.sectionHeading}>
                            All Routes
                        </Typography>
                        {routes.map((r) => (
                            <RouteCard key={r._id} route={r} highlighted={nextRoute?._id === r._id} />
                        ))}
                    </>
                )}
            </ScrollView>
        </Layout>
    );
}

function RouteCard({ route, highlighted, nextMinutes }) {
    const countdown = useCountdown(nextMinutes ?? 0);

    return (
        <View style={[styles.card, highlighted && styles.cardHighlighted]}>
            {/* Route name + bus */}
            <View style={styles.cardHeader}>
                <View style={styles.busIconWrap}>
                    <Text style={styles.busEmoji}>🚌</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.routeName}>{route.routeName}</Text>
                    {route.busNumber ? (
                        <Text style={styles.busNum}>{route.busNumber}</Text>
                    ) : null}
                </View>
                {highlighted && (
                    <View style={styles.nextBadgeWrap}>
                        <View style={styles.nextBadge}>
                            <Text style={styles.nextBadgeText}>Next</Text>
                        </View>
                        <Text style={styles.countdownText}>{countdown}</Text>
                    </View>
                )}
            </View>

            <View style={styles.divider} />

            {/* Route details */}
            <View style={styles.detailsGrid}>
                <Detail icon="📍" label="From" value={route.from} />
                <Detail icon="🏁" label="To"   value={route.to}   />
                <Detail icon="🕐" label="Departs"  value={route.departureTime} accent />
                {route.returnTime ? (
                    <Detail icon="🔁" label="Returns" value={route.returnTime} />
                ) : null}
                {route.driverName ? (
                    <Detail icon="👤" label="Driver" value={route.driverName} />
                ) : null}
                {route.availableSeats ? (
                    <Detail icon="💺" label="Seats" value={`${route.availableSeats}`} />
                ) : null}
            </View>
        </View>
    );
}

function Detail({ icon, label, value, accent }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>{icon}</Text>
            <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={[styles.detailValue, accent && styles.detailAccent]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionHeading: { marginTop: 18, marginBottom: 10 },
    center: {
        flex: 1,
        paddingTop: 60,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
    },
    loadingText:  { color: "#6B7280", fontSize: 13, marginTop: 12 },
    errorText:    { color: "#EF4444", fontSize: 14, textAlign: "center" },
    emptyText:    { color: "#374151", fontSize: 15, fontWeight: "600", textAlign: "center" },
    emptySubText: { color: "#9CA3AF", fontSize: 13, marginTop: 6, textAlign: "center" },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        padding: 14,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 2,
    },
    cardHighlighted: {
        borderColor: "#4F46E5",
        backgroundColor: "#F5F3FF",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    busIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#EEF2FF",
        alignItems: "center",
        justifyContent: "center",
    },
    busEmoji:  { fontSize: 18 },
    routeName: { fontSize: 14, fontWeight: "700", color: "#111827" },
    busNum:    { fontSize: 11, color: "#9CA3AF", marginTop: 2, fontFamily: "monospace" },
    nextBadgeWrap: { alignItems: "flex-end", gap: 4 },
    nextBadge: {
        backgroundColor: "#4F46E5",
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    nextBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    countdownText: { fontSize: 11, color: "#4F46E5", fontWeight: "600" },

    divider: {
        height: 1,
        backgroundColor: "#F3F4F6",
        marginBottom: 10,
    },
    detailsGrid: { gap: 8 },
    detailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    detailIcon:   { fontSize: 13, marginTop: 1 },
    detailLabel:  { fontSize: 11, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
    detailValue:  { fontSize: 13, color: "#374151", fontWeight: "500", marginTop: 1 },
    detailAccent: { color: "#4F46E5", fontWeight: "700" },
});
