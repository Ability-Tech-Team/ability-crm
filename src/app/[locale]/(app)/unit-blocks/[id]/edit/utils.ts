import type { UnitBlock } from '@/src/services/unitBlocks';

/**
 * A unit collects several blocks of one kind over its life. The live one is
 * the one worth editing; with none live, the most recent.
 */
export function pickBlockByType(
  blocks: UnitBlock[],
): Record<number, UnitBlock | null> {
  const pick = (isLegal: number) => {
    const ofType = blocks.filter((row) => row.is_legal === isLegal);
    return (
      ofType.find((row) => row.is_active === 1) ??
      ofType.sort((a, b) => b.id - a.id)[0] ??
      null
    );
  };

  return { 0: pick(0), 1: pick(1) };
}

/** The read-only details and the editable fields, seeded from the block. */
export function getEditBlockInitialValues(block: UnitBlock) {
  return {
    unitNumber: block.unit_number ?? '\u2014',
    projectName: block.project_name ?? '\u2014',
    categoryName: block.category_name ?? '\u2014',
    blockedByName: block.blocked_by_name ?? '\u2014',
    blockedDate: block.blocked_date ?? '\u2014',
    reason: block.reason ?? '',
    assign_to_id: block.assign_to_id ?? '',
  };
}
