const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

/**
 * Parse strings like "April 2026" into a stable local month range.
 * @param {string} monthStr
 * @returns {{ monthStart: Date, monthEnd: Date, label: string } | null}
 */
export function parseBillingMonth(monthStr) {
    const trimmed = String(monthStr || "").trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return null;

    const year = parseInt(parts[parts.length - 1], 10);
    const monthName = parts.slice(0, -1).join(" ");
    if (Number.isNaN(year)) return null;

    const monthIndex = MONTH_NAMES.findIndex(
        (m) => m.toLowerCase() === monthName.toLowerCase()
    );
    if (monthIndex === -1) return null;

    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    const label = `${MONTH_NAMES[monthIndex]} ${year}`;
    return { monthStart, monthEnd, label };
}

/** e.g. "April 2026" for today — use with parseBillingMonth */
export function getMonthLabelForDate(d = new Date()) {
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
