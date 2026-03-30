import React, { useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@superset-ui/core';

const HEADER_ROW_HEIGHT = 42;
const FIRST_COL_WIDTH = 360;
const SIDEBAR_WIDTH = 330;

type StyleProps = {
  headerBg?: string;
  headerTextColor?: string;
  grandTotalBg?: string;
  expandColor?: string;
  compactDisplay?: boolean;
  showSidebar?: boolean;
};

type TreeNode = {
  name: string;
  path: string;
  isLeaf: boolean;
  key?: string;
  children?: TreeNode[];
};

type InternalTreeNode = {
  name: string;
  path: string;
  isLeaf: boolean;
  key?: string;
  children: Map<string, InternalTreeNode>;
};

type PivotCol = {
  key: string;
  values?: string[];
};

type PivotRow = {
  key: string;
  values?: string[];
};

type PivotData = {
  rows: PivotRow[];
  cols: PivotCol[];
  values: Record<string, Record<string, number>>;
  rowHierarchy?: TreeNode[];
};

type NodeAgg = Record<string, Record<string, number>>;

type Props = {
  data: any[];
  rows?: string[];
  columns?: string[];
  metrics?: string[];
  selectableDimensions?: string[];
  showSidebar?: boolean | string | number;
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
    width: ${SIDEBAR_WIDTH}px;
    min-width: ${SIDEBAR_WIDTH}px;
    max-width: ${SIDEBAR_WIDTH}px;
    height: 100%;
    display: ${({ showSidebar }) => (showSidebar === false ? 'none' : 'flex')};
    flex-direction: column;
    background: rgba(255, 255, 255, 0.9);
    border-right: 1px solid rgba(148, 163, 184, 0.22);
    backdrop-filter: blur(14px);
    overflow: hidden;
  }

  .sidebar-header {
    padding: ${({ compactDisplay }) => (compactDisplay ? '12px' : '14px')};
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(255,255,255,0.92);
  }

  .sidebar-title {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 10px;
  }

  .sidebar-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .sidebar-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: 12px;
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .content {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .content-topbar {
    flex: 0 0 auto;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: ${({ compactDisplay }) => (compactDisplay ? '10px 12px' : '12px 14px')};
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    background: rgba(255,255,255,0.82);
    backdrop-filter: blur(12px);
  }

  .content-topbar-left {
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .placement-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .placement-group {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .placement-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: #ffffff;
    font-size: 12px;
    font-weight: 600;
    color: #334155;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
  }

  .chip.empty {
    color: #94a3b8;
    font-weight: 500;
  }

  .panel {
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 16px;
    padding: 12px;
    min-width: 0;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.65),
      0 4px 14px rgba(15, 23, 42, 0.04);
    overflow: visible;
  }

  .panel-title {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 10px;
    font-weight: 800;
  }

  .hint {
    font-size: 12px;
    color: #64748b;
    line-height: 1.4;
  }

  .btn {
    appearance: none;
    border: 1px solid rgba(148, 163, 184, 0.35);
    background: rgba(255,255,255,0.98);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: #334155;
    transition: all 0.16s ease;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    text-align: left;
  }

  .btn:hover {
    background: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
  }

  .field-list {
    display: grid;
    gap: 8px;
  }

  .field-card {
    position: relative;
    border: 1px solid rgba(15, 23, 42, 0.14);
    border-radius: 14px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    overflow: visible;
  }

  .field-trigger {
    width: 100%;
    padding: 12px 14px;
    border: 0;
    background: transparent;
    cursor: pointer;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 12px;
  }

  .field-name-large {
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
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
    min-width: 58px;
    text-align: center;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    border: 1px solid rgba(148, 163, 184, 0.24);
    background: #fff;
    color: #64748b;
  }

  .field-badge.row {
    background: rgba(59, 130, 246, 0.08);
    color: #1d4ed8;
    border-color: rgba(59, 130, 246, 0.18);
  }

  .field-badge.column {
    background: rgba(16, 185, 129, 0.08);
    color: #047857;
    border-color: rgba(16, 185, 129, 0.18);
  }

  .field-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 1200;
    background: rgba(255,255,255,0.99);
    border: 1px solid rgba(209, 213, 219, 0.9);
    border-radius: 14px;
    box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
    padding: 10px;
  }

  .field-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 6px;
    font-size: 14px;
    color: #111827;
    cursor: pointer;
    border-radius: 10px;
  }

  .field-option:hover {
    background: rgba(239, 246, 255, 0.85);
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

  .metrics-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
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
    background: #f6fafe;
    font-weight: 700;
  }

  .subtotal-row td:first-child {
    background: #edf5ff;
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
  return value === null || value === undefined || value === '' ? nullLabel : String(value);
}

