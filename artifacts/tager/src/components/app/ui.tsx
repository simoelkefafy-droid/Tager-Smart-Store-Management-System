import { useEffect, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Info, RotateCw, X, type LucideIcon } from 'lucide-react';
import emptyBox from '@/assets/images/empty-box.webp';

export function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="tg-display m-0 text-[26px] font-bold tracking-tight text-[#14261d]">{title}</h1><p className="mb-0 mt-1 text-sm text-[#5a6b61]">{subtitle}</p></div>{action}</div>;
}
export function Button({ children, onClick, secondary = false, danger = false, testId, type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean; danger?: boolean; testId: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`tg-btn ${danger ? 'tg-btn-danger' : secondary ? 'tg-btn-secondary' : ''}`}>{children}</button>;
}
export function LoadingBlock({ label = 'جارٍ تحميل البيانات' }: { label?: string }) {
  return <div className="grid gap-4" role="status" data-testid="status-loading"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="tg-skel h-32" />)}</div><div className="tg-skel h-64" /><span className="sr-only">{label}</span></div>;
}
export function ErrorBlock({ retry, title = 'تعذر تحميل البيانات', body = 'تحقق من اتصالك ثم أعد المحاولة.', testId = 'status-error', retryTestId = 'button-retry', bare = false }: { retry: () => void; title?: string; body?: string; testId?: string; retryTestId?: string; bare?: boolean }) {
  return <div className={`${bare ? '' : 'panel '}flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center`} role="alert" data-testid={testId}><img src={emptyBox} width={160} height={160} alt="" loading="lazy" className="h-24 w-24 object-contain opacity-80" /><AlertTriangle size={20} strokeWidth={1.9} className="text-[#8d2f29]" /><h3 className="tg-display m-0 text-base font-bold">{title}</h3><p className="m-0 mb-2 text-sm text-[#5a6b61]">{body}</p><Button secondary testId={retryTestId} onClick={retry}><RotateCw size={16} strokeWidth={1.9} />إعادة المحاولة</Button></div>;
}
export function EmptyState({ title, body, action, testId = 'state-empty' }: { title: string; body: string; action?: ReactNode; testId?: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center" data-testid={testId}><img src={emptyBox} width={160} height={160} alt="صندوق فارغ" loading="lazy" className="mb-3 h-28 w-28 object-contain" /><h3 className="tg-display m-0 text-base font-bold text-[#14261d]">{title}</h3><p className="mb-4 mt-2 max-w-sm text-sm leading-6 text-[#5a6b61]">{body}</p>{action}</div>;
}
export function EGP({ amount }: { amount: number }) { return <span dir="ltr" className="tg-num whitespace-nowrap">{Number(amount || 0).toLocaleString('ar-EG')} <small className="text-[.8em] text-[#5a6b61]">ج.م</small></span>; }
export function StatCard({ icon: Icon, label, value, note, accent, testId, compact = false }: { icon: LucideIcon; label: string; value: ReactNode; note: ReactNode; accent: string; testId?: string; compact?: boolean }) {
  return <div className="panel metric-card flex flex-col p-5"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent}`}><Icon size={20} strokeWidth={1.9} /></div><div className="text-sm font-semibold text-[#2c4337]">{label}</div></div><div className={`tg-num mt-4 font-bold leading-none tracking-tight text-[#14261d] ${compact ? 'text-[22px]' : 'text-[28px]'}`} data-testid={testId ?? `metric-${label}`}>{value}</div><div className="mt-3 border-t border-dashed border-[#e4e0d1] pt-3 text-xs leading-5 text-[#5a6b61]">{note}</div></div>;
}
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#14261d]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] border border-[#e4e0d1] bg-[#fffdf6] shadow-2xl sm:rounded-[28px]" role="dialog" aria-modal="true" aria-label={title}><div className="flex shrink-0 items-center justify-between border-b border-[#ece7d6] px-5 pb-3 pt-5 sm:px-7 sm:pt-7"><h2 className="tg-display m-0 text-xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="إغلاق" data-testid="button-dialog-close" className="flex h-11 w-11 items-center justify-center rounded-xl text-[#5a6b61] hover:bg-[#efeadb]"><X size={19} strokeWidth={1.9} /></button></div><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7">{children}</div></section></div>, document.body);
}
export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="tg-label">{label}<input {...props} className="tg-input" /></label>;
}
export function SelectField({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="tg-label">{label}<select {...props} className="tg-input">{children}</select></label>;
}
export function getErrorMessage(error: unknown) { return error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ البيانات'; }
export function useApiOptions() { return {}; }

export function SkeletonRows({ count = 3, label = 'جارٍ التحميل', testId = 'status-loading' }: { count?: number; label?: string; testId?: string }) {
  return <div className="grid gap-3 p-5" role="status" data-testid={testId}>{Array.from({ length: count }, (_, i) => <div key={i} className="tg-skel h-16" />)}<span className="sr-only">{label}</span></div>;
}
const noticeIcons = { ok: Check, err: AlertTriangle, info: Info, warn: Info } as const;
export function Notice({ kind, children, testId, className = '' }: { kind: 'ok' | 'err' | 'info' | 'warn'; children: ReactNode; testId?: string; className?: string }) {
  const Icon = noticeIcons[kind];
  return <div className={`tg-notice tg-notice-${kind} ${className}`} role={kind === 'err' ? 'alert' : kind === 'ok' ? 'status' : undefined} data-testid={testId}><Icon size={17} strokeWidth={1.9} className="mt-0.5 shrink-0" /><div className="min-w-0">{children}</div></div>;
}
export function SectionCard({ title, sub, icon, headerExtra, children, testId, as: Tag = 'section', titleId, className = '' }: { title: string; sub: string; icon?: ReactNode; headerExtra?: ReactNode; children: ReactNode; testId?: string; as?: 'section' | 'aside'; titleId?: string; className?: string }) {
  return <Tag className={`panel overflow-hidden ${className}`} data-testid={testId} aria-labelledby={titleId}><div className="border-b border-[#e4e0d1] px-5 py-4"><div className="flex items-center gap-3">{icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e6efd0] text-[#1f6b45]">{icon}</span>}<div className="min-w-0"><h2 id={titleId} className="tg-display m-0 text-base font-bold text-[#14261d]">{title}</h2><p className="mb-0 mt-1 text-xs text-[#5a6b61]">{sub}</p></div></div>{headerExtra}</div>{children}</Tag>;
}
