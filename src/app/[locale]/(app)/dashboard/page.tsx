import { setRequestLocale } from 'next-intl/server';
import { redirect } from '@/src/i18n/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Dashboard({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  redirect({ href: '/dashboard/statistics', locale });
}
