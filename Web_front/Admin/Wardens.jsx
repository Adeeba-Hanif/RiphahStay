import React, { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { FiUsers, FiPlus, FiAlertCircle, FiCheckCircle, FiToggleLeft, FiToggleRight, FiPhone, FiMail, FiX } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function AdminWardens() {
    const { token } = useAuthContext();
    const [wardens, setWardens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [success, setSuccess] = useState("");

    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    const fetchWardens = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_BASE}/staffprofile/wardens?status=all`, authHeaders);
            setWardens(res.data.wardens || []);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load wardens");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (token) fetchWardens(); }, [token]); // eslint-disable-line

    const handleCreate = async (e) => {
        e.preventDefault();
        setFormError("");
        setSuccess("");
        if (!fullName || !email || !password) {
            setFormError("Full name, email, and password are required.");
            return;
        }
        setFormLoading(true);
        try {
            await axios.post(`${API_BASE}/staffprofile/wardens`, { fullName, email, password, phone }, authHeaders);
            setSuccess("Warden created successfully.");
            setFullName(""); setEmail(""); setPassword(""); setPhone("");
            fetchWardens();
            setTimeout(() => { setSuccess(""); setShowForm(false); }, 2000);
        } catch (err) {
            setFormError(err.response?.data?.message || "Failed to create warden");
        } finally {
            setFormLoading(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await axios.patch(`${API_BASE}/staffprofile/wardens/${id}/status`, { isActive: !currentStatus }, authHeaders);
            setWardens((prev) => prev.map((w) => w._id === id ? { ...w, isActive: !currentStatus } : w));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to update status");
        }
    };

    const active   = wardens.filter((w) => w.isActive);
    const inactive = wardens.filter((w) => !w.isActive);

    return (
        <AdminLayout active="wardens">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Wardens</h1>
                    <p className="page-subtitle">
                        {loading ? "Loading…" : `${active.length} active · ${inactive.length} inactive`}
                    </p>
                </div>
                <button onClick={() => { setShowForm(true); setFormError(""); setSuccess(""); }} className="btn-md btn-primary gap-2">
                    <FiPlus size={14} /> Add Warden
                </button>
            </div>

            {error && (
                <div className="mb-5 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <FiAlertCircle className="text-rose-500 shrink-0" size={15} />
                    <p className="text-sm text-rose-700">{error}</p>
                </div>
            )}

            {/* Warden cards */}
            {loading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="card p-5 animate-pulse space-y-3">
                            <div className="flex gap-3 items-center">
                                <div className="w-10 h-10 rounded-full bg-slate-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : wardens.length === 0 ? (
                <div className="card py-20 text-center">
                    <FiUsers className="mx-auto text-slate-200 mb-3" size={36} />
                    <p className="text-sm text-slate-500">No wardens yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Warden" to create one</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {wardens.map((w) => (
                        <div key={w._id} className="card p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                                        w.isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                                    }`}>
                                        {w.fullName?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">{w.fullName}</p>
                                        <span className={`badge ${w.isActive ? "badge-green" : "badge-gray"}`}>
                                            {w.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5 mb-4">
                                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <FiMail size={11} className="text-slate-400" /> {w.email}
                                </p>
                                {w.phone && (
                                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <FiPhone size={11} className="text-slate-400" /> {w.phone}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => handleToggleStatus(w._id, w.isActive)}
                                className={`btn-sm w-full gap-2 ${w.isActive ? "btn-danger" : "btn-success"}`}
                            >
                                {w.isActive ? <FiToggleRight size={13} /> : <FiToggleLeft size={13} />}
                                {w.isActive ? "Deactivate" : "Activate"}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Warden Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="font-bold text-slate-800 text-sm">Add New Warden</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                                <FiX size={16} />
                            </button>
                        </div>
                        <form className="p-6 space-y-4" onSubmit={handleCreate}>
                            {formError && (
                                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                                    <FiAlertCircle size={13} className="text-rose-500 shrink-0" />
                                    <p className="text-xs text-rose-700">{formError}</p>
                                </div>
                            )}
                            {success && (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                                    <FiCheckCircle size={13} className="text-emerald-600 shrink-0" />
                                    <p className="text-xs text-emerald-700">{success}</p>
                                </div>
                            )}
                            <div>
                                <label className="field-label">Full Name *</label>
                                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="field" placeholder="Warden full name" />
                            </div>
                            <div>
                                <label className="field-label">Email *</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="warden@riphah.edu.pk" />
                            </div>
                            <div>
                                <label className="field-label">Password *</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" placeholder="Set a password" />
                            </div>
                            <div>
                                <label className="field-label">Phone (optional)</label>
                                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder="+92 3xx xxxxxxx" />
                            </div>
                            <button type="submit" disabled={formLoading} className="btn-lg btn-primary w-full disabled:opacity-50">
                                {formLoading ? "Creating…" : "Create Warden"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
