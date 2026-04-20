import mongoose from "mongoose";
const { Schema } = mongoose;

const leaveSchema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: "User", required: true },
        reason: { type: String, required: true },
        duration: {
            from: { type: Date, required: true },
            to: { type: Date, required: true },
        },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        note: { type: String, default: "" },
        decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

export const Leave = mongoose.model("Leave", leaveSchema);
