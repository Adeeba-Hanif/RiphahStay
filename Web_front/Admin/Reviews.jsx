import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import {
    FiStar, FiMessageSquare, FiEye, FiEyeOff, FiTrash2,
    FiX, FiFilter, FiTrendingUp, FiCornerDownRight,
} from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

const CATEGORIES = ["all", "overall", "cleanliness", "food", "staff", "facilities", "security"];

const STAR_COLORS = {
    5: "text-emerald-500",
    4: "text-teal-500",
    3: "text-amber-500",
    2: "text-orange-500",
    1: "text-rose-500",
};

function StarRating({ rating, size = 14 }) {
    return (
        <span className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <FiStar
                    key={s}
                    size={size}
                    className={s <= rating ? STAR_COLORS[rating] : "text-slate-200"}
                    fill={s <= rating ? "currentColor" : "none"}
                />
            ))}
        </span>
    );
}

export default function Reviews() {
    const { token } = useAuthContext();
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const [filterCategory, setFilterCategory] = useState("all");
    const [filterPublished, setFilterPublished] = useState("all");

    const [replyingId, setReplyingId] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [replyLoading, setReplyLoading] = useState(false);

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterCategory !== "all") params.category = filterCategory;
            if (filterPublished !== "all") params.isPublished = filterPublished === "published";

            const [reviewsRes, statsRes] = await Promise.allSettled([
                axios.get(`${API_BASE}/reviews`, { ...authHeaders, params }),
                axios.get(`${API_BASE}/reviews/stats`, authHeaders),
            ]);

            if (reviewsRes.status === "fulfilled") setReviews(reviewsRes.value.data.reviews || []);
            if (statsRes.status   === "fulfilled") setStats(statsRes.value.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, filterCategory, filterPublished]); // eslint-disable-line

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleTogglePublish = async (id) => {
        try {
            await axios.patch(`${API_BASE}/reviews/${id}/publish`, {}, authHeaders);
            fetchData();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this review? This cannot be undone.")) return;
        try {
            await axios.delete(`${API_BASE}/reviews/${id}`, authHeaders);
            fetchData();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to delete");
        }
    };

    const handleReply = async () => {
        if (!replyText.trim()) return;
        setReplyLoading(true);
        try {
            await axios.patch(`${API_BASE}/reviews/${replyingId}/reply`, { reply: replyText }, authHeaders);
            setReplyingId(null);
            setReplyText("");
            fetchData();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to send reply");
        } finally {
            setReplyLoading(false);
        }
    };

    return (
        <AdminLayout active="reviews">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Student Reviews</h1>
                    <p className="page-subtitle">View, reply to, and manage student feedback</p>
                </div>
            </div>

            {/* Stats row */}
            {stats && (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4">
                        <p className="text-xs text-slate-500 font-medium mb-1">Total Reviews</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.stats?.totalReviews ?? 0}</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-xs text-slate-500 font-medium mb-1">Average Rating</p>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-2xl font-bold text-slate-800">{stats.stats?.averageRating ?? ""}</p>
                            {stats.stats?.averageRating > 0 && (
                                <StarRating rating={Math.round(stats.stats.averageRating)} size={13} />
                            )}
                        </div>
                    </div>
                    <div className="card p-4 col-span-2">
                        <p className="text-xs text-slate-500 font-medium mb-2">Rating Distribution</p>
                        <div className="space-y-1">
                            {[5, 4, 3, 2, 1].map((n) => {
                                const count = stats.stats?.distribution?.[n] ?? 0;
                                const total = stats.stats?.totalReviews || 1;
                                const pct   = Math.round((count / total) * 100);
                                return (
                                    <div key={n} className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-500 w-3">{n}</span>
                                        <FiStar size={10} className={STAR_COLORS[n]} fill="currentColor" />
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-400 rounded-full transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-[11px] text-slate-400 w-7 text-right">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card p-4 mb-5 flex gap-3 flex-wrap items-center">
                <FiFilter size={13} className="text-slate-400 shrink-0" />
                <div className="flex gap-1.5 flex-wrap">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c}
                            onClick={() => setFilterCategory(c)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition-all ${
                                filterCategory === c
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <div className="flex gap-1.5 ml-auto">
                    {["all", "published", "hidden"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterPublished(s)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition-all ${
                                filterPublished === s
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Reviews list */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="card p-5 animate-pulse space-y-3">
                            <div className="h-3 bg-slate-100 rounded w-1/4" />
                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                            <div className="h-3 bg-slate-100 rounded w-full" />
                        </div>
                    ))}
                </div>
            ) : reviews.length === 0 ? (
                <div className="card py-20 text-center">
                    <FiStar className="mx-auto text-slate-200 mb-3" size={40} />
                    <p className="text-sm text-slate-500 font-medium">No reviews found</p>
                    <p className="text-xs text-slate-400 mt-1">Students haven&apos;t submitted any reviews yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reviews.map((review) => (
                        <div
                            key={review._id}
                            className={`card p-5 transition-opacity ${!review.isPublished ? "opacity-60" : ""}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    {/* Header */}
                                    <div className="flex items-center gap-3 flex-wrap mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                <span className="text-indigo-600 text-xs font-bold">
                                                    {review.student?.fullName?.[0]?.toUpperCase() ?? "?"}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-700 leading-none">{review.student?.fullName || ""}</p>
                                                <p className="text-[11px] text-slate-400">{review.student?.email}</p>
                                            </div>
                                        </div>
                                        <StarRating rating={review.rating} />
                                        <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize font-medium">
                                            {review.category}
                                        </span>
                                        {!review.isPublished && (
                                            <span className="text-[11px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                                                Hidden
                                            </span>
                                        )}
                                        <span className="text-[11px] text-slate-400 ml-auto">
                                            {new Date(review.createdAt).toLocaleDateString("en-PK", {
                                                day: "numeric", month: "short", year: "numeric"
                                            })}
                                        </span>
                                    </div>

                                    {/* Title + Text */}
                                    {review.title && (
                                        <p className="text-sm font-semibold text-slate-800 mb-1">{review.title}</p>
                                    )}
                                    <p className="text-sm text-slate-600 leading-relaxed">{review.text}</p>

                                    {/* Admin Reply */}
                                    {review.adminReply && (
                                        <div className="mt-3 pl-4 border-l-2 border-indigo-200">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <FiCornerDownRight size={11} className="text-indigo-400" />
                                                <span className="text-[11px] text-indigo-600 font-semibold">Admin Reply</span>
                                                {review.repliedAt && (
                                                    <span className="text-[11px] text-slate-400">
                                                        · {new Date(review.repliedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-600">{review.adminReply}</p>
                                        </div>
                                    )}

                                    {/* Reply form */}
                                    {replyingId === review._id && (
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                type="text"
                                                className="field py-2 text-sm flex-1"
                                                placeholder="Write a reply…"
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleReply()}
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleReply}
                                                disabled={replyLoading || !replyText.trim()}
                                                className="btn-sm btn-primary"
                                            >
                                                {replyLoading ? "…" : "Send"}
                                            </button>
                                            <button
                                                onClick={() => { setReplyingId(null); setReplyText(""); }}
                                                className="btn-sm btn-ghost"
                                            >
                                                <FiX size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    <button
                                        onClick={() => {
                                            setReplyingId(replyingId === review._id ? null : review._id);
                                            setReplyText(review.adminReply || "");
                                        }}
                                        className="btn-sm btn-ghost flex items-center gap-1.5"
                                        title="Reply"
                                    >
                                        <FiMessageSquare size={12} />
                                        <span className="text-[11px]">Reply</span>
                                    </button>
                                    <button
                                        onClick={() => handleTogglePublish(review._id)}
                                        className="btn-sm btn-ghost flex items-center gap-1.5"
                                        title={review.isPublished ? "Hide" : "Publish"}
                                    >
                                        {review.isPublished ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                                        <span className="text-[11px]">{review.isPublished ? "Hide" : "Show"}</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(review._id)}
                                        className="btn-sm btn-ghost text-rose-500 hover:bg-rose-50 flex items-center gap-1.5"
                                        title="Delete"
                                    >
                                        <FiTrash2 size={12} />
                                        <span className="text-[11px]">Delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AdminLayout>
    );
}
