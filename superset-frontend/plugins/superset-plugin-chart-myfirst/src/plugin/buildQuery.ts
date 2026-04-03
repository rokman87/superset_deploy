import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const parseArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  };

  const groupbyRows = parseArray((formData as any).groupbyRows);
  const groupbyColumns = parseArray((formData as any).groupbyColumns);
  const selectableDimensions = parseArray((formData as any).selectableDimensions);
  const metrics = (formData as any).metrics ?? [];

  const columns = Array.from(new Set([...selectableDimensions, ...groupbyRows, ...groupbyColumns]))
    .filter(Boolean)
    .map(col => (typeof col === 'object' ? col.value ?? col.label ?? JSON.stringify(col) : col));

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns,
      groupby: columns,
      metrics,
    },
  ]);
}