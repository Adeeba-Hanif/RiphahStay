import React, { useEffect, useState } from "react";
import axios from "axios";
import WardenLayout from "../../layout/WardenLayout.jsx";
import { useAuthContext } from "../../context";
import { FiRefreshCw, FiAlertCircle, FiLogIn, FiLogOut } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function AttendanceQR() {
    const { token } = useAuthContext();
    const [incomingQr, setIncomingQr] = useState("");
    const [outgoingQr, setOutgoingQr] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const fetchQrs = async () => {
        if (!token) return;
        setError("");
        try {
            const [incRes, outRes] = await Promise.all([
                axios.get(`${API_BASE}/attendance/qr?direction=incoming`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE}/attendance/qr?direction=outgoing`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setIncomingQr(incRes.data.qrToken || "");
            setOutgoingQr(outRes.data.qrToken || "");
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to load QR codes");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchQrs(); }, [token]); // eslint-disable-line

    const handleRefresh = () => {
        setRefreshing(true);
        fetchQrs();
    };

    const QrCard = ({ title, value, icon: Icon, color }) => {
        const qrSrc = value
            ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`
            : null;

        return (
            <div className="card p-6 flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                    <Icon size={18} className="text-white" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">{title}</h3>
                <p className="text-xs text-slate-400 mb-5">Students scan to record {title.toLowerCase()}</p>

                {loading ? (
                    <div className="w-44 h-44 bg-slate-100 rounded-2xl animate-pulse" />
                ) : qrSrc ? (
                    <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                        <img src={qrSrc} alt={`${title} QR`} className="w-40 h-40 object-contain rounded-lg" />
                    </div>
                ) : (
                    <div className="w-44 h-44 flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-xs text-slate-400">No QR available</p>
                    </div>
                )}

                {value && !loading && (
                    <p className="mt-3 text-[10px] text-slate-300 font-mono break-all max-w-48 leading-relaxed">
                        {value.slice(0, 24)}…
                    </p>
                )}
            </div>
        );
    };

    return (
        <WardenLayout active="attendance">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance QR Codes</h1>
                    <p className="page-subtitle">Display these codes for students to scan</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading || refreshing}
                    className="btn-md btn-outline gap-2 disabled:opacity-50"
                >
                    <FiRefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-5 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                    <FiAlertCircle className="text-rose-500 shrink-0" size={15} />
                    <p className="text-sm text-rose-700">{error}</p>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-5 max-w-2xl">
                <QrCard title="Check-In"  value={incomingQr} icon={FiLogIn}  color="bg-emerald-500" />
                <QrCard title="Check-Out" value={outgoingQr} icon={FiLogOut} color="bg-violet-500"  />
            </div>

            <p className="mt-5 text-xs text-slate-400">
                QR codes refresh automatically. Click Refresh to regenerate new tokens.
            </p>
        </WardenLayout>
    );
}
