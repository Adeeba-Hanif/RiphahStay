import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { FiHome, FiUsers } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

const STATUS_CONFIG = {
    available:   { label: "Available",   badge: "badge-green", bar: "bg-emerald-500" },
    booked:      { label: "Occupied",    badge: "badge-blue",  bar: "bg-indigo-500"  },
    maintenance: { label: "Maintenance", badge: "badge-amber", bar: "bg-amber-500"   },
};

const FILTERS = [
    { value: "all",         label: "All Rooms"   },
    { value: "available",   label: "Available"   },
    { value: "booked",      label: "Occupied"    },
    { value: "maintenance", label: "Maintenance" },
];

export default function Hostel() {
    const { token } = useAuthContext();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        if (!token) return;
        axios.get(`${API_BASE}/room/`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setRooms(Array.isArray(res.data) ? res.data : res.data.rooms ?? []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    const count = (s) => rooms.filter((r) => r.status === s).length;
    const filtered = filter === "all" ? rooms : rooms.filter((r) => r.status === filter);

    return (
        <AdminLayout active="rooms">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Rooms</h1>
                    <p className="page-subtitle">{loading ? "Loading…" : `${rooms.length} rooms total`}</p>
                </div>
            </div>

            {/* Summary stats */}
            {!loading && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: "Total",       value: rooms.length,        color: "text-slate-700", bg: "bg-slate-50",   border: "border-slate-200" },
                        { label: "Available",   value: count("available"),   color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
                        { label: "Occupied",    value: count("booked"),      color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-100"  },
                        { label: "Maintenance", value: count("maintenance"), color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-100"   },
                    ].map((s) => (
                        <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl px-4 py-3.5`}>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
                            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter pills */}
            <div className="flex gap-2 mb-5 flex-wrap">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                            filter === f.value
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        {f.label}
                        {!loading && (
                            <span className={`ml-1.5 ${filter === f.value ? "text-slate-300" : "text-slate-400"}`}>
                                ({f.value === "all" ? rooms.length : count(f.value)})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="card p-5 animate-pulse space-y-3">
                            <div className="h-4 bg-slate-100 rounded w-1/2" />
                            <div className="h-3 bg-slate-100 rounded w-1/3" />
                            <div className="h-2 bg-slate-100 rounded-full w-full mt-4" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card py-20 text-center">
                    <FiHome className="mx-auto text-slate-200 mb-3" size={36} />
                    <p className="text-sm text-slate-500">No rooms found</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((room) => {
                        const occupancy = room.occupants?.length ?? 0;
                        const capacity = room.capacity ?? 2;
                        const pct = capacity > 0 ? Math.round((occupancy / capacity) * 100) : 0;
                        const cfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.available;

                        return (
                            <div key={room._id} className="card p-5 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                                <FiHome size={13} className="text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm leading-tight">
                                                    {room.level} / {room.roomNumber}
                                                </p>
                                                <p className="text-[11px] text-slate-400">Floor {room.level}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`badge ${cfg.badge} shrink-0`}>{cfg.label}</span>
                                </div>

                                <div className="flex items-center justify-between mb-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <FiUsers size={11} /> {occupancy} / {capacity} occupants
                                    </span>
                                    <span className="font-semibold text-slate-700">
                                        Rs {room.rent?.toLocaleString() ?? ""}<span className="font-normal text-slate-400">/mo</span>
                                    </span>
                                </div>

                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-1.5 rounded-full transition-all duration-500 ${cfg.bar}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 text-right">{pct}% occupied</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </AdminLayout>
    );
}
