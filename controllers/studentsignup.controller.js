import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";

export const studentSignup = async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;

        // Basic field validation
        if (!fullName || !email || !phone || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Name validation
        if (fullName.trim().length < 3) {
            return res.status(400).json({ message: "Full name must be at least 3 characters" });
        }

        // min 8 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 symbol
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters long and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol",
            });
        }

        // Validate Riphah email format  any 5-digit SAP ID is accepted
        const emailRegex = /^([0-9]{5})@students\.riphah\.edu\.pk$/i;
        const match = email.toLowerCase().match(emailRegex);
        if (!match) {
            return res
                .status(400)
                .json({ message: "Invalid email. Use your university email (e.g. 12345@students.riphah.edu.pk)" });
        }

        // Normalize Pakistani phone number
        let cleanPhone = phone.replace(/\D/g, ""); // remove non-digits
        if (cleanPhone.startsWith("92")) cleanPhone = cleanPhone.slice(2);
        if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.slice(1);
        cleanPhone = "03" + cleanPhone.slice(1);

        if (!/^03[0-9]{9}$/.test(cleanPhone)) {
            return res.status(400).json({ message: "Invalid Pakistani phone number" });
        }

        // Check for existing student
        const existing = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { phone: cleanPhone }],
        });

        if (existing) {
            return res
                .status(409)
                .json({ message: "Email or phone already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new student record
        const student = await User.create({
            fullName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone: cleanPhone,
        });

        // Success response
        return res.status(201).json({
            message: "User registered successfully",
            student: {
                id: student._id,
                fullName: student.fullName,
                email: student.email,
                phone: student.phone,
                role: student.role,
            },
        });
    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
