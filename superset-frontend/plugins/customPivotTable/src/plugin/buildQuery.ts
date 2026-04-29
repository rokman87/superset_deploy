import {
  AdhocColumn,
  buildQueryContext,
  ensureIsArray,
  isPhysicalColumn,
  QueryFormColumn,
  QueryFormData,
  QueryFormOrderBy,
} from '@superset-ui/core';

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

function extractFieldKey(field: RawFieldOption): string {
  if (typeof field === 'string') return field;

  const candidates = [
    field.column_name,
    field.sqlExpression,
    field.expression,
    field.value,
    field.optionName,
    field.label,
    field.verbose_name,
  ];

  const resolved = candidates.find(
    candidate => typeof candidate === 'string' && candidate.trim(),
  );
  return resolved ? String(resolved).trim() : JSON.stringify(field);
}

function extractMetricCandidates(metric: any): string[] {
  if (typeof metric === 'string') return [metric];

  return [
    metric?.optionName,
    metric?.label,
    metric?.metric_name,
    metric?.column?.column_name,
    metric?.column?.verbose_name,
    metric?.column_name,
    metric?.value,
    metric?.expression,
    metric?.sqlExpression,
  ]
    .filter(
      (candidate): candidate is string =>
        typeof candidate === 'string' && candidate.trim(),
    )
    .map(candidate => candidate.trim());
}

function extractMetricKey(metric: any): string {
  const candidates = extractMetricCandidates(metric);
  return candidates[0] ?? String(metric);
}

function buildMetricsPool(formData: QueryFormData) {
  const metricsRaw = (
    Array.isArray((formData as any).metrics)
      ? (formData as any).metrics
      : [(formData as any).metrics]
  ).filter(Boolean);
  const selectableMetrics = (
    Array.isArray((formData as any).selectableMetrics)
      ? (formData as any).selectableMetrics
      : [(formData as any).selectableMetrics]
  ).filter(Boolean);

  return [...metricsRaw, ...selectableMetrics];
}

function isExportRequest(formData: QueryFormData) {
  const resultFormat = String(
    (formData as any).result_format ?? '',
  ).toLowerCase();
  return ['csv', 'xlsx'].includes(resultFormat);
}

function applyStandardPivotTimeGrain(
  formData: QueryFormData,
  col: QueryFormColumn,
): QueryFormColumn {
  const extraFormData = (formData as any).extra_form_data;
  const timeGrain =
    extraFormData?.time_grain_sqla || (formData as any).time_grain_sqla;

  if (
    isPhysicalColumn(col) &&
    timeGrain &&
    ((formData as any)?.temporal_columns_lookup?.[col] ||
      (formData as any).granularity_sqla === col)
  ) {
    return {
      timeGrain,
      columnType: 'BASE_AXIS',
      sqlExpression: col,
      label: col,
      expressionType: 'SQL',
    } as AdhocColumn;
  }

  return col;
}

function buildStandardPivotColumns(
  formData: QueryFormData,
  columnFields: RawFieldOption[],
) {
  return Array.from(
    new Set(ensureIsArray<QueryFormColumn>(columnFields as QueryFormColumn[])),
  ).map(col => applyStandardPivotTimeGrain(formData, col));
}

export function buildRuntimePivotQueryContext(
  formData: QueryFormData,
  options?: {
    ownState?: {
      pivotSelection?: {
        rowFields?: RawFieldOption[];
        columnFields?: RawFieldOption[];
        metrics?: any[];
        metricKeys?: string[];
      };
    };
  },
) {
  const groupbyRows = parseArray((formData as any).groupbyRows);
  const groupbyColumns = parseArray((formData as any).groupbyColumns);
  const allMetrics = buildMetricsPool(formData);
  const runtimeSelection = options?.ownState?.pivotSelection;
  const selectedRowFields = runtimeSelection?.rowFields ?? groupbyRows;
  const selectedColumnFields = runtimeSelection?.columnFields ?? groupbyColumns;
  const selectedMetrics = Array.isArray(runtimeSelection?.metrics)
    ? runtimeSelection?.metrics.filter(Boolean)
    : [];
  const selectedMetricKeys = runtimeSelection?.metricKeys ?? [];

  const columns = buildStandardPivotColumns(formData, [
    ...selectedColumnFields,
    ...selectedRowFields,
  ]);

  const metrics = Array.from(
    new Map(
      (selectedMetrics.length
        ? selectedMetrics
        : selectedMetricKeys.length
          ? allMetrics.filter(metric => {
              const metricKey = extractMetricKey(metric);
              return (
                selectedMetricKeys.includes(metricKey) ||
                extractMetricCandidates(metric).some(candidate =>
                  selectedMetricKeys.includes(candidate),
                )
              );
            })
          : allMetrics
      ).map(metric => [extractMetricKey(metric), metric]),
    ).values(),
  );

  return buildQueryContext(formData, baseQueryObject => {
    const { series_limit_metric, order_desc } = baseQueryObject;
    let orderBy: QueryFormOrderBy[] | undefined;
    if (series_limit_metric) {
      orderBy = [[series_limit_metric, !order_desc]];
    } else if (Array.isArray(metrics) && metrics[0]) {
      orderBy = [[metrics[0], !order_desc]];
    }

    return [
      {
        ...baseQueryObject,
        orderby: orderBy,
        columns,
        metrics,
        row_limit: Number(baseQueryObject.row_limit ?? 100000),
      },
    ];
  });
}

export default function buildQuery(
  formData: QueryFormData,
  options?: {
    ownState?: {
      pivotSelection?: {
        rowFields?: RawFieldOption[];
        columnFields?: RawFieldOption[];
        metrics?: any[];
        metricKeys?: string[];
      };
      [key: string]: any;
    };
    [key: string]: any;
  },
) {
  const runtimeSelection = options?.ownState?.pivotSelection;

  if (runtimeSelection) {
    return buildRuntimePivotQueryContext(formData, {
      ownState: {
        pivotSelection: runtimeSelection,
      },
    });
  }

  if (isExportRequest(formData)) {
    return buildRuntimePivotQueryContext(formData);
  }

  const allMetrics = buildMetricsPool(formData);
  const bootstrapMetric = allMetrics[0];

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns: [],
      groupby: [],
      metrics: bootstrapMetric ? [bootstrapMetric] : [],
      row_limit: 1,
    },
  ]);
}