function buildPivotData(
  records: any[],
  rowFields: string[],
  colFields: string[],
  metrics: string[],
  nullLabel: string,
): PivotData {
  const rows = new Map<string, PivotRow>();
  const cols = new Map<string, PivotCol>();
  const values: Record<string, Record<string, number>> = {};

  records.forEach(item => {
    const rowValues = rowFields.length
      ? rowFields.map(field => normalizeValue(item[field], nullLabel))
      : ['Значение'];
    const rowKey = rowValues.join('|');
    if (!rows.has(rowKey)) rows.set(rowKey, { key: rowKey, values: rowValues });

    const colValues = colFields.length
      ? colFields.map(field => normalizeValue(item[field], nullLabel))
      : ['Значение'];
    const colKey = colValues.join('|');
    if (!cols.has(colKey)) cols.set(colKey, { key: colKey, values: colValues });

    const cellKey = `${rowKey}||${colKey}`;
    if (!values[cellKey]) values[cellKey] = {};

    metrics.forEach(metric => {
      const raw = item[metric];
      const num =
        typeof raw === 'number'
          ? raw
          : raw === null || raw === undefined || raw === ''
            ? 0
            : Number(raw) || 0;
      values[cellKey][metric] = (values[cellKey][metric] || 0) + num;
    });
  });

  const rowsArray = Array.from(rows.values()).sort((a, b) =>
    (a.values || []).join('¦').localeCompare((b.values || []).join('¦')),
  );
  const colsArray = Array.from(cols.values()).sort((a, b) =>
    (a.values || []).join('¦').localeCompare((b.values || []).join('¦')),
  );

  return {
    rows: rowsArray,
    cols: colsArray,
    values,
    rowHierarchy: buildRowHierarchy(rowsArray),
  };
}

function buildRowHierarchy(rowsArray: PivotRow[]): TreeNode[] {
  const root: { children: Map<string, InternalTreeNode> } = { children: new Map() };

  rowsArray.forEach(row => {
    let children = root.children;
    const pathParts: string[] = [];

    (row.values || []).forEach((value, index, arr) => {
      const name = String(value);
      pathParts.push(name);
      const path = pathParts.join(' → ');

      if (!children.has(name)) {
        children.set(name, {
          name,
          path,
          isLeaf: false,
          key: undefined,
          children: new Map(),
        });
      }

      const node = children.get(name)!;
      if (index === arr.length - 1) {
        node.isLeaf = true;
        node.key = row.key;
      }
      children = node.children;
    });
  });

  const toNodes = (map: Map<string, InternalTreeNode>): TreeNode[] =>
    Array.from(map.values()).map(node => {
      const childNodes = toNodes(node.children);
      return {
        name: node.name,
        path: node.path,
        isLeaf: node.isLeaf,
        key: node.key,
        children: childNodes.length ? childNodes : undefined,
      };
    });

  return toNodes(root.children);
}

