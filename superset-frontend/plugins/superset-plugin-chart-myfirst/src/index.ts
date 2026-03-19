import { t, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import buildQuery from './plugin/buildQuery';
import transformProps from './plugin/transformProps';
import controlPanel from './plugin/controlPanel';
import thumbnail from './images/thumbnail.png';

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
      loadChart: () => import('./SupersetPluginChartMyfirst'),
    });
  }
}