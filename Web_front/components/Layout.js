import React from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenHeader from "./ScreenHeader";
import { SafeAreaView } from "react-native-safe-area-context";

const BG   = "#F5F7FA";
const BRAND = "#4F46E5";

export default function Layout({
    title = "",
    showBack,
    right = null,
    noHeader = false,
    scroll = false,
    contentStyle,
    headerBg = BRAND,
    headerTint = "#fff",
    align = "top",
    children,
}) {
    const navigation = useNavigation();
    const canGoBack = navigation?.canGoBack?.() ?? false;
    const alignmentStyles =
        ({
            top: { justifyContent: "flex-start" },
            center: { justifyContent: "center" },
            bottom: { justifyContent: "flex-end" },
        }[align] || {});

    return (
        <View style={styles.safe}>
            <StatusBar
                barStyle="dark-content"
                translucent={Platform.OS === "android"}
                backgroundColor="transparent"
            />

            {!noHeader && (
                <ScreenHeader
                    title={title}
                    showBack={showBack ?? canGoBack}
                    onBack={() => navigation.goBack()}
                    right={right}
                    bg={headerBg}
                    tint={headerTint}
                />
            )}

            {/* KeyboardAvoidingView handles safe shifting */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
            >
                {scroll === false ? (
                    <View style={[styles.content, styles.noScrollContainer, alignmentStyles, contentStyle]}>
                        <SafeAreaView
                            style={styles.safeInner}
                            edges={["left", "right", "bottom"]}
                        >
                            {/* minHeight:0 lets nested ScrollView/FlatList shrink and scroll on Android */}
                            <View style={styles.flexMin}>{children}</View>
                        </SafeAreaView>
                    </View>
                ) : (
                    <ScrollView
                        style={[styles.content, contentStyle]}
                        contentContainerStyle={[styles.scrollContainer, alignmentStyles]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled
                    >
                        <SafeAreaView style={{ width: "100%" }} edges={["bottom"]}>{children}</SafeAreaView>
                    </ScrollView>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: BG,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        backgroundColor: BG,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    noScrollContainer: {
        flex: 1,
    },
    safeInner: {
        flex: 1,
        width: "100%",
        minHeight: 0,
    },
    flexMin: {
        flex: 1,
        minHeight: 0,
        width: "100%",
    },
});
