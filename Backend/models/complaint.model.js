import mongoose from "mongoose";
const { Schema } = mongoose;

const MAINTENANCE_TITLES = [
    "Electrical Issue",
    "Plumbing issue",
    "Furniture&Fixture",
    "Room cleaning/Hygiene",
    "Internet/Wifi",
    "Water supply",
];

const complaintSchema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: "User", required: true },

        // title behaves differently based on `tag`
        title: {
            type: String,
            required: true,
            validate: {
                validator: function (value) {
                    // for maintenance requests, title must be one of the fixed ones
                    if (this.tag === "maintenance_request") {
                        return MAINTENANCE_TITLES.includes(value);
                    }
                    // for normal complaints, anything is fine
                    return true;
                },
                message:
                    "For maintenance requests, title must be one of the predefined categories.",
            },
        },

        // description / body
        text: { type: String, required: true },

        response: { type: String },

        status: {
            type: String,
            enum: ["pending", "resolved", "rejected"],
            default: "pending",
        },

        handledBy: { type: Schema.Types.ObjectId, ref: "User" },

        tag: {
            type: String,
            enum: ["complaint", "maintenance_request"],
            default: "complaint",
        },
    },
    { timestamps: true }
);

export const Complaint = mongoose.model("Complaint", complaintSchema);
