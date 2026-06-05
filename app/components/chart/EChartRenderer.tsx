'use client';

import { useRef, useEffect } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkPointComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkPointComponent,
  CanvasRenderer,
]);

interface EChartRendererProps {
  option: Record<string, unknown>;
  height?: string;
}

export function EChartRenderer({ option, height = '360px' }: EChartRendererProps) {
  const ref = useRef<ReactEChartsCore>(null);

  // Enforce no blue/purple colors
  const safeOption = {
    ...option,
    color: option.color || [
      '#ea580c',
      '#10b981',
      '#f59e0b',
      '#e11d48',
      '#84cc16',
      '#f97316',
      '#fbbf24',
      '#f43f5e',
      '#22c55e',
      '#fb923c',
    ],
  };

  return (
    <ReactEChartsCore
      ref={ref}
      echarts={echarts}
      option={safeOption}
      style={{ height, width: '100%' }}
      notMerge={true}
      lazyUpdate={true}
    />
  );
}
