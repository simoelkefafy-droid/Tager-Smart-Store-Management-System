import { useState } from 'react';
import type { PresentationAsset } from '@workspace/api-client-react';
import { AlertCircle, CheckCircle2, Download, Loader2, RotateCcw } from 'lucide-react';
import { DownloadError, downloadAsset, formatSize, type Kind } from '@/lib/download';

type State = { s: 'idle' } | { s: 'loading' } | { s: 'done' } | { s: 'error'; msg: string };

export function DownloadCard({
  asset,
  kind,
  label,
  hint,
}: {
  asset: PresentationAsset;
  kind: Kind;
  label: string;
  hint: string;
}) {
  const [state, setState] = useState<State>({ s: 'idle' });

  const run = async () => {
    setState({ s: 'loading' });
    try {
      await downloadAsset(asset, kind);
      setState({ s: 'done' });
    } catch (e) {
      setState({
        s: 'error',
        msg: e instanceof DownloadError ? e.message : 'حدث خطأ غير متوقع أثناء التنزيل. أعيدي المحاولة.',
      });
    }
  };

  const ext = kind === 'pptx' ? 'PPTX' : 'PDF';

  return (
    <div className="flex flex-col rounded-xl border border-card-border bg-card p-5 shadow-sm" data-testid={`card-${kind}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-primary">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
        </div>
        <span dir="ltr" className="rounded-md bg-accent px-2 py-1 font-mono text-xs font-semibold text-accent-foreground">
          .{kind}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-muted-foreground">اسم الملف</dt>
        <dd dir="ltr" className="truncate text-left font-mono text-xs leading-6" data-testid={`text-filename-${kind}`}>{asset.filename}</dd>
        <dt className="text-muted-foreground">الحجم</dt>
        <dd className="text-left">{formatSize(asset.size)}</dd>
      </dl>
      <button
        type="button"
        onClick={run}
        disabled={state.s === 'loading'}
        aria-busy={state.s === 'loading'}
        data-testid={`button-download-${kind}`}
        className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-base font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
      >
        {state.s === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        {state.s === 'loading' ? 'جارٍ تجهيز الملف…' : `تنزيل ${kind === 'pptx' ? 'PowerPoint' : 'PDF'}`}
      </button>
      <div aria-live="polite" className="mt-3 min-h-6 text-sm">
        {state.s === 'done' && (
          <p className="flex items-start gap-2 text-[hsl(150_35%_28%)]" data-testid={`status-done-${kind}`}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            تم تجهيز ملف {ext} وتسليمه للمتصفح للحفظ. راجعي مجلد التنزيلات أو شريط التنزيل في المتصفح.
          </p>
        )}
        {state.s === 'error' && (
          <div className="flex flex-col gap-2 text-destructive" role="alert" data-testid={`status-error-${kind}`}>
            <p className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{state.msg}</p>
            <button type="button" onClick={run} data-testid={`button-retry-${kind}`} className="inline-flex w-fit items-center gap-1 rounded-md border border-destructive/40 px-3 py-1 font-semibold">
              <RotateCcw className="h-4 w-4" /> إعادة المحاولة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
