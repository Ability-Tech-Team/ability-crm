'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import AccessDenied from '@/src/components/AccessDenied';
import Button from '@/src/components/ui/Button';
import MainBox from '@/src/components/ui/MainBox';
import Select from '@/src/components/ui/Select';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { createRentalCompanyDelegatesUnits } from '@/src/services/rentals';

const UNITS_TEMPLATE_FILE_NAME = 'rental_company_units.xlsx';
const DELEGATES_TEMPLATE_FILE_NAME = 'rental_company_delegate.xlsx';

// Backend / reverse-proxy enforces a max request body size. Send rows in
// chunks to avoid 413 "Request payload too large" errors for big uploads.
const UPLOAD_CHUNK_SIZE = 500;

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }

  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

// Bump this version whenever the template files in public/templates change to
// bust browser/CDN caches (the `download` attribute keeps the saved filename).
const TEMPLATES_VERSION = '2';

const UNITS_TEMPLATE_PATH = `/templates/${UNITS_TEMPLATE_FILE_NAME}?v=${TEMPLATES_VERSION}`;
const DELEGATES_TEMPLATE_PATH = `/templates/${DELEGATES_TEMPLATE_FILE_NAME}?v=${TEMPLATES_VERSION}`;

const UNITS_REQUIRED_HEADERS = ['unit_id', 'unit_number', 'area'];
const DELEGATES_REQUIRED_HEADERS = [
  'delegate_name',
  'delegate_national_id',
  'delegate_phone_number',
];

type ParsedUnit = {
  unit_id: string;
  unit_number: string;
  unit_area?: number;
};

type ParsedDelegate = {
  delegate_name: string;
  delegate_national_id: string;
  delegate_phone_number?: string;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function hasSameHeaders(actual: string[], expected: string[]) {
  if (actual.length !== expected.length) {
    return false;
  }

  return expected.every((header, index) => actual[index] === header);
}

function isTemplateFileNameValid(fileName: string, expected: string) {
  return fileName.trim().toLowerCase() === expected.toLowerCase();
}

function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const result = reader.result;

        if (!(result instanceof ArrayBuffer)) {
          reject(new Error('Invalid file content.'));
          return;
        }

        const workbook = XLSX.read(result, { type: 'array' });
        resolve(workbook);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read uploaded file.'));
    reader.readAsArrayBuffer(file);
  });
}

async function parseUnitsFile(file: File): Promise<ParsedUnit[]> {
  if (!isTemplateFileNameValid(file.name, UNITS_TEMPLATE_FILE_NAME)) {
    throw new Error(`Units file name must be ${UNITS_TEMPLATE_FILE_NAME}.`);
  }

  const workbook = await readWorkbookFromFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error('Units file does not contain a valid sheet.');
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  const rawHeaders = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: 0,
    blankrows: false,
  }) as unknown[][];

  const actualHeaders = (rawHeaders[0] ?? []).map(normalizeHeader);

  if (!hasSameHeaders(actualHeaders, UNITS_REQUIRED_HEADERS)) {
    throw new Error(
      `Units file columns must be exactly: ${UNITS_REQUIRED_HEADERS.join(', ')}.`,
    );
  }

  const parsed: ParsedUnit[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const unitId = String(row.unit_id ?? '').trim();
    const unitNumber = String(row.unit_number ?? '').trim();
    const areaRaw = String(row.area ?? '').trim();

    if (!unitId) {
      throw new Error(`Units file row ${rowNumber}: unit_id is required.`);
    }

    if (!unitNumber) {
      throw new Error(`Units file row ${rowNumber}: unit_number is required.`);
    }

    const unit: ParsedUnit = {
      unit_id: unitId,
      unit_number: unitNumber,
    };

    if (areaRaw) {
      const areaValue = Number(areaRaw);

      if (!Number.isFinite(areaValue)) {
        throw new Error(`Units file row ${rowNumber}: area must be a number.`);
      }

      unit.unit_area = areaValue;
    }

    parsed.push(unit);
  });

  if (!parsed.length) {
    throw new Error('Units file must contain at least one data row.');
  }

  return parsed;
}

async function parseDelegatesFile(file: File): Promise<ParsedDelegate[]> {
  if (!isTemplateFileNameValid(file.name, DELEGATES_TEMPLATE_FILE_NAME)) {
    throw new Error(
      `Delegates file name must be ${DELEGATES_TEMPLATE_FILE_NAME}.`,
    );
  }

  const workbook = await readWorkbookFromFile(file);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) {
    throw new Error('Delegates file does not contain a valid sheet.');
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  const rawHeaders = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: 0,
    blankrows: false,
  }) as unknown[][];

  const actualHeaders = (rawHeaders[0] ?? []).map(normalizeHeader);

  if (!hasSameHeaders(actualHeaders, DELEGATES_REQUIRED_HEADERS)) {
    throw new Error(
      `Delegates file columns must be exactly: ${DELEGATES_REQUIRED_HEADERS.join(', ')}.`,
    );
  }

  const parsed: ParsedDelegate[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const delegateName = String(row.delegate_name ?? '').trim();
    const delegateNationalId = String(row.delegate_national_id ?? '').trim();
    const delegatePhone = String(row.delegate_phone_number ?? '').trim();

    if (!delegateName) {
      throw new Error(
        `Delegates file row ${rowNumber}: delegate_name is required.`,
      );
    }

    if (!delegateNationalId) {
      throw new Error(
        `Delegates file row ${rowNumber}: delegate_national_id is required.`,
      );
    }

    if (delegateNationalId.length !== 14) {
      throw new Error(
        `Delegates file row ${rowNumber}: delegate_national_id must be exactly 14 characters.`,
      );
    }

    if (delegatePhone && delegatePhone.length !== 11) {
      throw new Error(
        `Delegates file row ${rowNumber}: delegate_phone_number must be exactly 11 characters.`,
      );
    }

    parsed.push({
      delegate_name: delegateName,
      delegate_national_id: delegateNationalId,
      ...(delegatePhone ? { delegate_phone_number: delegatePhone } : {}),
    });
  });

  if (!parsed.length) {
    throw new Error('Delegates file must contain at least one data row.');
  }

  return parsed;
}

