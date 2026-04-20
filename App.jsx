import React, { useContext, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { AuthContext } from "./context/AuthContext.jsx";

// AUTH components
import Login from "./auth/Login.jsx";
import ResetPassword from "./auth/ResetPassword.jsx";

// ADMIN PAGES
import AdminDashboard from "./pages/Admin/Dashboard.jsx";
import AdminStudents from "./pages/Admin/Students.jsx";
import AdminComplaints from "./pages/Admin/Complaints.jsx";
import AdminHostel from "./pages/Admin/Hostel.jsx";
import AdminWardens from "./pages/Admin/Wardens.jsx";
import AdminFinance from "./pages/Admin/Finance.jsx";
import AdminTransport from "./pages/Admin/Transport.jsx";
import AdminNotificationsAndAlerts from "./pages/Admin/NotificationsAndAlerts.jsx";
import AdminProfile from "./pages/Admin/Profile.jsx";
import AdminSetting from "./pages/Admin/Setting.jsx";

// WARDEN PAGES
import WardenDashboard from "./pages/Warden/Dashboard.jsx";
import WardenStudents from "./pages/Warden/Students.jsx";
import WardenAttendance from "./pages/Warden/Attendance.jsx";
import WardenRooms from "./pages/Warden/Rooms.jsx";
import WardenNotificationsAndAlerts from "./pages/Warden/NotificationsAndAlerts.jsx";
import WardenProfile from "./pages/Warden/Profile.jsx";
import AttendanceQr from "./pages/Warden/AttendanceQR.jsx";

// Protected route wrapper
function ProtectedRoute({ children, allow }) {
  const { token, role, loading } = useContext(AuthContext);

  // Wait until rehydration completes
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-600 text-sm">
        Checking session...
      </div>
    );
  }

  // No token = not logged in
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Role not allowed
  if (allow && !allow.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function WebSplash({ onDone }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const hide = setTimeout(() => setFadeOut(true), 2000);
    const done = setTimeout(() => onDone(), 2400);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#ffffff",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      transition: "opacity 0.4s ease",
      opacity: fadeOut ? 0 : 1,
      pointerEvents: fadeOut ? "none" : "all",
    }}>
      <style>{`
        @keyframes splashLogoIn {
          0%   { opacity: 0; transform: scale(0.55); }
          65%  { opacity: 1; transform: scale(1.07); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashSlideUp {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .splash-logo { animation: splashLogoIn 0.7s cubic-bezier(.34,1.56,.64,1) both; }
        .splash-text { animation: splashSlideUp 0.45s ease both; animation-delay: 0.55s; }
        .splash-sub  { animation: splashSlideUp 0.45s ease both; animation-delay: 0.8s; }
      `}</style>

      {/* Logo SVG */}
      <svg className="splash-logo" width="180" height="180" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 18 C76 18 57 37 57 61 C57 85 100 128 100 128 C100 128 143 85 143 61 C143 37 124 18 100 18 Z"
          fill="none" stroke="#1E3A5F" strokeWidth="7" strokeLinejoin="round"/>
        <circle cx="100" cy="60" r="17" fill="none" stroke="#1E3A5F" strokeWidth="7"/>
        <text x="100" y="158" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="28">
          <tspan fill="#1E3A5F">Riphah</tspan><tspan fill="#C8960A">Stay</tspan>
        </text>
        <path d="M30 172 Q47 165 64 172 Q81 179 98 172 Q115 165 132 172 Q149 179 170 172"
          fill="none" stroke="#1E3A5F" strokeWidth="3" strokeLinecap="round"/>
        <path d="M30 182 Q47 175 64 182 Q81 189 98 182 Q115 175 132 182 Q149 189 170 182"
          fill="none" stroke="#C8960A" strokeWidth="3" strokeLinecap="round"/>
      </svg>

      <p className="splash-text" style={{ color: "#64748b", fontSize: 13, margin: "6px 0 0", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em", fontWeight: 600 }}>
        Hostel Management System
      </p>
      <p className="splash-sub" style={{ color: "#94a3b8", fontSize: 11, margin: "4px 0 0", fontFamily: "Inter, sans-serif", letterSpacing: "0.04em" }}>
        Riphah International University
      </p>
    </div>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <WebSplash onDone={() => setSplashDone(true)} />}
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ResetPassword />} />

        {/* ADMIN ROUTES */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/complaints"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminComplaints />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/hostel"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminHostel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/wardens"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminWardens />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/finance"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminFinance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/transport"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminTransport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications-alerts"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminNotificationsAndAlerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allow={["admin"]}>
              <AdminSetting />
            </ProtectedRoute>
          }
        />

        {/* WARDEN ROUTES */}
        <Route
          path="/warden"
          element={
            <ProtectedRoute allow={["warden"]}>
              <WardenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/students"
          element={
            <ProtectedRoute allow={["warden"]}>
              <WardenStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/attendance"
          element={
            <ProtectedRoute allow={["warden"]}>
              <WardenAttendance />
            </ProtectedRoute>
          }
        />
         <Route
          path="/warden/attendanceqr"
          element={
            <ProtectedRoute allow={["warden"]}>
              <AttendanceQr />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/rooms"
          element={
            <ProtectedRoute allow={["warden"]}>
              <WardenRooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/notifications-alerts"
          element={
            <ProtectedRoute allow={["warden"]}>
              <WardenNotificationsAndAlerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/warden/profile"
          element={
            <ProtectedRoute allow={["warden"]}>
              <WardenProfile />
            </ProtectedRoute>
          }
        />

        {/* DEFAULT REDIRECTS */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}
