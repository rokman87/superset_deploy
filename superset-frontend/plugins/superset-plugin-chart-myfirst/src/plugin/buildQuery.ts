import { buildQueryContext, QueryFormData } from '@superset-ui/core';

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
    field.value,
    field.column_name,
    field.optionName,
    field.sqlExpression,
    field.expression,
    field.label,
    field.verbose_name,
  ];

  const resolved = candidates.find(candidate => typeof candidate === 'string' && candidate.trim());
  return resolved ? String(resolved).trim() : JSON.stringify(field);
}

export default function buildQuery(formData: QueryFormData) {
  const groupbyRows = parseArray((formData as any).groupbyRows);
  const groupbyColumns = parseArray((formData as any).groupbyColumns);
  const selectableDimensions = parseArray((formData as any).selectableDimensions);
  const metrics = (formData as any).metrics ?? [];

  const columns = Array.from(
    new Set(
      [...selectableDimensions, ...groupbyRows, ...groupbyColumns]
        .filter(Boolean)
        .map(extractFieldKey),
    ),
  );

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns,
      groupby: columns,
      metrics,
    },
  ]);
}
