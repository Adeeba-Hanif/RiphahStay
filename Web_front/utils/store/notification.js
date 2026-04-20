import { create } from "zustand";
import axios from "axios";
import { API_BASE_URL } from "../utils/apiBase";

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Simple fetch function
  fetchNotifications: async (token) => {
    if (!token) return;
    try {
      set({ loading: true });

      const res = await axios.get(
        `${API_BASE_URL}/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = res.data?.notifications || [];

      // Sort unread first
      const sorted = data.sort((a, b) => Number(a.isRead) - Number(b.isRead));
      const unreadCount = sorted.filter((n) => !n.isRead).length;

      set({
        notifications: sorted,
        unreadCount,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error("fetchNotifications error:", err.message);
      set({
        loading: false,
        error: err.response?.data?.message || "Failed to fetch notifications",
      });
    }
  },
}));
