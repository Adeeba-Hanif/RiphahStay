import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import Layout from "../components/Layout";
import { useAuthContext } from "../context";
import { useNotificationStore } from "../store/notification";

export default function Notifications() {
  const { token } = useAuthContext();
  const {
    notifications,
    loading,
    fetchNotifications,
  } = useNotificationStore();

  useEffect(() => {
    if (token) fetchNotifications(token);
  }, [token]);

  const iconForType = (type) => {
    switch (type) {
      case "alert":
        return <Feather name="alert-triangle" size={20} color="#DC2626" />;
      case "system":
        return <Feather name="settings" size={20} color="#2563EB" />;
      case "info":
        return <Feather name="info" size={20} color="#10B981" />;
      default:
        return <Feather name="bell" size={20} color="#F59E0B" />;
    }
  };

  const formatDate = (iso) => {
    const date = new Date(iso);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Layout title="Notifications" showBack scroll>
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 30 }} />
      </Layout>
    );
  }

  if (!notifications?.length) {
    return (
      <Layout title="Notifications" showBack scroll>
        <Text style={styles.emptyText}>No notifications found.</Text>
      </Layout>
    );
  }

  return (
    <Layout title="Notifications" showBack scroll>
      {notifications.map((notif) => (
        <TouchableOpacity
          key={notif._id}
          style={[
            styles.card,
            !notif.isRead && { backgroundColor: "#EEF2FF" },
          ]}
        >
          <View style={styles.iconContainer}>{iconForType(notif.type)}</View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{notif.title || "Notification"}</Text>
            <Text style={styles.message}>{notif.text}</Text>

            <View style={styles.row}>
              <Text style={styles.type}>{notif.type.toUpperCase()}</Text>
              <Text style={styles.date}>{formatDate(notif.createdAt)}</Text>
            </View>
          </View>

          {!notif.isRead && <View style={styles.dot} />}
        </TouchableOpacity>
      ))}
    </Layout>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    textAlign: "center",
    marginTop: 30,
    color: "#6B7280",
    fontStyle: "italic",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#FFF",
  },
  iconContainer: {
    marginRight: 10,
    marginTop: 3,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  message: {
    fontSize: 13,
    color: "#374151",
    marginVertical: 4,
  },
  type: {
    fontSize: 11,
    color: "#6B7280",
  },
  date: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563EB",
    marginLeft: 8,
    marginTop: 4,
  },
});
