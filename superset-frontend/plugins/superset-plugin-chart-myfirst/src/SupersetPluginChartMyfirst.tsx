import React, { useEffect, useMemo, useRef, useState } from 'react';
import { styled, SupersetClient } from '@superset-ui/core';
import { buildRuntimePivotQueryContext } from './plugin/buildQuery';

const HEADER_ROW_HEIGHT = 42;
const FIRST_COL_WIDTH = 360;
const SIDEBAR_WIDTH = 330;
const ROOT_NODE_KEY = '__root__';
const PATH_SEPARATOR = '||';

type StyleProps = {
  headerBg?: string;
  headerTextColor?: string;
  grandTotalBg?: string;
  expandColor?: string;
  subtotalBg?: string;
  cellTextColor?: string;
  compactDisplay?: boolean;
  showSidebar?: boolean;
};

type PivotCol = {
  key: string;
  values?: string[];
};

type FieldDef = {
  key: string;
  queryKey?: string;
  label: string;
  candidates?: string[];
  queryField?: string | Record<string, any>;
};

type MetricDef = {
  key: string;
  label: string;
  candidates?: string[];
  queryMetric?: any;
};

type ConditionalFormattingRule = {
  column?: string;
  operator?: string;
  targetValue?: number;
  targetValueLeft?: number;
  targetValueRight?: number;
  colorScheme?: string;
};

type NodeAgg = Record<string, Record<string, number>>;

type MetricSummarySqlRule = {
  metric?: string;
  subtotalMode?: string;
  totalMode?: string;
  subtotalSql?: string;
  totalSql?: string;
};

type LoadedNode = {
  pathKey: string;
  pathValues: string[];
  rawPathValues: any[];
  name: string;
  level: number;
  hasChildren: boolean;
  isLeaf: boolean;
  agg: NodeAgg;
  subtotalAgg?: NodeAgg;
};

type Props = {
  data: any[];
  formData?: any;
  ownState?: Record<string, any>;
  filterState?: Record<string, any>;
  hooks?: {
    setDataMask?: (dataMask: Record<string, any>) => void;
    setControlValue?: (
      controlName: string,
      value: any,
      validationErrors?: any[],
    ) => void;
  };
  rows?: FieldDef[];
  columns?: FieldDef[];
  metrics?: MetricDef[];
  defaultMetricKeys?: string[];
  selectableDimensions?: FieldDef[];
  metricSummarySql?: MetricSummarySqlRule[];
  showSidebar?: boolean | string | number;
  myfirstShowSidebar?: boolean | string | number;
  showSubtotals?: boolean;
  showGrandTotals?: boolean;
  showRowTotals?: boolean;
  showColumnTotals?: boolean;
  compactDisplay?: boolean;
  showCellBars?: boolean;
  showHeatmap?: boolean;
  defaultExpandDepth?: number;
  numberFormatDigits?: number;
  nullLabel?: string;
  headerBg?: string;
  headerTextColor?: string;
  grandTotalBg?: string;
  expandColor?: string;
  subtotalBg?: string;
  cellTextColor?: string;
  heatmapPositiveColor?: string;
  heatmapNegativeColor?: string;
  barPositiveColor?: string;
  barNegativeColor?: string;
  conditionalFormatting?: ConditionalFormattingRule[];
  height: number;
  width: number;
};

type FilterDropdownProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
};

type FieldPlacementMenuProps = {
  label: string;
  rowOrder?: number;
  columnOrder?: number;
  onToggleRow: () => void;
  onToggleColumn: () => void;
};

type MetricSelectorProps = {
  metrics: MetricDef[];
  activeMetricKeys: string[];
  onToggle: (metricKey: string) => void;
};

type ChartDataResult = {
  data: any[];
  colnames: string[];
  coltypes?: any[];
};

type PersistedSelection = {
  rowFieldKeys?: string[];
  columnFieldKeys?: string[];
  metricKeys?: string[];
};

