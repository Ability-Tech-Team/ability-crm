import { describe, expect, it } from 'vitest';
import { createUnitEntrySchema } from './schema';
import { buildUnitPayload, UNIT_ENTRY_INITIAL_VALUES } from './utils';

const t = (key: string) => key;

describe('the manual unit payload', () => {
  it('sends the required fields, the defaults, and never a locked unit', () => {
    expect(
      buildUnitPayload({
        ...UNIT_ENTRY_INITIAL_VALUES,
        unit_number: ' A-101 ',
        unit_type_id: '3',
        location_id: '12',
        total_area: '120.5',
      }),
    ).toEqual({
      unit_number: 'A-101',
      is_active: 1,
      is_broker: 0,
      is_eligible_for_rent: 1,
      is_locked: 0,
      unit_specifications: {
        unit_type_id: 3,
        location_id: 12,
        total_area: 120.5,
        is_furnished: 0,
      },
    });
  });

  it('adds the optional fields that are filled, as numbers where the API wants them', () => {
    const payload = buildUnitPayload({
      ...UNIT_ENTRY_INITIAL_VALUES,
      unit_number: 'B-2',
      sub_project_id: '7',
      unit_type_id: '1',
      location_id: '2',
      total_area: '0',
      floor: '-1',
      room_no: '3',
      address: ' Street 9 ',
      delivery_date: '2026-12-01',
      notes: ' corner ',
      is_furnished: '1',
      is_active: '0',
    });
    expect(payload.sub_project_id).toBe(7);
    expect(payload.notes).toBe('corner');
    expect(payload.delivery_date).toBe('2026-12-01');
    expect(payload.contracting_date).toBeUndefined();
    expect(payload.is_active).toBe(0);
    expect(payload.unit_specifications).toEqual({
      unit_type_id: 1,
      location_id: 2,
      total_area: 0,
      is_furnished: 1,
      address: 'Street 9',
      floor: -1,
      room_no: 3,
    });
  });
});

describe('the manual unit form', () => {
  const schema = createUnitEntrySchema(t);

  it('refuses a missing number, type, location, or area', () => {
    const result = schema.safeParse(UNIT_ENTRY_INITIAL_VALUES);
    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining(['unit_number', 'unit_type_id', 'location_id', 'total_area']),
    );
  });

  it('refuses a fractional floor and a negative room count', () => {
    const result = schema.safeParse({
      ...UNIT_ENTRY_INITIAL_VALUES,
      unit_number: 'A',
      unit_type_id: '1',
      location_id: '1',
      total_area: '10',
      floor: '1.5',
      room_no: '-2',
    });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      'floor',
      'room_no',
    ]);
  });
});
