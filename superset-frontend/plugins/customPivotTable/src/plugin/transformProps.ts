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
  queryMetric?: any;
  savedD3Format?: string;
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
  subtotalMode?: string;
  totalMode?: string;
  subtotalSql?: string;
  totalSql?: string;
};

type MetricFormatRule = {
  metric?: string;
  d3Format?: string;
};

type RowSqlFormatRule = {
  sqlExpression?: string;
  d3Format?: string;
};

function compactString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function rgbObjectToHex(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const rgb = value as {
    r?: unknown;
    g?: unknown;
    b?: unknown;
    a?: unknown;
  };

  if (
    typeof rgb.r !== 'number' ||
    typeof rgb.g !== 'number' ||
    typeof rgb.b !== 'number'
  ) {
    return undefined;
  }

  const toHex = (channel: number) => {
    const normalized = Math.max(0, Math.min(255, Math.round(channel)));
    return normalized.toString(16).padStart(2, '0');
  };

  const base = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  if (typeof rgb.a !== 'number' || rgb.a >= 1) {
    return base;
  }

  return `${base}${toHex(rgb.a * 255)}`;
}

function compactColor(value: unknown, fallback?: string): string | undefined {
  const resolved = compactString(value) ?? rgbObjectToHex(value);
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
    compactString(metric?.optionName),
    compactString(metric?.label),
    compactString(metric?.metric_name),
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
    queryMetric: metric,
    savedD3Format: compactString(metric?.d3format),
  };
}

