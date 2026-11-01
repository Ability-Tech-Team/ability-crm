'use client';

import { useEffect, useState } from 'react';
import { fetchMediaBlob } from '@/src/lib/downloadFile';

type SecureImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src'
> & {
  src: string;
};

export function useSecureMediaUrl(sourceUrl: string | null) {
  const [result, setResult] = useState<{
    sourceUrl: string;
    objectUrl: string | null;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!sourceUrl) return;

    const controller = new AbortController();
    let nextObjectUrl: string | null = null;

    void fetchMediaBlob(sourceUrl, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        nextObjectUrl = URL.createObjectURL(blob);
        setResult({ sourceUrl, objectUrl: nextObjectUrl, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ sourceUrl, objectUrl: null, failed: true });
        }
      });

    return () => {
      controller.abort();
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [sourceUrl]);

  return {
    objectUrl: result?.sourceUrl === sourceUrl ? result.objectUrl : null,
    failed: result?.sourceUrl === sourceUrl ? result.failed : false,
  };
}

export default function SecureImage({ src, alt, ...props }: SecureImageProps) {
  const { objectUrl, failed } = useSecureMediaUrl(src);

  if (failed) {
    return <span role="img" aria-label={alt} className={props.className} />;
  }

  if (!objectUrl) {
    return <span aria-hidden="true" className={props.className} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectUrl} alt={alt} {...props} />;
}
