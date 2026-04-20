import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js";
import { getUserProfileById } from "../utils/getUserProfileById.js";
import { mergeMessChoices } from "../utils/mergeMessChoices.js";

// GET /api/user/students  (admin/warden)
// ?includeInactive=true
export const getAllStudents = async (req, res) => {
    try {
        const filter = { role: "student" };
        if (req.query.includeInactive !== "true") filter.isActive = true;

        const students = await User.find(filter)
            .select("fullName email phone room isActive createdAt")
            .populate("room", "roomNumber level rent")
            .sort({ createdAt: -1 })
            .lean();

        return res.json({ students, total: students.length });
    } catch (err) {
        console.error("getAllStudents error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// GET /api/user/students/:id  (admin/warden)
export const getStudentById = async (req, res) => {
    try {
        const student = await User.findOne({ _id: req.params.id, role: "student" })
            .select("-password")
            .populate("room", "roomNumber level rent status")
            .lean();
        if (!student) return res.status(404).json({ message: "Student not found" });
        return res.json({ student });
    } catch (err) {
        console.error("getStudentById error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// PATCH /api/user/students/:id/status  (admin only)
// Body: { isActive: true|false }
export const setStudentStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(400).json({ message: "isActive must be a boolean" });
        }

        const student = await User.findOneAndUpdate(
            { _id: req.params.id, role: "student" },
            { isActive },
            { new: true }
        ).select("fullName email isActive");

        if (!student) return res.status(404).json({ message: "Student not found" });

        return res.json({ message: `Student ${isActive ? "activated" : "deactivated"}`, student });
    } catch (err) {
        console.error("setStudentStatus error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getStudentProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(400).json({ message: "User id missing in token" });
        }

        const user = await getUserProfileById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user);
    } catch (err) {
        console.error("getStudentProfile error:", err);
        res.status(500).json({ message: "Server error" });
    }
};



export const updateMyProfile = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user?.id;
        if (!userId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "User id missing in token" });
        }

        // allowed fields you can update
        const allowedFields = [
            "fullName",
            "phone",
            "messPlan",
            "messChoices",
        ];
        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const user = await User.findById(userId).session(session);
        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "User not found" });
        }

        const currentRoomId = user.room ? user.room.toString() : null;
        const requestedRoomId = req.body.room || null;

        // merge messChoices per day (partial updates must not wipe other meals)
        if (req.body.messChoices) {
            updates.messChoices = mergeMessChoices(user.messChoices, req.body.messChoices);
        }

        updates.paymentFrequency = "monthly";

        // ROOM CHANGE LOGIC
        if (requestedRoomId && requestedRoomId !== currentRoomId) {
            const targetRoom = await Room.findById(requestedRoomId).session(session);
            if (!targetRoom) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: "Target room not found" });
            }

            const hasVacancy =
                targetRoom.occupants.length < (targetRoom.capacity ?? 0);

            if (!hasVacancy) {
                await session.abortTransaction();
                session.endSession();
                return res
                    .status(400)
                    .json({ message: "Room is full. Choose another room." });
            }

            if (!targetRoom.occupants.some((id) => id.toString() === userId)) {
                targetRoom.occupants.push(userId);
            }

            if (targetRoom.occupants.length >= targetRoom.capacity) {
                targetRoom.status = "booked";
            } else {
                targetRoom.status = "available";
            }
            await targetRoom.save({ session });

            if (currentRoomId) {
                const oldRoom = await Room.findById(currentRoomId).session(session);
                if (oldRoom) {
                    oldRoom.occupants = oldRoom.occupants.filter(
                        (id) => id.toString() !== userId
                    );
                    if (oldRoom.occupants.length >= oldRoom.capacity) {
                        oldRoom.status = "booked";
                    } else {
                        oldRoom.status = "available";
                    }
                    await oldRoom.save({ session });
                }
            }

            updates.room = requestedRoomId;
        }

        await User.findByIdAndUpdate(userId, updates, {
            new: false,
            session,
        });

        const updatedUser = await getUserProfileById(userId, session);

        await session.commitTransaction();
        session.endSession();

        return res.json(updatedUser);
    } catch (err) {
        console.error("updateMyProfile error:", err);
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: "Server error" });
    }
};