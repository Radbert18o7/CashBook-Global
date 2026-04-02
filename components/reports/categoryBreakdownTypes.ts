import type { CategorySlice } from '@/utils/aggregateByCategory';

export type CategoryPieDatum = {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
};

export type CategoryBreakdownVisualizationProps = {
  categorySlices: CategorySlice[];
  pieData: CategoryPieDatum[];
  totalCategoryOut: number;
  chartWidth: number;
  formatMoney: (amount: number, currency?: string) => string;
  currency: string;
};
