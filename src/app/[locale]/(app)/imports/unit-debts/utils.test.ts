import { describe, expect, it } from 'vitest';
import { createUnitDebtEntrySchema } from './schema';
import {
  debitAmountProblem,
  parseDebitAmount,
  UNIT_DEBT_ENTRY_INITIAL_VALUES,
} from './utils';

const t = (key: string) => key;

describe('reading a debt amount', () => {
  it('reads it as the sheet does, ignoring commas and spaces', () => {
    expect(parseDebitAmount('12,500.50')).toBe(12500.5);
    expect(parseDebitAmount(' 1 250 ')).toBe(1250);
    expect(parseDebitAmount('0')).toBe(0);
    expect(parseDebitAmount('-250.75')).toBe(-250.75);
  });

  it('reads Arabic-Indic digits and the Arabic decimal separator', () => {
    expect(parseDebitAmount('١٢٬٥٠٠٫٥')).toBe(12500.5);
    expect(parseDebitAmount('۳۰۰')).toBe(300);
  });

  it('refuses text, more than 2 decimals, and partial numbers', () => {
    expect(parseDebitAmount('abc')).toBeNull();
    expect(parseDebitAmount('1.005')).toBeNull();
    expect(parseDebitAmount('1e5')).toBeNull();
    expect(parseDebitAmount('12.')).toBeNull();
    expect(parseDebitAmount('--5')).toBeNull();
    expect(parseDebitAmount('')).toBeNull();
  });

  it('keeps the amount below the column’s limit', () => {
    expect(debitAmountProblem('999,999,999,999.99')).toBeNull();
    expect(debitAmountProblem('-999999999999.99')).toBeNull();
    expect(debitAmountProblem('1000000000000')).toBe('amountRange');
    expect(debitAmountProblem('ten')).toBe('amountFormat');
    expect(debitAmountProblem('  ')).toBeNull();
  });
});

describe('the manual unit debt form', () => {
  const schema = createUnitDebtEntrySchema(t);
  const errorsOf = (values: typeof UNIT_DEBT_ENTRY_INITIAL_VALUES) => {
    const result = schema.safeParse(values);
    return result.success
      ? {}
      : Object.fromEntries(
          result.error.issues.map((issue) => [issue.path[0], issue.message]),
        );
  };

  it('needs the unit number and the amount', () => {
    expect(errorsOf(UNIT_DEBT_ENTRY_INITIAL_VALUES)).toEqual({
      unit_number: 'required',
      debit_amount: 'required',
    });
  });

  it('accepts a unit with zero or a negative amount, the sub-project optional', () => {
    expect(
      errorsOf({ ...UNIT_DEBT_ENTRY_INITIAL_VALUES, unit_number: 'A-101', debit_amount: '0' }),
    ).toEqual({});
    expect(
      errorsOf({
        unit_number: 'A-101',
        sub_project_code: 'NORTH',
        debit_amount: '-1,250.5',
      }),
    ).toEqual({});
  });

  it('explains an amount it can’t save', () => {
    expect(
      errorsOf({ ...UNIT_DEBT_ENTRY_INITIAL_VALUES, unit_number: 'A-101', debit_amount: '1.005' }),
    ).toEqual({ debit_amount: 'amountFormat' });
    expect(
      errorsOf({ ...UNIT_DEBT_ENTRY_INITIAL_VALUES, unit_number: 'A-101', debit_amount: '1000000000000' }),
    ).toEqual({ debit_amount: 'amountRange' });
  });
});
