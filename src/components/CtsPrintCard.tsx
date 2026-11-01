'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import type { CtsRecord, CtsDateField } from '@/src/services/cts';
import BrandMark from './BrandMark';

interface CtsPrintCardProps {
  record: CtsRecord;
}

/** Safely extract a display string from a plain string or a date-object field. */
function fmt(
  value: string | CtsDateField | number | undefined | null,
): string | number | undefined | null {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && 'dateTime' in value) return value.dateTime;
  return value;
}

const CtsPrintCard = forwardRef<HTMLDivElement, CtsPrintCardProps>(
  ({ record }, ref) => {
    const t = useTranslations('cts');

    const f = t.raw('fields') as Record<string, string>;
    const s = t.raw('sections') as Record<string, string>;

    const field = (label: string, value?: string | number | null) => {
      if (value === undefined || value === null || value === '') return null;
      return (
        <tr key={label}>
          <td className="cts-card-label">{label}</td>
          <td className="cts-card-value">{value}</td>
        </tr>
      );
    };

    return (
      <div ref={ref} className="cts-print-card">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="cts-card-header">
          <BrandMark className="cts-card-logo" />
          <div className="cts-card-title-block">
            <h1 className="cts-card-title">
              {t('title')} — {t('columns.ctsId')} #{record.id}
            </h1>
            <p className="cts-card-subtitle">{record.unit_number}</p>
          </div>
          <p className="cts-card-date">
            {new Date().toLocaleDateString()} &nbsp;{' '}
            {new Date().toLocaleTimeString()}
          </p>
        </div>

        <hr className="cts-card-rule" />

        {/* ── General Information ─────────────────────── */}
        <section className="cts-card-section">
          <h2 className="cts-card-section-title">{s.general}</h2>
          <div className="cts-card-two-col">
            <table className="cts-card-table">
              <tbody>
                {field(f.unitNumber, record.unit_number)}
                {field(f.customerCode, record.customer_code)}
                {field(f.customerName, record.customer_name)}
                {field(f.customerMobile, record.customer_mobile)}
                {field(f.mobile, record.mobile)}
              </tbody>
            </table>
            <table className="cts-card-table">
              <tbody>
                {field(f.annualFees, record.annual_fees)}
                {field(f.collectedAmount, record.collected_amount)}
                {field(f.contractsStatus, record.contracts_status)}
                {field(f.updateStatus, record.update_status)}
                {field(f.old, record.old)}
                {field(f.receiver, record.receiver)}
              </tbody>
            </table>
          </div>
          {record.notes && (
            <p className="cts-card-notes">
              <span className="cts-card-notes-label">{f.notes}:</span>{' '}
              {record.notes}
            </p>
          )}
        </section>

        <hr className="cts-card-rule" />

        {/* ── Services Row ────────────────────────────── */}
        <div className="cts-card-services-row">
          {/* Internet */}
          <section className="cts-card-service-box">
            <h2 className="cts-card-section-title">{s.internet}</h2>
            <table className="cts-card-table">
              <tbody>
                {field(f.internetStatus, record.internet_status)}
                {field(
                  f.internetActivationDate,
                  fmt(record.internet_activation_date),
                )}
                {field(f.internetAnnualFees, record.internet_annual_fees)}
                {field(
                  f.internetAnnualFeesStatus,
                  record.internet_annual_fees_status,
                )}
              </tbody>
            </table>
          </section>

          {/* IP TV */}
          <section className="cts-card-service-box">
            <h2 className="cts-card-section-title">{s.ipTv}</h2>
            <table className="cts-card-table">
              <tbody>
                {field(f.ipTvStatus, record.ip_tv_status)}
                {field(f.ipTvPackage, record.ip_tv_package)}
                {field(f.ipTvActivationDate, fmt(record.ip_tv_activation_date))}
                {field(f.ipTvAnnualFees, record.ip_tv_annual_fees)}
                {field(f.ipTvAnnualFeesStatus, record.ip_tv_annual_fees_status)}
                {field(f.ipTvMacAddress, record.ip_tv_mac_address)}
                {field(f.ipTvMultipoint, record.ip_tv_multipoint)}
                {field(f.ipTvMissPayment, record.ip_tv_miss_payment)}
              </tbody>
            </table>
          </section>

          {/* IP Phone */}
          <section className="cts-card-service-box">
            <h2 className="cts-card-section-title">{s.ipPhone}</h2>
            <table className="cts-card-table">
              <tbody>
                {field(f.ipPhoneStatus, record.ip_phone_status)}
                {field(
                  f.ipPhoneActivationDate,
                  fmt(record.ip_phone_activation_date),
                )}
                {field(f.ipPhoneMac, record.ip_phone_mac)}
                {field(f.iphoneInternetFees, record.iphone_internet_fees)}
              </tbody>
            </table>
          </section>
        </div>

        <hr className="cts-card-rule" />

        {/* ── Bottom Row ──────────────────────────────── */}
        <div className="cts-card-services-row">
          {/* SMA TV */}
          <section className="cts-card-service-box">
            <h2 className="cts-card-section-title">{s.smaTv}</h2>
            <table className="cts-card-table">
              <tbody>
                {field(
                  f.smaTvAnnualFeesStatus,
                  record.sma_tv_annual_fees_status,
                )}
                {field(f.smaTvContractValue, record.sma_tv_contract_value)}
                {field(f.smaTvContractDate, fmt(record.sma_tv_contract_date))}
                {field(f.smaTvPaymentStatus, record.sma_tv_payment_status)}
                {field(f.smaTvReceivingDate, fmt(record.sma_tv_receiving_date))}
                {field(f.smaTvMultipoint, record.sma_tv_multipoint)}
                {field(
                  f.smaTvMultiPointReceivingDate,
                  fmt(record.sma_tv_multi_point_receiving_date),
                )}
                {field(f.smaTvAdditionalPoint, record.sma_tv_additional_point)}
                {field(f.smaTvExtra, record.sma_tv_extra)}
              </tbody>
            </table>
          </section>

          {/* Satellite */}
          <section className="cts-card-service-box">
            <h2 className="cts-card-section-title">{s.satellite}</h2>
            <table className="cts-card-table">
              <tbody>
                {field(
                  f.hotbirdReceivingDate,
                  fmt(record.hotbird_receiving_date),
                )}
                {field(
                  f.nilesatReceivingDate,
                  fmt(record.nilesat_receiving_date),
                )}
                {field(f.receivingDormStatus, record.receiving_dorm_status)}
              </tbody>
            </table>
          </section>
        </div>

        <hr className="cts-card-rule" />
        <p className="cts-card-footer">
          {new Date().toLocaleDateString()} — {new Date().toLocaleTimeString()}
        </p>
      </div>
    );
  },
);

CtsPrintCard.displayName = 'CtsPrintCard';

export default CtsPrintCard;
