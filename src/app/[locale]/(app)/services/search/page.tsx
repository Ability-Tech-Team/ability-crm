'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import ToggleSwitch from '@/src/components/ui/ToggleSwitch';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useRouter } from '@/src/i18n/navigation';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  getServices,
  updateService,
  type Service,
} from '@/src/services/services';
import MainBox from '@/src/components/ui/MainBox';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { formatErpAccountCode } from '@/src/services/erpAccountCodes';

const LIMIT = 10;

const searchSchema = z.object({
  service_id: z.string().optional(),
  service_name: z.string().optional(),
  department_id: z.string().optional(),
  start_date: z.string().optional(),
  is_active: z.string().optional(),
  show_in_mobile: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function ServicesSearch() {
  const t = useTranslations('services');
  const tForm = useTranslations('form');
  const router = useRouter();
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const serviceSearchPrivileges = useRoutePrivileges('/services/search');
  const canReadService = serviceSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canEditService = serviceSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.EDIT,
    'edit',
  ]);
  const canManageServiceState = canEditService;
  const canDeleteService = serviceSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.DELETE,
    'delete',
  ]);
  const canExportServices = serviceSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.EXPORT,
    'export',
  ]);

  // ── Search & data state ──────────────────────────────────────
  const [services, setServices] = useState<Service[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Modal state ──────────────────────────────────────────────
  const [statusTarget, setStatusTarget] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Dropdowns ────────────────────────────────────────────────
  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const activeOptions = [
    { value: '1', label: t('yes') },
    { value: '0', label: t('no') },
  ];

  const showInMobileOptions = [
    { value: '1', label: t('yes') },
    { value: '0', label: t('no') },
  ];

  // ── Fetch ────────────────────────────────────────────────────
  const fetchServices = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getServices(
          {
            service_id: params.service_id
              ? Number(params.service_id)
              : undefined,
            service_name: params.service_name || undefined,
            department_id: params.department_id
              ? Number(params.department_id)
              : undefined,
            is_active:
              params.is_active !== undefined && params.is_active !== ''
                ? Number(params.is_active)
                : undefined,
            show_in_mobile:
              params.show_in_mobile !== undefined &&
              params.show_in_mobile !== ''
                ? Number(params.show_in_mobile)
                : undefined,
            start_date: params.start_date || undefined,
            page,
            limit,
          },
          controller.signal,
        );
        setServices(data.services);
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

  // ── Form handlers ────────────────────────────────────────────
  const handleSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    setSearchParams(data);
    setCurrentPage(1);
    await fetchServices(data, 1, pageSize);
  };

  const handleReset = () => {
    setServices([]);
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
    await fetchServices(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchServices(searchParams, 1, size);
  };

  const servicesExportParams = useMemo(
    () =>
      searchParams
        ? {
            service_id: searchParams.service_id
              ? Number(searchParams.service_id)
              : undefined,
            service_name: searchParams.service_name || undefined,
            department_id: searchParams.department_id
              ? Number(searchParams.department_id)
              : undefined,
            is_active:
              searchParams.is_active !== undefined &&
              searchParams.is_active !== ''
                ? Number(searchParams.is_active)
                : undefined,
            show_in_mobile:
              searchParams.show_in_mobile !== undefined &&
              searchParams.show_in_mobile !== ''
                ? Number(searchParams.show_in_mobile)
                : undefined,
            start_date: searchParams.start_date || undefined,
          }
        : {},
    [searchParams],
  );

  // ── Actions ──────────────────────────────────────────────────
  const handleEdit = (service: Service) => {
    if (!canEditService) return;
    router.push(`/services/add?edit=${service.id}`);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setIsProcessing(true);
    try {
      await updateService(statusTarget.id, {
        is_active: statusTarget.is_active === 1 ? 0 : 1,
      });
      setStatusTarget(null);
      showSuccess('updateSuccess');
      if (searchParams) {
        await fetchServices(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    try {
      await updateService(deleteTarget.id, {
        is_deleted: 1,
      });
      setDeleteTarget(null);
      showSuccess('deleteSuccess');
      if (searchParams) {
        fetchServices(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Form fields & buttons ────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'service_id',
      label: t('serviceId'),
      placeholder: t('serviceId'),
      type: 'text',
    },
    {
      name: 'service_name',
      label: t('serviceName'),
      placeholder: t('serviceName'),
      type: 'text',
    },
    {
      name: 'department_id',
      label: tForm('department'),
      placeholder: tForm('department'),
      fieldType: 'select',
      options: departmentOptions,
    },
    {
      name: 'start_date',
      label: t('startDate'),
      placeholder: t('startDate'),
      type: 'date',
    },
    {
      name: 'is_active',
      label: t('isActive'),
      fieldType: 'radio',
      options: activeOptions,
    },
    {
      name: 'show_in_mobile',
      label: t('showInMobile'),
      fieldType: 'radio',
      options: showInMobileOptions,
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
  const columns: ColumnDef<Service>[] = [
    ...(canEditService
      ? [
          {
            id: 'edit',
            label: t('columns.edit'),
            disableRowLink: true,
            alwaysVisible: true,
            cell: (row: Service) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row);
                }}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                title={t('editService')}
              >
                <Pencil size={18} />
              </button>
            ),
          },
        ]
      : []),
    ...(canManageServiceState
      ? [
          {
            id: 'status_action',
            label: tForm('status'),
            disableRowLink: true,
            alwaysVisible: true,
            cell: (row: Service) => (
              <div onClick={(e) => e.stopPropagation()}>
                <ToggleSwitch
                  checked={row.is_active === 1}
                  onChange={() => setStatusTarget(row)}
                  disabled={isProcessing}
                />
              </div>
            ),
          },
        ]
      : []),
    ...(canDeleteService
      ? [
          {
            id: 'delete',
            label: t('columns.delete'),
            disableRowLink: true,
            alwaysVisible: true,
            cell: (row: Service) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(row);
                }}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                title={t('deleteService')}
              >
                <Trash2 size={18} />
              </button>
            ),
          },
        ]
      : []),
    {
      id: 'id',
      label: t('columns.serviceId'),
      accessorKey: 'id',
    },
    {
      id: 'service_name',
      label: t('columns.serviceName'),
      accessorKey: 'service_name',
      alwaysVisible: true,
    },
    {
      id: 'department_name',
      label: tForm('department'),
      cell: (row) => row.department_name ?? '—',
    },
    {
      id: 'description',
      label: t('columns.description'),
      cell: (row) => row.description ?? '—',
    },
    {
      id: 'erp_account_code',
      label: tForm('erpAccountCode'),
      cell: (row) => formatErpAccountCode(row.erp_account_codes) || '—',
    },
    {
      id: 'price',
      label: t('columns.price'),
      accessorKey: 'price',
    },
    {
      id: 'created_at',
      label: t('columns.createdAt'),
      cell: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
    },
    {
      id: 'is_active',
      label: t('columns.isActive'),
      cell: (row) =>
        row.is_active === 1 ? (
          <CheckCircle size={20} className="text-green-600" />
        ) : (
          <XCircle size={20} className="text-red-500" />
        ),
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          service_id: '',
          service_name: '',
          department_id: '',
          start_date: '',
          is_active: '',
          show_in_mobile: '',
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
          <DataTable<Service>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={services}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noServicesFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="services-search-columns"
            showColumnToggle
            exportEnabled={canExportServices}
            exportEndpoint="/services"
            exportParams={servicesExportParams}
            exportFileName="services"
            rowHref={
              canReadService ? (row) => `/services/${row.id}` : undefined
            }
          />
        </MainBox>
      )}

      <ConfirmModal
        open={!!statusTarget}
        title={
          statusTarget?.is_active === 1
            ? tForm('deactivate')
            : tForm('activate')
        }
        message={
          statusTarget?.is_active === 1
            ? t('confirmDeactivateMessage', {
                name: statusTarget?.service_name ?? '',
              })
            : t('confirmActivateMessage', {
                name: statusTarget?.service_name ?? '',
              })
        }
        confirmLabel={
          statusTarget?.is_active === 1
            ? tForm('deactivate')
            : tForm('activate')
        }
        cancelLabel={t('cancelAction')}
        confirmVariant={statusTarget?.is_active === 1 ? 'danger' : 'primary'}
        isLoading={isProcessing}
        loadingLabel={t('processing')}
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusTarget(null)}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteMessage', {
          name: deleteTarget?.service_name ?? '',
        })}
        confirmLabel={t('deleteService')}
        cancelLabel={t('cancelAction')}
        confirmVariant="danger"
        isLoading={isProcessing}
        loadingLabel={t('processing')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
