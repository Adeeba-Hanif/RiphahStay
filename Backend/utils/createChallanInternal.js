/**
 * Shared helper used by any controller that needs to create a Challan
 * without going through the HTTP layer.
 *
 * Usage:
 *   import { createChallanInternal } from "../utils/createChallanInternal.js";
 *   const challan = await createChallanInternal({ student, month, items, dueDate, createdBy, type, bookingRef, messRecords });
 */

import { Challan } from "../models/challan.model.js";

// ── Unique ID generator ────────────────────────────────────────────────────
async function generateChallanId() {
    const now = new Date();
    const ym  = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const rand = Math.floor(10000 + Math.random() * 90000);
    const id   = `MEEZAN-${ym}-${rand}`;
    const exists = await Challan.findOne({ challanId: id });
    return exists ? generateChallanId() : id;
}

// ── Main helper ────────────────────────────────────────────────────────────
/**
 * @param {Object}   opts
 * @param {string}   opts.student     – student ObjectId (string or ObjectId)
 * @param {string}   opts.month       – e.g. "June 2025"
 * @param {Array}    opts.items       – [{ description, amount }]
 * @param {Date}     opts.dueDate
 * @param {string}   opts.createdBy   – actor ObjectId
 * @param {string}   [opts.type]      – "monthly" | "booking" | "mess"  (default "monthly")
 * @param {string}   [opts.bookingRef]– RoomRequest ObjectId (for type="booking")
 * @param {Array}    [opts.messRecords]– MessRecord ObjectIds (for type="mess")
 * @returns {Promise<import("mongoose").Document>} saved Challan document
 */
export async function createChallanInternal({
    student,
    month,
    items,
    dueDate,
    createdBy,
    type = "monthly",
    bookingRef = null,
    messRecords = [],
}) {
    const totalAmount = items.reduce((s, i) => s + Number(i.amount), 0);
    const challanId   = await generateChallanId();

    const challan = await Challan.create({
        challanId,
        student,
        month,
        items,
        totalAmount,
        dueDate,
        createdBy,
        type,
        bookingRef,
        messRecords,
    });

    return challan;
}
