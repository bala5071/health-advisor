import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { sttProvider, STTState } from '../voice/STTProvider';

export default function TranscriptDisplay() {
  const theme = useTheme();
  const [state, setState] = useState<STTState>(sttProvider.getState());

  useEffect(() => {
    return sttProvider.subscribe(setState);
  }, []);

  const shown = state.finalTranscript || state.partialTranscript;

  return (
    <View style={[styles.wrap, { borderColor: theme.shadow }]}> 
      <Text style={[styles.label, { color: theme.text }]}>Transcript</Text>
      <Text style={[styles.status, { color: theme.text }]}>
        {state.isListening ? 'Listening…' : 'Not listening'}
        {state.backend ? ` (${state.backend})` : ''}
      </Text>
      {state.error ? <Text style={[styles.error, { color: theme.danger }]}>{String(state.error)}</Text> : null}
      <Text style={[styles.text, { color: theme.text, opacity: shown ? 1 : 0.6 }]}>
        {shown || 'Tap the mic and ask a question.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    opacity: 0.85,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
  },
  error: {
    fontSize: 12,
    fontWeight: '800',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
});
