import { Link } from 'wouter';
import { useGetPresentationAssets } from '@workspace/api-client-react';
import { AlertCircle, ExternalLink, Printer, RotateCcw, ShieldCheck } from 'lucide-react';
import { BrandHeader } from '@/components/brand-header';
import { DownloadCard } from '@/components/download-card';
import { Skeleton } from '@/components/ui/skeleton';
import { siblingUrl } from '@/lib/download';

const base = import.meta.env.BASE_URL;

export default function Home() {
  const { data, isLoading, isError, refetch, isFetching } = useGetPresentationAssets();

  return (
    <div dir="rtl" lang="ar" className="min-h-[100dvh] bg-background">
      <BrandHeader />
      <main className="mx-auto max-w-5xl px-5 py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[hsl(40_60%_38%)]">تحميل العرض التقديمي</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-primary md:text-4xl" data-testid="text-title">
              {data?.title ?? 'Tager — نظام ذكي لإدارة المتاجر الصغيرة'}
            </h1>
            <p className="mt-3 text-muted-foreground">إعداد: سهام كامل محمود الكفافي</p>
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-[hsl(40_50%_75%)] bg-secondary p-4 text-sm leading-7">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <p data-testid="text-version-note">
                هذه هي <strong>النسخة النهائية المعتمدة</strong> من العرض
                {data ? <> ({data.slideCount} شريحة، الإصدار <span dir="ltr">{data.version}</span>)</> : ' (12 شريحة)'}.
                الملفات ثابتة ولا يُعاد توليدها تلقائيًا بعد أي تعديل.
              </p>
            </div>
          </div>
          <img
            src={`${base}cover.webp`}
            alt="غلاف عرض تاجر"
            className="w-full rounded-xl border border-border shadow-md"
            width={1024}
            height={576}
          />
        </div>

        <section aria-labelledby="dl-h" className="mt-10">
          <h2 id="dl-h" className="text-xl font-semibold text-primary">اختاري صيغة الملف</h2>
          <p className="mt-1 text-sm text-muted-foreground">كل زر ينزّل ملفًا واحدًا مستقلًا مباشرةً — ليس ملفًا مضغوطًا.</p>

          {isLoading && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Skeleton className="h-60 rounded-xl" />
              <Skeleton className="h-60 rounded-xl" />
            </div>
          )}

          {isError && (
            <div role="alert" className="mt-5 rounded-xl border border-destructive/40 bg-card p-5 text-destructive" data-testid="status-assets-error">
              <p className="flex items-center gap-2 font-semibold"><AlertCircle className="h-5 w-5" /> تعذّر تحميل معلومات الملفات.</p>
              <button type="button" onClick={() => refetch()} disabled={isFetching} data-testid="button-retry-assets" className="mt-3 inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 font-semibold">
                <RotateCcw className="h-4 w-4" /> إعادة المحاولة
              </button>
            </div>
          )}

          {data && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DownloadCard asset={data.files.pptx} kind="pptx" label="PowerPoint قابل للتعديل" hint="يفتح في PowerPoint أو Keynote أو Google Slides." />
              <DownloadCard asset={data.files.pdf} kind="pdf" label="PDF للعرض والطباعة" hint="الأنسب للهاتف والطباعة والمشاركة." />
            </div>
          )}
        </section>

        <section className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/print" data-testid="link-print" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-primary px-5 font-semibold text-primary hover:bg-secondary">
            <Printer className="h-5 w-5" /> طباعة العرض
          </Link>
          <a href={siblingUrl('tager-presentation/slide1')} target="_blank" rel="noopener" data-testid="link-preview" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 font-semibold text-foreground hover:bg-muted">
            <ExternalLink className="h-5 w-5" /> معاينة العرض في المتصفح
          </a>
        </section>
      </main>
    </div>
  );
}
