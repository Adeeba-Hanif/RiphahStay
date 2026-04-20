import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext.jsx";
import { FiEye, FiEyeOff, FiAlertCircle, FiLock, FiMail } from "react-icons/fi";

export default function Login() {
    const navigate = useNavigate();
    const { login, error: ctxError } = useContext(AuthContext);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError("");

        if (!email.trim() || !password) {
            setLocalError("Email and password are required.");
            return;
        }

        setIsSubmitting(true);
        try {
            const data = await login({ email: email.trim().toLowerCase(), password });
            const role = data.user?.role;
            if (role === "admin") navigate("/admin", { replace: true });
            else if (role === "warden") navigate("/warden", { replace: true });
            else setLocalError("Your account role cannot access this portal.");
        } catch (err) {
            setLocalError(err.message || "Login failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const finalError = localError || ctxError;

    return (
        <div className="min-h-screen flex bg-[#EEF2F8]">
            {/* ── Left panel ── */}
            <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12" style={{ background: "linear-gradient(135deg, #4F46E5 0%, #6D28D9 60%, #4338CA 100%)" }}>
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                </div>

                {/* Logo */}
                <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <span className="text-white font-bold text-lg tracking-tight">RiphahStay</span>
                </div>

                {/* Hero text */}
                <div className="relative space-y-6">
                    <div>
                        <h2 className="text-4xl font-bold text-white leading-tight">
                            Hostel management,<br />
                            <span className="text-indigo-200">beautifully simple.</span>
                        </h2>
                        <p className="mt-4 text-indigo-100/80 text-base leading-relaxed max-w-sm">
                            Manage students, rooms, complaints, challans, and more  from one unified platform.
                        </p>
                    </div>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2">
                        {["Student Management", "Finance & Challans", "QR Attendance", "Room Allocation", "Complaints"].map((f) => (
                            <span key={f} className="text-xs font-medium bg-white/15 text-white border border-white/20 px-3 py-1.5 rounded-full">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative flex items-center gap-2 text-indigo-200/60 text-xs">
                    <span>Riphah International University</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span>Islamabad, Pakistan</span>
                </div>
            </div>

            {/* ── Right panel ── */}
            <div className="flex-1 flex px-6 py-12">
                <div className="m-auto w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <span className="text-indigo-600 font-bold text-lg">RiphahStay</span>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#4F46E5" }}>Welcome back</h1>
                        <p className="text-slate-500 text-sm mt-1.5">Sign in to your admin or warden account.</p>
                    </div>

                    {/* Error */}
                    {finalError && (
                        <div className="mb-5 flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
                            <FiAlertCircle className="shrink-0 mt-0.5" size={15} />
                            <span>{finalError}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="field-label">Email address</label>
                            <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0 0.875rem", gap: "0.5rem", transition: "box-shadow 150ms" }}
                                onFocus={(e) => e.currentTarget.style.boxShadow = "0 0 0 2px #4F46E5"}
                                onBlur={(e) => e.currentTarget.style.boxShadow = "none"}
                            >
                                <FiMail size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setLocalError(""); }}
                                    style={{ flex: 1, padding: "0.625rem 0", fontSize: "0.875rem", color: "#1e293b", outline: "none", background: "transparent", border: "none" }}
                                    placeholder="admin@riphah.edu.pk"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="field-label mb-0">Password</label>
                                <button
                                    type="button"
                                    onClick={() => navigate("/forgot-password")}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Forgot password?
                                </button>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "0.5rem", padding: "0 0.875rem", gap: "0.5rem", transition: "box-shadow 150ms" }}
                                onFocus={(e) => e.currentTarget.style.boxShadow = "0 0 0 2px #4F46E5"}
                                onBlur={(e) => e.currentTarget.style.boxShadow = "none"}
                            >
                                <FiLock size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setLocalError(""); }}
                                    style={{ flex: 1, padding: "0.625rem 0", fontSize: "0.875rem", color: "#1e293b", outline: "none", background: "transparent", border: "none" }}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    style={{ color: "#94a3b8", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-lg btn-primary w-full mt-4 shadow-lg hover:-translate-y-0.5 transition-all duration-150"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Signing in…
                                </>
                            ) : "Sign In"}
                        </button>
                    </form>

                    {/* Access note */}
                    <p className="mt-6 text-center text-xs text-slate-400">
                        This portal is restricted to <span className="font-medium text-slate-500">Admin</span> and <span className="font-medium text-slate-500">Warden</span> accounts only.
                    </p>
                </div>
            </div>
        </div>
    );
}
