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
import type {
  CustomSeriesOption,
  CustomSeriesRenderItem,
  SeriesOption,
} from 'echarts';
import type { SeriesLabelOption } from 'echarts/types/src/util/types';
import { getNumberFormatter } from '@superset-ui/core';
import type { SupersetTheme } from '@superset-ui/core';
import baseTransformProps from '../../transformProps';
import {
  EchartsTimeseriesChartProps,
  EchartsTimeseriesFormData,
  OrientationType,
  TimeseriesChartTransformedProps,
  ColorPickerValue,
} from '../../types';

function toRgbaString(color?: ColorPickerValue): string | undefined {
  if (!color) {
    return undefined;
  }
  const alpha = color.a ?? 1;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function getSeriesValue(value: unknown): [string | number, number] | null {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[1] === 'number'
  ) {
    return [value[0] as string | number, value[1]];
  }
  if (
    value &&
    typeof value === 'object' &&
    'value' in value &&
    Array.isArray((value as { value?: unknown[] }).value)
  ) {
    const nestedValue = (value as { value: unknown[] }).value;
    if (nestedValue.length >= 2 && typeof nestedValue[1] === 'number') {
      return [nestedValue[0] as string | number, nestedValue[1]];
    }
  }
  return null;
}

function withCustomValueLabelConfig(
  seriesOption: SeriesOption,
  formData: EchartsTimeseriesFormData,
  theme?: SupersetTheme,
): SeriesOption {
  const { label } = seriesOption as { label?: SeriesLabelOption };
  if (!label) {
    return seriesOption;
  }

  const isBarSeries = seriesOption.type === 'bar';
  const isCenteredBarLabel =
    isBarSeries && Boolean(formData.centerBarValueLabel);
  const valueLabelColor = toRgbaString(formData.valueLabelColor);
  const valueLabelBackgroundColor = toRgbaString(
    formData.valueLabelBackgroundColor,
  );
  const hasBackground = Boolean(formData.valueLabelBackgroundEnabled);

  return {
    ...seriesOption,
    label: {
      ...label,
      distance: isCenteredBarLabel ? 0 : (formData.valueLabelOffset ?? 0),
      position: isCenteredBarLabel
        ? 'inside'
        : formData.orientation === OrientationType.Horizontal
          ? 'right'
          : 'top',
      color:
        valueLabelColor ??
        (isCenteredBarLabel && !hasBackground ? '#ffffff' : theme?.colorText),
      fontWeight: formData.valueLabelFontWeight ?? 'normal',
      backgroundColor: hasBackground
        ? (valueLabelBackgroundColor ?? theme?.colorBgContainer)
        : 'transparent',
      borderRadius: hasBackground ? 4 : 0,
      padding: hasBackground ? [4, 6] : 0,
      textBorderColor: hasBackground ? 'transparent' : theme?.colorBgBase,
      textBorderWidth: hasBackground ? 0 : 3,
      textShadowBlur: hasBackground ? 0 : 2,
      textShadowColor: hasBackground ? 'transparent' : theme?.colorBgBase,
    },
  };
}

const renderChangeWhisker: CustomSeriesRenderItem = (params, api) => {
  const fromX = api.value(0);
  const fromY = api.value(1);
  const toX = api.value(2);
  const toY = api.value(3);
  const label = String(api.value(4) ?? '');
  const color = String(api.value(5) ?? '');
  const textColor = String(api.value(6) ?? '');
  const backgroundColor = String(api.value(7) ?? '');

  const fromCoord = api.coord([fromX, fromY]);
  const toCoord = api.coord([toX, toY]);
  const categoryWidth = api.size([1, 0])[0];
  const edgeInset = Math.max(categoryWidth * 0.22, 10);
  const startX = fromCoord[0] + edgeInset;
  const endX = toCoord[0] - edgeInset;
  const topY = Math.min(fromCoord[1], toCoord[1]) - 26;
  const labelX = (startX + endX) / 2;
  const arrowSize = 7;
  const arrowTipY = toCoord[1] - 10;
  const arrowBaseY = arrowTipY - arrowSize;

  return {
    type: 'group',
    silent: true,
    children: [
      {
        type: 'line',
        shape: {
          x1: startX,
          y1: fromCoord[1] - 4,
          x2: startX,
          y2: topY,
        },
        style: {
          stroke: color,
          lineWidth: 1.5,
        },
      },
      {
        type: 'line',
        shape: {
          x1: startX,
          y1: topY,
          x2: endX,
          y2: topY,
        },
        style: {
          stroke: color,
          lineWidth: 1.5,
        },
      },
      {
        type: 'line',
        shape: {
          x1: endX,
          y1: topY,
          x2: endX,
          y2: arrowBaseY,
        },
        style: {
          stroke: color,
          lineWidth: 1.5,
        },
      },
      {
        type: 'text',
        style: {
          x: labelX,
          y: topY - 6,
          text: label,
          textAlign: 'center',
          textVerticalAlign: 'bottom',
          fill: textColor,
          backgroundColor,
          borderColor: color,
          borderWidth: 1,
          borderRadius: 4,
          padding: [4, 8],
          fontWeight: 700,
        },
      },
      {
        type: 'polygon',
        shape: {
          points: [
            [endX, arrowTipY],
            [endX - arrowSize, arrowBaseY],
            [endX + arrowSize, arrowBaseY],
          ],
        },
        style: {
          fill: color,
        },
      },
    ],
  };
};

