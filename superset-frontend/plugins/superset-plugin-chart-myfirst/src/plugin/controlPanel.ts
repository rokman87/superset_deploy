import { t } from '@superset-ui/core';
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
              label: t('Метрики по умолчанию'),
              description: t('Метрики, которые будут включены при первом открытии чарта'),
            },
          },
        ],
        [
          {
            name: 'selectableMetrics',
            config: {
              ...sharedControls.metrics,
              label: t('Доступные метрики'),
              description: t('Метрики, которые можно включать в левой панели чарта'),
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
            name: 'row_limit',
            config: {
              ...sharedControls.row_limit,
              label: t('Лимит строк runtime-запроса'),
              description: t('Максимум строк, которые можно получить для построения таблицы после нажатия "Применить"'),
              default: 100000,
            },
          },
        ],
        [
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
        [
          {
            name: 'metricSummarySql',
            config: {
              type: 'CollectionControl',
              label: t('Формулы для подытогов и итогов'),
              description: t(
                'Для каждой метрики можно отдельно задать формулу для промежуточных подытогов по уровням и для общего итога всей таблицы',
              ),
              controlName: 'SummarySqlMetricControl',
              placeholder: t('Правила не добавлены'),
              addTooltip: t('Добавить формулу для метрики'),
              itemGenerator: () => ({
                metric: undefined,
                subtotalMode: 'default',
                totalMode: 'default',
                subtotalSql: '',
                totalSql: '',
              }),
              renderTrigger: true,
              shouldMapStateToProps() {
                return true;
              },
              mapStateToProps(explore: any) {
                const defaultMetrics = Array.isArray(explore?.controls?.metrics?.value)
                  ? explore.controls.metrics.value
                  : [];
                const selectableMetrics = Array.isArray(explore?.controls?.selectableMetrics?.value)
                  ? explore.controls.selectableMetrics.value
                  : [];

                const metricOptions = Array.from(
                  new Map(
                    [...defaultMetrics, ...selectableMetrics]
                      .filter(Boolean)
                      .map((metric: any) => {
                        const value =
                          metric?.label ||
                          metric?.metric_name ||
                          metric?.optionName ||
                          metric?.column?.column_name ||
                          metric?.column_name ||
                          metric?.value ||
                          metric;
                        const label =
                          metric?.label ||
                          metric?.metric_name ||
                          metric?.column?.verbose_name ||
                          metric?.column?.column_name ||
                          metric?.column_name ||
                          metric?.value ||
                          metric;
                        return [String(value), { value: String(value), label: String(label) }] as const;
                      }),
                  ).values(),
                );

                return {
                  metricOptions,
                };
              },
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
              type: 'ColorPickerControl',
              label: t('Фон заголовка'),
              default: '#203247',
              renderTrigger: true,
            },
          },
          {
            name: 'headerTextColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет текста заголовка'),
              default: '#ffffff',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'grandTotalBg',
            config: {
              type: 'ColorPickerControl',
              label: t('Фон общего итога'),
              default: '#203247',
              renderTrigger: true,
            },
          },
          {
            name: 'expandColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет иконки раскрытия'),
              default: '#64748b',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'subtotalBg',
            config: {
              type: 'ColorPickerControl',
              label: t('Фон подытогов'),
              default: '#f6fafe',
              renderTrigger: true,
            },
          },
          {
            name: 'cellTextColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет текста ячеек'),
              default: '#0f172a',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'heatmapPositiveColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет heatmap для положительных'),
              default: '#22c55e',
              renderTrigger: true,
            },
          },
          {
            name: 'heatmapNegativeColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет heatmap для отрицательных'),
              default: '#ef4444',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'barPositiveColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет полосы для положительных'),
              default: '#22c55e',
              renderTrigger: true,
            },
          },
          {
            name: 'barNegativeColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет полосы для отрицательных'),
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
            name: 'conditional_formatting',
            config: {
              type: 'ConditionalFormattingControl',
              label: t('Условное форматирование'),
              description: t('Применяйте отдельные правила к разным метрикам'),
              default: [],
              renderTrigger: true,
              shouldMapStateToProps() {
                return true;
              },
              mapStateToProps(explore: any) {
                const defaultMetrics = Array.isArray(explore?.controls?.metrics?.value)
                  ? explore.controls.metrics.value
                  : [];
                const selectableMetrics = Array.isArray(explore?.controls?.selectableMetrics?.value)
                  ? explore.controls.selectableMetrics.value
                  : [];

                const metrics = [...defaultMetrics, ...selectableMetrics];
                const columnOptions = Array.from(
                  new Map(
                    metrics
                      .filter(Boolean)
                      .map((metric: any) => {
                        const value =
                          metric?.label ||
                          metric?.metric_name ||
                          metric?.optionName ||
                          metric?.column?.column_name ||
                          metric?.column_name ||
                          metric?.value ||
                          metric;
                        const label =
                          metric?.label ||
                          metric?.metric_name ||
                          metric?.column?.verbose_name ||
                          metric?.column?.column_name ||
                          metric?.column_name ||
                          metric?.value ||
                          metric;
                        return [String(value), { value: String(value), label: String(label) }] as const;
                      }),
                  ).values(),
                );

                const verboseMap = Object.fromEntries(
                  columnOptions.map(option => [option.value, option.label]),
                );

                return {
                  removeIrrelevantConditions: true,
                  columnOptions,
                  verboseMap,
                };
              },
            },
          },
        ],
      ],
    },
  ],
};

export default config;
