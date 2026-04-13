import type { SeriesOption } from 'echarts';
import { SupersetTheme } from '@superset-ui/core';
import baseTransformProps from '../../plugin-chart-echarts/src/MixedTimeseries/transformProps';
import { EchartsTimeseriesSeriesType } from '../../plugin-chart-echarts/src/Timeseries/types';
import {
  CustomMixedTimeseriesChartTransformedProps,
  CustomMixedTimeseriesFormData,
  CustomMixedTimeseriesProps,
} from './types';

function toRgbaString(
  color?: CustomMixedTimeseriesFormData['valueLabelColor'],
): string | undefined {
  if (!color) {
    return undefined;
  }
  const alpha = color.a ?? 1;
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function withCustomValueLabelConfig(
  seriesOption: SeriesOption,
  formData: CustomMixedTimeseriesFormData,
  theme?: SupersetTheme,
): SeriesOption {
  const { queryIndex } = seriesOption as { queryIndex?: number };
  if (queryIndex !== 0 && queryIndex !== 1) {
    return seriesOption;
  }

  const { label } = seriesOption as { label?: Record<string, unknown> };
  if (!label) {
    return seriesOption;
  }

  const isFirstQuery = queryIndex === 0;
  const seriesType = isFirstQuery ? formData.seriesType : formData.seriesTypeB;
  const valueLabelOffset = isFirstQuery
    ? (formData.valueLabelOffset ?? 0)
    : (formData.valueLabelOffsetB ?? 0);
  const centerBarValueLabel = isFirstQuery
    ? (formData.centerBarValueLabel ?? false)
    : (formData.centerBarValueLabelB ?? false);
  const valueLabelColor = isFirstQuery
    ? toRgbaString(formData.valueLabelColor)
    : toRgbaString(formData.valueLabelColorB);
  const isCenteredBarLabel =
    seriesType === EchartsTimeseriesSeriesType.Bar && centerBarValueLabel;

  return {
    ...seriesOption,
    label: {
      ...label,
      distance: isCenteredBarLabel ? 0 : valueLabelOffset,
      position: isCenteredBarLabel ? 'inside' : label.position,
      color:
        valueLabelColor ?? (isCenteredBarLabel ? '#fff' : theme?.colorText),
      fontWeight: 'bold',
      textBorderColor: isCenteredBarLabel ? 'transparent' : theme?.colorBgBase,
      textBorderWidth: isCenteredBarLabel ? 0 : 3,
      textShadowBlur: isCenteredBarLabel ? 0 : 2,
      textShadowColor: isCenteredBarLabel ? 'transparent' : theme?.colorBgBase,
    },
  };
}

export default function transformProps(
  chartProps: CustomMixedTimeseriesProps,
): CustomMixedTimeseriesChartTransformedProps {
  const transformed = baseTransformProps(chartProps as never);
  const currentSeries = transformed.echartOptions?.series;

  return {
    ...transformed,
    formData: chartProps.formData,
    echartOptions: {
      ...transformed.echartOptions,
      series: Array.isArray(currentSeries)
        ? currentSeries.map(seriesOption =>
            withCustomValueLabelConfig(
              seriesOption as SeriesOption,
              chartProps.formData,
              chartProps.theme,
            ),
          )
        : currentSeries,
    },
  };
}
