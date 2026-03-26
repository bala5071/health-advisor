import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { voiceManager } from '../voice/VoiceManager';

export default function VoiceButton({ textToSpeak }: { textToSpeak: string }) {
  const theme = useTheme();
  const [speaking, setSpeaking] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return voiceManager.subscribe((s) => setSpeaking(Boolean(s.isSpeaking)));
  }, []);

  useEffect(() => {
    if (!speaking) {
      anim.stopAnimation();
      anim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [anim, speaking]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  const label = useMemo(() => (speaking ? 'Stop Voice' : 'Play Voice'), [speaking]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: speaking ? theme.danger : theme.primary }]}
        onPress={() => voiceManager.toggle(textToSpeak)}
      >
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: '#fff', opacity: speaking ? 1 : 0.8 }]} />
          <Text style={styles.text}>{label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
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
    fontWeight: '900',
  },
});
