import { cloneDeep } from 'lodash';
import { t } from '@superset-ui/core';
import {
  ControlPanelConfig,
  ControlPanelSectionConfig,
  ControlPanelsContainerProps,
} from '@superset-ui/chart-controls';
import baseControlPanel from '../../plugin-chart-echarts/src/MixedTimeseries/controlPanel';

function createValueLabelOffsetRow(controlSuffix: string) {
  return [
    {
      name: `valueLabelOffset${controlSuffix}`,
      config: {
        type: 'SliderControl',
        label: t('Value label height'),
        renderTrigger: true,
        min: -200,
        max: 200,
        step: 1,
        default: 0,
        description: t(
          'Adjust the vertical offset of value labels for this query.',
        ),
        visibility: ({ controls }: ControlPanelsContainerProps) =>
          Boolean(controls?.[`show_value${controlSuffix}`]?.value),
      },
    },
  ];
}

function createValueLabelColorRow(controlSuffix: string) {
  return [
    {
      name: `valueLabelColor${controlSuffix}`,
      config: {
        type: 'ColorPickerControl',
        label: t('Value label color'),
        renderTrigger: true,
        description: t('Color of value labels for this query.'),
        visibility: ({ controls }: ControlPanelsContainerProps) =>
          Boolean(controls?.[`show_value${controlSuffix}`]?.value),
      },
    },
  ];
}

function createValueLabelFontWeightRow(controlSuffix: string) {
  return [
    {
      name: `valueLabelFontWeight${controlSuffix}`,
      config: {
        type: 'SelectControl',
        label: t('Value label weight'),
        renderTrigger: true,
        default: 'normal',
        choices: [
          ['normal', t('Normal')],
          ['bold', t('Bold')],
        ],
        description: t('Font weight of value labels for this query.'),
        visibility: ({ controls }: ControlPanelsContainerProps) =>
          Boolean(controls?.[`show_value${controlSuffix}`]?.value),
      },
    },
  ];
}

function createValueLabelBackgroundEnabledRow(controlSuffix: string) {
  return [
    {
      name: `valueLabelBackgroundEnabled${controlSuffix}`,
      config: {
        type: 'CheckboxControl',
        label: t('Value label background'),
        renderTrigger: true,
        default: false,
        description: t('Show a background behind value labels for this query.'),
        visibility: ({ controls }: ControlPanelsContainerProps) =>
          Boolean(controls?.[`show_value${controlSuffix}`]?.value),
      },
    },
  ];
}

function createValueLabelBackgroundColorRow(controlSuffix: string) {
  return [
    {
      name: `valueLabelBackgroundColor${controlSuffix}`,
      config: {
        type: 'ColorPickerControl',
        label: t('Background color'),
        renderTrigger: true,
        description: t('Background color for value labels for this query.'),
        visibility: ({ controls }: ControlPanelsContainerProps) =>
          Boolean(controls?.[`show_value${controlSuffix}`]?.value) &&
          Boolean(
            controls?.[`valueLabelBackgroundEnabled${controlSuffix}`]?.value,
          ),
      },
    },
  ];
}

function createCenterBarValueLabelRow(controlSuffix: string) {
  return [
    {
      name: `centerBarValueLabel${controlSuffix}`,
      config: {
        type: 'CheckboxControl',
        label: t('Center value in bar'),
        renderTrigger: true,
        default: false,
        description: t(
          'Place the value label in the center of the bar, including in stacked mode.',
        ),
        visibility: ({ controls }: ControlPanelsContainerProps) =>
          Boolean(controls?.[`show_value${controlSuffix}`]?.value) &&
          controls?.[`seriesType${controlSuffix}`]?.value === 'bar',
      },
    },
  ];
}

const config = cloneDeep(baseControlPanel) as ControlPanelConfig;
const chartOptionsSection = config
  .controlPanelSections[7] as ControlPanelSectionConfig;

chartOptionsSection.controlSetRows = chartOptionsSection.controlSetRows
  .flatMap(row => {
    const control = row[0];
    if (
      control &&
      typeof control === 'string' &&
      control === 'x_axis_time_format'
    ) {
      return [
        row,
        [
          {
            name: 'xAxisForceCategorical',
            config: {
              type: 'CheckboxControl',
              label: t('Force categorical'),
              default: false,
              renderTrigger: true,
              description: t(
                'Treat each X-axis value as a separate category instead of a continuous axis.',
              ),
            },
          },
        ],
      ];
    }
    if (
      control &&
      typeof control === 'object' &&
      'name' in control &&
      control.name === 'show_value'
    ) {
      return [
        row,
        createValueLabelOffsetRow(''),
        createValueLabelColorRow(''),
        createValueLabelFontWeightRow(''),
        createValueLabelBackgroundEnabledRow(''),
        createValueLabelBackgroundColorRow(''),
        createCenterBarValueLabelRow(''),
      ];
    }
    if (
      control &&
      typeof control === 'object' &&
      'name' in control &&
      control.name === 'show_valueB'
    ) {
      return [
        row,
        createValueLabelOffsetRow('B'),
        createValueLabelColorRow('B'),
        createValueLabelFontWeightRow('B'),
        createValueLabelBackgroundEnabledRow('B'),
        createValueLabelBackgroundColorRow('B'),
        createCenterBarValueLabelRow('B'),
      ];
    }
    return [row];
  })
  .filter(row => {
    const control = row[0];
    if (!control || typeof control !== 'object' || !('name' in control)) {
      return true;
    }
    return !['showTooltipTotal', 'showTooltipPercentage'].includes(
      String(control.name),
    );
  });

export default config;
