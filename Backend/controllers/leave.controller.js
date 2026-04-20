import { Leave } from "../models/leave.model.js";
import { Notification } from "../models/notification.model.js";

export const createLeave = async (req, res) => {
    try {
        const userId = req.user.id;
        const { reason, from, to } = req.body;

        // basic validation
        if (!reason || !reason.trim()) {
            return res.status(400).json({ message: "Reason is required" });
        }
        if (!from || !to) {
            return res.status(400).json({ message: "Both from and to dates are required" });
        }

        // make sure dates are valid
        const fromDate = new Date(from);
        const toDate = new Date(to);

        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        if (fromDate > toDate) {
            return res.status(400).json({ message: "From date cannot be after To date" });
        }

        const leave = await Leave.create({
            student: userId,
            reason: reason.trim(),
            duration: {
                from: fromDate,
                to: toDate,
            },
            // status will be "pending" by default
        });

        return res.status(201).json({
            message: "Leave request submitted successfully",
            leave,
        });
    } catch (err) {
        console.error("Error creating leave:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /leave/all  (admin/warden)
export const getAllLeaves = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status && ["pending", "approved", "rejected"].includes(status)) {
            filter.status = status;
        }

        const leaves = await Leave.find(filter)
            .populate("student", "fullName email room")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ leaves });
    } catch (err) {
        console.error("Error fetching all leaves:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// PATCH /leave/:id/decide  (admin/warden)
export const decideLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { decision, note } = req.body;

        if (!["approved", "rejected"].includes(decision)) {
            return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
        }

        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({ message: "Leave request not found" });
        }
        if (leave.status !== "pending") {
            return res.status(400).json({ message: "Leave request already decided" });
        }

        leave.status = decision;
        if (note) leave.note = note;
        leave.decidedBy = req.user.id;
        await leave.save();

        // notify student
        const title = decision === "approved" ? "Leave Approved" : "Leave Rejected";
        const text =
            decision === "approved"
                ? `Your leave request from ${leave.duration.from.toDateString()} to ${leave.duration.to.toDateString()} has been approved.`
                : `Your leave request has been rejected.${note ? ` Note: ${note}` : ""}`;

        await Notification.create({
            users: [leave.student],
            title,
            text,
            type: decision === "approved" ? "info" : "alert",
            payload: { leaveId: leave._id, decision },
        });

        return res.json({ message: `Leave ${decision}`, leave });
    } catch (err) {
        console.error("decideLeave error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /leaves/me
export const getMyLeaves = async (req, res) => {
    try {
        const userId = req.user.id;

        const leaves = await Leave.find({ student: userId })
            .sort({ createdAt: -1 })
            .lean();

        const grouped = {
            pending: [],
            approved: [],
            rejected: [],
        };

        leaves.forEach((lv) => {
            if (lv.status === "approved") grouped.approved.push(lv);
            else if (lv.status === "rejected") grouped.rejected.push(lv);
            else grouped.pending.push(lv);
        });

        return res.status(200).json(grouped);
    } catch (err) {
        console.error("Error fetching leaves:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
