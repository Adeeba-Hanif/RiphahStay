/**
 * Mess / Food tracking controller
 *
 * Endpoints:
 *   POST   /api/mess/log                 – warden/admin logs a meal consumed by a student
 *   POST   /api/mess/log-my-meal         – student logs one meal for a chosen date (B/L/D, hostel rates)
 *   POST   /api/mess/log-my-choices      – student self-logs today's meals from their messChoices
 *   GET    /api/mess/my-records          – student: get their unbilled records + running total
 *   GET    /api/mess/all-records         – admin/warden: list records with filters
 *   POST   /api/mess/generate-challan   – student: aggregate unbilled records → create mess challan
 */

import { MessRecord } from "../models/messrecord.model.js";
import { User } from "../models/user.model.js";

// ── Meal price config (single source of truth) ────────────────────────────
const MEAL_PRICES = {
    breakfast: 100,
    lunch:     180,
    dinner:    200,
};

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

/** Aligns with `user.messChoices` keys (mon…sun) */
const LONG_DAY_TO_KEY = {
    sunday: "sun",
    monday: "mon",
    tuesday: "tue",
    wednesday: "wed",
    thursday: "thu",
    friday: "fri",
    saturday: "sat",
};

// ── Helpers ───────────────────────────────────────────────────────────────
function currentMonthLabel() {
    const now = new Date();
    return now.toLocaleString("default", { month: "long" }) + " " + now.getFullYear();
}

