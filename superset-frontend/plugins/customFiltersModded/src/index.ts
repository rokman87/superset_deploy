import { Behavior, ChartMetadata, ChartPlugin, t } from '@superset-ui/core';
import buildQuery from './plugin/buildQuery';
import transformProps from './plugin/transformProps';
import controlPanel from './plugin/controlPanel';
import thumbnail from './images/thumbnail-v2.png';

const metadata = new ChartMetadata({
  name: t('Custom Filters Modded'),
  description: t('A configurable set of dropdown filters that can drive dashboard cross-filtering'),
  thumbnail,
  behaviors: [Behavior.InteractiveChart],
  tags: [t('Experimental')],
});

export default class CustomFiltersModdedChartPlugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      metadata,
      transformProps,
      controlPanel,
      loadChart: () => import('./CustomFiltersModded'),
    });
  }
}
