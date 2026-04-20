/** Keys must match `user.model.js` messChoices schema */
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/**
 * Deep-merge incoming mess choice updates per day so partial updates
 * (e.g. toggling one meal on Services) do not wipe other meals for that day.
 * @param {object|null|undefined} existing
 * @param {object|null|undefined} incoming
 */
export function mergeMessChoices(existing, incoming) {
    if (!incoming || typeof incoming !== "object") {
        return existing?.toObject?.() ?? existing ?? {};
    }
    const e = existing?.toObject?.() ?? existing ?? {};
    const out = { ...e };
    for (const day of DAY_KEYS) {
        if (
            Object.prototype.hasOwnProperty.call(incoming, day) &&
            incoming[day] != null &&
            typeof incoming[day] === "object"
        ) {
            const prevDay = e[day] && typeof e[day] === "object" ? e[day] : {};
            out[day] = { ...prevDay, ...incoming[day] };
        }
    }
    return out;
}
