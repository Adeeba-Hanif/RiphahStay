import { useState } from "react";
import {
    ActivityIndicator, KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import Input from "../components/Input";
import { API_BASE_URL } from "../utils/apiBase";

const API_BASE = API_BASE_URL;
const BRAND    = "#4F46E5";

const EMAIL_REGEX    = /^[0-9]{5}@students\.riphah\.edu\.pk$/i;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

export default function SignupScreen({ navigation }) {
    const [fullName,        setFullName]        = useState("");
    const [email,           setEmail]           = useState("");
    const [phone,           setPhone]           = useState("");
    const [password,        setPassword]        = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading,         setLoading]         = useState(false);
    const [fieldErrors,     setFieldErrors]     = useState({});
    const [globalError,     setGlobalError]     = useState("");
    const [success,         setSuccess]         = useState(false);

    const clrErr = (f) => setFieldErrors((e) => ({ ...e, [f]: null }));

    const validate = () => {
        const errors = {};
        if (!fullName.trim() || fullName.trim().length < 3)
            errors.fullName = "Full name must be at least 3 characters";
        if (!email.trim())
            errors.email = "Email is required";
        else if (!EMAIL_REGEX.test(email.trim()))
            errors.email = "Use your 5-digit SAP email (e.g. 12345@students.riphah.edu.pk)";
        if (!phone.trim())
            errors.phone = "Phone number is required";
        if (!password)
            errors.password = "Password is required";
        else if (!PASSWORD_REGEX.test(password))
            errors.password = "Min 8 chars, include uppercase, lowercase, number & special character";
        if (!confirmPassword)
            errors.confirmPassword = "Please confirm your password";
        else if (password !== confirmPassword)
            errors.confirmPassword = "Passwords do not match";
        return errors;
    };

    const handleSignup = async () => {
        setGlobalError("");
        const errors = validate();
        if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
        setFieldErrors({});
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/auth/signup`, {
                fullName: fullName.trim(),
                email:    email.trim().toLowerCase(),
                phone:    phone.trim(),
                password,
            });
            setSuccess(true);
        } catch (err) {
            const msg = !err.response
                ? "Cannot reach server. Check your connection."
                : err.response.data?.message || `Signup failed (${err.response.status})`;
            setGlobalError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <View style={styles.root}>
                <StatusBar barStyle="light-content" backgroundColor={BRAND} />
                <View style={styles.successPanel}>
                    <View style={styles.successIcon}>
                        <Ionicons name="checkmark-circle" size={56} color={BRAND} />
                    </View>
                    <Text style={styles.successTitle}>Account Created!</Text>
                    <Text style={styles.successBody}>
                        Your account is ready. You can now sign in using your university email.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => navigation.navigate("Login")}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryBtnText}>Go to Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor={BRAND} />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView edges={["top"]} style={styles.headerInner}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create Account</Text>
                    <Text style={styles.headerSub}>Join the RiphahStay community</Text>
                </SafeAreaView>
            </View>

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
                        {globalError ? (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" />
                                <Text style={styles.errorText}>{globalError}</Text>
                            </View>
                        ) : null}

                        <Field label="Full Name" error={fieldErrors.fullName}>
                            <Input
                                label=""
                                placeholder="Your full name"
                                value={fullName}
                                onChangeText={(v) => { setFullName(v); clrErr("fullName"); }}
                                autoCapitalize="words"
                            />
                        </Field>

                        <Field label="University Email" error={fieldErrors.email}>
                            <Input
                                label=""
                                placeholder="12345@students.riphah.edu.pk"
                                value={email}
                                onChangeText={(v) => { setEmail(v); clrErr("email"); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </Field>

                        <Field label="Phone Number" error={fieldErrors.phone}>
                            <Input
                                label=""
                                placeholder="03XX-XXXXXXX"
                                value={phone}
                                onChangeText={(v) => { setPhone(v); clrErr("phone"); }}
                                keyboardType="phone-pad"
                            />
                        </Field>

                        <Field label="Password" error={fieldErrors.password}>
                            <Input
                                label=""
                                placeholder="Min 8 chars, upper, lower, number, symbol"
                                value={password}
                                onChangeText={(v) => { setPassword(v); clrErr("password"); }}
                                type="password"
                            />
                        </Field>

                        <Field label="Confirm Password" error={fieldErrors.confirmPassword}>
                            <Input
                                label=""
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                onChangeText={(v) => { setConfirmPassword(v); clrErr("confirmPassword"); }}
                                type="password"
                            />
                        </Field>

                        <TouchableOpacity
                            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                            onPress={handleSignup}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.primaryBtnText}>Create Account</Text>
                            }
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate("Login")}
                            style={styles.loginLink}
                        >
                            <Text style={styles.loginLinkText}>
                                Already have an account?{" "}
                                <Text style={styles.loginLinkBold}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function Field({ label, error, children }) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {children}
            {error ? <Text style={styles.fieldErr}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F5F7FA" },

    // Header
    header:      { backgroundColor: BRAND, paddingBottom: 24 },
    headerInner: { paddingHorizontal: 20, paddingTop: 8 },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "rgba(255,255,255,0.18)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
    headerSub:   { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 },

    // Form
    scroll: { padding: 20 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 22,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 4,
    },

    errorBanner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: "#FEE2E2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
    },
    errorText: { flex: 1, color: "#B91C1C", fontSize: 13, fontWeight: "500" },

    fieldGroup:  { marginBottom: 4 },
    fieldLabel:  { fontSize: 12, fontWeight: "700", color: "#374151", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 },
    fieldErr:    { fontSize: 12, color: "#DC2626", marginTop: 4, marginBottom: 6, paddingLeft: 2 },

    primaryBtn: {
        backgroundColor: BRAND,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 8,
        marginBottom: 16,
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

    loginLink:     { alignItems: "center" },
    loginLinkText: { fontSize: 14, color: "#6B7280" },
    loginLinkBold: { fontWeight: "700", color: BRAND },

    // Success screen
    successPanel: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
    },
    successIcon:  { marginBottom: 16 },
    successTitle: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 10 },
    successBody:  { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22, marginBottom: 28 },
});
