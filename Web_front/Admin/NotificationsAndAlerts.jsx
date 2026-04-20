import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { FiBell, FiSend, FiAlertCircle, FiCheck, FiClock } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function NotificationsAlerts() {
    const { token } = useAuthContext();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const [sent, setSent] = useState(false);
    const [lateStats, setLateStats] = useState([]);
    const [lateToday, setLateToday] = useState([]);
    const [lateLoading, setLateLoading] = useState(true);

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API_BASE}/notifications/`, authHeaders);
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLateStats = async () => {
        try {
            const [statsRes, todayRes] = await Promise.allSettled([
                axios.get(`${API_BASE}/attendance/late-stats`, authHeaders),
                axios.get(`${API_BASE}/attendance/late-today`, authHeaders),
            ]);
            if (statsRes.status === "fulfilled") setLateStats(statsRes.value.data.stats ?? []);
            if (todayRes.status === "fulfilled") setLateToday(todayRes.value.data.students ?? []);
        } catch (_) {}
        finally { setLateLoading(false); }
    };

    useEffect(() => {
        if (token) {
            fetchNotifications();
            fetchLateStats();
        }
    }, [token]); // eslint-disable-line

    const handleSend = async () => {
        if (!text.trim()) return;
        setSending(true);
        setSendError("");
        setSent(false);
        try {
            await axios.post(
                `${API_BASE}/notifications/send`,
                { text: text.trim(), title: "Admin Announcement", audience: ["student", "warden"] },
                authHeaders
            );
            setSent(true);
            setText("");
            setTimeout(() => setSent(false), 3000);
            fetchNotifications();
        } catch (err) {
            setSendError(err?.response?.data?.message || "Failed to send notification");
        } finally {
            setSending(false);
        }
    };

    return (
        <AdminLayout active="notifications">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Notifications & Alerts</h1>
                    <p className="page-subtitle">Broadcast announcements to all students</p>
                </div>
            </div>

            {/* Late Students section */}
            <div className="grid md:grid-cols-2 gap-5 mb-5">
                {/* Chart */}
                <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                            <FiClock size={14} className="text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700">Late Returns (7 Days)</h3>
                            <p className="text-[11px] text-slate-400">Students returning after 11 PM curfew</p>
                        </div>
                    </div>
                    {lateLoading ? (
                        <div className="h-40 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={lateStats} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip formatter={(v) => [v, "Late students"]} />
                                <Bar dataKey="late" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Today's late students list */}
                <div className="card">
                    <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-slate-50">
                        <FiClock size={14} className="text-amber-500" />
                        <h3 className="text-sm font-semibold text-slate-700">Late Tonight</h3>
                        {!lateLoading && (
                            <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                                {lateToday.length} students
                            </span>
                        )}
                    </div>
                    <div className="px-5 py-3 divide-y divide-slate-50 max-h-48 overflow-y-auto">
                        {lateLoading ? (
                            <div className="py-6 flex justify-center">
                                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : lateToday.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-sm text-slate-400">No late returns today</p>
                            </div>
                        ) : (
                            lateToday.map((item, i) => (
                                <div key={i} className="py-2.5 flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-amber-700">
                                            {item.student?.fullName?.[0]?.toUpperCase() ?? "S"}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{item.student?.fullName ?? "Unknown"}</p>
                                        <p className="text-[11px] text-slate-400">{item.student?.email}</p>
                                    </div>
                                    <p className="text-xs text-amber-600 font-semibold shrink-0">
                                        {new Date(item.returnTime).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
                {/* Compose panel */}
                <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <FiSend size={14} className="text-indigo-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700">Send Announcement</h3>
                    </div>

                    {sendError && (
                        <div className="mb-3 flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                            <FiAlertCircle size={13} className="text-rose-500 shrink-0" />
                            <p className="text-xs text-rose-700">{sendError}</p>
                        </div>
                    )}
                    {sent && (
                        <div className="mb-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                            <FiCheck size={13} className="text-emerald-600 shrink-0" />
                            <p className="text-xs text-emerald-700">Notification sent successfully.</p>
                        </div>
                    )}

                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="field text-sm resize-none mb-3"
                        rows={5}
                        placeholder="Write an announcement for wardens and students…"
                    />
                    <button
                        onClick={handleSend}
                        disabled={sending || !text.trim()}
                        className="btn-md btn-primary w-full gap-2 disabled:opacity-50"
                    >
                        <FiSend size={13} />
                        {sending ? "Sending…" : "Send Notification"}
                    </button>
                </div>

                {/* Alerts feed */}
                <div className="card">
                    <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-slate-50">
                        <FiBell size={14} className="text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-700">Recent Alerts</h3>
                        {!loading && notifications.length > 0 && (
                            <span className="ml-auto text-[11px] text-slate-400">{notifications.length} total</span>
                        )}
                    </div>
                    <div className="px-5 py-3 divide-y divide-slate-50 max-h-96 overflow-y-auto">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="py-3 flex gap-3 animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1.5 shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                                        <div className="h-2.5 bg-slate-100 rounded w-1/3" />
                                    </div>
                                </div>
                            ))
                        ) : notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <FiBell className="mx-auto text-slate-200 mb-2" size={24} />
                                <p className="text-sm text-slate-400">No alerts yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n._id} className="py-3 flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 leading-snug">{n.text || n.title || n.message}</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {new Date(n.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
