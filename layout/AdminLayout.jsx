import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    FiLogOut, FiGrid, FiUsers, FiAlertCircle, FiHome,
    FiShield, FiDollarSign, FiTruck, FiBell, FiUser, FiMenu, FiX,
} from "react-icons/fi";
import { useAuthContext } from "../context/AuthContext.jsx";

const NAV = [
    { to: "/admin",                        label: "Dashboard",    key: "dashboard",    Icon: FiGrid,         color: "indigo" },
    { to: "/admin/students",               label: "Students",     key: "students",     Icon: FiUsers,        color: "sky"    },
    { to: "/admin/complaints",             label: "Complaints",   key: "complaints",   Icon: FiAlertCircle,  color: "rose"   },
    { to: "/admin/hostel",                 label: "Rooms",        key: "rooms",        Icon: FiHome,         color: "amber"  },
    { to: "/admin/wardens",                label: "Wardens",      key: "wardens",      Icon: FiShield,       color: "violet" },
    { to: "/admin/finance",                label: "Finance",      key: "finance",      Icon: FiDollarSign,   color: "emerald"},
    { to: "/admin/transport",              label: "Transport",    key: "transport",    Icon: FiTruck,        color: "cyan"   },
    { to: "/admin/notifications-alerts",   label: "Alerts",       key: "notifications",Icon: FiBell,         color: "violet" },
    { to: "/admin/profile",                label: "Profile",      key: "profile",      Icon: FiUser,         color: "slate"  },
];

const ACCENT = {
    indigo: "text-indigo-400",  sky:    "text-sky-400",
    rose:   "text-rose-400",    amber:  "text-amber-400",
    violet: "text-violet-400",  emerald:"text-emerald-400",
    cyan:   "text-cyan-400",    slate:  "text-slate-400",
};

export default function AdminLayout({ children, active }) {
    const { user, logout } = useAuthContext();
    const [mobileOpen, setMobileOpen] = useState(false);
    const pageLabel = NAV.find((n) => n.key === active)?.label ?? "Admin Panel";

    const Sidebar = () => (
        <aside className="w-60 bg-[#0F172A] flex flex-col shrink-0 h-full">
            {/* Brand */}
            <div className="px-5 py-6 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm tracking-tight leading-none">RiphahStay</p>
                        <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest">Admin Portal</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">Menu</p>
                {NAV.map(({ to, label, key, Icon, color }) => {
                    const isActive = active === key;
                    return (
                        <Link
                            key={key}
                            to={to}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                            }`}
                        >
                            <Icon
                                size={16}
                                className={isActive ? ACCENT[color] : "text-slate-600 group-hover:text-slate-400 transition-colors"}
                            />
                            <span>{label}</span>
                            {isActive && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User footer */}
            <div className="border-t border-white/5 p-3">
                {user && (
                    <div className="flex items-center gap-3 px-2 py-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                            <span className="text-indigo-300 text-xs font-bold">
                                {user.fullName?.[0]?.toUpperCase() ?? "A"}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-300 truncate">{user.fullName}</p>
                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                >
                    <FiLogOut size={13} />
                    Sign Out
                </button>
            </div>
        </aside>
    );

    return (
        <div className="flex min-h-screen bg-[#EEF2F8]">
            {/* Desktop sidebar */}
            <div className="hidden lg:flex sticky top-0 h-screen">
                <Sidebar />
            </div>

            {/* Mobile sidebar overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative z-10 h-full">
                        <Sidebar />
                    </div>
                </div>
            )}

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm shadow-slate-100">
                    <div className="flex items-center gap-3">
                        <button
                            className="lg:hidden text-slate-500 hover:text-slate-700"
                            onClick={() => setMobileOpen(true)}
                        >
                            <FiMenu size={20} />
                        </button>
                        <div>
                            <h1 className="text-sm font-bold text-slate-800">{pageLabel}</h1>
                            <p className="text-[11px] text-slate-400 hidden sm:block">
                                Riphah International University  Admin Portal
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline text-[11px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wide">
                            Admin
                        </span>
                        {user && (
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                {user.fullName?.[0]?.toUpperCase() ?? "A"}
                            </div>
                        )}
                    </div>
                </header>

                <div className="p-6 flex-1 overflow-y-auto">{children}</div>
            </main>
        </div>
    );
}
