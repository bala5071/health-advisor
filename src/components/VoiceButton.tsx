import React, { useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { voiceManager } from '../voice/VoiceManager';

export default function VoiceButton({ textToSpeak }: { textToSpeak: string }) {
  const theme = useTheme();
  const [speaking, setSpeaking] = useState(false);
  const pulse = useSharedValue(0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    return voiceManager.subscribe((s) => setSpeaking(Boolean(s.isSpeaking)));
  }, []);

  useEffect(() => {
    if (!speaking) {
      pulse.value = withTiming(0, { duration: 120 });
      return;
    }

    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 450, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [pulse, speaking]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * interpolate(pulse.value, [0, 1], [1, 1.06]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.75, 1]),
  }));

  const label = useMemo(() => (speaking ? 'Stop Voice' : 'Play Voice'), [speaking]);

  const handlePress = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Haptics = require('expo-haptics');
      Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } catch {
      // no-op
    }
    voiceManager.toggle(textToSpeak);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: speaking ? theme.danger : theme.primary }]}
        onPress={handlePress}
        onPressIn={() => {
          pressScale.value = withSpring(0.97, { damping: 20, stiffness: 240 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 16, stiffness: 220 });
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Plays or stops spoken explanation"
      >
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: '#fff', opacity: speaking ? 1 : 0.8 }]} />
          <Text allowFontScaling style={styles.text}>{label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
  },
});
