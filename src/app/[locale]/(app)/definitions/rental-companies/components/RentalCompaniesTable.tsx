'use client';

import { useMemo } from 'react';
import { Paperclip } from 'lucide-react';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import ToggleSwitch from '@/src/components/ui/ToggleSwitch';
import type { RentalCompany } from '@/src/services/rentalCompanies';

type RentalCompaniesTableProps = {
  data: RentalCompany[];
  tForm: (key: string) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
  canEdit: boolean;
  isLoading: boolean;
  isSearching: boolean;
  onViewAttachments: (company: RentalCompany) => void;
  onToggleStatus: (company: RentalCompany) => void;
};

export default function RentalCompaniesTable({
  data,
  tForm,
  t,
  canEdit,
  isLoading,
  isSearching,
  onViewAttachments,
  onToggleStatus,
}: RentalCompaniesTableProps) {
  const canManageActions =
    canEdit || data.some((company) => company.attachmentsCount > 0);

  const columns = useMemo<ColumnDef<RentalCompany>[]>(
    () => [
      {
        id: 'name',
        label: tForm('name'),
        alwaysVisible: true,
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-800">{row.name}</span>
            {row.en_name || row.ar_name ? (
              <span className="text-xs text-slate-500">
                {[row.en_name, row.ar_name].filter(Boolean).join(' • ')}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'commercial_register',
        label: t('commercialRegister'),
        alwaysVisible: true,
        cell: (row) =>
          row.commercial_register ? (
            <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {row.commercial_register}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },
      {
        id: 'tax_register',
        label: t('taxRegister'),
        alwaysVisible: true,
        cell: (row) =>
          row.tax_register ? (
            <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {row.tax_register}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },

      {
        id: 'description',
        label: tForm('description'),
        alwaysVisible: true,
        cell: (row) =>
          row.description ? (
            <span className="line-clamp-2 text-sm text-slate-700">
              {row.description}
            </span>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          ),
      },
      ...(canManageActions
        ? [
            {
              id: 'action',
              alwaysVisible: true,
              label: tForm('actions'),
              cell: (row: RentalCompany) => {
                const isActive = Number(row.is_active ?? 1) === 1;

                return (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onViewAttachments(row)}
                      disabled={row.attachmentsCount === 0}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Paperclip size={14} />
                      {t('viewAttachments')}
                      {row.attachmentsCount > 0
                        ? ` (${row.attachmentsCount})`
                        : ''}
                    </button>

                    {canEdit ? (
                      <ToggleSwitch
                        checked={isActive}
                        onChange={() => onToggleStatus(row)}
                      />
                    ) : null}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [canEdit, canManageActions, onToggleStatus, onViewAttachments, t, tForm],
  );

  return (
    <DataTable<RentalCompany>
      columns={columns}
      data={data}
      rowKey={(row) => row.id}
      loading={isLoading || isSearching}
      itemsPerPage={10}
      persistKey="definitions-rental-companies-columns"
      showColumnToggle
      emptyState={t('noResults')}
    />
  );
}
