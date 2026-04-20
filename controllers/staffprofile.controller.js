import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// helper
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role,
        },
        process.env.JWT_SECRET ,
        { expiresIn: "7d" }
    );
};

/**
 * POST /auth/login
 * Body: { email, password }
 * Works for BOTH admin and warden (and rejects others)
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // only allow admin + warden to log into this portal
        if (!["admin", "warden"].includes(user.role)) {
            return res
                .status(403)
                .json({ message: "This account is not allowed in this portal" });
        }

        if (!user.isActive) {
            return res.status(403).json({ message: "Account is inactive" });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = generateToken(user);

        return res.json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
            },
        });
    } catch (err) {
        console.error("login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /auth/me
 * Works for both admin and warden
 * Requires verifyToken
 * Refreshes token
 */
export const getMe = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!["admin", "warden"].includes(user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const newToken = generateToken(user);

        return res.json({
            user,
            token: newToken,
        });
    } catch (err) {
        console.error("getMe error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /auth/change-password
 * Body: { oldPassword, newPassword }
 * For both admin and warden (whoever is logged in)
 */
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body || {};

        if (!oldPassword || !newPassword) {
            return res
                .status(400)
                .json({ message: "oldPassword and newPassword are required" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) {
            return res.status(400).json({ message: "Old password is incorrect" });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();

        return res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("changePassword error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * PATCH /auth/update-profile
 * Body: { fullName?, phone? }
 */
export const updateProfile = async (req, res) => {
    try {
        const { fullName, phone } = req.body || {};

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (fullName && fullName.trim().length >= 3) user.fullName = fullName.trim();
        if (phone !== undefined) user.phone = phone.trim();

        await user.save();

        return res.json({
            message: "Profile updated successfully",
            user: { _id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
        });
    } catch (err) {
        console.error("updateProfile error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * POST /admin/wardens
 * Admin creates warden
 * Body: { fullName, email, password, phone? }
 */
export const createWarden = async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        if (!fullName || !email || !password) {
            return res
                .status(400)
                .json({ message: "fullName, email and password are required" });
        }

        const existing = await User.findOne({
            email: email.toLowerCase().trim(),
        });
        if (existing) {
            return res
                .status(409)
                .json({ message: "User with this email already exists" });
        }

        const hashed = await bcrypt.hash(password, 10);

        const warden = await User.create({
            fullName,
            email: email.toLowerCase().trim(),
            password: hashed,
            phone: phone || "",
            role: "warden",
            isActive: true,
        });

        return res.status(201).json({
            message: "Warden created",
            warden: {
                _id: warden._id,
                fullName: warden.fullName,
                email: warden.email,
                phone: warden.phone,
                role: warden.role,
                isActive: warden.isActive,
            },
        });
    } catch (err) {
        console.error("createWarden error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET /admin/wardens
 * ?status=active|inactive|all
 */
export const getWardens = async (req, res) => {
    try {
        const { status = "active" } = req.query;

        const filter = { role: "warden" };

        if (status === "active") {
            filter.isActive = true;
        } else if (status === "inactive") {
            filter.isActive = false;
        }
        // status === 'all' -> no extra filter

        const wardens = await User.find(
            filter,
            "_id fullName email phone role isActive"
        ).lean();

        return res.json({ wardens });
    } catch (err) {
        console.error("getWardens error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

/**
 * PATCH /admin/wardens/:id/status
 * Body: { isActive: boolean }
 */
export const setWardenStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res
                .status(400)
                .json({ message: "isActive must be a boolean (true/false)" });
        }

        const warden = await User.findOne({ _id: id, role: "warden" });
        if (!warden) {
            return res.status(404).json({ message: "Warden not found" });
        }

        warden.isActive = isActive;
        await warden.save();

        return res.json({
            message: "Warden status updated",
            warden: {
                _id: warden._id,
                fullName: warden.fullName,
                email: warden.email,
                phone: warden.phone,
                role: warden.role,
                isActive: warden.isActive,
            },
        });
    } catch (err) {
        console.error("setWardenStatus error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
