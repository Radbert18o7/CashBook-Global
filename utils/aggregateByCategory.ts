import type { Entry } from '@/utils/models';

export type CategorySlice = { name: string; amount: number; color: string };

const CHART_COLORS = [
  '#4F46E5',
  '#10B981',
  '#F59E0B',
  '#F43F5E',
  '#06B6D4',
  '#8B5CF6',
  '#EC4899',
  '#84CC16',
  '#64748B',
];

/**
 * Sums absolute cash-out per category label for charts (entries should already be date-filtered).
 */
export function aggregateCashOutByCategory(entries: Entry[]): CategorySlice[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== 'CASH_OUT') continue;
    const name = (e.category_name ?? 'Other').trim() || 'Other';
    map.set(name, (map.get(name) ?? 0) + (e.amount ?? 0));
  }
  const list = [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  return list.map((x, i) => ({
    ...x,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
}
