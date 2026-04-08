import { ChartProps, DataRecordValue, GenericDataType } from '@superset-ui/core';

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

type FilterField = {
  key: string;
  label: string;
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

function parseBoolean(value: unknown, defaultValue = false): boolean {
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

function getFieldLabel(field: RawFieldOption): string {
  if (typeof field === 'string') return field;

  return (
    field.label ||
    field.verbose_name ||
    field.value ||
    field.column_name ||
    field.optionName ||
    field.sqlExpression ||
    field.expression ||
    JSON.stringify(field)
  );
}

function getFieldCandidates(field: RawFieldOption): string[] {
  if (typeof field === 'string') return [field];

  return [
    field.value,
    field.column_name,
    field.optionName,
    field.sqlExpression,
    field.expression,
    field.label,
    field.verbose_name,
  ].filter((candidate): candidate is string => Boolean(candidate));
}

function buildFieldDef(field: RawFieldOption, dataColumnNames: string[]): FilterField {
  const candidates = getFieldCandidates(field);
  const matchedKey = candidates.find(candidate => dataColumnNames.includes(candidate));
  const fallbackKey = candidates[0] ?? getFieldLabel(field);

  return {
    key: matchedKey ?? fallbackKey,
    label: getFieldLabel(field),
  };
}

function serializeValue(value: DataRecordValue): string {
  if (value === null) return 'null:null';
  if (value === undefined) return 'undefined:undefined';
  if (typeof value === 'string') return `string:${value}`;
  if (typeof value === 'number') return `number:${value}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  return `json:${JSON.stringify(value)}`;
}

function formatValue(value: DataRecordValue, emptyValueLabel: string): string {
  if (value === null || value === undefined || value === '') {
    return emptyValueLabel;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function sortValues(a: DataRecordValue, b: DataRecordValue): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export default function transformProps(chartProps: ChartProps) {
  const {
    width,
    height,
    formData,
    queriesData,
    hooks: { setDataMask = () => {} },
    filterState,
  } = chartProps;
  const rawRecords = queriesData[0]?.data || [];
  const filterColumnsRaw = parseArray((formData as any).filterColumns);
  const queryData = queriesData[0] || {};
  const queryColNames = Array.isArray((queryData as any).colnames)
    ? ((queryData as any).colnames as string[])
    : [];
  const queryColTypes = Array.isArray((queryData as any).coltypes)
    ? ((queryData as any).coltypes as GenericDataType[])
    : [];
  const dataColumnNames: string[] = Array.isArray((queriesData[0] as any)?.colnames)
    ? ((queriesData[0] as any).colnames as unknown[]).map(String)
    : Object.keys(rawRecords[0] || {});
  const columnTypeMap = queryColNames.reduce(
    (accumulator, item, index) => ({
      ...accumulator,
      [String(item)]: queryColTypes[index],
    }),
    {} as Record<string, GenericDataType>,
  );

  const filters = filterColumnsRaw.map(field => buildFieldDef(field, dataColumnNames));
  const emptyValueLabel = String((formData as any).emptyValueLabel ?? '(Empty)');

  const optionsByFilter = Object.fromEntries(
    filters.map(filter => {
      const uniqueValues = Array.from(
        new Map(
          rawRecords
            .map(record => record[filter.key] as DataRecordValue)
            .sort(sortValues)
            .map(value => [serializeValue(value), value]),
        ).entries(),
      ).map(([key, value]) => ({
        key,
        rawValue: value,
        label: formatValue(value, emptyValueLabel),
      }));

      return [filter.key, uniqueValues];
    }),
  );

  const selectedFilters = Object.fromEntries(
    Object.entries((filterState?.filters as Record<string, DataRecordValue[] | DataRecordValue>) || {}).map(
      ([key, value]) => [
        key,
        Array.isArray(value) ? value : value === null || value === undefined ? [] : [value],
      ],
    ),
  );

  const filterSettingsRaw = (formData as any).filterSettings;
  const filterSettings =
    filterSettingsRaw && typeof filterSettingsRaw === 'object' && !Array.isArray(filterSettingsRaw)
      ? Object.fromEntries(
          filters.map(filter => [
            filter.key,
            {
              multiSelect:
                typeof filterSettingsRaw?.[filter.key]?.multiSelect === 'boolean'
                  ? filterSettingsRaw[filter.key].multiSelect
                  : undefined,
              defaultValues: Array.isArray(filterSettingsRaw?.[filter.key]?.defaultValues)
                ? filterSettingsRaw[filter.key].defaultValues
                : [],
            },
          ]),
        )
      : {};

  return {
    width,
    height,
    formData,
    data: rawRecords,
    filters,
    optionsByFilter,
    selectedFilters,
    filterSettings,
    columnTypeMap,
    setDataMask,
    allowMultipleSelections: parseBoolean((formData as any).allowMultipleSelections, true),
    showSearch: parseBoolean((formData as any).showSearch, true),
    showResetButton: parseBoolean((formData as any).showResetButton, true),
    columnsPerRow: Number((formData as any).columnsPerRow ?? 6),
    panelTitle: (formData as any).panelTitle,
    emptyValueLabel,
    showTitle: parseBoolean((formData as any).showTitle, false),
    collapsedByDefault: parseBoolean((formData as any).collapsedByDefault, true),
    maxVisibleFilters: Number((formData as any).maxVisibleFilters ?? 4),
    controlSize: ((formData as any).controlSize ?? 'small') as 'small' | 'middle' | 'large',
    gapSize: Number((formData as any).gapSize ?? 6),
    cardPadding: Number((formData as any).cardPadding ?? 8),
    minControlWidth: Number((formData as any).minControlWidth ?? 140),
    stretchSingleRow: parseBoolean((formData as any).stretchSingleRow, true),
    hideFilterLabels: parseBoolean((formData as any).hideFilterLabels, false),
    enableAsyncSearch: parseBoolean((formData as any).enableAsyncSearch, true),
    asyncSearchThreshold: Number((formData as any).asyncSearchThreshold ?? 30),
    asyncSearchRowLimit: Number((formData as any).asyncSearchRowLimit ?? 100),
  };
}
