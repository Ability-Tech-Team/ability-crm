'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import AccessDenied from '@/src/components/AccessDenied';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  getSettlementInvoices,
  changeInvoiceItemRefundStatus,
  INVOICE_STATUS,
  type Invoice,
  type SettlementItem,
  type ChangeInvoiceItemRefundStatusPayload,
} from '@/src/services/invoices';
import { getRefundItemActions } from './utils';

const LIMIT = 10;

const searchSchema = z.object({
  invoice_number: z.string().optional(),
  invoice_number_item: z.string().optional(),
  invoice_status_id: z.string().optional(),
  erp_reference_id: z.string().optional(),
  erp_refund_reference_id: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

// ── Flattened row: a settlement item + its parent invoice ────
interface RefundRow extends SettlementItem {
  rowKey: string;
  parent_invoice: Invoice;
}

// ── Refund action config ─────────────────────────────────────
type RefundActionKind =
  | 'refund'
  | 'refundRequest'
  | 'rejectRefund'
  | 'acceptRefund';

type RefundReasonField =
  | 'refund_reason'
  | 'refund_request_reason'
  | 'reject_reason';

interface RefundActionConfig {
  /** Target status id, or 'current' to keep the item's current refund status. */
  status: number | 'current';
  isReject?: number;
  reasonField?: RefundReasonField;
  requiresReason: boolean;
  titleKey: string;
  messageKey: string;
  placeholderKey?: string;
  confirmKey: string;
  successKey: string;
  variant: 'primary' | 'secondary' | 'danger' | 'success';
}

const REFUND_ACTION_CONFIG: Record<RefundActionKind, RefundActionConfig> = {
  refund: {
    status: INVOICE_STATUS.REFUNDED,
    reasonField: 'refund_reason',
    requiresReason: true,
    titleKey: 'refund',
    messageKey: 'refundConfirmMessage',
    placeholderKey: 'refundReasonPlaceholder',
    confirmKey: 'refund',
    successKey: 'refundSuccess',
    variant: 'danger',
  },
  refundRequest: {
    status: INVOICE_STATUS.REFUND_REQUESTED,
    reasonField: 'refund_request_reason',
    requiresReason: true,
    titleKey: 'refundRequest',
    messageKey: 'refundRequestConfirmMessage',
    placeholderKey: 'refundRequestReasonPlaceholder',
    confirmKey: 'refundRequest',
    successKey: 'refundRequestSuccess',
    variant: 'primary',
  },
  rejectRefund: {
    status: 'current',
    isReject: 1,
    reasonField: 'reject_reason',
    requiresReason: true,
    titleKey: 'rejectRefundRequest',
    messageKey: 'rejectRefundConfirmMessage',
    placeholderKey: 'rejectRefundReasonPlaceholder',
    confirmKey: 'rejectRefundRequest',
    successKey: 'rejectRefundSuccess',
    variant: 'danger',
  },
  acceptRefund: {
    status: 'current',
    isReject: 0,
    requiresReason: false,
    titleKey: 'acceptRefundRequest',
    messageKey: 'acceptRefundConfirmMessage',
    confirmKey: 'acceptRefundRequest',
    successKey: 'acceptRefundSuccess',
    variant: 'success',
  },
};

function flattenInvoices(invoices: Invoice[]): RefundRow[] {
  const rows: RefundRow[] = [];
  for (const invoice of invoices) {
    for (const item of invoice.settlement ?? []) {
      rows.push({
        ...item,
        rowKey: item.id,
        parent_invoice: invoice,
      });
    }
  }
  return rows;
}

export default function InvoicesRefundPage() {
  const t = useTranslations('invoices');
  const tRefund = useTranslations('invoices.refund');
  const tDetail = useTranslations('invoices.detail');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/invoices/refund');
  const canRefund = privileges.hasPrivilege(PRIVILEGE_IDS.REFUND);
  const canRequestRefund = privileges.hasPrivilege(PRIVILEGE_IDS.REFUND_REQUEST);
  const canAcceptRefundRequest = privileges.hasPrivilege(
    PRIVILEGE_IDS.ACCEPT_REFUND_REQUEST,
  );
  const canRejectRefundRequest = privileges.hasPrivilege(
    PRIVILEGE_IDS.REJECT_REFUND_REQUEST,
  );
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const canManageActions =
    canEdit &&
    (canRefund ||
      canRequestRefund ||
      canAcceptRefundRequest ||
      canRejectRefundRequest);

  // ── Search & data state ──────────────────────────────────────
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Action modal state ───────────────────────────────────────
  const [actionKind, setActionKind] = useState<RefundActionKind | null>(null);
  const [actionTarget, setActionTarget] = useState<RefundRow | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const statusOptions = useMemo(
    () =>
      (dropdowns?.invoice_statuses ?? []).map((s) => ({
        value: String(s.id),
        label: s.name,
      })),
    [dropdowns],
  );

  // ── Fetch ────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getSettlementInvoices(
          {
            invoice_number: params.invoice_number || undefined,
            invoice_number_item: params.invoice_number_item || undefined,
            invoice_status_id: params.invoice_status_id
              ? Number(params.invoice_status_id)
              : undefined,
            erp_reference_id: params.erp_reference_id || undefined,
            erp_refund_reference_id:
              params.erp_refund_reference_id || undefined,
            from_date: params.from_date || undefined,
            to_date: params.to_date || undefined,
            page,
            limit,
          },
          controller.signal,
        );
        setRows(flattenInvoices(data.invoices));
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
    await fetchData(data, 1, pageSize);
  };

  const handleReset = () => {
    setRows([]);
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
    await fetchData(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchData(searchParams, 1, size);
  };

  // ── Actions ──────────────────────────────────────────────────
  const openAction = (kind: RefundActionKind, row: RefundRow) => {
    setActionKind(kind);
    setActionTarget(row);
    setActionReason('');
  };

  const closeAction = () => {
    if (isSubmittingAction) return;
    setActionKind(null);
    setActionTarget(null);
    setActionReason('');
  };

  const handleActionSubmit = async () => {
    if (!actionKind || !actionTarget) return;
    const config = REFUND_ACTION_CONFIG[actionKind];
    const trimmedReason = actionReason.trim();

    if (config.requiresReason && !trimmedReason) {
      showError(new Error(tDetail('voidReasonRequired')));
      return;
    }

    setIsSubmittingAction(true);
    try {
      const payload: ChangeInvoiceItemRefundStatusPayload = {
        status_id:
          config.status === 'current'
            ? (actionTarget.refund_status_id ?? INVOICE_STATUS.REFUND_REQUESTED)
            : config.status,
      };
      if (config.isReject !== undefined) {
        payload.is_reject = config.isReject;
      }
      if (config.reasonField && trimmedReason) {
        payload[config.reasonField] = trimmedReason;
      }

      await changeInvoiceItemRefundStatus(
        actionTarget.invoice_id,
        actionTarget.invoice_number_item,
        payload,
      );
      showSuccess(config.successKey);
      setActionKind(null);
      setActionTarget(null);
      setActionReason('');
      if (searchParams) {
        await fetchData(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const activeAction = actionKind ? REFUND_ACTION_CONFIG[actionKind] : null;

  // ── Form fields & buttons ────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'invoice_number',
      label: t('columns.invoiceNumber'),
      placeholder: t('columns.invoiceNumber'),
      type: 'text',
    },
    {
      name: 'invoice_number_item',
      label: tRefund('columns.invoiceNumberItem'),
      placeholder: tRefund('columns.invoiceNumberItem'),
      type: 'text',
    },
    {
      name: 'invoice_status_id',
      label: tForm('status'),
      placeholder: tForm('status'),
      fieldType: 'select',
      options: statusOptions,
    },
    {
      name: 'erp_reference_id',
      label: tRefund('columns.erpReferenceId'),
      placeholder: tRefund('columns.erpReferenceId'),
      type: 'text',
    },
    {
      name: 'erp_refund_reference_id',
      label: tRefund('columns.erpRefundReferenceId'),
      placeholder: tRefund('columns.erpRefundReferenceId'),
      type: 'text',
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
  const columns: ColumnDef<RefundRow>[] = [
    {
      id: 'invoice_number',
      label: t('columns.invoiceNumber'),
      accessorKey: 'invoice_number',
      alwaysVisible: true,
    },
    {
      id: 'invoice_number_item',
      label: tRefund('columns.invoiceNumberItem'),
      accessorKey: 'invoice_number_item',
      alwaysVisible: true,
    },
    {
      id: 'customer_name',
      label: t('columns.customer'),
      cell: (row) => row.parent_invoice.customer_name || '—',
    },
    {
      id: 'unit_number',
      label: t('columns.unit'),
      cell: (row) => row.unit_number || row.parent_invoice.unit_number || '—',
    },
    {
      id: 'total_amount',
      label: t('columns.totalAmount'),
      cell: (row) => row.total_amount || '—',
    },
    {
      id: 'payment_type_name',
      label: t('columns.paymentType'),
      cell: (row) => row.payment_type_name || '—',
    },
    {
      id: 'erp_reference_id',
      label: tRefund('columns.erpReferenceId'),
      cell: (row) => row.erp_reference_id || '—',
    },
    {
      id: 'erp_refund_reference_id',
      label: tRefund('columns.erpRefundReferenceId'),
      cell: (row) => row.erp_refund_reference_id || '—',
    },
    {
      id: 'refund_status_name',
      label: tRefund('columns.refundStatus'),
      cell: (row) => row.refund_status_name || '—',
    },
    {
      id: 'refund_requested_by_name',
      label: tRefund('columns.refundRequestedBy'),
      cell: (row) => row.refund_requested_by_name || '—',
    },
    {
      id: 'refunded_by_name',
      label: tRefund('columns.refundedBy'),
      cell: (row) => row.refunded_by_name || '—',
    },
    {
      id: 'refund_request_reason',
      label: tDetail('refundRequestReason'),
      cell: (row) => (
        <span className="block max-w-xs whitespace-pre-wrap wrap-break-word">
          {row.refund_request_reason || '—'}
        </span>
      ),
    },
    {
      id: 'refund_reason',
      label: tDetail('refundReason'),
      cell: (row) => (
        <span className="block max-w-xs whitespace-pre-wrap wrap-break-word">
          {row.refund_reason || '—'}
        </span>
      ),
    },
    ...(canManageActions
      ? [
          {
            id: 'actions',
            label: tForm('actions'),
            alwaysVisible: true,
            disableRowLink: true,
            cell: (row: RefundRow) => {
              const actions = getRefundItemActions(row.refund_status_id, {
                refund: canRefund,
                requestRefund: canRequestRefund,
                acceptRefundRequest: canAcceptRefundRequest,
                rejectRefundRequest: canRejectRefundRequest,
              });

              if (
                !actions.refund &&
                !actions.requestRefund &&
                !actions.acceptRefundRequest &&
                !actions.rejectRefundRequest
              ) {
                return <span className="text-slate-300">—</span>;
              }

              return (
                <div className="flex flex-wrap items-center gap-2">
                  {actions.requestRefund && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openAction('refundRequest', row)}
                    >
                      {tDetail('refundRequest')}
                    </Button>
                  )}
                  {actions.refund && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => openAction('refund', row)}
                    >
                      {tDetail('refund')}
                    </Button>
                  )}
                  {actions.acceptRefundRequest && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => openAction('acceptRefund', row)}
                    >
                      {tDetail('acceptRefundRequest')}
                    </Button>
                  )}
                  {actions.rejectRefundRequest && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAction('rejectRefund', row)}
                    >
                      {tDetail('rejectRefundRequest')}
                    </Button>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
  ];

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${tRefund('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          invoice_number: '',
          invoice_number_item: '',
          invoice_status_id: '',
          erp_reference_id: '',
          erp_refund_reference_id: '',
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
          <DataTable<RefundRow>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={rows}
            rowKey={(row) => row.rowKey}
            loading={isLoading}
            emptyState={t('noInvoicesFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="invoices-refund-columns"
            showColumnToggle
          />
        </MainBox>
      )}

      {/* Refund Action Modal */}
      {actionKind && activeAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAction();
          }}
        >
          <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={closeAction}
              disabled={isSubmittingAction}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <XCircle size={18} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {tDetail(activeAction.titleKey)}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {tDetail(activeAction.messageKey)}
            </p>
            {activeAction.requiresReason && (
              <textarea
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 mb-4 resize-none"
                rows={3}
                placeholder={
                  activeAction.placeholderKey
                    ? tDetail(activeAction.placeholderKey)
                    : undefined
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                disabled={isSubmittingAction}
              />
            )}
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={closeAction}
                disabled={isSubmittingAction}
              >
                {tForm('cancel')}
              </Button>
              <Button
                variant={activeAction.variant}
                size="md"
                isLoading={isSubmittingAction}
                disabled={activeAction.requiresReason && !actionReason.trim()}
                onClick={handleActionSubmit}
              >
                {tDetail(activeAction.confirmKey)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
