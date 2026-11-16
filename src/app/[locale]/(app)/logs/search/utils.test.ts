import { describe, expect, it } from 'vitest';
import {
  buildLogModuleOptions,
  buildLogsSearchParams,
  getLogsSearchInitialValues,
} from './utils';

describe('buildLogsSearchParams', () => {
  it('sends no filter for a blank form', () => {
    const params = buildLogsSearchParams(getLogsSearchInitialValues());
    // The API rejects unknown or empty parameters, so blanks stay undefined.
    expect(Object.values(params).every((value) => value === undefined)).toBe(
      true,
    );
  });

  it('converts ids to numbers and trims the text filters', () => {
    expect(
      buildLogsSearchParams({
        module_id: '4',
        log_action_id: '2',
        created_by: '6f1c0d1e-uuid',
        record_id: '  1203 ',
        search: '  rent  ',
        from_date: '2026-11-01',
        to_date: '2026-11-16',
      }),
    ).toEqual({
      module_id: 4,
      log_action_id: 2,
      created_by: '6f1c0d1e-uuid',
      record_id: '1203',
      search: 'rent',
      from_date: '2026-11-01',
      to_date: '2026-11-16',
    });
  });

  it('drops text filters that are only spaces', () => {
    const params = buildLogsSearchParams({
      ...getLogsSearchInitialValues(),
      record_id: '   ',
      search: ' ',
    });
    expect(params.record_id).toBeUndefined();
    expect(params.search).toBeUndefined();
  });
});

describe('buildLogModuleOptions', () => {
  it('lists every module under its menu, by module id', () => {
    expect(
      buildLogModuleOptions({
        '7': {
          id: 7,
          name: 'Units',
          modules: [
            { id: 4, name: 'Units', module: 'units', table: 'units_logs' },
            {
              id: 5,
              name: 'Unit images',
              module: 'unit_images',
              table: 'unit_images_logs',
            },
          ],
        },
        '8': {
          id: 8,
          name: 'Customers',
          modules: [
            {
              id: 9,
              name: 'Customers',
              module: 'customers',
              table: 'customers_logs',
            },
          ],
        },
      }),
    ).toEqual([
      { value: '4', label: 'Units', group: 'Units' },
      { value: '5', label: 'Unit images', group: 'Units' },
      { value: '9', label: 'Customers', group: 'Customers' },
    ]);
  });

  it('is empty without the dropdown or a group without modules', () => {
    expect(buildLogModuleOptions(undefined)).toEqual([]);
    expect(
      buildLogModuleOptions({
        '3': { id: 3, name: 'Definitions' } as never,
      }),
    ).toEqual([]);
  });
});
