import type { SelectOption } from '@/src/components/ui/Select';
import {
  isFinishedImportStatus,
  type ImportRecord,
} from '@/src/services/imports';
import type { Unit } from '@/src/services/units';
import type {
  DropdownOption,
  LocationDropdownOption,
  SubProjectOption,
} from '@/src/types/dropdowns';

/** Helpers shared by the manual entry forms of the Imports screens. */

/** The trimmed text, or undefined when it is blank. */
export function optionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : undefined;
}

/** A whole number from the text, or undefined when it is blank. */
export function optionalInt(value: string | undefined): number | undefined {
  const text = optionalText(value);
  return text === undefined ? undefined : Number.parseInt(text, 10);
}

/** A select's id, or undefined when nothing is chosen. */
export function optionalId(value: string | undefined): number | undefined {
  const id = Number(optionalText(value));
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export const WHOLE_NUMBER = /^-?\d+$/;
export const NON_NEGATIVE_WHOLE_NUMBER = /^\d+$/;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Today's calendar day in the browser's time zone, as `YYYY-MM-DD`. */
export function todayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toSelectOptions(
  items: readonly DropdownOption[] | undefined,
  exclude: readonly number[] = [],
): SelectOption[] {
  return (items ?? [])
    .filter((item) => !exclude.includes(item.id))
    .map((item) => ({ value: String(item.id), label: item.name }));
}

/** Sub-projects by code, the value the import sheets use. */
export function subProjectCodeOptions(
  items: readonly SubProjectOption[] | undefined,
): SelectOption[] {
  return (items ?? []).map((item) => ({
    value: item.project_code,
    label: subProjectLabel(item),
  }));
}

/** Sub-projects by id, the value the unit create route takes. */
export function subProjectIdOptions(
  items: readonly SubProjectOption[] | undefined,
): SelectOption[] {
  return (items ?? []).map((item) => ({
    value: String(item.id),
    label: subProjectLabel(item),
  }));
}

function subProjectLabel(item: SubProjectOption): string {
  return item.name && item.name !== item.project_code
    ? `${item.project_code} – ${item.name}`
    : item.project_code;
}

/** The location tree as one list, each labelled with its path. */
export function flattenLocationOptions(
  nodes: readonly LocationDropdownOption[] | undefined,
  prefix = '',
): SelectOption[] {
  const options: SelectOption[] = [];
  for (const node of nodes ?? []) {
    const label = prefix ? `${prefix} > ${node.name}` : node.name;
    options.push({ value: String(node.id), label });
    if (node.children?.length) {
      options.push(...flattenLocationOptions(node.children, label));
    }
  }
  return options;
}

/** What `pickUnit` reads of a unit. */
type NumberedUnit = Pick<Unit, 'sub_project_code'>;

export type UnitPick<U extends NumberedUnit = Unit> =
  | { unit: U; problem?: undefined }
  | { unit?: undefined; problem: 'notFound' | 'notInSubProject' | 'ambiguous' };

/**
 * The unit a form means by its number and optional sub-project code, among
 * the units carrying that number. As in the import sheets, a unit is a number
 * within a sub-project; with no sub-project chosen, the only unit with that
 * number is taken, else the one outside any sub-project.
 */
export function pickUnit<U extends NumberedUnit>(
  units: readonly U[],
  subProjectCode: string | undefined,
): UnitPick<U> {
  const code = optionalText(subProjectCode)?.toLowerCase();
  const codeOf = (unit: U) => unit.sub_project_code?.trim().toLowerCase() ?? '';

  if (code) {
    const match = units.filter((unit) => codeOf(unit) === code);
    if (match.length === 1) return { unit: match[0] };
    return { problem: units.length ? 'notInSubProject' : 'notFound' };
  }

  if (units.length === 0) return { problem: 'notFound' };
  if (units.length === 1) return { unit: units[0] };

  const outside = units.filter((unit) => !codeOf(unit));
  return outside.length === 1 ? { unit: outside[0] } : { problem: 'ambiguous' };
}

/**
 * The backend's fixed ids (`ability-crm-api/libs/core/src/common/enums/shared.enum.ts`):
 * `identificationTypeEnums`, `ownerShipTypeEnums`, and `ownerTypeEnums`.
 */
export const ID_TYPE_PASSPORT = 1;
export const ID_TYPE_NATIONAL_ID = 2;
export const OWNERSHIP_OWNER = 1;
export const OWNERSHIP_OWNER_RELATIVE = 3;
export const OWNER_TYPE_OWNER = 2;

/**
 * Why an ID number doesn't fit its type, as the import sheets check it: a
 * National ID is 14 digits, a passport 6 to 20 letters or digits. Null when
 * it fits. The backend checks the National ID's date and governorate too.
 */
export function idNumberProblem(
  idNumber: string,
  idType: number | undefined,
): 'nationalIdFormat' | 'passportFormat' | 'idNumberLength' | null {
  const value = idNumber.trim();
  if (idType === ID_TYPE_NATIONAL_ID) {
    return /^\d{14}$/.test(value) ? null : 'nationalIdFormat';
  }
  if (idType === ID_TYPE_PASSPORT) {
    return /^[A-Za-z0-9]{6,20}$/.test(value) ? null : 'passportFormat';
  }
  return value.length >= 5 && value.length <= 50 ? null : 'idNumberLength';
}

/** The message for a unit a form couldn't place, from `imports.entry`. */
export function unitPickMessage(
  t: (key: string, values?: Record<string, string | number>) => string,
  problem: 'notFound' | 'notInSubProject' | 'ambiguous',
  unitNumber: string,
  subProjectCode: string | undefined,
): string {
  const values = {
    unit: unitNumber.trim(),
    subProject: optionalText(subProjectCode) ?? '',
  };
  if (problem === 'notInSubProject') return t('unitNotInSubProject', values);
  if (problem === 'ambiguous') return t('unitAmbiguous', values);
  return t('unitNotFound', values);
}

/**
 * Where an upload stands on the upload screen: the file going up, then the
 * import worker's run (`queued` until it starts, `processing` while it reads
 * and writes), then its outcome.
 */
export type ImportPhase =
  | 'idle'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'finished'
  | 'failed';

/** The phase an import record shows. An unknown status is still waiting. */
export function importPhase(record: ImportRecord): ImportPhase {
  const status = record.status?.toUpperCase() ?? null;
  if (status === 'FAILED') return 'failed';
  if (isFinishedImportStatus(status)) return 'finished';
  if (status === 'PROCESSING' || record.progress) return 'processing';
  return 'queued';
}

export function isImportPhaseDone(phase: ImportPhase): boolean {
  return phase === 'finished' || phase === 'failed';
}

const POLL_MS = 2000;
const MAX_POLL_MS = 10_000;

/** How long to wait before asking for the import again: longer after each failed ask. */
export function nextImportPollDelay(failures: number): number {
  return Math.min(POLL_MS * 2 ** Math.max(failures, 0), MAX_POLL_MS);
}

/** A whole percentage from 0 to 100. */
export function toPercent(fraction: number): number {
  if (!Number.isFinite(fraction)) return 0;
  return Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
}
