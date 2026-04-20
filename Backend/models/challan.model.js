import mongoose from "mongoose";
const { Schema } = mongoose;

const challanItemSchema = new Schema({
    description: { type: String, required: true },
    amount:      { type: Number, required: true },
});

const challanSchema = new Schema(
    {
        challanId:   { type: String, unique: true, required: true },

        // ── Who & when ────────────────────────────────────────────────
        student:     { type: Schema.Types.ObjectId, ref: "User",        required: true },
        createdBy:   { type: Schema.Types.ObjectId, ref: "User",        required: true },

        // ── Challan type ─────────────────────────────────────────────
        // "monthly"  – admin-generated rent challan (existing)
        // "booking"  – auto-generated when a room request is approved
        // "mess"     – student-generated mess / food challan
        type: {
            type:    String,
            enum:    ["monthly", "booking", "mess"],
            default: "monthly",
        },

        // ── Period ───────────────────────────────────────────────────
        month:   { type: String, required: true }, // e.g. "June 2025"

        // ── Line items & amount ──────────────────────────────────────
        items:       [challanItemSchema],
        totalAmount: { type: Number, required: true },

        // ── Status ───────────────────────────────────────────────────
        status:  { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
        dueDate: { type: Date, required: true },
        paidAt:  { type: Date, default: null },
        bankRef: { type: String, default: "" },

        // ── Relations (type-specific) ────────────────────────────────
        // booking challan → the RoomRequest that triggered it
        bookingRef:  { type: Schema.Types.ObjectId, ref: "RoomRequest", default: null },

        // mess challan → the MessRecord documents that were billed
        messRecords: [{ type: Schema.Types.ObjectId, ref: "MessRecord" }],
    },
    { timestamps: true }
);

// Compound uniqueness: one monthly challan per student per month
// booking/mess challans are not subject to this constraint
challanSchema.index(
    { student: 1, month: 1, type: 1 },
    { unique: false } // we enforce monthly uniqueness in application logic only
);
challanSchema.index({ student: 1, type: 1 });
challanSchema.index({ status: 1 });
challanSchema.index({ bookingRef: 1 }, { sparse: true });

export const Challan = mongoose.model("Challan", challanSchema);
