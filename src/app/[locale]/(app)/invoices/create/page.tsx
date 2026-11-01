'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import EgpSign from '@/src/components/EgpSign';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import UnitDebtDisplay from '@/src/components/UnitDebtDisplay';
import PaymentMethodsModal, {
  type PaymentEntry,
} from '@/src/components/PaymentMethodsModal';
import { getUnitDebitAmount, getUnits, type Unit } from '@/src/services/units';
import { createInvoice, payInvoice } from '@/src/services/invoices';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getContactChannelPayload } from '@/src/lib/contactChannel';

const LIMIT = 10;
const DEFAULT_REQUEST_FROM_ID = 1;

// ── Unit search schema ─────────────────────────────────────────
const searchUnitSchema = z.object({
  unit_number: z.string().optional(),
  is_exact: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchUnitSchema>;

// ── Flattened row: one row per customer per unit ───────────────
interface UnitRow {
  unitId: number;
  unitNumber: string;
  subProjectCode: string;
  customerName: string;
  /** Required by `POST /orders/invoices`; null when no customer is linked. */
  customerId: number | null;
  customerCode: string;
  projectId: number;
  projectName: string;
  mobile: string;
  debitAmount: number | null;
  debtUpdatedAt: string | null;
}

function flattenUnits(units: Unit[]): UnitRow[] {
  const rows: UnitRow[] = [];
  for (const unit of units) {
    if (unit.customer_units.length > 0) {
      for (const cu of unit.customer_units) {
        rows.push({
          unitId: unit.id,
          unitNumber: unit.unit_number,
          subProjectCode: unit.sub_project_code ?? '',
          customerName: cu.customer_name ?? '—',
          customerId: cu.customer_id ?? null,
          customerCode: cu.customer_code ?? '',
          projectId: unit.project_id,
          projectName: unit.project_name ?? '—',
          mobile: cu.mobile_number ?? '—',
          debitAmount: getUnitDebitAmount(unit),
          debtUpdatedAt: unit.debt_updated_at ?? null,
        });
      }
    } else {
      rows.push({
        unitId: unit.id,
        unitNumber: unit.unit_number,
        subProjectCode: unit.sub_project_code ?? '',
        customerName: '—',
        customerId: null,
        customerCode: '',
        projectId: unit.project_id,
        projectName: unit.project_name ?? '—',
        mobile: '—',
        debitAmount: getUnitDebitAmount(unit),
        debtUpdatedAt: unit.debt_updated_at ?? null,
      });
    }
  }
  return rows;
}

// ── Invoice creation schema ────────────────────────────────────
const createInvoiceSchema = z.object({
  unit_number: z.string().min(1),
  customer_name: z.string().optional(),
  invoice_type_id: z.string().min(1, 'Invoice type is required'),
  contact_channel_id: z.string().optional(),
  total_amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((value) => !Number.isNaN(Number(value)), {
      message: 'Amount must be a valid number',
    })
    .refine((value) => Number(value) > 0, {
      message: 'Amount must be greater than 0',
    }),
  notes: z.string().max(500, 'Notes must be at most 500 characters').optional(),
});

type CreateFormData = z.infer<typeof createInvoiceSchema>;

export default function CreateInvoice() {
  const t = useTranslations('invoices');
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
    is_exact?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Selected unit & submit state ───────────────────────────
  const [selectedUnit, setSelectedUnit] = useState<UnitRow | null>(null);
  const [submitError, setSubmitError] = useState('');

  // ── Payment modal state (create & collect) ─────────────────
  const collectAfterCreateRef = useRef(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState(0);
  const [pendingCreateData, setPendingCreateData] = useState<{
    unit_number: string;
    unit_id: number;
    customer_id: number;
    customer_code?: string;
    customer_name: string;
    customer_mobile: string;
    project_id: number;
    invoice_type_id: number;
    contact_channel_id?: number;
    request_from_id: number;
    total_amount: number;
    notes?: string;
  } | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  // ── Debt (uploaded with the unit; no live lookup) ──────────
  const [showDebt, setShowDebt] = useState(false);

  // ── Dropdown options ───────────────────────────────────────
  const invoiceTypeOptions = useMemo(
    () =>
      (dropdowns?.invoice_types ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const contactChannelOptions = useMemo(
    () =>
      (dropdowns?.contact_channels ?? []).map((channel) => ({
        value: String(channel.id),
        label: channel.name,
      })),
    [dropdowns],
  );

  // ── Fetch units ────────────────────────────────────────────
  const fetchUnits = useCallback(
    async (
      params: { unit_number?: string; is_exact?: boolean },
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
    { id: 'unitNumber', label: t('columns.unit'), accessorKey: 'unitNumber' },
    {
      id: 'customerName',
      label: t('columns.customer'),
      accessorKey: 'customerName',
    },
    {
      id: 'projectName',
      label: t('create.projectName'),
      accessorKey: 'projectName',
    },
    { id: 'mobile', label: t('create.mobile'), accessorKey: 'mobile' },
  ];

  // ── Invoice creation form config ───────────────────────────
  const createFields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'customer_name',
      label: tForm('customerName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'invoice_type_id',
      label: t('detail.invoiceType'),
      placeholder: t('detail.invoiceType'),
      fieldType: 'select',
      options: invoiceTypeOptions,
    },
    {
      name: 'contact_channel_id',
      label: tForm('contactChannel'),
      placeholder: tForm('contactChannel'),
      fieldType: 'select',
      options: contactChannelOptions,
    },
    {
      name: 'total_amount',
      label: tForm('amount'),
      placeholder: tForm('amount'),
      type: 'number',
      min: '0.01',
      step: '0.01',
      inputMode: 'decimal',
      positiveNumberOnly: true,
    },
    {
      name: 'notes',
      label: tForm('notes'),
      placeholder: tForm('notes'),
      fieldType: 'textarea',
      rows: 6,
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
      label: t('create.createAndCollect'),
      loadingLabel: t('create.creatingAndCollecting'),
      type: 'submit',
      variant: 'success',
      onClick: () => {
        collectAfterCreateRef.current = true;
      },
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: () => {
        setSelectedUnit(null);
        setShowDebt(false);
      },
    },
  ];

  // ── Create submit handler ──────────────────────────────────
  const handleCreateSubmit = async (data: CreateFormData) => {
    if (!selectedUnit) return;
    setSubmitError('');

    // Invoices name their customer by id since the SAP removal.
    if (selectedUnit.customerId === null) {
      setSubmitError(t('create.customerRequired'));
      return;
    }

    const shouldCollect = collectAfterCreateRef.current;
    collectAfterCreateRef.current = false;

    const invoicePayload = {
      unit_number: selectedUnit.unitNumber,
      unit_id: selectedUnit.unitId,
      customer_id: selectedUnit.customerId,
      ...(selectedUnit.customerCode
        ? { customer_code: selectedUnit.customerCode }
        : {}),
      customer_name:
        selectedUnit.customerName === '—' ? '' : selectedUnit.customerName,
      customer_mobile: selectedUnit.mobile === '—' ? '' : selectedUnit.mobile,
      project_id: selectedUnit.projectId,
      invoice_type_id: Number(data.invoice_type_id),
      ...getContactChannelPayload(data.contact_channel_id),
      request_from_id: DEFAULT_REQUEST_FROM_ID,
      total_amount: Number(data.total_amount),
      notes: data.notes || undefined,
    };

    if (shouldCollect) {
      setInvoiceTotalAmount(invoicePayload.total_amount);
      setPendingCreateData(invoicePayload);
      setPaymentModalOpen(true);
      return;
    }

    try {
      await createInvoice(invoicePayload);
      showSuccess('createSuccess');
      router.push('/invoices/search');
    } catch (err) {
      showError(err);
    }
  };

  // ── Collect handler ────────────────────────────────────────
  const handleCollect = async (entries: PaymentEntry[]) => {
    if (!pendingCreateData) {
      setPaymentModalOpen(false);
      return;
    }

    setIsCollecting(true);
    try {
      const response = await createInvoice(pendingCreateData);
      const invoiceNumber = response.result?.invoice_number;

      if (!invoiceNumber) {
        throw new Error('Invoice number is missing for collection');
      }

      await payInvoice({
        invoice_number: invoiceNumber,
        project_id: pendingCreateData.project_id,
        unit_id: pendingCreateData.unit_id,
        transactions: entries.map((e) => ({
          total_amount: parseFloat(e.total_amount),
          payment_type_id: parseInt(e.payment_type_id, 10),
          ...(e.reference_number
            ? { reference_number: e.reference_number }
            : {}),
          ...(e.visa_number ? { visa_number: e.visa_number } : {}),
          ...(e.batch_number ? { batch_number: e.batch_number } : {}),
          ...(e.bank_name ? { bank_name: e.bank_name } : {}),
          ...(e.cheque_due_date ? { cheque_due_date: e.cheque_due_date } : {}),
          ...(e.sister_company_id
            ? { sister_company_id: parseInt(e.sister_company_id, 10) }
            : {}),
          ...(e.mobile_number ? { mobile_number: e.mobile_number } : {}),
          transaction_at: new Date().toISOString(),
        })),
      });
      setPendingCreateData(null);
      setPaymentModalOpen(false);
      showSuccess('collectSuccess');
      router.push('/invoices/search');
    } catch (err) {
      showError(err);
    } finally {
      setIsCollecting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Unit search form ──────────────────────────────────── */}
      <Form
        title={`${t('title')} - ${tForm('add')}`}
        fields={searchFields}
        buttons={searchButtons}
        initialValues={{ unit_number: '', is_exact: '1' }}
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
            rowKey={(row) => `${row.unitId}-${row.customerCode}`}
            loading={isLoading}
            emptyState={t('create.noUnitsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="invoices-create-unit-columns"
            showColumnToggle
            onRowClick={(row) => setSelectedUnit(row)}
          />
        </MainBox>
      )}

      {/* ── Invoice creation form ─────────────────────────────── */}
      {selectedUnit && (
        <>
          <div className="flex justify-end">
            <Button
              variant={showDebt ? 'primary' : 'secondary'}
              onClick={() => setShowDebt((value) => !value)}
            >
              <EgpSign size={16} />
              {t('create.showDebt')}
            </Button>
          </div>

          {showDebt && (
            <UnitDebtDisplay
              debitAmount={selectedUnit.debitAmount}
              debtUpdatedAt={selectedUnit.debtUpdatedAt}
              labels={{
                title: t('create.debt'),
                noDebt: t('create.noDebt'),
                debitAmount: t('create.debitAmount'),
                updatedAt: t('create.debtUpdatedAt'),
              }}
            />
          )}

          <Form
            title={t('create.title')}
            fields={createFields}
            buttons={createButtons}
            initialValues={{
              unit_number: selectedUnit.unitNumber,
              customer_name: selectedUnit.customerName,
              invoice_type_id: '',
              contact_channel_id: '',
              total_amount: '',
              notes: '',
            }}
            validationSchema={createInvoiceSchema}
            onSubmit={handleCreateSubmit}
          >
            {submitError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
          </Form>
        </>
      )}

      <PaymentMethodsModal
        open={paymentModalOpen}
        totalAmount={invoiceTotalAmount}
        paymentTypes={dropdowns?.payment_types ?? []}
        sisterCompanies={dropdowns?.sister_companies ?? []}
        onCollect={handleCollect}
        onCancel={() => {
          setPaymentModalOpen(false);
          setPendingCreateData(null);
        }}
        isCollecting={isCollecting}
      />
    </div>
  );
}
