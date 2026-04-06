import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DataMask, DataRecordValue, GenericDataType, styled, t } from '@superset-ui/core';
import { Button, Empty, Select } from '@superset-ui/core/components';
import { getChartDataRequest } from 'src/components/Chart/chartAction';

type FilterField = {
  key: string;
  label: string;
};

type FilterOption = {
  key: string;
  label: string;
  rawValue: DataRecordValue;
};

type SelectedFilterMap = Record<string, DataRecordValue[]>;
type DataRow = Record<string, DataRecordValue>;

type Props = {
  data: DataRow[];
  formData: Record<string, any>;
  filters: FilterField[];
  optionsByFilter: Record<string, FilterOption[]>;
  selectedFilters: SelectedFilterMap;
  columnTypeMap: Record<string, GenericDataType>;
  setDataMask: (dataMask: DataMask) => void;
  allowMultipleSelections: boolean;
  showSearch: boolean;
  showResetButton: boolean;
  columnsPerRow: number;
  panelTitle?: string;
  emptyValueLabel: string;
  showTitle: boolean;
  collapsedByDefault: boolean;
  maxVisibleFilters: number;
  controlSize: 'small' | 'middle' | 'large';
  gapSize: number;
  cardPadding: number;
  minControlWidth: number;
  stretchSingleRow: boolean;
  hideFilterLabels: boolean;
  enableAsyncSearch: boolean;
  asyncSearchThreshold: number;
  asyncSearchRowLimit: number;
  width: number;
  height: number;
};

const Styles = styled.div<{
  columnsPerRow: number;
  gapSize: number;
  cardPadding: number;
  minControlWidth: number;
  stretchSingleRow: boolean;
  collapsed: boolean;
}>`
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: ${({ cardPadding }) => `${cardPadding}px`};
  background: transparent;
  border: none;
  border-radius: 0;
  color: #0f172a;

  .filter-shell {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    gap: ${({ gapSize }) => `${gapSize}px`};
  }

  .filter-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    color: #1e293b;
  }

  .filter-grid {
    display: grid;
    grid-template-columns: ${({ stretchSingleRow, columnsPerRow, minControlWidth }) =>
      stretchSingleRow
        ? `repeat(${columnsPerRow}, minmax(${minControlWidth}px, 1fr))`
        : `repeat(${columnsPerRow}, minmax(0, 1fr))`};
    gap: ${({ gapSize }) => `${gapSize}px`};
    align-items: start;
  }

  .filter-card {
    padding: ${({ collapsed }) => (collapsed ? '4px 6px' : '6px 8px')};
    border-radius: 10px;
    background: transparent;
    border: 1px solid transparent;
    min-width: ${({ minControlWidth }) => `${minControlWidth}px`};
  }

  .filter-label {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    font-size: 11px;
    font-weight: 600;
    color: #334155;
    line-height: 1.1;
  }

  .filter-meta {
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    margin-top: 6px;
  }

  .filter-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    background: transparent;
    border-radius: 10px;
    border: 1px dashed #cbd5e1;
  }

  .ant-select {
    width: 100%;
  }

  .custom-filters-dropdown.ant-select-dropdown {
    width: max-content !important;
    min-width: 120px !important;
    max-width: 300px !important;
  }

  .custom-filters-dropdown .ant-select-item-option-content {
    white-space: normal;
    word-break: break-word;
  }

  .ant-select-selector {
    min-height: ${({ collapsed }) => (collapsed ? '28px' : '32px')} !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    border-radius: 8px !important;
  }

  .ant-select-selection-placeholder,
  .ant-select-selection-item {
    font-size: 12px;
  }

  .ant-btn {
    border-radius: 8px;
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
  }

  .filter-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  @media (max-width: 1100px) {
    .filter-grid {
      grid-template-columns: repeat(2, minmax(${({ minControlWidth }) => `${minControlWidth}px`}, 1fr));
    }
  }

  @media (max-width: 720px) {
    padding: ${({ cardPadding }) => `${cardPadding}px`};

    .filter-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;

function serializeValue(value: DataRecordValue): string {
  if (value === null) return 'null:null';
  if (value === undefined) return 'undefined:undefined';
  if (typeof value === 'string') return `string:${value}`;
  if (typeof value === 'number') return `number:${value}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  return `json:${JSON.stringify(value)}`;
}

function formatOptionLabel(value: DataRecordValue, emptyValueLabel: string): string {
  if (value === null || value === undefined || value === '') {
    return emptyValueLabel;
  }
  return String(value);
}

