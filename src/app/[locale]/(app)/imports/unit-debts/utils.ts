import type { UnitDebtEntryValues } from './schema';

export const UNIT_DEBT_ENTRY_INITIAL_VALUES: UnitDebtEntryValues = {
  unit_number: '',
  sub_project_code: '',
  debit_amount: '',
};

// units.debit_amount is Decimal(14, 2): the backend takes at most 2 decimals
// and an absolute value below 1e12 (`SetUnitDebtDto`, as the sheet's limit).
const AMOUNT_LIMIT = 1e12;
const AMOUNT = /^-?\d+(\.\d{1,2})?$/;

/** Arabic-Indic and Persian digits, and the Arabic decimal separator, as ASCII. */
function toAsciiNumber(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
}

/**
 * The amount typed, read as the sheet reads it (commas and spaces ignored),
 * or null when it isn't a number with at most 2 decimals.
 */
export function parseDebitAmount(text: string): number | null {
  const cleaned = toAsciiNumber(text).replace(/[,\s]/g, '');
  if (!AMOUNT.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Why the amount can't be saved, as a key of `imports.entry`; null when it can (or is blank). */
export function debitAmountProblem(
  text: string,
): 'amountFormat' | 'amountRange' | null {
  if (!text.trim()) return null;
  const value = parseDebitAmount(text);
  if (value === null) return 'amountFormat';
  return Math.abs(value) < AMOUNT_LIMIT ? null : 'amountRange';
}
