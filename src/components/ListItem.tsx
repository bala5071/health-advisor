import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/useTheme';

let SwipeableView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SwipeableView = require('react-native-gesture-handler')?.Swipeable ?? null;
} catch {
  SwipeableView = null;
}

interface ListItemProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function ListItem({ item, onEdit, onDelete }: ListItemProps) {
  const theme = useTheme();

  const actionButton = (label: string, onPress: () => void, variant: 'secondary' | 'danger') => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${String(item?.name ?? 'item')}`}
      accessibilityHint={label === 'Edit' ? 'Opens edit controls' : 'Deletes this item'}
      style={[
        styles.action,
        {
          backgroundColor: variant === 'danger' ? theme.danger : theme.secondary,
        },
      ]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );

  const row = (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.border,
          backgroundColor: theme.background,
        },
      ]}
    >
      <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
      <View style={styles.buttons}>
        {actionButton('Edit', () => onEdit(item), 'secondary')}
        {actionButton('Delete', () => onDelete(item), 'danger')}
      </View>
    </View>
  );

  if (SwipeableView) {
    return (
      <SwipeableView
        renderRightActions={() => (
          <Pressable
            onPress={() => onDelete(item)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${String(item?.name ?? 'item')}`}
            style={[styles.swipeDelete, { backgroundColor: theme.danger }]}
          >
            <Text allowFontScaling style={styles.swipeDeleteText}>Delete</Text>
          </Pressable>
        )}
        overshootRight={false}
      >
        {row}
      </SwipeableView>
    );
  }

  return row;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  action: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 62,
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  swipeDelete: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 92,
    marginTop: 8,
    borderRadius: 12,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
});