function buildDataMask(selectedFilters: SelectedFilterMap): DataMask {
  const normalizedFilters = Object.fromEntries(
    Object.entries(selectedFilters).filter(([, values]) => values.length > 0),
  );

  const filters = Object.entries(normalizedFilters).map(([col, values]) => ({
    col,
    op: 'IN' as const,
    val: values as (string | number | boolean)[],
  }));

  const label = Object.entries(normalizedFilters)
    .map(([col, values]) => `${col}: ${values.join(', ')}`)
    .join(' | ');

  return {
    extraFormData: {
      filters,
    },
    filterState: {
      label: label || undefined,
      value: Object.keys(normalizedFilters).length ? normalizedFilters : null,
      filters: Object.keys(normalizedFilters).length ? normalizedFilters : null,
      selectedValues: Object.keys(normalizedFilters).length ? normalizedFilters : null,
    },
  };
}

function buildRawSelections(
  filters: FilterField[],
  serializedSelections: Record<string, string[]>,
  optionMaps: Record<string, Record<string, DataRecordValue>>,
): SelectedFilterMap {
  return Object.fromEntries(
    filters.map(filter => {
      const serializedValues = serializedSelections[filter.key] || [];
      const valueMap = optionMaps[filter.key] || {};
      return [
        filter.key,
        serializedValues
          .map(value => valueMap[value])
          .filter(value => value !== undefined),
      ];
    }),
  ) as SelectedFilterMap;
}

function parseDefaultFilterValues(
  value: unknown,
  filters: FilterField[],
): Record<string, DataRecordValue[]> {
  if (!value || typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      filters.map(filter => {
        const rawValue = parsed[filter.key];
        if (Array.isArray(rawValue)) {
          return [filter.key, rawValue as DataRecordValue[]];
        }
        if (rawValue === undefined || rawValue === null || rawValue === '') {
          return [filter.key, []];
        }
        return [filter.key, [rawValue as DataRecordValue]];
      }),
    );
  } catch {
    return {};
  }
}

