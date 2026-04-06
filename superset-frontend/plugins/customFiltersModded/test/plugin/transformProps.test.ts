import { ChartProps, supersetTheme } from '@superset-ui/core';
import transformProps from '../../src/plugin/transformProps';

describe('customFiltersModded transformProps', () => {
  it('maps selected filter columns into dropdown options and current state', () => {
    const chartProps = new ChartProps({
      formData: {
        datasource: '3__table',
        viz_type: 'customFiltersModded',
        filterColumns: ['country', 'city'],
        columnsPerRow: 3,
        allowMultipleSelections: true,
      },
      width: 800,
      height: 600,
      theme: supersetTheme,
      filterState: {
        filters: {
          country: ['RU'],
        },
      },
      hooks: { setDataMask: jest.fn() },
      queriesData: [
        {
          data: [
            { country: 'RU', city: 'Moscow' },
            { country: 'RU', city: 'Saint Petersburg' },
            { country: 'KZ', city: 'Almaty' },
          ],
          colnames: ['country', 'city'],
        },
      ],
    });

    expect(transformProps(chartProps as any)).toMatchObject({
      width: 800,
      height: 600,
      filters: [
        { key: 'country', label: 'country' },
        { key: 'city', label: 'city' },
      ],
      selectedFilters: {
        country: ['RU'],
      },
      allowMultipleSelections: true,
      columnsPerRow: 3,
    });

    expect((transformProps(chartProps as any) as any).optionsByFilter.country).toEqual([
      { key: 'string:KZ', rawValue: 'KZ', label: 'KZ' },
      { key: 'string:RU', rawValue: 'RU', label: 'RU' },
    ]);
  });
});
