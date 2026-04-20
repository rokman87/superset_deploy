/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ChartProps, supersetTheme } from '@superset-ui/core';
import transformProps from '../../src/plugin/transformProps';

describe('CustomPivotTable transformProps', () => {
  const formData = {
    datasource: '3__table',
    groupbyRows: ['name'],
    groupbyColumns: ['category'],
    metrics: [{ label: 'sum__num', optionName: 'sum__num', d3format: ',.1f' }],
    selectableMetrics: [{ label: 'avg__num', optionName: 'avg__num', d3format: '.2%' }],
    y_axis_format: ',.2f',
    metricD3Formats: [{ metric: 'sum__num', d3Format: '$,.2f' }],
    rowSqlFormats: [{ sqlExpression: "name = 'Hulk'", d3Format: ',.0f' }],
    rowOrder: 'value_z_to_a',
    colOrder: 'key_z_to_a',
  };
  const chartProps = new ChartProps({
    formData,
    width: 800,
    height: 600,
    theme: supersetTheme,
    queriesData: [
      {
        data: [{ name: 'Hulk', category: 'A', sum__num: 1, avg__num: 0.25 }],
        colnames: ['name', 'category', 'sum__num', 'avg__num'],
      },
    ],
  });

  it('should transform chart props for viz', () => {
    expect(transformProps(chartProps)).toMatchObject({
      width: 800,
      height: 600,
      data: [{ name: 'Hulk', category: 'A', sum__num: 1, avg__num: 0.25 }],
      rowOrder: 'value_z_to_a',
      colOrder: 'key_z_to_a',
      numberFormat: ',.2f',
      metricD3Formats: [{ metric: 'sum__num', d3Format: '$,.2f' }],
      rowSqlFormats: [{ sqlExpression: "name = 'Hulk'", d3Format: ',.0f' }],
      rows: [{ key: 'name', queryKey: 'name', label: 'name' }],
      columns: [{ key: 'category', queryKey: 'category', label: 'category' }],
      defaultMetricKeys: ['sum__num'],
    });

    expect(transformProps(chartProps).metrics).toEqual([
      expect.objectContaining({
        key: 'sum__num',
        label: 'sum__num',
        savedD3Format: ',.1f',
      }),
      expect.objectContaining({
        key: 'avg__num',
        label: 'avg__num',
        savedD3Format: '.2%',
      }),
    ]);
  });
});