function buildChangeWhiskerSeries(
  series: SeriesOption[],
  formData: EchartsTimeseriesFormData,
  theme?: SupersetTheme,
): CustomSeriesOption | undefined {
  const eligibleBarSeries = series.filter(
    entry => entry.type === 'bar' && !(entry as { stack?: string }).stack,
  );

  if (eligibleBarSeries.length !== 1) {
    return undefined;
  }

  const [barSeries] = eligibleBarSeries;
  const seriesData = Array.isArray(barSeries.data)
    ? barSeries.data
        .map(getSeriesValue)
        .filter((value): value is [string | number, number] => value !== null)
    : [];

  if (seriesData.length < 2) {
    return undefined;
  }

  const textColor = theme?.colorText ?? '';
  const backgroundColor = theme?.colorBgContainer ?? '';
  const positiveColor =
    toRgbaString(formData.changeWhiskerPositiveColor) ?? theme?.colorSuccess;
  const negativeColor =
    toRgbaString(formData.changeWhiskerNegativeColor) ?? theme?.colorError;
  const isPercentDisplay = formData.changeWhiskerDisplayMode !== 'absolute';
  const changeFormatter = getNumberFormatter(
    formData.changeWhiskerNumberFormat || (isPercentDisplay ? '+.0%' : '+,.0f'),
  );
  const whiskerData = seriesData
    .slice(1)
    .map((currentPoint, index) => {
      const previousPoint = seriesData[index];
      const [fromX, fromY] = previousPoint;
      const [toX, toY] = currentPoint;

      if (fromY === 0) {
        return null;
      }

      const absoluteChange = toY - fromY;
      const displayValue = isPercentDisplay
        ? absoluteChange / Math.abs(fromY)
        : absoluteChange;
      const color = absoluteChange >= 0 ? positiveColor : negativeColor;
      return [
        fromX,
        fromY,
        toX,
        toY,
        changeFormatter(displayValue),
        color,
        textColor,
        backgroundColor,
      ];
    })
    .filter((value): value is (string | number)[] => value !== null);

  if (!whiskerData.length) {
    return undefined;
  }

  return {
    type: 'custom',
    name: '__change_whiskers__',
    animation: false,
    silent: true,
    renderItem: renderChangeWhisker,
    data: whiskerData,
    z: 20,
    tooltip: {
      show: false,
    },
  };
}

export default function transformProps(
  chartProps: EchartsTimeseriesChartProps,
): TimeseriesChartTransformedProps {
  const transformed = baseTransformProps(chartProps);
  const currentSeries = Array.isArray(transformed.echartOptions?.series)
    ? transformed.echartOptions.series
    : [];

  const customizedSeries = currentSeries.map(seriesOption =>
    withCustomValueLabelConfig(
      seriesOption as SeriesOption,
      chartProps.formData,
      chartProps.theme,
    ),
  );

  const changeWhiskerSeries =
    chartProps.formData.orientation === OrientationType.Vertical &&
    chartProps.formData.showValueChangeWhiskers
      ? buildChangeWhiskerSeries(
          customizedSeries as SeriesOption[],
          chartProps.formData,
          chartProps.theme,
        )
      : undefined;

  return {
    ...transformed,
    echartOptions: {
      ...transformed.echartOptions,
      series: changeWhiskerSeries
        ? [...customizedSeries, changeWhiskerSeries]
        : customizedSeries,
    },
  };
}
