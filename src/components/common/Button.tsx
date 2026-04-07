import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/useTheme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  accessibilityLabel,
  accessibilityHint,
  disabled,
}: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const triggerLightHaptic = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Haptics = require('expo-haptics');
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } catch {
      // no-op
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyles = {
    primary: {
      backgroundColor: '#34C759',
      borderColor: '#34C759',
      textColor: '#FFFFFF',
    },
    secondary: {
      backgroundColor: '#FFFFFF',
      borderColor: '#34C759',
      textColor: '#34C759',
    },
    danger: {
      backgroundColor: '#FF3B30',
      borderColor: '#FF3B30',
      textColor: '#FFFFFF',
    },
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: variantStyles[variant].backgroundColor,
            borderColor: variantStyles[variant].borderColor,
          },
          disabled ? styles.disabled : null,
        ]}
        onPress={() => {
          if (variant === 'primary' && !disabled) triggerLightHaptic();
          onPress();
        }}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 20, stiffness: 250 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 220 });
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={disabled ? { disabled: true } : undefined}
      >
        <Text allowFontScaling style={[styles.text, theme.typography.body, { color: variantStyles[variant].textColor }]}>
          {title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 17,
    fontWeight: '600',
  },
});