const Styles = styled.div<StyleProps>`
  width: 100%;
  height: 100%;
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  position: relative;
  isolation: isolate;

  .pivot-shell {
    display: flex;
    flex-direction: row;
    height: 100%;
    background: #f8fafc;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 18px;
    overflow: hidden;
    box-shadow:
      0 10px 30px rgba(15, 23, 42, 0.08),
      inset 0 1px 0 rgba(255,255,255,0.65);
  }

  .sidebar {
    width: ${({ showSidebar }) => (showSidebar === false ? '0' : `${SIDEBAR_WIDTH}px`)};
    min-width: ${({ showSidebar }) => (showSidebar === false ? '0' : `${SIDEBAR_WIDTH}px`)};
    max-width: ${({ showSidebar }) => (showSidebar === false ? '0' : `${SIDEBAR_WIDTH}px`)};
    height: 100%;
    display: ${({ showSidebar }) => (showSidebar === false ? 'none' : 'flex')};
    flex-direction: column;
    background: rgba(255, 255, 255, 0.96);
    border-right: ${({ showSidebar }) =>
      showSidebar === false ? 'none' : '1px solid rgba(226, 232, 240, 0.9)'};
    overflow: hidden;
    flex: 0 0 auto;
  }

  .sidebar-header {
    padding: ${({ compactDisplay }) => (compactDisplay ? '10px' : '12px')};
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
    background: #fff;
  }

  .sidebar-title {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #0f172a;
    margin-bottom: 8px;
  }

  .sidebar-actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .sidebar-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 6px 8px 8px;
  }

  .content {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #fff;
  }

  .panel {
    background: transparent;
    border: 0;
    border-radius: 0;
    padding: 0;
    min-width: 0;
    overflow: visible;
  }

  .panel-title {
    font-size: 11px;
    letter-spacing: 0.04em;
    color: #64748b;
    margin: 0 0 6px;
    font-weight: 600;
  }

  .hint {
    font-size: 12px;
    color: #64748b;
    line-height: 1.4;
  }

  .btn {
    appearance: none;
    border: 1px solid rgba(226, 232, 240, 1);
    background: #fff;
    border-radius: 8px;
    padding: 7px 8px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    color: #334155;
    transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
    text-align: center;
  }

  .btn:hover {
    background: #f8fafc;
    border-color: rgba(148, 163, 184, 0.65);
  }

  .btn.btn-apply-active {
    background: ${({ headerBg }) => headerBg || '#203247'};
    border-color: ${({ headerBg }) => headerBg || '#203247'};
    color: ${({ headerTextColor }) => headerTextColor || '#fff'};
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
  }

  .btn.btn-apply-active:hover {
    background: ${({ headerBg }) => headerBg || '#203247'};
    border-color: ${({ headerBg }) => headerBg || '#203247'};
    color: ${({ headerTextColor }) => headerTextColor || '#fff'};
    filter: brightness(1.05);
  }

  .btn:disabled {
    cursor: default;
    opacity: 0.55;
    background: #f8fafc;
    border-color: rgba(226, 232, 240, 1);
  }

  .runtime-warning {
    margin: 0 16px 12px;
    padding: 10px 12px;
    border: 1px solid rgba(245, 158, 11, 0.28);
    border-radius: 12px;
    background: rgba(255, 251, 235, 0.92);
    color: #92400e;
    font-size: 12px;
    line-height: 1.45;
  }

  .runtime-query {
    margin: 0 16px 12px;
    padding: 10px 12px;
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 12px;
    background: #f8fafc;
  }

  .runtime-query summary {
    cursor: pointer;
    color: #334155;
    font-size: 12px;
    font-weight: 600;
    list-style: none;
  }

  .runtime-query summary::-webkit-details-marker {
    display: none;
  }

  .runtime-query pre {
    margin: 10px 0 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.5;
    color: #0f172a;
  }

  .field-list {
    display: grid;
    gap: 4px;
  }

  .field-list-header {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr) 28px 28px 14px;
    gap: 8px;
    align-items: center;
    padding: 0 6px 6px;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  }

  .field-axis-label {
    justify-self: center;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #94a3b8;
    text-transform: uppercase;
  }

  .field-card {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr) 28px 28px 14px;
    align-items: center;
    gap: 8px;
    padding: 7px 6px;
    border-bottom: 1px solid rgba(241, 245, 249, 1);
    background: transparent;
  }

  .field-name-large {
    font-size: 12px;
    font-weight: 400;
    color: #334155;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-drag,
  .field-tail-icon {
    color: #cbd5e1;
    font-size: 11px;
    line-height: 1;
    text-align: center;
    user-select: none;
  }

  .field-checkbox {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
    border: 1px solid rgba(226, 232, 240, 1);
    background: #fff;
    color: transparent;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9);
  }

  .field-checkbox:hover {
    border-color: rgba(203, 213, 225, 1);
    background: rgba(248, 250, 252, 0.8);
  }

  .field-checkbox.row.active {
    background: #ffffff;
    color: #2563eb;
    border-color: #93c5fd;
  }

  .field-checkbox.column.active {
    background: #ffffff;
    color: #059669;
    border-color: #86efac;
  }

  .metric-list {
    display: grid;
    gap: 4px;
    margin-top: 8px;
  }

  .metric-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid rgba(226, 232, 240, 1);
    border-radius: 10px;
    background: #fff;
    color: #0f172a;
    font-size: 12px;
    cursor: pointer;
  }

  .metric-item:hover {
    background: #f8fafc;
  }

  .metric-item input {
    margin: 0;
    accent-color: #2563eb;
  }

  .metric-item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown {
    position: relative;
  }

  .dropdown-label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 6px;
  }

  .dropdown-trigger {
    width: 100%;
    text-align: left;
    border: 1px solid rgba(148, 163, 184, 0.34);
    border-radius: 12px;
    background: #fff;
    padding: 10px 12px;
    font-size: 12px;
    color: #0f172a;
    cursor: pointer;
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
  }

  .dropdown-trigger:hover {
    border-color: rgba(59, 130, 246, 0.45);
  }

  .dropdown-summary {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #334155;
  }

  .dropdown-arrow {
    color: #94a3b8;
    font-size: 11px;
    flex: 0 0 auto;
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 1000;
    background: rgba(255,255,255,0.98);
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 14px;
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(12px);
    overflow: hidden;
  }

  .dropdown-actions {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 10px 8px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  }

  .dropdown-link {
    border: 0;
    background: transparent;
    font-size: 11px;
    font-weight: 700;
    color: #2563eb;
    cursor: pointer;
    padding: 0;
  }

  .dropdown-search {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  }

  .dropdown-search input {
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 10px;
    padding: 8px 10px;
    font-size: 12px;
    outline: none;
  }

  .dropdown-list {
    max-height: 260px;
    overflow: auto;
    padding: 6px;
  }

  .dropdown-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 12px;
    color: #334155;
  }

  .dropdown-option:hover {
    background: #eff6ff;
  }

  .dropdown-option input {
    margin: 0;
  }

  .filter-meta {
    color: #94a3b8;
    font-size: 11px;
  }

  .filters-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .table-scroll {
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    background: #fff;
    position: relative;
    z-index: 1;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: ${({ compactDisplay }) => (compactDisplay ? '11px' : '12px')};
  }

  thead th {
    background: ${({ headerBg }) => headerBg || '#203247'};
    color: ${({ headerTextColor }) => headerTextColor || '#fff'};
    padding: 10px 12px;
    font-weight: 700;
    white-space: nowrap;
    border-right: 1px solid rgba(255,255,255,0.08);
    border-bottom: 1px solid rgba(15,23,42,0.18);
    position: sticky;
    z-index: 20;
  }

  thead tr:nth-child(1) th {
    top: 0;
    z-index: 22;
  }

  thead tr:nth-child(2) th {
    top: ${HEADER_ROW_HEIGHT}px;
    z-index: 21;
  }

  .sticky-first {
    position: sticky !important;
    left: 0;
    z-index: 25 !important;
    min-width: ${FIRST_COL_WIDTH}px;
    max-width: ${FIRST_COL_WIDTH}px;
    box-shadow: 1px 0 0 rgba(226, 232, 240, 0.95);
  }

  thead .sticky-first {
    z-index: 30 !important;
  }

  tbody td {
    padding: ${({ compactDisplay }) => (compactDisplay ? '5px 10px' : '8px 12px')};
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
    border-right: 1px solid rgba(241, 245, 249, 1);
    background: rgba(255,255,255,0.95);
    vertical-align: middle;
    color: ${({ cellTextColor }) => cellTextColor || '#0f172a'};
  }

  tbody td:first-child {
    position: sticky;
    left: 0;
    z-index: 10;
    background: rgba(255,255,255,0.98);
    box-shadow: 1px 0 0 rgba(226, 232, 240, 0.95);
  }

  .row-header td:first-child {
    background: #fbfdff;
  }

  .row-header:hover td {
    background-color: #f8fbff;
  }

  .row-header:hover td:first-child {
    background-color: #f1f7ff;
  }

  .metric-value {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .subtotal-row td {
    background: ${({ subtotalBg }) => subtotalBg || '#f6fafe'};
    font-weight: 700;
  }

  .subtotal-row td:first-child {
    background: ${({ subtotalBg }) => subtotalBg || '#edf5ff'};
  }

  .total-row td {
    background: ${({ grandTotalBg }) => grandTotalBg || '#203247'};
    color: #fff;
    font-weight: 800;
    border-right: 1px solid rgba(255,255,255,0.08);
  }

  .expand-icon {
    display: inline-block;
    width: 16px;
    text-align: center;
    margin-right: 4px;
    color: ${({ expandColor }) => expandColor || '#64748b'};
  }

  .empty,
  .table-placeholder {
    padding: 24px;
    text-align: center;
    color: #64748b;
  }
`;

function normalizeValue(value: any, nullLabel: string) {
  if (value === null || value === undefined || value === '') return nullLabel;
  if (typeof value === 'object') {
    if ('value' in value) return String(value.value);
    if ('label' in value) return String(value.label);
    return JSON.stringify(value);
  }
  return String(value);
}

function getFieldRawValue(record: Record<string, any>, field: FieldDef) {
  const candidateKeys = Array.from(
    new Set([field.queryKey, field.key, ...(field.candidates || []), field.label].filter(Boolean)),
  );

  for (const candidate of candidateKeys) {
    if (Object.prototype.hasOwnProperty.call(record, candidate)) {
      return record[candidate];
    }
  }

  return undefined;
}

function getMetricRawValue(record: Record<string, any>, metric: MetricDef) {
  const candidateKeys = Array.from(
    new Set([metric.key, metric.label, ...(metric.candidates || [])].filter(Boolean)),
  );

  for (const candidate of candidateKeys) {
    if (Object.prototype.hasOwnProperty.call(record, candidate)) {
      return record[candidate];
    }
  }

  return undefined;
}

function toBoolean(value: unknown, defaultValue = true): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['false', '0', 'off', 'no', 'null', 'undefined', ''].includes(normalized)) return false;
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
  }
  return Boolean(value);
}

