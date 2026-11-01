'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import Button from './ui/Button';
import Select from './ui/Select';
import Input from './ui/Input';
import ServicesPicker, {
  type SelectedService,
  type ServiceOption,
} from './ServicesPicker';
import { useDropdowns } from '../hooks/useDropdowns';
import { getServices } from '../services/services';
import { useResponseMessage } from '../hooks/useResponseMessage';
import {
  getTicketById,
  updateTicket,
  type Ticket,
  type TicketService,
  type UpdateTicketServiceDto,
} from '../services/tickets';

interface TicketEditModalProps {
  open: boolean;
  ticketId: number | null;
  onSave: () => void;
  onCancel: () => void;
}

/** Convert ticket arrival_time to datetime-local input value */
function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  // Try parsing various formats — the API may return "YYYY-MM-DD HH:mm" or ISO
  const d = new Date(value.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert datetime-local value back to API format "YYYY-MM-DD HH:mm" */
function fromDatetimeLocal(value: string): string {
  return value.replace('T', ' ');
}

export default function TicketEditModal({
  open,
  ticketId,
  onSave,
  onCancel,
}: TicketEditModalProps) {
  const t = useTranslations('tickets');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const overlayRef = useRef<HTMLDivElement>(null);
  const { success: showSuccess, error: showError } = useResponseMessage();

  // ── Loading / error state ────────────────────────────────────
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Original ticket data (for service diffing) ──────────────
  const [originalTicket, setOriginalTicket] = useState<Ticket | null>(null);

  // ── Form state ───────────────────────────────────────────────
  const [departmentId, setDepartmentId] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [notes, setNotes] = useState('');

  // ── Services ─────────────────────────────────────────────────
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    [],
  );

  // ── Department options ───────────────────────────────────────
  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  // ── Fetch services for a department ──────────────────────────
  const fetchServiceOptions = useCallback(
    async (deptId: string): Promise<ServiceOption[]> => {
      if (!deptId) return [];
      try {
        const data = await getServices({
          department_id: Number(deptId),
          is_active: 1,
          page: 1,
          limit: 1000,
        });
        return data.services.map((s) => ({
          value: String(s.id),
          label: s.service_name,
          price: s.price,
        }));
      } catch {
        return [];
      }
    },
    [],
  );

  // ── Load ticket when modal opens ─────────────────────────────
  useEffect(() => {
    if (!open || !ticketId) return;

    const controller = new AbortController();

    (async () => {
      setIsLoadingTicket(true);
      setError('');

      try {
        const ticket = await getTicketById(ticketId, controller.signal);
        if (controller.signal.aborted) return;

        if (!ticket) {
          setError(t('detail.notFound'));
          return;
        }

        setOriginalTicket(ticket);
        setDepartmentId(String(ticket.department_id));
        setArrivalTime(toDatetimeLocal(ticket.arrival_time));
        setNotes(ticket.notes ?? '');

        // Load services for the department, then merge with ticket's existing services
        const options = await fetchServiceOptions(String(ticket.department_id));
        if (controller.signal.aborted) return;

        // Ensure existing ticket services appear in the options even if they're
        // no longer in the department's service list
        const optionIds = new Set(options.map((o) => o.value));
        const extraOptions: ServiceOption[] = ticket.services
          .filter((s) => !optionIds.has(String(s.service_id)))
          .map((s) => ({
            value: String(s.service_id),
            label: s.service_name,
            price: String(s.price),
          }));

        setServiceOptions([...options, ...extraOptions]);

        // Map existing ticket services into SelectedService format
        setSelectedServices(
          ticket.services.map((s) => ({
            serviceId: String(s.service_id),
            serviceName: s.service_name,
            price: String(s.price),
            quantity: s.quantity,
          })),
        );
      } catch (err: unknown) {
        if (
          !controller.signal.aborted &&
          (err as { name?: string }).name !== 'CanceledError'
        ) {
          setError(t('edit.loadError'));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTicket(false);
        }
      }
    })();

    return () => controller.abort();
  }, [open, ticketId, t, fetchServiceOptions]);

  // ── Handle department change ─────────────────────────────────
  const handleDepartmentChange = useCallback(
    async (newDeptId: string) => {
      setDepartmentId(newDeptId);
      setSelectedServices([]);
      const options = await fetchServiceOptions(newDeptId);
      setServiceOptions(options);
    },
    [fetchServiceOptions],
  );

  // ── Build the services diff for the API ──────────────────────
  const buildServicesDiff = useCallback(
    (
      original: TicketService[],
      current: SelectedService[],
    ): UpdateTicketServiceDto[] => {
      const result: UpdateTicketServiceDto[] = [];

      const currentMap = new Map(current.map((s) => [String(s.serviceId), s]));
      const originalMap = new Map(
        original.map((s) => [String(s.service_id), s]),
      );

      // Added or updated services
      for (const svc of current) {
        const orig = originalMap.get(String(svc.serviceId));
        if (
          !orig ||
          orig.quantity !== svc.quantity ||
          String(orig.price) !== svc.price
        ) {
          result.push({
            service_id: Number(svc.serviceId),
            quantity: svc.quantity,
            price: parseFloat(svc.price),
          });
        }
      }

      // Removed services
      for (const orig of original) {
        if (!currentMap.has(String(orig.service_id))) {
          result.push({
            service_id: orig.service_id,
            is_deleted: 1,
          });
        }
      }

      return result;
    },
    [],
  );

  // ── Save handler ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!ticketId || !originalTicket) return;

    setIsSaving(true);
    setError('');

    try {
      const servicesDiff = buildServicesDiff(
        originalTicket.services,
        selectedServices,
      );

      await updateTicket(ticketId, {
        department_id: Number(departmentId),
        arrival_time: arrivalTime ? fromDatetimeLocal(arrivalTime) : undefined,
        notes: notes || undefined,
        ...(originalTicket.unit_id ? { unit_id: originalTicket.unit_id } : {}),
        ...(servicesDiff.length > 0 ? { services: servicesDiff } : {}),
      });

      showSuccess('updateSuccess');
      onSave();
    } catch (err) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Escape to close ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, isSaving, onCancel]);

  // ── Prevent body scroll ──────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === overlayRef.current && !isSaving) onCancel();
      }}
    >
      <div className="relative w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('edit.title')} {ticketId ? `#${ticketId}` : ''}
        </h2>

        {/* Loading state */}
        {isLoadingTicket ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-500">{tForm('loading')}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Department select */}
            <Select
              label={tForm('department')}
              name="department_id"
              options={departmentOptions}
              placeholder={tForm('department')}
              value={departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              disabled={isSaving}
            />

            {/* Arrival time */}
            <Input
              label={t('edit.arrivalTime')}
              name="arrival_time"
              type="datetime-local"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              disabled={isSaving}
            />

            {/* Notes */}
            <Input
              label={t('edit.notes')}
              name="notes"
              type="text"
              placeholder={t('edit.notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSaving}
            />

            {/* Services picker */}
            <ServicesPicker
              services={serviceOptions}
              value={selectedServices}
              onChange={setSelectedServices}
              label={t('create.servicesLabel')}
              disabled={isSaving}
            />

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onCancel}
                disabled={isSaving}
                fullWidth={false}
              >
                {tForm('cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isSaving}
                fullWidth={false}
              >
                {isSaving ? tForm('updating') : tForm('save')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
