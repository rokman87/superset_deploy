import {
  GenericDataType,
  QueryFormData,
  SetDataMaskHook,
  TimeseriesDataRecord,
} from '@superset-ui/core';

export type FilterSetField = {
  key: string;
  label: string;
};

export type FilterSetOption = {
  key: string;
  label: string;
  rawValue: string | number | boolean | null | undefined;
};

export type FilterSetting = {
  multiSelect?: boolean;
  defaultValues?: (string | number | boolean | null | undefined)[];
};

export type CustomFiltersModdedQueryFormData = QueryFormData & {
  filterColumns?: string[];
  panelTitle?: string;
  columnsPerRow?: number;
  allowMultipleSelections?: boolean;
  showSearch?: boolean;
  showResetButton?: boolean;
  emptyValueLabel?: string;
  showTitle?: boolean;
  collapsedByDefault?: boolean;
  maxVisibleFilters?: number;
  controlSize?: 'small' | 'middle' | 'large';
  gapSize?: number;
  cardPadding?: number;
  minControlWidth?: number;
  stretchSingleRow?: boolean;
  hideFilterLabels?: boolean;
  enableAsyncSearch?: boolean;
  asyncSearchThreshold?: number;
  asyncSearchRowLimit?: number;
  filterSettings?: Record<string, FilterSetting>;
};

export type CustomFiltersModdedProps = {
  data: TimeseriesDataRecord[];
  width: number;
  height: number;
  formData: CustomFiltersModdedQueryFormData;
  filters: FilterSetField[];
  optionsByFilter: Record<string, FilterSetOption[]>;
  selectedFilters: Record<string, (string | number | boolean | null | undefined)[]>;
  filterSettings: Record<string, FilterSetting>;
  columnTypeMap: Record<string, GenericDataType>;
  setDataMask: SetDataMaskHook;
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
};
