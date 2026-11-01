'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Building2,
  MapPin,
  FileText,
  Users,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Download,
  Eye,
  EyeOff,
  History,
  Home,
  Lock,
  Printer,
  Receipt,
  TicketCheck,
  TicketPlus,
  Upload,
  XCircle,
} from 'lucide-react';
import InvoicePrintReceipt from '@/src/components/InvoicePrintReceipt';
import MediaUploadModal from '@/src/components/MediaUploadModal';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import FilePreviewDialog from '@/src/components/ui/FilePreviewDialog';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import {
  type Unit,
  type CustomerUnit,
  updateUnit,
  getOwnershipHistory,
  type OwnershipHistory,
  getUnitById,
  getUnits,
  getUnitDebitAmount,
  getPrimaryCustomer,
} from '@/src/services/units';
import { type Customer as CustomerDetailModel } from '@/src/services/customers';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getInvoices, type Invoice } from '@/src/services/invoices';
import { getTickets, type Ticket } from '@/src/services/tickets';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { useSelectedCustomerStore } from '@/src/store/useSelectedCustomerStore';
import SectionHeader from '@/src/components/SectionHeader';
import UnitDebtDisplay from '@/src/components/UnitDebtDisplay';
import EgpSign from '@/src/components/EgpSign';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import type {
  DropdownOption,
  LocationDropdownOption,
} from '@/src/types/dropdowns';
import type { SelectOption } from '@/src/components/ui/Select';
import { getUnitMedia, type MediaItem } from '@/src/services/documentLibrary';
import { downloadFile } from '@/src/lib/downloadFile';
import OwnershipModals from './components/OwnershipModals';
import { useOwnershipActions } from './hooks/useOwnershipActions';
import {
  ownershipTargetFromCustomerUnit,
  ownershipTargetFromHistory,
} from './utils';

// ── Invoice status helpers ────────────────────────────────────
function normalizeStatus(statusName: string): string {
  return statusName.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isPendingStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return normalized.includes('pending') || normalized.includes('معلق');
}

function isVoidRequestedStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('void requested') ||
    normalized.includes('void request') ||
    normalized.includes('request void') ||
    normalized.includes('requested for void') ||
    normalized.includes('طلب إلغاء') ||
    normalized.includes('طلب الغاء')
  );
}

function isCollectedStatus(
  invoiceStatusId: number,
  invoiceStatusName: string,
  statuses?: DropdownOption[],
): boolean {
  const candidateNames: string[] = [];
  const matchedStatus = statuses?.find((s) => s.id === invoiceStatusId);
  if (matchedStatus) {
    if (matchedStatus.en_name) candidateNames.push(matchedStatus.en_name);
    if (matchedStatus.ar_name) candidateNames.push(matchedStatus.ar_name);
    if (matchedStatus.name) candidateNames.push(matchedStatus.name);
  }
  candidateNames.push(invoiceStatusName);
  return candidateNames.some((name) => {
    const n = normalizeStatus(name);
    return (
      n.includes('collected') ||
      n.includes('paid') ||
      n.includes('مدفوع') ||
      n.includes('محصل')
    );
  });
}

function isVoidedStatus(statusName: string): boolean {
  if (isVoidRequestedStatus(statusName)) return false;
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('cancel') ||
    normalized.includes('void') ||
    normalized.includes('ملغي')
  );
}

function getStatusBg(
  invoiceStatusId: number,
  invoiceStatusName: string,
  statuses?: DropdownOption[],
): string {
  const candidateNames: string[] = [];
  const matchedStatus = statuses?.find((s) => s.id === invoiceStatusId);
  if (matchedStatus) {
    if (matchedStatus.en_name) candidateNames.push(matchedStatus.en_name);
    if (matchedStatus.ar_name) candidateNames.push(matchedStatus.ar_name);
    if (matchedStatus.name) candidateNames.push(matchedStatus.name);
  }
  candidateNames.push(invoiceStatusName);

  const hasName = (check: (n: string) => boolean) =>
    candidateNames.some((name) => check(name));

  if (
    hasName((n) => {
      const norm = normalizeStatus(n);
      return (
        norm.includes('paid') ||
        norm.includes('collected') ||
        norm.includes('مدفوع') ||
        norm.includes('محصل')
      );
    })
  )
    return 'bg-emerald-50 text-emerald-700';
  if (hasName((n) => isPendingStatus(n))) return 'bg-amber-50 text-amber-700';
  if (hasName((n) => isVoidRequestedStatus(n)))
    return 'bg-orange-50 text-orange-700';
  if (hasName((n) => isVoidedStatus(n))) return 'bg-red-50 text-red-700';
  if (
    hasName((n) => {
      const norm = normalizeStatus(n);
      return norm.includes('confirmed') || norm.includes('مؤكد');
    })
  )
    return 'bg-blue-50 text-blue-700';
  return 'bg-slate-50 text-slate-700';
}

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

function flattenLocationTree(
  nodes: LocationDropdownOption[],
  prefix = '',
): SelectOption[] {
  const result: SelectOption[] = [];
  for (const node of nodes) {
    const label = prefix ? `${prefix} > ${node.name}` : node.name;
    result.push({ value: String(node.id), label });
    if (node.children?.length) {
      result.push(...flattenLocationTree(node.children, label));
    }
  }
  return result;
}

