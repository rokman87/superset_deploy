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

type FieldDef = {
  key: string;
  label: string;
};

type MetricDef = {
  key: string;
  label: string;
};

export default function transformProps(chartProps: ChartProps) {
  const { width, height, formData, queriesData } = chartProps;
  const rawRecords = queriesData[0]?.data || [];

  const groupbyRowsRaw = parseArray((formData as any).groupbyRows);
  const groupbyColumnsRaw = parseArray((formData as any).groupbyColumns);
  const selectableDimensionsRaw = parseArray((formData as any).selectableDimensions);

  const dataColumnNames: string[] = Array.isArray((queriesData[0] as any)?.colnames)
    ? ((queriesData[0] as any).colnames as unknown[]).map(String)
    : Object.keys(rawRecords[0] || {});

  const metricsRaw = (formData as any).metrics || [];
  const metricLabels: string[] = (Array.isArray(metricsRaw) ? metricsRaw : [metricsRaw])
    .filter(Boolean)
    .map((metric: any) => (typeof metric === 'string' ? metric : getMetricLabel(metric)));

  const dimensionCandidates = Array.from(
    new Set([...groupbyRowsRaw, ...groupbyColumnsRaw, ...selectableDimensionsRaw]),
  );

  const dimensionKeys = dimensionCandidates.filter(col => dataColumnNames.includes(col));

  const dimensionFields: FieldDef[] = dimensionKeys.map(key => ({
    key,
    label: key,
  }));

  const selectableDimensions = dimensionFields;

  const rows: FieldDef[] = groupbyRowsRaw
    .filter(col => dataColumnNames.includes(col))
    .map(key => ({
      key,
      label: key,
    }));

  const columns: FieldDef[] = groupbyColumnsRaw
    .filter(col => dataColumnNames.includes(col))
    .map(key => ({
      key,
      label: key,
    }));

  const dimensionSet = new Set(dimensionKeys);
  const metricKeys = dataColumnNames.filter(col => !dimensionSet.has(col));

  const metrics: MetricDef[] = metricKeys.map((key, index) => ({
    key,
    label: metricLabels[index] ?? key,
  }));

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

  const resolvedShowSidebar = parseBoolean(
    (formData as any).myfirst_show_sidebar ?? (formData as any).myfirstShowSidebar,
    true,
  );

  return {
    width,
    height,
    data: rawRecords,
    rows,
    columns,
    metrics,
    selectableDimensions,

    showSidebar: resolvedShowSidebar,
    myfirstShowSidebar: resolvedShowSidebar,

    showSubtotals: parseBoolean(
      (formData as any).showSubtotals ?? (formData as any).show_subtotals,
      true,
    ),
    showGrandTotals,
    showRowTotals,
    showColumnTotals,
    showCellBars: parseBoolean(
      (formData as any).showCellBars ?? (formData as any).show_cell_bars,
      true,
    ),
    showHeatmap: parseBoolean(
      (formData as any).showHeatmap ?? (formData as any).show_heatmap,
      true,
    ),
    compactDisplay: parseBoolean(
      (formData as any).compactDisplay ?? (formData as any).compact_display,
      false,
    ),
    defaultExpandDepth: Number(
      (formData as any).defaultExpandDepth ?? (formData as any).default_expand_depth ?? 0,
    ),
    numberFormatDigits: Number(
      (formData as any).numberFormatDigits ?? (formData as any).number_format_digits ?? 2,
    ),
    nullLabel: String((formData as any).nullLabel ?? (formData as any).null_label ?? '—'),
  };
}