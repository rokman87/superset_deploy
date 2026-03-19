import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const groupbyRows = (formData as any).groupbyRows ?? [];
  const groupbyColumns = (formData as any).groupbyColumns ?? [];
  const metrics = (formData as any).metrics ?? [];

  const columns = [...groupbyRows, ...groupbyColumns].filter(Boolean);

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,

      // ВАЖНО: чтобы точно появился GROUP BY
      columns,       // новый путь
      groupby: columns, // legacy/совместимость

      metrics,
    },
  ]);
}