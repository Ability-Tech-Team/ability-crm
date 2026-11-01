'use client';

import { Wrench } from 'lucide-react';
import { useTranslations } from 'next-intl';
import BrandMark from './BrandMark';

export default function MaintenancePage() {
  const t = useTranslations('maintenance');

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto bg-linear-to-b from-sky-50 via-white to-sky-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <BrandMark
          className="mb-6 h-20 select-none object-contain sm:h-24"
          textClassName="mb-6 text-xl font-bold text-slate-700 sm:text-2xl"
        />

        <div
          aria-hidden="true"
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-sky-600 sm:mb-8"
        >
          <Wrench size={40} />
        </div>

        <h1 className="mb-3 sm:mb-4 text-2xl font-bold text-slate-800 sm:text-3xl md:text-4xl">
          {t('title')}
        </h1>

        <p className="text-sm leading-relaxed text-slate-600 sm:text-base md:text-lg">
          {t('message')}
        </p>
      </div>
    </div>
  );
}
