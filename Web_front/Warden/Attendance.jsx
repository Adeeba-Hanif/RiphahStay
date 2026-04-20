import React from "react";
import WardenLayout from "../../layout/WardenLayout.jsx";
import { FiLogIn, FiArrowRight } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function Attendance() {
    return (
        <WardenLayout active="attendance">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance</h1>
                    <p className="page-subtitle">Student check-in / check-out tracking</p>
                </div>
            </div>

            <div className="card p-8 max-w-md text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
                    <FiLogIn size={24} className="text-violet-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-2">QR-Based Attendance</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                    Attendance is recorded when students scan the QR code on their mobile app.
                    Display the QR codes from the Attendance QR page.
                </p>
                <Link to="/warden/attendance-qr" className="btn-md btn-primary gap-2 inline-flex">
                    View QR Codes <FiArrowRight size={14} />
                </Link>
            </div>
        </WardenLayout>
    );
}
