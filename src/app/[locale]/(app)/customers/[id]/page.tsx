'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Heart,
  Star,
  FileText,
  Car,
  Building2,
  AlertCircle,
  Upload,
  Download,
  Eye,
  TicketPlus,
  Lock,
  X,
} from 'lucide-react';
import CustomerEditModal from '@/src/components/CustomerEditModal';
import MediaUploadModal from '@/src/components/MediaUploadModal';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import FilePreviewDialog from '@/src/components/ui/FilePreviewDialog';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import {
  getCustomerById,
  type Customer,
  type CustomerUnit,
  type CustomerCar,
} from '@/src/services/customers';
import { Pencil, Trash2 } from 'lucide-react';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import { deleteCustomer } from '@/src/services/customers';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { useSelectedUnitStore } from '@/src/store/useSelectedUnitStore';
import { type Unit as UnitDetailModel } from '@/src/services/units';
import { getUnitMedia, type MediaItem } from '@/src/services/documentLibrary';
import { downloadFile } from '@/src/lib/downloadFile';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import SectionHeader from '@/src/components/SectionHeader';

// ── Info row component ───────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
        <Icon size={18} className="text-sky-600" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-medium text-slate-800 mt-0.5 wrap-break-word">
          {value != null && value !== '' ? value : '—'}
        </span>
      </div>
    </div>
  );
}

