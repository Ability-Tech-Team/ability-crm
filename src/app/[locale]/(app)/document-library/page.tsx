'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Eye } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import FilePreviewDialog from '@/src/components/ui/FilePreviewDialog';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getUnitMedia, type MediaItem } from '@/src/services/documentLibrary';
import { downloadFile } from '@/src/lib/downloadFile';

const LIMIT = 10;

const searchSchema = z.object({
  project_id: z.string().optional(),
  unit_number: z.string().optional(),
  media_type_id: z.string().optional(),
  file_name: z.string().optional(),
  description: z.string().optional(),
  customer_name: z.string().optional(),
  id_number: z.string().optional(),
  mobile_number: z.string().optional(),
  customer_code: z.string().optional(),
  ticket_id: z.string().optional(),
  invoice_id: z.string().optional(),
  complain_id: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function DocumentLibraryPage() {
  const t = useTranslations('documentLibrary');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { error: showError } = useResponseMessage();
  const documentPrivileges = useRoutePrivileges('/document-library');
  const canExportDocuments = documentPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EXPORT,
  );

  // ── Search & data state ──────────────────────────────────────
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Download handler ─────────────────────────────────────────
  const handleDownload = useCallback((item: MediaItem) => {
    downloadFile(item.file_path, item.file_name);
  }, []);

  // ── Dropdowns ────────────────────────────────────────────────
  const mediaTypeOptions = useMemo(
    () =>
      (dropdowns?.media_types ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  // ── Fetch ────────────────────────────────────────────────────
  const fetchMedia = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);

      try {
        const data = await getUnitMedia(
          {
            project_id: params.project_id
              ? Number(params.project_id)
              : undefined,
            unit_number: params.unit_number || undefined,
            media_type_id: params.media_type_id
              ? Number(params.media_type_id)
              : undefined,
            file_name: params.file_name || undefined,
            description: params.description || undefined,
            customer_name: params.customer_name || undefined,
            id_number: params.id_number || undefined,
            mobile_number: params.mobile_number || undefined,
            customer_code: params.customer_code || undefined,
            ticket_id: params.ticket_id || undefined,
            invoice_id: params.invoice_id || undefined,
            complain_id: params.complain_id
              ? Number(params.complain_id)
              : undefined,
            page,
            limit,
          },
          controller.signal,
        );
        setMedia(data.media);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          showError(err);
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [showError],
  );

  // ── Form handlers ────────────────────────────────────────────
  const handleSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    setSearchParams(data);
    setCurrentPage(1);
    await fetchMedia(data, 1, pageSize);
  };

  const handleReset = () => {
    setMedia([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(LIMIT);
    setSearchParams(null);
    setHasSearched(false);
  };

  const handlePageChange = async (page: number) => {
    if (!searchParams || page === currentPage) return;
    setCurrentPage(page);
    await fetchMedia(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchMedia(searchParams, 1, size);
  };

  const mediaExportParams = useMemo(
    () =>
      searchParams
        ? {
            project_id: searchParams.project_id
              ? Number(searchParams.project_id)
              : undefined,
            unit_number: searchParams.unit_number || undefined,
            media_type_id: searchParams.media_type_id
              ? Number(searchParams.media_type_id)
              : undefined,
            file_name: searchParams.file_name || undefined,
            description: searchParams.description || undefined,
            customer_name: searchParams.customer_name || undefined,
            id_number: searchParams.id_number || undefined,
            mobile_number: searchParams.mobile_number || undefined,
            customer_code: searchParams.customer_code || undefined,
            ticket_id: searchParams.ticket_id || undefined,
            invoice_id: searchParams.invoice_id || undefined,
            complain_id: searchParams.complain_id
              ? Number(searchParams.complain_id)
              : undefined,
          }
        : {},
    [searchParams],
  );

  // ── Form fields & buttons ────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'media_type_id',
      label: tForm('mediaType'),
      placeholder: tForm('mediaType'),
      fieldType: 'select',
      options: mediaTypeOptions,
    },
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'file_name',
      label: tForm('fileName'),
      placeholder: tForm('fileName'),
      type: 'text',
    },
    {
      name: 'description',
      label: tForm('description'),
      placeholder: tForm('description'),
      type: 'text',
    },
    {
      name: 'customer_name',
      label: tForm('customerName'),
      placeholder: tForm('customerName'),
      type: 'text',
    },
    {
      name: 'id_number',
      label: tForm('idNumber'),
      placeholder: tForm('idNumber'),
      type: 'text',
    },
    {
      name: 'mobile_number',
      label: tForm('mobileNumber'),
      placeholder: tForm('mobileNumber'),
      type: 'text',
    },
    {
      name: 'customer_code',
      label: tForm('customerCode'),
      placeholder: tForm('customerCode'),
      type: 'text',
    },
    {
      name: 'ticket_id',
      label: tForm('ticketId'),
      placeholder: tForm('ticketId'),
      type: 'text',
    },
    {
      name: 'invoice_id',
      label: tForm('invoiceId'),
      placeholder: tForm('invoiceId'),
      type: 'text',
    },
    {
      name: 'complain_id',
      label: tForm('complainId'),
      placeholder: tForm('complainId'),
      type: 'text',
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
  const columns: ColumnDef<MediaItem>[] = [
    {
      id: 'download',
      label: t('columns.download'),
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(row);
          }}
          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
          title={t('downloadDocument')}
        >
          <Download size={18} />
        </button>
      ),
    },
    {
      id: 'view',
      label: t('columns.view'),
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreviewItem(row);
          }}
          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
          title={t('viewDocument')}
        >
          <Eye size={18} />
        </button>
      ),
    },
    {
      id: 'id',
      label: t('columns.id'),
      accessorKey: 'id',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      accessorKey: 'unit_number',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'media_type_name',
      label: t('columns.mediaType'),
      accessorKey: 'media_type_name',
      sortable: true,
    },
    {
      id: 'file_name',
      label: t('columns.fileName'),
      accessorKey: 'file_name',
      sortable: true,
    },
    {
      id: 'customer_name',
      label: t('columns.customerName'),
      cell: (row) => row.customer_name ?? '—',
      sortable: true,
    },
    {
      id: 'description',
      label: t('columns.description'),
      cell: (row) => row.description ?? '—',
      sortable: true,
    },
    {
      id: 'created_by',
      label: t('columns.createdBy'),
      cell: (row) => row.created_by ?? '—',
      sortable: true,
    },
    {
      id: 'created_at',
      label: t('columns.createdAt'),
      cell: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
      sortable: true,
    },
    {
      id: 'updated_at',
      label: t('columns.updatedAt'),
      cell: (row) =>
        row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—',
      sortable: true,
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          project_id: '',
          unit_number: '',
          media_type_id: '',
          file_name: '',
          description: '',
          customer_name: '',
          id_number: '',
          mobile_number: '',
          customer_code: '',
          ticket_id: '',
          invoice_id: '',
          complain_id: '',
        }}
        validationSchema={searchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
        autoSubmit
      />

      {hasSearched && (
        <MainBox>
          <DataTable<MediaItem>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={media}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noResultsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="document-library-columns"
            showColumnToggle
            exportEnabled={canExportDocuments}
            exportEndpoint="/projects/units/media"
            exportParams={mediaExportParams}
            exportFileName="document-library"
          />
        </MainBox>
      )}

      <FilePreviewDialog
        open={!!previewItem}
        file={
          previewItem
            ? { url: previewItem.file_path, name: previewItem.file_name }
            : null
        }
        title={t('previewTitle')}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}
