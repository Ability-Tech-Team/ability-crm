import type { AxiosAdapter, AxiosProgressEvent } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { setApiAddresses } from '@/src/lib/apiConfig';
import api from '@/src/lib/http';
import {
  hasImportTemplate,
  importErrorsFileName,
  isFinishedImportStatus,
  toImportRecord,
  uploadImport,
} from './imports';

afterEach(() => {
  api.defaults.adapter = undefined;
});

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
      failedRows: null,
      createdAt: '2026-10-29T08:00:00.000Z',
      createdBy: 'Admin',
      progress: null,
    });
  });

  it('reads the upload\'s answer, which names the import `import_id`', () => {
    expect(
      toImportRecord({
        import_id: 41,
        status: 'PENDING',
        type: 'units',
        file_name: 'units.xlsx',
      }),
    ).toMatchObject({ id: 41, status: 'PENDING', kind: 'units' });
  });

  it('reads a running import\'s progress, and leaves out one it cannot read', () => {
    const progress = { stage: 'writing', done: 500, total: 1000, percent: 60 };
    expect(
      toImportRecord({ id: 5, status: 'PROCESSING', failed_rows: 2, progress }),
    ).toMatchObject({ id: 5, failedRows: 2, progress });
    expect(
      toImportRecord({ id: 5, progress: { stage: 'guessing', done: 1 } }),
    ).toMatchObject({ id: 5, progress: null });
    expect(toImportRecord({ id: 5, progress: null })?.progress).toBeNull();
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

  it('offers a template for every sheet', () => {
    expect(hasImportTemplate('units')).toBe(true);
    expect(hasImportTemplate('customers')).toBe(true);
    expect(hasImportTemplate('relatives')).toBe(true);
    expect(hasImportTemplate('unit-debts')).toBe(true);
  });
});

describe('uploadImport', () => {
  it('reports the share of the file sent, and reads the queued import', async () => {
    setApiAddresses({ baseUrl: 'http://172.20.1.141:9999/crm' });
    const sent: number[] = [];
    const adapter: AxiosAdapter = async (config) => {
      for (const loaded of [0, 512, 1024]) {
        config.onUploadProgress?.({ loaded, total: 1024 } as AxiosProgressEvent);
      }
      return {
        data: {
          result: { import_id: 9, status: 'PENDING', type: 'units', file_name: 'u.csv' },
          success: true,
          statusCode: 201,
        },
        status: 201,
        statusText: '',
        headers: {},
        config,
      };
    };
    api.defaults.adapter = adapter;

    const record = await uploadImport('units', new File(['unit_number'], 'u.csv'), {
      onUploadProgress: (fraction) => sent.push(fraction),
    });

    expect(sent).toEqual([0, 0.5, 1]);
    expect(record).toMatchObject({ id: 9, status: 'PENDING' });
  });
});

describe('isFinishedImportStatus', () => {
  it('knows the statuses the import worker ends on', () => {
    expect(isFinishedImportStatus('COMPLETED')).toBe(true);
    expect(isFinishedImportStatus('COMPLETED_WITH_ERRORS')).toBe(true);
    expect(isFinishedImportStatus('failed')).toBe(true);
    expect(isFinishedImportStatus('PENDING')).toBe(false);
    expect(isFinishedImportStatus('PROCESSING')).toBe(false);
    expect(isFinishedImportStatus(null)).toBe(false);
  });
});
