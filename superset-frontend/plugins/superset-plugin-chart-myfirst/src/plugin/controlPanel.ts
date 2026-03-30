import { t, validateNonEmpty } from '@superset-ui/core';
import { ControlPanelConfig, sharedControls } from '@superset-ui/chart-controls';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Запрос'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'groupbyRows',
            config: {
              ...sharedControls.groupby,
              label: t('Строки по умолчанию'),
              description: t('Начальная иерархия строк'),
            },
          },
        ],
        [
          {
            name: 'groupbyColumns',
            config: {
              ...sharedControls.groupby,
              label: t('Столбцы по умолчанию'),
              description: t('Начальная иерархия столбцов'),
            },
          },
        ],
        [
          {
            name: 'selectableDimensions',
            config: {
              ...sharedControls.groupby,
              label: t('Доступные измерения'),
              description: t('Поля, доступные внутри чарта для строк, столбцов и фильтров'),
            },
          },
        ],
        [
          {
            name: 'metrics',
            config: {
              ...sharedControls.metrics,
              validators: [validateNonEmpty],
              label: t('Метрики'),
            },
          },
        ],
        ['adhoc_filters'],
        ['row_limit'],
      ],
    },
    {
      label: t('Настройки'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'show_sidebar',
            config: {
              type: 'CheckboxControl',
              label: t('Показывать левую панель'),
              description: t('Показывать встроенную левую панель управления внутри чарта'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'show_subtotals',
            config: {
              type: 'CheckboxControl',
              label: t('Показывать подытоги'),
              default: true,
              renderTrigger: true,
            },
          },
          {
            name: 'enableTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Показывать итоги'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'showRowTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Итоги по строкам'),
              default: true,
              renderTrigger: true,
            },
          },
          {
            name: 'showColumnTotals',
            config: {
              type: 'CheckboxControl',
              label: t('Итоги по столбцам'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'show_cell_bars',
            config: {
              type: 'CheckboxControl',
              label: t('Полосы в ячейках'),
              default: true,
              renderTrigger: true,
            },
          },
          {
            name: 'show_heatmap',
            config: {
              type: 'CheckboxControl',
              label: t('Тепловая карта'),
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
              label: t('Компактный режим'),
              default: false,
              renderTrigger: true,
            },
          },
          {
            name: 'default_expand_depth',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Глубина раскрытия'),
              default: 0,
              renderTrigger: true,
              choices: [
                [0, t('Все свернуто')],
                [1, t('Уровень 1')],
                [2, t('Уровень 2')],
                [3, t('Уровень 3')],
                [99, t('Развернуть всё')],
              ],
            },
          },
        ],
        [
          {
            name: 'number_format_digits',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Знаков после запятой'),
              default: 2,
              renderTrigger: true,
              choices: [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4']],
            },
          },
          {
            name: 'null_label',
            config: {
              type: 'TextControl',
              label: t('Текст для пустых значений'),
              default: '—',
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

export default config;