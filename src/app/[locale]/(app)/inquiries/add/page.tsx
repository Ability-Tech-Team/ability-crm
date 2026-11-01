'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { getUnits, type Unit } from '@/src/services/units';
import { createInquiry } from '@/src/services/inquiries';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getContactChannelPayload } from '@/src/lib/contactChannel';
import { useDropdowns } from '@/src/hooks/useDropdowns';

const LIMIT = 10;

// ── Unit search schema ─────────────────────────────────────────
const searchUnitSchema = z.object({
  unit_number: z.string().optional(),
  unit_id: z.string().optional(),
  is_exact: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchUnitSchema>;

// ── Inquiry creation schema ────────────────────────────────────
const createInquirySchema = z.object({
  unit_number: z.string().min(1),
  requester_name: z.string().min(1, 'Requester name is required'),
  requester_mobile: z
    .string()
    .regex(/^\d{11}$/, 'Requester mobile must be exactly 11 digits'),
  contact_channel_id: z.string().min(1, 'Contact channel is required'),
  inquiry: z.string().min(1, 'Inquiry is required'),
  response: z.string().min(1, 'Response is required'),
});

type CreateFormData = z.infer<typeof createInquirySchema>;

// ── Flattened row: one row per customer per unit ───────────────
interface UnitRow {
  unitId: number;
  unitNumber: string;
  customerName: string;
  projectName: string;
  mobile: string;
}

function flattenUnits(units: Unit[]): UnitRow[] {
  const rows: UnitRow[] = [];
  for (const unit of units) {
    if (unit.customer_units.length > 0) {
      for (const cu of unit.customer_units) {
        rows.push({
          unitId: unit.id,
          unitNumber: unit.unit_number,
          customerName: cu.customer_name ?? '—',
          projectName: unit.project_name ?? '—',
          mobile: cu.mobile_number ?? '—',
        });
      }
    } else {
      rows.push({
        unitId: unit.id,
        unitNumber: unit.unit_number,
        customerName: '—',
        projectName: unit.project_name ?? '—',
        mobile: '—',
      });
    }
  }
  return rows;
}

export default function AddInquiry() {
  const t = useTranslations('inquiries');
  const tForm = useTranslations('form');
  const router = useRouter();
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();

  // ── Unit search state ──────────────────────────────────────
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<{
    unit_number?: string;
    unit_id?: number;
    is_exact?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Selected unit state ────────────────────────────────────
  const [selectedUnit, setSelectedUnit] = useState<UnitRow | null>(null);

  // ── Fetch units ────────────────────────────────────────────
  const fetchUnits = useCallback(
    async (
      params: { unit_number?: string; unit_id?: number; is_exact?: boolean },
      page: number,
      limit: number,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getUnits(
          {
            unit_number: params.unit_number,
            unit_id: params.unit_id,
            is_exact: params.is_exact,
            page,
            limit,
          },
          controller.signal,
        );
        setRows(flattenUnits(data.units));
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setError(t('loadError'));
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  // ── Search form handlers ───────────────────────────────────
  const handleSearchSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    const params = {
      unit_number: data.unit_number || undefined,
      unit_id: data.unit_id ? Number(data.unit_id) : undefined,
      is_exact: data.is_exact === '1',
    };
    setSearchParams(params);
    setCurrentPage(1);
    await fetchUnits(params, 1, pageSize);
  };

  const handleSearchReset = () => {
    setRows([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(LIMIT);
    setSearchParams(null);
    setHasSearched(false);
    setError('');
    setSelectedUnit(null);
  };

  const handlePageChange = async (page: number) => {
    if (!searchParams || page === currentPage) return;
    setCurrentPage(page);
    await fetchUnits(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchUnits(searchParams, 1, size);
  };

  // ── Search form config ─────────────────────────────────────
  const searchFields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'unit_id',
      label: tForm('unitId'),
      placeholder: tForm('unitId'),
      type: 'text',
    },
    {
      name: 'is_exact',
      label: tForm('isExact'),
      fieldType: 'checkbox',
    },
  ];

  const searchButtons: ButtonConfig[] = [
    {
      label: tForm('search'),
      loadingLabel: tForm('searching'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('clear'),
      type: 'reset',
      variant: 'secondary',
    },
  ];

  // ── Unit table columns ─────────────────────────────────────
  const unitColumns: ColumnDef<UnitRow>[] = [
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
      id: 'projectName',
      label: t('addColumns.projectName'),
      accessorKey: 'projectName',
    },
    {
      id: 'mobile',
      label: t('addColumns.mobile'),
      accessorKey: 'mobile',
    },
  ];

  // ── Inquiry creation form config ───────────────────────────
  const contactChannelOptions = useMemo(
    () =>
      (dropdowns?.contact_channels ?? []).map((channel) => ({
        value: String(channel.id),
        label: channel.name,
      })),
    [dropdowns],
  );

  const createFields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'requester_name',
      label: tForm('requesterName'),
      placeholder: tForm('requesterName'),
      type: 'text',
    },
    {
      name: 'requester_mobile',
      label: tForm('requesterMobile'),
      placeholder: tForm('requesterMobile'),
      type: 'text',
      onlyNumbers: true,
      maxLength: 11,
    },
    {
      name: 'contact_channel_id',
      label: tForm('contactChannel'),
      placeholder: tForm('contactChannel'),
      fieldType: 'select',
      options: contactChannelOptions,
    },
    {
      name: 'inquiry',
      label: tForm('inquiry'),
      placeholder: tForm('inquiry'),
      fieldType: 'textarea',
      rows: 4,
    },
    {
      name: 'response',
      label: tForm('response'),
      placeholder: tForm('responsePlaceholder'),
      fieldType: 'textarea',
      rows: 4,
    },
  ];

  const createButtons: ButtonConfig[] = [
    {
      label: tForm('add'),
      loadingLabel: tForm('adding'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: () => setSelectedUnit(null),
    },
  ];

  // ── Create submit handler ──────────────────────────────────
  const handleCreateSubmit = async (data: CreateFormData) => {
    try {
      await createInquiry({
        unit_number: data.unit_number,
        unit_id: selectedUnit?.unitId ?? 0,
        requester_name: data.requester_name,
        requester_mobile: data.requester_mobile,
        ...getContactChannelPayload(data.contact_channel_id),
        inquiry: data.inquiry,
        response: data.response,
      });
      showSuccess('createSuccess');
      router.push('/inquiries/search');
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Unit search form ──────────────────────────────────── */}
      <Form
        title={`${t('title')} - ${tForm('add')}`}
        fields={searchFields}
        buttons={searchButtons}
        initialValues={{ unit_number: '', unit_id: '', is_exact: '1' }}
        validationSchema={searchUnitSchema}
        onSubmit={handleSearchSubmit}
        onReset={handleSearchReset}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Unit results table ────────────────────────────────── */}
      {hasSearched && !selectedUnit && (
        <MainBox>
          <DataTable<UnitRow>
            title={`${t('results')} (${totalCount})`}
            columns={unitColumns}
            data={rows}
            rowKey={(row) => `${row.unitId}-${row.customerName}`}
            loading={isLoading}
            emptyState={t('noUnitsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="inquiries-add-unit-columns"
            showColumnToggle
            onRowClick={(row) => setSelectedUnit(row)}
          />
        </MainBox>
      )}

      {/* ── Inquiry creation form ─────────────────────────────── */}
      {selectedUnit && (
        <Form
          title={t('add.title')}
          fields={createFields}
          buttons={createButtons}
          initialValues={{
            unit_number: selectedUnit.unitNumber,
            requester_name:
              selectedUnit.customerName === '—'
                ? ''
                : selectedUnit.customerName,
            requester_mobile:
              selectedUnit.mobile === '—' ? '' : selectedUnit.mobile,
            contact_channel_id: '',
            inquiry: '',
            response: '',
          }}
          validationSchema={createInquirySchema}
          onSubmit={handleCreateSubmit}
        />
      )}
    </div>
  );
}
