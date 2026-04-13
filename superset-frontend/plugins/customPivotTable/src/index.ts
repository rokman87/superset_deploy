import { t, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import buildQuery from './plugin/buildQuery';
import transformProps from './plugin/transformProps';
import controlPanel from './plugin/controlPanel';
import thumbnail from './images/thumbnail-v2.png';

export const CUSTOM_PIVOT_TABLE_VIZ_TYPE = 'customPivotTable';

const metadata = new ChartMetadata({
  category: t('Table'),
  name: t('Custom Pivot Table'),
  description: t('Custom pivot table chart'),
  thumbnail,
});

export default class CustomPivotTableChartPlugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      metadata,
      transformProps,
      controlPanel,
      loadChart: () => import('./CustomPivotTable'),
    });
  }
}