export default function CustomFiltersModded(props: Props) {
  const {
    data,
    formData,
    filters,
    optionsByFilter,
    selectedFilters,
    columnTypeMap,
    setDataMask,
    allowMultipleSelections,
    showSearch,
    showResetButton,
    columnsPerRow,
    panelTitle,
    emptyValueLabel,
    showTitle,
    collapsedByDefault,
    maxVisibleFilters,
    controlSize,
    gapSize,
    cardPadding,
    minControlWidth,
    stretchSingleRow,
    hideFilterLabels,
    enableAsyncSearch,
    asyncSearchThreshold,
    asyncSearchRowLimit,
  } = props;

  const [localSelections, setLocalSelections] = useState<Record<string, string[]>>({});
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  const [remoteSearchTerms, setRemoteSearchTerms] = useState<Record<string, string>>({});
  const [remoteOptionsByFilter, setRemoteOptionsByFilter] = useState<
    Record<string, FilterOption[]>
  >({});
  const [loadingByFilter, setLoadingByFilter] = useState<Record<string, boolean>>({});
  const requestVersionRef = useRef<Record<string, number>>({});
  const defaultSelections = useMemo(
    () => parseDefaultFilterValues(formData.defaultFilterValues, filters),
    [filters, formData.defaultFilterValues],
  );

  useEffect(() => {
    setCollapsed(collapsedByDefault);
  }, [collapsedByDefault]);

  const asyncSearchableFilterKeys = useMemo(
    () =>
      new Set(
        filters
          .filter(
            filter =>
              enableAsyncSearch &&
              (optionsByFilter[filter.key] || []).length >= asyncSearchThreshold,
          )
          .map(filter => filter.key),
      ),
    [asyncSearchThreshold, enableAsyncSearch, filters, optionsByFilter],
  );

  const presetOptionsByFilter = useMemo(
    () =>
      Object.fromEntries(
        filters.map(filter => {
          const presetValues = [
            ...(selectedFilters[filter.key] || []),
            ...(defaultSelections[filter.key] || []),
          ];

          const uniqueOptions = Array.from(
            new Map(
              presetValues.map(value => [
                serializeValue(value),
                {
                  key: serializeValue(value),
                  rawValue: value,
                  label: formatOptionLabel(value, emptyValueLabel),
                },
              ]),
            ).values(),
          );

          return [filter.key, uniqueOptions];
        }),
      ),
    [defaultSelections, emptyValueLabel, filters, selectedFilters],
  );

  const mergedOptionsByFilter = useMemo(
    () =>
      Object.fromEntries(
        filters.map(filter => {
          const merged = new Map<string, FilterOption>();
          (presetOptionsByFilter[filter.key] || []).forEach(option => {
            merged.set(option.key, option);
          });
          (optionsByFilter[filter.key] || []).forEach(option => {
            merged.set(option.key, option);
          });
          (remoteOptionsByFilter[filter.key] || []).forEach(option => {
            merged.set(option.key, option);
          });
          return [filter.key, Array.from(merged.values())];
        }),
      ),
    [filters, optionsByFilter, presetOptionsByFilter, remoteOptionsByFilter],
  );

  const optionMaps = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(mergedOptionsByFilter).map(([filterKey, options]) => [
          filterKey,
          Object.fromEntries(options.map(option => [option.key, option.rawValue])),
        ]),
      ),
    [mergedOptionsByFilter],
  );

  useEffect(() => {
    const hasExternalSelections = filters.some(
      filter => (selectedFilters[filter.key] || []).length > 0,
    );
    const nextSelections = Object.fromEntries(
      filters.map(filter => [
        filter.key,
        (hasExternalSelections
          ? selectedFilters[filter.key] || []
          : defaultSelections[filter.key] || []
        ).map(value => serializeValue(value)),
      ]),
    );
    setLocalSelections(nextSelections);

    if (!hasExternalSelections) {
      const rawSelections = buildRawSelections(filters, nextSelections, optionMaps);
      const hasDefaults = Object.values(rawSelections).some(values => values.length > 0);
      if (hasDefaults) {
        setDataMask(buildDataMask(rawSelections));
      }
    }
  }, [defaultSelections, filters, optionMaps, selectedFilters, setDataMask]);

  const cascadedOptionsByFilter = useMemo(
    () =>
      Object.fromEntries(
        filters.map((filter, filterIndex) => {
          const parentFilters = filters.slice(0, filterIndex);
          const narrowedRows = data.filter(row =>
            parentFilters.every(parentFilter => {
              const selectedParentValues = localSelections[parentFilter.key] || [];
              if (!selectedParentValues.length) {
                return true;
              }
              const rowValue = row[parentFilter.key];
              return selectedParentValues.includes(serializeValue(rowValue));
            }),
          );

          const allowedKeys = new Set(
            narrowedRows.map(row => serializeValue(row[filter.key])),
          );
          const selectedKeys = new Set(localSelections[filter.key] || []);

          const narrowedOptions = (mergedOptionsByFilter[filter.key] || []).filter(option =>
            allowedKeys.has(option.key) || selectedKeys.has(option.key),
          );

          return [filter.key, narrowedOptions];
        }),
      ),
    [data, filters, localSelections, mergedOptionsByFilter],
  );

  useEffect(() => {
    const nextSelections = Object.fromEntries(
      filters.map(filter => {
        const allowedOptionKeys = new Set(
          (cascadedOptionsByFilter[filter.key] || []).map(option => option.key),
        );
        const currentValues = localSelections[filter.key] || [];
        return [filter.key, currentValues.filter(value => allowedOptionKeys.has(value))];
      }),
    ) as Record<string, string[]>;

    const hasChanges = filters.some(
      filter =>
        (localSelections[filter.key] || []).join('|') !==
        (nextSelections[filter.key] || []).join('|'),
    );

    if (!hasChanges) {
      return;
    }

    setLocalSelections(nextSelections);

    setDataMask(buildDataMask(buildRawSelections(filters, nextSelections, optionMaps)));
  }, [cascadedOptionsByFilter, filters, localSelections, optionMaps, setDataMask]);
  const hasActiveFilters = useMemo(
    () => filters.some(filter => (localSelections[filter.key] || []).length > 0),
    [filters, localSelections],
  );

  const visibleFilters = useMemo(() => {
    if (!collapsed) {
      return filters;
    }
    return filters.slice(0, Math.max(1, maxVisibleFilters));
  }, [collapsed, filters, maxVisibleFilters]);

  const hiddenFiltersCount = Math.max(0, filters.length - visibleFilters.length);

  const applySelection = (filterKey: string, values: string[]) => {
    const nextSelections: Record<string, string[]> = { ...localSelections };
    const nextRemoteSearchTerms: Record<string, string> = { ...remoteSearchTerms };
    const nextRemoteOptionsByFilter: Record<string, FilterOption[]> = {
      ...remoteOptionsByFilter,
    };
    const nextValue = allowMultipleSelections ? values : values.slice(-1);
    const changedIndex = filters.findIndex(filter => filter.key === filterKey);

    filters.forEach((filter, index) => {
      if (index < changedIndex) {
        nextSelections[filter.key] = localSelections[filter.key] || [];
        return;
      }
      if (index === changedIndex) {
        nextSelections[filter.key] = nextValue;
        return;
      }
      nextSelections[filter.key] = [];
      nextRemoteSearchTerms[filter.key] = '';
      nextRemoteOptionsByFilter[filter.key] = [];
    });
    setLocalSelections(nextSelections);
    setRemoteSearchTerms(nextRemoteSearchTerms);
    setRemoteOptionsByFilter(nextRemoteOptionsByFilter);

    setDataMask(buildDataMask(buildRawSelections(filters, nextSelections, optionMaps)));
  };

  const resetFilters = () => {
    const clearedSelections = Object.fromEntries(filters.map(filter => [filter.key, []]));
    setLocalSelections(clearedSelections);
    setRemoteSearchTerms({});
    setRemoteOptionsByFilter({});
    setDataMask(buildDataMask({}));
  };

  const fetchRemoteOptions = useCallback(
    async (filterKey: string, searchValue: string) => {
      const trimmedValue = searchValue.trim();
      if (!trimmedValue || !asyncSearchableFilterKeys.has(filterKey)) {
        setLoadingByFilter(current => ({ ...current, [filterKey]: false }));
        setRemoteOptionsByFilter(current => ({ ...current, [filterKey]: [] }));
        return;
      }

      const nextVersion = (requestVersionRef.current[filterKey] || 0) + 1;
      requestVersionRef.current[filterKey] = nextVersion;
      setLoadingByFilter(current => ({ ...current, [filterKey]: true }));

      const currentFilterIndex = filters.findIndex(filter => filter.key === filterKey);
      const parentFilters = filters.slice(0, currentFilterIndex);
      const parentSelections = buildRawSelections(filters, localSelections, optionMaps);
      const scopedParentSelections = Object.fromEntries(
        parentFilters.map(filter => [filter.key, parentSelections[filter.key] || []]),
      );

      try {
        const { json } = await getChartDataRequest({
          formData,
          ownState: {
            remoteSearchColumn: filterKey,
            remoteSearchValue: trimmedValue,
            remoteSearchRowLimit: asyncSearchRowLimit,
            parentSelections: scopedParentSelections,
            columnTypeMap,
          },
        });

        const result = 'result' in json ? json.result?.[0] : json;
        const rows = Array.isArray((result as any)?.data) ? (result as any).data : [];
        const nextOptions = Array.from(
          new Map(
            rows.map((row: DataRow) => {
              const rawValue = row[filterKey];
              return [
                serializeValue(rawValue),
                {
                  key: serializeValue(rawValue),
                  rawValue,
                  label:
                    rawValue === null || rawValue === undefined || rawValue === ''
                      ? emptyValueLabel
                      : String(rawValue),
                },
              ] as const;
            }),
          ).values(),
        );

        if (requestVersionRef.current[filterKey] !== nextVersion) {
          return;
        }

        setRemoteOptionsByFilter(current => ({
          ...current,
          [filterKey]: nextOptions,
        }));
      } catch (error) {
        if (requestVersionRef.current[filterKey] !== nextVersion) {
          return;
        }
        setRemoteOptionsByFilter(current => ({ ...current, [filterKey]: [] }));
      } finally {
        if (requestVersionRef.current[filterKey] === nextVersion) {
          setLoadingByFilter(current => ({ ...current, [filterKey]: false }));
        }
      }
    },
    [
      asyncSearchRowLimit,
      asyncSearchableFilterKeys,
      columnTypeMap,
      emptyValueLabel,
      filters,
      formData,
      localSelections,
      optionMaps,
    ],
  );

  useEffect(() => {
    const timers: number[] = [];

    filters.forEach(filter => {
      if (!asyncSearchableFilterKeys.has(filter.key)) {
        return;
      }

      const searchValue = remoteSearchTerms[filter.key] || '';

      if (!searchValue.trim()) {
        setLoadingByFilter(current => ({ ...current, [filter.key]: false }));
        setRemoteOptionsByFilter(current => ({ ...current, [filter.key]: [] }));
        return;
      }

      const timer = window.setTimeout(() => {
        fetchRemoteOptions(filter.key, searchValue);
      }, 350);

      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [asyncSearchableFilterKeys, fetchRemoteOptions, filters, remoteSearchTerms]);

  if (!filters.length) {
    return (
      <Styles
        columnsPerRow={1}
        gapSize={Math.max(0, gapSize)}
        cardPadding={Math.max(0, cardPadding)}
        minControlWidth={Math.max(80, minControlWidth)}
        stretchSingleRow={stretchSingleRow}
        collapsed={collapsed}
      >
        <div className="filter-empty">
          <Empty description={t('Choose columns in the chart settings to render dropdown filters')} />
        </div>
      </Styles>
    );
  }

  return (
    <Styles
      columnsPerRow={Math.max(1, columnsPerRow)}
      gapSize={Math.max(0, gapSize)}
      cardPadding={Math.max(0, cardPadding)}
      minControlWidth={Math.max(80, minControlWidth)}
      stretchSingleRow={stretchSingleRow}
      collapsed={collapsed}
    >
      <div className="filter-shell">
        <div className="filter-header">
          {showTitle && panelTitle ? <h3 className="filter-title">{panelTitle}</h3> : <div />}
          <div className="filter-actions">
            {hiddenFiltersCount > 0 ? (
              <Button onClick={() => setCollapsed(current => !current)}>
                {collapsed ? t('Show all') : t('Collapse')}
              </Button>
            ) : null}
            {showResetButton && hasActiveFilters ? (
              <Button onClick={resetFilters}>{t('Reset')}</Button>
            ) : null}
          </div>
        </div>

        <div className="filter-grid">
          {visibleFilters.map(filter => {
            const isAsyncSearchable = asyncSearchableFilterKeys.has(filter.key);
            const searchValue = remoteSearchTerms[filter.key] || '';
            const options = cascadedOptionsByFilter[filter.key] || [];
            const selectedOptionKeys = new Set(localSelections[filter.key] || []);
            const selectedOptions = (mergedOptionsByFilter[filter.key] || []).filter(option =>
              selectedOptionKeys.has(option.key),
            );
            const displayedOptions = isAsyncSearchable
              ? searchValue.trim()
                ? Array.from(
                    new Map(
                      [...selectedOptions, ...(remoteOptionsByFilter[filter.key] || [])].map(
                        option => [option.key, option],
                      ),
                    ).values(),
                  )
                : selectedOptions
              : options;
            const hasParentSelection = filters
              .slice(0, filters.findIndex(item => item.key === filter.key))
              .some(parentFilter => (localSelections[parentFilter.key] || []).length > 0);
            return (
              <div key={filter.key} className="filter-card">
                {!hideFilterLabels ? (
                  <div className="filter-label">
                    <span>{filter.label}</span>
                  </div>
                ) : null}
                <Select
                  mode={allowMultipleSelections ? 'multiple' : undefined}
                  allowClear
                  showSearch={showSearch}
                  filterOption={isAsyncSearchable ? false : undefined}
                  size={controlSize}
                  placeholder={hideFilterLabels ? filter.label : `${t('Select')} ${filter.label.toLowerCase()}`}
                  value={
                    allowMultipleSelections
                      ? localSelections[filter.key] || []
                      : localSelections[filter.key]?.[0]
                  }
                  onSearch={value => {
                    if (isAsyncSearchable) {
                      setRemoteSearchTerms(current => ({
                        ...current,
                        [filter.key]: value,
                      }));
                    }
                  }}
                  onChange={value =>
                    applySelection(
                      filter.key,
                      Array.isArray(value) ? value.map(String) : value ? [String(value)] : [],
                    )
                  }
                  options={displayedOptions.map(option => ({
                    value: option.key,
                    label: option.label || emptyValueLabel,
                  }))}
                  loading={Boolean(loadingByFilter[filter.key])}
                  maxTagCount="responsive"
                  dropdownMatchSelectWidth={false}
                  getPopupContainer={() => document.body}
                  popupClassName="custom-filters-dropdown"
                  dropdownStyle={{ zIndex: 9999 }}
                  notFoundContent={
                    isAsyncSearchable && !searchValue.trim()
                      ? t('Start typing to search')
                      : hasParentSelection
                        ? t('No values left after previous filters')
                        : t('No values available')
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </Styles>
  );
}
