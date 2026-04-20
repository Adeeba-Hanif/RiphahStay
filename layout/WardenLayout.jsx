import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
    FiLogOut, FiGrid, FiUsers, FiCheckSquare,
    FiHome, FiBell, FiUser, FiMaximize, FiMenu,
} from "react-icons/fi";
import { useAuthContext } from "../context/AuthContext.jsx";

const NAV = [
    { to: "/warden",                      label: "Dashboard",   key: "dashboard",    Icon: FiGrid,        color: "violet" },
    { to: "/warden/students",             label: "Students",    key: "students",     Icon: FiUsers,       color: "sky"    },
    { to: "/warden/attendance",           label: "Attendance",  key: "attendance",   Icon: FiCheckSquare, color: "emerald"},
    { to: "/warden/attendanceqr",         label: "QR Scanner",  key: "attendanceqr", Icon: FiMaximize,    color: "amber"  },
    { to: "/warden/rooms",                label: "Rooms",       key: "rooms",        Icon: FiHome,        color: "indigo" },
    { to: "/warden/notifications-alerts", label: "Alerts",      key: "notifications",Icon: FiBell,        color: "rose"   },
    { to: "/warden/profile",              label: "Profile",     key: "profile",      Icon: FiUser,        color: "slate"  },
];

const ACCENT = {
    violet: "text-violet-400", sky: "text-sky-400", emerald: "text-emerald-400",
    amber: "text-amber-400",   indigo: "text-indigo-400", rose: "text-rose-400",
    slate: "text-slate-400",
};

export default function WardenLayout({ children, active }) {
    const { user, logout } = useAuthContext();
    const [mobileOpen, setMobileOpen] = useState(false);
    const pageLabel = NAV.find((n) => n.key === active)?.label ?? "Warden Panel";

    const Sidebar = () => (
        <aside className="w-60 bg-[#0F172A] flex flex-col h-full">
            <div className="px-5 py-6 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center shrink-0">
                        <FiCheckSquare className="text-white" size={14} />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm tracking-tight leading-none">RiphahStay</p>
                        <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest">Warden Portal</p>
                    </div>
                </div>
            </div>

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
                            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-white/5 p-3">
                {user && (
                    <div className="flex items-center gap-3 px-2 py-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                            <span className="text-violet-300 text-xs font-bold">
                                {user.fullName?.[0]?.toUpperCase() ?? "W"}
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
            <div className="hidden lg:flex sticky top-0 h-screen">
                <Sidebar />
            </div>

            {mobileOpen && (
                <div className="fixed inset-0 z-50 flex lg:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="relative z-10 h-full"><Sidebar /></div>
                </div>
            )}

            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm shadow-slate-100">
                    <div className="flex items-center gap-3">
                        <button className="lg:hidden text-slate-500 hover:text-slate-700" onClick={() => setMobileOpen(true)}>
                            <FiMenu size={20} />
                        </button>
                        <div>
                            <h1 className="text-sm font-bold text-slate-800">{pageLabel}</h1>
                            <p className="text-[11px] text-slate-400 hidden sm:block">Riphah International University  Warden Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline text-[11px] font-semibold bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1 rounded-full uppercase tracking-wide">
                            Warden
                        </span>
                        {user && (
                            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold">
                                {user.fullName?.[0]?.toUpperCase() ?? "W"}
                            </div>
                        )}
                    </div>
                </header>
                <div className="p-6 flex-1 overflow-y-auto">{children}</div>
            </main>
        </div>
    );
}
