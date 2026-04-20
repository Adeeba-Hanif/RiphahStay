import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { FiUsers, FiSearch, FiPhone, FiMail } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Students() {
    const { token } = useAuthContext();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState("");
    const [includeInactive, setIncludeInactive] = useState(false);
    const [search, setSearch] = useState("");

    const loadStudents = () => {
        if (!token) return;
        setLoading(true);
        setFetchError("");
        const params = {};
        if (includeInactive) params.includeInactive = "true";
        axios
            .get(`${API_BASE}/user/students`, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            })
            .then((res) => setStudents(res.data.students || []))
            .catch((err) => {
                console.error(err);
                setFetchError(err.response?.data?.message || err.message || "Could not load students");
                setStudents([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadStudents();
    }, [token, includeInactive]); // eslint-disable-line react-hooks/exhaustive-deps

    const filtered = students.filter((s) => {
        const q = search.toLowerCase();
        return (
            s.fullName?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.room?.roomNumber?.toLowerCase().includes(q)
        );
    });

    return (
        <AdminLayout active="students">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Students</h1>
                    <p className="page-subtitle">
                        {loading ? "Loading…" : `${students.length} registered students`}
                    </p>
                </div>
            </div>

            {fetchError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex flex-wrap items-center justify-between gap-3">
                    <span>{fetchError}</span>
                    <button type="button" onClick={loadStudents} className="btn-sm btn-ghost text-rose-700">
                        Retry
                    </button>
                </div>
            )}

            <div className="card">
                {/* Toolbar */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-52 max-w-80">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search by name, email or room…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="field pl-9 py-2 text-sm"
                        />
                    </div>
                    {search && (
                        <span className="text-xs text-slate-500">
                            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                        </span>
                    )}
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none ml-auto">
                        <input
                            type="checkbox"
                            checked={includeInactive}
                            onChange={(e) => setIncludeInactive(e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        Show inactive
                    </label>
                </div>

                {/* Table */}
                <div className="px-5 pb-5 overflow-x-auto">
                    {loading ? (
                        <div className="py-12 text-center space-y-2 animate-pulse">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-10 bg-slate-50 rounded-lg" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-16 text-center">
                            <FiUsers className="mx-auto text-slate-200 mb-3" size={36} />
                            <p className="text-sm font-medium text-slate-500">No students found</p>
                            {search && <p className="text-xs text-slate-400 mt-1">Try a different search term</p>}
                        </div>
                    ) : (
                        <table className="data-table mt-1">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Student</th>
                                    <th>Contact</th>
                                    <th>Room</th>
                                    <th>Joined</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s, idx) => (
                                    <tr key={s._id}>
                                        <td className="text-slate-400 text-xs">{idx + 1}</td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                    <span className="text-indigo-600 text-xs font-bold">
                                                        {s.fullName?.[0]?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{s.fullName}</p>
                                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                                        <FiMail size={10} /> {s.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {s.phone ? (
                                                <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                                                    <FiPhone size={10} /> {s.phone}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs"></span>
                                            )}
                                        </td>
                                        <td>
                                            {s.room ? (
                                                <span className="badge badge-blue">
                                                    {s.room.level}/{s.room.roomNumber}
                                                </span>
                                            ) : (
                                                <span className="badge badge-gray">Unassigned</span>
                                            )}
                                        </td>
                                        <td className="text-xs text-slate-400">
                                            {new Date(s.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                                        </td>
                                        <td>
                                            <span className={`badge ${s.isActive ? "badge-green" : "badge-gray"}`}>
                                                {s.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