function collectExpandedPaths(
  nodes: TreeNode[],
  depth: number,
  level = 0,
  result = new Set<string>(),
) {
  nodes.forEach(node => {
    if (node.children?.length && level < depth) {
      result.add(node.path);
      collectExpandedPaths(node.children, depth, level + 1, result);
    }
  });
  return result;
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
    onChange(
      selected.includes(value)
        ? selected.filter(item => item !== value)
        : [...selected, value],
    );
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
    showSidebar: rawShowSidebar = true,
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
    height,
    width,
  } = props;

  const showSidebar =
    rawShowSidebar === false ||
    rawShowSidebar === 'false' ||
    rawShowSidebar === 0 ||
    rawShowSidebar === '0'
      ? false
      : true;

  const availableDimensions = useMemo(
    () => Array.from(new Set([...(selectableDimensions || []), ...(rows || []), ...(columns || [])])),
    [selectableDimensions, rows, columns],
  );

  const [rowFields, setRowFields] = useState<string[]>([]);
  const [columnFields, setColumnFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRowFields(rows || []);
    setColumnFields(columns || []);
    setExpanded(new Set());
  }, [rows, columns]);

  const dimensionValues = useMemo(() => {
    const values: Record<string, string[]> = {};
    availableDimensions.forEach(field => {
      values[field] = Array.from(
        new Set(data.map(item => normalizeValue(item[field], nullLabel))),
      ).sort((a, b) => a.localeCompare(b));
    });
    return values;
  }, [availableDimensions, data, nullLabel]);

  const filteredRecords = useMemo(
    () =>
      data.filter(record =>
        Object.entries(filters).every(
          ([field, accepted]) =>
            !accepted?.length || accepted.includes(normalizeValue(record[field], nullLabel)),
        ),
      ),
    [data, filters, nullLabel],
  );

  useEffect(() => {
    setExpanded(new Set());
  }, [rowFields, columnFields, filters]);

  const pivotData = useMemo(
    () => buildPivotData(filteredRecords, rowFields, columnFields, metrics, nullLabel),
    [filteredRecords, rowFields, columnFields, metrics, nullLabel],
  );

  useEffect(() => {
    setExpanded(collectExpandedPaths(pivotData.rowHierarchy || [], defaultExpandDepth));
  }, [pivotData.rowHierarchy, defaultExpandDepth]);

  const nodeAggMap = useMemo(() => {
    const map = new Map<string, NodeAgg>();

    const addToAgg = (agg: NodeAgg, colKey: string, metric: string, value: number) => {
      if (!agg[colKey]) agg[colKey] = {};
      agg[colKey][metric] = (agg[colKey][metric] || 0) + (value || 0);
    };

    const mergeAgg = (target: NodeAgg, src: NodeAgg) => {
      Object.keys(src).forEach(colKey => {
        Object.keys(src[colKey]).forEach(metric => {
          addToAgg(target, colKey, metric, src[colKey][metric]);
        });
      });
    };

    const computeNodeAgg = (node: TreeNode): NodeAgg => {
      if (map.has(node.path)) return map.get(node.path)!;
      const agg: NodeAgg = {};

      if (node.isLeaf && node.key) {
        pivotData.cols.forEach(col => {
          const cellKey = `${node.key}||${col.key}`;
          metrics.forEach(metric => {
            addToAgg(agg, col.key, metric, pivotData.values[cellKey]?.[metric] || 0);
          });
        });
      } else if (node.children?.length) {
        node.children.forEach(child => mergeAgg(agg, computeNodeAgg(child)));
      }

      map.set(node.path, agg);
      return agg;
    };

    (pivotData.rowHierarchy || []).forEach(node => computeNodeAgg(node));
    return map;
  }, [pivotData, metrics]);

  const visibleNodes = useMemo(() => {
    const result: TreeNode[] = [];
    const walk = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        result.push(node);
        if (node.children?.length && expanded.has(node.path)) walk(node.children);
      });
    };
    walk(pivotData.rowHierarchy || []);
    return result;
  }, [pivotData, expanded]);

  const metricRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number; maxAbs: number }> = {};

    metrics.forEach(metric => {
      const vals: number[] = [];

      visibleNodes.forEach(node => {
        pivotData.cols.forEach(col => {
          const value = nodeAggMap.get(node.path)?.[col.key]?.[metric];
          if (typeof value === 'number' && !Number.isNaN(value)) {
            vals.push(value);
          }
        });
      });

      if (!vals.length) {
        ranges[metric] = { min: 0, max: 0, maxAbs: 0 };
      } else {
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        ranges[metric] = {
          min,
          max,
          maxAbs: Math.max(Math.abs(min), Math.abs(max)),
        };
      }
    });

    return ranges;
  }, [metrics, visibleNodes, pivotData, nodeAggMap]);

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

  const getNodeAggValue = (node: TreeNode, colKey: string, metric: string) =>
    nodeAggMap.get(node.path)?.[colKey]?.[metric] ?? null;

  const getNodeTotal = (node: TreeNode) => {
    const agg = nodeAggMap.get(node.path);
    if (!agg) return 0;
    return Object.keys(agg).reduce(
      (sum, colKey) =>
        sum +
        metrics.reduce((mSum, metric) => mSum + (agg[colKey]?.[metric] || 0), 0),
      0,
    );
  };

  const calculateColTotal = (col: PivotCol, metric: string) =>
    pivotData.rows.reduce((sum, row) => {
      const cellKey = `${row.key}||${col.key}`;
      return sum + (pivotData.values[cellKey]?.[metric] || 0);
    }, 0);

  const calculateGrandTotal = () =>
    pivotData.rows.reduce((rowSum, row) => {
      return (
        rowSum +
        pivotData.cols.reduce((colSum, col) => {
          const cellKey = `${row.key}||${col.key}`;
          return (
            colSum +
            metrics.reduce(
              (metricSum, metric) => metricSum + (pivotData.values[cellKey]?.[metric] || 0),
              0,
            )
          );
        }, 0)
      );
    }, 0);

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handlePlacementChange = (field: string, placement: 'off' | 'row' | 'column') => {
    const nextRows = rowFields.filter(item => item !== field);
    const nextCols = columnFields.filter(item => item !== field);

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

  const getPlacement = (field: string) => {
    if (rowFields.includes(field)) return 'row';
    if (columnFields.includes(field)) return 'column';
    return 'off';
  };

  const updateFilter = (field: string, selected: string[]) => {
    setFilters(prev => ({ ...prev, [field]: selected }));
  };

  const clearFilters = () => setFilters({});
  const expandAll = () =>
    setExpanded(collectExpandedPaths(pivotData.rowHierarchy || [], Number.MAX_SAFE_INTEGER));
  const collapseAll = () => setExpanded(new Set());

  const getCellStyle = (value: number | null, metric: string): React.CSSProperties => {
    if (value === null || value === undefined || Number.isNaN(value)) return {};
    const style: React.CSSProperties = {};
    const range = metricRanges[metric];

    if (showHeatmap && range) {
      if (range.min < 0 && range.max > 0 && range.maxAbs > 0) {
        const intensity = Math.min(Math.abs(value) / range.maxAbs, 1);
        if (value < 0) {
          style.backgroundColor = `rgba(239, 68, 68, ${0.06 + intensity * 0.26})`;
        } else if (value > 0) {
          style.backgroundColor = `rgba(34, 197, 94, ${0.06 + intensity * 0.26})`;
        }
      } else if (range.max !== range.min) {
        const intensity = (value - range.min) / (range.max - range.min);
        style.backgroundColor = `rgba(59, 130, 246, ${0.05 + intensity * 0.18})`;
      } else {
        style.backgroundColor = 'rgba(59, 130, 246, 0.07)';
      }
    }

    if (showCellBars && range?.maxAbs > 0) {
      const widthPercent = Math.min((Math.abs(value) / range.maxAbs) * 100, 100);
      const barColor = value < 0 ? 'rgba(239, 68, 68, 0.14)' : 'rgba(34, 197, 94, 0.14)';
      style.backgroundImage = `linear-gradient(90deg, ${barColor} ${widthPercent}%, transparent ${widthPercent}%)`;
      style.backgroundBlendMode = 'multiply';
    }

    return style;
  };

  const renderRows = (nodes: TreeNode[], level = 0): React.ReactNode[] => {
    let result: React.ReactNode[] = [];

    nodes.forEach(node => {
      const hasChildren = !!node.children?.length;
      const isExpandedNow = expanded.has(node.path);
      const isSubtotalRow = hasChildren && showSubtotals;

      result.push(
        <tr key={node.path} className={`row-header ${isSubtotalRow ? 'subtotal-row' : ''}`}>
          <td
            onClick={() => hasChildren && toggleExpand(node.path)}
            style={{ cursor: hasChildren ? 'pointer' : 'default' }}
          >
            <span style={{ display: 'inline-block', width: level * 18 }} />
            {hasChildren ? (
              <span className="expand-icon">{isExpandedNow ? '▼' : '▶'}</span>
            ) : (
              <span className="expand-icon">•</span>
            )}
            {node.name}
          </td>

          {pivotData.cols.map(col => (
            <React.Fragment key={col.key}>
              {metrics.map(metric => {
                const value = getNodeAggValue(node, col.key, metric);
                return (
                  <td
                    key={`${node.path}-${col.key}-${metric}`}
                    className="metric-value"
                    style={getCellStyle(value, metric)}
                  >
                    {showSubtotals || node.isLeaf ? formatValue(value) : '—'}
                  </td>
                );
              })}
            </React.Fragment>
          ))}

          {showGrandTotals && showRowTotals && (
            <td className="metric-value">{formatValue(getNodeTotal(node))}</td>
          )}
        </tr>,
      );

      if (hasChildren && isExpandedNow) {
        result = result.concat(renderRows(node.children!, level + 1));
      }
    });

    return result;
  };

  if (!metrics.length) {
    return (
      <Styles
        style={{ height, width }}
        headerBg={headerBg}
        headerTextColor={headerTextColor}
        grandTotalBg={grandTotalBg}
        expandColor={expandColor}
        compactDisplay={compactDisplay}
        showSidebar={showSidebar}
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
      compactDisplay={compactDisplay}
      showSidebar={showSidebar}
    >
      <div className="pivot-shell">
        <div className="sidebar" style={{ display: showSidebar ? 'flex' : 'none' }}>
          <div className="sidebar-header">
            <div className="sidebar-title">Настройки</div>
            <div className="sidebar-actions">
              <button className="btn" onClick={expandAll}>Развернуть всё</button>
              <button className="btn" onClick={collapseAll}>Свернуть всё</button>
              <button className="btn" onClick={clearFilters}>Сбросить фильтры</button>
            </div>
          </div>

          <div className="sidebar-scroll">
            <div className="panel">
              <div className="panel-title">Строки</div>
              <div className="metrics-list">
                {rowFields.length ? (
                  rowFields.map(field => (
                    <span key={`row-${field}`} className="chip">{field}</span>
                  ))
                ) : (
                  <span className="chip empty">Не выбрано</span>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Столбцы</div>
              <div className="metrics-list">
                {columnFields.length ? (
                  columnFields.map(field => (
                    <span key={`column-${field}`} className="chip">{field}</span>
                  ))
                ) : (
                  <span className="chip empty">Не выбрано</span>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Метрики</div>
              <div className="metrics-list">
                {metrics.length ? (
                  metrics.map(metric => (
                    <span key={`metric-${metric}`} className="chip">{metric}</span>
                  ))
                ) : (
                  <span className="chip empty">Не выбрано</span>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Поля</div>
              <div className="field-list">
                {availableDimensions.map(field => (
                  <FieldPlacementMenu
                    key={field}
                    label={field}
                    value={getPlacement(field)}
                    onChange={placement => handlePlacementChange(field, placement)}
                  />
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Фильтры</div>
              <div className="filters-grid">
                {availableDimensions.map(field => (
                  <FilterDropdown
                    key={field}
                    label={field}
                    options={dimensionValues[field] || []}
                    selected={filters[field] || []}
                    onChange={values => updateFilter(field, values)}
                  />
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title">Подсказка</div>
              <div className="hint">
                Нажмите на поле, чтобы отправить его в <strong>Строки</strong> или <strong>Столбцы</strong>.
                Фильтры применяются сразу к данным таблицы.
              </div>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="content-topbar">
            <div className="content-topbar-left">
              <div className="placement-summary">
                <div className="placement-group">
                  <span className="placement-label">Строки</span>
                  {rowFields.length ? (
                    rowFields.map(field => (
                      <span key={`top-row-${field}`} className="chip">{field}</span>
                    ))
                  ) : (
                    <span className="chip empty">Не выбрано</span>
                  )}
                </div>
              </div>

              <div className="placement-summary">
                <div className="placement-group">
                  <span className="placement-label">Столбцы</span>
                  {columnFields.length ? (
                    columnFields.map(field => (
                      <span key={`top-col-${field}`} className="chip">{field}</span>
                    ))
                  ) : (
                    <span className="chip empty">Не выбрано</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th className="sticky-first">
                    {rowFields.length ? rowFields.join(' → ') : 'Строки'}
                  </th>

                  {pivotData.cols.map(col => (
                    <th key={col.key} colSpan={metrics.length}>
                      {columnFields.length ? (col.values?.join(' → ') || '—') : 'Значение'}
                    </th>
                  ))}

                  {showGrandTotals && showRowTotals && <th>Итого</th>}
                </tr>

                <tr>
                  <th className="sticky-first" />
                  {pivotData.cols.map(col => (
                    <React.Fragment key={`${col.key}-metric`}>
                      {metrics.map(metric => (
                        <th key={`${col.key}-${metric}`}>{metric}</th>
                      ))}
                    </React.Fragment>
                  ))}
                  {showGrandTotals && showRowTotals && <th />}
                </tr>
              </thead>

              <tbody>
                {rowFields.length ? (
                  renderRows(pivotData.rowHierarchy || [])
                ) : (
                  <tr>
                    <td
                      colSpan={
                        1 +
                        pivotData.cols.length * Math.max(metrics.length, 1) +
                        (showGrandTotals && showRowTotals ? 1 : 0)
                      }
                    >
                      <div className="table-placeholder">
                        Выберите хотя бы одно поле в строки или столбцы.
                      </div>
                    </td>
                  </tr>
                )}

                {rowFields.length && showGrandTotals && showColumnTotals && (
                  <tr className="total-row">
                    <td><strong>Общий итог</strong></td>

                    {pivotData.cols.map(col => (
                      <React.Fragment key={`${col.key}-grand`}>
                        {metrics.map(metric => (
                          <td key={`${col.key}-${metric}-grand`} className="metric-value">
                            <strong>{formatValue(calculateColTotal(col, metric))}</strong>
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

                {rowFields.length && !pivotData.rows.length && (
                  <tr>
                    <td
                      colSpan={
                        1 +
                        pivotData.cols.length * Math.max(metrics.length, 1) +
                        (showGrandTotals && showRowTotals ? 1 : 0)
                      }
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