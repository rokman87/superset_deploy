import React, { useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@superset-ui/core';

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
  label: string;
};

type MetricDef = {
  key: string;
  label: string;
};

type NodeAgg = Record<string, Record<string, number>>;

type LoadedNode = {
  pathKey: string;
  pathValues: string[];
  name: string;
  level: number;
  hasChildren: boolean;
  isLeaf: boolean;
  agg: NodeAgg;
};

type Props = {
  data: any[];
  rows?: FieldDef[];
  columns?: FieldDef[];
  metrics?: MetricDef[];
  selectableDimensions?: FieldDef[];
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
  conditionalFormattingEnabled?: boolean;
  conditionalFormattingMetric?: string;
  conditionalFormattingOperator?: string;
  conditionalFormattingThreshold?: number;
  conditionalFormattingTextColor?: string;
  conditionalFormattingBgColor?: string;
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
  value: 'off' | 'row' | 'column';
  onChange: (placement: 'off' | 'row' | 'column') => void;
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
    background:
      radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 28%),
      linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .sidebar-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 8px;
  }

  .content {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
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
    margin: 0 0 8px;
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

  .field-list {
    display: grid;
    gap: 4px;
  }

  .field-card {
    position: relative;
    border: 1px solid rgba(226, 232, 240, 1);
    border-radius: 10px;
    background: #fff;
    overflow: visible;
  }

  .field-trigger {
    width: 100%;
    padding: 10px 12px;
    border: 0;
    background: transparent;
    cursor: pointer;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 12px;
  }

  .field-name-large {
    font-size: 12px;
    font-weight: 500;
    color: #0f172a;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-icons {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #111827;
  }

  .field-badge {
    min-width: 50px;
    text-align: center;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.01em;
    border: 1px solid rgba(226, 232, 240, 1);
    background: #fff;
    color: #64748b;
  }

  .field-badge.row {
    background: #eff6ff;
    color: #2563eb;
    border-color: #bfdbfe;
  }

  .field-badge.column {
    background: #ecfdf5;
    color: #059669;
    border-color: #a7f3d0;
  }

  .field-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 1200;
    background: #fff;
    border: 1px solid rgba(226, 232, 240, 1);
    border-radius: 10px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    padding: 6px;
  }

  .field-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    font-size: 12px;
    color: #0f172a;
    cursor: pointer;
    border-radius: 8px;
  }

  .field-option:hover {
    background: #f8fafc;
  }

  .field-option input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: #3b82f6;
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
    background: linear-gradient(180deg, #fff 0%, #f8fafc 100%);
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
    background: rgba(255,255,255,0.82);
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
    background: linear-gradient(180deg, ${({ headerBg }) => headerBg || '#203247'} 0%, #304a66 100%);
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
    background: linear-gradient(180deg, ${({ grandTotalBg }) => grandTotalBg || '#203247'} 0%, #304a66 100%);
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
      return value >= threshold;
    case '<':
      return value < threshold;
    case '<=':
      return value <= threshold;
    case '=':
      return value === threshold;
    case '!=':
      return value !== threshold;
    default:
      return false;
  }
}

function formatPivotColumnLabel(col: PivotCol, columnFields: FieldDef[]) {
  if (!columnFields.length) return 'Значение';
  const values = col.values || [];
  return columnFields
    .map((field, index) => `${field.label}: ${values[index] ?? '—'}`)
    .join(' | ');
}

function arraysEqual(a: FieldDef[] = [], b: FieldDef[] = []) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.key !== b[i]?.key || a[i]?.label !== b[i]?.label) return false;
  }
  return true;
}

function pathToKey(pathValues: string[]) {
  return pathValues.join(PATH_SEPARATOR);
}

