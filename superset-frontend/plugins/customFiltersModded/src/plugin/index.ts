import { Behavior, ChartMetadata, ChartPlugin, t } from '@superset-ui/core';
import buildQuery from './buildQuery';
import transformProps from './transformProps';
import controlPanel from './controlPanel';
import thumbnail from '../images/thumbnail.png';

const metadata = new ChartMetadata({
  name: t('customFiltersModded'),
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
      loadChart: () => import('../CustomFiltersModded'),
    });
  }
}
