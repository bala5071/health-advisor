import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/useTheme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  accessibilityLabel,
  accessibilityHint,
  disabled,
}: ButtonProps) {
  const theme = useTheme();

  const variantStyles = {
    primary: {
      backgroundColor: theme.primary,
      textColor: "#FFFFFF",
    },
    secondary: {
      backgroundColor: theme.secondary,
      textColor: "#FFFFFF",
    },
    danger: {
      backgroundColor: theme.danger,
      textColor: "#FFFFFF",
    },
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: variantStyles[variant].backgroundColor },
        disabled ? styles.disabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={disabled ? { disabled: true } : undefined}
    >
      <Text style={[styles.text, { color: variantStyles[variant].textColor }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
});