export default function transformProps(chartProps: ChartProps) {
  const { width, height, formData, queriesData, rawFormData } = chartProps as ChartProps & {
    rawFormData?: Record<string, any>;
  };
  const ownState = (chartProps as any).ownState;
  const filterState = (chartProps as any).filterState;
  const rawRecords = queriesData[0]?.data || [];
  const effectiveFormData = {
    ...(rawFormData || formData || {}),
    ...(((rawFormData as any)?.extra_form_data || {}) as Record<string, any>),
    ...(((rawFormData as any)?.extraFormData || {}) as Record<string, any>),
    ...(formData || {}),
    ...(((formData as any)?.extra_form_data || {}) as Record<string, any>),
    ...(((formData as any)?.extraFormData || {}) as Record<string, any>),
  } as Record<string, any>;

  const groupbyRowsRaw = parseArray((effectiveFormData as any).groupbyRows);
  const groupbyColumnsRaw = parseArray((effectiveFormData as any).groupbyColumns);
  const selectableDimensionsRaw = parseArray((effectiveFormData as any).selectableDimensions);

  const dataColumnNames: string[] = Array.isArray((queriesData[0] as any)?.colnames)
    ? ((queriesData[0] as any).colnames as unknown[]).map(String)
    : Object.keys(rawRecords[0] || {});

  const metricsRaw = (Array.isArray((effectiveFormData as any).metrics)
    ? (effectiveFormData as any).metrics
    : [(effectiveFormData as any).metrics]
  ).filter(Boolean);
  const selectableMetricsRaw = (Array.isArray((effectiveFormData as any).selectableMetrics)
    ? (effectiveFormData as any).selectableMetrics
    : [(effectiveFormData as any).selectableMetrics]
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
    (effectiveFormData as any).custom_pivot_table_show_sidebar ??
      (effectiveFormData as any).customPivotTableShowSidebar,
    true,
  );
  const resolvedMetricSearch = parseBoolean(
    (effectiveFormData as any).custom_pivot_table_metric_search ??
      (effectiveFormData as any).customPivotTableMetricSearch,
    true,
  );
  const resolvedShowRuntimeQuery = parseBoolean(
    (effectiveFormData as any).custom_pivot_table_show_runtime_query ??
      (effectiveFormData as any).customPivotTableShowRuntimeQuery,
    false,
  );
  const resolvedSidebarWidthPercent = Number(
    (effectiveFormData as any).custom_pivot_table_sidebar_width_percent ??
      (effectiveFormData as any).customPivotTableSidebarWidthPercent ??
      24,
  );
  const resolvedColumnHeaderTiltPercent = Number(
    (effectiveFormData as any).column_header_tilt_percent ??
      (effectiveFormData as any).columnHeaderTiltPercent ??
      0,
  );

  return {
    width,
    height,
    data: rawRecords,
    formData: effectiveFormData,
    ownState,
    filterState,
    rows,
    columns,
    metrics,
    defaultMetricKeys,
    selectableDimensions,

    showSidebar: resolvedShowSidebar,
    customPivotTableShowSidebar: resolvedShowSidebar,
    showMetricSearch: resolvedMetricSearch,
    customPivotTableMetricSearch: resolvedMetricSearch,
    showRuntimeQuery: resolvedShowRuntimeQuery,
    customPivotTableShowRuntimeQuery: resolvedShowRuntimeQuery,
    sidebarWidthPercent: Number.isFinite(resolvedSidebarWidthPercent)
      ? resolvedSidebarWidthPercent
      : 24,
    customPivotTableSidebarWidthPercent: Number.isFinite(resolvedSidebarWidthPercent)
      ? resolvedSidebarWidthPercent
      : 24,

    showSubtotals: parseBoolean(
      (effectiveFormData as any).showSubtotals ?? (effectiveFormData as any).show_subtotals,
      true,
    ),
    showGrandTotals,
    showRowTotals,
    showColumnTotals,
    showCellBars: parseBoolean(
      (effectiveFormData as any).showCellBars ?? (effectiveFormData as any).show_cell_bars,
      true,
    ),
    showHeatmap: parseBoolean(
      (effectiveFormData as any).showHeatmap ?? (effectiveFormData as any).show_heatmap,
      true,
    ),
    compactDisplay: parseBoolean(
      (effectiveFormData as any).compactDisplay ??
        (effectiveFormData as any).compact_display,
      false,
    ),
    tableViewMode:
      compactString((effectiveFormData as any).table_view_mode) === 'classic'
        ? 'classic'
        : 'pivot',
    metricsLayout:
      compactString((effectiveFormData as any).metrics_layout) === 'rows'
        ? 'rows'
        : 'columns',
    showMetricsLayoutToggle: parseBoolean(
      (effectiveFormData as any).show_metrics_layout ??
        (effectiveFormData as any).showMetricsLayoutToggle,
      false,
    ),
    transposeTable: parseBoolean(
      (effectiveFormData as any).transpose_table ??
        (effectiveFormData as any).transposeTable,
      false,
    ),
    columnHeaderTiltPercent: Number.isFinite(resolvedColumnHeaderTiltPercent)
      ? Math.max(0, Math.min(100, resolvedColumnHeaderTiltPercent))
      : 0,
    excelStyleDiagonalHeaders: parseBoolean(
      (effectiveFormData as any).excel_style_diagonal_headers ??
        (effectiveFormData as any).excelStyleDiagonalHeaders,
      false,
    ),
    defaultExpandDepth: Number(
      (effectiveFormData as any).defaultExpandDepth ??
        (effectiveFormData as any).default_expand_depth ??
        0,
    ),
    numberFormatDigits: Number(
      (effectiveFormData as any).numberFormatDigits ??
        (effectiveFormData as any).number_format_digits ??
        2,
    ),
    numberFormat:
      typeof ((effectiveFormData as any).yAxisFormat ?? (effectiveFormData as any).y_axis_format) ===
      'string'
        ? String((effectiveFormData as any).yAxisFormat ?? (effectiveFormData as any).y_axis_format)
        : undefined,
    cellValueAlign:
      compactString((effectiveFormData as any).cellValueAlign) ??
      compactString((effectiveFormData as any).cell_value_align) ??
      'right',
    metricD3Formats: Array.isArray((effectiveFormData as any).metricD3Formats)
      ? ((effectiveFormData as any).metricD3Formats as MetricFormatRule[])
      : [],
    rowSqlFormats: Array.isArray((effectiveFormData as any).rowSqlFormats)
      ? ((effectiveFormData as any).rowSqlFormats as RowSqlFormatRule[])
      : [],
    rowOrder: compactString((effectiveFormData as any).rowOrder) ?? 'key_a_to_z',
    colOrder: compactString((effectiveFormData as any).colOrder) ?? 'key_a_to_z',
    rowSortSql: compactString((effectiveFormData as any).rowSortSql),
    colSortSql: compactString((effectiveFormData as any).colSortSql),
    nullLabel: String(
      (effectiveFormData as any).nullLabel ?? (effectiveFormData as any).null_label ?? '—',
    ),
    headerBg: compactColor((effectiveFormData as any).headerBg),
    headerTextColor: compactColor((effectiveFormData as any).headerTextColor),
    grandTotalBg: compactColor((effectiveFormData as any).grandTotalBg),
    expandColor: compactColor((effectiveFormData as any).expandColor),
    subtotalBg: compactColor((effectiveFormData as any).subtotalBg),
    cellTextColor: compactColor((effectiveFormData as any).cellTextColor),
    heatmapPositiveColor: compactColor((effectiveFormData as any).heatmapPositiveColor),
    heatmapNegativeColor: compactColor((effectiveFormData as any).heatmapNegativeColor),
    barPositiveColor: compactColor((effectiveFormData as any).barPositiveColor),
    barNegativeColor: compactColor((effectiveFormData as any).barNegativeColor),
    conditionalFormatting: Array.isArray((effectiveFormData as any).conditional_formatting)
      ? ((effectiveFormData as any).conditional_formatting as ConditionalFormattingRule[])
      : [],
    metricSummarySql: Array.isArray((effectiveFormData as any).metricSummarySql)
      ? ((effectiveFormData as any).metricSummarySql as MetricSummarySqlRule[])
      : [],
  };
}
