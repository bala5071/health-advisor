import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { useHealthProfile } from '../../src/hooks/useHealthProfile';
import Card from '../../src/components/common/Card';

type CriticalAllergy = {
  id: string;
  name: string;
  severity: string;
  notes?: string | null;
};

const toSeverityKey = (raw: any) => String(raw || '').toLowerCase().trim();

const isCriticalSeverity = (raw: any) => {
  const s = toSeverityKey(raw);
  return s === 'severe' || s === 'high' || s === 'anaphylaxis' || s === 'anaphylactic';
};

export default function EmergencyScreen() {
  const theme = useTheme();
  const { dbAvailable, allergies } = useHealthProfile();

  const critical = useMemo(() => {
    const rows = (allergies || []) as any[];
    return rows
      .filter((a) => isCriticalSeverity(a?.severity))
      .map(
        (a) =>
          ({
            id: String(a?.id ?? ''),
            name: String(a?.name ?? ''),
            severity: String(a?.severity ?? ''),
            notes: a?.notes != null ? String(a?.notes) : null,
          }) as CriticalAllergy,
      )
      .filter((a) => a.id && a.name);
  }, [allergies]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Emergency' }} />

      <Text
        style={[styles.title, { color: theme.text }]}
        accessibilityRole="header"
        accessibilityLabel="Emergency Mode"
      >
        Emergency Mode
      </Text>

      <Card>
        <Text style={[styles.info, { color: theme.text }]}>
          This screen shows a read-only list of your critical allergies for quick access.
        </Text>
      </Card>

      {!dbAvailable ? (
        <Card>
          <Text style={[styles.info, { color: theme.text }]}>Local database is unavailable in this runtime.</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
          Critical Allergies
        </Text>

        {critical.length === 0 ? (
          <Text style={[styles.info, { color: theme.text }]}>No critical allergies found.</Text>
        ) : (
          critical.map((a) => (
            <View
              key={a.id}
              style={[styles.row, { borderBottomColor: theme.secondary }]}
              accessible
              accessibilityLabel={`Allergy ${a.name}. Severity ${a.severity}.`}
            >
              <Text style={[styles.name, { color: theme.text }]}>{a.name}</Text>
              <Text style={[styles.severity, { color: theme.danger }]}>Severity: {a.severity}</Text>
              {a.notes ? <Text style={[styles.notes, { color: theme.text }]}>{a.notes}</Text> : null}
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '900',
  },
  severity: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '900',
  },
  notes: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
});