// ── Format date helper ───────────────────────────────────────
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ── Main page ────────────────────────────────────────────────
export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('customers.detail');
  const tCustomers = useTranslations('customers');
  const tUnits = useTranslations('units');
  const tForm = useTranslations('form');
  const customerPrivileges = useRoutePrivileges('/customers/search');
  const canDeleteCustomer = customerPrivileges.hasPrivilege(
    PRIVILEGE_IDS.DELETE,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const unitPrivileges = useRoutePrivileges('/units/search');
  const canReadUnits = unitPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const documentLibraryPrivileges = useRoutePrivileges('/document-library');
  const canUploadDocuments = documentLibraryPrivileges.hasPrivilege(
    PRIVILEGE_IDS.ADD,
  );
  const canReadDocuments = documentLibraryPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canExportDocuments = documentLibraryPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EXPORT,
  );
  const ticketPrivileges = useRoutePrivileges('/tickets/add');
  const canAddTicket = ticketPrivileges.hasPrivilege(PRIVILEGE_IDS.ADD);

  const customerId = Number(params.id);
  const setSelectedUnit = useSelectedUnitStore((s) => s.setUnit);
  const { success: showSuccess, error: showError } = useResponseMessage();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const tUpload = useTranslations('upload');
  const tDocLib = useTranslations('documentLibrary');

  // Documents state
  const [showDocuments, setShowDocuments] = useState(false);
  const [documents, setDocuments] = useState<MediaItem[]>([]);
  const [documentsTotalCount, setDocumentsTotalCount] = useState(0);
  const [documentsCurrentPage, setDocumentsCurrentPage] = useState(1);
  const [documentsPageSize, setDocumentsPageSize] = useState(10);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const documentsAbortRef = useRef<AbortController | null>(null);

  const loadCustomer = useCallback(
    async (signal?: AbortSignal) => {
      if (!customerId || isNaN(customerId)) {
        setCustomer(null);
        setError(t('notFound'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const data = await getCustomerById(customerId, signal);

        if (signal?.aborted) return;

        if (!data) {
          setCustomer(null);
          setError(t('notFound'));
        } else {
          setCustomer(data);
        }
      } catch (err: unknown) {
        if (
          !signal?.aborted &&
          (err as { name?: string }).name !== 'CanceledError'
        ) {
          setCustomer(null);
          setError(t('notFoundMessage'));
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [customerId, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void loadCustomer(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadCustomer]);

  // ── Fetch documents ────────────────────────────────────────
  const fetchDocuments = useCallback(
    async (page: number, limit: number) => {
      if (!customer) return;
      documentsAbortRef.current?.abort();
      const controller = new AbortController();
      documentsAbortRef.current = controller;

      setDocumentsLoading(true);
      try {
        const data = await getUnitMedia(
          { customer_code: customer.customer_code ?? undefined, page, limit },
          controller.signal,
        );
        setDocuments(data.media);
        setDocumentsTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          showError(err);
        }
      } finally {
        if (documentsAbortRef.current === controller) {
          setDocumentsLoading(false);
        }
      }
    },
    [customer, showError],
  );

  const handleShowDocuments = () => {
    if (!showDocuments) {
      setShowDocuments(true);
      setDocumentsCurrentPage(1);
      fetchDocuments(1, documentsPageSize);
    } else {
      setShowDocuments(false);
    }
  };

  const handleDocumentsPageChange = async (page: number) => {
    if (page === documentsCurrentPage) return;
    setDocumentsCurrentPage(page);
    await fetchDocuments(page, documentsPageSize);
  };

  const handleDocumentsPageSizeChange = async (size: number) => {
    setDocumentsPageSize(size);
    setDocumentsCurrentPage(1);
    await fetchDocuments(1, size);
  };

  const documentsExportParams = useMemo(
    () => ({ customer_code: customer?.customer_code ?? undefined }),
    [customer],
  );

  // ── Build Unit for ticket creation & navigate ──────────────
  const navigateToTicketCreate = useCallback(
    (unitRow: CustomerUnit) => {
      const ud = unitRow.unit_details;
      if (!ud || !customer) return;

      const mappedUnit: UnitDetailModel = {
        id: ud.id,
        unit_id: ud.id,
        unit_number: ud.unit_number ?? '',
        project_id: ud.project_id ?? 0,
        unit_specification_id: ud.unit_specification_id ?? 0,
        notes: ud.notes ?? null,
        is_active: ud.is_active ?? 1,
        is_broker: ud.is_broker ?? 0,
        delivery_date: ud.delivery_date ?? null,
        contracting_date: ud.contracting_date ?? null,
        created_at: ud.created_at ?? '',
        updated_at: ud.updated_at ?? null,
        is_eligible_for_rent: ud.is_eligible_for_rent ?? 0,
        is_locked: ud.is_locked ?? 0,
        locked_by: ud.locked_by ?? null,
        project_name: ud.project_name ?? '—',
        unit_specifications: ud.unit_specifications
          ? {
              id: ud.unit_specifications.id,
              unit_type_id: ud.unit_specifications.unit_type_id ?? 0,
              location_id: ud.unit_specifications.location_id ?? 0,
              address: ud.unit_specifications.address ?? '',
              total_area: ud.unit_specifications.total_area ?? '',
              floor: ud.unit_specifications.floor ?? 0,
              room_no: ud.unit_specifications.room_no ?? 0,
              path_room_no: ud.unit_specifications.path_room_no ?? 0,
              living_room_no: ud.unit_specifications.living_room_no ?? 0,
              balcony_no: ud.unit_specifications.balcony_no ?? 0,
              is_furnished: ud.unit_specifications.is_furnished ?? 0,
              unit_type_name: ud.unit_specifications.unit_type_name ?? '',
            }
          : null,
        customer_units: [
          {
            customer_id: customer.id,
            customer_code: customer.customer_code,
            mobile_number: customer.mobile_number,
            customer_name: customer.customer_name,
            customer_type_id: customer.customer_type_id,
            customer_type_name: customer.customer_type_name,
            marital_status_id: customer.marital_status_id,
            marital_status_name: customer.marital_status_name,
            religion_id: customer.religion_id,
            religion_name: customer.religion_name,
            country_id: customer.country_id,
            country_name: customer.country_name,
            id_type_id: customer.id_type,
            id_type_name: customer.id_type_name,
            ownership_type_id: unitRow.ownership_id,
            ownership_type_name: unitRow.ownership,
            sign_date: unitRow.sign_date,
            contract_number: unitRow.contract_number,
          },
        ],
      };

      sessionStorage.setItem(
        'ticket-create-unit',
        JSON.stringify({ unit: mappedUnit, customerIndex: 0 }),
      );
      router.push(
        `/tickets/add/create?unitId=${ud.id}&customerId=${customer.id}`,
      );
    },
    [customer, router],
  );

  const handleAddTicket = useCallback(() => {
    if (!customer) return;
    const units = customer.customer_units.filter((u) => u.unit_details != null);
    if (units.length === 0) return;
    if (units.length === 1) {
      navigateToTicketCreate(units[0]);
    } else {
      setShowUnitPicker(true);
    }
  }, [customer, navigateToTicketCreate]);

  // ── Download handler ───────────────────────────────────────
  const handleDownload = useCallback((item: MediaItem) => {
    downloadFile(item.file_path, item.file_name);
  }, []);

  // ── Column definitions ─────────────────────────────────────
  const unitColumns: ColumnDef<CustomerUnit>[] = [
    {
      id: 'unit_number',
      label: tUnits('columns.unitNumber'),
      cell: (row) => row.unit_details?.unit_number ?? '—',
      alwaysVisible: true,
    },
    {
      id: 'project_name',
      label: tUnits('columns.projectName'),
      cell: (row) => row.unit_details?.project_name ?? '—',
      alwaysVisible: true,
    },
    {
      id: 'unit_type_name',
      label: tUnits('columns.unitType'),
      cell: (row) =>
        row.unit_details?.unit_specifications?.unit_type_name ?? '—',
    },
    {
      id: 'total_owners',
      label: tUnits('columns.totalOwners'),
      cell: (row) => (row.unit_details ? 1 : 0),
    },
    {
      id: 'address',
      label: tUnits('columns.address'),
      cell: (row) => row.unit_details?.unit_specifications?.address ?? '—',
    },
    {
      id: 'total_area',
      label: tUnits('columns.totalArea'),
      cell: (row) => row.unit_details?.unit_specifications?.total_area ?? '—',
    },
    {
      id: 'floor',
      label: tUnits('columns.floor'),
      cell: (row) => row.unit_details?.unit_specifications?.floor ?? '—',
    },
    {
      id: 'is_furnished',
      label: tUnits('columns.isFurnished'),
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.unit_details?.unit_specifications?.is_furnished === 1
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.unit_details?.unit_specifications?.is_furnished === 1
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
          className={`px-2 py-1 rounded-full text-xs font-medium ${
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
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.unit_details?.is_eligible_for_rent === 1
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.unit_details?.is_eligible_for_rent === 1
            ? tUnits('yes')
            : tUnits('no')}
        </span>
      ),
    },
    {
      id: 'rental_company',
      label: tUnits('columns.rentalCompany'),
      cell: () => '—',
    },
    {
      id: 'is_locked',
      label: tUnits('columns.isLocked'),
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.unit_details?.is_locked === 1
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {row.unit_details?.is_locked === 1 ? tUnits('yes') : tUnits('no')}
        </span>
      ),
    },
    {
      id: 'locked_by',
      label: tUnits('columns.lockedBy'),
      cell: (row) => row.unit_details?.locked_by ?? '—',
    },
    {
      id: 'customer_name',
      label: tUnits('columns.customerName'),
      cell: () => customer?.customer_name ?? '—',
    },
    {
      id: 'mobile_number',
      label: tUnits('columns.mobileNumber'),
      cell: () => customer?.mobile_number ?? '—',
    },
    {
      id: 'sign_date',
      label: tUnits('columns.signDate'),
      cell: (row) =>
        row.sign_date ? new Date(row.sign_date).toLocaleDateString() : '—',
    },
    {
      id: 'delivery_date',
      label: tUnits('columns.deliveryDate'),
      cell: (row) =>
        row.unit_details?.delivery_date
          ? new Date(row.unit_details.delivery_date).toLocaleDateString()
          : '—',
    },
  ];

  const carColumns: ColumnDef<CustomerCar>[] = [
    {
      id: 'make',
      label: t('make'),
      cell: (row) => row.make ?? '—',
    },
    {
      id: 'model',
      label: t('model'),
      cell: (row) => row.model ?? '—',
    },
    {
      id: 'plateText',
      label: t('plateText'),
      cell: (row) => row.plate_text ?? '—',
    },
    {
      id: 'plateNumber',
      label: t('plateNumber'),
      cell: (row) => row.plate_number ?? '—',
    },
  ];

  const documentColumns: ColumnDef<MediaItem>[] = [
    {
      id: 'download',
      label: tDocLib('columns.download'),
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(row);
          }}
          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
          title={tDocLib('downloadDocument')}
        >
          <Download size={18} />
        </button>
      ),
    },
    {
      id: 'view',
      label: tDocLib('columns.view'),
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreviewItem(row);
          }}
          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
          title={tDocLib('viewDocument')}
        >
          <Eye size={18} />
        </button>
      ),
    },
    {
      id: 'id',
      label: tDocLib('columns.id'),
      accessorKey: 'id',
      alwaysVisible: true,
    },
    {
      id: 'unit_number',
      label: tDocLib('columns.unitNumber'),
      accessorKey: 'unit_number',
      alwaysVisible: true,
    },
    {
      id: 'media_type_name',
      label: tDocLib('columns.mediaType'),
      accessorKey: 'media_type_name',
    },
    {
      id: 'file_name',
      label: tDocLib('columns.fileName'),
      accessorKey: 'file_name',
    },
    {
      id: 'description',
      label: tDocLib('columns.description'),
      cell: (row) => row.description ?? '—',
    },
    {
      id: 'created_by',
      label: tDocLib('columns.createdBy'),
      cell: (row) => row.created_by ?? '—',
    },
    {
      id: 'created_at',
      label: tDocLib('columns.createdAt'),
      cell: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
    },
    {
      id: 'updated_at',
      label: tDocLib('columns.updatedAt'),
      cell: (row) =>
        row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—',
    },
  ];

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">{tForm('loading')}</span>
        </div>
      </div>
    );
  }

  // ── Error / not found ──────────────────────────────────────
  if (error || !customer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-100 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">
          {t('notFound')}
        </h2>
        <p className="text-sm text-slate-500">{t('notFoundMessage')}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          {t('back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {customer.customer_name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {customer.customer_code && (
                <span className="text-sm text-slate-500 font-mono">
                  #{customer.customer_code}
                </span>
              )}
              {customer.customer_type_name && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700">
                  {customer.customer_type_name}
                </span>
              )}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  customer.is_active === 1
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {customer.is_active === 1
                  ? tCustomers('yes')
                  : tCustomers('no')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowEditModal(true)}
          >
            <Pencil size={16} className="mr-1.5" />
            {t('editCustomer')}
          </Button>
          {canDeleteCustomer && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={16} className="mr-1.5" />
              {t('deleteCustomer')}
            </Button>
          )}
          {canReadDocuments && (
            <Button
              variant={showDocuments ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleShowDocuments}
            >
              <FileText size={16} className="mr-1.5" />
              {t('showDocuments')}
            </Button>
          )}
          {canUploadDocuments && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} className="mr-1.5" />
              {tUpload('uploadDocument')}
            </Button>
          )}
          {canAddTicket && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddTicket}
              disabled={
                customer.customer_units.filter((u) => u.unit_details != null)
                  .length === 0
              }
              title={
                customer.customer_units.filter((u) => u.unit_details != null)
                  .length === 0
                  ? t('noUnitsForTicket')
                  : t('addTicket')
              }
            >
              <TicketPlus size={16} className="mr-1.5" />
              {t('addTicket')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Personal info ─────────────────────────────────── */}
        <MainBox>
          <SectionHeader icon={User} title={t('title')} />

          <InfoRow
            icon={User}
            label={t('customerName')}
            value={customer.customer_name}
          />
          <InfoRow
            icon={CreditCard}
            label={t('customerCode')}
            value={customer.customer_code}
          />
          <InfoRow
            icon={Star}
            label={t('customerType')}
            value={customer.customer_type_name}
          />
          <InfoRow
            icon={CreditCard}
            label={t('idType')}
            value={customer.id_type_name}
          />
          <InfoRow
            icon={CreditCard}
            label={t('idNumber')}
            value={customer.id_number}
          />
          <InfoRow
            icon={FileText}
            label={t('birthDate')}
            value={formatDate(customer.birth_date)}
          />
          <InfoRow
            icon={Heart}
            label={t('maritalStatus')}
            value={customer.marital_status_name}
          />
          <InfoRow
            icon={Star}
            label={t('religion')}
            value={customer.religion_name}
          />
        </MainBox>

        {/* ── Contact info ──────────────────────────────────── */}
        <MainBox>
          <SectionHeader icon={Phone} title={t('contactInfo')} />
          <InfoRow
            icon={Phone}
            label={t('mobile')}
            value={customer.mobile_number}
          />
          <InfoRow
            icon={Phone}
            label={t('phone')}
            value={customer.telephone_number}
          />
          <InfoRow icon={Mail} label={t('email')} value={customer.email} />
          <InfoRow
            icon={MapPin}
            label={t('firstAddress')}
            value={customer.first_address}
          />
        </MainBox>
      </div>

      {/* ── Emergency contact & notes ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MainBox>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('emergencyContact')}
            </h2>
          </div>
          <InfoRow
            icon={User}
            label={t('emergencyContact')}
            value={customer.emergency_contact}
          />
          <InfoRow
            icon={Heart}
            label={t('emergencyContactRelation')}
            value={customer.emergency_contact_relation}
          />
          <InfoRow
            icon={Phone}
            label={t('emergencyContactPhone')}
            value={customer.emergency_contact_phone_number}
          />
        </MainBox>

        <MainBox>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('notesLabel')}
            </h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {customer.notes || '—'}
          </p>
        </MainBox>
      </div>

      {/* ── Units ────────────────────────────────────────────── */}
      <MainBox>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {t('units')} ({customer.customer_units.length})
          </h2>
        </div>
        <DataTable<CustomerUnit>
          columns={unitColumns}
          data={customer.customer_units}
          rowKey={(_, idx) => idx}
          emptyState={t('noUnits')}
          itemsPerPage={10}
          persistKey="customer-detail-units"
          showColumnToggle
          rowDisabled={(row) => row.is_active === 0}
          rowTitle={(row) =>
            row.is_active === 0 ? t('contractEnded') : undefined
          }
          rowClassName={(row) =>
            row.is_active === 0 ? 'opacity-60 cursor-not-allowed' : undefined
          }
          onRowClick={
            canReadUnits
              ? (row) => {
                  const unitId = row.unit_details?.id;
                  const unitNumber = row.unit_details?.unit_number;
                  if (unitId && unitNumber) {
                    const mappedUnit: UnitDetailModel = {
                      id: unitId,
                      unit_number: row.unit_details?.unit_number ?? '',
                      project_id: row.unit_details?.project_id ?? 0,
                      unit_specification_id:
                        row.unit_details?.unit_specification_id ?? 0,
                      notes: row.unit_details?.notes ?? null,
                      is_active: row.unit_details?.is_active ?? 1,
                      is_broker: row.unit_details?.is_broker ?? 0,
                      delivery_date: row.unit_details?.delivery_date ?? null,
                      contracting_date:
                        row.unit_details?.contracting_date ?? null,
                      created_at: row.unit_details?.created_at ?? '',
                      updated_at: row.unit_details?.updated_at ?? null,
                      is_eligible_for_rent:
                        row.unit_details?.is_eligible_for_rent ?? 0,
                      is_locked: row.unit_details?.is_locked ?? 0,
                      locked_by: row.unit_details?.locked_by ?? null,
                      project_name: row.unit_details?.project_name ?? '—',
                      unit_specifications: row.unit_details?.unit_specifications
                        ? {
                            id: row.unit_details.unit_specifications.id,
                            unit_type_id:
                              row.unit_details.unit_specifications
                                .unit_type_id ?? 0,
                            location_id:
                              row.unit_details.unit_specifications
                                .location_id ?? 0,
                            address:
                              row.unit_details.unit_specifications.address ??
                              '',
                            total_area:
                              row.unit_details.unit_specifications.total_area ??
                              '',
                            floor:
                              row.unit_details.unit_specifications.floor ?? 0,
                            room_no:
                              row.unit_details.unit_specifications.room_no ?? 0,
                            path_room_no:
                              row.unit_details.unit_specifications
                                .path_room_no ?? 0,
                            living_room_no:
                              row.unit_details.unit_specifications
                                .living_room_no ?? 0,
                            balcony_no:
                              row.unit_details.unit_specifications.balcony_no ??
                              0,
                            is_furnished:
                              row.unit_details.unit_specifications
                                .is_furnished ?? 0,
                            unit_type_name:
                              row.unit_details.unit_specifications
                                .unit_type_name ?? '',
                          }
                        : null,
                      customer_units: [
                        {
                          customer_id: customer.id,
                          mobile_number: customer.mobile_number,
                          customer_code: customer.customer_code,
                          customer_name: customer.customer_name,
                          customer_type_id: customer.customer_type_id,
                          customer_type_name: customer.customer_type_name,
                          marital_status_id: customer.marital_status_id,
                          marital_status_name: customer.marital_status_name,
                          religion_id: customer.religion_id,
                          religion_name: customer.religion_name,
                          country_id: customer.country_id,
                          country_name: customer.country_name,
                          id_type_id: customer.id_type,
                          id_type_name: customer.id_type_name,
                          ownership_type_id: row.ownership_id,
                          ownership_type_name: row.ownership,
                          sign_date: row.sign_date,
                          contract_number: row.contract_number,
                        },
                      ],
                    };

                    setSelectedUnit(mappedUnit);
                    router.replace(
                      `/units/${mappedUnit.unit_id ?? mappedUnit.id}`,
                    );
                  }
                }
              : undefined
          }
        />
      </MainBox>

      {/* ── Cars ─────────────────────────────────────────────── */}
      <MainBox>
        <div className="flex items-center gap-2 mb-4">
          <Car size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {t('cars')} ({customer.customer_cars.length})
          </h2>
        </div>
        <DataTable<CustomerCar>
          columns={carColumns}
          data={customer.customer_cars}
          rowKey={(_, idx) => idx}
          emptyState={t('noCars')}
          itemsPerPage={10}
          persistKey="customer-detail-cars"
          showColumnToggle
        />
      </MainBox>

      {/* ── Documents ────────────────────────────────────────── */}
      {showDocuments && canReadDocuments && (
        <MainBox>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('documents')} ({documentsTotalCount})
            </h2>
          </div>
          <DataTable<MediaItem>
            columns={documentColumns}
            data={documents}
            rowKey={(row) => row.id}
            loading={documentsLoading}
            emptyState={t('noDocuments')}
            itemsPerPage={10}
            pageSize={documentsPageSize}
            currentPage={documentsCurrentPage}
            totalCount={documentsTotalCount}
            onPageChange={handleDocumentsPageChange}
            onPageSizeChange={handleDocumentsPageSizeChange}
            persistKey="customer-detail-documents"
            showColumnToggle
            exportEnabled={canExportDocuments}
            exportEndpoint="/projects/units/media"
            exportParams={documentsExportParams}
            exportFileName="customer-documents"
          />
        </MainBox>
      )}

      {/* ── Unit selection modal for ticket creation ──────── */}
      {showUnitPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowUnitPicker(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowUnitPicker(false);
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {t('selectUnit')}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {t('selectUnitMessage')}
                </p>
              </div>
              <button
                onClick={() => setShowUnitPicker(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Unit list */}
            <div className="overflow-y-auto p-4 flex flex-col gap-2">
              {customer.customer_units
                .filter((u) => u.unit_details != null)
                .map((unitRow, idx) => {
                  const ud = unitRow.unit_details!;
                  const isLocked = ud.is_locked === 1;
                  return (
                    <button
                      key={ud.id ?? idx}
                      disabled={isLocked}
                      onClick={() => {
                        setShowUnitPicker(false);
                        navigateToTicketCreate(unitRow);
                      }}
                      className={`w-full text-start p-4 rounded-xl border transition-all duration-150 ${
                        isLocked
                          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50 hover:shadow-sm cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              isLocked ? 'bg-red-50' : 'bg-sky-50'
                            }`}
                          >
                            {isLocked ? (
                              <Lock size={16} className="text-red-400" />
                            ) : (
                              <Building2 size={16} className="text-sky-600" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-800">
                              {ud.unit_number ?? '—'}
                            </span>
                            <span className="text-xs text-slate-500 block">
                              {ud.project_name ?? '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {ud.unit_specifications?.unit_type_name && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100">
                              {ud.unit_specifications.unit_type_name}
                            </span>
                          )}
                          {unitRow.ownership && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100">
                              {unitRow.ownership}
                            </span>
                          )}
                          {isLocked && (
                            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                              {t('unitLocked')}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {canUploadDocuments && (
        <MediaUploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            if (showDocuments) {
              setDocumentsCurrentPage(1);
              void fetchDocuments(1, documentsPageSize);
            }
          }}
          context={{
            customer_name: customer.customer_name,
            customer_id: customer.id,
            customer_code: customer.customer_code ?? undefined,
            id_number: customer.id_number ?? undefined,
            mobile_number: customer.mobile_number ?? undefined,
          }}
        />
      )}

      <FilePreviewDialog
        open={!!previewItem}
        file={
          previewItem
            ? { url: previewItem.file_path, name: previewItem.file_name }
            : null
        }
        title={tDocLib('previewTitle')}
        onClose={() => setPreviewItem(null)}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        title={t('deleteCustomerTitle')}
        message={t('deleteCustomerMessage', { name: customer.customer_name })}
        confirmLabel={t('deleteCustomer')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        isLoading={isDeleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await deleteCustomer(customer.id);
            showSuccess('deleteSuccess');
            router.push('/customers/search');
          } catch (err) {
            showError(err);
            setShowDeleteConfirm(false);
          } finally {
            setIsDeleting(false);
          }
        }}
      />

      {showEditModal && (
        <CustomerEditModal
          open={showEditModal}
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            void loadCustomer();
          }}
        />
      )}
    </div>
  );
}