// ── Main page ────────────────────────────────────────────────
export default function UnitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('units.detail');
  const tUnits = useTranslations('units');
  const tInvoices = useTranslations('invoices');
  const tTickets = useTranslations('tickets');
  const tForm = useTranslations('form');
  const tUpload = useTranslations('upload');
  const tDocLib = useTranslations('documentLibrary');
  const unitsPrivileges = useRoutePrivileges('/units/search');
  const canEditUnits = unitsPrivileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const ticketsSearchPrivileges = useRoutePrivileges('/tickets/search');
  const canReadTickets = ticketsSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const invoicesSearchPrivileges = useRoutePrivileges('/invoices/search');
  const canReadInvoices = invoicesSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const ticketAddPrivileges = useRoutePrivileges('/tickets/add');
  const canCreateTicket = ticketAddPrivileges.hasPrivilege(PRIVILEGE_IDS.ADD);
  const customerPrivileges = useRoutePrivileges('/customers/search');
  const canReadCustomers = customerPrivileges.hasAnyPrivilege([
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

  const unitIdentifierRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const unitIdentifier = Number(unitIdentifierRaw);
  const setSelectedCustomer = useSelectedCustomerStore((s) => s.setCustomer);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Block/unblock state
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const { success: showSuccess, error: showError } = useResponseMessage();

  // Eligible for rent state
  const [showRentConfirm, setShowRentConfirm] = useState(false);
  const [rentLoading, setRentLoading] = useState(false);

  // Assign location state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSaving, setLocationSaving] = useState(false);
  const { data: dropdowns } = useDropdowns();

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesTotalCount, setInvoicesTotalCount] = useState(0);
  const [invoicesCurrentPage, setInvoicesCurrentPage] = useState(1);
  const [invoicesPageSize, setInvoicesPageSize] = useState(10);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);
  const invoicesAbortRef = useRef<AbortController | null>(null);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsTotalCount, setTicketsTotalCount] = useState(0);
  const [ticketsCurrentPage, setTicketsCurrentPage] = useState(1);
  const [ticketsPageSize, setTicketsPageSize] = useState(10);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showTickets, setShowTickets] = useState(false);
  const ticketsAbortRef = useRef<AbortController | null>(null);

  // History state
  const [history, setHistory] = useState<OwnershipHistory[]>([]);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const historyAbortRef = useRef<AbortController | null>(null);

  // Ownership type filter state
  const [customersOwnershipFilter, setCustomersOwnershipFilter] = useState<
    number | null
  >(null);
  const [historyOwnershipFilter, setHistoryOwnershipFilter] = useState<
    number | null
  >(null);

  // Filtered customer units state (null = no filter applied, use unit.customer_units)
  const [filteredCustomerUnits, setFilteredCustomerUnits] = useState<
    CustomerUnit[] | null
  >(null);
  const [customerUnitsLoading, setCustomerUnitsLoading] = useState(false);
  const customerUnitsAbortRef = useRef<AbortController | null>(null);

  // Debt
  // The debt comes with the unit (uploaded by the client); no live lookup.
  const [showDebt, setShowDebt] = useState(false);
  const uploadCustomer = getPrimaryCustomer(unit);

  // Print invoice state
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  // Unsettled invoices state
  const [unsettledInvoices, setUnsettledInvoices] = useState<Invoice[]>([]);
  const [unsettledTotalCount, setUnsettledTotalCount] = useState(0);
  const [unsettledCurrentPage, setUnsettledCurrentPage] = useState(1);
  const [unsettledPageSize, setUnsettledPageSize] = useState(3);
  const [unsettledLoading, setUnsettledLoading] = useState(false);
  const [showUnsettled, setShowUnsettled] = useState(false);
  const unsettledAbortRef = useRef<AbortController | null>(null);

  // Documents state
  const [showDocuments, setShowDocuments] = useState(false);
  const [documents, setDocuments] = useState<MediaItem[]>([]);
  const [documentsTotalCount, setDocumentsTotalCount] = useState(0);
  const [documentsCurrentPage, setDocumentsCurrentPage] = useState(1);
  const [documentsPageSize, setDocumentsPageSize] = useState(10);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const documentsAbortRef = useRef<AbortController | null>(null);

  const loadUnit = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isFinite(unitIdentifier) || unitIdentifier <= 0) {
        setUnit(null);
        setError(t('notFound'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const data = await getUnitById(unitIdentifier, signal);

        if (signal?.aborted) return;

        if (!data) {
          setUnit(null);
          setError(t('notFound'));
        } else {
          setUnit(data);
        }
      } catch (err: unknown) {
        if (
          !signal?.aborted &&
          (err as { name?: string }).name !== 'CanceledError'
        ) {
          setUnit(null);
          setError(t('notFoundMessage'));
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [unitIdentifier, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void loadUnit(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadUnit]);

  // ── Fetch invoices ────────────────────────────────────────
  const fetchInvoices = useCallback(
    async (page: number, limit: number) => {
      if (!unit) return;
      invoicesAbortRef.current?.abort();
      const controller = new AbortController();
      invoicesAbortRef.current = controller;

      setInvoicesLoading(true);
      try {
        const data = await getInvoices(
          {
            unit_id: unit.unit_id ?? unit.id,
            unit_number: unit.unit_number,
            page,
            limit,
          },
          controller.signal,
        );
        setInvoices(data.invoices);
        setInvoicesTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setInvoices([]);
          setInvoicesTotalCount(0);
        }
      } finally {
        if (invoicesAbortRef.current === controller) {
          setInvoicesLoading(false);
        }
      }
    },
    [unit],
  );

  // ── Fetch unsettled invoices ──────────────────────────────
  const fetchUnsettledInvoices = useCallback(
    async (page: number, limit: number) => {
      if (!unit) return;
      unsettledAbortRef.current?.abort();
      const controller = new AbortController();
      unsettledAbortRef.current = controller;

      setUnsettledLoading(true);
      try {
        const data = await getInvoices(
          {
            unit_id: unit.unit_id ?? unit.id,
            unit_number: unit.unit_number,
            page,
            limit,
            is_settled: 0,
          },
          controller.signal,
        );
        setUnsettledInvoices(data.invoices);
        setUnsettledTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setUnsettledInvoices([]);
          setUnsettledTotalCount(0);
        }
      } finally {
        if (unsettledAbortRef.current === controller) {
          setUnsettledLoading(false);
        }
      }
    },
    [unit],
  );

  // ── Fetch tickets ─────────────────────────────────────────
  const fetchTickets = useCallback(
    async (page: number, limit: number) => {
      if (!unit) return;
      ticketsAbortRef.current?.abort();
      const controller = new AbortController();
      ticketsAbortRef.current = controller;

      setTicketsLoading(true);
      try {
        const data = await getTickets(
          {
            unit_id: unit.unit_id ?? unit.id,
            unit_number: unit.unit_number,
            page,
            limit,
          },
          controller.signal,
        );
        setTickets(data.tickets);
        setTicketsTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setTickets([]);
          setTicketsTotalCount(0);
        }
      } finally {
        if (ticketsAbortRef.current === controller) {
          setTicketsLoading(false);
        }
      }
    },
    [unit],
  );

  // ── Fetch ownership history ───────────────────────────────
  const fetchHistory = useCallback(
    async (
      page: number,
      limit: number,
      ownershipIdOverride?: number | null,
    ) => {
      if (!unit) return;
      historyAbortRef.current?.abort();
      const controller = new AbortController();
      historyAbortRef.current = controller;

      setHistoryLoading(true);
      try {
        const effectiveOwnershipId =
          ownershipIdOverride !== undefined
            ? ownershipIdOverride
            : historyOwnershipFilter;
        const data = await getOwnershipHistory(
          unit.id,
          {
            unit_id: unit.unit_id ?? unit.id,
            page,
            limit,
            ...(effectiveOwnershipId !== null
              ? { ownership_id: effectiveOwnershipId }
              : {}),
          },
          controller.signal,
        );
        setHistory(data.ownershipHistory);
        setHistoryTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setHistory([]);
          setHistoryTotalCount(0);
        }
      } finally {
        if (historyAbortRef.current === controller) {
          setHistoryLoading(false);
        }
      }
    },
    [unit, historyOwnershipFilter],
  );

  // ── Ownership actions (end / edit; replace SAP's contract updates) ─
  const ownership = useOwnershipActions({
    unitId: unit ? (unit.unit_id ?? unit.id) : null,
    onChanged: async () => {
      await loadUnit();
      if (showHistory) {
        setHistoryCurrentPage(1);
        await fetchHistory(1, historyPageSize);
      }
    },
  });

  const handleInvoicesPageChange = async (page: number) => {
    if (page === invoicesCurrentPage) return;
    setInvoicesCurrentPage(page);
    await fetchInvoices(page, invoicesPageSize);
  };

  const handleInvoicesPageSizeChange = async (size: number) => {
    setInvoicesPageSize(size);
    setInvoicesCurrentPage(1);
    await fetchInvoices(1, size);
  };

  const handleTicketsPageChange = async (page: number) => {
    if (page === ticketsCurrentPage) return;
    setTicketsCurrentPage(page);
    await fetchTickets(page, ticketsPageSize);
  };

  const handleTicketsPageSizeChange = async (size: number) => {
    setTicketsPageSize(size);
    setTicketsCurrentPage(1);
    await fetchTickets(1, size);
  };

  const handleShowInvoices = () => {
    if (!showInvoices) {
      setShowInvoices(true);
      setInvoicesCurrentPage(1);
      fetchInvoices(1, invoicesPageSize);
    } else {
      setShowInvoices(false);
    }
  };

  const handleShowTickets = () => {
    if (!showTickets) {
      setShowTickets(true);
      setTicketsCurrentPage(1);
      fetchTickets(1, ticketsPageSize);
    } else {
      setShowTickets(false);
    }
  };

  const handleUnsettledPageChange = async (page: number) => {
    if (page === unsettledCurrentPage) return;
    setUnsettledCurrentPage(page);
    await fetchUnsettledInvoices(page, unsettledPageSize);
  };

  const handleUnsettledPageSizeChange = async (size: number) => {
    setUnsettledPageSize(size);
    setUnsettledCurrentPage(1);
    await fetchUnsettledInvoices(1, size);
  };

  const handleShowDebtWithUnsettled = () => {
    const wasOpen = showDebt;
    setShowDebt(!wasOpen);
    if (!wasOpen && canReadInvoices) {
      setShowUnsettled(true);
      setUnsettledCurrentPage(1);
      fetchUnsettledInvoices(1, unsettledPageSize);
    } else if (wasOpen) {
      setShowUnsettled(false);
    }
  };

  const handleHistoryPageChange = async (page: number) => {
    if (page === historyCurrentPage) return;
    setHistoryCurrentPage(page);
    await fetchHistory(page, historyPageSize);
  };

  const handleHistoryPageSizeChange = async (size: number) => {
    setHistoryPageSize(size);
    setHistoryCurrentPage(1);
    await fetchHistory(1, size);
  };

  const handleShowHistory = () => {
    if (!showHistory) {
      setShowHistory(true);
      setHistoryCurrentPage(1);
      fetchHistory(1, historyPageSize);
    } else {
      setShowHistory(false);
    }
  };

  const handleCustomersOwnershipFilterChange = async (ownershipId: number) => {
    const newFilter =
      customersOwnershipFilter === ownershipId ? null : ownershipId;
    setCustomersOwnershipFilter(newFilter);

    if (newFilter === null) {
      setFilteredCustomerUnits(null);
      return;
    }

    if (!unit) return;

    customerUnitsAbortRef.current?.abort();
    const controller = new AbortController();
    customerUnitsAbortRef.current = controller;

    setCustomerUnitsLoading(true);
    try {
      const data = await getUnits(
        {
          unit_id: unit.unit_id ?? unit.id,
          unit_number: unit.unit_number,
          ownership_id: newFilter,
          limit: 100,
        },
        controller.signal,
      );
      const matchedUnit = data.units.find(
        (u) => u.unit_number === unit.unit_number,
      );
      setFilteredCustomerUnits(matchedUnit?.customer_units ?? []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'CanceledError') {
        setFilteredCustomerUnits([]);
      }
    } finally {
      if (customerUnitsAbortRef.current === controller) {
        setCustomerUnitsLoading(false);
      }
    }
  };

  const handleHistoryOwnershipFilterChange = (ownershipId: number) => {
    const newFilter =
      historyOwnershipFilter === ownershipId ? null : ownershipId;
    setHistoryOwnershipFilter(newFilter);
    if (showHistory) {
      setHistoryCurrentPage(1);
      fetchHistory(1, historyPageSize, newFilter);
    }
  };

  // ── Fetch documents ───────────────────────────────────────
  const fetchDocuments = useCallback(
    async (page: number, limit: number) => {
      if (!unit) return;
      documentsAbortRef.current?.abort();
      const controller = new AbortController();
      documentsAbortRef.current = controller;

      setDocumentsLoading(true);
      try {
        const data = await getUnitMedia(
          {
            unit_id: unit.unit_id ?? unit.id,
            unit_number: unit.unit_number,
            page,
            limit,
          },
          controller.signal,
        );
        setDocuments(data.media);
        setDocumentsTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setDocuments([]);
          setDocumentsTotalCount(0);
        }
      } finally {
        if (documentsAbortRef.current === controller) {
          setDocumentsLoading(false);
        }
      }
    },
    [unit],
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
    () => ({
      unit_id: unit?.unit_id ?? unit?.id,
      unit_number: unit?.unit_number ?? undefined,
    }),
    [unit],
  );

  const handleDownload = useCallback((item: MediaItem) => {
    downloadFile(item.file_path, item.file_name);
  }, []);

  const handlePrint = useCallback((invoice: Invoice) => {
    setPrintInvoice(invoice);
    setTimeout(() => {
      window.print();
      setPrintInvoice(null);
    }, 100);
  }, []);

  const handleCreateTicket = () => {
    if (!unit) return;
    if (!canCreateTicket) return;

    if (unit.is_locked === 1) {
      showError(null, 'unitIsBlocked');
      return;
    }

    const customerIndex = unit.customer_units.length > 0 ? 0 : -1;
    const customerId =
      customerIndex >= 0 ? unit.customer_units[customerIndex].customer_id : 0;

    sessionStorage.setItem(
      'ticket-create-unit',
      JSON.stringify({
        unit,
        customerIndex,
      }),
    );

    router.push(
      `/tickets/add/create?unitId=${unit.unit_id ?? unit.id}&customerId=${customerId}`,
    );
  };

  const blockReasonOptions = useMemo(
    () => [
      { value: 'finance', label: 'finance' },
      { value: 'legal', label: 'legal' },
    ],
    [],
  );

  const blockModalFields = useMemo(
    () => [
      {
        name: 'reason',
        label: t('blockReason'),
        type: 'select' as const,
        options: blockReasonOptions,
        searchable: false,
        required: true,
      },
    ],
    [blockReasonOptions, t],
  );

  const handleToggleBlock = async (values?: Record<string, string>) => {
    if (!unit) return;
    const isUnblocking = unit.is_locked === 1;
    const reason = values?.reason;

    if (!isUnblocking && reason !== 'finance' && reason !== 'legal') return;

    setBlockLoading(true);
    try {
      const newLocked = isUnblocking ? 0 : 1;
      const payload: Parameters<typeof updateUnit>[1] = {
        unit_id: unit.unit_id ?? unit.id,
        is_locked: newLocked,
      };

      if (!isUnblocking) {
        payload.lock_reason = reason;
      }

      await updateUnit(unit.id, payload);
      setUnit({ ...unit, is_locked: newLocked });
      showSuccess(newLocked === 1 ? 'unitBlocked' : 'unitUnblocked');
    } catch (err) {
      showError(err);
    } finally {
      setBlockLoading(false);
      setShowBlockConfirm(false);
    }
  };

  const handleToggleRent = async () => {
    if (!unit) return;
    setRentLoading(true);
    try {
      const newValue = unit.is_eligible_for_rent === 1 ? 0 : 1;
      await updateUnit(unit.id, {
        unit_id: unit.unit_id ?? unit.id,
        is_eligible_for_rent: newValue,
      });
      setUnit({ ...unit, is_eligible_for_rent: newValue });
      showSuccess(newValue === 1 ? 'rentEnabled' : 'rentDisabled');
    } catch (err) {
      showError(err);
    } finally {
      setRentLoading(false);
      setShowRentConfirm(false);
    }
  };

  // ── Flatten location tree for select options ──────────────
  const locationOptions = useMemo(
    () => flattenLocationTree(dropdowns?.locations ?? []),
    [dropdowns?.locations],
  );

  const locationModalFields = useMemo(
    () => [
      {
        name: 'location_id',
        label: t('selectLocation'),
        type: 'select' as const,
        options: locationOptions,
        required: true,
      },
    ],
    [locationOptions, t],
  );

  const filteredCustomers =
    filteredCustomerUnits !== null
      ? filteredCustomerUnits
      : (unit?.customer_units ?? []);

  const handleAssignLocation = async (values: Record<string, string>) => {
    if (!unit) return;
    const locationId = Number(values.location_id);
    if (!locationId) return;
    setLocationSaving(true);
    try {
      await updateUnit(unit.id, {
        unit_id: unit.unit_id ?? unit.id,
        unit_specifications: { location_id: locationId },
      });
      // Find selected location to update local display
      const findLocation = (
        nodes: LocationDropdownOption[],
        id: number,
      ): LocationDropdownOption | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children?.length) {
            const found = findLocation(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };
      const selectedLoc = findLocation(dropdowns?.locations ?? [], locationId);
      if (unit.unit_specifications && selectedLoc) {
        setUnit({
          ...unit,
          unit_specifications: {
            ...unit.unit_specifications,
            location_id: locationId,
            locations: [
              {
                id: selectedLoc.id,
                name: selectedLoc.name,
                parent_location_id: selectedLoc.parent_location_id,
                is_active: selectedLoc.is_active ?? 1,
                children: [],
              },
            ],
          },
        });
      }
      showSuccess('locationAssigned');
    } catch (err) {
      showError(err);
    } finally {
      setLocationSaving(false);
      setShowLocationModal(false);
    }
  };

  // ── Customer columns ──────────────────────────────────────
  const customerColumns: ColumnDef<CustomerUnit>[] = [
    {
      id: 'customer_name',
      label: t('customerName'),
      accessorKey: 'customer_name',
    },
    {
      id: 'id_type_name',
      label: t('idType'),
      cell: (row) => row.id_type_name ?? '—',
    },
    {
      id: 'id_number',
      label: t('idNumber'),
      cell: (row) => row.id_number ?? '—',
    },
    {
      id: 'mobile_number',
      label: t('mobile'),
      cell: (row) => row.mobile_number ?? '—',
    },
    {
      id: 'customer_type_name',
      label: t('customerType'),
      cell: (row) => row.customer_type_name ?? '—',
    },
    {
      id: 'ownership_type_name',
      label: t('ownership'),
      cell: (row) => row.ownership_type_name ?? '—',
    },
    {
      id: 'owner_type_name',
      label: t('ownerType'),
      cell: (row) => row.owner_type_name ?? '—',
    },
    {
      id: 'contract_number',
      label: t('contractNumber'),
      cell: (row) => row.contract_number ?? '—',
    },
    {
      id: 'sign_date',
      label: t('signDate'),
      cell: (row) => formatDate(row.sign_date),
    },
    {
      id: 'country_name',
      label: t('country'),
      cell: (row) => row.country_name ?? '—',
    },
    ...(canEditUnits
      ? [
          {
            id: 'ownership_actions',
            label: tForm('actions'),
            alwaysVisible: true,
            disableRowLink: true,
            cell: (row: CustomerUnit) => {
              const editTarget = ownershipTargetFromCustomerUnit(row);
              return (
                <div className="flex items-center gap-2">
                  {editTarget ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="whitespace-nowrap border-slate-300!"
                      onClick={(event) => {
                        event.stopPropagation();
                        ownership.setEditTarget(editTarget);
                      }}
                    >
                      {t('ownershipActions.edit')}
                    </Button>
                  ) : null}
                  <Button
                    variant="danger"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={(event) => {
                      event.stopPropagation();
                      ownership.setEndTarget(row);
                    }}
                  >
                    {t('ownershipActions.end')}
                  </Button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  // ── Invoice columns ───────────────────────────────────────
  const invoiceColumns: ColumnDef<Invoice>[] = [
    {
      id: 'print',
      label: tInvoices('columns.print'),
      cell: (row) => {
        const canPrint = isCollectedStatus(
          row.invoice_status_id,
          row.invoice_status_name,
          dropdowns?.invoice_statuses,
        );
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canPrint) handlePrint(row);
            }}
            disabled={!canPrint}
            className={`p-2 rounded-lg transition-all duration-200 ${
              canPrint
                ? 'text-gray-600 hover:bg-gray-100 hover:scale-110'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title={tInvoices('columns.print')}
          >
            <Printer size={18} />
          </button>
        );
      },
    },
    {
      id: 'is_end_of_day',
      label: tInvoices('columns.eod'),
      cell: (row) =>
        row.is_end_of_day ? (
          <CheckCircle size={20} className="text-green-600" />
        ) : (
          <XCircle size={20} className="text-gray-400" />
        ),
    },
    {
      id: 'is_full_end_of_day',
      label: tInvoices('columns.fullEod'),
      cell: (row) =>
        row.is_full_end_of_day ? (
          <CheckCircle size={20} className="text-green-600" />
        ) : (
          <XCircle size={20} className="text-gray-400" />
        ),
    },
    {
      id: 'invoice_number',
      label: tInvoices('columns.invoiceNumber'),
      accessorKey: 'invoice_number',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'ticket_id',
      label: tForm('ticketId'),
      accessorKey: 'ticket_id',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'invoice_status_name',
      label: tInvoices('columns.status'),
      cell: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBg(row.invoice_status_id, row.invoice_status_name, dropdowns?.invoice_statuses)}`}
        >
          {row.invoice_status_name || '—'}
        </span>
      ),
    },
    {
      id: 'notes',
      label: tInvoices('columns.notes'),
      cell: (row) => (
        <span className="block max-w-xs whitespace-pre-wrap wrap-break-word">
          {row.notes || '—'}
        </span>
      ),
      defaultVisible: true,
    },
    {
      id: 'invoice_type_name',
      label: tInvoices('columns.invoiceType'),
      accessorKey: 'invoice_type_name',
      sortable: true,
    },
    {
      id: 'services',
      label: tInvoices('columns.services'),
      cell: (row) => (
        <span className="block min-w-64 whitespace-normal">
          {row.services?.length
            ? row.services.map((s) => s.service_name).join(', ')
            : '—'}
        </span>
      ),
      defaultVisible: true,
    },
    {
      id: 'customer_name',
      label: tInvoices('columns.customer'),
      accessorKey: 'customer_name',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'unit_number',
      label: tInvoices('columns.unit'),
      accessorKey: 'unit_number',
      sortable: true,
    },
    {
      id: 'department_name',
      label: tInvoices('columns.department'),
      cell: (row) =>
        row.department_name ||
        (row.department_id ? String(row.department_id) : '—'),
      sortable: true,
      defaultVisible: true,
    },
    {
      id: 'collected_by',
      label: tInvoices('columns.collectedBy'),
      cell: (row) => row.collected_by || '—',
      sortable: true,
      defaultVisible: true,
    },
    {
      id: 'void_requested_by',
      label: tInvoices('columns.voidRequestedBy'),
      cell: (row) => row.void_requested_by || '—',
      sortable: true,
      defaultVisible: true,
    },
    {
      id: 'void_reason',
      label: tInvoices('columns.voidReason'),
      cell: (row) => (
        <span className="block max-w-xs whitespace-pre-wrap wrap-break-word">
          {row.void_reason || '—'}
        </span>
      ),
      defaultVisible: true,
    },
    {
      id: 'void_by',
      label: tInvoices('columns.voidBy'),
      cell: (row) => row.void_by || '—',
      sortable: true,
      defaultVisible: true,
    },
    {
      id: 'invoice_collected_by',
      label: tInvoices('columns.invoiceCollectedBy'),
      cell: (row) => row.invoice_collected_by || '—',
      sortable: true,
      defaultVisible: true,
    },
    {
      id: 'invoice_collected_date',
      label: tInvoices('columns.invoiceCollectedDate'),
      cell: (row) =>
        row.invoice_collected_date
          ? new Date(row.invoice_collected_date).toLocaleDateString()
          : '—',
      sortable: true,
      defaultVisible: true,
    },
    {
      id: 'total_amount',
      label: tInvoices('columns.totalAmount'),
      accessorKey: 'total_amount',
      sortable: true,
    },
    {
      id: 'invoice_created_by',
      label: tInvoices('columns.cashier'),
      accessorKey: 'invoice_created_by',
      sortable: true,
    },
    {
      id: 'invoice_date',
      label: tInvoices('columns.creationDate'),
      cell: (row) =>
        row.invoice_date
          ? new Date(row.invoice_date).toLocaleDateString()
          : '—',
      sortable: true,
    },
  ];

  // ── Unsettled invoice columns ─────────────────────────────
  const unsettledInvoiceColumns: ColumnDef<Invoice>[] = [
    {
      id: 'invoice_number',
      label: tInvoices('columns.invoiceNumber'),
      accessorKey: 'invoice_number',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'invoice_type_name',
      label: tInvoices('columns.invoiceType'),
      accessorKey: 'invoice_type_name',
      sortable: true,
    },
    {
      id: 'total_amount',
      label: tInvoices('columns.totalAmount'),
      accessorKey: 'total_amount',
      sortable: true,
    },
    {
      id: 'invoice_status_name',
      label: tInvoices('columns.status'),
      cell: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBg(row.invoice_status_id, row.invoice_status_name, dropdowns?.invoice_statuses)}`}
        >
          {row.invoice_status_name || '—'}
        </span>
      ),
    },
    {
      id: 'invoice_date',
      label: tInvoices('columns.creationDate'),
      cell: (row) =>
        row.invoice_date
          ? new Date(row.invoice_date).toLocaleDateString()
          : '—',
      sortable: true,
    },
  ];

  // ── Ticket columns ────────────────────────────────────────
  const ticketColumns: ColumnDef<Ticket>[] = [
    {
      id: 'ticket_id',
      label: tTickets('columns.ticketId'),
      accessorKey: 'ticket_id',
    },
    {
      id: 'status',
      label: tTickets('columns.status'),
      cell: (row) =>
        row.seen_by ? (
          <Eye size={20} className="text-green-600" />
        ) : (
          <EyeOff size={20} className="text-gray-400" />
        ),
    },
    {
      id: 'sla',
      label: tTickets('columns.sla'),
      cell: (row) =>
        row.sla_status === 1 ? (
          <AlertTriangle size={20} className="text-red-500" />
        ) : (
          <CheckCircle size={20} className="text-green-600" />
        ),
    },
    {
      id: 'agent_name',
      label: tTickets('columns.agentName'),
      accessorKey: 'agent_name',
    },
    {
      id: 'requester_name',
      label: tTickets('columns.requesterName'),
      accessorKey: 'requester_name',
    },
    {
      id: 'creation_date',
      label: tTickets('columns.creationDate'),
      cell: (row) => row.request_time?.date ?? '—',
    },
    {
      id: 'department_name',
      label: tTickets('columns.departmentName'),
      accessorKey: 'department_name',
    },
    {
      id: 'service_name',
      label: tTickets('columns.serviceName'),
      cell: (row) =>
        row.services?.length
          ? row.services.map((s) => s.service_name).join(', ')
          : '—',
    },
    {
      id: 'last_status_name',
      label: tTickets('columns.lastStatus'),
      accessorKey: 'last_status_name',
    },
    {
      id: 'customer_name',
      label: tTickets('columns.customerName'),
      accessorKey: 'customer_name',
    },
    {
      id: 'unit_number',
      label: tTickets('columns.unitNumber'),
      accessorKey: 'unit_number',
    },
    {
      id: 'notes',
      label: tTickets('columns.notes'),
      cell: (row) => row.notes ?? '—',
    },
    {
      id: 'arrival_time',
      label: tTickets('columns.arrivalTime'),
      cell: (row) => row.arrival_time ?? '—',
    },
    {
      id: 'actual_arrival_time',
      label: tTickets('columns.actualArrivalTime'),
      cell: (row) => row.actual_arrival_time ?? '—',
    },
    {
      id: 'duration',
      label: tTickets('columns.duration'),
      cell: (row) => row.duration ?? '—',
    },
    {
      id: 'seen_by',
      label: tTickets('columns.seenBy'),
      cell: (row) => row.seen_by ?? '—',
    },
  ];

  // ── Document columns ──────────────────────────────────────
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

  // ── History columns ───────────────────────────────────────
  const historyColumns: ColumnDef<OwnershipHistory>[] = [
    {
      id: 'customer_name',
      label: t('historyCustomerName'),
      accessorKey: 'customer_name',
    },
    {
      id: 'customer_code',
      label: t('historyCustomerCode'),
      accessorKey: 'customer_code',
    },
    {
      id: 'id_number',
      label: t('historyIdNumber'),
      cell: (row) => row.id_number ?? '—',
    },
    {
      id: 'ownership_type_name',
      label: t('historyOwnership'),
      accessorKey: 'ownership_type_name',
    },
    {
      id: 'contract',
      label: t('historyContract'),
      cell: (row) => row.contract ?? '—',
    },
    {
      id: 'sign_date',
      label: t('historySignDate'),
      cell: (row) => formatDate(row.sign_date),
    },
    {
      id: 'end_date',
      label: t('historyEndDate'),
      cell: (row) => formatDate(row.end_date),
    },
    {
      id: 'is_active',
      label: t('historyStatus'),
      cell: (row) =>
        row.is_active === 1 ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
            {t('historyActive')}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
            {t('historyInactive')}
          </span>
        ),
    },
    ...(canEditUnits
      ? [
          {
            id: 'history_actions',
            label: tForm('actions'),
            alwaysVisible: true,
            cell: (row: OwnershipHistory) => {
              const editTarget = ownershipTargetFromHistory(row);
              return editTarget ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="whitespace-nowrap border-slate-300!"
                  onClick={() => ownership.setEditTarget(editTarget)}
                >
                  {t('ownershipActions.edit')}
                </Button>
              ) : (
                '—'
              );
            },
          },
        ]
      : []),
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
  if (error || !unit) {
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

  const specs = unit.unit_specifications;

  const flattenLocations = (loc: {
    name: string;
    children?: { name: string; children?: unknown[] }[];
  }): string[] => {
    const names = [loc.name];
    for (const child of (loc.children ?? []) as (typeof loc)[]) {
      names.push(...flattenLocations(child));
    }
    return names;
  };
  const locationPath = specs?.locations?.flatMap(flattenLocations).join(' > ');

  const selectedCustomersOwnershipType = dropdowns?.ownership_types?.find(
    (ot) => ot.id === customersOwnershipFilter,
  );
  const customersTitle =
    customersOwnershipFilter !== null && selectedCustomersOwnershipType
      ? t('currentType', { type: selectedCustomersOwnershipType.name })
      : t('currentOwnersDefault');

  const selectedHistoryOwnershipType = dropdowns?.ownership_types?.find(
    (ot) => ot.id === historyOwnershipFilter,
  );
  const historyTitle =
    historyOwnershipFilter !== null && selectedHistoryOwnershipType
      ? t('pastType', { type: selectedHistoryOwnershipType.name })
      : t('pastOwnersDefault');

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
              {t('title')} #{unit.unit_number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">
                {unit.project_name}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  unit.is_active === 1
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {unit.is_active === 1 ? tUnits('yes') : tUnits('no')}
              </span>
              {unit.is_locked === 1 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                  <Lock size={12} />
                  {t('blocked')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {canCreateTicket && (
            <Button variant="primary" onClick={handleCreateTicket}>
              <TicketPlus size={16} />
              {t('createTicket')}
            </Button>
          )}
          {canReadInvoices && (
            <Button
              variant={showInvoices ? 'primary' : 'secondary'}
              onClick={handleShowInvoices}
            >
              <Receipt size={16} />
              {t('showInvoices')}
            </Button>
          )}
          {canReadTickets && (
            <Button
              variant={showTickets ? 'primary' : 'secondary'}
              onClick={handleShowTickets}
            >
              <TicketCheck size={16} />
              {t('showTickets')}
            </Button>
          )}
          <Button
            variant={showHistory ? 'primary' : 'secondary'}
            onClick={handleShowHistory}
          >
            <History size={16} />
            {t('showHistory')}
          </Button>
          <Button
            variant={showDebt ? 'primary' : 'secondary'}
            onClick={handleShowDebtWithUnsettled}
          >
            <EgpSign size={16} />
            {t('showDebt')}
          </Button>
          {canReadDocuments && (
            <Button
              variant={showDocuments ? 'primary' : 'secondary'}
              onClick={handleShowDocuments}
            >
              <FileText size={16} />
              {t('showDocuments')}
            </Button>
          )}
          {canUploadDocuments && uploadCustomer && (
            <Button
              variant="secondary"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} />
              {tUpload('uploadDocument')}
            </Button>
          )}
          {canEditUnits && (
            <Button
              variant="secondary"
              onClick={() => setShowLocationModal(true)}
            >
              <MapPin size={16} />
              {t('assignLocation')}
            </Button>
          )}
          {canEditUnits && unit && (
            <Button
              variant={unit.is_eligible_for_rent === 1 ? 'danger' : 'success'}
              onClick={() => setShowRentConfirm(true)}
            >
              <Home size={16} />
              {unit.is_eligible_for_rent === 1
                ? t('disableRent')
                : t('enableRent')}
            </Button>
          )}
          {/* {unit && (
            <Button
              variant={unit.is_locked === 1 ? 'danger' : 'secondary'}
              onClick={() => setShowBlockConfirm(true)}
            >
              {unit.is_locked === 1 ? <Unlock size={16} /> : <Lock size={16} />}
              {unit.is_locked === 1 ? t('unblockUnit') : t('blockUnit')}
            </Button>
          )} */}
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Unit info ─────────────────────────────────────── */}
        <MainBox>
          <SectionHeader icon={Building2} title={t('unitInfo')} />

          <InfoRow
            icon={Building2}
            label={t('unitNumber')}
            value={unit.unit_number}
          />
          <InfoRow
            icon={Building2}
            label={t('projectName')}
            value={unit.project_name}
          />
          <InfoRow
            icon={Building2}
            label={t('unitType')}
            value={specs?.unit_type_name}
          />
          <InfoRow
            icon={FileText}
            label={t('deliveryDate')}
            value={formatDate(unit.delivery_date)}
          />
          <InfoRow
            icon={FileText}
            label={t('contractingDate')}
            value={formatDate(unit.contracting_date)}
          />
          <InfoRow
            icon={FileText}
            label={t('isBroker')}
            value={unit.is_broker === 1 ? tUnits('yes') : tUnits('no')}
          />
          <InfoRow
            icon={FileText}
            label={t('isEligibleForRent')}
            value={
              unit.is_eligible_for_rent === 1 ? tUnits('yes') : tUnits('no')
            }
          />
          {unit.locked_by && (
            <InfoRow icon={Lock} label={t('lockedBy')} value={unit.locked_by} />
          )}
        </MainBox>

        {/* ── Specifications ────────────────────────────────── */}
        <MainBox>
          <SectionHeader icon={MapPin} title={t('specifications')} />

          <InfoRow icon={MapPin} label={t('address')} value={specs?.address} />
          <InfoRow
            icon={MapPin}
            label={t('location')}
            value={locationPath || '—'}
          />
          <InfoRow
            icon={Building2}
            label={t('totalArea')}
            value={specs?.total_area ? `${specs.total_area} m²` : null}
          />
          <InfoRow icon={Building2} label={t('floor')} value={specs?.floor} />
          <InfoRow icon={Building2} label={t('rooms')} value={specs?.room_no} />
          <InfoRow
            icon={Building2}
            label={t('bathrooms')}
            value={specs?.path_room_no}
          />
          <InfoRow
            icon={Building2}
            label={t('livingRooms')}
            value={specs?.living_room_no}
          />
          <InfoRow
            icon={Building2}
            label={t('balconies')}
            value={specs?.balcony_no}
          />
          <InfoRow
            icon={Building2}
            label={t('isFurnished')}
            value={specs?.is_furnished === 1 ? tUnits('yes') : tUnits('no')}
          />
        </MainBox>
      </div>

      {/* ── Notes ────────────────────────────────────────────── */}
      {unit.notes && (
        <MainBox>
          <div className="flex items-center gap-2 mb-2">
            <FileText size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('notes')}
            </h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {unit.notes}
          </p>
        </MainBox>
      )}

      {/* ── Customers ────────────────────────────────────────── */}
      <MainBox>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {customersTitle} ({filteredCustomers.length})
            </h2>
          </div>
          {dropdowns?.ownership_types &&
            dropdowns.ownership_types.length > 0 && (
              <div className="flex gap-1">
                {dropdowns.ownership_types.map((ot) => (
                  <button
                    key={ot.id}
                    onClick={() => handleCustomersOwnershipFilterChange(ot.id)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      customersOwnershipFilter === ot.id
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('typeLabel', { type: ot.name })}
                  </button>
                ))}
              </div>
            )}
        </div>
        <DataTable<CustomerUnit>
          columns={customerColumns}
          data={filteredCustomers}
          loading={customerUnitsLoading}
          rowKey={(row) => row.customer_id}
          emptyState={t('noCustomers')}
          itemsPerPage={10}
          persistKey="unit-detail-customers"
          showColumnToggle
          onRowClick={
            canReadCustomers
              ? (row) => {
                  const mappedCustomer: CustomerDetailModel = {
                    id: row.customer_id,
                    customer_name: row.customer_name,
                    country_id: row.country_id,
                    id_type: row.id_type_id,
                    id_number: row.id_number ?? null,
                    mobile_number: row.mobile_number,
                    telephone_number: null,
                    first_address: null,
                    second_address: null,
                    city: null,
                    marital_status_id: row.marital_status_id,
                    religion_id: row.religion_id,
                    email: null,
                    emergency_contact: null,
                    emergency_contact_relation: null,
                    emergency_contact_phone_number: null,
                    customer_type_id: row.customer_type_id,
                    notes: null,
                    is_active: 1,
                    is_deleted: 0,
                    customer_code: null,
                    birth_date: null,
                    created_by: null,
                    updated_by: null,
                    created_at: '',
                    updated_at: '',
                    customer_type_name: row.customer_type_name,
                    marital_status_name: row.marital_status_name,
                    religion_name: row.religion_name,
                    country_name: row.country_name,
                    id_type_name: row.id_type_name,
                    customer_units: [
                      {
                        start_date: row.sign_date,
                        sign_date: row.sign_date,
                        end_date: null,
                        contract_number: row.contract_number,
                        is_active: unit.is_active,
                        is_deleted: 0,
                        ownership_id: row.ownership_type_id,
                        ownership: row.ownership_type_name,
                        unit_details: {
                          project_id: unit.project_id,
                          project_name: unit.project_name,
                          id: unit.unit_id ?? unit.id,
                          unit_number: unit.unit_number,
                          unit_specification_id: unit.unit_specification_id,
                          notes: unit.notes,
                          is_active: unit.is_active,
                          is_broker: unit.is_broker,
                          delivery_date: unit.delivery_date,
                          contracting_date: unit.contracting_date,
                          created_by: null,
                          updated_by: null,
                          is_eligible_for_rent: unit.is_eligible_for_rent,
                          is_locked: unit.is_locked,
                          lock_date: null,
                          locked_by: null,
                          unlock_date: null,
                          unlocked_by: null,
                          created_at: unit.created_at,
                          updated_at: unit.updated_at,
                          unit_specifications: unit.unit_specifications
                            ? {
                                id: unit.unit_specifications.id,
                                unit_type_id:
                                  unit.unit_specifications.unit_type_id,
                                location_id:
                                  unit.unit_specifications.location_id,
                                address: unit.unit_specifications.address,
                                total_area: unit.unit_specifications.total_area,
                                floor: unit.unit_specifications.floor,
                                room_no: unit.unit_specifications.room_no,
                                path_room_no:
                                  unit.unit_specifications.path_room_no,
                                living_room_no:
                                  unit.unit_specifications.living_room_no,
                                balcony_no: unit.unit_specifications.balcony_no,
                                created_at: unit.created_at,
                                updated_at: unit.updated_at,
                                is_furnished:
                                  unit.unit_specifications.is_furnished,
                                unit_type_name:
                                  unit.unit_specifications.unit_type_name,
                              }
                            : null,
                        },
                      },
                    ],
                    customer_cars: [],
                  };

                  setSelectedCustomer(mappedCustomer);
                  router.replace(`/customers/${row.customer_id}`);
                }
              : undefined
          }
        />
      </MainBox>

      {/* ── Invoices ─────────────────────────────────────────── */}
      {showInvoices && canReadInvoices && (
        <MainBox>
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('invoices')} ({invoicesTotalCount})
            </h2>
          </div>
          <DataTable<Invoice>
            columns={invoiceColumns}
            data={invoices}
            rowKey={(row) => row.id}
            loading={invoicesLoading}
            emptyState={t('noInvoices')}
            itemsPerPage={10}
            pageSize={invoicesPageSize}
            currentPage={invoicesCurrentPage}
            totalCount={invoicesTotalCount}
            onPageChange={handleInvoicesPageChange}
            onPageSizeChange={handleInvoicesPageSizeChange}
            persistKey="unit-detail-invoices"
            showColumnToggle
            rowHref={
              canReadInvoices ? (row) => `/invoices/${row.id}` : undefined
            }
          />
        </MainBox>
      )}

      {/* ── Tickets ──────────────────────────────────────────── */}
      {showTickets && canReadTickets && (
        <MainBox>
          <div className="flex items-center gap-2 mb-4">
            <TicketCheck size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('tickets')} ({ticketsTotalCount})
            </h2>
          </div>
          <DataTable<Ticket>
            columns={ticketColumns}
            data={tickets}
            rowKey={(row) => row.ticket_id}
            loading={ticketsLoading}
            emptyState={t('noTickets')}
            itemsPerPage={10}
            pageSize={ticketsPageSize}
            currentPage={ticketsCurrentPage}
            totalCount={ticketsTotalCount}
            onPageChange={handleTicketsPageChange}
            onPageSizeChange={handleTicketsPageSizeChange}
            persistKey="unit-detail-tickets"
            showColumnToggle
            rowHref={
              canReadTickets ? (row) => `/tickets/${row.ticket_id}` : undefined
            }
          />
        </MainBox>
      )}

      {/* ── Ownership History ────────────────────────────────── */}
      {showHistory && (
        <MainBox>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <History size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {historyTitle} ({historyTotalCount})
              </h2>
            </div>
            {dropdowns?.ownership_types &&
              dropdowns.ownership_types.length > 0 && (
                <div className="flex gap-1">
                  {dropdowns.ownership_types.map((ot) => (
                    <button
                      key={ot.id}
                      onClick={() => handleHistoryOwnershipFilterChange(ot.id)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        historyOwnershipFilter === ot.id
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t('typeLabel', { type: ot.name })}
                    </button>
                  ))}
                </div>
              )}
          </div>
          <DataTable<OwnershipHistory>
            columns={historyColumns}
            data={history}
            rowKey={(row) => row.id}
            loading={historyLoading}
            emptyState={t('noHistory')}
            itemsPerPage={10}
            pageSize={historyPageSize}
            currentPage={historyCurrentPage}
            totalCount={historyTotalCount}
            onPageChange={handleHistoryPageChange}
            onPageSizeChange={handleHistoryPageSizeChange}
            persistKey="unit-detail-history"
            showColumnToggle
          />
        </MainBox>
      )}

      {/* ── Unit Debt ────────────────────────────────────────── */}
      {showDebt && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UnitDebtDisplay
            debitAmount={getUnitDebitAmount(unit)}
            debtUpdatedAt={unit?.debt_updated_at ?? null}
            labels={{
              title: t('debt'),
              noDebt: t('noDebt'),
              debitAmount: t('debitAmount'),
              updatedAt: t('debtUpdatedAt'),
            }}
          />

          {canReadInvoices && (
            <MainBox>
              <div className="flex items-center gap-2 mb-4">
                <Receipt size={20} className="text-sky-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  {t('unsettledPayments')}
                  {showUnsettled ? ` (${unsettledTotalCount})` : ''}
                </h2>
              </div>

              {showUnsettled && (
                <DataTable<Invoice>
                  columns={unsettledInvoiceColumns}
                  data={unsettledInvoices}
                  rowKey={(row) => row.id}
                  loading={unsettledLoading}
                  emptyState={t('noUnsettledInvoices')}
                  itemsPerPage={5}
                  pageSize={unsettledPageSize}
                  currentPage={unsettledCurrentPage}
                  totalCount={unsettledTotalCount}
                  onPageChange={handleUnsettledPageChange}
                  onPageSizeChange={handleUnsettledPageSizeChange}
                  persistKey="unit-detail-unsettled-invoices"
                  showColumnToggle
                  rowHref={(row) => `/invoices/${row.id}`}
                />
              )}
            </MainBox>
          )}
        </div>
      )}

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
            persistKey="unit-detail-documents"
            showColumnToggle
            exportEnabled={canExportDocuments}
            exportEndpoint="/projects/units/media"
            exportParams={documentsExportParams}
            exportFileName="unit-documents"
          />
        </MainBox>
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
            unit_id: unit.unit_id ?? unit.id,
            unit_number: unit.unit_number,
            customer_id: uploadCustomer?.customer_id ?? 0,
            customer_name: uploadCustomer?.customer_name,
            customer_code: uploadCustomer?.customer_code ?? undefined,
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

      {printInvoice &&
        createPortal(
          <div className="print-area">
            <InvoicePrintReceipt invoice={printInvoice} />
          </div>,
          document.body,
        )}

      {unit?.is_locked === 0 && (
        <AddEntryModal
          open={showBlockConfirm}
          title={t('confirmBlockTitle')}
          fields={blockModalFields}
          saveLabel={blockLoading ? t('processing') : t('confirm')}
          cancelLabel={t('cancel')}
          isSaving={blockLoading}
          onSave={handleToggleBlock}
          onCancel={() => setShowBlockConfirm(false)}
          initialValues={{ reason: '' }}
        />
      )}

      {unit?.is_locked === 1 && (
        <ConfirmModal
          open={showBlockConfirm}
          title={t('confirmUnblockTitle')}
          message={t('confirmUnblockMessage')}
          confirmLabel={t('confirm')}
          cancelLabel={t('cancel')}
          confirmVariant="success"
          isLoading={blockLoading}
          loadingLabel={t('processing')}
          onConfirm={() => void handleToggleBlock()}
          onCancel={() => setShowBlockConfirm(false)}
        />
      )}

      {unit && (
        <ConfirmModal
          open={showRentConfirm}
          title={
            unit.is_eligible_for_rent === 1
              ? t('confirmDisableRentTitle')
              : t('confirmEnableRentTitle')
          }
          message={
            unit.is_eligible_for_rent === 1
              ? t('confirmDisableRentMessage')
              : t('confirmEnableRentMessage')
          }
          confirmLabel={t('confirm')}
          cancelLabel={t('cancel')}
          confirmVariant={
            unit.is_eligible_for_rent === 1 ? 'danger' : 'success'
          }
          isLoading={rentLoading}
          loadingLabel={t('processing')}
          onConfirm={handleToggleRent}
          onCancel={() => setShowRentConfirm(false)}
        />
      )}

      <AddEntryModal
        open={showLocationModal}
        title={t('assignLocationTitle')}
        fields={locationModalFields}
        saveLabel={locationSaving ? t('processing') : t('confirm')}
        cancelLabel={t('cancel')}
        isSaving={locationSaving}
        onSave={handleAssignLocation}
        onCancel={() => setShowLocationModal(false)}
        initialValues={{
          location_id: unit?.unit_specifications?.location_id
            ? String(unit.unit_specifications.location_id)
            : '',
        }}
      />
      <OwnershipModals
        endTarget={ownership.endTarget}
        editTarget={ownership.editTarget}
        isSaving={ownership.isSaving}
        onEnd={ownership.handleEnd}
        onEdit={ownership.handleEdit}
        onCancelEnd={() => ownership.setEndTarget(null)}
        onCancelEdit={() => ownership.setEditTarget(null)}
      />
    </div>
  );
}
