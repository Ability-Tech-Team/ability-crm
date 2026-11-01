
export async function fetchMediaBlob(
  url: string,
  signal?: AbortSignal,
): Promise<Blob> {
  // Same-origin call: the browser attaches the HttpOnly auth cookie itself and
  // the route handler forwards it to the backend.
  const response = await fetch('/api/media', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
    cache: 'no-store',
    signal,
  });

  if (!response.ok) throw new Error('Unable to load media');
  return response.blob();
}

export function openMediaInNewTab(url: string): void {
  if (typeof window === 'undefined' || !url) return;

  // Open synchronously so browser popup protection does not block the tab while
  // the authenticated media request is in flight.
  const target = window.open('about:blank', '_blank');
  if (!target) return;
  target.opener = null;

  void fetchMediaBlob(url)
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      target.document.title = 'Media preview';
      target.document.body.style.cssText =
        'margin:0;background:#0f172a;width:100vw;height:100vh;overflow:hidden';
      const frame = target.document.createElement('iframe');
      frame.src = objectUrl;
      frame.sandbox.value = '';
      frame.referrerPolicy = 'no-referrer';
      frame.style.cssText = 'border:0;width:100%;height:100%';
      target.document.body.replaceChildren(frame);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    })
    .catch(() => target.close());
}

/**
 * Programmatically trigger a download for a remote file via the proxy route.
 */
export function downloadFile(url: string, fileName?: string): void {
  if (typeof window === 'undefined' || !url) {
    return;
  }

  void fetchMediaBlob(url)
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName || 'attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    })
    .catch(() => undefined);
}