function startOfDay(d)   { const x = new Date(d); x.setHours(0,0,0,0);   return x; }
function endOfDay(d)     { const x = new Date(d); x.setHours(23,59,59,999); return x; }
function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d)   {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mess/log   (admin / warden)
// Body: { studentId, mealType, date? }
// Creates one MessRecord for a specific meal on a given date.
// ─────────────────────────────────────────────────────────────────────────────
export const logMeal = async (req, res) => {
    try {
        const { studentId, mealType, date } = req.body;

        if (!studentId || !mealType) {
            return res.status(400).json({ message: "studentId and mealType are required" });
        }
        if (!MEAL_PRICES[mealType]) {
            return res.status(400).json({ message: "mealType must be breakfast | lunch | dinner" });
        }

        const student = await User.findOne({ _id: studentId, role: "student" });
        if (!student) return res.status(404).json({ message: "Student not found" });

        const recordDate = date ? new Date(date) : new Date();
        const dayOfWeek  = DAY_NAMES[recordDate.getDay()];

        // Prevent duplicate log for same student + mealType + day
        const duplicate = await MessRecord.findOne({
            student: studentId,
            mealType,
            date: { $gte: startOfDay(recordDate), $lte: endOfDay(recordDate) },
        });
        if (duplicate) {
            return res.status(409).json({ message: `${mealType} already logged for this student on this day` });
        }

        const record = await MessRecord.create({
            student:   studentId,
            mealType,
            itemName:  `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} – ${dayOfWeek}`,
            dayOfWeek,
            price:     MEAL_PRICES[mealType],
            quantity:  1,
            date:      recordDate,
        });

        return res.status(201).json({ message: "Meal logged", record });
    } catch (err) {
        console.error("logMeal error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mess/log-my-meal   (student)
// Body: { mealType, date? }  — date = ISO string; defaults to now. No future dates.
// Creates one MessRecord; same pricing & duplicate rules as admin logMeal.
// ─────────────────────────────────────────────────────────────────────────────
export const logMyMeal = async (req, res) => {
    try {
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Students only" });
        }

        const studentId = req.user.id;
        const { mealType, date } = req.body;

        if (!mealType || !MEAL_PRICES[mealType]) {
            return res.status(400).json({ message: "mealType must be breakfast, lunch, or dinner" });
        }

        const recordDate = date != null && date !== "" ? new Date(date) : new Date();
        if (Number.isNaN(recordDate.getTime())) {
            return res.status(400).json({ message: "Invalid date" });
        }

        const now = new Date();
        if (recordDate > endOfDay(now)) {
            return res.status(400).json({ message: "Cannot log meals for a future date" });
        }

        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 1);
        if (recordDate < startOfDay(minDate)) {
            return res.status(400).json({ message: "Date is too far in the past" });
        }

        const dayOfWeek = DAY_NAMES[recordDate.getDay()];

        const duplicate = await MessRecord.findOne({
            student: studentId,
            mealType,
            date: { $gte: startOfDay(recordDate), $lte: endOfDay(recordDate) },
        });
        if (duplicate) {
            return res.status(409).json({
                message: `${mealType} is already logged for this day`,
            });
        }

        const record = await MessRecord.create({
            student: studentId,
            mealType,
            itemName: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} – ${dayOfWeek}`,
            dayOfWeek,
            price: MEAL_PRICES[mealType],
            quantity: 1,
            date: recordDate,
        });

        return res.status(201).json({ message: "Meal logged", record });
    } catch (err) {
        console.error("logMyMeal error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mess/log-my-choices   (student)
// No body  uses student.messChoices to log today's enabled meals.
// Idempotent: skips any meal already logged today.
// ─────────────────────────────────────────────────────────────────────────────
export const logMyChoices = async (req, res) => {
    try {
        const studentId = req.user.id;
        const student   = await User.findById(studentId).lean();
        if (!student) return res.status(404).json({ message: "User not found" });

        const choices   = student.messChoices || {};
        const now       = new Date();
        const dayLong   = DAY_NAMES[now.getDay()].toLowerCase(); // e.g. "monday"
        const dayKey    = LONG_DAY_TO_KEY[dayLong] || "mon";
        const dayLabel  = DAY_NAMES[now.getDay()]; // e.g. "Monday"
        const todayChoices = choices[dayKey] || {};

        const logged   = [];
        const skipped  = [];

        for (const mealType of ["breakfast", "lunch", "dinner"]) {
            if (!todayChoices[mealType]) { skipped.push(mealType + " (not opted)"); continue; }

            const dup = await MessRecord.findOne({
                student: studentId,
                mealType,
                date: { $gte: startOfDay(now), $lte: endOfDay(now) },
            });
            if (dup) { skipped.push(mealType + " (already logged)"); continue; }

            await MessRecord.create({
                student:   studentId,
                mealType,
                itemName:  `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} – ${dayLabel}`,
                dayOfWeek: dayLabel,
                price:     MEAL_PRICES[mealType],
                quantity:  1,
                date:      now,
            });
            logged.push(mealType);
        }

        return res.json({ message: "Today's choices logged", logged, skipped });
    } catch (err) {
        console.error("logMyChoices error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mess/my-records   (student)
// ?month=June 2025  (optional  defaults to current month)
// Returns unbilled records + running total for the student.
// ─────────────────────────────────────────────────────────────────────────────
export const getMyRecords = async (req, res) => {
    try {
        const studentId = req.user.id;
        const monthStr  = req.query.month || currentMonthLabel();

        // Parse "June 2025" → date range
        const parsed = new Date(`1 ${monthStr}`);
        if (isNaN(parsed)) {
            return res.status(400).json({ message: "Invalid month format (e.g. June 2025)" });
        }
        const from = startOfMonth(parsed);
        const to   = endOfMonth(parsed);

        const records = await MessRecord.find({
            student:  studentId,
            date:     { $gte: from, $lte: to },
        }).sort({ date: -1 }).lean();

        const unbilled  = records.filter((r) => !r.isBilled);
        const billed    = records.filter((r) =>  r.isBilled);
        const pendingTotal = unbilled.reduce((s, r) => s + r.price * r.quantity, 0);
        const billedTotal  = billed.reduce((s, r) => s + r.price * r.quantity, 0);

        return res.json({
            month: monthStr,
            unbilled,
            billed,
            pendingTotal,
            billedTotal,
            totalRecords: records.length,
        });
    } catch (err) {
        console.error("getMyRecords error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mess/all-records   (admin / warden)
// ?studentId=&month=&isBilled=true|false
// ─────────────────────────────────────────────────────────────────────────────
export const getAllRecords = async (req, res) => {
    try {
        const { studentId, month, isBilled } = req.query;
        const filter = {};

        if (studentId)          filter.student  = studentId;
        if (isBilled !== undefined) filter.isBilled = isBilled === "true";

        if (month) {
            const parsed = new Date(`1 ${month}`);
            if (!isNaN(parsed)) {
                filter.date = { $gte: startOfMonth(parsed), $lte: endOfMonth(parsed) };
            }
        }

        const records = await MessRecord.find(filter)
            .populate("student", "fullName email")
            .sort({ date: -1 })
            .limit(500)
            .lean();

        return res.json({ records, count: records.length });
    } catch (err) {
        console.error("getAllRecords error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mess/generate-challan   (student) — disabled: mess is billed on main monthly challan
// ─────────────────────────────────────────────────────────────────────────────
export const generateMessChallan = async (req, res) => {
    try {
        return res.status(400).json({
            message:
                "Mess charges are included in your main monthly hostel challan. Ask the hostel office to generate monthly challans from Finance; meal lines are added automatically for that month.",
        });
    } catch (err) {
        console.error("generateMessChallan error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
