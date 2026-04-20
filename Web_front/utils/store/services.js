import { create } from "zustand";

const useServicesStore = create((set) => ({
    // backend → frontend
    transport: [],
    mealplan: [],
    wifi: [],
    laundry: [],
    ironing: [],

    setServices: ({ services = [], transports = [], messPlans = [] } = {}) =>
        set(() => ({
            transport: transports,
            mealplan: messPlans,
            wifi: services.filter((s) => s.type === "wifi"),
            laundry: services.filter((s) => s.type === "laundry"),
            ironing: services.filter((s) => s.type === "ironing"),
        })),

    reset: () =>
        set({
            transport: [],
            mealplan: [],
            wifi: [],
            laundry: [],
            ironing: [],
        }),
}));

export default useServicesStore;
