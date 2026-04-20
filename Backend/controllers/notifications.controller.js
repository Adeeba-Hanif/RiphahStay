import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";

const AUDIENCE_VALUES = ["all", "admin", "warden", "student"];

/** POST /api/notifications/send — admin broadcast (creates DB row; mobile/web poll GET /notifications) */
export const sendBroadcast = async (req, res) => {
    try {
        const { title, audience } = req.body || {};
        const text = req.body.text || req.body.message;
        if (!text?.trim()) {
            return res.status(400).json({ message: "Message text is required" });
        }

        let aud = audience;
        if (aud == null) aud = ["student"];
        if (!Array.isArray(aud)) aud = [aud];
        aud = aud.filter((a) => AUDIENCE_VALUES.includes(a));
        if (aud.length === 0) {
            return res.status(400).json({
                message: `audience must be one or more of: ${AUDIENCE_VALUES.join(", ")}`,
            });
        }

        const notification = await Notification.create({
            users: [],
            audience: aud,
            title: title?.trim() || "Announcement",
            text: text.trim(),
            type: "info",
            isRead: false,
        });

        return res.status(201).json({ message: "Notification created", notification });
    } catch (err) {
        console.error("sendBroadcast error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;

        if (!userId || !role) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        let notifications;

        if (role === "admin" || role === "warden") {
            // Staff see all notifications — they need full visibility into what was sent
            notifications = await Notification.find({})
                .sort({ createdAt: -1 })
                .lean();
        } else {
            // Students see only notifications targeted at them
            const audienceFilters = ["all", "student"];
            const userMatch = mongoose.Types.ObjectId.isValid(userId)
                ? { users: new mongoose.Types.ObjectId(userId) }
                : { users: userId };

            notifications = await Notification.find({
                $or: [
                    userMatch,
                    { audience: { $in: audienceFilters } },
                ],
            })
                .sort({ createdAt: -1 })
                .lean();
        }

        return res.json({ count: notifications.length, notifications });
    } catch (err) {
        console.error("getNotifications error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const updateNotificationRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        const { id } = req.params;
        const { isRead } = req.body;

        if (!userId || !role) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!id) {
            return res.status(400).json({ message: "Notification id is required" });
        }

        const audienceFilters = ["all"];
        if (["student", "warden", "admin"].includes(role)) {
            audienceFilters.push(role);
        }

        const userMatch = mongoose.Types.ObjectId.isValid(userId)
            ? { users: new mongoose.Types.ObjectId(userId) }
            : { users: userId };

        const notification = await Notification.findOne({
            _id: id,
            $or: [
                userMatch,
                { audience: { $in: audienceFilters } },
            ],
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        notification.isRead = Boolean(isRead);
        await notification.save();

        return res.json({
            message: "Notification updated",
            notification,
        });
    } catch (err) {
        console.error("updateNotificationRead error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
