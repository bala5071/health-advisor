import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '../common/Card';
import { useTheme } from '../../theme/useTheme';

export type NutritionLike = Record<string, any>;

const fmt = (n: any, digits = 0) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const d = digits;
  return n.toFixed(d);
};

const pick = (obj: NutritionLike, keys: string[]) => {
  for (const k of keys) {
    if (obj && typeof obj[k] === 'number' && Number.isFinite(obj[k])) return obj[k];
  }
  return undefined;
};

export default function NutritionLabel({
  nutrition,
  comparisons,
}: {
  nutrition: NutritionLike | null | undefined;
  comparisons?: Array<{ nutrient: string; percentDV: number }> | null;
}) {
  const theme = useTheme();

  const rows = useMemo(() => {
    const n = nutrition || {};

    const calories = pick(n, ['caloriesKcal', 'calories']);
    const fat = pick(n, ['totalFatG', 'fat']);
    const satFat = pick(n, ['saturatedFatG', 'saturatedFat']);
    const sodium = pick(n, ['sodiumMg', 'sodium']);
    const carbs = pick(n, ['totalCarbsG', 'carbohydrates', 'carbs']);
    const fiber = pick(n, ['fiberG', 'fiber']);
    const sugar = pick(n, ['totalSugarsG', 'sugar', 'sugars']);
    const protein = pick(n, ['proteinG', 'protein']);

    return [
      { label: 'Calories', value: calories != null ? `${fmt(calories, 0)} kcal` : null, dvKey: 'calories' },
      { label: 'Total Fat', value: fat != null ? `${fmt(fat, 1)} g` : null, dvKey: 'fat' },
      { label: 'Saturated Fat', value: satFat != null ? `${fmt(satFat, 1)} g` : null, dvKey: 'saturated_fat' },
      { label: 'Sodium', value: sodium != null ? `${fmt(sodium, 0)} mg` : null, dvKey: 'sodium' },
      { label: 'Total Carbohydrate', value: carbs != null ? `${fmt(carbs, 1)} g` : null, dvKey: 'carbohydrate' },
      { label: 'Dietary Fiber', value: fiber != null ? `${fmt(fiber, 1)} g` : null, dvKey: 'fiber' },
      { label: 'Total Sugars', value: sugar != null ? `${fmt(sugar, 1)} g` : null, dvKey: 'sugars' },
      { label: 'Protein', value: protein != null ? `${fmt(protein, 1)} g` : null, dvKey: 'protein' },
    ].filter((r) => r.value != null);
  }, [nutrition]);

  const percentFor = (dvKey: string): number | null => {
    if (!comparisons) return null;
    const match = comparisons.find((c) => String(c.nutrient) === dvKey);
    if (!match || typeof match.percentDV !== 'number') return null;
    return match.percentDV;
  };

  return (
    <Card>
      <Text allowFontScaling style={[styles.header, { color: theme.text }]}>Nutrition</Text>
      <View style={styles.list}>
        {rows.length === 0 ? (
          <Text allowFontScaling style={[styles.empty, { color: theme.text }]}>No nutrition facts available.</Text>
        ) : (
          rows.map((r) => {
            const pct = percentFor(r.dvKey);
            const safePct = Math.max(0, Math.min(100, typeof pct === 'number' ? pct : 0));
            const levelColor = safePct > 40 ? theme.avoid : safePct >= 20 ? theme.caution : theme.approved;
            return (
              <View key={r.label} style={styles.row}>
                <View style={styles.rowTop}>
                  <Text allowFontScaling style={[styles.label, { color: theme.text }]} numberOfLines={1}>{r.label}</Text>
                  <Text allowFontScaling style={[styles.value, { color: theme.text }]}>{r.value}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${safePct}%`, backgroundColor: levelColor }]} />
                </View>
                <Text allowFontScaling style={[styles.dv, { color: theme.textSecondary }]}>{pct != null ? `${pct}% DV` : 'DV n/a'}</Text>
              </View>
            );
          })
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  row: {
    gap: 6,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 23,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.12)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  dv: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
    opacity: 0.9,
  },
  empty: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
    opacity: 0.75,
  },
});
