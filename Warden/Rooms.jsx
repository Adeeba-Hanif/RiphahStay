import React, { useEffect, useState } from "react";
import axios from "axios";
import WardenLayout from "../../layout/WardenLayout.jsx";
import { useAuthContext } from "../../context";
import { StatCard } from "../../components/Card.jsx";
import { FiHome, FiUsers, FiCheckCircle, FiClock, FiDownload, FiArrowRight, FiX } from "react-icons/fi";
import { downloadChallanPdf } from "../../utils/challanPdfDownload.js";

const API_BASE = import.meta.env.VITE_API_BASE;

const TABS = [
    { key: "pending",  label: "Pending",  icon: FiClock },
    { key: "approved", label: "Approved", icon: FiCheckCircle },
    { key: "rejected", label: "Rejected", icon: FiX },
];

export default function Rooms() {
    const { token } = useAuthContext();
    const [rooms, setRooms] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingReqs, setLoadingReqs] = useState(true);
    const [errorReqs, setErrorReqs] = useState("");
    const [activeTab, setActiveTab] = useState("pending");
    const [actionLoading, setActionLoading] = useState({});
    const [approvedChallans, setApprovedChallans] = useState({});

    useEffect(() => {
        if (!token) return;
        axios.get(`${API_BASE}/room`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setRooms(Array.isArray(res.data) ? res.data : res.data.rooms ?? []))
            .catch(console.error)
            .finally(() => setLoadingRooms(false));
    }, [token]);

    useEffect(() => {
        if (!token) return;
        axios.get(`${API_BASE}/room/requests/all`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setRequests(res.data || []))
            .catch((err) => setErrorReqs(err.response?.data?.message || "Failed to load room requests"))
            .finally(() => setLoadingReqs(false));
    }, [token]);

    const totalRooms     = rooms.length;
    const occupiedRooms  = rooms.filter((r) => r.status === "booked").length;
    const availableRooms = rooms.filter((r) => r.status === "available").length;

    const grouped = {
        pending:  requests.filter((r) => r.status === "pending"),
        approved: requests.filter((r) => r.status === "approved"),
        rejected: requests.filter((r) => r.status === "rejected"),
    };

    const decideRequest = async (reqId, action) => {
        setActionLoading((p) => ({ ...p, [reqId]: true }));
        try {
            const res = await axios.patch(
                `${API_BASE}/room/requests/${reqId}/decide`,
                { action },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (action === "approve" && res.data?.challan) {
                setApprovedChallans((p) => ({ ...p, [reqId]: res.data.challan }));
            }
            setRequests((prev) =>
                prev.map((r) =>
                    r._id === reqId
                        ? { ...r, status: action === "approve" ? "approved" : "rejected" }
                        : r
                )
            );
        } catch (err) {
            alert(err.response?.data?.message || "Failed to process room request");
        } finally {
            setActionLoading((p) => ({ ...p, [reqId]: false }));
        }
    };

    const downloadChallanPdfForRoom = async (challanId, challanIdStr) => {
        try {
            await downloadChallanPdf({
                apiBase: API_BASE,
                challanId,
                filename: `challan-${challanIdStr}.pdf`,
                axiosConfig: { headers: { Authorization: `Bearer ${token}` } },
            });
        } catch (err) {
            alert(err?.message || "Could not download challan PDF");
        }
    };

    const currentList = grouped[activeTab] || [];

    return (
        <WardenLayout active="rooms">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Room Allocation</h1>
                    <p className="page-subtitle">Manage room change requests</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard label="Total Rooms"     value={totalRooms}     loading={loadingRooms} icon={<FiHome />}        color="indigo" />
                <StatCard label="Occupied"        value={occupiedRooms}  loading={loadingRooms} icon={<FiUsers />}       color="violet" />
                <StatCard label="Available"       value={availableRooms} loading={loadingRooms} icon={<FiCheckCircle />} color="emerald" />
            </div>

            {/* Requests */}
            <div className="card">
                <div className="px-5 pt-5 pb-3 border-b border-slate-50">
                    <h3 className="text-sm font-semibold text-slate-700">Room Change Requests</h3>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 px-5 pt-4 pb-1">
                    {TABS.map(({ key, label, icon: Icon }) => {
                        const count = grouped[key]?.length ?? 0;
                        const isActive = activeTab === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                <Icon size={13} />
                                {label}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-5">
                    {loadingReqs ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-20 bg-slate-50 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : errorReqs ? (
                        <div className="py-6 text-center text-sm text-rose-500">{errorReqs}</div>
                    ) : currentList.length === 0 ? (
                        <div className="py-14 text-center">
                            <FiHome className="mx-auto text-slate-200 mb-2" size={28} />
                            <p className="text-sm text-slate-400">No {activeTab} requests</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {currentList.map((req) => {
                                const isLoading = actionLoading[req._id];
                                const challan   = approvedChallans[req._id];
                                return (
                                    <div key={req._id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                                                    <span className="text-violet-600 text-xs font-bold">
                                                        {req.student?.fullName?.[0]?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">{req.student?.fullName || "Student"}</p>
                                                    <p className="text-[11px] text-slate-400">
                                                        {new Date(req.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`badge shrink-0 ${
                                                req.status === "approved" ? "badge-green" :
                                                req.status === "rejected" ? "badge-red" : "badge-amber"
                                            }`}>
                                                {req.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 bg-slate-50 rounded-lg px-3 py-2">
                                            <span className="font-medium text-slate-700">
                                                {req.fromRoom ? `${req.fromRoom.level}/${req.fromRoom.roomNumber}` : "No room"}
                                            </span>
                                            <FiArrowRight size={12} className="text-slate-400" />
                                            <span className="font-medium text-slate-700">
                                                {req.toRoom ? `${req.toRoom.level}/${req.toRoom.roomNumber}` : ""}
                                            </span>
                                        </div>

                                        {req.status === "pending" && (
                                            <div className="flex gap-2">
                                                <button
                                                    disabled={isLoading}
                                                    onClick={() => decideRequest(req._id, "approve")}
                                                    className="btn-sm btn-success flex-1 disabled:opacity-50"
                                                >
                                                    {isLoading ? "…" : "Approve"}
                                                </button>
                                                <button
                                                    disabled={isLoading}
                                                    onClick={() => decideRequest(req._id, "reject")}
                                                    className="btn-sm btn-danger flex-1 disabled:opacity-50"
                                                >
                                                    {isLoading ? "…" : "Reject"}
                                                </button>
                                            </div>
                                        )}

                                        {challan && (
                                            <div className="mt-3 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                                                <div>
                                                    <p className="text-[11px] font-semibold text-emerald-700">Booking Challan Generated</p>
                                                    <p className="text-[11px] text-emerald-600">
                                                        {challan.challanId} · Rs {challan.totalAmount?.toLocaleString()}
                                                    </p>
                                                    <p className="text-[10px] text-emerald-500">
                                                        Due: {new Date(challan.dueDate).toLocaleDateString("en-PK")}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => downloadChallanPdfForRoom(challan._id, challan.challanId)}
                                                    className="btn-sm btn-ghost gap-1.5 text-emerald-700"
                                                >
                                                    <FiDownload size={11} /> PDF
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </WardenLayout>
    );
}
