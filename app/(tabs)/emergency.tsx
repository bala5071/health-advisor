import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { useHealthProfile } from '../../src/hooks/useHealthProfile';
import Card from '../../src/components/common/Card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 84 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Stack.Screen options={{ title: 'Emergency' }} />

      <Text
        allowFontScaling
        style={[styles.title, theme.typography.display, { color: theme.text }]}
        accessibilityRole="header"
        accessibilityLabel="Emergency Mode"
      >
        Emergency Mode
      </Text>

      <Card>
        <Text allowFontScaling style={[styles.info, { color: theme.text }]}>
          This screen shows a read-only list of your critical allergies for quick access.
        </Text>
      </Card>

      {!dbAvailable ? (
        <Card>
          <Text allowFontScaling style={[styles.info, { color: theme.text }]}>Local database is unavailable in this runtime.</Text>
        </Card>
      ) : null}

      <Card>
        <Text
          allowFontScaling
          style={[styles.sectionTitle, theme.typography.body, { color: theme.text }]}
          accessibilityRole="header"
        >
          Critical Allergies
        </Text>

        {critical.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text allowFontScaling style={[styles.emptyEmoji, { color: theme.textSecondary }]}>🛡️</Text>
            <Text allowFontScaling style={[styles.info, { color: theme.text }]}>No critical allergies found.</Text>
          </View>
        ) : (
          <View style={[styles.rowsWrap, isTablet && styles.rowsWrapTablet]}>
            {critical.map((a) => (
              <View
                key={a.id}
                style={[styles.row, isTablet && styles.rowTablet, { borderBottomColor: theme.secondary, backgroundColor: theme.surface }]}
                accessible
                accessibilityLabel={`Allergy ${a.name}. Severity ${a.severity}.`}
              >
                <Text allowFontScaling style={[styles.name, { color: theme.text }]}>{a.name}</Text>
                <Text allowFontScaling style={[styles.severity, { color: theme.danger }]}>Severity: {a.severity}</Text>
                {a.notes ? <Text allowFontScaling style={[styles.notes, { color: theme.text }]}>{a.notes}</Text> : null}
              </View>
            ))}
          </View>
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
    textAlign: 'left',
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 10,
  },
  info: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 4,
  },
  emptyEmoji: {
    fontSize: 34,
  },
  rowsWrap: {
    gap: 10,
  },
  rowsWrapTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  row: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rowTablet: {
    width: '48.5%',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
  },
  severity: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  notes: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
});
