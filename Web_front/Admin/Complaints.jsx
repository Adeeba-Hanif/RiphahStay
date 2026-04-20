import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context";
import { FiAlertCircle, FiClock, FiCheckCircle, FiXCircle, FiMessageSquare } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

const TABS = [
    { key: "pending",  label: "Pending",  Icon: FiClock,        badge: "badge-amber" },
    { key: "resolved", label: "Resolved", Icon: FiCheckCircle,  badge: "badge-green" },
    { key: "rejected", label: "Rejected", Icon: FiXCircle,      badge: "badge-gray"  },
];

export default function Complaints() {
    const { token } = useAuthContext();
    const [allComplaints, setAllComplaints] = useState({ pending: [], resolved: [], rejected: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("pending");
    const [actionLoading, setActionLoading] = useState({});

    useEffect(() => {
        if (!token) return;
        axios.get(`${API_BASE}/complaints/all`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                const all = res.data.complaints || [];
                setAllComplaints({
                    pending:  all.filter((c) => c.status === "pending"),
                    resolved: all.filter((c) => c.status === "resolved"),
                    rejected: all.filter((c) => c.status === "rejected"),
                });
            })
            .catch((err) => setError(err.response?.data?.message || "Failed to load complaints"))
            .finally(() => setLoading(false));
    }, [token]);

    const handleDecision = async (id, status, responseText = "") => {
        setActionLoading((p) => ({ ...p, [id]: true }));
        try {
            await axios.patch(
                `${API_BASE}/complaints/${id}/decide`,
                { status, response: responseText },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAllComplaints((prev) => {
                const complaint = prev.pending.find((c) => c._id === id);
                const updated = { ...complaint, status, response: responseText };
                return {
                    pending:  prev.pending.filter((c) => c._id !== id),
                    resolved: status === "resolved" ? [updated, ...prev.resolved] : prev.resolved,
                    rejected: status === "rejected" ? [updated, ...prev.rejected] : prev.rejected,
                };
            });
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update complaint");
        } finally {
            setActionLoading((p) => ({ ...p, [id]: false }));
        }
    };

    const currentList = allComplaints[activeTab] || [];

    return (
        <AdminLayout active="complaints">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Complaints</h1>
                    <p className="page-subtitle">Review and respond to student complaints</p>
                </div>
            </div>

            {error && (
                <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <FiAlertCircle size={14} /> {error}
                </div>
            )}

            {/* Tab bar */}
            <div className="flex gap-1 mb-5 bg-white border border-slate-100 p-1 rounded-xl w-fit shadow-sm">
                {TABS.map(({ key, label, Icon }) => {
                    const count = allComplaints[key]?.length ?? 0;
                    const isActive = activeTab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                isActive
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            <Icon size={13} />
                            {label}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${
                                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="card p-5 animate-pulse space-y-3">
                            <div className="h-4 bg-slate-100 rounded w-2/3" />
                            <div className="h-3 bg-slate-100 rounded w-full" />
                            <div className="h-3 bg-slate-100 rounded w-3/4" />
                        </div>
                    ))}
                </div>
            ) : currentList.length === 0 ? (
                <div className="card py-20 text-center">
                    <FiCheckCircle className="mx-auto text-slate-200 mb-3" size={36} />
                    <p className="text-sm font-medium text-slate-500">No {activeTab} complaints</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {currentList.map((c) => (
                        <ComplaintCard
                            key={c._id}
                            complaint={c}
                            isLoading={actionLoading[c._id]}
                            onDecide={handleDecision}
                            isPending={activeTab === "pending"}
                        />
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}

function ComplaintCard({ complaint: c, isLoading, onDecide, isPending }) {
    const [responseText, setResponseText] = useState("");

    const statusStyle = {
        pending:  "badge-amber",
        resolved: "badge-green",
        rejected: "badge-gray",
    };

    return (
        <div className="card p-5 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 truncate">{c.title || "Untitled"}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(c.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                </div>
                <span className={`badge ${statusStyle[c.status] || "badge-gray"} shrink-0`}>{c.status}</span>
            </div>

            {/* Body */}
            <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>

            {/* Student info */}
            {c.student && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-bold shrink-0">
                        {c.student.fullName?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{c.student.fullName}</p>
                        {c.student.room && (
                            <p className="text-[10px] text-slate-400">
                                {c.student.room.level} • {c.student.room.roomNumber}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Previous response */}
            {c.response && (
                <div className="bg-slate-50 rounded-lg px-3 py-2 flex gap-2">
                    <FiMessageSquare size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-slate-500 italic">{c.response}</p>
                </div>
            )}

            {/* Actions for pending */}
            {isPending && (
                <div className="space-y-2 pt-1 border-t border-slate-50">
                    <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        className="field text-xs py-2 resize-none"
                        rows={2}
                        placeholder="Add a response (optional)…"
                    />
                    <div className="flex gap-2">
                        <button
                            disabled={isLoading}
                            onClick={() => onDecide(c._id, "resolved", responseText)}
                            className="btn-sm btn-success flex-1 disabled:opacity-50"
                        >
                            {isLoading ? "…" : "Resolve"}
                        </button>
                        <button
                            disabled={isLoading}
                            onClick={() => onDecide(c._id, "rejected", responseText)}
                            className="btn-sm btn-danger flex-1 disabled:opacity-50"
                        >
                            {isLoading ? "…" : "Reject"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
