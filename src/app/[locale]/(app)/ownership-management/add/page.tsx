'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import AccessDenied from '@/src/components/AccessDenied';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import FileDropZone from '@/src/components/ui/FileDropZone';
import MainBox from '@/src/components/ui/MainBox';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { createOwnershipManagementRequest } from '@/src/services/ownershipManagementRequests';
import { getUnits, type Unit } from '@/src/services/units';

const LIMIT = 20;

const MAX_ATTACHMENTS = 5;
const DESCRIPTION_MAX_LENGTH = 1000;
const ATTACHMENT_ACCEPT = 'image/*';

const searchUnitSchema = z.object({
  unit_number: z.string().optional(),
  unit_id: z.string().optional(),
  is_exact: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchUnitSchema>;

const createRequestSchema = z.object({
  unit_number: z.string().optional(),
  category_id: z.string().min(1, 'Category is required'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(
      DESCRIPTION_MAX_LENGTH,
      `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`,
    ),
});

type CreateFormData = z.infer<typeof createRequestSchema>;

/** Flattened row: one row per customer per unit */
interface UnitRow {
  unitId: number;
  unitNumber: string;
  customerName: string;
  projectName: string;
  mobile: string;
  customerId: number;
}

function flattenUnits(units: Unit[]): UnitRow[] {
  const rows: UnitRow[] = [];

  for (const unit of units) {
    if (unit.customer_units.length > 0) {
      unit.customer_units.forEach((customerUnit) => {
        rows.push({
          unitId: unit.unit_id ?? unit.id,
          unitNumber: unit.unit_number,
          customerName: customerUnit.customer_name ?? '—',
          projectName: unit.project_name ?? '—',
          mobile: customerUnit.mobile_number ?? '—',
          customerId: customerUnit.customer_id,
        });
      });
    } else {
      rows.push({
        unitId: unit.unit_id ?? unit.id,
        unitNumber: unit.unit_number,
        customerName: '—',
        projectName: unit.project_name ?? '—',
        mobile: '—',
        customerId: 0,
      });
    }
  }

  return rows;
}

export default function OwnershipManagementAdd() {
  const t = useTranslations('ownershipManagement');
  const tForm = useTranslations('form');
  const router = useRouter();
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/ownership-management/add');
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);

  // ── Unit search state ────────────────────────────────────────
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

  // ── Request creation state ───────────────────────────────────
  const [selectedUnit, setSelectedUnit] = useState<UnitRow | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [filesError, setFilesError] = useState('');

  // ── Fetch ────────────────────────────────────────────────────
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
            all_units: 1,
            page,
            limit,
          },
          controller.signal,
        );
        setRows(flattenUnits(data.units));
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setError(t('loadUnitsError'));
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  // ── Unit search handlers ─────────────────────────────────────
  const handleSearchSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    setSelectedUnit(null);
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
    setSelectedUnit(null);
    setError('');
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

  // ── Create submit handler ────────────────────────────────────
  const handleCreateSubmit = async (data: CreateFormData) => {
    if (!selectedUnit) return;

    if (files.length === 0) {
      setFilesError(t('fields.attachmentsRequired'));
      return;
    }

    if (files.some((file) => !file.type.startsWith('image/'))) {
      setFilesError(t('fields.imagesOnly'));
      return;
    }

    if (files.length > MAX_ATTACHMENTS) {
      setFilesError(t('fields.attachmentsMax', { max: MAX_ATTACHMENTS }));
      return;
    }

    setFilesError('');

    try {
      await createOwnershipManagementRequest({
        unit_id: selectedUnit.unitId,
        category_id: Number(data.category_id),
        description: data.description,
        files,
      });
      showSuccess('createSuccess');
      router.push('/ownership-management/search');
    } catch (err) {
      showError(err);
    }
  };

  const handleFilesChange = (nextFiles: File[]) => {
    const imageFiles = nextFiles.filter((file) =>
      file.type.startsWith('image/'),
    );

    if (imageFiles.length !== nextFiles.length) {
      setFilesError(t('fields.imagesOnly'));
      setFiles(imageFiles.slice(0, MAX_ATTACHMENTS));
      return;
    }

    if (imageFiles.length > MAX_ATTACHMENTS) {
      setFilesError(t('fields.attachmentsMax', { max: MAX_ATTACHMENTS }));
      setFiles(imageFiles.slice(0, MAX_ATTACHMENTS));
      return;
    }

    setFilesError('');
    setFiles(imageFiles);
  };

  // ── Options ──────────────────────────────────────────────────
  const categoryOptions = useMemo(
    () =>
      (dropdowns?.ownership_management_categories ?? []).map((option) => ({
        value: String(option.id),
        label: option.name,
      })),
    [dropdowns],
  );

  // ── Unit search form config ──────────────────────────────────
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
      onlyNumbers: true,
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

  // ── Unit table columns ───────────────────────────────────────
  const unitColumns: ColumnDef<UnitRow>[] = [
    {
      id: 'unitNumber',
      label: t('columns.unitNumber'),
      accessorKey: 'unitNumber',
      alwaysVisible: true,
    },
    {
      id: 'customerName',
      label: t('addColumns.customerName'),
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

  // ── Request form config ──────────────────────────────────────
  const createFields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'category_id',
      label: t('fields.category'),
      placeholder: t('fields.selectCategory'),
      fieldType: 'select',
      options: categoryOptions,
    },
    {
      name: 'description',
      label: t('fields.description'),
      placeholder: t('fields.descriptionPlaceholder'),
      fieldType: 'textarea',
      rows: 4,
      maxLength: DESCRIPTION_MAX_LENGTH,
      containerClassName: 'sm:col-span-2',
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
      onClick: () => {
        setSelectedUnit(null);
        setFiles([]);
        setFilesError('');
      },
    },
  ];

  if (!privileges.canAccess || !canAdd) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Unit search form ─────────────────────────────────── */}
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

      {/* ── Unit results table ───────────────────────────────── */}
      {hasSearched && !selectedUnit && (
        <MainBox>
          <DataTable<UnitRow>
            title={`${t('results')} (${totalCount})`}
            columns={unitColumns}
            data={rows}
            rowKey={(row) => `${row.unitId}-${row.customerId}`}
            loading={isLoading}
            emptyState={t('noUnitsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="ownership-management-add-unit-columns"
            showColumnToggle
            onRowClick={(row) => {
              setSelectedUnit(row);
              setFiles([]);
              setFilesError('');
            }}
          />
        </MainBox>
      )}

      {/* ── Request creation form ────────────────────────────── */}
      {selectedUnit && (
        <Form
          title={t('add.title')}
          fields={createFields}
          buttons={createButtons}
          initialValues={{
            unit_number: selectedUnit.unitNumber,
            category_id: '',
            description: '',
          }}
          validationSchema={createRequestSchema}
          onSubmit={handleCreateSubmit}
        >
          <FileDropZone
            label={`${t('fields.attachments')} *`}
            name="files"
            files={files}
            onChange={handleFilesChange}
            accept={ATTACHMENT_ACCEPT}
          />
          {filesError && (
            <p className="text-sm text-red-600">{filesError}</p>
          )}
        </Form>
      )}
    </div>
  );
}
