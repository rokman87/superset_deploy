import type { EChartsCoreOption } from 'echarts/core';
import {
  EchartsMixedTimeseriesChartTransformedProps,
  EchartsMixedTimeseriesFormData,
  EchartsMixedTimeseriesProps,
} from '../../plugin-chart-echarts/src/MixedTimeseries/types';
import { ColorPickerValue } from '../../plugin-chart-echarts/src/Timeseries/types';

export type CustomMixedTimeseriesFormData = EchartsMixedTimeseriesFormData & {
  valueLabelOffset?: number;
  valueLabelOffsetB?: number;
  centerBarValueLabel?: boolean;
  centerBarValueLabelB?: boolean;
  valueLabelColor?: ColorPickerValue;
  valueLabelColorB?: ColorPickerValue;
  valueLabelFontWeight?: 'normal' | 'bold';
  valueLabelFontWeightB?: 'normal' | 'bold';
  valueLabelBackgroundEnabled?: boolean;
  valueLabelBackgroundEnabledB?: boolean;
  valueLabelBackgroundColor?: ColorPickerValue;
  valueLabelBackgroundColorB?: ColorPickerValue;
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
