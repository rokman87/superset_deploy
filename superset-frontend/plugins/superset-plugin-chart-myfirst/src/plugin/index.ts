import { t, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import buildQuery from './buildQuery';
import transformProps from './transformProps';
import controlPanel from './controlPanel';
import thumbnail from '../images/thumbnail.png';

const metadata = new ChartMetadata({
  name: t('Test Pivot'),
  description: t('My first custom chart'),
  thumbnail,
});

export default class SupersetPluginChartMyfirst extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      metadata,
      transformProps,
      controlPanel,
      loadChart: () => import('../SupersetPluginChartMyfirst'),
    });
  }
}
