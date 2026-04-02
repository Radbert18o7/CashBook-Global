import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import type { CategoryBreakdownVisualizationProps } from './categoryBreakdownTypes';

/** Web/PWA: list + swatches only (avoids `react-native-chart-kit` / SVG runtime issues). */
export default function CategoryBreakdownVisualization({
  categorySlices,
  totalCategoryOut,
  formatMoney,
  currency,
}: CategoryBreakdownVisualizationProps) {
  return (
    <View style={styles.webLegend}>
      {categorySlices.map((s) => {
        const pct = totalCategoryOut > 0 ? Math.round((s.amount / totalCategoryOut) * 100) : 0;
        return (
          <View key={s.name} style={styles.webLegendRow}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <ThemedText style={styles.webLegendName}>{s.name}</ThemedText>
            <ThemedText style={styles.webLegendPct}>{pct}%</ThemedText>
            <ThemedText style={styles.webLegendAmt}>{formatMoney(s.amount, currency)}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  webLegend: { gap: 10, marginTop: 4 },
  webLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: { width: 14, height: 14, borderRadius: 3 },
  webLegendName: { flex: 1 },
  webLegendPct: { opacity: 0.8, width: 40, textAlign: 'right' },
  webLegendAmt: { fontWeight: '700', minWidth: 88, textAlign: 'right' },
});
