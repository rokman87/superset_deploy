import { t, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import buildQuery from './buildQuery';
import transformProps from './transformProps';
import controlPanel from './controlPanel';
import thumbnail from '../images/thumbnail-v2.png';

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
      loadChart: () => import('../CustomPivotTable'),
    });
  }
}
