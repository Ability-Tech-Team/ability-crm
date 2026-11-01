'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { getInquiries, type Inquiry } from '@/src/services/inquiries';
import { useDropdowns } from '@/src/hooks/useDropdowns';

const LIMIT = 10;

const searchSchema = z.object({
  unit_number: z.string().optional(),
  requester_name: z.string().optional(),
  requester_mobile: z
    .string()
    .regex(/^\d{11}$/)
    .optional()
    .or(z.literal('')),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  contact_channel_id: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function InquiriesSearch() {
  const t = useTranslations('inquiries');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();

  // ── Search & data state ──────────────────────────────────────
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchInquiries = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getInquiries(
          {
            unit_number: params.unit_number || undefined,
            requester_name: params.requester_name || undefined,
            requester_mobile: params.requester_mobile || undefined,
            contact_channel_id: params.contact_channel_id
              ? Number(params.contact_channel_id)
              : undefined,
            from_date: params.from_date || undefined,
            to_date: params.to_date || undefined,
            page,
            limit,
          },
          controller.signal,
        );
        setInquiries(data.inquiries);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setError(t('loadInquiriesError'));
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  // ── Form handlers ────────────────────────────────────────────
  const handleSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    setSearchParams(data);
    setCurrentPage(1);
    await fetchInquiries(data, 1, pageSize);
  };

  const handleReset = () => {
    setInquiries([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(LIMIT);
    setSearchParams(null);
    setHasSearched(false);
    setError('');
  };

  const handlePageChange = async (page: number) => {
    if (!searchParams || page === currentPage) return;
    setCurrentPage(page);
    await fetchInquiries(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchInquiries(searchParams, 1, size);
  };

  const inquiriesExportParams = useMemo(
    () =>
      searchParams
        ? {
            unit_number: searchParams.unit_number || undefined,
            requester_name: searchParams.requester_name || undefined,
            requester_mobile: searchParams.requester_mobile || undefined,
            contact_channel_id: searchParams.contact_channel_id
              ? Number(searchParams.contact_channel_id)
              : undefined,
            from_date: searchParams.from_date || undefined,
            to_date: searchParams.to_date || undefined,
          }
        : {},
    [searchParams],
  );

  // ── Form config ──────────────────────────────────────────────
  const contactChannelOptions = useMemo(
    () =>
      (dropdowns?.contact_channels ?? []).map((channel) => ({
        value: String(channel.id),
        label: channel.name,
      })),
    [dropdowns],
  );

  const fields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
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
      name: 'from_date',
      label: tForm('dateFrom'),
      placeholder: tForm('dateFrom'),
      type: 'date',
    },
    {
      name: 'to_date',
      label: tForm('dateTo'),
      placeholder: tForm('dateTo'),
      type: 'date',
    },
  ];

  const buttons: ButtonConfig[] = [
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

  // ── Table columns ────────────────────────────────────────────
  const columns: ColumnDef<Inquiry>[] = [
    {
      id: 'id',
      label: t('columns.id'),
      accessorKey: 'id',
      alwaysVisible: true,
    },
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      accessorKey: 'unit_number',
    },
    {
      id: 'requester_name',
      label: t('columns.requesterName'),
      accessorKey: 'requester_name',
    },
    {
      id: 'requester_mobile',
      label: t('columns.requesterMobile'),
      accessorKey: 'requester_mobile',
    },
    {
      id: 'contact_channel_name',
      label: tForm('contactChannel'),
      cell: (row) => row.contact_channel_name ?? '—',
    },
    {
      id: 'inquiry',
      label: t('columns.inquiry'),
      cellClassName: 'max-w-[200px]',
      cell: (row) => {
        const text = row.inquiry ?? '';
        const truncated = text.length > 60 ? `${text.slice(0, 60)}...` : text;
        return (
          <span className="block truncate w-full" title={text}>
            {truncated || '—'}
          </span>
        );
      },
    },
    {
      id: 'response',
      label: t('columns.response'),
      cellClassName: 'max-w-[200px]',
      cell: (row) => {
        const text = row.response ?? '';
        const truncated = text.length > 60 ? `${text.slice(0, 60)}...` : text;
        return (
          <span className="block truncate w-full" title={text}>
            {truncated || '—'}
          </span>
        );
      },
    },
    {
      id: 'created_at',
      label: t('columns.createdAt'),
      cell: (row) => row.created_at?.date ?? '—',
    },
    {
      id: 'created_by',
      label: t('columns.createdBy'),
      cell: (row) => row.created_by ?? '—',
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          unit_number: '',
          requester_name: '',
          requester_mobile: '',
          contact_channel_id: '',
          from_date: '',
          to_date: '',
        }}
        validationSchema={searchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
        autoSubmit
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSearched && (
        <MainBox>
          <DataTable<Inquiry>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={inquiries}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noInquiriesFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="inquiries-search-columns"
            showColumnToggle
            exportEnabled
            exportEndpoint="/orders/inquiries"
            exportParams={inquiriesExportParams}
            exportFileName="inquiries"
            rowHref={(row) => `/inquiries/${row.id}`}
          />
        </MainBox>
      )}
    </div>
  );
}
