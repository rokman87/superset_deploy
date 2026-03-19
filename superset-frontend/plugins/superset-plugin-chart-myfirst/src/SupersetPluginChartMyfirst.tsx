import React, { useMemo, useState } from 'react';
import { styled } from '@superset-ui/core';

const Styles = styled.div`
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
    background-color: ${({ headerBg }: any) => headerBg || '#2c3e50'};
    color: ${({ headerTextColor }: any) => headerTextColor || '#fff'};
    padding: 8px 12px;
    font-weight: 600;
    white-space: nowrap;
    border-right: 1px solid rgba(255,255,255,0.12);
    border-bottom: 1px solid rgba(0,0,0,0.15);
    position: sticky;
    top: 0;
    z-index: 30;
    box-shadow: 0 1px 0 rgba(0,0,0,0.15);
  }

  tbody td {
    padding: 6px 10px;
    border-bottom: 1px solid #e6e6e6;
    border-right: 1px solid #eee;
    background: #fff;
  }

  .row-header td {
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
    background-color: ${({ grandTotalBg }: any) => grandTotalBg || '#2c3e50'};
    color: #fff;
    font-weight: 700;
    border-right: 1px solid rgba(255,255,255,0.12);
  }

  .expand-icon {
    display: inline-block;
    width: 16px;
    text-align: center;
    margin-right: 4px;
    color: ${({ expandColor }: any) => expandColor || '#7f8c8d'};
  }
`;

type NodeAgg = Record<string, Record<string, number>>;

export default function SupersetPluginChartMyfirst(props: any) {
  const {
    data,
    rows = [],
    columns = [],
    metrics = [],

    showSubtotals = true,
    showRowTotals = true,      // RIGHT Total column
    showColumnTotals = true,   // BOTTOM Grand Total row

    compactDisplay = false,
    headerBg,
    headerTextColor,
    grandTotalBg,
    expandColor,
    height,
    width,
  } = props;

  const rowHierarchy = useMemo(() => data?.rowHierarchy || [], [data]);

  const defaultExpanded = useMemo(() => {
    return new Set((rowHierarchy || []).filter((n: any) => n.children?.length).map((n: any) => n.path));
  }, [rowHierarchy]);

  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!data?.rows?.length || !metrics.length) {
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
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // precompute subtotal aggregates per node
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

    const computeNodeAgg = (node: any): NodeAgg => {
      if (map.has(node.path)) return map.get(node.path)!;
      const agg: NodeAgg = {};

      if (node.isLeaf && node.key) {
        data.cols.forEach((col: any) => {
          const cellKey = `${node.key}||${col.key}`;
          metrics.forEach((metric: string) => {
            const v = data.values[cellKey]?.[metric] || 0;
            addToAgg(agg, col.key, metric, v);
          });
        });
      } else if (node.children?.length) {
        node.children.forEach((child: any) => mergeAgg(agg, computeNodeAgg(child)));
      }

      map.set(node.path, agg);
      return agg;
    };

    (rowHierarchy || []).forEach((n: any) => computeNodeAgg(n));
    return map;
  }, [rowHierarchy, data, metrics]);

  const getNodeAggValue = (node: any, colKey: string, metric: string) => {
    const agg = nodeAggMap.get(node.path);
    return agg?.[colKey]?.[metric] ?? null;
  };

  // total по строке (узлу) — для правого Total column
  const getNodeRowTotal = (node: any) => {
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

  // total по колонке — для нижней строки Grand Total
  const calculateColTotal = (col: any) => {
    let total = 0;
    data.rows.forEach((row: any) => {
      const cellKey = `${row.key}||${col.key}`;
      metrics.forEach((metric: string) => {
        total += data.values[cellKey]?.[metric] || 0;
      });
    });
    return total;
  };

  const calculateGrandTotal = () => {
    let total = 0;
    data.rows.forEach((row: any) => {
      data.cols.forEach((col: any) => {
        const cellKey = `${row.key}||${col.key}`;
        metrics.forEach((metric: string) => {
          total += data.values[cellKey]?.[metric] || 0;
        });
      });
    });
    return total;
  };

  const renderRows = (nodes: any[], level = 0) => {
    let result: any[] = [];

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

          {data.cols.map((col: any) => (
            <React.Fragment key={col.key}>
              {metrics.map((metric: string) => {
                let value = null;

                if (node.isLeaf && node.key) {
                  const cellKey = `${node.key}||${col.key}`;
                  value = data.values[cellKey]?.[metric];
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

          {showRowTotals && (
            <td className="metric-value">
              {formatValue(node.isLeaf || isSubtotalRow ? getNodeRowTotal(node) : null)}
            </td>
          )}
        </tr>
      );

      if (hasChildren && isExpandedNow) {
        result = result.concat(renderRows(node.children, level + 1));
      }
    });

    return result;
  };

  const pad = compactDisplay ? '8px' : '16px';

  return (
    <Styles
      style={{ height, width, padding: pad }}
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

              {data.cols.map((col: any) => (
                <th key={col.key} colSpan={metrics.length}>
                  {columns.length ? (col.values?.join(' → ') || '—') : ' '}
                </th>
              ))}

              {showRowTotals && <th>Total</th>}
            </tr>

            <tr>
              <th />
              {data.cols.map((col: any) => (
                <React.Fragment key={col.key}>
                  {metrics.map((metric: string) => (
                    <th key={`${col.key}-${metric}`}>{metric}</th>
                  ))}
                </React.Fragment>
              ))}
              {showRowTotals && <th />}
            </tr>
          </thead>

          <tbody>
            {renderRows(rowHierarchy)}

            {showColumnTotals && (
              <tr className="total-row">
                <td><strong>Grand Total</strong></td>

                {data.cols.map((col: any) => (
                  <React.Fragment key={col.key}>
                    {metrics.map((metric: string) => (
                      <td key={`${col.key}-${metric}`} className="metric-value">
                        <strong>{formatValue(calculateColTotal(col))}</strong>
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
          </tbody>
        </table>
      </div>
    </Styles>
  );
}
