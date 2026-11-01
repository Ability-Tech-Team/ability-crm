import { INVOICE_STATUS } from '@/src/services/invoices';

export type RefundItemPrivileges = {
  refund: boolean;
  requestRefund: boolean;
  acceptRefundRequest: boolean;
  rejectRefundRequest: boolean;
};

/**
 * The refund actions a settlement item offers. They depend only on the
 * item's `refund_status_id` and the user's privileges: there is no ERP
 * reference to wait for any more (Amer CRM required a SAP reference). A
 * refunded item (status 7, also set when the whole invoice is refunded)
 * offers nothing.
 */
export function getRefundItemActions(
  refundStatusId: number | null | undefined,
  privileges: RefundItemPrivileges,
): RefundItemPrivileges {
  if (refundStatusId === INVOICE_STATUS.REFUNDED) {
    return {
      refund: false,
      requestRefund: false,
      acceptRefundRequest: false,
      rejectRefundRequest: false,
    };
  }

  const isRequested = refundStatusId === INVOICE_STATUS.REFUND_REQUESTED;

  return {
    refund: !isRequested && privileges.refund,
    requestRefund: !isRequested && privileges.requestRefund,
    acceptRefundRequest: isRequested && privileges.acceptRefundRequest,
    rejectRefundRequest: isRequested && privileges.rejectRefundRequest,
  };
}
