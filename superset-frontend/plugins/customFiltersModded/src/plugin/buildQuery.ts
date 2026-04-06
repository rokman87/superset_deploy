import {
  buildQueryContext,
  GenericDataType,
  QueryFormData,
  QueryObjectFilterClause,
} from '@superset-ui/core';

type RawFieldOption =
  | string
  | {
      value?: string;
      column_name?: string;
      optionName?: string;
      sqlExpression?: string;
      expression?: string;
      label?: string;
      verbose_name?: string;
    };

function parseArray(value: unknown): RawFieldOption[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean) as RawFieldOption[];
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function extractFieldKey(field: RawFieldOption): string {
  if (typeof field === 'string') {
    return field;
  }

  return (
    field.value ||
    field.column_name ||
    field.optionName ||
    field.sqlExpression ||
    field.expression ||
    field.label ||
    field.verbose_name ||
    JSON.stringify(field)
  );
}

export default function buildQuery(
  formData: QueryFormData,
  options?: {
    ownState?: {
      remoteSearchColumn?: string;
      remoteSearchValue?: string;
      remoteSearchRowLimit?: number;
      parentSelections?: Record<string, (string | number | boolean | null)[]>;
      columnTypeMap?: Record<string, GenericDataType>;
    };
  },
) {
  const filterColumns = parseArray((formData as any).filterColumns);
  const columns = Array.from(new Set(filterColumns.map(extractFieldKey).filter(Boolean)));
  const ownState = options?.ownState || {};

  return buildQueryContext(formData, baseQueryObject => [
    (() => {
      const remoteSearchColumn = ownState.remoteSearchColumn;
      const remoteSearchValue = ownState.remoteSearchValue?.trim();
      const isRemoteSearch = Boolean(remoteSearchColumn && remoteSearchValue);

      if (!isRemoteSearch) {
        return {
          ...baseQueryObject,
          columns,
          groupby: columns,
          metrics: [],
          orderby: columns.map(column => [column, true]),
          row_limit: Number((formData as any).filterRowLimit ?? baseQueryObject.row_limit ?? 1000),
        };
      }

      const extraFilters: QueryObjectFilterClause[] = [];
      const parentSelections = ownState.parentSelections || {};

      Object.entries(parentSelections).forEach(([col, values]) => {
        const normalizedValues = Array.isArray(values)
          ? values.filter(
              (value): value is string | number | boolean | null => value !== undefined,
            )
          : [];
        if (normalizedValues.length) {
          extraFilters.push({
            col,
            op: 'IN',
            val: normalizedValues,
          });
        }
      });

      const remoteSearchType = ownState.columnTypeMap?.[remoteSearchColumn];

      if (remoteSearchType === GenericDataType.Numeric) {
        const numericValue = Number(remoteSearchValue);
        if (!Number.isNaN(numericValue)) {
          extraFilters.push({
            col: remoteSearchColumn,
            op: '==',
            val: numericValue,
          });
        }
      } else if (remoteSearchType === GenericDataType.Boolean) {
        const normalized = remoteSearchValue.toLowerCase();
        if (normalized === 'true' || normalized === 'false') {
          extraFilters.push({
            col: remoteSearchColumn,
            op: '==',
            val: normalized === 'true',
          });
        }
      } else {
        extraFilters.push({
          col: remoteSearchColumn,
          op: 'ILIKE',
          val: `%${remoteSearchValue}%`,
        });
      }

      return {
        ...baseQueryObject,
        columns: [remoteSearchColumn],
        groupby: [remoteSearchColumn],
        metrics: [],
        filters: [...(baseQueryObject.filters || []), ...extraFilters],
        orderby: [[remoteSearchColumn, true]],
        row_limit: Number(
          ownState.remoteSearchRowLimit ??
            (formData as any).asyncSearchRowLimit ??
            (formData as any).filterRowLimit ??
            baseQueryObject.row_limit ??
            100,
        ),
      };
    })(),
  ]);
}
