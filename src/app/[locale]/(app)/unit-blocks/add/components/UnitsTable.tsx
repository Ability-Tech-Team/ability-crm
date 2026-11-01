'use client';

import { useMemo } from 'react';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import type { Unit } from '@/src/services/units';

type Translate = (key: string) => string;

type UnitsTableProps = {
  rows: Unit[];
  t: Translate;
  tUnits: Translate;
  rentalCompanyMap: Map<number, string>;
  isLoading: boolean;
  onRowClick?: (row: Unit) => void;
};

/**
 * This page's own table. The search page's All tab keeps its own copy, so the
 * two can differ without one change quietly moving the other.
 */
export default function UnitsTable({
  rows,
  t,
  tUnits,
  rentalCompanyMap,
  isLoading,
  onRowClick,
}: UnitsTableProps) {
  const columns = useMemo<ColumnDef<Unit>[]>(
    () => [
      {
        id: 'unit_number',
        label: tUnits('columns.unitNumber'),
        accessorKey: 'unit_number',
        alwaysVisible: true,
      },
      {
        id: 'unit_id',
        label: tUnits('columns.unitId'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.unit_id ?? row.id,
        defaultVisible: false,
      },
      {
        id: 'is_locked',
        label: tUnits('detail.blocked'),
        cell: (row) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              row.is_locked === 1
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {row.is_locked === 1 ? tUnits('yes') : tUnits('no')}
          </span>
        ),
      },
      {
        // Not from `lock_reason`: it reads "legal" whenever a legal block
        // stands, which would hide a finance block on the same unit.
        id: 'is_legal_block',
        label: t('legalBlock'),
        cell: (row) => {
          const isLegal = (row.active_unit_blocks ?? []).some(
            (block) => block.is_legal === 1,
          );
          return (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isLegal
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {isLegal ? tUnits('yes') : tUnits('no')}
            </span>
          );
        },
      },
      {
        id: 'is_finance_block',
        label: t('financeBlock'),
        cell: (row) => {
          const isFinance = (row.active_unit_blocks ?? []).some(
            (block) => block.is_legal === 0,
          );
          return (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isFinance
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {isFinance ? tUnits('yes') : tUnits('no')}
            </span>
          );
        },
      },
      {
        id: 'project_name',
        label: tUnits('columns.projectName'),
        cellClassName: 'max-w-[200px]',
        cell: (row) => {
          const text = row.project_name ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'unit_type_name',
        label: tUnits('columns.unitType'),
        cell: (row) => row.unit_specifications?.unit_type_name ?? '—',
      },
      {
        id: 'total_owners',
        label: tUnits('columns.totalOwners'),
        headerTooltip: tUnits('ownersHistoryHoverHint'),
        cell: (row) => {
          const ownersCount =
            row.unit_customers_count ?? row.customer_units?.length ?? 0;
          return (
            <span
              title={tUnits('ownersHistoryHoverHint')}
              className="cursor-help"
            >
              {ownersCount}
            </span>
          );
        },
      },
      {
        id: 'address',
        label: tUnits('columns.address'),
        cellClassName: 'max-w-[200px]',
        cell: (row) => {
          const text = row.unit_specifications?.address ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'total_area',
        label: tUnits('columns.totalArea'),
        cell: (row) => row.unit_specifications?.total_area ?? '—',
      },
      {
        id: 'floor',
        label: tUnits('columns.floor'),
        cell: (row) =>
          row.unit_specifications?.floor != null
            ? row.unit_specifications.floor
            : '—',
      },
      {
        id: 'is_furnished',
        label: tUnits('columns.isFurnished'),
        cell: (row) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              row.unit_specifications?.is_furnished === 1
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {row.unit_specifications?.is_furnished === 1
              ? tUnits('yes')
              : tUnits('no')}
          </span>
        ),
      },
      {
        id: 'is_active',
        label: tUnits('columns.isActive'),
        cell: (row) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              row.is_active === 1
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {row.is_active === 1 ? tUnits('yes') : tUnits('no')}
          </span>
        ),
      },
      {
        id: 'is_eligible_for_rent',
        label: tUnits('columns.isEligibleForRent'),
        cell: (row) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              row.is_eligible_for_rent === 1
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {row.is_eligible_for_rent === 1 ? tUnits('yes') : tUnits('no')}
          </span>
        ),
      },
      {
        id: 'rental_company',
        label: tUnits('columns.rentalCompany'),
        cell: (row) => {
          const name =
            row.rental_company_name ??
            (row.rental_company_id != null
              ? rentalCompanyMap.get(row.rental_company_id)
              : null);
          return name ?? '—';
        },
      },
      {
        id: 'locked_by',
        label: t('blockedBy'),
        cell: (row) => row.locked_by ?? '—',
      },
      {
        id: 'customer_name',
        label: tUnits('columns.customerName'),
        cellClassName: 'max-w-[200px]',
        cell: (row) => {
          const names = (row.customer_units ?? [])
            .map((c) => c.customer_name)
            .filter((n): n is string => Boolean(n));
          if (names.length === 0) return '—';
          const text = names.join(', ');
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'id_number',
        label: tUnits('columns.idNumber'),
        cell: (row) => {
          // A unit can have several owners, so list every national ID rather
          // than only the first, the way the customer name column does.
          const ids = (row.customer_units ?? [])
            .map((c) => c.id_number)
            .filter((id): id is string => Boolean(id));
          return ids.length ? ids.join(', ') : '—';
        },
      },
      {
        id: 'mobile_number',
        label: tUnits('columns.mobileNumber'),
        cell: (row) => row.customer_units?.[0]?.mobile_number ?? '—',
      },
      {
        id: 'sign_date',
        label: tUnits('columns.signDate'),
        cell: (row) => {
          const date = row.customer_units?.[0]?.sign_date;
          if (!date) return '—';
          return new Date(date).toLocaleDateString();
        },
      },
    ],
    [t, tUnits, rentalCompanyMap],
  );

  return (
    <DataTable<Unit>
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      loading={isLoading}
      persistKey="unit-blocks-add-columns"
      showColumnToggle
      onRowClick={onRowClick}
    />
  );
}
