'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import type { Ticket } from '@/src/services/tickets';
import BrandMark from './BrandMark';

interface TicketPrintReceiptProps {
  ticket: Ticket;
}

const TicketPrintReceipt = forwardRef<HTMLDivElement, TicketPrintReceiptProps>(
  ({ ticket }, ref) => {
    const t = useTranslations('tickets.detail');

    return (
      <div ref={ref} className="print-receipt">
        <BrandMark className="w-10 h-10 sm:w-16.25 sm:h-16.25 object-contain" />

        {/* Header */}
        <div className="receipt-header">
          <h1 className="receipt-title">
            {t('title')} #{ticket.ticket_id}
          </h1>
          <p className="receipt-status">{ticket.last_status_name}</p>
        </div>

        <hr className="receipt-divider" />

        {/* Ticket Details */}
        <table className="receipt-info-table">
          <tbody>
            <tr>
              <td className="receipt-label">{t('customerName')}</td>
              <td className="receipt-value">{ticket.customer_name}</td>
            </tr>
            <tr>
              <td className="receipt-label">{t('requesterName')}</td>
              <td className="receipt-value">{ticket.requester_name}</td>
            </tr>
            <tr>
              <td className="receipt-label">{t('unitNumber')}</td>
              <td className="receipt-value">{ticket.unit_number}</td>
            </tr>
            <tr>
              <td className="receipt-label">{t('department')}</td>
              <td className="receipt-value">{ticket.department_name}</td>
            </tr>
            {ticket.request_time.date && (
              <tr>
                <td className="receipt-label">{t('createdAt')}</td>
                <td className="receipt-value">{ticket.request_time.date}</td>
              </tr>
            )}
            {/* {ticket.arrival_time && (
              <tr>
                <td className="receipt-label">{t('arrivalTime')}</td>
                <td className="receipt-value">{ticket.arrival_time}</td>
              </tr>
            )}
            {ticket.actual_arrival_time && (
              <tr>
                <td className="receipt-label">{t('actualArrivalTime')}</td>
                <td className="receipt-value">{ticket.actual_arrival_time}</td>
              </tr>
            )} */}
            {ticket.duration && (
              <tr>
                <td className="receipt-label">{t('duration')}</td>
                <td className="receipt-value">{ticket.duration}</td>
              </tr>
            )}
            {ticket.seen_by && (
              <tr>
                <td className="receipt-label">{t('seenBy')}</td>
                <td className="receipt-value">{ticket.seen_by}</td>
              </tr>
            )}
            <tr>
              <td className="receipt-label">{t('agentName')}</td>
              <td className="receipt-value">{ticket.agent_name}</td>
            </tr>
            <tr>
              <td className="receipt-label">{t('runnerCashier')}</td>
              <td className="receipt-value">
                {ticket.has_runner_cashier ? '✓' : '✗'}
              </td>
            </tr>
            {ticket.notes && (
              <tr>
                <td className="receipt-label">{t('notes')}</td>
                <td className="receipt-value">{ticket.notes}</td>
              </tr>
            )}
          </tbody>
        </table>

        <hr className="receipt-divider" />

        {/* Services */}
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
            {ticket.services.map((svc) => (
              <tr key={svc.service_id}>
                <td>{svc.service_name}</td>
                <td className="text-center">{svc.quantity}</td>
                <td className="text-center">{svc.price}</td>
                <td className="text-center">{svc.total_price}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-end font-bold">
                {t('ticketTotal')}
              </td>
              <td className="text-center font-bold">
                {ticket.ticket_total_price}
              </td>
            </tr>
          </tfoot>
        </table>

        <hr className="receipt-divider" />

        {/* Footer */}
        <p className="receipt-footer">
          {new Date().toLocaleDateString()} — {new Date().toLocaleTimeString()}
        </p>
      </div>
    );
  },
);

TicketPrintReceipt.displayName = 'TicketPrintReceipt';

export default TicketPrintReceipt;
