import type { PresentationAsset } from '@workspace/api-client-react';

export type Kind = 'pptx' | 'pdf';

export const MIME: Record<Kind, string> = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
};

export class DownloadError extends Error {}

export function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} م.ب`;
  return `${Math.max(1, Math.round(bytes / 1024))} ك.ب`;
}

export function siblingUrl(path: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const root = base.replace(/\/[^/]*$/, '');
  return `${root}/${path}`;
}

function ensureExt(name: string, kind: Kind) {
  return name.toLowerCase().endsWith(`.${kind}`) ? name : `${name.replace(/\.[a-z0-9]+$/i, '')}.${kind}`;
}

/** Fetch the real file, validate it, and hand it to the browser as a correctly typed file (never a zip). */
export async function downloadAsset(asset: PresentationAsset, kind: Kind) {
  let res: Response;
  try {
    res = await fetch(asset.url, { credentials: 'include', cache: 'no-store' });
  } catch {
    throw new DownloadError('تعذّر الاتصال بالخادم. تحقّقي من الاتصال بالإنترنت ثم أعيدي المحاولة.');
  }
  if (!res.ok) throw new DownloadError(`رفض الخادم الطلب (رمز ${res.status}). أعيدي المحاولة.`);
  const type = (res.headers.get('content-type') || '').toLowerCase();
  if (!type.includes(MIME[kind])) {
    throw new DownloadError('نوع الملف المستلم غير متوقع، لذلك أُوقف التنزيل حفاظًا على سلامة الملف.');
  }
  let buf: ArrayBuffer;
  try {
    buf = await res.arrayBuffer();
  } catch {
    throw new DownloadError('انقطع الاتصال قبل اكتمال الملف. أعيدي المحاولة لتنزيل نسخة كاملة.');
  }
  if (buf.byteLength === 0) throw new DownloadError('وصل الملف فارغًا. أعيدي المحاولة.');
  if (asset.size && buf.byteLength !== asset.size) {
    throw new DownloadError('حجم الملف المستلم لا يطابق النسخة المعتمدة. أعيدي المحاولة.');
  }
  const head = new Uint8Array(buf.slice(0, 5));
  const ok =
    kind === 'pptx'
      ? head[0] === 0x50 && head[1] === 0x4b
      : String.fromCharCode(...head) === '%PDF-';
  if (!ok) throw new DownloadError('محتوى الملف غير صالح. أعيدي المحاولة.');
  if (asset.sha256 && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', buf);
    const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    if (actual !== asset.sha256) {
      throw new DownloadError('لم يكتمل الملف بصورة سليمة. أعيدي المحاولة للحصول على النسخة الأصلية.');
    }
  }

  const blob = new Blob([buf], { type: MIME[kind] });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = ensureExt(asset.filename, kind);
  a.type = MIME[kind];
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
