import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
    {
        fullName: { type: String, required: true },
        email: { type: String, unique: true, required: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        phone: { type: String },

        room: { type: Schema.Types.ObjectId, ref: "Room", default: null },

        // admin-defined plan
        messPlan: { type: Schema.Types.ObjectId, ref: "MessPlan", default: null },

        // user’s own “I will eat / I won’t eat” switches
        messChoices: {
            mon: {
                breakfast: { type: Boolean, default: true },
                lunch: { type: Boolean, default: true },
                dinner: { type: Boolean, default: true },
            },
            tue: {
                breakfast: { type: Boolean, default: true },
                lunch: { type: Boolean, default: true },
                dinner: { type: Boolean, default: true },
            },
            wed: {
                breakfast: { type: Boolean, default: true },
                lunch: { type: Boolean, default: true },
                dinner: { type: Boolean, default: true },
            },
            thu: {
                breakfast: { type: Boolean, default: true },
                lunch: { type: Boolean, default: true },
                dinner: { type: Boolean, default: true },
            },
            fri: {
                breakfast: { type: Boolean, default: true },
                lunch: { type: Boolean, default: true },
                dinner: { type: Boolean, default: true },
            },
            sat: {
                breakfast: { type: Boolean, default: true },
                lunch: { type: Boolean, default: true },
                dinner: { type: Boolean, default: true },
            },
            sun: {
                breakfast: { type: Boolean, default: true },
                lunch: { type: Boolean, default: true },
                dinner: { type: Boolean, default: true },
            },
        },

        paymentFrequency: {
            type: String,
            enum: ["monthly"],
            default: "monthly",
        },

        role: { type: String, enum: ["student", "admin", "warden"], default: "student" },
        isActive: { type: Boolean, default: true },

        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null },
    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
