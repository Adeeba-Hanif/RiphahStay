import React from "react";
import AdminLayout from "../../layout/AdminLayout.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { FiInfo } from "react-icons/fi";

export default function Settings() {
    const { user } = useAuthContext();

    return (
        <AdminLayout active="settings">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">System configuration</p>
                </div>
            </div>

            <div className="max-w-lg">
                <div className="card p-5">
                    <div className="flex items-start gap-3 text-sm text-slate-600">
                        <FiInfo size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold text-slate-700 mb-1">RiphahStay v1.0</p>
                            <p className="text-slate-500 text-xs leading-relaxed">
                                Hostel management system for Riphah International University.
                                Manage students, wardens, room allocation, finance, and more
                                from this dashboard.
                            </p>
                            <div className="mt-3 space-y-1 text-xs text-slate-400">
                                <p>Logged in as: <span className="text-slate-600 font-medium">{user?.email}</span></p>
                                <p>Role: <span className="text-slate-600 font-medium capitalize">{user?.role}</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
