import { ChartProps, getMetricLabel } from '@superset-ui/core';

type RawFieldOption =
  | string
  | {
      label?: string;
      value?: string;
      column_name?: string;
      optionName?: string;
      verbose_name?: string;
      sqlExpression?: string;
      expression?: string;
      [key: string]: any;
    };

function parseArray(value: unknown): RawFieldOption[] {
  if (Array.isArray(value)) return value.filter(Boolean) as RawFieldOption[];
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
  queryKey: string;
  label: string;
  candidates?: string[];
  queryField?: RawFieldOption;
};

type MetricDef = {
  key: string;
  label: string;
  candidates?: string[];
};

type ConditionalFormattingRule = {
  column?: string;
  operator?: string;
  targetValue?: number;
  targetValueLeft?: number;
  targetValueRight?: number;
  colorScheme?: string;
};

type MetricSummarySqlRule = {
  metric?: string;
  subtotalSql?: string;
  totalSql?: string;
};

function compactString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function compactColor(value: unknown, fallback?: string): string | undefined {
  const resolved = compactString(value);
  return resolved ?? fallback;
}

function getFieldLabel(field: RawFieldOption): string {
  if (typeof field === 'string') return field;

  return (
    compactString(field.label) ||
    compactString(field.verbose_name) ||
    compactString(field.value) ||
    compactString(field.column_name) ||
    compactString(field.optionName) ||
    compactString(field.sqlExpression) ||
    compactString(field.expression) ||
    JSON.stringify(field)
  );
}

function getFieldCandidates(field: RawFieldOption): string[] {
  if (typeof field === 'string') return [field];

  return [
    compactString(field.column_name),
    compactString(field.sqlExpression),
    compactString(field.expression),
    compactString(field.value),
    compactString(field.optionName),
    compactString(field.label),
    compactString(field.verbose_name),
  ].filter((candidate): candidate is string => Boolean(candidate));
}

function buildFieldDef(field: RawFieldOption, dataColumnNames: string[]): FieldDef {
  const candidates = getFieldCandidates(field);
  const matchedKey = candidates.find(candidate => dataColumnNames.includes(candidate));
  const fallbackKey = candidates[0] ?? getFieldLabel(field);
  const queryKey = candidates[0] ?? matchedKey ?? fallbackKey;

  return {
    key: matchedKey ?? fallbackKey,
    queryKey,
    label: getFieldLabel(field),
    candidates,
    queryField: field,
  };
}

function getMetricCandidates(metric: any): string[] {
  if (typeof metric === 'string') return [metric];

  return [
    compactString(metric?.label),
    compactString(metric?.metric_name),
    compactString(metric?.optionName),
    compactString(metric?.column?.column_name),
    compactString(metric?.column?.verbose_name),
    compactString(metric?.column_name),
    compactString(metric?.value),
    compactString(metric?.expression),
    compactString(metric?.sqlExpression),
  ].filter((candidate): candidate is string => Boolean(candidate));
}

function buildMetricDef(metric: any, dataColumnNames: string[]): MetricDef {
  const candidates = getMetricCandidates(metric);
  const matchedKey = candidates.find(candidate => dataColumnNames.includes(candidate));
  const label = typeof metric === 'string' ? metric : getMetricLabel(metric);

  return {
    key: matchedKey ?? candidates[0] ?? label,
    label,
    candidates,
  };
}

export default function transformProps(chartProps: ChartProps) {
  const { width, height, formData, queriesData } = chartProps;
  const rawRecords = queriesData[0]?.data || [];

  const groupbyRowsRaw = parseArray((formData as any).groupbyRows);
  const groupbyColumnsRaw = parseArray((formData as any).groupbyColumns);
  const selectableDimensionsRaw = parseArray((formData as any).selectableDimensions);

  const dataColumnNames: string[] = Array.isArray((queriesData[0] as any)?.colnames)
    ? ((queriesData[0] as any).colnames as unknown[]).map(String)
    : Object.keys(rawRecords[0] || {});

  const metricsRaw = (Array.isArray((formData as any).metrics)
    ? (formData as any).metrics
    : [(formData as any).metrics]
  ).filter(Boolean);
  const selectableMetricsRaw = (Array.isArray((formData as any).selectableMetrics)
    ? (formData as any).selectableMetrics
    : [(formData as any).selectableMetrics]
  ).filter(Boolean);

  const rows = groupbyRowsRaw.map(field => buildFieldDef(field, dataColumnNames));
  const columns = groupbyColumnsRaw.map(field => buildFieldDef(field, dataColumnNames));
  const selectableDimensions = Array.from(
    new Map(
      [...selectableDimensionsRaw, ...groupbyRowsRaw, ...groupbyColumnsRaw].map(field => {
        const resolved = buildFieldDef(field, dataColumnNames);
        return [resolved.key, resolved] as const;
      }),
    ).values(),
  );

  const defaultMetrics: MetricDef[] = metricsRaw.map(metric => buildMetricDef(metric, dataColumnNames));
  const selectableMetrics: MetricDef[] = selectableMetricsRaw.map(metric =>
    buildMetricDef(metric, dataColumnNames),
  );
  const metrics = Array.from(
    new Map(
      [...defaultMetrics, ...selectableMetrics].map(metric => [metric.key, metric] as const),
    ).values(),
  );
  const defaultMetricKeys = defaultMetrics.map(metric => metric.key);

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
    formData,
    rows,
    columns,
    metrics,
    defaultMetricKeys,
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
    headerBg: compactColor((formData as any).headerBg),
    headerTextColor: compactColor((formData as any).headerTextColor),
    grandTotalBg: compactColor((formData as any).grandTotalBg),
    expandColor: compactColor((formData as any).expandColor),
    subtotalBg: compactColor((formData as any).subtotalBg),
    cellTextColor: compactColor((formData as any).cellTextColor),
    heatmapPositiveColor: compactColor((formData as any).heatmapPositiveColor),
    heatmapNegativeColor: compactColor((formData as any).heatmapNegativeColor),
    barPositiveColor: compactColor((formData as any).barPositiveColor),
    barNegativeColor: compactColor((formData as any).barNegativeColor),
    conditionalFormatting: Array.isArray((formData as any).conditional_formatting)
      ? ((formData as any).conditional_formatting as ConditionalFormattingRule[])
      : [],
    metricSummarySql: Array.isArray((formData as any).metricSummarySql)
      ? ((formData as any).metricSummarySql as MetricSummarySqlRule[])
      : [],
  };
}
