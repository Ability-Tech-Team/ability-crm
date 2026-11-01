'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import type { Invoice } from '@/src/services/invoices';
import { useSession } from '@/src/hooks/useSession';
import BrandMark from './BrandMark';

interface InvoicePrintReceiptProps {
  invoice: Invoice;
}

const InvoicePrintReceipt = forwardRef<
  HTMLDivElement,
  InvoicePrintReceiptProps
>(({ invoice }, ref) => {
  const t = useTranslations('invoices.detail');
  const { projectName, fullName, userName } = useSession().details;
  const printedBy = fullName || userName || '';

  const paymentTypeSummary = (() => {
    const map = new Map<string, string>();
    (invoice.invoice_transactions ?? []).forEach((tx) => {
      const name = tx.payment_type_name?.trim();
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, name);
      }
    });
    return Array.from(map.values()).join(', ');
  })();

  const sisterCompanyName = (() => {
    const map = new Map<string, string>();
    (invoice.invoice_transactions ?? []).forEach((tx) => {
      const name = tx.sister_company_name?.trim();
      if (!name) return;
      if (!map.has(name)) {
        map.set(name, name);
      }
    });
    return Array.from(map.values()).join(', ');
  })();

  const formatAmount = (value: string | number | null | undefined) =>
    value === null || value === undefined || value === '' ? null : String(value);

  const refundedAmount = formatAmount(invoice.refunded_amount);
  const remainingAmount = formatAmount(invoice.remaining_amount);

  const transactions = invoice.invoice_transactions ?? [];
  const showVisaColumn = transactions.some((tx) => !!tx.visa_number);
  const showMobileColumn = transactions.some((tx) => !!tx.mobile_number);

  return (
    <div ref={ref} className="print-receipt">
      <div className="receipt-top-bar">
        <BrandMark className="receipt-logo" textClassName="receipt-project" />
        {projectName && <p className="receipt-project">{projectName}</p>}
      </div>

      <div className="receipt-header">
        <h1 className="receipt-title">{t('title')}</h1>
        <p className="receipt-subtitle">#{invoice.invoice_number || '—'}</p>
        <span className="receipt-status-badge">
          {invoice.invoice_status_name || '—'}
        </span>
      </div>

      <table className="receipt-info-table">
        <tbody>
          <tr>
            <td className="receipt-label">{t('status')}</td>
            <td className="receipt-value">
              {invoice.invoice_status_name || '—'}
            </td>
          </tr>
          <tr>
            <td className="receipt-label">{t('ticketId')}</td>
            <td className="receipt-value">{invoice.ticket_id || '—'}</td>
          </tr>
          <tr>
            <td className="receipt-label">{t('customer')}</td>
            <td className="receipt-value">{invoice.customer_name || '—'}</td>
          </tr>
          <tr>
            <td className="receipt-label">{t('requesterName')}</td>
            <td className="receipt-value">{invoice.requester_name || '—'}</td>
          </tr>
          <tr>
            <td className="receipt-label">{t('unit')}</td>
            <td className="receipt-value">{invoice.unit_number || '—'}</td>
          </tr>
          <tr>
            <td className="receipt-label">{t('invoiceType')}</td>
            <td className="receipt-value">
              {invoice.invoice_type_name || '—'}
            </td>
          </tr>
          {paymentTypeSummary && (
            <tr>
              <td className="receipt-label">{t('paymentType')}</td>
              <td className="receipt-value">{paymentTypeSummary}</td>
            </tr>
          )}
          {sisterCompanyName && (
            <tr>
              <td className="receipt-label">{t('sisterCompany')}</td>
              <td className="receipt-value">{sisterCompanyName}</td>
            </tr>
          )}
          <tr></tr>
          <tr>
            <td className="receipt-label">{t('cashier')}</td>
            <td className="receipt-value">
              {invoice.invoice_created_by || '—'}
            </td>
          </tr>
          <tr>
            <td className="receipt-label">{t('creationDate')}</td>
            <td className="receipt-value">
              {invoice.created_at
                ? new Date(invoice.created_at).toLocaleString()
                : '—'}
            </td>
          </tr>
          {invoice.refund_by && (
            <tr>
              <td className="receipt-label">{t('refundBy')}</td>
              <td className="receipt-value">{invoice.refund_by}</td>
            </tr>
          )}
          {invoice.refund_reason && (
            <tr>
              <td className="receipt-label">{t('refundReason')}</td>
              <td className="receipt-value">{invoice.refund_reason}</td>
            </tr>
          )}
          {invoice.notes && (
            <tr>
              <td className="receipt-label">{t('notes')}</td>
              <td className="receipt-value">{invoice.notes}</td>
            </tr>
          )}
        </tbody>
      </table>

      {!!invoice.services?.length && (
        <>
          <h2 className="receipt-section-title">{t('services')}</h2>
          <table className="receipt-services-table">
            <thead>
              <tr>
                <th>{t('serviceName')}</th>
                <th className="text-center">{t('quantity')}</th>
                <th className="text-center">{t('price')}</th>
                <th className="text-center">{t('totalPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.services.map((service) => (
                <tr key={service.service_id}>
                  <td>{service.service_name}</td>
                  <td className="text-center">{service.quantity}</td>
                  <td className="text-center">{service.price}</td>
                  <td className="text-center">{service.total_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {!!transactions.length && (
        <>
          <h2 className="receipt-section-title">{t('paymentMethods')}</h2>
          <table className="receipt-services-table">
            <thead>
              <tr>
                <th>{t('paymentType')}</th>
                <th className="text-center">{t('referenceNumber')}</th>
                {showVisaColumn && (
                  <th className="text-center">{t('visaNumber')}</th>
                )}
                {showMobileColumn && (
                  <th className="text-center">{t('mobileNumber')}</th>
                )}
                <th className="text-center">{t('paymentAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.payment_type_name || '—'}</td>
                  <td className="text-center">
                    {tx.reference_number || tx.bank_reference?.auth_code || '—'}
                  </td>
                  {showVisaColumn && (
                    <td className="text-center">
                      {tx.visa_number ? tx.visa_number.slice(-4) : '—'}
                    </td>
                  )}
                  {showMobileColumn && (
                    <td className="text-center">{tx.mobile_number || '—'}</td>
                  )}
                  <td className="text-center">{tx.total_amount || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="receipt-total">
        <span className="receipt-total-label">{t('totalAmount')}</span>
        <span className="receipt-total-value">
          {invoice.total_amount || '—'}
        </span>
      </div>

      {refundedAmount !== null && (
        <div className="receipt-total receipt-total-secondary">
          <span className="receipt-total-label">{t('refundedAmount')}</span>
          <span className="receipt-total-value">{refundedAmount}</span>
        </div>
      )}

      {remainingAmount !== null && (
        <div className="receipt-total receipt-total-secondary">
          <span className="receipt-total-label">{t('remainingAmount')}</span>
          <span className="receipt-total-value">{remainingAmount}</span>
        </div>
      )}

      <div className="receipt-printed-by">
        <span className="receipt-label">{t('printedBy')}</span>
        <span className="receipt-value">{printedBy || '—'}</span>
      </div>

      <p className="receipt-footer">
        {new Date().toLocaleDateString()} · {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
});

InvoicePrintReceipt.displayName = 'InvoicePrintReceipt';

export default InvoicePrintReceipt;
