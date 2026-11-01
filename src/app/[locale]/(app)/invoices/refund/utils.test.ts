import { describe, expect, it } from 'vitest';
import { INVOICE_STATUS } from '@/src/services/invoices';
import { getRefundItemActions } from './utils';

const ALL = {
  refund: true,
  requestRefund: true,
  acceptRefundRequest: true,
  rejectRefundRequest: true,
};
const NONE = {
  refund: false,
  requestRefund: false,
  acceptRefundRequest: false,
  rejectRefundRequest: false,
};

describe('getRefundItemActions', () => {
  it('offers refund and refund request on an item without a refund, with no ERP reference needed', () => {
    expect(getRefundItemActions(null, ALL)).toEqual({
      refund: true,
      requestRefund: true,
      acceptRefundRequest: false,
      rejectRefundRequest: false,
    });
  });

  it('offers accept and reject on a requested refund', () => {
    expect(
      getRefundItemActions(INVOICE_STATUS.REFUND_REQUESTED, ALL),
    ).toEqual({
      refund: false,
      requestRefund: false,
      acceptRefundRequest: true,
      rejectRefundRequest: true,
    });
  });

  it('offers nothing on a refunded item (also after a whole-invoice refund)', () => {
    expect(getRefundItemActions(INVOICE_STATUS.REFUNDED, ALL)).toEqual(NONE);
  });

  it('follows the privileges', () => {
    expect(
      getRefundItemActions(null, { ...NONE, requestRefund: true }),
    ).toEqual({ ...NONE, requestRefund: true });
    expect(
      getRefundItemActions(INVOICE_STATUS.REFUND_REQUESTED, {
        ...ALL,
        acceptRefundRequest: false,
      }),
    ).toEqual({ ...NONE, rejectRefundRequest: true });
  });
});
