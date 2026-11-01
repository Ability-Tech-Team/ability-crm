import type { Unit } from '@/src/services/units';
import type { UnitBlock } from '@/src/services/unitBlocks';
import type { UnitAttachmentRow } from './types';

/**
 * The unit the add page put aside before routing here. Read during the first
 * render rather than in an effect: it is written once, never changes, and
 * there is no sessionStorage on the server.
 * See docs/reading-browser-storage-in-react.md.
 */
export function loadStagedUnit(): Unit | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem('unit-block-create-unit');
    return raw ? (JSON.parse(raw) as { unit: Unit }).unit : null;
  } catch {
    return null;
  }
}

/** The read-only unit details, which only the staged unit can supply. */
export function getUnitDetails(unit: Unit | null) {
  return {
    unitNumber: unit?.unit_number ?? '\u2014',
    projectName: unit?.project_name ?? '\u2014',
    unitType: unit?.unit_specifications?.unit_type_name ?? '\u2014',
    customerName: unit?.customer_units?.[0]?.customer_name ?? '\u2014',
    mobileNumber: unit?.customer_units?.[0]?.mobile_number ?? '\u2014',
  };
}

/**
 * Each block carries its own files, so the tab on screen decides which belong
 * here: a legal tab lists the legal block's attachments only.
 */
export function collectUnitAttachments(
  blocks: UnitBlock[],
  isLegal: number,
  removedIds: (string | number)[],
): UnitAttachmentRow[] {
  return blocks
    .filter((row) => row.is_legal === isLegal)
    .flatMap((row) =>
      (row.attachments ?? [])
        .filter((attachment) => !removedIds.includes(attachment.id))
        .map((attachment) => ({
          ...attachment,
          block_id: row.id,
          blocked_date: row.blocked_date,
        })),
    );
}
