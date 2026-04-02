import { PieChart } from 'react-native-chart-kit';

import type { CategoryBreakdownVisualizationProps } from './categoryBreakdownTypes';

/** Native (iOS/Android): pie chart. Web uses `CategoryBreakdownVisualization.web.tsx` so `react-native-chart-kit` is not loaded on web. */
export default function CategoryBreakdownVisualization({ pieData, chartWidth }: CategoryBreakdownVisualizationProps) {
  return (
    <PieChart
      data={pieData}
      width={chartWidth}
      height={220}
      chartConfig={{
        color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
      }}
      accessor="population"
      backgroundColor="transparent"
      paddingLeft="0"
      absolute
    />
  );
}