function withAlpha(color: string, alpha: number) {
  const normalized = color.trim();
  const safeAlpha = Math.max(0, Math.min(alpha, 1));

  if (normalized.startsWith('#')) {
    let hex = normalized.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(char => char + char)
        .join('');
    }
    if (hex.length === 6) {
      const red = parseInt(hex.slice(0, 2), 16);
      const green = parseInt(hex.slice(2, 4), 16);
      const blue = parseInt(hex.slice(4, 6), 16);
      if ([red, green, blue].every(channel => !Number.isNaN(channel))) {
        return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
      }
    }
  }

  return normalized;
}

function evaluateCondition(value: number, operator: string, threshold: number) {
  switch (operator) {
    case '>':
      return value > threshold;
    case '>=':
    case '≥':
      return value >= threshold;
    case '<':
      return value < threshold;
    case '<=':
    case '≤':
      return value <= threshold;
    case '=':
      return value === threshold;
    case '!=':
    case '≠':
      return value !== threshold;
    case 'None':
      return true;
    default:
      return false;
  }
}

function evaluateConditionalRule(
  value: number,
  rule: ConditionalFormattingRule,
) {
  switch (rule.operator) {
    case undefined:
    case 'None':
      return true;
    case '< x <':
      return (
        Number.isFinite(rule.targetValueLeft) &&
        Number.isFinite(rule.targetValueRight) &&
        value > Number(rule.targetValueLeft) &&
        value < Number(rule.targetValueRight)
      );
    case '≤ x ≤':
      return (
        Number.isFinite(rule.targetValueLeft) &&
        Number.isFinite(rule.targetValueRight) &&
        value >= Number(rule.targetValueLeft) &&
        value <= Number(rule.targetValueRight)
      );
    case '≤ x <':
      return (
        Number.isFinite(rule.targetValueLeft) &&
        Number.isFinite(rule.targetValueRight) &&
        value >= Number(rule.targetValueLeft) &&
        value < Number(rule.targetValueRight)
      );
    case '< x ≤':
      return (
        Number.isFinite(rule.targetValueLeft) &&
        Number.isFinite(rule.targetValueRight) &&
        value > Number(rule.targetValueLeft) &&
        value <= Number(rule.targetValueRight)
      );
    default:
      return Number.isFinite(rule.targetValue)
        ? evaluateCondition(value, rule.operator || 'None', Number(rule.targetValue))
        : false;
  }
}

function getConditionalFormattingColors(colorScheme?: string) {
  switch (colorScheme) {
    case 'colorSuccessBg':
    case 'Green':
      return { backgroundColor: '#dcfce7', color: '#166534' };
    case 'colorWarningBg':
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case 'colorErrorBg':
    case 'Red':
      return { backgroundColor: '#fee2e2', color: '#991b1b' };
    default:
      return undefined;
  }
}

function buildSqlMetric(label: string, sqlExpression: string) {
  return {
    expressionType: 'SQL',
    sqlExpression,
    label,
    optionName: label,
  };
}

function inferSummaryMode(
  rule: MetricSummarySqlRule | undefined,
  kind: 'subtotal' | 'total',
) {
  const explicitMode = kind === 'subtotal' ? rule?.subtotalMode : rule?.totalMode;
  const sql = (kind === 'subtotal' ? rule?.subtotalSql : rule?.totalSql)?.trim();

  if (explicitMode && explicitMode !== 'custom_sql') return explicitMode;
  if (explicitMode === 'custom_sql' && !sql) return 'custom_sql';

  if (!sql) return 'default';

  const normalized = sql.toUpperCase();
  if (normalized.startsWith('SUM(')) return 'sum';
  if (normalized.startsWith('AVG(')) return 'avg';
  if (normalized.startsWith('MIN(')) return 'min';
  if (normalized.startsWith('MAX(')) return 'max';
  if (normalized.startsWith('COUNT(')) return 'count';
  return explicitMode === 'custom_sql' ? 'custom_sql' : 'default';
}

function applySummaryMode(values: number[], mode: string) {
  if (!values.length) return 0;

  switch (mode) {
    case 'avg':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'count':
      return values.length;
    case 'sum':
    case 'custom_sql':
    case 'default':
    default:
      return values.reduce((sum, value) => sum + value, 0);
  }
}

function getMetricSummaryRule(
  metric: MetricDef,
  metricSummaryMap: Record<string, MetricSummarySqlRule>,
) {
  return (
    metricSummaryMap[metric.key] ||
    metricSummaryMap[metric.label] ||
    (metric.candidates || [])
      .map(candidate => metricSummaryMap[candidate])
      .find(Boolean)
  );
}

function formatPivotColumnLabel(col: PivotCol, columnFields: FieldDef[]) {
  if (!columnFields.length) return 'Значение';
  const values = col.values || [];
  return columnFields
    .map((field, index) => `${field.label}: ${values[index] ?? '—'}`)
    .join(' | ');
}

function formatPivotColumnValues(col: PivotCol, columnFields: FieldDef[]) {
  if (!columnFields.length) return 'Значение';
  const values = col.values || [];
  return columnFields
    .map((_, index) => values[index] ?? '—')
    .join(' | ');
}

function arraysEqual(a: FieldDef[] = [], b: FieldDef[] = []) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i]?.key !== b[i]?.key ||
      a[i]?.queryKey !== b[i]?.queryKey ||
      a[i]?.label !== b[i]?.label
    ) {
      return false;
    }
  }
  return true;
}

function metricKeysEqual(a: string[] = [], b: string[] = []) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function getSelectionStorageKey(formData?: Record<string, any>) {
  const sliceId = formData?.slice_id ?? formData?.sliceId;
  const datasource = formData?.datasource;
  const datasourceId =
    typeof datasource === 'string'
      ? datasource
      : datasource?.id ?? datasource?.value ?? datasource?.datasource_id;
  const resolvedKey = sliceId ?? datasourceId;
  return resolvedKey ? `myfirst-pivot-selection:${resolvedKey}` : undefined;
}

function loadPersistedSelection(storageKey?: string): PersistedSelection | null {
  if (!storageKey || typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : null;
  } catch {
    return null;
  }
}

function persistSelection(storageKey: string | undefined, selection: PersistedSelection) {
  if (!storageKey || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(selection));
  } catch {
    // Ignore storage errors in embedded/private contexts.
  }
}

function serializePathValue(value: any) {
  if (value === null) return 'null:';
  if (value === undefined) return 'undefined:';
  if (typeof value === 'string') return `string:${value}`;
  if (typeof value === 'number') return `number:${value}`;
  if (typeof value === 'boolean') return `boolean:${value}`;
  if (typeof value === 'object') return `object:${JSON.stringify(value)}`;
  return `${typeof value}:${String(value)}`;
}

function pathToKey(pathValues: any[]) {
  return pathValues.map(serializePathValue).join(PATH_SEPARATOR);
}

function aggregateNode(
  records: any[],
  colFields: FieldDef[],
  metrics: MetricDef[],
  nullLabel: string,
  metricSummaryMap: Record<string, MetricSummarySqlRule> = {},
  kind: 'subtotal' | 'total' = 'subtotal',
): { cols: PivotCol[]; agg: NodeAgg } {
  const colsMap = new Map<string, PivotCol>();
  const agg: NodeAgg = {};

  records.forEach(item => {
    const colValues = colFields.length
      ? colFields.map(field => normalizeValue(getFieldRawValue(item, field), nullLabel))
      : ['Значение'];
    const colKey = colValues.join('|');

    if (!colsMap.has(colKey)) {
      colsMap.set(colKey, { key: colKey, values: colValues });
    }

    if (!agg[colKey]) agg[colKey] = {};

    metrics.forEach(metric => {
      const raw = getMetricRawValue(item, metric);
      const num =
        typeof raw === 'number'
          ? raw
          : raw === null || raw === undefined || raw === ''
            ? 0
            : Number(raw) || 0;
      if (!Array.isArray((agg[colKey] as any)[`${metric.key}__values`])) {
        (agg[colKey] as any)[`${metric.key}__values`] = [];
      }
      (agg[colKey] as any)[`${metric.key}__values`].push(num);
    });
  });

  const cols = Array.from(colsMap.values()).sort((a, b) =>
    (a.values || []).join('¦').localeCompare((b.values || []).join('¦')),
  );

  if (!cols.length) {
    cols.push({ key: 'Значение', values: ['Значение'] });
  }

  cols.forEach(col => {
    if (!agg[col.key]) {
      agg[col.key] = {};
    }

    metrics.forEach(metric => {
      const values = Array.isArray((agg[col.key] as any)[`${metric.key}__values`])
        ? ((agg[col.key] as any)[`${metric.key}__values`] as number[])
        : [];
      const rule = getMetricSummaryRule(metric, metricSummaryMap);
      const mode = inferSummaryMode(rule, kind);
      agg[col.key][metric.key] = applySummaryMode(values, mode);
      delete (agg[col.key] as any)[`${metric.key}__values`];
    });
  });

  return { cols, agg };
}

