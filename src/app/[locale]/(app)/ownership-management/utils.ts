import type {
  OwnershipManagementRequest,
  OwnershipManagementRequestAttachment,
} from '@/src/services/ownershipManagementRequests';

export const OPEN_STATUS_ID = 1;
export const DELAYED_STATUS_ID = 2;
export const CLOSED_STATUS_ID = 3;

export function getStatusBadgeClass(statusId: number | null | undefined) {
  if (statusId === OPEN_STATUS_ID) {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }
  if (statusId === DELAYED_STATUS_ID) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }
  if (statusId === CLOSED_STATUS_ID) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

/** Only open and delayed requests can still be closed or marked as wrong. */
export function isActionableStatus(statusId: number | null | undefined) {
  return statusId === OPEN_STATUS_ID || statusId === DELAYED_STATUS_ID;
}

export function getAttachments(
  row: OwnershipManagementRequest,
): OwnershipManagementRequestAttachment[] {
  return (row.attachments ?? []).filter(
    (attachment) => !!attachment?.file_path,
  );
}
