import React, { useEffect, useMemo, useState } from 'react';
import { styled } from '@superset-ui/core';

const HEADER_ROW_HEIGHT = 34;

type StyleProps = {
  headerBg?: string;
  headerTextColor?: string;
  grandTotalBg?: string;
  expandColor?: string;
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

const Styles = styled.div<StyleProps>`
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  .table-scroll {
    height: 100%;
    overflow: auto;
    background: #fff;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 12px;
    border: 1px solid #ddd;
  }

  thead th {
    background-color: ${({ headerBg }) => headerBg || '#2c3e50'};
    color: ${({ headerTextColor }) => headerTextColor || '#fff'};
    padding: 8px 12px;
    font-weight: 600;
    white-space: nowrap;
    border-right: 1px solid rgba(255,255,255,0.12);
    border-bottom: 1px solid rgba(0,0,0,0.15);
    position: sticky;
    z-index: 30;
    box-shadow: 0 1px 0 rgba(0,0,0,0.15);
  }

  thead tr:nth-child(1) th {
    top: 0;
    z-index: 40;
  }

  thead tr:nth-child(2) th {
    top: ${HEADER_ROW_HEIGHT}px;
    z-index: 39;
  }

  tbody td {
    padding: 6px 10px;
    border-bottom: 1px solid #e6e6e6;
    border-right: 1px solid #eee;
    background: #fff;
  }

  .row-header {
    background-color: #f5f5f5;
    font-weight: 500;
    cursor: pointer;
  }

  .row-header:hover td {
    background-color: #e8e8e8;
  }

  .metric-value {
    text-align: right;
    font-family: monospace;
  }

  .subtotal-row td {
    background: #eef2f6;
    font-weight: 600;
  }

  .total-row td {
    background-color: ${({ grandTotalBg }) => grandTotalBg || '#2c3e50'};
    color: #fff;
    font-weight: 700;
    border-right: 1px solid rgba(255,255,255,0.12);
  }

  .expand-icon {
    display: inline-block;
    width: 16px;
    text-align: center;
    margin-right: 4px;
    color: ${({ expandColor }) => expandColor || '#7f8c8d'};
  }
`;

function buildRowHierarchyFromRows(rowsArray: PivotRow[]): TreeNode[] {
  const root: { children: Map<string, InternalTreeNode> } = {
    children: new Map<string, InternalTreeNode>(),
  };

  rowsArray.forEach(r => {
    let curChildren = root.children;
    const pathParts: string[] = [];

    (r.values || []).forEach((val: string, i: number) => {
      const name = String(val);
      pathParts.push(name);
      const path = pathParts.join(' → ');

      if (!curChildren.has(name)) {
        curChildren.set(name, {
          name,
          path,
          isLeaf: false,
          key: undefined,
          children: new Map<string, InternalTreeNode>(),
        });
      }

      const node = curChildren.get(name)!;

      if (i === (r.values || []).length - 1) {
        node.isLeaf = true;
        node.key = r.key;
      }

      curChildren = node.children;
    });
  });

  const toNodes = (m: Map<string, InternalTreeNode>): TreeNode[] =>
    Array.from(m.values())
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .map((n): TreeNode => {
        const children: TreeNode[] = toNodes(n.children);
        return {
          name: n.name,
          path: n.path,
          isLeaf: n.isLeaf,
          key: n.key,
          children: children.length ? children : undefined,
        };
      });

  return toNodes(root.children);
}

export default function SupersetPluginChartMyfirst(props: any) {
  const {
    data,
    rows = [],
    columns = [],
    metrics = [],
    showSubtotals = true,
    showGrandTotals = true,
    showRowTotals: showRowTotalsFromProps,
    showColumnTotals: showColumnTotalsFromProps,
    showRowTotalsProp,
    showColumnTotalsProp,
    compactDisplay = false,
    headerBg,
    headerTextColor,
    grandTotalBg,
    expandColor,
    height,
    width,
  } = props;

  const pivotData: PivotData = data;
  const showRowTotals = (showRowTotalsFromProps ?? showRowTotalsProp ?? true) as boolean;
  const showColumnTotals = (showColumnTotalsFromProps ?? showColumnTotalsProp ?? true) as boolean;

  const effectiveShowRowTotals = showGrandTotals && showRowTotals;
  const effectiveShowColumnTotals = showGrandTotals && showColumnTotals;

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[myfirst pivot] totals flags effective', {
      showGrandTotals,
      showRowTotalsFromProps,
      showColumnTotalsFromProps,
      showRowTotalsProp,
      showColumnTotalsProp,
      effective: { effectiveShowRowTotals, effectiveShowColumnTotals },
    });
  }, [
    showGrandTotals,
    showRowTotalsFromProps,
    showColumnTotalsFromProps,
    showRowTotalsProp,
    showColumnTotalsProp,
    effectiveShowRowTotals,
    effectiveShowColumnTotals,
  ]);

  const rowHierarchy = useMemo<TreeNode[]>(() => {
    if (pivotData?.rowHierarchy?.length) return pivotData.rowHierarchy;
    if (pivotData?.rows?.length) return buildRowHierarchyFromRows(pivotData.rows);
    return [];
  }, [pivotData]);

  const defaultExpanded = useMemo(
    () => new Set(rowHierarchy.filter(n => n.children?.length).map(n => n.path)),
    [rowHierarchy],
  );

  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded);

  if (!pivotData?.rows?.length || !metrics.length) {
    return (
      <div style={{ height, width, padding: 20, textAlign: 'center' }}>
        <h3>Pivot Table</h3>
        <p>Select rows and metrics to display data</p>
      </div>
    );
  }

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return String(value);
  };

  const toggleExpand = (path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const nodeAggMap = useMemo(() => {
    const map = new Map<string, NodeAgg>();

    const addToAgg = (agg: NodeAgg, colKey: string, metric: string, v: number) => {
      if (!agg[colKey]) agg[colKey] = {};
      agg[colKey][metric] = (agg[colKey][metric] || 0) + (v || 0);
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
          metrics.forEach((metric: string) => {
            const v = pivotData.values[cellKey]?.[metric] || 0;
            addToAgg(agg, col.key, metric, v);
          });
        });
      } else if (node.children?.length) {
        node.children.forEach(child => mergeAgg(agg, computeNodeAgg(child)));
      }

      map.set(node.path, agg);
      return agg;
    };

    rowHierarchy.forEach(n => computeNodeAgg(n));
    return map;
  }, [rowHierarchy, pivotData, metrics]);

  const getNodeAggValue = (node: TreeNode, colKey: string, metric: string) => {
    const agg = nodeAggMap.get(node.path);
    return agg?.[colKey]?.[metric] ?? null;
  };

  const getNodeTotal = (node: TreeNode) => {
    const agg = nodeAggMap.get(node.path);
    if (!agg) return 0;

    let total = 0;
    Object.keys(agg).forEach(colKey => {
      metrics.forEach((metric: string) => {
        total += agg[colKey]?.[metric] || 0;
      });
    });
    return total;
  };

  const calculateColTotal = (col: PivotCol, metric: string) => {
    let total = 0;
    pivotData.rows.forEach(row => {
      const cellKey = `${row.key}||${col.key}`;
      total += pivotData.values[cellKey]?.[metric] || 0;
    });
    return total;
  };

  const calculateGrandTotal = () => {
    let total = 0;
    pivotData.rows.forEach(row => {
      pivotData.cols.forEach(col => {
        const cellKey = `${row.key}||${col.key}`;
        metrics.forEach((metric: string) => {
          total += pivotData.values[cellKey]?.[metric] || 0;
        });
      });
    });
    return total;
  };

  const renderRows = (nodes: TreeNode[], level = 0): React.ReactNode[] => {
    let result: React.ReactNode[] = [];

    nodes.forEach(node => {
      const hasChildren = !!node.children?.length;
      const isExpandedNow = expanded.has(node.path);
      const isSubtotalRow = hasChildren && showSubtotals;

      result.push(
        <tr key={node.path} className={`row-header ${isSubtotalRow ? 'subtotal-row' : ''}`}>
          <td onClick={() => hasChildren && toggleExpand(node.path)}>
            <span style={{ display: 'inline-block', width: level * 18 }} />
            {hasChildren && <span className="expand-icon">{isExpandedNow ? '▼' : '▶'}</span>}
            {node.name}
          </td>

          {pivotData.cols.map(col => (
            <React.Fragment key={col.key}>
              {metrics.map((metric: string) => {
                let value = null;

                if (node.isLeaf && node.key) {
                  const cellKey = `${node.key}||${col.key}`;
                  value = pivotData.values[cellKey]?.[metric];
                } else if (isSubtotalRow) {
                  value = getNodeAggValue(node, col.key, metric);
                }

                return (
                  <td key={`${col.key}-${metric}`} className="metric-value">
                    {formatValue(value)}
                  </td>
                );
              })}
            </React.Fragment>
          ))}

          {effectiveShowRowTotals && (
            <td className="metric-value">
              {formatValue(getNodeTotal(node))}
            </td>
          )}
        </tr>,
      );

      if (hasChildren && isExpandedNow) {
        result = result.concat(renderRows(node.children!, level + 1));
      }
    });

    return result;
  };

  return (
    <Styles
      style={{ height, width, padding: compactDisplay ? '8px' : '16px' }}
      headerBg={headerBg}
      headerTextColor={headerTextColor}
      grandTotalBg={grandTotalBg}
      expandColor={expandColor}
      className={compactDisplay ? 'compact' : ''}
    >
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{rows.length ? rows.join(' → ') : 'Rows'}</th>

              {pivotData.cols.map(col => (
                <th key={col.key} colSpan={metrics.length}>
                  {columns.length ? (col.values?.join(' → ') || '—') : ' '}
                </th>
              ))}

              {effectiveShowRowTotals && <th>Total</th>}
            </tr>

            <tr>
              <th />
              {pivotData.cols.map(col => (
                <React.Fragment key={col.key}>
                  {metrics.map((metric: string) => (
                    <th key={`${col.key}-${metric}`}>{metric}</th>
                  ))}
                </React.Fragment>
              ))}
              {effectiveShowRowTotals && <th />}
            </tr>
          </thead>

          <tbody>
            {renderRows(rowHierarchy)}

            {effectiveShowColumnTotals && (
              <tr className="total-row">
                <td><strong>Grand Total</strong></td>

                {pivotData.cols.map(col => (
                  <React.Fragment key={col.key}>
                    {metrics.map((metric: string) => (
                      <td key={`${col.key}-${metric}`} className="metric-value">
                        <strong>{formatValue(calculateColTotal(col, metric))}</strong>
                      </td>
                    ))}
                  </React.Fragment>
                ))}

                {effectiveShowRowTotals && (
                  <td className="metric-value">
                    <strong>{formatValue(calculateGrandTotal())}</strong>
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Styles>
  );
}