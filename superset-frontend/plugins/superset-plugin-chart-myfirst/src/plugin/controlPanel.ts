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
      ],
    },
    {
      label: t('Настройки'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'myfirst_show_sidebar',
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
    {
      label: t('Цвета'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'headerBg',
            config: {
              type: 'TextControl',
              label: t('Фон заголовка'),
              description: t('Например: #203247'),
              default: '#203247',
              renderTrigger: true,
            },
          },
          {
            name: 'headerTextColor',
            config: {
              type: 'TextControl',
              label: t('Цвет текста заголовка'),
              description: t('Например: #ffffff'),
              default: '#ffffff',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'grandTotalBg',
            config: {
              type: 'TextControl',
              label: t('Фон общего итога'),
              description: t('Например: #203247'),
              default: '#203247',
              renderTrigger: true,
            },
          },
          {
            name: 'expandColor',
            config: {
              type: 'TextControl',
              label: t('Цвет иконки раскрытия'),
              description: t('Например: #64748b'),
              default: '#64748b',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'subtotalBg',
            config: {
              type: 'TextControl',
              label: t('Фон подытогов'),
              description: t('Например: #f6fafe'),
              default: '#f6fafe',
              renderTrigger: true,
            },
          },
          {
            name: 'cellTextColor',
            config: {
              type: 'TextControl',
              label: t('Цвет текста ячеек'),
              description: t('Например: #0f172a'),
              default: '#0f172a',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'heatmapPositiveColor',
            config: {
              type: 'TextControl',
              label: t('Цвет heatmap для положительных'),
              description: t('Например: #22c55e'),
              default: '#22c55e',
              renderTrigger: true,
            },
          },
          {
            name: 'heatmapNegativeColor',
            config: {
              type: 'TextControl',
              label: t('Цвет heatmap для отрицательных'),
              description: t('Например: #ef4444'),
              default: '#ef4444',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'barPositiveColor',
            config: {
              type: 'TextControl',
              label: t('Цвет полосы для положительных'),
              description: t('Например: #22c55e'),
              default: '#22c55e',
              renderTrigger: true,
            },
          },
          {
            name: 'barNegativeColor',
            config: {
              type: 'TextControl',
              label: t('Цвет полосы для отрицательных'),
              description: t('Например: #ef4444'),
              default: '#ef4444',
              renderTrigger: true,
            },
          },
        ],
      ],
    },
    {
      label: t('Условное форматирование'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'conditionalFormattingEnabled',
            config: {
              type: 'CheckboxControl',
              label: t('Включить условное форматирование'),
              default: false,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'conditionalFormattingMetric',
            config: {
              type: 'TextControl',
              label: t('Метрика для правила'),
              description: t('Укажите ключ или название метрики'),
              renderTrigger: true,
            },
          },
          {
            name: 'conditionalFormattingOperator',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Оператор'),
              default: '>',
              renderTrigger: true,
              choices: [
                ['>', '>'],
                ['>=', '>='],
                ['<', '<'],
                ['<=', '<='],
                ['=', '='],
                ['!=', '!='],
              ],
            },
          },
        ],
        [
          {
            name: 'conditionalFormattingThreshold',
            config: {
              type: 'TextControl',
              label: t('Порог'),
              description: t('Например: 1000'),
              renderTrigger: true,
            },
          },
          {
            name: 'conditionalFormattingTextColor',
            config: {
              type: 'TextControl',
              label: t('Цвет текста по условию'),
              description: t('Например: #ffffff'),
              default: '#ffffff',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'conditionalFormattingBgColor',
            config: {
              type: 'TextControl',
              label: t('Цвет фона по условию'),
              description: t('Например: #dc2626'),
              default: '#dc2626',
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
