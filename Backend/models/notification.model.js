import mongoose from "mongoose";
const { Schema } = mongoose;

const notificationSchema = new Schema(
    {
        users: [
            { type: Schema.Types.ObjectId, ref: "User" }
        ],
        audience: [
            {
                type: String,
                enum: ["all", "admin", "warden", "student"],
            },
        ],
        title: { type: String, trim: true },
        text: { type: String, required: true, trim: true },
        actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
        type: { type: String, enum: ["info", "alert", "system"], default: "info" },
        payload: { type: Object, default: {} },
        isRead: { type: Boolean, default: false },
    },
    { timestamps: true }
);

notificationSchema.path("users").validate(function () {
    return (this.users && this.users.length) || (this.audience && this.audience.length);
}, "Notification must have at least one user or one audience role.");

export const Notification = mongoose.model("Notification", notificationSchema);