function aggregateNode(
  records: any[],
  colFields: FieldDef[],
  metrics: MetricDef[],
  nullLabel: string,
): { cols: PivotCol[]; agg: NodeAgg } {
  const colsMap = new Map<string, PivotCol>();
  const agg: NodeAgg = {};

  records.forEach(item => {
    const colValues = colFields.length
      ? colFields.map(field => normalizeValue(item[field.key], nullLabel))
      : ['Значение'];
    const colKey = colValues.join('|');

    if (!colsMap.has(colKey)) {
      colsMap.set(colKey, { key: colKey, values: colValues });
    }

    if (!agg[colKey]) agg[colKey] = {};

    metrics.forEach(metric => {
      const raw = item[metric.key];
      const num =
        typeof raw === 'number'
          ? raw
          : raw === null || raw === undefined || raw === ''
            ? 0
            : Number(raw) || 0;
      agg[colKey][metric.key] = (agg[colKey][metric.key] || 0) + num;
    });
  });

  const cols = Array.from(colsMap.values()).sort((a, b) =>
    (a.values || []).join('¦').localeCompare((b.values || []).join('¦')),
  );

  if (!cols.length) {
    cols.push({ key: 'Значение', values: ['Значение'] });
  }

  return { cols, agg };
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

function FieldPlacementMenu({ label, value, onChange }: FieldPlacementMenuProps) {
  const [open, setOpen] = useState(false);
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

  const badgeClass =
    value === 'row' ? 'field-badge row' : value === 'column' ? 'field-badge column' : 'field-badge';
  const badgeText = value === 'row' ? 'Строка' : value === 'column' ? 'Столбец' : 'Выкл';

  return (
    <div className="field-card" ref={rootRef}>
      <button type="button" className="field-trigger" onClick={() => setOpen(prev => !prev)}>
        <span className="field-name-large">{label}</span>
        <span className="field-icons">
          <span className={badgeClass}>{badgeText}</span>
        </span>
      </button>

      {open && (
        <div className="field-menu">
          <label className="field-option">
            <input
              type="radio"
              name={`placement-${label}`}
              checked={value === 'row'}
              onChange={() => onChange('row')}
            />
            <span>Строка</span>
          </label>

          <label className="field-option">
            <input
              type="radio"
              name={`placement-${label}`}
              checked={value === 'column'}
              onChange={() => onChange('column')}
            />
            <span>Столбец</span>
          </label>

          <label className="field-option">
            <input
              type="radio"
              name={`placement-${label}`}
              checked={value === 'off'}
              onChange={() => onChange('off')}
            />
            <span>Отключить</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default function SupersetPluginChartMyfirst(props: Props) {
  const {
    data = [],
    rows = [],
    columns = [],
    metrics = [],
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
    conditionalFormattingEnabled = false,
    conditionalFormattingMetric,
    conditionalFormattingOperator = '>',
    conditionalFormattingThreshold,
    conditionalFormattingTextColor = '#ffffff',
    conditionalFormattingBgColor = '#dc2626',
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

  const [rowFields, setRowFields] = useState<FieldDef[]>(rows || []);
  const [columnFields, setColumnFields] = useState<FieldDef[]>(columns || []);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [nodesByPath, setNodesByPath] = useState<Record<string, LoadedNode>>({});
  const [childrenByParent, setChildrenByParent] = useState<Record<string, string[]>>({
    [ROOT_NODE_KEY]: [],
  });

  const lastExternalRowsRef = useRef<FieldDef[]>(rows || []);
  const lastExternalColumnsRef = useRef<FieldDef[]>(columns || []);

  useEffect(() => {
    const nextRows = rows || [];
    const nextColumns = columns || [];

    const rowsChanged = !arraysEqual(lastExternalRowsRef.current, nextRows);
    const columnsChanged = !arraysEqual(lastExternalColumnsRef.current, nextColumns);

    if (rowsChanged || columnsChanged) {
      setRowFields(nextRows);
      setColumnFields(nextColumns);
      setExpanded(new Set());
      lastExternalRowsRef.current = [...nextRows];
      lastExternalColumnsRef.current = [...nextColumns];
    }
  }, [rows, columns]);

  const dimensionValues = useMemo(() => {
    const values: Record<string, string[]> = {};
    availableDimensions.forEach(field => {
      values[field.key] = Array.from(new Set(data.map(item => normalizeValue(item[field.key], nullLabel)))).sort(
        (a, b) => a.localeCompare(b),
      );
    });
    return values;
  }, [availableDimensions, data, nullLabel]);

  const filteredRecords = useMemo(
    () =>
      data.filter(record =>
        Object.entries(filters).every(
          ([field, accepted]) => !accepted?.length || accepted.includes(normalizeValue(record[field], nullLabel)),
        ),
      ),
    [data, filters, nullLabel],
  );

  const columnData = useMemo(
    () => aggregateNode(filteredRecords, columnFields, metrics, nullLabel),
    [filteredRecords, columnFields, metrics, nullLabel],
  );

  const pivotCols = columnData.cols;
  const grandAgg = columnData.agg;

  const buildChildrenForPath = useMemo(() => {
    return (pathValues: string[]): LoadedNode[] => {
      const level = pathValues.length;
      const currentField = rowFields[level];
      if (!currentField) return [];

      const grouped = new Map<string, any[]>();

      filteredRecords.forEach(record => {
        for (let index = 0; index < pathValues.length; index += 1) {
          const parentField = rowFields[index];
          if (!parentField) return;
          if (normalizeValue(record[parentField.key], nullLabel) !== pathValues[index]) {
            return;
          }
        }

        const currentValue = normalizeValue(record[currentField.key], nullLabel);
        if (!grouped.has(currentValue)) grouped.set(currentValue, []);
        grouped.get(currentValue)!.push(record);
      });

      return Array.from(grouped.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, records]) => {
          const nextPathValues = [...pathValues, name];
          const pathKey = pathToKey(nextPathValues);
          const { agg } = aggregateNode(records, columnFields, metrics, nullLabel);
          const hasChildren = level < rowFields.length - 1;

          return {
            pathKey,
            pathValues: nextPathValues,
            name,
            level,
            hasChildren,
            isLeaf: !hasChildren,
            agg,
          };
        });
    };
  }, [filteredRecords, rowFields, columnFields, metrics, nullLabel]);

  const loadChildren = (parentPathKey: string, parentPathValues: string[]) => {
    const children = buildChildrenForPath(parentPathValues);
    const childKeys = children.map(child => child.pathKey);

    setNodesByPath(prev => {
      const next = { ...prev };
      children.forEach(child => {
        next[child.pathKey] = child;
      });
      return next;
    });

    setChildrenByParent(prev => ({
      ...prev,
      [parentPathKey]: childKeys,
    }));

    return childKeys;
  };

  const removeDescendantsFromCache = (parentPathKey: string) => {
    const descendantKeys = new Set<string>();

    const collect = (pathKey: string) => {
      const childKeys = childrenByParent[pathKey] || [];
      childKeys.forEach(childKey => {
        descendantKeys.add(childKey);
        collect(childKey);
      });
    };

    collect(parentPathKey);

    if (!descendantKeys.size) return;

    setNodesByPath(prev => {
      const next = { ...prev };
      descendantKeys.forEach(key => {
        delete next[key];
      });
      return next;
    });

    setChildrenByParent(prev => {
      const next = { ...prev };
      descendantKeys.forEach(key => {
        delete next[key];
      });
      next[parentPathKey] = [];
      return next;
    });

    setExpanded(prev => {
      const next = new Set(prev);
      descendantKeys.forEach(key => next.delete(key));
      return next;
    });
  };

  useEffect(() => {
    setExpanded(new Set());
    setNodesByPath({});
    setChildrenByParent({ [ROOT_NODE_KEY]: [] });

    if (!rowFields.length) return;

    const rootKeys = loadChildren(ROOT_NODE_KEY, []);

    if (defaultExpandDepth > 0) {
      const nextExpanded = new Set<string>();
      let currentLevelKeys = rootKeys;

      for (let depth = 0; depth < defaultExpandDepth; depth += 1) {
        if (!currentLevelKeys.length) break;
        const nextLevelKeys: string[] = [];

        currentLevelKeys.forEach(pathKey => {
          const nodePath = pathKey ? pathKey.split(PATH_SEPARATOR) : [];
          nextExpanded.add(pathKey);
          const childKeys = loadChildren(pathKey, nodePath);
          nextLevelKeys.push(...childKeys);
        });

        currentLevelKeys = nextLevelKeys;
      }

      setExpanded(nextExpanded);
    }
  }, [rowFields, columnFields, filters, metrics, defaultExpandDepth, buildChildrenForPath]);

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

    metrics.forEach(metric => {
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
  }, [metrics, visibleNodes, pivotCols]);

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
    node.agg[colKey]?.[metricKey] ?? null;

  const getNodeTotal = (node: LoadedNode) =>
    Object.keys(node.agg).reduce(
      (sum, colKey) => sum + metrics.reduce((metricSum, metric) => metricSum + (node.agg[colKey]?.[metric.key] || 0), 0),
      0,
    );

  const calculateColTotal = (col: PivotCol, metricKey: string) => grandAgg[col.key]?.[metricKey] || 0;

  const calculateGrandTotal = () =>
    Object.keys(grandAgg).reduce(
      (sum, colKey) => sum + metrics.reduce((metricSum, metric) => metricSum + (grandAgg[colKey]?.[metric.key] || 0), 0),
      0,
    );

  const toggleExpand = (node: LoadedNode) => {
    if (!node.hasChildren) return;

    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(node.pathKey)) {
        next.delete(node.pathKey);
        return next;
      }
      next.add(node.pathKey);
      return next;
    });

    const childKeys = childrenByParent[node.pathKey] || [];
    if (!childKeys.length) {
      loadChildren(node.pathKey, node.pathValues);
    } else if (expanded.has(node.pathKey)) {
      removeDescendantsFromCache(node.pathKey);
    }
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

  const updateFilter = (field: string, selected: string[]) => {
    setFilters(prev => ({ ...prev, [field]: selected }));
  };

  const clearFilters = () => setFilters({});

  const expandAll = () => {
    if (!rowFields.length) return;

    let frontier = childrenByParent[ROOT_NODE_KEY] || [];
    const nextExpanded = new Set<string>();

    if (!frontier.length) {
      frontier = loadChildren(ROOT_NODE_KEY, []);
    }

    while (frontier.length) {
      const nextFrontier: string[] = [];
      frontier.forEach(pathKey => {
        const node = nodesByPath[pathKey];
        const pathValues = node?.pathValues || pathKey.split(PATH_SEPARATOR);
        const childKeys = (childrenByParent[pathKey] || []).length
          ? childrenByParent[pathKey]
          : loadChildren(pathKey, pathValues);
        if (childKeys.length) {
          nextExpanded.add(pathKey);
          nextFrontier.push(...childKeys);
        }
      });
      frontier = nextFrontier;
    }

    setExpanded(nextExpanded);
  };

  const collapseAll = () => {
    setExpanded(new Set());
    setNodesByPath(prev => {
      const next: Record<string, LoadedNode> = {};
      (childrenByParent[ROOT_NODE_KEY] || []).forEach(key => {
        if (prev[key]) next[key] = prev[key];
      });
      return next;
    });
    setChildrenByParent(prev => ({ [ROOT_NODE_KEY]: prev[ROOT_NODE_KEY] || [] }));
  };

  const getCellStyle = (value: number | null, metricKey: string): React.CSSProperties => {
    if (value === null || value === undefined || Number.isNaN(value)) return {};
    const style: React.CSSProperties = {};
    const range = metricRanges[metricKey];
    const metricDef = metrics.find(metric => metric.key === metricKey);
    const resolvedConditionalMetric = conditionalFormattingMetric?.trim().toLowerCase();
    const appliesConditionalFormatting =
      conditionalFormattingEnabled &&
      resolvedConditionalMetric &&
      Number.isFinite(conditionalFormattingThreshold) &&
      (metricKey.toLowerCase() === resolvedConditionalMetric ||
        metricDef?.label.trim().toLowerCase() === resolvedConditionalMetric);

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
      const widthPercent = Math.min((Math.abs(value) / range.maxAbs) * 100, 100);
      const barColor = withAlpha(value < 0 ? barNegativeColor : barPositiveColor, 0.14);
      style.backgroundImage = `linear-gradient(90deg, ${barColor} ${widthPercent}%, transparent ${widthPercent}%)`;
      style.backgroundBlendMode = 'multiply';
    }

    if (
      appliesConditionalFormatting &&
      evaluateCondition(value, conditionalFormattingOperator, conditionalFormattingThreshold)
    ) {
      style.backgroundColor = conditionalFormattingBgColor;
      style.color = conditionalFormattingTextColor;
      style.fontWeight = 700;
      style.backgroundImage = 'none';
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
              {metrics.map(metric => {
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
              <button className="btn" onClick={expandAll}>Все</button>
              <button className="btn" onClick={collapseAll}>Свернуть</button>
              <button className="btn" onClick={clearFilters}>Сброс</button>
            </div>
          </div>

          <div className="sidebar-scroll">
            <div className="panel">
              <div className="panel-title">Назначение</div>
              <div className="field-list">
                {availableDimensions.map(field => (
                  <FieldPlacementMenu
                    key={field.key}
                    label={field.label}
                    value={getPlacement(field)}
                    onChange={placement => handlePlacementChange(field, placement)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="sticky-first">
                    {rowFields.length ? rowFields.map(field => field.label).join(' → ') : 'Строки'}
                  </th>

                  {pivotCols.map(col => (
                    <th key={col.key} colSpan={metrics.length}>
                      {formatPivotColumnLabel(col, columnFields)}
                    </th>
                  ))}

                  {showGrandTotals && showRowTotals && <th>Итого</th>}
                </tr>

                <tr>
                  <th className="sticky-first" />
                  {pivotCols.map(col => (
                    <React.Fragment key={`${col.key}-metric`}>
                      {metrics.map(metric => (
                        <th key={`${col.key}-${metric.key}`}>{metric.label}</th>
                      ))}
                    </React.Fragment>
                  ))}
                  {showGrandTotals && showRowTotals && <th />}
                </tr>
              </thead>

              <tbody>
                {rowFields.length ? (
                  renderRows()
                ) : (
                  <tr>
                    <td
                      colSpan={1 + pivotCols.length * Math.max(metrics.length, 1) + (showGrandTotals && showRowTotals ? 1 : 0)}
                    >
                      <div className="table-placeholder">Выберите хотя бы одно поле в строки или столбцы.</div>
                    </td>
                  </tr>
                )}

                {rowFields.length && showGrandTotals && showColumnTotals && !!visibleNodes.length && (
                  <tr className="total-row">
                    <td><strong>Общий итог</strong></td>

                    {pivotCols.map(col => (
                      <React.Fragment key={`${col.key}-grand`}>
                        {metrics.map(metric => (
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

                {rowFields.length && !visibleNodes.length && (
                  <tr>
                    <td
                      colSpan={1 + pivotCols.length * Math.max(metrics.length, 1) + (showGrandTotals && showRowTotals ? 1 : 0)}
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