export default function RentalsWalkInPage() {
  const t = useTranslations('rentals');
  const tForm = useTranslations('form');
  const { error: showError } = useResponseMessage();
  const { data: dropdowns } = useDropdowns();
  const privileges = useRoutePrivileges('/rentals/rentals-walk-in');

  const canCreate =
    privileges.hasPrivilege(PRIVILEGE_IDS.ADD) || privileges.canAccess;

  const [rentalCompanyId, setRentalCompanyId] = useState('');
  const [unitsFile, setUnitsFile] = useState<File | null>(null);
  const [delegatesFile, setDelegatesFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unitsInputRef = useRef<HTMLInputElement>(null);
  const delegatesInputRef = useRef<HTMLInputElement>(null);

  const rentalCompanyOptions = useMemo(
    () =>
      (dropdowns?.rental_companies ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [dropdowns],
  );

  const clearFiles = () => {
    setUnitsFile(null);
    setDelegatesFile(null);

    if (unitsInputRef.current) {
      unitsInputRef.current.value = '';
    }

    if (delegatesInputRef.current) {
      delegatesInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!rentalCompanyId) {
      toast.error(t('walkIn.validation.rentalCompanyRequired'));
      return;
    }

    if (!unitsFile) {
      toast.error(t('walkIn.validation.unitsFileRequired'));
      return;
    }

    if (!delegatesFile) {
      toast.error(t('walkIn.validation.delegatesFileRequired'));
      return;
    }

    setIsSubmitting(true);

    let units: ParsedUnit[];
    let delegates: ParsedDelegate[];

    try {
      [units, delegates] = await Promise.all([
        parseUnitsFile(unitsFile),
        parseDelegatesFile(delegatesFile),
      ]);
    } catch (error) {
      setIsSubmitting(false);
      toast.error(
        error instanceof Error
          ? error.message
          : t('walkIn.validation.invalidExcelData'),
      );
      return;
    }

    try {
      const rentalCompanyIdNumber = Number(rentalCompanyId);

      const unitPayloads = units.map((item) => ({
        rental_company_id: rentalCompanyIdNumber,
        unit_id: item.unit_id,
        unit_number: item.unit_number,
        ...(typeof item.unit_area === 'number'
          ? { unit_area: item.unit_area }
          : {}),
      }));

      const delegatePayloads = delegates.map((item) => ({
        rental_company_id: rentalCompanyIdNumber,
        delegate_name: item.delegate_name,
        delegate_national_id: item.delegate_national_id,
        ...(item.delegate_phone_number
          ? { delegate_phone_number: item.delegate_phone_number }
          : {}),
      }));

      const unitChunks = chunkArray(unitPayloads, UPLOAD_CHUNK_SIZE);
      const delegateChunks = chunkArray(delegatePayloads, UPLOAD_CHUNK_SIZE);
      const totalBatches = Math.max(unitChunks.length, delegateChunks.length);

      for (let i = 0; i < totalBatches; i += 1) {
        await createRentalCompanyDelegatesUnits({
          units: unitChunks[i] ?? [],
          delegates: delegateChunks[i] ?? [],
        });
      }

      toast.success(t('walkIn.submitSuccess'));
      setRentalCompanyId('');
      clearFiles();
    } catch (error) {
      showError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreate) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <MainBox>
        <h1 className="text-2xl font-semibold">{t('walkIn.title')}</h1>
        <p className="text-sm text-gray-600">{t('walkIn.description')}</p>

        <Select
          label={t('create.rentalCompany')}
          name="rental_company_id"
          options={rentalCompanyOptions}
          value={rentalCompanyId}
          placeholder={t('create.rentalCompany')}
          onChange={(event) => setRentalCompanyId(event.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <a
            href={UNITS_TEMPLATE_PATH}
            download={UNITS_TEMPLATE_FILE_NAME}
            className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t('walkIn.downloadUnitsTemplate')}
          </a>

          <a
            href={DELEGATES_TEMPLATE_PATH}
            download={DELEGATES_TEMPLATE_FILE_NAME}
            className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t('walkIn.downloadDelegatesTemplate')}
          </a>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="units-file"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t('walkIn.unitsFileLabel')}
            </label>
            <input
              id="units-file"
              ref={unitsInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) =>
                setUnitsFile(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sky-700 hover:border-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('walkIn.requiredFileName', {
                fileName: UNITS_TEMPLATE_FILE_NAME,
              })}
            </p>
          </div>

          <div>
            <label
              htmlFor="delegates-file"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t('walkIn.delegatesFileLabel')}
            </label>
            <input
              id="delegates-file"
              ref={delegatesInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) =>
                setDelegatesFile(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sky-700 hover:border-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('walkIn.requiredFileName', {
                fileName: DELEGATES_TEMPLATE_FILE_NAME,
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={handleSubmit} isLoading={isSubmitting}>
            {isSubmitting ? t('saving') : tForm('save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRentalCompanyId('');
              clearFiles();
            }}
            disabled={isSubmitting}
          >
            {tForm('clear')}
          </Button>
        </div>
      </MainBox>
    </div>
  );
}
