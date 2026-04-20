// screens/AfterHoursNotificationsScreen.js
import { useState } from "react";
import { FlatList, StyleSheet, Switch, View } from "react-native";
import Input from "../components/Input";
import LongTextButton from "../components/LongTextButton";
import Typography from "../components/Typography";

// Simplified: monitor time and show sample "not entered" logs.
export default function AfterHoursNotificationsScreen() {
  const [cutoff, setCutoff] = useState("04:30 PM");
  const [enabled, setEnabled] = useState(true);
  const [logs, setLogs] = useState([
    { id: "1", when: "Today, 04:35 PM", level: "High", text: "User Ali (Room B-203) has not entered the hostel." },
    { id: "2", when: "Yesterday, 04:40 PM", level: "Medium", text: "User Sana (Room A-109) has not entered the hostel." },
  ]);

  const testNow = () => {
    setLogs([
      { id: Date.now().toString(), when: "Just now", level: "High", text: "User (Name, Room) has not entered the hostel." },
      ...logs,
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Typography variant="subheading">After-Hours Alert</Typography>
        <Typography variant="caption">{item.when}</Typography>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
        <Badge text={item.level} color={item.level === "High" ? "#DC2626" : "#F59E0B"} />
        <Badge text="Attendance" color="#6366F1" light />
      </View>
      <Typography variant="body">{item.text}</Typography>
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1 }}
      ListHeaderComponent={
        <View style={{ padding: 16 }}>
          <Typography variant="heading" style={{ textAlign: "center" }}>After-Hours Notification</Typography>
          <Typography variant="caption" style={{ textAlign: "center", marginBottom: 14 }}>
            Monitors attendance daily and notifies the warden at the specified time.
          </Typography>

          <View style={styles.box}>
            <Typography variant="subheading" style={{ marginBottom: 10 }}>Settings</Typography>
            <Input label="Cutoff Time" placeholder="04:30 PM" value={cutoff} onChangeText={setCutoff} />
            <View style={styles.rowBetween}>
              <Typography variant="body">Enable Notifications</Typography>
              <Switch value={enabled} onValueChange={setEnabled} />
            </View>
            <LongTextButton text="Send Test Alert" onPress={testNow} style={{ marginTop: 8 }} />
          </View>

          <Typography variant="subheading" style={{ marginTop: 12, marginBottom: 6 }}>Alert History</Typography>
        </View>
      }
      contentContainerStyle={{ padding: 16, paddingTop: 0 }}
      data={logs}
      keyExtractor={(it) => it.id}
      renderItem={renderItem}
    />
  );
}

function Badge({ text, color, light }) {
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16,
      backgroundColor: light ? "#EEF2FF" : color,
    }}>
      <Typography variant="small" style={{ color: light ? "#1D4ED8" : "#fff" }}>{text}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E5E7EB", marginBottom: 10 },
});
