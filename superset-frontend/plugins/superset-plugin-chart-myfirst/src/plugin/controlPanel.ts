import { t, validateNonEmpty } from '@superset-ui/core';
import { ControlPanelConfig, sharedControls } from '@superset-ui/chart-controls';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'groupbyRows',
            config: {
              ...sharedControls.groupby,
              label: t('Rows'),
              description: t('Columns to group by on the rows'),
            },
          },
        ],
        [
          {
            name: 'groupbyColumns',
            config: {
              ...sharedControls.groupby,
              label: t('Columns'),
              description: t('Columns to group by on the columns'),
            },
          },
        ],
        [
          {
            name: 'metrics',
            config: {
              ...sharedControls.metrics,
              validators: [validateNonEmpty],
            },
          },
        ],
        ['adhoc_filters'],
        ['row_limit'],
      ],
    },
    {
      label: t('Options'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'show_subtotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show subtotals'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            // MASTER switch
            name: 'enableTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Enable totals'),
              default: true,
              renderTrigger: true,
              description: t('Master switch for totals'),
            },
          },
        ],
        [
          {
            // RIGHT total column
            name: 'showRowTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show row totals'),
              default: true,
              renderTrigger: true,
              description: t('Show Total column on the right'),
            },
          },
        ],
        [
          {
            // BOTTOM grand total row
            name: 'showColumnTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Show column totals'),
              default: true,
              renderTrigger: true,
              description: t('Show Grand Total row at the bottom'),
            },
          },
        ],
        [
          {
            name: 'show_cell_bars',
            config: {
              type: 'CheckboxControl',
              label: t('Show cell bars'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'compact_display',
            config: {
              type: 'CheckboxControl',
              label: t('Compact display'),
              default: false,
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
