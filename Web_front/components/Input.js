import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Input({
  label = "Label",
  placeholder = "Type here...",
  type = "text", // 'text' | 'email' | 'number' | 'password' | 'fullname' | 'phone' | 'sapid' | 'room' | 'multiline'
  value,
  onChangeText,
  style,
  inputStyle,
  labelStyle,
  multiline = false,
  ...rest
}) {
  const isPassword = type === "password";
  const [secure, setSecure] = useState(isPassword);
  const [focused, setFocused] = useState(false);

  let keyboardType = "default";
  let autoCapitalize = "sentences";

  // Apply sensible defaults per type
  switch (type) {
    case "email":
      keyboardType = "email-address";
      autoCapitalize = "none";
      break;
    case "number":
    case "sapid":
      keyboardType = "numeric";
      autoCapitalize = "none";
      break;
    case "phone":
      keyboardType = "phone-pad";
      autoCapitalize = "none";
      break;
    case "fullname":
      keyboardType = "default";
      autoCapitalize = "words";
      break;
    case "room":
      keyboardType = "default";
      autoCapitalize = "characters";
      break;
    case "password":
      keyboardType = "default";
      autoCapitalize = "none";
      break;
  }

  // Left icons per type
  const leftIconName =
    type === "email"
      ? "mail-outline"
      : type === "password"
        ? "lock-closed-outline"
        : type === "phone"
          ? "call-outline"
          : type === "fullname"
            ? "person-outline"
            : type === "sapid"
              ? "school-outline"
              : type === "room"
                ? "home-outline"
                : type === "number"
                  ? "keypad-outline"
                  : "create-outline";

  const borderColor = focused ? "#4F46E5" : "#E5E7EB";
  const iconColor = focused ? "#4F46E5" : "#9CA3AF";

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

      <View
        style={[
          styles.row,
          {
            borderColor,
            shadowColor: focused ? "#2563EB" : "#000",
            shadowOpacity: focused ? 0.12 : 0.06,
          },
        ]}
      >
        {/* Left icon */}
        <Ionicons
          name={leftIconName}
          size={20}
          color={iconColor}
          style={styles.leftIcon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        <TextInput
          style={[
            styles.input,
            multiline && { height: 100, textAlignVertical: "top" },
            inputStyle,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword ? secure : false}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {/* Password toggle */}
        {isPassword && (
          <TouchableOpacity
            onPress={() => setSecure(!secure)}
            style={styles.eyeBtn}
            accessibilityRole="button"
            accessibilityLabel={secure ? "Show password" : "Hide password"}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name={secure ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 8,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: { shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 1.5 },
    }),
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 8,
  },
});
