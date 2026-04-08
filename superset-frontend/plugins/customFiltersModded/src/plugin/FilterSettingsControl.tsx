import React, { useEffect, useMemo } from 'react';
import { CustomControlConfig } from '@superset-ui/chart-controls';
import { DataRecordValue, styled, t } from '@superset-ui/core';
import { Checkbox, Empty, Select } from '@superset-ui/core/components';
import ControlHeader from 'src/explore/components/ControlHeader';

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

type FilterOption = {
  key: string;
  label: string;
  rawValue: DataRecordValue;
};

type FilterSetting = {
  multiSelect?: boolean;
  defaultValues?: DataRecordValue[];
};

type Props = CustomControlConfig<{
  value?: Record<string, FilterSetting>;
  filterColumns?: RawFieldOption[];
  colnames?: string[];
  data?: Record<string, DataRecordValue>[];
  emptyValueLabel?: string;
  defaultAllowMultipleSelections?: boolean;
}>;

const Wrapper = styled.div`
  .filter-settings-list {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.sizeUnit * 2}px;
  }

  .filter-settings-item {
    border: 1px solid ${({ theme }) => theme.colorBorderSecondary};
    border-radius: ${({ theme }) => theme.borderRadius}px;
    padding: ${({ theme }) => theme.sizeUnit * 2}px;
    background: ${({ theme }) => theme.colorBgContainer};
  }

  .filter-settings-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({ theme }) => theme.sizeUnit * 2}px;
    margin-bottom: ${({ theme }) => theme.sizeUnit * 2}px;
  }

  .filter-settings-item-title {
    font-size: ${({ theme }) => theme.fontSizeSM}px;
    font-weight: ${({ theme }) => theme.fontWeightStrong};
    color: ${({ theme }) => theme.colorText};
  }

  .filter-settings-item-body {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => theme.sizeUnit * 2}px;
  }

  .filter-settings-select {
    width: 100%;
  }
`;

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
  return String(value);
}

function sortValues(a: DataRecordValue, b: DataRecordValue): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export default function FilterSettingsControl(props: Props) {
  const {
    name,
    label,
    description,
    value,
    onChange,
    filterColumns,
    colnames,
    data,
    emptyValueLabel = '(Empty)',
    defaultAllowMultipleSelections = true,
  } = props;

  const filters = useMemo(
    () => parseArray(filterColumns).map(field => buildFieldDef(field, colnames || [])),
    [colnames, filterColumns],
  );

  const optionsByFilter = useMemo(
    () =>
      Object.fromEntries(
        filters.map(filter => {
          const uniqueValues = Array.from(
            new Map(
              (data || [])
                .map(record => record[filter.key])
                .sort(sortValues)
                .map(rawValue => [
                  serializeValue(rawValue),
                  {
                    key: serializeValue(rawValue),
                    label: formatValue(rawValue, emptyValueLabel),
                    rawValue,
                  },
                ]),
            ).values(),
          );
          return [filter.key, uniqueValues];
        }),
      ) as Record<string, FilterOption[]>,
    [data, emptyValueLabel, filters],
  );

  const normalizedValue = useMemo(
    () =>
      Object.fromEntries(
        filters.map(filter => [
          filter.key,
          {
            multiSelect:
              value?.[filter.key]?.multiSelect ?? defaultAllowMultipleSelections,
            defaultValues: Array.isArray(value?.[filter.key]?.defaultValues)
              ? value?.[filter.key]?.defaultValues || []
              : [],
          },
        ]),
      ) as Record<string, FilterSetting>,
    [defaultAllowMultipleSelections, filters, value],
  );

  useEffect(() => {
    const currentKeys = Object.keys(value || {});
    const normalizedKeys = Object.keys(normalizedValue);
    const hasKeyMismatch =
      currentKeys.length !== normalizedKeys.length ||
      currentKeys.some(key => !(key in normalizedValue));

    if (hasKeyMismatch) {
      onChange?.(normalizedValue);
    }
  }, [normalizedValue, onChange, value]);

  const updateFilterSetting = (filterKey: string, nextSetting: Partial<FilterSetting>) => {
    const currentSetting = normalizedValue[filterKey] || {
      multiSelect: defaultAllowMultipleSelections,
      defaultValues: [],
    };
    const mergedSetting: FilterSetting = {
      ...currentSetting,
      ...nextSetting,
    };

    if (!mergedSetting.multiSelect && Array.isArray(mergedSetting.defaultValues)) {
      mergedSetting.defaultValues = mergedSetting.defaultValues.slice(0, 1);
    }

    onChange?.({
      ...normalizedValue,
      [filterKey]: mergedSetting,
    });
  };

  return (
    <Wrapper>
      <ControlHeader name={name} label={label} description={description} />
      {!filters.length ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('Choose filter columns first')}
        />
      ) : (
        <div className="filter-settings-list">
          {filters.map(filter => {
            const filterSetting = normalizedValue[filter.key] || {
              multiSelect: defaultAllowMultipleSelections,
              defaultValues: [],
            };
            const isMultiSelect = Boolean(filterSetting.multiSelect);
            const options = optionsByFilter[filter.key] || [];

            return (
              <div key={filter.key} className="filter-settings-item">
                <div className="filter-settings-item-header">
                  <div className="filter-settings-item-title">{filter.label}</div>
                  <Checkbox
                    checked={isMultiSelect}
                    onChange={() =>
                      updateFilterSetting(filter.key, {
                        multiSelect: !isMultiSelect,
                      })
                    }
                  >
                    {t('Multi select')}
                  </Checkbox>
                </div>
                <div className="filter-settings-item-body">
                  <Select
                    className="filter-settings-select"
                    mode={isMultiSelect ? 'multiple' : undefined}
                    allowClear
                    showSearch
                    placeholder={t('Default value')}
                    value={
                      isMultiSelect
                        ? (filterSetting.defaultValues || []).map(serializeValue)
                        : filterSetting.defaultValues?.[0] !== undefined
                          ? serializeValue(filterSetting.defaultValues[0])
                          : undefined
                    }
                    onChange={selected =>
                      updateFilterSetting(filter.key, {
                        defaultValues: Array.isArray(selected)
                          ? selected
                              .map(
                                selectedValue =>
                                  options.find(option => option.key === selectedValue)?.rawValue,
                              )
                              .filter(value => value !== undefined)
                          : selected
                            ? [
                                options.find(option => option.key === selected)?.rawValue,
                              ].filter(value => value !== undefined)
                            : [],
                      })
                    }
                    options={options.map(option => ({
                      value: option.key,
                      label: option.label,
                    }))}
                    maxTagCount="responsive"
                    getPopupContainer={() => document.body}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Wrapper>
  );
}
