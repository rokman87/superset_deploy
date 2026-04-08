import {
  buildQueryContext,
  QueryFormData,
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

  const resolved = candidates.find(candidate => typeof candidate === 'string' && candidate.trim());
  return resolved ? String(resolved).trim() : JSON.stringify(field);
}

function extractMetricCandidates(metric: any): string[] {
  if (typeof metric === 'string') return [metric];

  return [
    metric?.label,
    metric?.metric_name,
    metric?.optionName,
    metric?.column?.column_name,
    metric?.column?.verbose_name,
    metric?.column_name,
    metric?.value,
    metric?.expression,
    metric?.sqlExpression,
  ]
    .filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim())
    .map(candidate => candidate.trim());
}

function extractMetricKey(metric: any): string {
  const candidates = extractMetricCandidates(metric);
  return candidates[0] ?? String(metric);
}

export default function buildQuery(
  formData: QueryFormData,
) {
  const groupbyRows = parseArray((formData as any).groupbyRows);
  const groupbyColumns = parseArray((formData as any).groupbyColumns);
  const selectableDimensions = parseArray((formData as any).selectableDimensions);
  const metricsRaw = (Array.isArray((formData as any).metrics)
    ? (formData as any).metrics
    : [(formData as any).metrics]
  ).filter(Boolean);
  const selectableMetrics = (Array.isArray((formData as any).selectableMetrics)
    ? (formData as any).selectableMetrics
    : [(formData as any).selectableMetrics]
  ).filter(Boolean);

  const columns = Array.from(
    new Map(
      [...groupbyRows, ...groupbyColumns, ...selectableDimensions].map(field => [
        extractFieldKey(field),
        field,
      ]),
    ).values(),
  );

  const metrics = Array.from(
    new Map(
      [...metricsRaw, ...selectableMetrics].map(metric => [extractMetricKey(metric), metric]),
    ).values(),
  );

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns,
      groupby: columns,
      metrics,
      row_limit: Number(baseQueryObject.row_limit ?? 50000),
    },
  ]);
}
