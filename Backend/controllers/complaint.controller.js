import { Complaint } from "../models/complaint.model.js";

// keep same list the frontend shows
const MAINTENANCE_TITLES = [
    "Electrical Issue",
    "Plumbing issue",
    "Furniture&Fixture",
    "Room cleaning/Hygiene",
    "Internet/Wifi",
    "Water supply",
];

export const createComplaint = async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, description, tag } = req.body;

        const finalTag = tag || "complaint";

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Title is required" });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ message: "Description is required" });
        }

        // extra guard for maintenance
        if (finalTag === "maintenance_request") {
            const trimmedTitle = title.trim();
            if (!MAINTENANCE_TITLES.includes(trimmedTitle)) {
                return res.status(400).json({
                    message:
                        "Invalid maintenance category. Allowed: " + MAINTENANCE_TITLES.join(", "),
                });
            }
        }

        const complaint = await Complaint.create({
            student: userId,
            title: title.trim(),
            text: description.trim(), // matches schema field name
            tag: finalTag,
        });

        return res.status(201).json({
            message: "Complaint submitted successfully",
            complaint,
        });
    } catch (err) {
        console.error("Error creating complaint:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getMyComplaints = async (req, res) => {
    try {
        const userId = req.user.id;

        const complaints = await Complaint.find({ student: userId })
            .sort({ createdAt: -1 })
            .lean();

        const grouped = {
            pending: [],
            resolved: [],
            rejected: [],
        };

        complaints.forEach((c) => {
            if (c.status === "resolved") grouped.resolved.push(c);
            else if (c.status === "rejected") grouped.rejected.push(c);
            else grouped.pending.push(c);
        });

        return res.status(200).json(grouped);
    } catch (err) {
        console.error("Error getting complaints:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getAllComplaints = async (req, res) => {
    try {

        const { status } = req.query;
        const filter = {};

        if (status && ["pending", "resolved", "rejected"].includes(status)) {
            filter.status = status;
        }

        const complaints = await Complaint.find(filter)
            .sort({ createdAt: -1 })
            .populate({
                path: "student",
                select: "fullName email phone room",
                populate: {
                    path: "room",
                    select: "level roomNumber status",
                },
            })
            .populate({
                path: "handledBy",
                select: "fullName email role",
            })
            .lean();

        return res.status(200).json({
            count: complaints.length,
            complaints,
        });
    } catch (err) {
        console.error("Error getting all complaints:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const decideComplaint = async (req, res) => {
    try {

        const { id } = req.params; // /api/complaints/:id/decide
        const { status, response } = req.body;

        // only allow these two
        if (!["resolved", "rejected"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Allowed: resolved, rejected",
            });
        }

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        // update fields
        complaint.status = status;
        if (response) {
            complaint.response = response;
        }
        complaint.handledBy = req.user.id; // who decided it

        await complaint.save();

        // populate to return nice object
        const populated = await complaint.populate([
            {
                path: "student",
                select: "fullName email phone room",
                populate: { path: "room", select: "level roomNumber status" },
            },
            { path: "handledBy", select: "fullName email role" },
        ]);

        return res.status(200).json({
            message: `Complaint ${status} successfully`,
            complaint: populated || complaint,
        });
    } catch (err) {
        console.error("Error deciding complaint:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
