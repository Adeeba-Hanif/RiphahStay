import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiMail, FiLock, FiArrowLeft, FiCheck, FiAlertCircle } from "react-icons/fi";

const API = import.meta.env.VITE_API_BASE;

export default function ResetPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    const [email, setEmail]               = useState("");
    const [otp, setOtp]                   = useState("");
    const [newPassword, setNewPassword]   = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState("");
    const [success, setSuccess]     = useState("");

    /* ── Step 1: send OTP ── */
    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");
        if (!email.trim()) { setError("Email is required."); return; }

        setLoading(true);
        try {
            await axios.post(`${API}/auth/forgot-password`, { email: email.trim().toLowerCase() });
            setSuccess("OTP sent! Check your email inbox.");
            setStep(2);
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to send OTP. Try again.");
        } finally {
            setLoading(false);
        }
    };

    /* ── Step 2: verify OTP + reset ── */
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");

        if (!otp.trim())              { setError("OTP is required."); return; }
        if (!newPassword)             { setError("New password is required."); return; }
        if (newPassword.length < 8)   { setError("Password must be at least 8 characters."); return; }
        if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

        setLoading(true);
        try {
            await axios.post(`${API}/auth/reset-password`, {
                email: email.trim().toLowerCase(),
                otp: otp.trim().toUpperCase(),
                newPassword,
            });
            setSuccess("Password reset successfully! Redirecting to login…");
            setTimeout(() => navigate("/login"), 1800);
        } catch (err) {
            setError(err?.response?.data?.message || "Invalid or expired OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1); setError(""); setSuccess("");
            setOtp(""); setNewPassword(""); setConfirmPassword("");
        } else {
            navigate("/login");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#EEF2F8] px-4">
            <div className="w-full max-w-md">

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">

                    {/* Header */}
                    <div style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)", padding: "28px 28px 24px" }}>
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
                        >
                            <FiArrowLeft size={14} /> Back
                        </button>
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                            <FiLock size={22} color="#fff" />
                        </div>
                        <h1 className="text-white text-xl font-bold">Reset Password</h1>
                        <p className="text-white/70 text-sm mt-1">
                            {step === 1 ? "Enter your email to receive an OTP" : "Enter the OTP and your new password"}
                        </p>

                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mt-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                            <div style={{ width: 36, height: 2, background: step === 2 ? "#fff" : "rgba(255,255,255,0.3)", borderRadius: 2 }} />
                            <div className={`w-2.5 h-2.5 rounded-full ${step === 2 ? "bg-white" : "bg-white/30"}`} />
                        </div>
                    </div>

                    {/* Form body */}
                    <div className="p-7">

                        {/* Error banner */}
                        {error && (
                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-3 py-2.5 rounded-lg mb-4">
                                <FiAlertCircle size={14} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Success banner */}
                        {success && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2.5 rounded-lg mb-4">
                                <FiCheck size={14} className="shrink-0" />
                                {success}
                            </div>
                        )}

                        {/* ── STEP 1 ── */}
                        {step === 1 && (
                            <form onSubmit={handleSendOtp} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        Email Address
                                    </label>
                                    <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0 0.875rem", gap: "0.5rem" }}>
                                        <FiMail size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                            placeholder="admin@staff.riphah.edu.pk"
                                            style={{ flex: 1, padding: "0.625rem 0", fontSize: "0.875rem", outline: "none", background: "transparent", border: "none" }}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-lg btn-primary w-full"
                                >
                                    {loading ? "Sending OTP…" : "Send OTP"}
                                </button>
                            </form>
                        )}

                        {/* ── STEP 2 ── */}
                        {step === 2 && (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                {/* Locked email pill */}
                                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                                    <FiMail size={13} style={{ color: "#4F46E5", flexShrink: 0 }} />
                                    <span className="text-indigo-700 text-sm font-medium truncate">{email}</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">OTP Code</label>
                                    <input
                                        className="field tracking-widest text-center text-lg font-bold"
                                        value={otp}
                                        onChange={(e) => { setOtp(e.target.value.toUpperCase()); setError(""); }}
                                        placeholder="XXXXXXXX"
                                        maxLength={8}
                                        autoCapitalize="characters"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password</label>
                                    <input
                                        type="password"
                                        className="field"
                                        value={newPassword}
                                        onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                                        placeholder="Min 8 characters"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm New Password</label>
                                    <input
                                        type="password"
                                        className="field"
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                        placeholder="Repeat new password"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-lg btn-primary w-full"
                                >
                                    {loading ? "Resetting…" : "Reset Password"}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                    className="w-full text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                                >
                                    Didn't receive OTP? <span className="font-semibold text-indigo-600">Resend</span>
                                </button>
                            </form>
                        )}

                        <p className="text-center text-sm text-slate-400 mt-5">
                            Remember your password?{" "}
                            <button onClick={() => navigate("/login")} className="text-indigo-600 font-semibold hover:underline">
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
