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
      <Text style={[styles.header, { color: theme.text }]}>Nutrition</Text>
      <View style={styles.table}>
        {rows.length === 0 ? (
          <Text style={[styles.empty, { color: theme.text }]}>No nutrition facts available.</Text>
        ) : (
          rows.map((r) => {
            const pct = percentFor(r.dvKey);
            return (
              <View key={r.label} style={[styles.row, { borderBottomColor: theme.shadow }]}> 
                <Text style={[styles.label, { color: theme.text }]}>{r.label}</Text>
                <View style={styles.valueWrap}>
                  <Text style={[styles.value, { color: theme.text }]}>{r.value}</Text>
                  {pct != null ? <Text style={[styles.dv, { color: theme.text }]}>{pct}% DV</Text> : null}
                </View>
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
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  table: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
  },
  dv: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
  },
  empty: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.75,
  },
});
