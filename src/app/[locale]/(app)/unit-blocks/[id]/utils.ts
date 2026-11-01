import type { StatusTimelineLog } from '@/src/components/ui/StatusTimeline';
import type { UnitBlock } from '@/src/services/unitBlocks';

type Translate = (key: string) => string;

/** Same colours the history table gives its Status column. */
export function getStatusBadgeClass(isActive: number): string {
  return isActive === 1
    ? 'bg-red-100 text-red-700'
    : 'bg-green-100 text-green-700';
}

/** Matches the Block Type badge on the search table. */
export function getTypeBadgeClass(isLegal: number): string {
  return isLegal === 1
    ? 'bg-amber-100 text-amber-700'
    : 'bg-sky-100 text-sky-700';
}

/**
 * The summary cells. The assignee pair is legal-only: a finance block carries
 * no lawyer, so those would always read as empty.
 */
export function getDetailRows(
  block: UnitBlock,
  t: Translate,
  tForm: Translate,
) {
  const rows = [
    { label: t('columns.unitNumber'), value: block.unit_number },
    { label: t('columns.projectName'), value: block.project_name },
    { label: t('columns.category'), value: block.category_name },
    { label: t('columns.reason'), value: block.reason },
    { label: t('columns.blockedBy'), value: block.blocked_by_name },
    { label: t('columns.blockedDate'), value: block.blocked_date },
    { label: t('columns.unblockedBy'), value: block.unblocked_by_name },
    { label: t('columns.unblockedDate'), value: block.unblocked_date },
  ];

  if (block.is_legal === 1) {
    rows.push(
      { label: t('create.assignedTo'), value: block.assign_to_name },
      { label: tForm('mobileNumber'), value: block.assign_to_mobile },
    );
  }

  return rows;
}

/** The block's logs in the shape `StatusTimeline` reads. */
export function toTimelineLogs(block: UnitBlock): StatusTimelineLog[] {
  return (block.logs ?? []).map((log) => ({
    log_id: log.id,
    status_name: log.log_action_name,
    description: log.description,
    log_description: log.change_description,
    created_by: log.action_by,
    created_at: log.created_at,
  }));
}
