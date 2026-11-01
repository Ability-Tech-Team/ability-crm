import { setRequestLocale } from 'next-intl/server';
import DashboardContent from './DashboardContent';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardStatistics({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DashboardContent />;
}
