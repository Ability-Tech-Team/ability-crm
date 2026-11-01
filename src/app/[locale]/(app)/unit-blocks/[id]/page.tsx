'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Ban,
  Download,
  Eye,
  Paperclip,
  Pencil,
  Users,
} from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import SectionHeader from '@/src/components/SectionHeader';
import Button from '@/src/components/ui/Button';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import FilePreviewDialog from '@/src/components/ui/FilePreviewDialog';
import MainBox from '@/src/components/ui/MainBox';
import StatusTimeline from '@/src/components/ui/StatusTimeline';
import { downloadFile } from '@/src/lib/downloadFile';
import type {
  UnitBlockAttachment,
  UnitBlockCustomer,
} from '@/src/services/unitBlocks';
import { useUnitBlockDetailsPage } from './hooks/useUnitBlockDetailsPage';
import { SECTIONS } from './schema';
import {
  getDetailRows,
  getStatusBadgeClass,
  getTypeBadgeClass,
  toTimelineLogs,
} from './utils';

export default function UnitBlockDetailsPage() {
  const params = useParams();
  const t = useTranslations('unitBlocks');
  const tForm = useTranslations('form');
  const tDocLib = useTranslations('documentLibrary');
  const {
    privileges,
    canRead,
    canEdit,
    block,
    isLoading,
    loadError,
    previewFile,
    setPreviewFile,
    isSectionVisible,
    toggleSection,
    goBack,
    goToEdit,
  } = useUnitBlockDetailsPage(Number(params?.id));

  const customerColumns = useMemo<ColumnDef<UnitBlockCustomer>[]>(
    () => [
      {
        id: 'customer_code',
        label: tForm('customerCode'),
        alwaysVisible: true,
        cell: (row) => row.customer_code || '—',
      },
      {
        id: 'customer_name',
        label: t('columns.customerName'),
        cell: (row) => row.customer_name || '—',
      },
      {
        id: 'mobile_number',
        label: t('columns.customerMobile'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.mobile_number || '—',
      },
    ],
    [t, tForm],
  );

  const attachmentColumns = useMemo<ColumnDef<UnitBlockAttachment>[]>(
    () => [
      {
        id: 'download',
        label: tDocLib('columns.download'),
        cell: (row) => (
          <button
            type="button"
            onClick={() => downloadFile(row.file_path, row.file_name)}
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
            type="button"
            onClick={() =>
              setPreviewFile({ url: row.file_path, name: row.file_name })
            }
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
            title={tDocLib('viewDocument')}
          >
            <Eye size={18} />
          </button>
        ),
      },
      {
        id: 'file_name',
        label: tDocLib('columns.fileName'),
        alwaysVisible: true,
        cell: (row) => row.file_name,
      },
      {
        id: 'description',
        label: tForm('description'),
        cell: (row) => row.description || '—',
      },
      {
        id: 'created_by_name',
        label: tForm('editedBy'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.created_by_name || '—',
      },
    ],
    [tForm, tDocLib, setPreviewFile],
  );

  if (!privileges.canAccess || !canRead) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-100">
        <span className="text-sm text-slate-500">{tForm('loading')}</span>
      </div>
    );
  }

  if (loadError || !block) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-100 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <Ban size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">
          {loadError || t('edit.notFound')}
        </h2>
        <Button variant="secondary" onClick={goBack}>
          <ArrowLeft size={16} />
          {t('details.back')}
        </Button>
      </div>
    );
  }

  const customers = block.customers ?? [];
  const attachments = block.attachments ?? [];

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title={t('details.back')}
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {t('details.title')} #{block.id}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">
                {block.unit_number} · {block.project_name}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTypeBadgeClass(block.is_legal)}`}
              >
                {block.is_legal === 1 ? t('legalShort') : t('financeShort')}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(block.is_active)}`}
              >
                {block.is_active === 1 ? tForm('isActive') : tForm('inactive')}
              </span>
            </div>
          </div>
        </div>

        {/* Below the title, as on the unit page, and wraps on narrow screens. */}
        <div className="flex flex-wrap gap-2">
          {/* Each button shows or hides its section; any number can be open. */}
          {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
            <Button
              key={id}
              variant={isSectionVisible(id) ? 'primary' : 'secondary'}
              onClick={() => toggleSection(id)}
            >
              <Icon size={16} />
              {t(labelKey)}
            </Button>
          ))}

          {/* This page only reads; editing stays on the form that owns it. */}
          {canEdit && (
            <Button variant="secondary" onClick={goToEdit}>
              <Pencil size={16} />
              {t('edit.title')}
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary ─────────────────────────────────────────── */}
      {isSectionVisible('summary') && (
        <MainBox>
          <SectionHeader icon={Ban} title={t('details.blockInfo')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {getDetailRows(block, t, tForm).map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {row.label}
                </span>
                <span className="text-sm font-medium text-slate-800 wrap-break-word">
                  {row.value || '—'}
                </span>
              </div>
            ))}
          </div>
        </MainBox>
      )}

      {/* ── Customers ───────────────────────────────────────── */}
      {isSectionVisible('customers') && (
        <MainBox>
          <SectionHeader
            icon={Users}
            title={`${t('details.customers')} (${customers.length})`}
          />
          <DataTable<UnitBlockCustomer>
            columns={customerColumns}
            data={customers}
            rowKey={(row) => row.customer_id}
            emptyState={t('details.noCustomers')}
            itemsPerPage={10}
          />
        </MainBox>
      )}

      {/* ── Attachments ─────────────────────────────────────── */}
      {isSectionVisible('attachments') && (
        <MainBox>
          <SectionHeader
            icon={Paperclip}
            title={`${t('create.attachments')} (${attachments.length})`}
          />
          <DataTable<UnitBlockAttachment>
            columns={attachmentColumns}
            data={attachments}
            rowKey={(row) => row.id}
            emptyState={t('create.noAttachments')}
            itemsPerPage={10}
          />
        </MainBox>
      )}

      {/* ── Activity log ────────────────────────────────────── */}
      {isSectionVisible('timeline') && (
        <StatusTimeline
          logs={toTimelineLogs(block)}
          title={t('details.timeline')}
        />
      )}

      <FilePreviewDialog
        open={!!previewFile}
        file={previewFile}
        title={t('create.attachments')}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
