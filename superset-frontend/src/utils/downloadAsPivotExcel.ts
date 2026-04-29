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
import { utils, writeFile } from 'xlsx';

type RuntimeExportPayload = {
  data?: Record<string, unknown>[];
  colnames?: string[];
};

declare global {
  interface Window {
    customPivotTableRuntimeExports?: Record<string, RuntimeExportPayload>;
  }
}

export default function exportPivotExcel(
  tableSelector: string,
  fileName: string,
) {
  const table = document.querySelector(tableSelector);
  const workbook = utils.table_to_book(table);
  writeFile(workbook, `${fileName}.xlsx`);
}

export function exportCustomPivotRuntimeExcel(
  chartId: string | number | undefined,
  fileName: string,
) {
  const exportPayload =
    chartId !== undefined
      ? window.customPivotTableRuntimeExports?.[String(chartId)]
      : undefined;
  const data = Array.isArray(exportPayload?.data) ? exportPayload.data : [];
  const colnames = Array.isArray(exportPayload?.colnames)
    ? exportPayload.colnames
    : [];

  if (!data.length) {
    exportPivotExcel(
      chartId !== undefined
        ? `#chart-id-${chartId} table.custom-pivot-table-export`
        : 'table.custom-pivot-table-export',
      fileName,
    );
    return;
  }

  const header = colnames.length
    ? colnames
    : Array.from(
        data.reduce<Set<string>>((acc, row) => {
          Object.keys(row || {}).forEach(key => acc.add(key));
          return acc;
        }, new Set()),
      );
  const rows = data.map(row =>
    header.reduce<Record<string, unknown>>((acc, column) => {
      acc[column] = row?.[column];
      return acc;
    }, {}),
  );
  const worksheet = utils.json_to_sheet(rows, { header });
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Runtime data');
  writeFile(workbook, `${fileName}.xlsx`);
}