function mergeNodeAggs(
  nodes: LoadedNode[],
  subtotalNodes: LoadedNode[],
) {
  const subtotalMap = new Map(subtotalNodes.map(node => [node.pathKey, node.subtotalAgg ?? node.agg]));
  return nodes.map(node => ({
    ...node,
    subtotalAgg: subtotalMap.get(node.pathKey),
  }));
}

function buildLoadedNodes(
  records: any[],
  rowFields: FieldDef[],
  columnFields: FieldDef[],
  metrics: MetricDef[],
  nullLabel: string,
  parentRawPathValues: any[] = [],
  parentPathValues: string[] = [],
): LoadedNode[] {
  const level = parentRawPathValues.length;
  const currentField = rowFields[level];
  if (!currentField) return [];

  const grouped = new Map<any, any[]>();

  records.forEach(record => {
    const rawValue = getFieldRawValue(record, currentField) ?? null;
    if (!grouped.has(rawValue)) {
      grouped.set(rawValue, []);
    }
    grouped.get(rawValue)!.push(record);
  });

  return Array.from(grouped.entries())
    .sort((a, b) =>
      normalizeValue(a[0], nullLabel).localeCompare(normalizeValue(b[0], nullLabel), 'ru'),
    )
    .map(([rawValue, rows]) => {
      const name = normalizeValue(rawValue, nullLabel);
      const rawPathValues = [...parentRawPathValues, rawValue];
      const pathValues = [...parentPathValues, name];
      const pathKey = pathToKey(rawPathValues);
      const { agg } = aggregateNode(rows, columnFields, metrics, nullLabel, {}, 'subtotal');
      const hasChildren = level < rowFields.length - 1;

      return {
        pathKey,
        pathValues,
        rawPathValues,
        name,
        level,
        hasChildren,
        isLeaf: !hasChildren,
        agg,
      };
    });
}

function buildHierarchyState(
  records: any[],
  rowFields: FieldDef[],
  columnFields: FieldDef[],
  metrics: MetricDef[],
  nullLabel: string,
  metricSummaryRules: MetricSummarySqlRule[],
) {
  const nodesByPath: Record<string, LoadedNode> = {};
  const childrenByParent: Record<string, string[]> = {
    [ROOT_NODE_KEY]: [],
  };
  const metricSummaryMap = metricSummaryRules.reduce<Record<string, MetricSummarySqlRule>>(
    (acc, rule) => {
      if (rule.metric) {
        acc[rule.metric] = rule;
      }
      return acc;
    },
    {},
  );

  const visit = (
    levelRecords: any[],
    parentPathKey: string,
    parentRawPathValues: any[] = [],
    parentPathValues: string[] = [],
  ) => {
    const level = parentRawPathValues.length;
    const currentField = rowFields[level];

    if (!currentField) {
      childrenByParent[parentPathKey] = [];
      return;
    }

    const grouped = new Map<any, any[]>();

    levelRecords.forEach(record => {
      const rawValue = getFieldRawValue(record, currentField) ?? null;
      if (!grouped.has(rawValue)) {
        grouped.set(rawValue, []);
      }
      grouped.get(rawValue)!.push(record);
    });

    const childNodes = Array.from(grouped.entries())
      .sort((a, b) =>
        normalizeValue(a[0], nullLabel).localeCompare(normalizeValue(b[0], nullLabel), 'ru'),
      )
      .map(([rawValue, groupedRows]) => {
        const name = normalizeValue(rawValue, nullLabel);
        const rawPathValues = [...parentRawPathValues, rawValue];
        const pathValues = [...parentPathValues, name];
        const pathKey = pathToKey(rawPathValues);
        const { agg } = aggregateNode(
          groupedRows,
          columnFields,
          metrics,
          nullLabel,
          metricSummaryMap,
          'subtotal',
        );
        const hasChildren = level < rowFields.length - 1;

        const node: LoadedNode = {
          pathKey,
          pathValues,
          rawPathValues,
          name,
          level,
          hasChildren,
          isLeaf: !hasChildren,
          agg,
        };

        nodesByPath[pathKey] = node;
        if (hasChildren) {
          visit(groupedRows, pathKey, rawPathValues, pathValues);
        } else {
          childrenByParent[pathKey] = [];
        }
        return node;
      });

    childrenByParent[parentPathKey] = childNodes.map(node => node.pathKey);
  };

  if (rowFields.length && metrics.length) {
    visit(records, ROOT_NODE_KEY);
  }

  const totals = aggregateNode(
    records,
    columnFields,
    metrics,
    nullLabel,
    metricSummaryMap,
    'total',
  );

  return {
    nodesByPath,
    childrenByParent,
    pivotCols: totals.cols,
    grandAgg: totals.agg,
  };
}

function normalizeFetchedRecords(
  records: any[],
  colnames: string[],
  rowFields: FieldDef[],
  columnFields: FieldDef[],
  metrics: MetricDef[],
) {
  if (!records.length || !colnames.length) return records;

  const dimensions = [...rowFields, ...columnFields];
  const availableColnames = [...colnames];

  const pickMatchingColname = (candidates: string[]) => {
    const normalizedCandidates = candidates.map(candidate => candidate.trim().toLowerCase());
    const matched = availableColnames.find(col =>
      normalizedCandidates.includes(col.trim().toLowerCase()),
    );
    if (!matched) return undefined;
    availableColnames.splice(availableColnames.indexOf(matched), 1);
    return matched;
  };

  const dimensionSourceKeys = dimensions.map(field =>
    pickMatchingColname(
      Array.from(
        new Set([field.queryKey, field.key, ...(field.candidates || []), field.label].filter(Boolean)),
      ),
    ),
  );

  const metricSourceKeys = metrics.map(metric =>
    pickMatchingColname(
      Array.from(
        new Set([metric.key, metric.label, ...(metric.candidates || [])].filter(Boolean)),
      ),
    ),
  );

  return records.map(record => {
    const nextRecord = { ...record };

    dimensions.forEach((field, index) => {
      const sourceKey = dimensionSourceKeys[index];
      if (!sourceKey || !Object.prototype.hasOwnProperty.call(record, sourceKey)) return;
      [field.queryKey, field.key, ...(field.candidates || []), field.label]
        .filter(Boolean)
        .forEach(targetKey => {
          if (!Object.prototype.hasOwnProperty.call(nextRecord, targetKey)) {
            nextRecord[targetKey] = record[sourceKey];
          }
        });
    });

    metrics.forEach((metric, index) => {
      const sourceKey = metricSourceKeys[index];
      if (!sourceKey || !Object.prototype.hasOwnProperty.call(record, sourceKey)) return;
      [metric.key, metric.label, ...(metric.candidates || [])]
        .filter(Boolean)
        .forEach(targetKey => {
          if (!Object.prototype.hasOwnProperty.call(nextRecord, targetKey)) {
            nextRecord[targetKey] = record[sourceKey];
          }
        });
    });

    return nextRecord;
  });
}

