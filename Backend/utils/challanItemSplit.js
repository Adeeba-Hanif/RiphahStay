/**
 * Split monthly challan line items into room vs mess using descriptions
 * produced by generateMonthlyChallans (Room Rent… / Mess – …).
 */
export function summarizeChallanLineItems(items = []) {
    let roomSubtotal = 0;
    let messSubtotal = 0;
    for (const it of items) {
        const desc = String(it.description || "").trim();
        const amt = Number(it.amount) || 0;
        if (desc.startsWith("Room Rent")) roomSubtotal += amt;
        else if (desc.startsWith("Mess –") || desc.startsWith("Mess -")) messSubtotal += amt;
    }
    return { roomSubtotal, messSubtotal };
}
