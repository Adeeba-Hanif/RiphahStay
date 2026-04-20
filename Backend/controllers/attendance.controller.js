import jwt from "jsonwebtoken";
import { Attendance } from "../models/attendance.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";

export const getAttendanceQr = (req, res) => {
    const { direction } = req.query;

    if (!direction || !["incoming", "outgoing"].includes(direction)) {
        return res.status(400).json({ message: "direction must be 'incoming' or 'outgoing'" });
    }

    const payload = {
        type: "attendance",
        direction,
    };

    const qrToken = jwt.sign(payload, process.env.JWT_SECRET);

    res.json({
        qrToken,
        direction,
    });
};

async function createAfterHourAttendanceNotice({ studentId, studentName, time }) {
    const displayName = studentName || "Unknown student";

    const text = `After-hour attendance marked by ${displayName} (${studentId}) at ${time.toISOString()}`;

    await Notification.create({
        text,
        title: "After-hour attendance",
        audience: ["warden"],
        payload: {
            kind: "afterhour",
            studentId,
            studentName: displayName,
            time: time.toISOString(),
        },
        type: "alert",
    });
}

export const markAttendance = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { qrToken } = req.body;
        if (!qrToken) {
            return res.status(400).json({ message: "qrToken is required" });
        }

        let qrPayload;
        try {
            qrPayload = jwt.verify(qrToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: "Invalid QR" });
        }

        if (
            qrPayload.type !== "attendance" ||
            !["incoming", "outgoing"].includes(qrPayload.direction)
        ) {
            return res.status(400).json({ message: "Invalid attendance QR" });
        }
        const now = new Date();

        const attendance = await Attendance.create({
            student: userId,
            date: now,
            status: qrPayload.direction, // incoming | outgoing
        });

        if (qrPayload.direction === "incoming") {
            const studentDoc = await User.findById(userId).select("fullName");
            const studentName = studentDoc?.fullName || null;

            const hour = now.getHours();
            const minute = now.getMinutes();
            const isAfter430 = hour > 16 || (hour === 16 && minute > 30);

            if (isAfter430) {
                await createAfterHourAttendanceNotice({
                    studentId: userId,
                    studentName,
                    time: now,
                });
            }
        }

        return res.status(201).json({
            message: "Attendance recorded",
            attendance,
        });
    } catch (err) {
        console.error("markAttendance error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};


// GET /api/attendance/late-stats  (admin/warden)
// Returns daily late-return counts for the last 7 days.
// "Late" = incoming scan recorded after CURFEW_HOUR (23:00 default).
const CURFEW_HOUR = 23;

export const getLateStats = async (req, res) => {
    try {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            const curfew = new Date(d.getFullYear(), d.getMonth(), d.getDate(), CURFEW_HOUR, 0, 0, 0);

            const lateCount = await Attendance.countDocuments({
                status: "incoming",
                date: { $gte: curfew, $lte: end },
            });

            days.push({
                date:  start.toISOString().split("T")[0],
                label: start.toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" }),
                late:  lateCount,
            });
        }

        return res.json({ stats: days, curfewHour: CURFEW_HOUR });
    } catch (err) {
        console.error("getLateStats error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/attendance/late-today  (admin/warden)
// Returns students who came back late today (incoming after curfew).
export const getLateToday = async (req, res) => {
    try {
        const now   = new Date();
        const curfew = new Date(now.getFullYear(), now.getMonth(), now.getDate(), CURFEW_HOUR, 0, 0, 0);
        const end    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const records = await Attendance.find({
            status: "incoming",
            date: { $gte: curfew, $lte: end },
        }).populate("student", "fullName email room").sort({ date: -1 }).lean();

        return res.json({
            count: records.length,
            students: records.map((r) => ({
                student: r.student,
                returnTime: r.date,
            })),
        });
    } catch (err) {
        console.error("getLateToday error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getMyAttendance = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const records = await Attendance.find({ student: userId })
            .sort({ date: -1 })
            .lean();

        const data = records.map((r) => ({
            id: r._id,
            date: r.date,
            status: r.status,
            createdAt: r.createdAt,
        }));

        return res.json({
            count: data.length,
            attendance: data,
        });
    } catch (err) {
        console.error("getMyAttendance error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
