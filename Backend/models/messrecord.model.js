import mongoose from "mongoose";
const { Schema } = mongoose;

// One document = one meal consumed by one student on one day.
// Records are created either:
//   (a) by admin/warden calling POST /api/mess/log
//   (b) automatically via the "lock day" helper based on student.messChoices
// Once billed (isBilled = true), the challan ObjectId is stamped on the record.

const messRecordSchema = new Schema(
    {
        student:   { type: Schema.Types.ObjectId, ref: "User",    required: true },

        // What was eaten
        mealType:  { type: String, enum: ["breakfast", "lunch", "dinner"], required: true },
        itemName:  { type: String, required: true },   // e.g. "Breakfast – Monday"
        dayOfWeek: { type: String, required: true },   // e.g. "Monday"

        // Pricing
        price:    { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, default: 1, min: 1 },

        // When it happened
        date: { type: Date, required: true },

        // Billing state
        isBilled: { type: Boolean, default: false },
        challan:  { type: Schema.Types.ObjectId, ref: "Challan", default: null },
    },
    { timestamps: true }
);

// Fast look-ups used by most queries
messRecordSchema.index({ student: 1, isBilled: 1 });
messRecordSchema.index({ student: 1, date: -1 });
messRecordSchema.index({ student: 1, isBilled: 1, date: 1 });

export const MessRecord = mongoose.model("MessRecord", messRecordSchema);
