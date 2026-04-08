import { ControlPanelConfig, sharedControls } from '@superset-ui/chart-controls';
import { t, validateNonEmpty } from '@superset-ui/core';
import FilterSettingsControl from './FilterSettingsControl';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'filterColumns',
            config: {
              ...sharedControls.groupby,
              label: t('Filter columns'),
              description: t('Columns that will be rendered as dropdown filters inside the chart'),
              validators: [validateNonEmpty],
            },
          },
        ],
        ['adhoc_filters'],
        [
          {
            name: 'filterRowLimit',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Option row limit'),
              default: 1000,
              choices: [
                [250, '250'],
                [500, '500'],
                [1000, '1000'],
                [5000, '5000'],
              ],
              description: t('Maximum number of distinct rows used to build dropdown options'),
            },
          },
          {
            name: 'asyncSearchRowLimit',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Async search limit'),
              default: 100,
              choices: [
                [30, '30'],
                [50, '50'],
                [100, '100'],
                [250, '250'],
                [500, '500'],
              ],
              description: t('Maximum number of options returned from server search for large filters'),
            },
          },
        ],
        [
          {
            name: 'enableAsyncSearch',
            config: {
              type: 'CheckboxControl',
              label: t('Async search for large filters'),
              default: true,
              renderTrigger: true,
            },
          },
          {
            name: 'asyncSearchThreshold',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Async search threshold'),
              default: 30,
              renderTrigger: true,
              choices: [
                [30, '30'],
                [50, '50'],
                [100, '100'],
                [250, '250'],
              ],
              description: t('Switch to server search when the loaded option count reaches this size'),
            },
          },
        ],
      ],
    },
    {
      label: t('Display'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'panelTitle',
            config: {
              type: 'TextControl',
              label: t('Panel title'),
              default: 'Dashboard Filters',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'columnsPerRow',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Dropdowns per row'),
              default: 6,
              renderTrigger: true,
              choices: [
                [1, '1'],
                [2, '2'],
                [3, '3'],
                [4, '4'],
                [6, '6'],
                [8, '8'],
                [10, '10'],
                [12, '12'],
              ],
            },
          },
          {
            name: 'emptyValueLabel',
            config: {
              type: 'TextControl',
              label: t('Empty value label'),
              default: '(Empty)',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'allowMultipleSelections',
            config: {
              type: 'CheckboxControl',
              label: t('Default multi select mode'),
              default: true,
              renderTrigger: true,
            },
          },
          {
            name: 'showSearch',
            config: {
              type: 'CheckboxControl',
              label: t('Enable search'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'showTitle',
            config: {
              type: 'CheckboxControl',
              label: t('Show title'),
              default: false,
              renderTrigger: true,
            },
          },
          {
            name: 'hideFilterLabels',
            config: {
              type: 'CheckboxControl',
              label: t('Hide filter labels'),
              default: false,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'collapsedByDefault',
            config: {
              type: 'CheckboxControl',
              label: t('Collapsed by default'),
              default: true,
              renderTrigger: true,
            },
          },
          {
            name: 'stretchSingleRow',
            config: {
              type: 'CheckboxControl',
              label: t('Prefer single row'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'maxVisibleFilters',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Visible when collapsed'),
              default: 4,
              renderTrigger: true,
              choices: [
                [1, '1'],
                [2, '2'],
                [3, '3'],
                [4, '4'],
                [5, '5'],
                [6, '6'],
                [8, '8'],
              ],
            },
          },
          {
            name: 'controlSize',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Control size'),
              default: 'small',
              renderTrigger: true,
              choices: [
                ['small', t('Small')],
                ['middle', t('Medium')],
                ['large', t('Large')],
              ],
            },
          },
        ],
        [
          {
            name: 'minControlWidth',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Min control width'),
              default: 140,
              renderTrigger: true,
              choices: [
                [100, '100'],
                [120, '120'],
                [140, '140'],
                [160, '160'],
                [180, '180'],
                [220, '220'],
              ],
            },
          },
          {
            name: 'gapSize',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Gap'),
              default: 6,
              renderTrigger: true,
              choices: [
                [2, '2'],
                [4, '4'],
                [6, '6'],
                [8, '8'],
                [10, '10'],
                [12, '12'],
              ],
            },
          },
        ],
        [
          {
            name: 'cardPadding',
            config: {
              type: 'SelectControl',
              freeForm: true,
              label: t('Padding'),
              default: 8,
              renderTrigger: true,
              choices: [
                [0, '0'],
                [4, '4'],
                [6, '6'],
                [8, '8'],
                [10, '10'],
                [12, '12'],
              ],
            },
          },
        ],
        [
          {
            name: 'filterSettings',
            config: {
              type: FilterSettingsControl,
              label: t('Filter settings'),
              description: t('Set default values and single or multi select mode for each filter'),
              default: {},
              renderTrigger: true,
              shouldMapStateToProps() {
                return true;
              },
              mapStateToProps: ({ form_data }, _, chart) => {
                const queryResult = chart?.queriesResponse?.[0] ?? {};
                return {
                  filterColumns: form_data?.filterColumns || [],
                  colnames: queryResult?.colnames || [],
                  data: queryResult?.data || [],
                  emptyValueLabel: form_data?.emptyValueLabel || '(Empty)',
                  defaultAllowMultipleSelections:
                    form_data?.allowMultipleSelections ?? true,
                };
              },
            },
          },
        ],
        [
          {
            name: 'showResetButton',
            config: {
              type: 'CheckboxControl',
              label: t('Show reset button'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
