import React, { useEffect, useState } from "react";
import axios from "axios";
import WardenLayout from "../../layout/WardenLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { FiBell, FiSend, FiAlertCircle, FiCheck } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function NotificationsAlerts() {
    const { token } = useAuthContext();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const [sent, setSent] = useState(false);

    useEffect(() => {
        if (!token) return;
        axios.get(`${API_BASE}/notifications/`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setNotifications(res.data.notifications || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    const handleSend = async () => {
        if (!text.trim()) return;
        setSending(true);
        setSendError("");
        setSent(false);
        try {
            await axios.post(
                `${API_BASE}/notifications/send`,
                { text: text.trim(), title: "Warden Notice", audience: ["student"] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSent(true);
            setText("");
            setTimeout(() => setSent(false), 3000);
            // Refresh list
            const res = await axios.get(`${API_BASE}/notifications/`, { headers: { Authorization: `Bearer ${token}` } });
            setNotifications(res.data.notifications || []);
        } catch (err) {
            setSendError(err?.response?.data?.message || "Failed to send notification");
        } finally {
            setSending(false);
        }
    };

    return (
        <WardenLayout active="notifications">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Notifications & Alerts</h1>
                    <p className="page-subtitle">Send notices and view recent alerts</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
                {/* Send panel */}
                <div className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                            <FiSend size={14} className="text-violet-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700">Send Notice</h3>
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
                        rows={4}
                        placeholder="Write a notice for students…"
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

                {/* Alerts list */}
                <div className="card">
                    <div className="flex items-center gap-2 px-5 pt-5 pb-3 border-b border-slate-50">
                        <FiBell size={14} className="text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-700">Recent Alerts</h3>
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
                                <p className="text-sm text-slate-400">No alerts</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n._id} className="py-3 flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
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
        </WardenLayout>
    );
}
