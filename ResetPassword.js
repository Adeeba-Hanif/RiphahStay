import { useState } from "react";
import {
    ActivityIndicator, KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Input from "../components/Input";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiBase";

const BRAND = "#4F46E5";
const SERVER_URI = API_BASE_URL;

export default function ResetPasswordScreen({ navigation }) {
    const [step, setStep] = useState(1); // 1 = email, 2 = otp + new password

    // Step 1
    const [email, setEmail] = useState("");

    // Step 2
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [fieldErrors, setFieldErrors] = useState({});
    const [globalError, setGlobalError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);

    const clearErrors = () => { setFieldErrors({}); setGlobalError(""); setSuccessMsg(""); };

    /* ── Step 1: send OTP ── */
    const validateEmail = () => {
        const errors = {};
        const e = email.trim().toLowerCase();
        if (!e) errors.email = "Email is required";
        else if (!e.includes("@")) errors.email = "Enter a valid email address";
        return errors;
    };

    const handleSendOtp = async () => {
        clearErrors();
        const errors = validateEmail();
        if (Object.keys(errors).length) { setFieldErrors(errors); return; }

        setLoading(true);
        try {
            await axios.post(`${SERVER_URI}/auth/forgot-password`, {
                email: email.trim().toLowerCase(),
            });
            setSuccessMsg("OTP sent! Check your email inbox.");
            setStep(2);
        } catch (err) {
            setGlobalError(err?.response?.data?.message || "Failed to send OTP. Try again.");
        } finally {
            setLoading(false);
        }
    };

    /* ── Step 2: verify OTP + set new password ── */
    const validateReset = () => {
        const errors = {};
        if (!otp.trim())            errors.otp = "OTP is required";
        if (!newPassword)           errors.newPassword = "New password is required";
        else if (newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters";
        if (!confirmPassword)       errors.confirmPassword = "Please confirm your password";
        else if (newPassword !== confirmPassword) errors.confirmPassword = "Passwords do not match";
        return errors;
    };

    const handleResetPassword = async () => {
        clearErrors();
        const errors = validateReset();
        if (Object.keys(errors).length) { setFieldErrors(errors); return; }

        setLoading(true);
        try {
            await axios.post(`${SERVER_URI}/auth/reset-password`, {
                email: email.trim().toLowerCase(),
                otp: otp.trim().toUpperCase(),
                newPassword,
            });
            setSuccessMsg("Password reset successfully!");
            setTimeout(() => navigation.navigate("Login"), 1500);
        } catch (err) {
            setGlobalError(err?.response?.data?.message || "Invalid or expired OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 2) { setStep(1); clearErrors(); setOtp(""); setNewPassword(""); setConfirmPassword(""); }
        else navigation.goBack();
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={BRAND} />

            {/* Top brand panel */}
            <View style={styles.topPanel}>
                <SafeAreaView edges={["top"]} style={styles.topPanelInner}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.iconWrap}>
                        <Ionicons name="lock-closed-outline" size={32} color="#fff" />
                    </View>
                    <Text style={styles.panelTitle}>Reset Password</Text>
                    <Text style={styles.panelSubtitle}>
                        {step === 1 ? "We'll send an OTP to your email" : "Enter the OTP and choose a new password"}
                    </Text>

                    {/* Step indicator */}
                    <View style={styles.stepRow}>
                        <View style={[styles.stepDot, styles.stepDotActive]} />
                        <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
                        <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
                    </View>
                </SafeAreaView>
            </View>

            {/* Form card */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>

                        <Text style={styles.cardTitle}>
                            {step === 1 ? "Step 1 — Enter your email" : "Step 2 — Verify & set password"}
                        </Text>

                        {/* Error banner */}
                        {globalError ? (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
                                <Text style={styles.errorBannerText}>{globalError}</Text>
                            </View>
                        ) : null}

                        {/* Success banner */}
                        {successMsg ? (
                            <View style={styles.successBanner}>
                                <Ionicons name="checkmark-circle-outline" size={16} color="#065F46" style={{ marginRight: 6 }} />
                                <Text style={styles.successBannerText}>{successMsg}</Text>
                            </View>
                        ) : null}

                        {/* ── STEP 1 ── */}
                        {step === 1 && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Input
                                        label="University Email"
                                        placeholder="12345@students.riphah.edu.pk"
                                        type="email"
                                        value={email}
                                        onChangeText={(v) => { setEmail(v); setFieldErrors((e) => ({ ...e, email: null })); setGlobalError(""); }}
                                    />
                                    {fieldErrors.email ? <Text style={styles.fieldErr}>{fieldErrors.email}</Text> : null}
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, loading && styles.btnDisabled]}
                                    onPress={handleSendOtp}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.primaryBtnText}>Send OTP</Text>
                                    }
                                </TouchableOpacity>
                            </>
                        )}

                        {/* ── STEP 2 ── */}
                        {step === 2 && (
                            <>
                                {/* Locked email display */}
                                <View style={styles.emailBadge}>
                                    <Ionicons name="mail-outline" size={14} color={BRAND} />
                                    <Text style={styles.emailBadgeText} numberOfLines={1}>{email}</Text>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Input
                                        label="OTP Code"
                                        placeholder="Enter OTP from email"
                                        type="room"
                                        value={otp}
                                        onChangeText={(v) => { setOtp(v); setFieldErrors((e) => ({ ...e, otp: null })); setGlobalError(""); }}
                                        autoCapitalize="characters"
                                        maxLength={8}
                                    />
                                    {fieldErrors.otp ? <Text style={styles.fieldErr}>{fieldErrors.otp}</Text> : null}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Input
                                        label="New Password"
                                        placeholder="Min 8 characters"
                                        type="password"
                                        value={newPassword}
                                        onChangeText={(v) => { setNewPassword(v); setFieldErrors((e) => ({ ...e, newPassword: null })); }}
                                    />
                                    {fieldErrors.newPassword ? <Text style={styles.fieldErr}>{fieldErrors.newPassword}</Text> : null}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Input
                                        label="Confirm Password"
                                        placeholder="Repeat new password"
                                        type="password"
                                        value={confirmPassword}
                                        onChangeText={(v) => { setConfirmPassword(v); setFieldErrors((e) => ({ ...e, confirmPassword: null })); }}
                                    />
                                    {fieldErrors.confirmPassword ? <Text style={styles.fieldErr}>{fieldErrors.confirmPassword}</Text> : null}
                                </View>

                                <TouchableOpacity
                                    style={[styles.primaryBtn, loading && styles.btnDisabled]}
                                    onPress={handleResetPassword}
                                    disabled={loading}
                                    activeOpacity={0.85}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.primaryBtnText}>Reset Password</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.resendBtn}
                                    onPress={handleSendOtp}
                                    disabled={loading}
                                >
                                    <Text style={styles.resendText}>Didn't receive OTP?  </Text>
                                    <Text style={styles.resendLink}>Resend</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Back to Login */}
                        <View style={styles.loginRow}>
                            <Text style={styles.loginHint}>Remember your password?  </Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                                <Text style={styles.loginLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F5F7FA" },

    /* Top panel */
    topPanel: { backgroundColor: BRAND, paddingBottom: 36 },
    topPanelInner: { alignItems: "center", paddingHorizontal: 24, paddingTop: 16 },
    backBtn: { alignSelf: "flex-start", marginBottom: 12 },
    iconWrap: {
        width: 64, height: 64, borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderWidth: 2, borderColor: "rgba(255,255,255,0.35)",
        alignItems: "center", justifyContent: "center", marginBottom: 12,
    },
    panelTitle: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
    panelSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 4, textAlign: "center" },

    /* Step indicator */
    stepRow: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 0 },
    stepDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: "rgba(255,255,255,0.35)",
    },
    stepDotActive: { backgroundColor: "#fff" },
    stepLine: { width: 48, height: 2, backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 6 },
    stepLineActive: { backgroundColor: "#fff" },

    /* Form card */
    scroll: { padding: 20 },
    card: {
        backgroundColor: "#fff", borderRadius: 20, padding: 22,
        shadowColor: "#000", shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 16 },

    /* Banners */
    errorBanner: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA",
        borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14,
    },
    errorBannerText: { color: "#B91C1C", fontSize: 13, fontWeight: "500", flex: 1 },
    successBanner: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: "#D1FAE5", borderWidth: 1, borderColor: "#A7F3D0",
        borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14,
    },
    successBannerText: { color: "#065F46", fontSize: 13, fontWeight: "500", flex: 1 },

    /* Email badge (step 2) */
    emailBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: "#EEF2FF", borderRadius: 8,
        paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12,
    },
    emailBadgeText: { color: BRAND, fontSize: 13, fontWeight: "600", flex: 1 },

    inputGroup: { marginBottom: 2 },
    fieldErr: { color: "#DC2626", fontSize: 12, marginTop: 2, marginBottom: 6, paddingLeft: 2 },

    /* Buttons */
    primaryBtn: {
        backgroundColor: BRAND, paddingVertical: 14,
        borderRadius: 12, alignItems: "center", marginTop: 8, marginBottom: 16,
    },
    btnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    resendBtn: { flexDirection: "row", justifyContent: "center", marginBottom: 16 },
    resendText: { fontSize: 13, color: "#9CA3AF" },
    resendLink: { fontSize: 13, color: BRAND, fontWeight: "600" },

    loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
    loginHint: { fontSize: 13, color: "#9CA3AF" },
    loginLink: { fontSize: 13, color: BRAND, fontWeight: "600" },
});
