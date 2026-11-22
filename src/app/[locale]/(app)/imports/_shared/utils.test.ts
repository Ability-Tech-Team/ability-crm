import { describe, expect, it } from 'vitest';
import {
  flattenLocationOptions,
  ID_TYPE_NATIONAL_ID,
  ID_TYPE_PASSPORT,
  idNumberProblem,
  optionalId,
  optionalInt,
  optionalText,
  pickUnit,
  subProjectCodeOptions,
  todayIsoDate,
  toSelectOptions,
} from './utils';

const unit = (id: number, subProjectCode?: string) => ({
  id,
  unit_number: 'A-101',
  ...(subProjectCode !== undefined ? { sub_project_code: subProjectCode } : {}),
});

describe('placing a unit by number and sub-project', () => {
  it('takes the only unit with the number when no sub-project is chosen', () => {
    expect(pickUnit([unit(1, 'NORTH')], '')).toEqual({ unit: unit(1, 'NORTH') });
  });

  it('matches the chosen sub-project by code, whatever its case', () => {
    expect(pickUnit([unit(1, 'NORTH'), unit(2, 'SOUTH')], 'south').unit?.id).toBe(2);
  });

  it('takes the unit outside any sub-project when several share the number', () => {
    expect(pickUnit([unit(1, 'NORTH'), unit(2)], undefined).unit?.id).toBe(2);
  });

  it('asks for the sub-project when several sub-projects have the number', () => {
    expect(pickUnit([unit(1, 'NORTH'), unit(2, 'SOUTH')], '')).toEqual({
      problem: 'ambiguous',
    });
  });

  it('tells a missing unit from one in another sub-project', () => {
    expect(pickUnit([], 'NORTH')).toEqual({ problem: 'notFound' });
    expect(pickUnit([], '')).toEqual({ problem: 'notFound' });
    expect(pickUnit([unit(1, 'NORTH')], 'SOUTH')).toEqual({
      problem: 'notInSubProject',
    });
  });
});

describe('ID numbers, as the import sheets check them', () => {
  it('needs 14 digits for a National ID', () => {
    expect(idNumberProblem('29801011234567', ID_TYPE_NATIONAL_ID)).toBeNull();
    expect(idNumberProblem('2980101123456', ID_TYPE_NATIONAL_ID)).toBe('nationalIdFormat');
    expect(idNumberProblem('A9801011234567', ID_TYPE_NATIONAL_ID)).toBe('nationalIdFormat');
  });

  it('needs 6 to 20 letters or digits for a passport', () => {
    expect(idNumberProblem('a1234567', ID_TYPE_PASSPORT)).toBeNull();
    expect(idNumberProblem('A123', ID_TYPE_PASSPORT)).toBe('passportFormat');
    expect(idNumberProblem('A12-3456', ID_TYPE_PASSPORT)).toBe('passportFormat');
  });

  it('only limits the length for another ID type', () => {
    expect(idNumberProblem('12345', 7)).toBeNull();
    expect(idNumberProblem('1234', undefined)).toBe('idNumberLength');
  });
});

describe('form values', () => {
  it('reads blank optional fields as absent', () => {
    expect(optionalText('  ')).toBeUndefined();
    expect(optionalText(' x ')).toBe('x');
    expect(optionalInt('')).toBeUndefined();
    expect(optionalInt('-2')).toBe(-2);
    expect(optionalId('')).toBeUndefined();
    expect(optionalId('0')).toBeUndefined();
    expect(optionalId('4')).toBe(4);
  });

  it('writes today as the local calendar day', () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('select options', () => {
  it('leaves out the excluded ids', () => {
    expect(
      toSelectOptions(
        [
          { id: 1, name: 'Owner' },
          { id: 3, name: 'Owner relative' },
        ],
        [3],
      ),
    ).toEqual([{ value: '1', label: 'Owner' }]);
  });

  it('labels sub-projects by code, with the name when it differs', () => {
    expect(
      subProjectCodeOptions([
        { id: 1, project_id: 9, project_code: 'N1', name: 'North' },
        { id: 2, project_id: 9, project_code: 'S1', name: 'S1' },
      ]),
    ).toEqual([
      { value: 'N1', label: 'N1 – North' },
      { value: 'S1', label: 'S1' },
    ]);
  });

  it('labels each location with its path', () => {
    expect(
      flattenLocationOptions([
        {
          id: 1,
          name: 'Zone A',
          parent_location_id: null,
          children: [
            { id: 2, name: 'Building 3', parent_location_id: 1, children: [] },
          ],
        },
      ]),
    ).toEqual([
      { value: '1', label: 'Zone A' },
      { value: '2', label: 'Zone A > Building 3' },
    ]);
  });
});
