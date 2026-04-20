import mongoose from "mongoose";
const { Schema } = mongoose;

const itemSchema = new Schema({
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
});

const billingSchema = new Schema(
    {
        student: { type: Schema.Types.ObjectId, ref: "User", required: true },
        items: [itemSchema],
        totalAmount: { type: Number, required: true },
        status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
        dueDate: { type: Date },
    },
    { timestamps: true }
);

export const Billing = mongoose.model("Billing", billingSchema);
