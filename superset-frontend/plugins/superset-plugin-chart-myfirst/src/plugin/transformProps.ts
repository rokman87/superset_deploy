import { ChartProps, getMetricLabel } from '@superset-ui/core';

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function parseBoolean(value: unknown, defaultValue = true): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'off', 'no', 'null', 'undefined', ''].includes(normalized)) {
      return false;
    }
    if (['true', '1', 'on', 'yes'].includes(normalized)) {
      return true;
    }
  }
  return Boolean(value);
}

export default function transformProps(chartProps: ChartProps) {
  const { width, height, formData, queriesData } = chartProps;
  const rawRecords = queriesData[0]?.data || [];

  const groupbyRows = parseArray((formData as any).groupbyRows);
  const groupbyColumns = parseArray((formData as any).groupbyColumns);
  const selectableDimensionsRaw = parseArray((formData as any).selectableDimensions);
  const selectableDimensions = Array.from(
    new Set([...selectableDimensionsRaw, ...groupbyRows, ...groupbyColumns]),
  );

  const metricsRaw = (formData as any).metrics || [];
  const metrics: string[] = (Array.isArray(metricsRaw) ? metricsRaw : [metricsRaw])
    .filter(Boolean)
    .map((metric: any) => (typeof metric === 'string' ? metric : getMetricLabel(metric)));

  const enableTotalsCamel = (formData as any).enableTotals;
  const showRowTotalsCamel = (formData as any).showRowTotals;
  const showColumnTotalsCamel = (formData as any).showColumnTotals;

  const enableTotalsSnake = (formData as any).show_grand_totals;
  const showRowTotalsSnake = (formData as any).show_row_totals;
  const showColumnTotalsSnake = (formData as any).show_column_totals;

  const showGrandTotals =
    enableTotalsCamel !== undefined
      ? parseBoolean(enableTotalsCamel, true)
      : enableTotalsSnake !== undefined
        ? parseBoolean(enableTotalsSnake, true)
        : true;

  const showRowTotals =
    showGrandTotals &&
    (showRowTotalsCamel !== undefined
      ? parseBoolean(showRowTotalsCamel, true)
      : showRowTotalsSnake !== undefined
        ? parseBoolean(showRowTotalsSnake, true)
        : true);

  const showColumnTotals =
    showGrandTotals &&
    (showColumnTotalsCamel !== undefined
      ? parseBoolean(showColumnTotalsCamel, true)
      : showColumnTotalsSnake !== undefined
        ? parseBoolean(showColumnTotalsSnake, true)
        : true);

  return {
    width,
    height,
    data: rawRecords,
    rows: groupbyRows,
    columns: groupbyColumns,
    metrics,
    selectableDimensions,

    // Важно: прокидываем и camelCase, и snake_case для надёжности
    showSidebar: parseBoolean((formData as any).show_sidebar, true),
    show_sidebar: parseBoolean((formData as any).show_sidebar, true),

    showSubtotals: parseBoolean((formData as any).show_subtotals, true),
    showGrandTotals,
    showRowTotals,
    showColumnTotals,
    showCellBars: parseBoolean((formData as any).show_cell_bars, true),
    showHeatmap: parseBoolean((formData as any).show_heatmap, true),
    compactDisplay: parseBoolean((formData as any).compact_display, false),
    defaultExpandDepth: Number((formData as any).default_expand_depth ?? 0),
    numberFormatDigits: Number((formData as any).number_format_digits ?? 2),
    nullLabel: String((formData as any).null_label || '—'),
  };
}