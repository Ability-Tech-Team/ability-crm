import { getApiBaseUrl } from './apiConfig';

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function getSelectedLanguage(): string {
  const pathnameLanguage = window.location.pathname.match(
    /^\/(en|ar)(?=\/|$)/,
  )?.[1];

  return pathnameLanguage || document.documentElement.lang || 'en';
}

type ExportExcelOptions = {
  endpoint: string;
  params?: Record<string, unknown>;
  fileName?: string;
};

function getResponseFileName(
  contentDisposition: string | undefined,
  fallback: string,
): string {
  if (!contentDisposition) return fallback;

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim().replace(/^"|"$/g, ''));
    } catch {
      // Fall back to the regular filename or the supplied name.
    }
  }

  const plainMatch = contentDisposition.match(/filename=(?:"([^"]+)"|([^;]+))/i);
  return (plainMatch?.[1] ?? plainMatch?.[2])?.trim() || fallback;
}

function getJsonErrorMessage(
  buffer: ArrayBuffer,
  contentType = '',
): string | null {
  const bytes = new Uint8Array(buffer);
  let firstContentByte: number | undefined;
  for (const byte of bytes) {
    if (byte !== 0x09 && byte !== 0x0a && byte !== 0x0d && byte !== 0x20) {
      firstContentByte = byte;
      break;
    }
  }

  const looksLikeJson =
    contentType.toLowerCase().includes('json') ||
    firstContentByte === 0x7b ||
    firstContentByte === 0x5b;

  if (!looksLikeJson) return null;

  try {
    const text = new TextDecoder().decode(buffer).trim();
    const payload = JSON.parse(text) as {
      message?: string;
      result?: { message?: string };
    };
    return payload.result?.message || payload.message || 'Excel export failed';
  } catch {
    return 'Excel export failed';
  }
}

function hasSignature(
  bytes: Uint8Array,
  offset: number,
  third: number,
  fourth: number,
): boolean {
  return (
    bytes[offset] === 0x50 &&
    bytes[offset + 1] === 0x4b &&
    bytes[offset + 2] === third &&
    bytes[offset + 3] === fourth
  );
}

function isValidZipFile(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 22) return false;

  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const searchStart = Math.max(0, bytes.length - 65_557);

  for (let offset = bytes.length - 22; offset >= searchStart; offset -= 1) {
    if (!hasSignature(bytes, offset, 0x05, 0x06)) continue;

    const entryCount = view.getUint16(offset + 10, true);
    const centralDirectorySize = view.getUint32(offset + 12, true);
    const centralDirectoryOffset = view.getUint32(offset + 16, true);

    if (centralDirectoryOffset + centralDirectorySize > offset) return false;
    if (entryCount === 0) return true;

    return hasSignature(bytes, centralDirectoryOffset, 0x01, 0x02);
  }

  return false;
}

function buildExportUrl(
  endpoint: string,
  params: Record<string, unknown>,
): string {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error('The Ability CRM API address is not set.');

  const baseUrl = apiBaseUrl.replace(/\/+$/, '');
  const path = endpoint.replace(/^\/+/, '');
  const url = new URL(`${baseUrl}/${path}`, window.location.origin);
  const exportParams: Record<string, unknown> = { is_excel: 1, ...params };

  for (const [key, value] of Object.entries(exportParams)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          url.searchParams.append(key, String(item));
        }
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

/**
 * Ask the backend to generate an Excel file and download its binary response.
 */
export async function exportExcel({
  endpoint,
  params = {},
  fileName = 'export.xlsx',
}: ExportExcelOptions): Promise<void> {
  const fallbackFileName = /\.xlsx?$/i.test(fileName)
    ? fileName
    : `${fileName}.xlsx`;


  const language = getSelectedLanguage();

  const response = await fetch(buildExportUrl(endpoint, params), {
    method: 'GET',
    // The session is an HttpOnly cookie; 'include' is what makes the browser
    // attach it to this cross-origin download.
    credentials: 'include',
    headers: {
      'Accept-Language': language,
      lang: language,
    },
    cache: 'no-store',
  });
  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') ?? '';
  const jsonError = getJsonErrorMessage(buffer, contentType);
  if (jsonError) throw new Error(jsonError);
  if (!response.ok) {
    throw new Error(`Excel export failed (${response.status})`);
  }
  if (!isValidZipFile(buffer)) {
    throw new Error('The backend response is not a valid Excel file');
  }

  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE });

  const resolvedFileName = getResponseFileName(
    response.headers.get('content-disposition') ?? undefined,
    fallbackFileName,
  );
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = resolvedFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
