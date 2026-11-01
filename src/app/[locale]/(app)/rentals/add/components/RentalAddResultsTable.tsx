'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import type { UnitRow } from '../types';
import { canAddReservation } from '../utils';

type RentalAddResultsTableProps = {
  rows: UnitRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => Promise<void> | void;
  onPageSizeChange: (size: number) => Promise<void> | void;
  onAddReservation: (row: UnitRow) => Promise<void> | void;
  onViewHistory: (row: UnitRow) => void;
};

export default function RentalAddResultsTable({
  rows,
  totalCount,
  currentPage,
  pageSize,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onAddReservation,
  onViewHistory,
}: RentalAddResultsTableProps) {
  const t = useTranslations('rentals');

  const columns = useMemo<ColumnDef<UnitRow>[]>(
    () => [
      {
        id: 'unitNumber',
        label: t('columns.unitNumber'),
        accessorKey: 'unitNumber',
        alwaysVisible: true,
      },
      {
        id: 'customerName',
        label: t('columns.customerName'),
        accessorKey: 'customerName',
        alwaysVisible: true,
      },
      {
        id: 'customerCode',
        label: t('columns.customerCode'),
        accessorKey: 'customerCode',
        alwaysVisible: true,
      },
      {
        id: 'mobile',
        label: t('columns.mobileNumber'),
        accessorKey: 'mobile',
        alwaysVisible: true,
      },
      {
        id: 'actions',
        label: t('columns.actions'),
        alwaysVisible: true,
        cell: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="primary"
              fullWidth={false}
              disabled={!canAddReservation(row)}
              onClick={(event) => {
                event.stopPropagation();
                void onAddReservation(row);
              }}
            >
              {t('addReservation')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              fullWidth={false}
              onClick={(event) => {
                event.stopPropagation();
                onViewHistory(row);
              }}
            >
              {t('viewRentalHistory')}
            </Button>
          </div>
        ),
      },
    ],
    [onAddReservation, onViewHistory, t],
  );

  return (
    <MainBox>
      <DataTable<UnitRow>
        title={`${t('results')} (${totalCount})`}
        columns={columns}
        data={rows}
        rowKey={(row) => `${row.unitId}-${row.customerId}`}
        loading={isLoading}
        emptyState={t('noUnitsFound')}
        itemsPerPage={pageSize}
        pageSize={pageSize}
        currentPage={currentPage}
        totalCount={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        persistKey="rentals-add-unit-columns"
        showColumnToggle
      />
    </MainBox>
  );
}
