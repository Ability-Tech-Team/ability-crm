'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useClientBrand } from '@/src/hooks/useSession';

type BrandMarkProps = {
  /** Classes for the logo image. */
  className?: string;
  /** Classes for the name, shown when there is no logo. */
  textClassName?: string;
};

/** The client's logo, or its name, or the product name. */
export default function BrandMark({ className, textClassName }: BrandMarkProps) {
  const t = useTranslations('common');
  const { name, logoUrl } = useClientBrand();
  const [logoFailed, setLogoFailed] = useState(false);
  const label = name ?? t('appName');

  if (logoUrl && !logoFailed) {
    // The logo is a signed link on the client's storage, outside next/image's
    // configured domains.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={label}
        className={className}
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return <span className={textClassName}>{label}</span>;
}
