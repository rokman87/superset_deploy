import { t } from '@superset-ui/core';
import {
  ControlPanelConfig,
  D3_FORMAT_OPTIONS,
  sharedControls,
} from '@superset-ui/chart-controls';

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
              type: 'DndColumnSelect',
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
              type: 'DndColumnSelect',
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
              type: 'DndColumnSelect',
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
              type: 'DndMetricSelect',
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
              type: 'DndMetricSelect',
              label: t('Доступные метрики'),
              description: t('Метрики, которые можно включать в левой панели чарта'),
              validators: [],
              default: [],
            },
          },
        ],
        ['adhoc_filters'],
      ],
    },
    {
      label: t('Панель И Runtime'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'custom_pivot_table_show_sidebar',
            config: {
              type: 'CheckboxControl',
              label: t('Показывать левую панель'),
              description: t('Показывать встроенную левую панель управления внутри чарта'),
              default: true,
              renderTrigger: true,
            },
          },
          {
            name: 'custom_pivot_table_metric_search',
            config: {
              type: 'CheckboxControl',
              label: t('Поиск по метрикам в панели'),
              description: t('Показывать строку поиска над доступными метриками в левой панели чарта'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'custom_pivot_table_show_runtime_query',
            config: {
              type: 'CheckboxControl',
              label: t('Показывать runtime SQL'),
              description: t('Показывать текущий runtime-запрос прямо внутри чарта'),
              default: false,
              renderTrigger: true,
            },
          },
          {
            name: 'custom_pivot_table_sidebar_width_percent',
            config: {
              type: 'SliderControl',
              label: t('Ширина левой панели'),
              description: t('Ширина встроенной панели настроек внутри чарта, в процентах от общей ширины таблицы'),
              default: 24,
              min: 16,
              max: 50,
              step: 1,
              marks: {
                16: '16%',
                24: '24%',
                32: '32%',
                40: '40%',
                50: '50%',
              },
              renderTrigger: true,
            },
          },
        ],
        [
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
      ],
    },
    {
      label: t('Отображение'),
      expanded: true,
      controlSetRows: [
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
            name: 'null_label',
            config: {
              type: 'TextControl',
              label: t('Текст для пустых значений'),
              default: '—',
              renderTrigger: true,
            },
          },
          {
            name: 'cellValueAlign',
            config: {
              type: 'SelectControl',
              freeForm: false,
              label: t('Выравнивание значений'),
              default: 'right',
              renderTrigger: true,
              choices: [
                ['left', t('Слева')],
                ['right', t('Справа (стандартное)')],
                ['center', t('По центру')],
              ],
              description: t('Меняет выравнивание числовых значений в ячейках таблицы'),
            },
          },
        ],
      ],
    },
    {
      label: t('Итоги'),
      expanded: false,
      controlSetRows: [
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
      label: t('Форматирование'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'y_axis_format',
            config: {
              ...sharedControls.y_axis_format,
              label: t('D3 формат чисел'),
              description: t('Формат вывода чисел в таблице, например `,.2f`, `.2s`, `$,.0f`'),
              renderTrigger: true,
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
        ],
        [
          {
            name: 'metricD3Formats',
            config: {
              type: 'CollectionControl',
              label: t('Формат метрик'),
              description: t(
                'Позволяет задать отдельный d3-format для каждой метрики. Эти настройки имеют приоритет над общим форматом таблицы.',
              ),
              controlName: 'MetricFormatControl',
              placeholder: t('Индивидуальные форматы не добавлены'),
              addTooltip: t('Добавить формат для метрики'),
              itemGenerator: () => ({
                metric: undefined,
                d3Format: D3_FORMAT_OPTIONS[0]?.[0],
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
        [
          {
            name: 'rowSqlFormats',
            config: {
              type: 'CollectionControl',
              label: t('Формат строк по SQL-условию'),
              description: t(
                'Позволяет добавить несколько условий для строк. Если строка подходит под SQL-условие, к ее числовым значениям применяется выбранный d3-format.',
              ),
              controlName: 'RowSqlFormatControl',
              placeholder: t('Правила для строк не добавлены'),
              addTooltip: t('Добавить правило для строки'),
              itemGenerator: () => ({
                sqlExpression: '',
                d3Format: D3_FORMAT_OPTIONS[0]?.[0],
              }),
              renderTrigger: true,
            },
          },
        ],
      ],
    },
    {
      label: t('Сортировка'),
      expanded: false,
      controlSetRows: [
        [
          {
            name: 'rowOrder',
            config: {
              type: 'SelectControl',
              label: t('Сортировка строк'),
              default: 'key_a_to_z',
              choices: [
                ['key_a_to_z', t('По ключу A-Z')],
                ['key_z_to_a', t('По ключу Z-A')],
                ['value_a_to_z', t('По значению по возрастанию')],
                ['value_z_to_a', t('По значению по убыванию')],
                ['sql_asc', t('По SQL по возрастанию')],
                ['sql_desc', t('По SQL по убыванию')],
              ],
              renderTrigger: true,
              description: t(
                'Меняет порядок вывода строк. Можно сортировать по ключу, по агрегированному значению метрик или по пользовательскому SQL-выражению.',
              ),
            },
          },
          {
            name: 'colOrder',
            config: {
              type: 'SelectControl',
              label: t('Сортировка столбцов'),
              default: 'key_a_to_z',
              choices: [
                ['key_a_to_z', t('По ключу A-Z')],
                ['key_z_to_a', t('По ключу Z-A')],
                ['value_a_to_z', t('По значению по возрастанию')],
                ['value_z_to_a', t('По значению по убыванию')],
                ['sql_asc', t('По SQL по возрастанию')],
                ['sql_desc', t('По SQL по убыванию')],
              ],
              renderTrigger: true,
              description: t(
                'Меняет порядок вывода столбцов. Можно сортировать по ключу, по агрегированному значению метрик или по пользовательскому SQL-выражению.',
              ),
            },
          },
        ],
        [
          {
            name: 'rowSortSql',
            config: {
              type: 'TextAreaControl',
              label: t('SQL сортировки строк'),
              placeholder: t("Например: CASE WHEN country = 'Canada' THEN 1 ELSE 999 END"),
              language: 'sql',
              minLines: 4,
              maxLines: 12,
              resize: 'vertical',
              offerEditInModal: true,
              renderTrigger: true,
              description: t(
                'Выражение вычисляется для каждой строки. Доступны поля строк, агрегированные метрики, row_total, __level, __is_leaf.',
              ),
              visibility: ({ controls }) =>
                ['sql_asc', 'sql_desc'].includes(String(controls?.rowOrder?.value ?? '')),
            },
          },
          {
            name: 'colSortSql',
            config: {
              type: 'TextAreaControl',
              label: t('SQL сортировки столбцов'),
              placeholder: t("Например: CASE WHEN region = 'EMEA' THEN 1 ELSE 999 END"),
              language: 'sql',
              minLines: 4,
              maxLines: 12,
              resize: 'vertical',
              offerEditInModal: true,
              renderTrigger: true,
              description: t(
                'Выражение вычисляется для каждого столбца. Доступны поля столбцов, значения метрик и col_total.',
              ),
              visibility: ({ controls }) =>
                ['sql_asc', 'sql_desc'].includes(String(controls?.colOrder?.value ?? '')),
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
