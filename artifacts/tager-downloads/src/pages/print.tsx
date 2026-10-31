import { useState } from 'react';
import { useGetPresentationAssets } from '@workspace/api-client-react';
import { AlertCircle, ArrowRight, Loader2, Printer, RotateCcw } from 'lucide-react';
import { Link } from 'wouter';
import { BrandHeader } from '@/components/brand-header';
import { DownloadCard } from '@/components/download-card';

type ImgState = 'loading' | 'ok' | 'fail';

export default function PrintPage() {
  const { data, isLoading, isError, refetch } = useGetPresentationAssets();
  const [status, setStatus] = useState<Record<number, ImgState>>({});
  const [attempt, setAttempt] = useState(0);

  const pages = data?.pages ?? [];
  const loaded = pages.filter((_, i) => status[i] === 'ok').length;
  const failed = pages.some((_, i) => status[i] === 'fail');
  const ready = pages.length > 0 && loaded === pages.length;

  const retry = () => {
    setStatus({});
    setAttempt((a) => a + 1);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-[100dvh] bg-background">
      <BrandHeader>
        <Link href="/" className="hidden items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-primary sm:inline-flex" data-testid="link-back">
          <ArrowRight className="h-4 w-4" /> صفحة التنزيل
        </Link>
      </BrandHeader>

      <div className="no-print mx-auto max-w-5xl px-5 py-6">
        <h1 className="text-2xl font-semibold text-primary">طباعة العرض</h1>
        <p className="mt-1 text-sm text-muted-foreground">النسخة النهائية المعتمدة — شريحة واحدة في كل ورقة A4 بالعرض.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            data-testid="button-print"
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Printer className="h-5 w-5" /> طباعة العرض
          </button>
          <p aria-live="polite" className="text-sm" data-testid="status-print">
            {isLoading && 'جارٍ تجهيز الصفحات…'}
            {data && !ready && !failed && (
              <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> تم تحميل {loaded} من {pages.length} شريحة</span>
            )}
            {ready && `جميع الشرائح (${pages.length}) جاهزة للطباعة.`}
          </p>
          {failed && (
            <span role="alert" className="inline-flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> تعذّر تحميل بعض الشرائح.
              <button type="button" onClick={retry} data-testid="button-retry-pages" className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-1 font-semibold">
                <RotateCcw className="h-4 w-4" /> إعادة المحاولة
              </button>
            </span>
          )}
        </div>
        {isError && (
          <div role="alert" className="mt-4 text-destructive">
            تعذّر تحميل بيانات العرض.{' '}
            <button type="button" onClick={() => refetch()} className="font-semibold underline" data-testid="button-retry-assets">إعادة المحاولة</button>
          </div>
        )}
        {data && (
          <div className="mt-5 max-w-md">
            <p className="mb-2 text-sm text-muted-foreground">على الهاتف؟ نزّلي ملف PDF واطبعيه من تطبيق الملفات.</p>
            <DownloadCard asset={data.files.pdf} kind="pdf" label="PDF للطباعة" hint="بديل مناسب للطباعة من الهاتف." />
          </div>
        )}
      </div>

      <div className="print-stack mx-auto flex max-w-5xl flex-col gap-6 px-5 pb-12">
        {pages.map((p, i) => (
          <figure key={`${p.url}-${attempt}`} className="print-sheet relative aspect-video overflow-hidden rounded-lg border border-border bg-card shadow-sm" data-testid={`img-slide-${i + 1}`}>
            {status[i] !== 'ok' && (
              <div className="no-print absolute inset-0 flex items-center justify-center bg-muted text-sm text-muted-foreground">
                {status[i] === 'fail' ? `تعذّر تحميل الشريحة ${i + 1}` : `الشريحة ${i + 1}…`}
              </div>
            )}
            <img
              src={p.url}
              alt={`الشريحة ${i + 1} من ${pages.length}`}
              loading="eager"
              decoding="sync"
              className="h-full w-full object-contain"
              onLoad={() => setStatus((s) => ({ ...s, [i]: 'ok' }))}
              onError={() => setStatus((s) => ({ ...s, [i]: 'fail' }))}
            />
          </figure>
        ))}
      </div>
    </div>
  );
}
