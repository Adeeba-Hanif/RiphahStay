/**
 * Stats / Finance Analytics controller
 *
 * Endpoints:
 *   GET /api/stats/finance   – admin: total revenue, paid/unpaid counts, monthly breakdown
 *   GET /api/stats/overview  – admin: students, rooms, complaints, leave summary
 */

import { Challan } from "../models/challan.model.js";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js";

// ── GET /api/stats/finance  (admin)  ────────────────────────────────────────
export const getFinanceStats = async (req, res) => {
    try {
        // Overall totals
        const [totals] = await Challan.aggregate([
            {
                $group: {
                    _id: null,
                    totalChallans:   { $sum: 1 },
                    totalRevenue:    { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] } },
                    pendingRevenue:  { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, "$totalAmount", 0] } },
                    paidCount:       { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
                    unpaidCount:     { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
                },
            },
        ]);

        // Monthly breakdown  last 12 months
        const monthlyBreakdown = await Challan.aggregate([
            {
                $group: {
                    _id:           "$month",
                    collected:     { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] } },
                    pending:       { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, "$totalAmount", 0] } },
                    paidCount:     { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
                    unpaidCount:   { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
                    totalChallans: { $sum: 1 },
                },
            },
            { $sort: { "_id": 1 } },
            { $limit: 12 },
        ]);

        // Unique students with challans
        const studentsWithChallans = await Challan.distinct("student");
        const totalStudents = await User.countDocuments({ role: "student", isActive: true });

        return res.json({
            totals: totals
                ? {
                      totalChallans:  totals.totalChallans,
                      totalRevenue:   totals.totalRevenue,
                      pendingRevenue: totals.pendingRevenue,
                      paidCount:      totals.paidCount,
                      unpaidCount:    totals.unpaidCount,
                  }
                : { totalChallans: 0, totalRevenue: 0, pendingRevenue: 0, paidCount: 0, unpaidCount: 0 },
            monthlyBreakdown,
            studentsSummary: {
                total:         totalStudents,
                withChallans:  studentsWithChallans.length,
                noChallan:     totalStudents - studentsWithChallans.length,
            },
        });
    } catch (err) {
        console.error("getFinanceStats error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// ── GET /api/stats/overview  (admin)  ───────────────────────────────────────
export const getOverviewStats = async (req, res) => {
    try {
        const [
            totalStudents,
            totalRooms,
            occupiedRooms,
            availableRooms,
        ] = await Promise.all([
            User.countDocuments({ role: "student", isActive: true }),
            Room.countDocuments(),
            Room.countDocuments({ status: "booked" }),
            Room.countDocuments({ status: "available" }),
        ]);

        const [challanTotals] = await Challan.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue:   { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] } },
                    pendingRevenue: { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, "$totalAmount", 0] } },
                    unpaidCount:    { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
                },
            },
        ]);

        return res.json({
            students:       { total: totalStudents },
            rooms:          { total: totalRooms, occupied: occupiedRooms, available: availableRooms },
            finance:        challanTotals
                ? {
                      totalRevenue:   challanTotals.totalRevenue,
                      pendingRevenue: challanTotals.pendingRevenue,
                      unpaidCount:    challanTotals.unpaidCount,
                  }
                : { totalRevenue: 0, pendingRevenue: 0, unpaidCount: 0 },
        });
    } catch (err) {
        console.error("getOverviewStats error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
