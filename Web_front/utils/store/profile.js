import { create } from "zustand";

export const useProfileStore = create((set) => ({
    profile: null,
    setProfile: (profile) => set({ profile }),
    clearProfile: () => set({ profile: null }),
}));
