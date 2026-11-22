import { describe, expect, it } from 'vitest';
import { hasImportTemplate, importErrorsFileName, toImportRecord } from './imports';

describe('toImportRecord', () => {
  it('reads an import status with the updated count', () => {
    expect(
      toImportRecord({
        id: 12,
        type: 'customers',
        file_name: 'customers.xlsx',
        status: 'completed',
        inserted_rows: 3,
        updated_rows: '2',
        skipped_rows: 1,
        created_at: '2026-10-29T08:00:00.000Z',
        created_by_name: 'Admin',
      }),
    ).toEqual({
      id: 12,
      kind: 'customers',
      fileName: 'customers.xlsx',
      status: 'completed',
      totalRows: null,
      insertedRows: 3,
      updatedRows: 2,
      skippedRows: 1,
      createdAt: '2026-10-29T08:00:00.000Z',
      createdBy: 'Admin',
    });
  });

  it('accepts a minimal record and rejects one without an id', () => {
    expect(toImportRecord({ id: '7' })).toMatchObject({
      id: 7,
      insertedRows: null,
      updatedRows: null,
    });
    expect(toImportRecord({ file_name: 'x.xlsx' })).toBeNull();
    expect(toImportRecord(null)).toBeNull();
  });
});

describe('import files', () => {
  it('names the rejected rows by the file the API sends', () => {
    expect(
      importErrorsFileName(
        12,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ),
    ).toBe('import-12-errors.xlsx');
    expect(importErrorsFileName(12, 'text/csv; charset=utf-8')).toBe(
      'import-12-errors.csv',
    );
  });

  it('offers a template for the units, customers, and relatives sheets only', () => {
    expect(hasImportTemplate('units')).toBe(true);
    expect(hasImportTemplate('customers')).toBe(true);
    expect(hasImportTemplate('relatives')).toBe(true);
    expect(hasImportTemplate('unit-debts')).toBe(false);
  });
});
