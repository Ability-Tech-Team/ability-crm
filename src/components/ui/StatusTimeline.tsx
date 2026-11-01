import { Clock } from 'lucide-react';
import MainBox from '@/src/components/ui/MainBox';

export interface StatusTimelineLog {
  log_id: number;
  ticket_status_name?: string | null;
  invoice_status_name?: string | null;
  status_name?: string | null;
  description?: string | null;
  log_description?: string | null;
  created_by: string;
  created_at: string | {
    dateTime: string;
  };
}

function getCreatedAt(createdAt: StatusTimelineLog['created_at']): string {
  return typeof createdAt === 'string' ? createdAt : createdAt.dateTime;
}

function normalizeStatus(statusName?: string | null): string {
  return (statusName ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function getStatusStyles(statusName: string): { dot: string; badge: string } {
  const status = normalizeStatus(statusName);

  if (
    status.includes('created') ||
    status.includes('new') ||
    status.includes('انشاء') ||
    status.includes('تم الإنشاء')
  ) {
    return { dot: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' };
  }

  if (
    status.includes('paid') ||
    status.includes('payment') ||
    status.includes('دفع') ||
    status.includes('مدفوع')
  ) {
    return {
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700',
    };
  }

  if (
    status.includes('confirmed') ||
    status.includes('confirm') ||
    status.includes('مؤكد') ||
    status.includes('تأكيد')
  ) {
    return { dot: 'bg-blue-600', badge: 'bg-blue-50 text-blue-700' };
  }

  if (
    status.includes('inprogress') ||
    status.includes('in progress') ||
    status.includes('processing') ||
    status.includes('pending') ||
    status.includes('قيد التنفيذ') ||
    status.includes('قيد المعالجة')
  ) {
    return { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' };
  }

  if (
    status.includes('completed') ||
    status.includes('done') ||
    status.includes('closed') ||
    status.includes('مكتمل') ||
    status.includes('منجز') ||
    status.includes('تم')
  ) {
    return { dot: 'bg-green-600', badge: 'bg-green-50 text-green-700' };
  }

  if (
    status.includes('cancel') ||
    status.includes('rejected') ||
    status.includes('رفض') ||
    status.includes('مرفوض') ||
    status.includes('ملغي') ||
    status.includes('إلغاء')
  ) {
    return { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700' };
  }

  return { dot: 'bg-slate-500', badge: 'bg-slate-50 text-slate-700' };
}

function TimelineItem({
  log,
  isLast,
}: {
  log: StatusTimelineLog;
  isLast: boolean;
}) {
  const statusName =
    log.ticket_status_name ?? log.invoice_status_name ?? log.status_name ?? '—';
  const styles = getStatusStyles(statusName);

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${styles.dot}`}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 min-h-10" />}
      </div>

      <div className="pb-6 flex-1 -mt-0.5">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles.badge}`}
          >
            {statusName}
          </span>
          <span className="text-xs text-slate-400">
            {getCreatedAt(log.created_at)}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          {log.description ?? log.log_description ?? '—'}
        </p>
        <p className="text-xs text-slate-400 mt-1">{log.created_by}</p>
      </div>
    </div>
  );
}

export default function StatusTimeline({
  logs,
  title,
}: {
  logs: StatusTimelineLog[];
  title: string;
}) {
  const sortedLogs = [...logs].sort((a, b) => b.log_id - a.log_id);

  return (
    <MainBox>
      <div className="flex items-center gap-2 mb-6">
        <Clock size={20} className="text-sky-600" />
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>

      {sortedLogs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">—</p>
      ) : (
        <div className="flex flex-col">
          {sortedLogs.map((log, index) => (
            <TimelineItem
              key={log.log_id}
              log={log}
              isLast={index === sortedLogs.length - 1}
            />
          ))}
        </div>
      )}
    </MainBox>
  );
}
