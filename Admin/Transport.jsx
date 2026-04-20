import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import {
    FiTruck, FiMapPin, FiClock, FiUser, FiHash,
    FiPlus, FiEdit2, FiTrash2, FiX, FiUsers,
} from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

const EMPTY_FORM = {
    routeName: "", from: "", to: "",
    departureTime: "", returnTime: "",
    driverName: "", busNumber: "", availableSeats: 40,
};

export default function Transport() {
    const { token } = useAuthContext();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null); // null = create, object = edit
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [deletingId, setDeletingId] = useState(null);

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/transport`, authHeaders);
            setRoutes(res.data.routes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token]); // eslint-disable-line

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setShowModal(true);
    };

    const openEdit = (route) => {
        setEditing(route);
        setForm({
            routeName:     route.routeName,
            from:          route.from,
            to:            route.to,
            departureTime: route.departureTime,
            returnTime:    route.returnTime || "",
            driverName:    route.driverName || "",
            busNumber:     route.busNumber  || "",
            availableSeats: route.availableSeats ?? 40,
        });
        setFormError("");
        setShowModal(true);
    };

    const handleSave = async () => {
        const { routeName, from, to, departureTime } = form;
        if (!routeName.trim() || !from.trim() || !to.trim() || !departureTime.trim()) {
            setFormError("Route name, from, to, and departure time are required.");
            return;
        }
        setSaving(true);
        setFormError("");
        try {
            if (editing) {
                await axios.put(`${API_BASE}/transport/${editing._id}`, form, authHeaders);
            } else {
                await axios.post(`${API_BASE}/transport`, form, authHeaders);
            }
            setShowModal(false);
            fetchRoutes();
        } catch (err) {
            setFormError(err?.response?.data?.message || "Failed to save route.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            await axios.delete(`${API_BASE}/transport/${id}`, authHeaders);
            fetchRoutes();
        } catch (err) {
            alert(err?.response?.data?.message || "Failed to delete route.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <AdminLayout active="transport">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Transport</h1>
                    <p className="page-subtitle">Manage hostel bus routes, drivers, and schedules</p>
                </div>
                <button onClick={openCreate} className="btn-md btn-primary flex items-center gap-2">
                    <FiPlus size={14} /> Add Route
                </button>
            </div>

            {loading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="card p-5 animate-pulse space-y-3">
                            <div className="h-4 bg-slate-100 rounded w-3/4" />
                            <div className="h-3 bg-slate-100 rounded w-1/2" />
                            <div className="h-3 bg-slate-100 rounded w-2/3" />
                        </div>
                    ))}
                </div>
            ) : routes.length === 0 ? (
                <div className="card py-20 text-center">
                    <FiTruck className="mx-auto text-slate-200 mb-3" size={40} />
                    <p className="text-sm text-slate-500 font-medium">No transport routes yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Route" to create the first one</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {routes.map((r) => (
                        <div key={r._id} className="card p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group">
                            <div className="flex items-start justify-between gap-2 mb-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <FiTruck size={16} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm leading-tight">{r.routeName}</p>
                                        {r.busNumber && (
                                            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{r.busNumber}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                        onClick={() => openEdit(r)}
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 flex items-center justify-center transition-colors"
                                    >
                                        <FiEdit2 size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(r._id)}
                                        disabled={deletingId === r._id}
                                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors disabled:opacity-40"
                                    >
                                        <FiTrash2 size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <FiMapPin size={11} className="text-slate-400 shrink-0" />
                                    <span className="truncate">{r.from} → {r.to}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <FiClock size={11} className="text-slate-400 shrink-0" />
                                    <span>
                                        Dep: <span className="font-semibold text-slate-700">{r.departureTime}</span>
                                        {r.returnTime && <span className="text-slate-400"> · Ret: {r.returnTime}</span>}
                                    </span>
                                </div>
                                {r.driverName && (
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <FiUser size={11} className="text-slate-400 shrink-0" />
                                        <span>{r.driverName}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                    <FiUsers size={11} className="text-slate-400 shrink-0" />
                                    <span>{r.availableSeats} seats</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && (
                <Modal
                    title={editing ? "Edit Route" : "Add Transport Route"}
                    onClose={() => setShowModal(false)}
                >
                    {formError && (
                        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mb-4">
                            {formError}
                        </p>
                    )}
                    <div className="space-y-3">
                        <Field label="Route Name *" icon={<FiTruck size={12} />}>
                            <input
                                className="field"
                                placeholder="e.g. Route A  Islamabad"
                                value={form.routeName}
                                onChange={(e) => setForm({ ...form, routeName: e.target.value })}
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="From *" icon={<FiMapPin size={12} />}>
                                <input
                                    className="field"
                                    placeholder="e.g. Riphah Hostel"
                                    value={form.from}
                                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                                />
                            </Field>
                            <Field label="To *" icon={<FiMapPin size={12} />}>
                                <input
                                    className="field"
                                    placeholder="e.g. Islamabad City"
                                    value={form.to}
                                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                                />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Departure Time *" icon={<FiClock size={12} />}>
                                <input
                                    className="field"
                                    placeholder="e.g. 8:00 AM"
                                    value={form.departureTime}
                                    onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                                />
                            </Field>
                            <Field label="Return Time" icon={<FiClock size={12} />}>
                                <input
                                    className="field"
                                    placeholder="e.g. 6:00 PM"
                                    value={form.returnTime}
                                    onChange={(e) => setForm({ ...form, returnTime: e.target.value })}
                                />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Driver Name" icon={<FiUser size={12} />}>
                                <input
                                    className="field"
                                    placeholder="e.g. Khalid Mehmood"
                                    value={form.driverName}
                                    onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                                />
                            </Field>
                            <Field label="Bus Number" icon={<FiHash size={12} />}>
                                <input
                                    className="field"
                                    placeholder="e.g. RHY-1234"
                                    value={form.busNumber}
                                    onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
                                />
                            </Field>
                        </div>
                        <Field label="Available Seats" icon={<FiUsers size={12} />}>
                            <input
                                type="number"
                                className="field"
                                min={1}
                                max={100}
                                value={form.availableSeats}
                                onChange={(e) => setForm({ ...form, availableSeats: Number(e.target.value) })}
                            />
                        </Field>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-lg btn-primary w-full mt-5"
                    >
                        {saving ? "Saving…" : editing ? "Update Route" : "Create Route"}
                    </button>
                </Modal>
            )}
        </AdminLayout>
    );
}

function Field({ label, icon, children }) {
    return (
        <div>
            <label className="field-label flex items-center gap-1.5">
                <span className="text-slate-400">{icon}</span>
                {label}
            </label>
            {children}
        </div>
    );
}

function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <h2 className="font-bold text-slate-800 text-sm">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                    >
                        <FiX size={16} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}
