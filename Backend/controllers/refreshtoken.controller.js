import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { getUserProfileById } from "../utils/getUserProfileById.js";

export const refreshToken = async (req, res) => {
    try {
        // req.user was set by verifyToken
        const { id } = req.user;

        // get fresh user from DB to return latest info
        const user = await User.findById(id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // sign a new token with same payload
        const newToken = jwt.sign(
            {
                id: user._id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET || "defaultsecret",
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );
        const profile = await getUserProfileById(user._id);

        return res.status(200).json({
            message: "Token refreshed",
            token: newToken,
            student: profile
        });
    } catch (err) {
        console.error("Refresh error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
