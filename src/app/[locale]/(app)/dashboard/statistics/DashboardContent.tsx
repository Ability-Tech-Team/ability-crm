'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import MainBox from '@/src/components/ui/MainBox';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  getStatistics,
  DateType,
  type Statistics,
} from '@/src/services/statistics';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

const CHART_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

const DATE_TYPES = [
  DateType.DAILY,
  DateType.WEEKLY,
  DateType.MONTHLY,
  DateType.YEARLY,
] as const;

const DATE_TYPE_KEYS: Record<DateType, string> = {
  [DateType.DAILY]: 'daily',
  [DateType.WEEKLY]: 'weekly',
  [DateType.MONTHLY]: 'monthly',
  [DateType.YEARLY]: 'yearly',
};

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <MainBox>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="w-full h-72">{children}</div>
    </MainBox>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
      {message}
    </div>
  );
}

export default function DashboardContent() {
  const t = useTranslations('dashboard');

  const [stats, setStats] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateType, setDateType] = useState<DateType>(DateType.DAILY);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const abortRef = useRef<AbortController | null>(null);

  const fetchStats = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError('');

    try {
      const data = await getStatistics(
        { date_type: dateType, date },
        controller.signal,
      );
      setStats(data);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'CanceledError') {
        setError(t('loadError'));
      }
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [dateType, date, t]);

  useEffect(() => {
    const cancel = runAfterCommit(() => {
      fetchStats();
    });

    return () => {
      cancel();
      abortRef.current?.abort();
    };
  }, [fetchStats]);

  // Transform data for recharts
  const chartData = stats
    ? stats.x_labels.map((label, i) => ({
      label: String(label),
      tickets: stats.statistics.tickets.data[i] ?? 0,
      invoices: stats.statistics.collected_invoices.data[i] ?? 0,
      sla: stats.statistics.sla_delay.sla[i] ?? 0,
      delay: stats.statistics.sla_delay.delay[i] ?? 0,
      ...Object.fromEntries(
        stats.statistics.tickets_by_department.map((dept) => [
          `dept_${dept.department_id}`,
          dept.data[i] ?? 0,
        ]),
      ),
      ...Object.fromEntries(
        stats.statistics.complains_by_status.map((status) => [
          `complaint_status_${status.status_id}`,
          status.data[i] ?? 0,
        ]),
      ),
    }))
    : [];

  const hasBaseChartData = chartData.length > 0;
  const hasComplaintStatusSeries =
    (stats?.statistics.complains_by_status.length ?? 0) > 0;
  const hasDepartmentSeries =
    (stats?.statistics.tickets_by_department.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6 mt-6">
      {/* Filters */}
      <MainBox>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              {t('dateType')}
            </label>
            <select
              value={dateType}
              onChange={(e) => setDateType(Number(e.target.value) as DateType)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DATE_TYPES.map((dt) => (
                <option key={dt} value={dt}>
                  {t(DATE_TYPE_KEYS[dt])}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">
              {t('date')}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </MainBox>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {!isLoading && stats && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Tickets Chart */}
          <ChartCard title={t('tickets')}>
            {hasBaseChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="ticketFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="tickets"
                    name={t('tickets')}
                    stroke="#3b82f6"
                    fill="url(#ticketFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message={t('noData')} />
            )}
          </ChartCard>

          {/* Collected Invoices Chart */}
          <ChartCard title={t('collectedInvoices')}>
            {hasBaseChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="invoices"
                    name={t('collectedInvoices')}
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message={t('noData')} />
            )}
          </ChartCard>

          {/* SLA & Delay Chart */}
          <ChartCard title={t('slaDelay')}>
            {hasBaseChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sla"
                    name={t('sla')}
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="delay"
                    name={t('delay')}
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message={t('noData')} />
            )}
          </ChartCard>

          {/* Complaints by Status Chart */}
          <ChartCard title={t('complaintsByStatus')}>
            {hasBaseChartData && hasComplaintStatusSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {stats.statistics.complains_by_status.map((status, i) => (
                    <Bar
                      key={status.status_id}
                      dataKey={`complaint_status_${status.status_id}`}
                      name={status.status_name}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message={t('noData')} />
            )}
          </ChartCard>

          {/* Tickets by Department Chart */}
          <ChartCard title={t('ticketsByDepartment')}>
            {hasBaseChartData && hasDepartmentSeries ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  {stats.statistics.tickets_by_department.map((dept, i) => (
                    <Bar
                      key={dept.department_id}
                      dataKey={`dept_${dept.department_id}`}
                      name={dept.department_name}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChartState message={t('noData')} />
            )}
          </ChartCard>
        </div>
      )}
    </div>
  );
}
