import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";

export const changePassword = async (req, res) => {
    try {
        const userId = req.user?.id; 
        const { oldPassword, newPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Old and new password are required" });
        }

        // optional basic validation
        if (newPassword.length < 8) {
            return res
                .status(400)
                .json({ message: "New password must be at least 8 characters" });
        }

        const user = await User.findById(userId).select("+password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // check old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Old password is incorrect" });
        }

        // hash new password
        const hashed = await bcrypt.hash(newPassword, 10);
        user.password = hashed;
        await user.save();

        return res.status(200).json({ message: "Password changed successfully" });
    } catch (err) {
        console.error("changePassword error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
