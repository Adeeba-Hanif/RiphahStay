import { StyleSheet, View, Text, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const BRAND = "#4F46E5";

export default function ScreenHeader({
    title = "",
    showBack = false,
    onBack,
    right = null,
    bg = BRAND,
    tint = "#fff",
}) {
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={["top"]}>
            <View style={styles.inner}>
                {/* Left: back button */}
                <View style={styles.side}>
                    {showBack && (
                        <TouchableOpacity
                            onPress={onBack}
                            style={styles.backBtn}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="chevron-back" color={tint} size={24} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Center: title */}
                <View style={styles.center}>
                    <Text style={[styles.title, { color: tint }]} numberOfLines={1}>
                        {title}
                    </Text>
                </View>

                {/* Right: slot */}
                <View style={[styles.side, { alignItems: "flex-end" }]}>
                    {right}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: BRAND,
    },
    inner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 14,
        minHeight: 56,
    },
    side: {
        width: 44,
        alignItems: "flex-start",
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center",
        justifyContent: "center",
    },
    center: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 4,
    },
    title: {
        fontSize: 17,
        fontWeight: "700",
        color: "#fff",
        letterSpacing: 0.2,
    },
});
