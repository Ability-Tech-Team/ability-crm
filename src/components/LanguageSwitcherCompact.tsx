'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'EN' },
  { code: 'ar', name: 'Arabic', nativeName: 'ع' },
];

export default function LanguageSwitcherCompact() {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLanguageChange = (newLocale: string) => {
    // next-intl's proxy remembers the choice in its locale cookie.
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguage = languages.find((l) => l.code === locale);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 p-2 rounded-lg transition-colors text-[#8F9BB3] hover:text-blue-500"
        aria-label={t('changeLanguage')}
        aria-expanded={isOpen}
      >
        <Globe size={20} className="sm:w-6 sm:h-6" />
        <span className="text-sm font-medium hidden sm:inline">
          {currentLanguage?.nativeName}
        </span>
      </button>

      {isOpen && (
        <div className="absolute inset-e-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-30 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              lang={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-4 py-2 text-start text-sm transition-colors hover:bg-gray-50 ${
                locale === lang.code
                  ? 'text-blue-600 font-medium bg-blue-50'
                  : 'text-gray-700'
              }`}
            >
              {lang.nativeName} - {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
