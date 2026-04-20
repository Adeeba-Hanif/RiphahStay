import mongoose from "mongoose";
const { Schema } = mongoose;

const serviceUsageSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        serviceName: { type: String, required: true },
        count: { type: Number, default: 1 },
        perUnitPrice: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
        status: {
            type: String,
            enum: ["pending", "ready", "completed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

export const ServiceUsage = mongoose.model("ServiceUsage", serviceUsageSchema);
