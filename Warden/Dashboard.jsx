import React, { useEffect, useState } from "react";
import axios from "axios";
import WardenLayout from "../../layout/WardenLayout.jsx";
import { StatCard } from "../../components/Card.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { FiUsers, FiCheckCircle, FiHome, FiBell, FiArrowRight, FiMaximize, FiCheckSquare, FiSend, FiUser } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE;

const QUICK_ACTIONS = [
    { label: "Scan QR",        desc: "Mark attendance",     to: "/warden/attendanceqr",         icon: FiMaximize,    bg: "bg-amber-50",   iconColor: "text-amber-600",   border: "border-amber-100"  },
    { label: "Room Requests",  desc: "Approve / reject",    to: "/warden/rooms",                icon: FiHome,        bg: "bg-indigo-50",  iconColor: "text-indigo-600",  border: "border-indigo-100" },
    { label: "Attendance",     desc: "View records",        to: "/warden/attendance",           icon: FiCheckSquare, bg: "bg-emerald-50", iconColor: "text-emerald-600", border: "border-emerald-100"},
    { label: "Send Notice",    desc: "Broadcast message",   to: "/warden/notifications-alerts", icon: FiSend,        bg: "bg-violet-50",  iconColor: "text-violet-600",  border: "border-violet-100" },
    { label: "Students",       desc: "Manage students",     to: "/warden/students",             icon: FiUsers,       bg: "bg-sky-50",     iconColor: "text-sky-600",     border: "border-sky-100"    },
    { label: "My Profile",     desc: "Edit name & password",to: "/warden/profile",              icon: FiUser,        bg: "bg-slate-50",   iconColor: "text-slate-600",   border: "border-slate-100"  },
];

export default function WardenDashboard() {
    const { token } = useAuthContext();
    const navigate = useNavigate();
    const [data, setData] = useState({ students: [], rooms: [], notifications: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        const h = { Authorization: `Bearer ${token}` };
        Promise.allSettled([
            axios.get(`${API_BASE}/user/students`, { headers: h }),
            axios.get(`${API_BASE}/room/`, { headers: h }),
            axios.get(`${API_BASE}/notifications/`, { headers: h }),
        ]).then(([studRes, roomRes, notifRes]) => {
            setData({
                students: studRes.status === "fulfilled" ? studRes.value.data.students || [] : [],
                rooms:    roomRes.status  === "fulfilled" ? (Array.isArray(roomRes.value.data) ? roomRes.value.data : roomRes.value.data.rooms ?? []) : [],
                notifications: notifRes.status === "fulfilled" ? notifRes.value.data.notifications || [] : [],
            });
        }).finally(() => setLoading(false));
    }, [token]);

    const { students, rooms, notifications } = data;
    const occupied  = rooms.filter((r) => r.status === "booked").length;
    const available = rooms.filter((r) => r.status === "available").length;
    const pct = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0;

    return (
        <WardenLayout active="dashboard">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Today's hostel overview</p>
                </div>
                <span className="hidden sm:inline text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                    {new Date().toLocaleDateString("en-PK", { weekday: "long", month: "long", day: "numeric" })}
                </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <StatCard label="Total Students" value={students.length} loading={loading} icon={<FiUsers />}       color="violet" />
                <StatCard label="Rooms Occupied" value={occupied}        loading={loading} icon={<FiHome />}        color="indigo" sub={loading ? undefined : `${available} available`} />
                <StatCard label="Available Rooms" value={available}      loading={loading} icon={<FiCheckCircle />} color="emerald" />
                <StatCard label="Notifications"  value={notifications.length} loading={loading} icon={<FiBell />}  color="amber" />
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                    {QUICK_ACTIONS.map(({ label, desc, to, icon: Icon, bg, iconColor, border }) => (
                        <button
                            key={to}
                            onClick={() => navigate(to)}
                            className={`flex flex-col items-start gap-3 p-4 rounded-2xl border ${bg} ${border} hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 text-left`}
                        >
                            <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                                <Icon size={16} className={iconColor} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800 leading-tight">{label}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Occupancy card */}
                <div className="lg:col-span-2 card p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-700">Room Occupancy</h3>
                        <Link to="/warden/rooms" className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 font-medium">
                            Manage <FiArrowRight size={11} />
                        </Link>
                    </div>

                    {/* Donut-style progress */}
                    <div className="flex items-center gap-5">
                        <div className="relative w-20 h-20 shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                                <circle
                                    cx="18" cy="18" r="15.9" fill="none"
                                    stroke="#7C3AED" strokeWidth="3"
                                    strokeDasharray={`${pct} ${100 - pct}`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-sm font-bold text-slate-800">{loading ? "" : `${pct}%`}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div>
                                <p className="text-xs text-slate-400">Occupied</p>
                                <p className="font-bold text-slate-800">{loading ? "" : occupied} rooms</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">Available</p>
                                <p className="font-bold text-emerald-600">{loading ? "" : available} rooms</p>
                            </div>
                        </div>
                    </div>

                    {/* Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>

                {/* Notifications */}
                <div className="lg:col-span-3 card">
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-50">
                        <div className="flex items-center gap-2">
                            <FiBell size={14} className="text-slate-400" />
                            <h3 className="text-sm font-semibold text-slate-700">Recent Alerts</h3>
                        </div>
                        <Link to="/warden/notifications-alerts" className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 font-medium">
                            View all <FiArrowRight size={11} />
                        </Link>
                    </div>
                    <div className="px-5 py-3 divide-y divide-slate-50">
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
                                <FiBell className="mx-auto text-slate-200 mb-2" size={28} />
                                <p className="text-sm text-slate-400">No alerts</p>
                            </div>
                        ) : (
                            notifications.slice(0, 6).map((n) => (
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
