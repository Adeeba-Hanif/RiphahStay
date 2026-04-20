import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { User } from "../models/user.model.js";

/** Resend throws if constructed without a key — only create when RESEND_API_KEY is set. */
let resendSingleton = null;
function getResend() {
    const key = process.env.RESEND_API_KEY?.trim();
    if (!key) return null;
    if (!resendSingleton) resendSingleton = new Resend(key);
    return resendSingleton;
}

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ message: "No account found with that email" });

        const resend = getResend();
        if (!resend) {
            console.error("forgotPassword: RESEND_API_KEY is missing");
            return res.status(503).json({
                message:
                    "Email is not configured on the server. Add RESEND_API_KEY to backend/.env and restart.",
            });
        }

        const token = crypto.randomBytes(4).toString("hex").toUpperCase();
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        await user.save();

        const fromEmail =
            process.env.RESEND_FROM_EMAIL?.trim() || "RiphahStay <onboarding@resend.dev>";

        await resend.emails.send({
            from: fromEmail.includes("<") ? fromEmail : `RiphahStay <${fromEmail}>`,
            to: user.email,
            subject: "Your Password Reset OTP",
            html: `
                <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
                    <h2 style="color:#4F46E5;margin:0 0 8px">RiphahStay</h2>
                    <p style="color:#334155;margin:0 0 24px">Your password reset OTP is:</p>
                    <div style="font-size:40px;font-weight:700;letter-spacing:10px;color:#4F46E5;text-align:center;padding:20px;background:#eef2ff;border-radius:8px">${token}</div>
                    <p style="color:#94a3b8;font-size:12px;margin-top:24px">This OTP expires in <strong>15 minutes</strong>. If you didn't request this, ignore this email.</p>
                </div>
            `,
        });

        return res.status(200).json({ message: "OTP sent to your email" });
    } catch (err) {
        console.error("forgotPassword error:", err);
        return res.status(500).json({ message: "Failed to send OTP. Try again." });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword)
            return res.status(400).json({ message: "Email, OTP, and new password are required" });

        if (newPassword.length < 8)
            return res.status(400).json({ message: "Password must be at least 8 characters" });

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            resetPasswordToken: otp.toUpperCase().trim(),
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
        console.error("resetPassword error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
