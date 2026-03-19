import { ChartProps, getMetricLabel } from '@superset-ui/core';

type RowNode = {
  name: string;
  path: string;
  isLeaf: boolean;
  key?: string;
  children?: RowNode[];
};

export default function transformProps(chartProps: ChartProps) {
  const { width, height, formData, queriesData } = chartProps;

  const data = queriesData[0]?.data || [];

  const groupbyRows: string[] = Array.isArray((formData as any).groupbyRows)
    ? (formData as any).groupbyRows
    : typeof (formData as any).groupbyRows === 'string'
      ? (formData as any).groupbyRows.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

  const groupbyColumns: string[] = Array.isArray((formData as any).groupbyColumns)
    ? (formData as any).groupbyColumns
    : typeof (formData as any).groupbyColumns === 'string'
      ? (formData as any).groupbyColumns.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

  const metricsRaw = (formData as any).metrics || [];
  const metrics: string[] = (Array.isArray(metricsRaw) ? metricsRaw : [metricsRaw])
    .filter(Boolean)
    .map((m: any) => (typeof m === 'string' ? m : getMetricLabel(m)));

  // -------- totals flags (FIX) --------
  // читаем НОВЫЕ camelCase
  const enableTotalsCamel = (formData as any).enableTotals;
  const showRowTotalsCamel = (formData as any).showRowTotals;
  const showColumnTotalsCamel = (formData as any).showColumnTotals;

  // fallback на старые snake_case (если где-то остались)
  const enableTotalsSnake = (formData as any).show_grand_totals; // старый master
  const showRowTotalsSnake = (formData as any).show_row_totals;
  const showColumnTotalsSnake = (formData as any).show_column_totals;

  const enableTotals =
    enableTotalsCamel !== undefined
      ? enableTotalsCamel !== false
      : enableTotalsSnake !== undefined
        ? enableTotalsSnake !== false
        : true;

  const showRowTotals =
    enableTotals &&
    (showRowTotalsCamel !== undefined
      ? showRowTotalsCamel !== false
      : showRowTotalsSnake !== undefined
        ? showRowTotalsSnake !== false
        : true);

  const showColumnTotals =
    enableTotals &&
    (showColumnTotalsCamel !== undefined
      ? showColumnTotalsCamel !== false
      : showColumnTotalsSnake !== undefined
        ? showColumnTotalsSnake !== false
        : true);

  const showSubtotals = (formData as any).show_subtotals !== false;
  const showCellBars = (formData as any).show_cell_bars !== false;
  const compactDisplay = !!(formData as any).compact_display;

  if (!groupbyRows.length || !metrics.length) {
    return {
      width,
      height,
      data: { rows: [], cols: [], values: {}, rowHierarchy: [] },
      rows: groupbyRows,
      columns: groupbyColumns,
      metrics,
      showSubtotals,
      showRowTotals,
      showColumnTotals,
      showCellBars,
      compactDisplay,
    };
  }

  const pivotData = buildPivotData(data, groupbyRows, groupbyColumns, metrics);

  return {
    width,
    height,
    data: pivotData,
    rows: groupbyRows,
    columns: groupbyColumns,
    metrics,
    showSubtotals,
    showRowTotals,
    showColumnTotals,
    showCellBars,
    compactDisplay,
  };
}

function buildPivotData(data: any[], rowFields: string[], colFields: string[], metrics: string[]) {
  const rows = new Map<string, { key: string; values: string[] }>();
  const cols = new Map<string, { key: string; values: string[] }>();
  const values: Record<string, Record<string, number>> = {};

  const norm = (v: any) => (v === null || v === undefined ? 'NULL' : String(v));

  data.forEach(item => {
    const rowKey = rowFields.map(f => norm(item[f])).join('|');
    const rowValues = rowFields.map(f => norm(item[f]));
    if (!rows.has(rowKey)) rows.set(rowKey, { key: rowKey, values: rowValues });

    const colKey = colFields.map(f => norm(item[f])).join('|'); // если colFields пустые => ''
    const colValues = colFields.map(f => norm(item[f]));
    if (!cols.has(colKey)) cols.set(colKey, { key: colKey, values: colValues });

    const cellKey = `${rowKey}||${colKey}`;
    if (!values[cellKey]) values[cellKey] = {};

    metrics.forEach(metricLabel => {
      const v = item[metricLabel];
      values[cellKey][metricLabel] =
        typeof v === 'number' ? v : v === null || v === undefined ? 0 : Number(v) || 0;
    });
  });

  const rowsArray = Array.from(rows.values()).sort((a, b) =>
    a.values.join('').localeCompare(b.values.join('')),
  );
  const colsArray = Array.from(cols.values()).sort((a, b) =>
    a.values.join('').localeCompare(b.values.join('')),
  );

  const rowHierarchy = buildRowHierarchy(rowsArray);

  return { rows: rowsArray, cols: colsArray, values, rowHierarchy };
}

function buildRowHierarchy(rowsArray: { key: string; values: string[] }[]): RowNode[] {
  const root: { children: Map<string, any> } = { children: new Map() };

  rowsArray.forEach(r => {
    let cur = root;
    const pathParts: string[] = [];

    r.values.forEach((val, i) => {
      pathParts.push(val);
      const path = pathParts.join(' → ');

      if (!cur.children.has(val)) {
        cur.children.set(val, {
          name: val,
          path,
          children: new Map(),
          isLeaf: false,
          key: undefined,
        });
      }

      cur = cur.children.get(val);

      if (i === r.values.length - 1) {
        cur.isLeaf = true;
        cur.key = r.key;
      }
    });
  });

  const mapToNodes = (m: Map<string, any>): RowNode[] =>
    Array.from(m.values())
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map(n => {
        const children = mapToNodes(n.children);
        return {
          name: n.name,
          path: n.path,
          isLeaf: n.isLeaf,
          key: n.key,
          children: children.length ? children : undefined,
        };
      });

  return mapToNodes(root.children);
}
