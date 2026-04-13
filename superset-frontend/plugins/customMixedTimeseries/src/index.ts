import { AnnotationType, Behavior, t } from '@superset-ui/core';
import buildQuery from '../../plugin-chart-echarts/src/MixedTimeseries/buildQuery';
import thumbnail from './images/thumbnail.png';
import example from '../../plugin-chart-echarts/src/MixedTimeseries/images/example.jpg';
import controlPanel from './controlPanel';
import transformProps from './transformProps';
import {
  CustomMixedTimeseriesFormData,
  CustomMixedTimeseriesProps,
} from './types';
import { EchartsChartPlugin } from '../../plugin-chart-echarts/src/types';

export const CUSTOM_MIXED_TIMESERIES_VIZ_TYPE = 'custom_mixed_timeseries';

export default class CustomMixedTimeseriesChartPlugin extends EchartsChartPlugin<
  CustomMixedTimeseriesFormData,
  CustomMixedTimeseriesProps
> {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./CustomMixedTimeseries'),
      metadata: {
        behaviors: [
          Behavior.InteractiveChart,
          Behavior.DrillToDetail,
          Behavior.DrillBy,
        ],
        category: t('Evolution'),
        credits: ['https://echarts.apache.org'],
        description: t(
          'Custom chart based on the existing mixed chart with the same dual-series behavior.',
        ),
        supportedAnnotationTypes: [
          AnnotationType.Event,
          AnnotationType.Formula,
          AnnotationType.Interval,
          AnnotationType.Timeseries,
        ],
        exampleGallery: [{ url: example }],
        name: t('Custom Mixed Chart'),
        thumbnail,
        tags: [
          t('Advanced-Analytics'),
          t('Custom'),
          t('ECharts'),
          t('Line'),
          t('Multi-Variables'),
          t('Time'),
          t('Transformable'),
        ],
        queryObjectCount: 2,
      },
      // @ts-ignore
      transformProps,
    });
  }
}
