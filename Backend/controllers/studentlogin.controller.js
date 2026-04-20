import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { getUserProfileById } from "../utils/getUserProfileById.js";

export const studentSignin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find user
        const student = await User.findOne({ email: normalizedEmail });
        if (!student) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: student._id,
                email: student.email,
                role: student.role,
            },
            process.env.JWT_SECRET || "defaultsecret",
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );

        const profile = await getUserProfileById(student._id);

        return res.status(200).json({
            message: "Signin successful",
            token,
            student: profile, 
        });
    } catch (err) {
        console.error("Signin error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
