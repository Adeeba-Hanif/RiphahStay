import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, ScrollView, RefreshControl,
} from "react-native";
import axios from "axios";
import Layout from "../components/Layout";
import Typography from "../components/Typography";
import { useAuthContext } from "../context";
import { API_BASE_URL } from "../utils/apiBase";

const API_BASE = API_BASE_URL;

const CATEGORIES = [
    { key: "overall",     label: "Overall",      icon: "⭐" },
    { key: "cleanliness", label: "Cleanliness",  icon: "🧹" },
    { key: "food",        label: "Food / Mess",  icon: "🍽️" },
    { key: "staff",       label: "Staff",        icon: "👥" },
    { key: "facilities",  label: "Facilities",   icon: "🏠" },
    { key: "security",    label: "Security",     icon: "🔒" },
];

export default function Review() {
    const { token } = useAuthContext();

    // Form state
    const [rating,      setRating]      = useState(0);
    const [category,    setCategory]    = useState("overall");
    const [title,       setTitle]       = useState("");
    const [description, setDescription] = useState("");
    const [submitting,  setSubmitting]  = useState(false);

    // Past reviews
    const [myReviews,   setMyReviews]   = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [refreshing,  setRefreshing]  = useState(false);

    const fetchMyReviews = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoadingHistory(true);
        try {
            const res = await axios.get(`${API_BASE}/reviews/my`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMyReviews(res.data.reviews || []);
        } catch (err) {
            console.error("fetchMyReviews:", err?.response?.data || err.message);
        } finally {
            setLoadingHistory(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => { if (token) fetchMyReviews(); }, [fetchMyReviews]);

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert("No rating selected", "Please choose a star rating before submitting.");
            return;
        }
        if (description.trim().length < 10) {
            Alert.alert("Too short", "Please write at least 10 characters in your review.");
            return;
        }

        setSubmitting(true);
        try {
            await axios.post(
                `${API_BASE}/reviews`,
                { rating, category, title: title.trim(), text: description.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Alert.alert("Review submitted", "Thank you for your feedback!");
            setRating(0); setCategory("overall"); setTitle(""); setDescription("");
            fetchMyReviews();
        } catch (err) {
            Alert.alert("Error", err?.response?.data?.message || "Failed to submit review. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout title="Reviews" showBack scroll={false}>
            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => fetchMyReviews(true)} />
                }
            >
                {/* ── Submit form ── */}
                <View style={styles.formCard}>
                    <Typography variant="heading" style={styles.formTitle}>
                        Rate Your Stay
                    </Typography>
                    <Text style={styles.formSubtitle}>
                        Your feedback helps us improve
                    </Text>

                    {/* Category selector */}
                    <Text style={styles.label}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {CATEGORIES.map((c) => (
                            <TouchableOpacity
                                key={c.key}
                                onPress={() => setCategory(c.key)}
                                style={[styles.catChip, category === c.key && styles.catChipActive]}
                            >
                                <Text style={styles.catIcon}>{c.icon}</Text>
                                <Text style={[styles.catLabel, category === c.key && styles.catLabelActive]}>
                                    {c.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Star rating */}
                    <Text style={styles.label}>Rating</Text>
                    <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
                                <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
                            </TouchableOpacity>
                        ))}
                        {rating > 0 && (
                            <Text style={styles.ratingLabel}>
                                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                            </Text>
                        )}
                    </View>

                    {/* Optional title */}
                    <Text style={styles.label}>Title (optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Great facilities and staff"
                        placeholderTextColor="#9CA3AF"
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                    />

                    {/* Description */}
                    <Text style={styles.label}>Your review *</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        textAlignVertical="top"
                        placeholder="Tell us what was great or what we can improve…"
                        placeholderTextColor="#9CA3AF"
                        value={description}
                        onChangeText={setDescription}
                        maxLength={1000}
                    />
                    <Text style={styles.charCount}>{description.length}/1000</Text>

                    <TouchableOpacity
                        style={[styles.submitBtn, (submitting || rating === 0) && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting || rating === 0}
                        activeOpacity={0.85}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.submitBtnText}>Submit Review</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── My past reviews ── */}
                <View style={styles.historySection}>
                    <Typography variant="heading" style={styles.historyTitle}>
                        My Reviews
                    </Typography>

                    {loadingHistory ? (
                        <ActivityIndicator color="#4F46E5" style={{ marginTop: 20 }} />
                    ) : myReviews.length === 0 ? (
                        <View style={styles.emptyHistory}>
                            <Text style={styles.emptyHistoryText}>You haven't submitted any reviews yet</Text>
                        </View>
                    ) : (
                        myReviews.map((rev) => (
                            <PastReview key={rev._id} review={rev} />
                        ))
                    )}
                </View>
            </ScrollView>
        </Layout>
    );
}

function PastReview({ review }) {
    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
    const cat   = CATEGORIES.find((c) => c.key === review.category) || CATEGORIES[0];
    const date  = new Date(review.createdAt).toLocaleDateString("en-PK", {
        day: "numeric", month: "short", year: "numeric"
    });

    return (
        <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
                <View style={styles.reviewMeta}>
                    <Text style={styles.reviewCatIcon}>{cat.icon}</Text>
                    <Text style={styles.reviewCat}>{cat.label}</Text>
                </View>
                <Text style={styles.reviewDate}>{date}</Text>
            </View>

            <Text style={styles.reviewStars}>{stars}</Text>

            {review.title ? (
                <Text style={styles.reviewTitle}>{review.title}</Text>
            ) : null}
            <Text style={styles.reviewText}>{review.text}</Text>

            {review.adminReply ? (
                <View style={styles.replyBox}>
                    <Text style={styles.replyLabel}>Admin Reply</Text>
                    <Text style={styles.replyText}>{review.adminReply}</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    formCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
    },
    formTitle:    { marginBottom: 2 },
    formSubtitle: { fontSize: 13, color: "#6B7280", marginBottom: 16 },

    label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 4 },

    // Category chips
    categoryScroll:  { flexDirection: "row", marginBottom: 4 },
    catChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        backgroundColor: "#F9FAFB",
    },
    catChipActive: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
    catIcon:  { fontSize: 13 },
    catLabel: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
    catLabelActive: { color: "#4F46E5", fontWeight: "700" },

    // Stars
    starsRow:    { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
    star:        { fontSize: 32, color: "#D1D5DB" },
    starActive:  { color: "#F59E0B" },
    ratingLabel: { fontSize: 13, color: "#6B7280", marginLeft: 8, fontWeight: "600" },

    // Input
    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: "#111827",
        backgroundColor: "#FAFAFA",
        marginBottom: 12,
    },
    textArea:  { height: 100 },
    charCount: { fontSize: 11, color: "#9CA3AF", textAlign: "right", marginTop: -8, marginBottom: 16 },

    // Submit button
    submitBtn: {
        backgroundColor: "#4F46E5",
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: "center",
    },
    submitBtnDisabled: { backgroundColor: "#C7D2FE" },
    submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    // History section
    historySection: { marginTop: 4 },
    historyTitle:   { marginBottom: 12 },
    emptyHistory:   { alignItems: "center", paddingVertical: 24 },
    emptyHistoryText: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },

    reviewCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    reviewHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    reviewMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
    reviewCatIcon: { fontSize: 13 },
    reviewCat:  { fontSize: 12, color: "#6B7280", fontWeight: "600" },
    reviewDate: { fontSize: 11, color: "#9CA3AF" },
    reviewStars: { fontSize: 16, color: "#F59E0B", letterSpacing: 2, marginBottom: 6 },
    reviewTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
    reviewText:  { fontSize: 13, color: "#374151", lineHeight: 20 },

    replyBox: {
        marginTop: 10,
        backgroundColor: "#EEF2FF",
        borderRadius: 8,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: "#4F46E5",
    },
    replyLabel: { fontSize: 11, fontWeight: "700", color: "#4F46E5", marginBottom: 3 },
    replyText:  { fontSize: 12, color: "#374151" },
});
