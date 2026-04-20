import React, { useState } from "react";
import axios from "axios";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { FiUser, FiMail, FiPhone, FiLogOut, FiShield, FiEdit2, FiLock, FiCheck, FiX } from "react-icons/fi";

const API = import.meta.env.VITE_API_BASE;

export default function AdminProfile() {
    const { user, setUser, token, logout } = useAuthContext();

    const initials = user?.fullName
        ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
        : "A";

    // ── Profile edit state ──
    const [editingProfile, setEditingProfile] = useState(false);
    const [fullName, setFullName]             = useState(user?.fullName || "");
    const [phone, setPhone]                   = useState(user?.phone || "");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMsg, setProfileMsg]         = useState(null); // { type: "success"|"error", text }

    // ── Password change state ──
    const [oldPassword, setOldPassword]       = useState("");
    const [newPassword, setNewPassword]       = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwLoading, setPwLoading]           = useState(false);
    const [pwMsg, setPwMsg]                   = useState(null);

    const handleEditToggle = () => {
        setEditingProfile((v) => !v);
        setFullName(user?.fullName || "");
        setPhone(user?.phone || "");
        setProfileMsg(null);
    };

    const handleSaveProfile = async () => {
        if (!fullName.trim() || fullName.trim().length < 3) {
            setProfileMsg({ type: "error", text: "Full name must be at least 3 characters." });
            return;
        }
        setProfileLoading(true);
        setProfileMsg(null);
        try {
            const res = await axios.patch(
                `${API}/staffprofile/update-profile`,
                { fullName: fullName.trim(), phone: phone.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUser((prev) => ({ ...prev, fullName: res.data.user.fullName, phone: res.data.user.phone }));
            setProfileMsg({ type: "success", text: "Profile updated successfully." });
            setEditingProfile(false);
        } catch (err) {
            setProfileMsg({ type: "error", text: err?.response?.data?.message || "Failed to update profile." });
        } finally {
            setProfileLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwMsg(null);
        if (!oldPassword || !newPassword || !confirmPassword) {
            setPwMsg({ type: "error", text: "All password fields are required." });
            return;
        }
        if (newPassword.length < 8) {
            setPwMsg({ type: "error", text: "New password must be at least 8 characters." });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwMsg({ type: "error", text: "New passwords do not match." });
            return;
        }
        setPwLoading(true);
        try {
            await axios.post(
                `${API}/staffprofile/change-password`,
                { oldPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPwMsg({ type: "success", text: "Password changed successfully." });
            setOldPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch (err) {
            setPwMsg({ type: "error", text: err?.response?.data?.message || "Failed to change password." });
        } finally {
            setPwLoading(false);
        }
    };

    return (
        <AdminLayout active="profile">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Profile</h1>
                    <p className="page-subtitle">Manage your administrator account</p>
                </div>
            </div>

            <div className="max-w-lg space-y-5">

                {/* ── Avatar card ── */}
                <div className="card p-6 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-slate-800 truncate">{user?.fullName || "Admin"}</p>
                        <p className="text-sm text-slate-500 truncate">{user?.email || ""}</p>
                        <span className="mt-1 inline-flex items-center gap-1 badge badge-blue">
                            <FiShield size={9} /> Administrator
                        </span>
                    </div>
                </div>

                {/* ── Profile info & edit ── */}
                <div className="card p-5 space-y-4">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-slate-700">Account Information</p>
                        <button
                            onClick={handleEditToggle}
                            className={`btn-sm ${editingProfile ? "btn-ghost" : "btn-outline"} gap-1.5`}
                        >
                            {editingProfile ? <><FiX size={12} /> Cancel</> : <><FiEdit2 size={12} /> Edit</>}
                        </button>
                    </div>

                    {profileMsg && (
                        <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg ${
                            profileMsg.type === "success"
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                : "bg-rose-50 border border-rose-200 text-rose-700"
                        }`}>
                            {profileMsg.type === "success" ? <FiCheck size={13} /> : <FiX size={13} />}
                            {profileMsg.text}
                        </div>
                    )}

                    <div>
                        <label className="field-label flex items-center gap-1.5"><FiUser size={11} /> Full Name</label>
                        {editingProfile ? (
                            <input className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                        ) : (
                            <input className="field" style={{ backgroundColor: "#f8fafc", color: "#475569", cursor: "not-allowed" }} value={user?.fullName || ""} readOnly />
                        )}
                    </div>

                    <div>
                        <label className="field-label flex items-center gap-1.5"><FiMail size={11} /> Email Address</label>
                        <input className="field" style={{ backgroundColor: "#f8fafc", color: "#475569", cursor: "not-allowed" }} value={user?.email || ""} readOnly />
                        <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed.</p>
                    </div>

                    <div>
                        <label className="field-label flex items-center gap-1.5"><FiPhone size={11} /> Phone</label>
                        {editingProfile ? (
                            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
                        ) : (
                            <input className="field" style={{ backgroundColor: "#f8fafc", color: "#475569", cursor: "not-allowed" }} value={user?.phone || "—"} readOnly />
                        )}
                    </div>

                    {editingProfile && (
                        <button
                            onClick={handleSaveProfile}
                            disabled={profileLoading}
                            className="btn-md btn-primary w-full"
                        >
                            {profileLoading ? "Saving…" : <><FiCheck size={14} /> Save Changes</>}
                        </button>
                    )}
                </div>

                {/* ── Change password ── */}
                <div className="card p-5">
                    <p className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <FiLock size={14} className="text-slate-400" /> Change Password
                    </p>

                    {pwMsg && (
                        <div className={`flex items-center gap-2 text-xs px-3 py-2.5 rounded-lg mb-4 ${
                            pwMsg.type === "success"
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                : "bg-rose-50 border border-rose-200 text-rose-700"
                        }`}>
                            {pwMsg.type === "success" ? <FiCheck size={13} /> : <FiX size={13} />}
                            {pwMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="field-label">Current Password</label>
                            <input type="password" className="field" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Enter current password" />
                        </div>
                        <div>
                            <label className="field-label">New Password</label>
                            <input type="password" className="field" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
                        </div>
                        <div>
                            <label className="field-label">Confirm New Password</label>
                            <input type="password" className="field" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
                        </div>
                        <button type="submit" disabled={pwLoading} className="btn-md btn-primary w-full">
                            {pwLoading ? "Updating…" : <><FiLock size={13} /> Update Password</>}
                        </button>
                    </form>
                </div>

                {/* ── Sign out ── */}
                <button onClick={logout} className="btn-md btn-danger gap-2 w-full">
                    <FiLogOut size={14} /> Sign Out
                </button>

            </div>
        </AdminLayout>
    );
}
