import type { EChartsCoreOption } from 'echarts/core';
import {
  EchartsMixedTimeseriesChartTransformedProps,
  EchartsMixedTimeseriesFormData,
  EchartsMixedTimeseriesProps,
} from '../../plugin-chart-echarts/src/MixedTimeseries/types';

type ColorPickerValue = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

export type CustomMixedTimeseriesFormData = EchartsMixedTimeseriesFormData & {
  valueLabelOffset?: number;
  valueLabelOffsetB?: number;
  centerBarValueLabel?: boolean;
  centerBarValueLabelB?: boolean;
  valueLabelColor?: ColorPickerValue;
  valueLabelColorB?: ColorPickerValue;
};

export interface CustomMixedTimeseriesProps
  extends Omit<EchartsMixedTimeseriesProps, 'formData'> {
  formData: CustomMixedTimeseriesFormData;
}

export type CustomMixedTimeseriesChartTransformedProps = Omit<
  EchartsMixedTimeseriesChartTransformedProps,
  'formData' | 'echartOptions'
> & {
  formData: CustomMixedTimeseriesFormData;
  echartOptions: EChartsCoreOption;
};
