import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { SyncManager, SyncStatus } from '../supabase/sync/SyncManager';

interface SyncStatusIndicatorProps {
  suppressErrorState?: boolean;
}

export default function SyncStatusIndicator({ suppressErrorState = false }: SyncStatusIndicatorProps) {
  const theme = useTheme();
  const [status, setStatus] = useState<SyncStatus>(SyncManager.getStatus());

  useEffect(() => {
    return SyncManager.subscribe(setStatus);
  }, []);

  const displayState = suppressErrorState && status.state === 'error' ? 'idle' : status.state;

  const label =
    displayState === 'syncing'
      ? 'Syncing'
      : displayState === 'error'
        ? 'Sync Error'
        : 'Synced';

  const color =
    displayState === 'syncing'
      ? theme.secondary
      : displayState === 'error'
        ? theme.danger
        : theme.primary;

  return (
    <View style={[styles.wrap, { borderColor: theme.shadow }]}> 
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
});