function FilterDropdown({ label, options, selected, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter(item => item.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const summary = selected.length
    ? selected.length <= 2
      ? selected.join(', ')
      : `Выбрано: ${selected.length}`
    : 'Все значения';

  const toggleValue = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
  };

  return (
    <div className="dropdown" ref={rootRef}>
      <label className="dropdown-label">{label}</label>
      <button type="button" className="dropdown-trigger" onClick={() => setOpen(prev => !prev)}>
        <span className="dropdown-summary">{summary}</span>
        <span className="dropdown-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-actions">
            <button type="button" className="dropdown-link" onClick={() => onChange(options)}>
              Выбрать все
            </button>
            <button type="button" className="dropdown-link" onClick={() => onChange([])}>
              Сбросить
            </button>
          </div>

          <div className="dropdown-search">
            <input
              value={search}
              onChange={e => setSearch(e.currentTarget.value)}
              placeholder="Поиск..."
            />
          </div>

          <div className="dropdown-list">
            {filteredOptions.map(option => (
              <label key={`${label}-${option}`} className="dropdown-option">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleValue(option)}
                />
                <span>{option}</span>
              </label>
            ))}
            {!filteredOptions.length && <div className="filter-meta">Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldPlacementMenu({
  label,
  rowOrder,
  columnOrder,
  onToggleRow,
  onToggleColumn,
}: FieldPlacementMenuProps) {
  return (
    <div className="field-card">
      <span className="field-drag" aria-hidden="true">⋮⋮</span>
      <span className="field-name-large" title={label}>
        {label}
      </span>
      <button
        type="button"
        className={`field-checkbox row ${rowOrder ? 'active' : ''}`}
        onClick={onToggleRow}
        aria-label={`Назначить поле ${label} в строки`}
      >
        {rowOrder ?? ''}
      </button>
      <button
        type="button"
        className={`field-checkbox column ${columnOrder ? 'active' : ''}`}
        onClick={onToggleColumn}
        aria-label={`Назначить поле ${label} в столбцы`}
      >
        {columnOrder ?? ''}
      </button>
      <span className="field-tail-icon" aria-hidden="true">▽</span>
    </div>
  );
}

function MetricSelector({ metrics, activeMetricKeys, onToggle }: MetricSelectorProps) {
  return (
    <div className="metric-list">
      {metrics.map(metric => (
        <label key={metric.key} className="metric-item">
          <input
            type="checkbox"
            checked={activeMetricKeys.includes(metric.key)}
            onChange={() => onToggle(metric.key)}
          />
          <span>{metric.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function SupersetPluginChartMyfirst(props: Props) {
  const {
    data = [],
    formData,
    ownState,
    filterState,
    hooks,
    rows = [],
    columns = [],
    metrics = [],
    defaultMetricKeys = [],
    selectableDimensions = [],
    showSidebar: rawShowSidebar,
    myfirstShowSidebar: rawMyfirstShowSidebar,
    showSubtotals = true,
    showGrandTotals = true,
    showRowTotals = true,
    showColumnTotals = true,
    compactDisplay = false,
    showCellBars = true,
    showHeatmap = true,
    defaultExpandDepth = 0,
    numberFormatDigits = 2,
    nullLabel = '—',
    headerBg,
    headerTextColor,
    grandTotalBg,
    expandColor,
    subtotalBg,
    cellTextColor,
    heatmapPositiveColor = '#22c55e',
    heatmapNegativeColor = '#ef4444',
    barPositiveColor = '#22c55e',
    barNegativeColor = '#ef4444',
    conditionalFormatting = [],
    metricSummarySql = [],
    height,
    width,
  } = props;

  const resolvedShowSidebar = useMemo(() => {
    if (rawMyfirstShowSidebar !== undefined) return toBoolean(rawMyfirstShowSidebar, true);
    if (rawShowSidebar !== undefined) return toBoolean(rawShowSidebar, true);
    return true;
  }, [rawMyfirstShowSidebar, rawShowSidebar]);

  const availableDimensions = useMemo(() => {
    const merged = [...(selectableDimensions || []), ...(rows || []), ...(columns || [])];
    const map = new Map<string, FieldDef>();

    merged.forEach(field => {
      if (field?.key && !map.has(field.key)) {
        map.set(field.key, field);
      }
    });

    return Array.from(map.values());
  }, [selectableDimensions, rows, columns]);

  const selectionStorageKey = useMemo(() => getSelectionStorageKey(formData), [formData]);
  const runtimeFilterSignature = useMemo(
    () =>
      JSON.stringify({
        extra_form_data: formData?.extra_form_data || null,
        extra_filters: formData?.extra_filters || null,
        adhoc_filters: formData?.adhoc_filters || null,
        ownState: ownState || null,
        filterState: filterState || null,
      }),
    [formData, ownState, filterState],
  );

  const [rowFields, setRowFields] = useState<FieldDef[]>(rows || []);
  const [columnFields, setColumnFields] = useState<FieldDef[]>(columns || []);
  const [activeMetricKeys, setActiveMetricKeys] = useState<string[]>(defaultMetricKeys);
  const [appliedRowFields, setAppliedRowFields] = useState<FieldDef[]>(rows || []);
  const [appliedColumnFields, setAppliedColumnFields] = useState<FieldDef[]>(columns || []);
  const [appliedMetricKeys, setAppliedMetricKeys] = useState<string[]>(defaultMetricKeys);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [queryData, setQueryData] = useState<any[]>([]);
  const [runtimeQuery, setRuntimeQuery] = useState('');
  const [isRuntimeRowLimitReached, setIsRuntimeRowLimitReached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestVersionRef = useRef(0);
  const [selectionRestored, setSelectionRestored] = useState(false);

  const lastExternalRowsRef = useRef<FieldDef[]>(rows || []);
  const lastExternalColumnsRef = useRef<FieldDef[]>(columns || []);

  useEffect(() => {
    setSelectionRestored(false);
  }, [selectionStorageKey]);

  useEffect(() => {
    if (selectionRestored) return;

    const persisted = loadPersistedSelection(selectionStorageKey);
    if (!persisted) {
      setSelectionRestored(true);
      return;
    }

    const fieldMap = new Map(availableDimensions.map(field => [field.key, field]));
    const metricMap = new Map(metrics.map(metric => [metric.key, metric]));

    const restoredRows = (persisted.rowFieldKeys || [])
      .map(key => fieldMap.get(key))
      .filter((field): field is FieldDef => Boolean(field));
    const restoredColumns = (persisted.columnFieldKeys || [])
      .map(key => fieldMap.get(key))
      .filter((field): field is FieldDef => Boolean(field));
    const restoredMetricKeys = (persisted.metricKeys || []).filter(metricKey => metricMap.has(metricKey));

    if (restoredRows.length || restoredColumns.length || restoredMetricKeys.length) {
      setRowFields(restoredRows.length ? restoredRows : rows || []);
      setColumnFields(restoredColumns.length ? restoredColumns : columns || []);
      setAppliedRowFields(restoredRows.length ? restoredRows : rows || []);
      setAppliedColumnFields(restoredColumns.length ? restoredColumns : columns || []);

      const fallbackMetricKeys = defaultMetricKeys.filter(metricKey => metricMap.has(metricKey));
      const nextMetricKeys = restoredMetricKeys.length
        ? restoredMetricKeys
        : fallbackMetricKeys.length
          ? fallbackMetricKeys
          : metrics.map(metric => metric.key);
      setActiveMetricKeys(nextMetricKeys);
      setAppliedMetricKeys(nextMetricKeys);
    }

    setSelectionRestored(true);
  }, [
    selectionRestored,
    selectionStorageKey,
    availableDimensions,
    metrics,
    rows,
    columns,
    defaultMetricKeys,
  ]);

  useEffect(() => {
    const nextRows = rows || [];
    const nextColumns = columns || [];

    const rowsChanged = !arraysEqual(lastExternalRowsRef.current, nextRows);
    const columnsChanged = !arraysEqual(lastExternalColumnsRef.current, nextColumns);

    if (rowsChanged || columnsChanged) {
      setRowFields(nextRows);
      setColumnFields(nextColumns);
      setAppliedRowFields(nextRows);
      setAppliedColumnFields(nextColumns);
      setExpanded(new Set());
      lastExternalRowsRef.current = [...nextRows];
      lastExternalColumnsRef.current = [...nextColumns];
    }
  }, [rows, columns]);

  useEffect(() => {
    const nextMetricKeys = (metrics || []).map(metric => metric.key);
    setActiveMetricKeys(prev => {
      const filtered = prev.filter(metricKey => nextMetricKeys.includes(metricKey));
      if (filtered.length) return filtered;
      const defaultKeys = defaultMetricKeys.filter(metricKey => nextMetricKeys.includes(metricKey));
      return defaultKeys.length ? defaultKeys : nextMetricKeys;
    });
    setAppliedMetricKeys(prev => {
      const filtered = prev.filter(metricKey => nextMetricKeys.includes(metricKey));
      if (filtered.length) return filtered;
      const defaultKeys = defaultMetricKeys.filter(metricKey => nextMetricKeys.includes(metricKey));
      return defaultKeys.length ? defaultKeys : nextMetricKeys;
    });
  }, [metrics, defaultMetricKeys]);

  const activeMetrics = useMemo(
    () => metrics.filter(metric => activeMetricKeys.includes(metric.key)),
    [metrics, activeMetricKeys],
  );

  const appliedMetrics = useMemo(
    () => metrics.filter(metric => appliedMetricKeys.includes(metric.key)),
    [metrics, appliedMetricKeys],
  );

  useEffect(() => {
    let cancelled = false;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    const refreshData = async () => {
      if (
        !formData ||
        !appliedMetrics.length ||
        (!appliedRowFields.length && !appliedColumnFields.length)
      ) {
        setQueryData([]);
        setRuntimeQuery('');
        setIsRuntimeRowLimitReached(false);
        return;
      }

      setIsLoading(true);

      try {
        const queryContext = buildRuntimePivotQueryContext(formData, {
          ownState: {
            pivotSelection: {
              rowFields: appliedRowFields.map(field => field.queryField || field.queryKey || field.key),
              columnFields: appliedColumnFields.map(
                field => field.queryField || field.queryKey || field.key,
              ),
              metricKeys: appliedMetrics.map(metric => metric.key),
            },
          },
        });
        const { json } = await SupersetClient.post({
          endpoint: '/api/v1/myfirst_pivot/data',
          jsonPayload: {
            form_data: formData,
            query_context: queryContext,
          },
        });

        const result = (json as any)?.result as ChartDataResult | undefined;
        const fetchedData = Array.isArray(result?.data) ? result.data : [];
        const runtimeRowLimit = Number((queryContext as any)?.queries?.[0]?.row_limit ?? 0);
        if (!cancelled && requestVersionRef.current === requestVersion) {
          setQueryData(fetchedData);
          setRuntimeQuery(typeof (result as any)?.query === 'string' ? (result as any).query : '');
          setIsRuntimeRowLimitReached(
            Boolean(runtimeRowLimit) && fetchedData.length >= runtimeRowLimit,
          );
        }
      } catch {
        if (!cancelled && requestVersionRef.current === requestVersion) {
          setQueryData([]);
          setRuntimeQuery('');
          setIsRuntimeRowLimitReached(false);
        }
      } finally {
        if (!cancelled && requestVersionRef.current === requestVersion) {
          setIsLoading(false);
        }
      }
    };

    void refreshData();

    return () => {
      cancelled = true;
    };
  }, [formData, runtimeFilterSignature, data, appliedRowFields, appliedColumnFields, appliedMetrics]);

  const hierarchyState = useMemo(
    () =>
      buildHierarchyState(
        queryData,
        appliedRowFields,
        appliedColumnFields,
        appliedMetrics,
        nullLabel,
        metricSummarySql,
      ),
    [queryData, appliedRowFields, appliedColumnFields, appliedMetrics, nullLabel, metricSummarySql],
  );

  const { nodesByPath, childrenByParent, pivotCols, grandAgg } = hierarchyState;

  const defaultExpanded = useMemo(() => {
    const nextExpanded = new Set<string>();

    if (defaultExpandDepth > 0) {
      Object.values(nodesByPath).forEach(node => {
        if (node.hasChildren && node.level < defaultExpandDepth) {
          nextExpanded.add(node.pathKey);
        }
      });
    }

    return nextExpanded;
  }, [nodesByPath, defaultExpandDepth]);

  useEffect(() => {
    setExpanded(new Set(defaultExpanded));
  }, [defaultExpanded]);

  const visibleNodes = useMemo(() => {
    const result: LoadedNode[] = [];

    const walk = (parentPathKey: string) => {
      const childKeys = childrenByParent[parentPathKey] || [];
      childKeys.forEach(pathKey => {
        const node = nodesByPath[pathKey];
        if (!node) return;
        result.push(node);
        if (expanded.has(pathKey)) {
          walk(pathKey);
        }
      });
    };

    walk(ROOT_NODE_KEY);
    return result;
  }, [childrenByParent, nodesByPath, expanded]);

  const metricRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number; maxAbs: number }> = {};

    appliedMetrics.forEach(metric => {
      const vals: number[] = [];

      visibleNodes.forEach(node => {
        pivotCols.forEach(col => {
          const value = node.agg[col.key]?.[metric.key];
          if (typeof value === 'number' && !Number.isNaN(value)) {
            vals.push(value);
          }
        });
      });

      if (!vals.length) {
        ranges[metric.key] = { min: 0, max: 0, maxAbs: 0 };
      } else {
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        ranges[metric.key] = { min, max, maxAbs: Math.max(Math.abs(min), Math.abs(max)) };
      }
    });

    return ranges;
  }, [appliedMetrics, visibleNodes, pivotCols]);

  const formatValue = (value: any) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    if (typeof value === 'number') {
      return value.toLocaleString('ru-RU', {
        minimumFractionDigits: numberFormatDigits,
        maximumFractionDigits: numberFormatDigits,
      });
    }
    return String(value);
  };

  const getNodeAggValue = (node: LoadedNode, colKey: string, metricKey: string) =>
    (node.hasChildren && node.subtotalAgg ? node.subtotalAgg[colKey]?.[metricKey] : node.agg[colKey]?.[metricKey]) ??
    null;

  const getNodeTotal = (node: LoadedNode) =>
    Object.keys(node.hasChildren && node.subtotalAgg ? node.subtotalAgg : node.agg).reduce(
      (sum, colKey) =>
        sum +
        appliedMetrics.reduce(
          (metricSum, metric) =>
            metricSum +
            ((node.hasChildren && node.subtotalAgg ? node.subtotalAgg[colKey]?.[metric.key] : node.agg[colKey]?.[metric.key]) || 0),
          0,
        ),
      0,
    );

  const calculateColTotal = (col: PivotCol, metricKey: string) => grandAgg[col.key]?.[metricKey] || 0;

  const calculateGrandTotal = () =>
    Object.keys(grandAgg).reduce(
      (sum, colKey) =>
        sum +
        appliedMetrics.reduce(
          (metricSum, metric) => metricSum + (grandAgg[colKey]?.[metric.key] || 0),
          0,
        ),
      0,
    );

  const toggleExpand = (node: LoadedNode) => {
    if (!node.hasChildren) return;
    const isExpandedNow = expanded.has(node.pathKey);

    if (isExpandedNow) {
      setExpanded(prev => {
        const next = new Set(prev);
        next.delete(node.pathKey);
        return next;
      });
      return;
    }

    setExpanded(prev => new Set(prev).add(node.pathKey));
  };

  const handlePlacementChange = (field: FieldDef, placement: 'off' | 'row' | 'column') => {
    const nextRows = rowFields.filter(item => item.key !== field.key);
    const nextCols = columnFields.filter(item => item.key !== field.key);

    if (placement === 'row') {
      setRowFields([...nextRows, field]);
      setColumnFields(nextCols);
      return;
    }

    if (placement === 'column') {
      setRowFields(nextRows);
      setColumnFields([...nextCols, field]);
      return;
    }

    setRowFields(nextRows);
    setColumnFields(nextCols);
  };

  const getPlacement = (field: FieldDef) => {
    if (rowFields.some(item => item.key === field.key)) return 'row';
    if (columnFields.some(item => item.key === field.key)) return 'column';
    return 'off';
  };

  const getRowOrder = (field: FieldDef) => {
    const index = rowFields.findIndex(item => item.key === field.key);
    return index >= 0 ? index + 1 : undefined;
  };

  const getColumnOrder = (field: FieldDef) => {
    const index = columnFields.findIndex(item => item.key === field.key);
    return index >= 0 ? index + 1 : undefined;
  };

  const orderedDimensions = useMemo(() => {
    const rowOrder = new Map(rowFields.map((field, index) => [field.key, index]));
    const columnOrder = new Map(columnFields.map((field, index) => [field.key, index]));

    return [...availableDimensions].sort((left, right) => {
      const leftPlacement = getPlacement(left);
      const rightPlacement = getPlacement(right);

      const priority = { row: 0, column: 1, off: 2 } as const;
      const placementDelta = priority[leftPlacement] - priority[rightPlacement];
      if (placementDelta !== 0) return placementDelta;

      if (leftPlacement === 'row' && rightPlacement === 'row') {
        return (rowOrder.get(left.key) ?? 0) - (rowOrder.get(right.key) ?? 0);
      }

      if (leftPlacement === 'column' && rightPlacement === 'column') {
        return (columnOrder.get(left.key) ?? 0) - (columnOrder.get(right.key) ?? 0);
      }

      return left.label.localeCompare(right.label, 'ru');
    });
  }, [availableDimensions, rowFields, columnFields]);

  const toggleMetric = (metricKey: string) => {
    setActiveMetricKeys(prev =>
      prev.includes(metricKey) ? prev.filter(key => key !== metricKey) : [...prev, metricKey],
    );
  };

  const toggleFieldPlacement = (field: FieldDef, placement: 'row' | 'column') => {
    const currentPlacement = getPlacement(field);
    if (currentPlacement === placement) {
      handlePlacementChange(field, 'off');
      return;
    }
    handlePlacementChange(field, placement);
  };

  const hasPendingChanges = useMemo(() => {
    if (!arraysEqual(rowFields, appliedRowFields)) return true;
    if (!arraysEqual(columnFields, appliedColumnFields)) return true;
    return !metricKeysEqual(activeMetricKeys, appliedMetricKeys);
  }, [rowFields, appliedRowFields, columnFields, appliedColumnFields, activeMetricKeys, appliedMetricKeys]);

  const applySelection = () => {
    setAppliedRowFields(rowFields);
    setAppliedColumnFields(columnFields);
    setAppliedMetricKeys(activeMetricKeys);
    setExpanded(new Set());
    persistSelection(selectionStorageKey, {
      rowFieldKeys: rowFields.map(field => field.key),
      columnFieldKeys: columnFields.map(field => field.key),
      metricKeys: activeMetricKeys,
    });
  };

  const clearFilters = () => {
    setActiveMetricKeys(metrics.map(metric => metric.key));
    setRowFields(rows || []);
    setColumnFields(columns || []);
  };

  const expandAll = () => {
    const nextExpanded = new Set<string>();
    Object.values(nodesByPath).forEach(node => {
      if (node.hasChildren) {
        nextExpanded.add(node.pathKey);
      }
    });
    setExpanded(nextExpanded);
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const getCellStyle = (value: number | null, metricKey: string): React.CSSProperties => {
    if (value === null || value === undefined || Number.isNaN(value)) return {};
    const style: React.CSSProperties = {};
    const range = metricRanges[metricKey];
    const metricDef = appliedMetrics.find(metric => metric.key === metricKey);
    const applicableConditionalRules = conditionalFormatting.filter(rule => {
      const column = rule.column?.trim().toLowerCase();
      if (!column) return false;
      return (
        metricKey.toLowerCase() === column ||
        metricDef?.label.trim().toLowerCase() === column
      );
    });

    if (showHeatmap && range) {
      if (range.min < 0 && range.max > 0 && range.maxAbs > 0) {
        const intensity = Math.min(Math.abs(value) / range.maxAbs, 1);
        if (value < 0) {
          style.backgroundColor = withAlpha(heatmapNegativeColor, 0.06 + intensity * 0.26);
        } else if (value > 0) {
          style.backgroundColor = withAlpha(heatmapPositiveColor, 0.06 + intensity * 0.26);
        }
      } else if (range.max !== range.min) {
        const intensity = (value - range.min) / (range.max - range.min);
        style.backgroundColor = withAlpha(
          value < 0 ? heatmapNegativeColor : heatmapPositiveColor,
          0.05 + intensity * 0.18,
        );
      } else {
        style.backgroundColor = withAlpha(value < 0 ? heatmapNegativeColor : heatmapPositiveColor, 0.07);
      }
    }

    if (showCellBars && range?.maxAbs > 0) {
      const barColor = value < 0 ? barNegativeColor : barPositiveColor;
      style.boxShadow = `inset 3px 0 0 ${barColor}`;
      if (!style.backgroundColor) {
        style.backgroundColor = withAlpha(barColor, 0.08);
      }
    }

    const matchedRule = [...applicableConditionalRules]
      .reverse()
      .find(rule => evaluateConditionalRule(value, rule));

    if (matchedRule) {
      const colors = getConditionalFormattingColors(matchedRule.colorScheme);
      if (colors) {
        style.backgroundColor = colors.backgroundColor;
        style.color = colors.color;
        style.fontWeight = 700;
        style.boxShadow = 'none';
      }
    }

    return style;
  };

  const renderRows = (): React.ReactNode[] =>
    visibleNodes.map(node => {
      const isSubtotalRow = node.hasChildren && showSubtotals;
      const isExpandedNow = expanded.has(node.pathKey);

      return (
        <tr key={node.pathKey} className={`row-header ${isSubtotalRow ? 'subtotal-row' : ''}`}>
          <td
            onClick={() => toggleExpand(node)}
            style={{ cursor: node.hasChildren ? 'pointer' : 'default' }}
          >
            <span style={{ display: 'inline-block', width: node.level * 18 }} />
            {node.hasChildren ? (
              <span className="expand-icon">{isExpandedNow ? '▼' : '▶'}</span>
            ) : (
              <span className="expand-icon">•</span>
            )}
            {node.name}
          </td>

          {pivotCols.map(col => (
            <React.Fragment key={col.key}>
              {appliedMetrics.map(metric => {
                const value = getNodeAggValue(node, col.key, metric.key);
                return (
                  <td
                    key={`${node.pathKey}-${col.key}-${metric.key}`}
                    className="metric-value"
                    style={getCellStyle(value, metric.key)}
                  >
                    {showSubtotals || node.isLeaf ? formatValue(value) : '—'}
                  </td>
                );
              })}
            </React.Fragment>
          ))}

          {showGrandTotals && showRowTotals && <td className="metric-value">{formatValue(getNodeTotal(node))}</td>}
        </tr>
      );
    });

  if (!metrics.length) {
    return (
      <Styles
        style={{ height, width }}
        headerBg={headerBg}
        headerTextColor={headerTextColor}
        grandTotalBg={grandTotalBg}
        expandColor={expandColor}
        subtotalBg={subtotalBg}
        cellTextColor={cellTextColor}
        compactDisplay={compactDisplay}
        showSidebar={resolvedShowSidebar}
      >
        <div className="empty">Выберите хотя бы одну метрику в настройках графика.</div>
      </Styles>
    );
  }

  return (
    <Styles
      style={{ height, width }}
      headerBg={headerBg}
      headerTextColor={headerTextColor}
      grandTotalBg={grandTotalBg}
      expandColor={expandColor}
      subtotalBg={subtotalBg}
      cellTextColor={cellTextColor}
      compactDisplay={compactDisplay}
      showSidebar={resolvedShowSidebar}
    >
      <div className="pivot-shell">
        <div
          className="sidebar"
          style={{
            display: resolvedShowSidebar ? 'flex' : 'none',
            width: resolvedShowSidebar ? SIDEBAR_WIDTH : 0,
            minWidth: resolvedShowSidebar ? SIDEBAR_WIDTH : 0,
            maxWidth: resolvedShowSidebar ? SIDEBAR_WIDTH : 0,
            borderRight: resolvedShowSidebar ? '1px solid rgba(148, 163, 184, 0.22)' : 'none',
            overflow: 'hidden',
          }}
        >
          <div className="sidebar-header">
            <div className="sidebar-title">Поля</div>
            <div className="sidebar-actions">
              <button
                className={`btn ${hasPendingChanges && !isLoading ? 'btn-apply-active' : ''}`}
                onClick={applySelection}
                disabled={!hasPendingChanges || isLoading}
              >
                Применить
              </button>
              <button className="btn" onClick={expandAll}>Развернуть</button>
              <button className="btn" onClick={collapseAll}>Свернуть</button>
              <button className="btn" onClick={clearFilters}>Сброс</button>
            </div>
          </div>

          {/* {runtimeQuery ? (
            <details className="runtime-query">
              <summary>Примененный SQL</summary>
              <pre>{runtimeQuery}</pre>
            </details>
          ) : null} */}

          {isRuntimeRowLimitReached ? (
            <div className="runtime-warning">
              Результат уперся в ограничение по строкам запроса. Таблица может
              быть построена не по всем группам. Уменьшите число выбранных полей или
              скорректируйте фильтры для чарта.
            </div>
          ) : null}

          <div className="sidebar-scroll">
            <div className="panel">
              <div className="panel-title">Назначение</div>
              <div className="field-list-header">
                <span />
                <span>Поле</span>
                <span className="field-axis-label">Строки</span>
                <span className="field-axis-label">Столбцы</span>
                <span />
              </div>
              <div className="field-list">
                {orderedDimensions.map(field => (
                  <FieldPlacementMenu
                    key={field.key}
                    label={field.label}
                    rowOrder={getRowOrder(field)}
                    columnOrder={getColumnOrder(field)}
                    onToggleRow={() => toggleFieldPlacement(field, 'row')}
                    onToggleColumn={() => toggleFieldPlacement(field, 'column')}
                  />
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Метрики</div>
              <MetricSelector
                metrics={metrics}
                activeMetricKeys={activeMetricKeys}
                onToggle={toggleMetric}
              />
            </div>
          </div>
        </div>

        <div className="content">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="sticky-first">
                    {appliedRowFields.length
                      ? appliedRowFields.map(field => field.label).join(' → ')
                      : 'Строки'}
                  </th>

                  {appliedMetrics.length > 0 && (
                    <th colSpan={pivotCols.length * appliedMetrics.length}>
                      {appliedColumnFields.length
                        ? appliedColumnFields.map(field => field.label).join(' → ')
                        : 'Значение'}
                    </th>
                  )}

                  {appliedMetrics.length > 0 && showGrandTotals && showRowTotals && <th>Итого</th>}
                </tr>

                <tr>
                  <th className="sticky-first" />
                  {appliedMetrics.length > 0 && pivotCols.map(col => (
                    <th key={`${col.key}-values`} colSpan={appliedMetrics.length}>
                      {formatPivotColumnValues(col, appliedColumnFields)}
                    </th>
                  ))}
                  {appliedMetrics.length > 0 && showGrandTotals && showRowTotals && <th />}
                </tr>

                <tr>
                  <th className="sticky-first" />
                  {appliedMetrics.length > 0 && pivotCols.map(col => (
                    <React.Fragment key={`${col.key}-metric`}>
                      {appliedMetrics.map(metric => (
                        <th key={`${col.key}-${metric.key}`}>{metric.label}</th>
                      ))}
                    </React.Fragment>
                  ))}
                  {appliedMetrics.length > 0 && showGrandTotals && showRowTotals && <th />}
                </tr>
              </thead>

              <tbody>
                {!appliedMetrics.length ? (
                  <tr>
                    <td colSpan={1}>
                      <div className="table-placeholder">Выберите хотя бы одну метрику в левой панели.</div>
                    </td>
                  </tr>
                ) : isLoading ? (
                  <tr>
                    <td
                      colSpan={1 + pivotCols.length * Math.max(appliedMetrics.length, 1) + (showGrandTotals && showRowTotals ? 1 : 0)}
                    >
                      <div className="table-placeholder">Загрузка агрегированных данных...</div>
                    </td>
                  </tr>
                ) : appliedRowFields.length ? (
                  renderRows()
                ) : (
                  <tr>
                    <td
                      colSpan={1 + pivotCols.length * Math.max(appliedMetrics.length, 1) + (showGrandTotals && showRowTotals ? 1 : 0)}
                    >
                      <div className="table-placeholder">Выберите хотя бы одно поле в строки или столбцы.</div>
                    </td>
                  </tr>
                )}

                {appliedMetrics.length > 0 && appliedRowFields.length && showGrandTotals && showColumnTotals && !!visibleNodes.length && (
                  <tr className="total-row">
                    <td><strong>Общий итог</strong></td>

                    {pivotCols.map(col => (
                      <React.Fragment key={`${col.key}-grand`}>
                        {appliedMetrics.map(metric => (
                          <td key={`${col.key}-${metric.key}-grand`} className="metric-value">
                            <strong>{formatValue(calculateColTotal(col, metric.key))}</strong>
                          </td>
                        ))}
                      </React.Fragment>
                    ))}

                    {showRowTotals && (
                      <td className="metric-value">
                        <strong>{formatValue(calculateGrandTotal())}</strong>
                      </td>
                    )}
                  </tr>
                )}

                {appliedMetrics.length > 0 && !isLoading && appliedRowFields.length && !visibleNodes.length && (
                  <tr>
                    <td
                      colSpan={1 + pivotCols.length * Math.max(appliedMetrics.length, 1) + (showGrandTotals && showRowTotals ? 1 : 0)}
                    >
                      <div className="empty">Нет данных для выбранных фильтров.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Styles>
  );
}
