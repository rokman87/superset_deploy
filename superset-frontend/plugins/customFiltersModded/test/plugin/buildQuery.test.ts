import buildQuery from '../../src/plugin/buildQuery';

describe('customFiltersModded buildQuery', () => {
  it('builds a distinct query from configured filter columns', () => {
    const queryContext = buildQuery({
      datasource: '5__table',
      viz_type: 'customFiltersModded',
      filterColumns: ['country', 'city'],
      filterRowLimit: 500,
    } as any);

    const [query] = queryContext.queries;
    expect(query.columns).toEqual(['country', 'city']);
    expect(query.groupby).toEqual(['country', 'city']);
    expect(query.metrics).toEqual([]);
    expect(query.row_limit).toBe(500);
  });
});
