import { describe, expect, it } from 'vitest';
import { createRelativeEntrySchema } from './schema';
import { buildRelativePayload, RELATIVE_ENTRY_INITIAL_VALUES } from './utils';

const t = (key: string) => key;
const filled = {
  ...RELATIVE_ENTRY_INITIAL_VALUES,
  owner_id_number: '29801011234567',
  unit_number: 'A-101',
  relative_name: ' Omar Adel ',
  relative_id_number: '30001011234567',
};

describe('the manual relative payload', () => {
  it('sends the owner, the unit, and the filled fields only', () => {
    expect(buildRelativePayload(filled, 5, 9)).toEqual({
      owner_id: 5,
      unit_id: 9,
      relative_name: 'Omar Adel',
      relative_id_number: '30001011234567',
    });
  });

  it('sends gender as 1 or 0 and the other optional fields trimmed', () => {
    expect(
      buildRelativePayload(
        {
          ...filled,
          id_type: '1',
          relative_id_number: 'p1234567',
          is_male: '0',
          relation: ' Sister ',
          mobile_number: ' 01001234567 ',
          email: 'omar@example.invalid',
        },
        5,
        9,
      ),
    ).toMatchObject({
      id_type: 1,
      relative_id_number: 'P1234567',
      is_male: 0,
      relation: 'Sister',
      mobile_number: '01001234567',
      email: 'omar@example.invalid',
    });
  });
});

describe('the manual relative form', () => {
  const schema = createRelativeEntrySchema(t);

  it('checks the relative’s ID number as a National ID when no type is chosen', () => {
    expect(schema.safeParse(filled).success).toBe(true);
    expect(
      schema.safeParse({ ...filled, relative_id_number: 'P1234567' }).error?.issues[0]
        ?.message,
    ).toBe('nationalIdFormat');
    expect(
      schema.safeParse({ ...filled, id_type: '1', relative_id_number: 'P1234567' }).success,
    ).toBe(true);
  });

  it('refuses the owner’s own ID number', () => {
    const result = schema.safeParse({
      ...filled,
      relative_id_number: filled.owner_id_number,
    });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ message: 'relatives.sameAsOwner' }),
    ]);
  });
});
