import { useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardQueryKey, getGetReportsQueryKey, getListInventoryMovementsQueryKey,
  getListProductsQueryKey, getListPurchasesQueryKey,
  useCreatePurchase, useListProducts, useListPurchases, useListSuppliers,
} from '@workspace/api-client-react';
import { Check, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, ErrorBlock, Notice, PageTitle, SectionCard, SkeletonRows } from '@/components/app/ui';

type Line = { key: number; productId: string; quantity: string; unitCost: string };
const money = (n: number) => <span dir="ltr" className="tg-num whitespace-nowrap">{Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small className="text-[.8em] text-[#5a6b61]">ج.م</small></span>;
let keySeq = 1;
const newLine = (): Line => ({ key: keySeq++, productId: '', quantity: '', unitCost: '' });
const toCents = (v: string) => Math.round(Number(v) * 100);

export function PurchasesPage() {
  const client = useQueryClient();
  const purchasesQ = useListPurchases(); const productsQ = useListProducts(); const suppliersQ = useListSuppliers();
  const create = useCreatePurchase();
  const products = productsQ.data || []; const suppliers = suppliersQ.data || []; const purchases = purchasesQ.data || [];
  const [supplierId, setSupplierId] = useState(''); const [reference, setReference] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const requestId = useRef<string | null>(null);
  const touch = () => { requestId.current = null; setError(''); };
  const setLine = (key: number, patch: Partial<Line>) => { touch(); setLines(ls => ls.map(l => l.key === key ? { ...l, ...patch } : l)); };
  const totalCents = lines.reduce((s, l) => { const q = Number(l.quantity), c = toCents(l.unitCost); return Number.isInteger(q) && q > 0 && c >= 0 ? s + q * c : s; }, 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setNotice('');
    if (!supplierId) return setError('اختر المورد الذي استلمت منه البضاعة.');
    const items = [];
    for (const [i, l] of lines.entries()) {
      const q = Number(l.quantity); const cost = Number(l.unitCost);
      if (!l.productId) return setError(`اختر المنتج في السطر ${i + 1}.`);
      if (!Number.isInteger(q) || q < 1) return setError(`الكمية في السطر ${i + 1} يجب أن تكون رقماً صحيحاً موجباً.`);
      if (!(cost >= 0) || !/^\d+(\.\d{1,2})?$/.test(l.unitCost.trim())) return setError(`تكلفة الوحدة في السطر ${i + 1} يجب أن تكون رقماً بحد أقصى خانتين عشريتين.`);
      items.push({ productId: Number(l.productId), quantity: q, unitCost: toCents(l.unitCost) / 100 });
    }
    if (new Set(items.map(i => i.productId)).size !== items.length) return setError('كل منتج يُسجَّل مرة واحدة في الفاتورة؛ اجمع الكميات في سطر واحد.');
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      const ref = reference.trim();
      await create.mutateAsync({ data: { supplierId: Number(supplierId), requestId: requestId.current, ...(ref ? { reference: ref } : {}), items } });
      requestId.current = null;
      await Promise.all([getListPurchasesQueryKey(), getListProductsQueryKey(), getGetDashboardQueryKey(), getGetReportsQueryKey(), getListInventoryMovementsQueryKey()].map(k => client.invalidateQueries({ queryKey: [k[0]] })));
      setLines([newLine()]); setReference(''); setNotice('تم استلام الفاتورة وإضافة الكميات للمخزون وتحديث متوسط التكلفة.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تسجيل الفاتورة. يمكنك إعادة المحاولة بأمان دون تكرارها.'); }
  };

  const busy = create.isPending;
  return <div className="fade-up">
    <PageTitle title="المشتريات" subtitle="سجّل فواتير الاستلام من الموردين لتدخل الكميات للمخزون بتكلفتها الحقيقية." />
    <Notice kind="info" testId="text-purchase-explainer" className="mb-5">عند حفظ الفاتورة تُضاف كل الكميات إلى المخزون دفعة واحدة؛ إما أن تُسجَّل الفاتورة كاملة أو لا يُسجَّل شيء. يُعاد حساب <b>سعر الشراء</b> لكل منتج كمتوسط مرجّح: (الرصيد الحالي × التكلفة الحالية + الكمية الواردة × تكلفة الوحدة) ÷ الرصيد الجديد. المبيعات السابقة تحتفظ بتكلفتها وقت البيع، فلا تتغير أرباحك القديمة.</Notice>
    <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_1fr]">
      <form onSubmit={submit} className="panel grid gap-4 p-5 sm:p-6" data-testid="form-purchase">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e6efd0] text-[#1f6b45]"><PackagePlus size={19} /></span><div><h2 className="tg-display m-0 text-lg font-bold">فاتورة استلام جديدة</h2><p className="m-0 mt-1 text-xs text-[#5a6b61]">أضف سطراً لكل منتج مستلم</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="tg-label">المورد
            <select value={supplierId} onChange={e => { touch(); setSupplierId(e.target.value); }} disabled={busy || suppliersQ.isLoading} data-testid="select-purchase-supplier" className="tg-input">
              <option value="">{suppliersQ.isLoading ? 'جارٍ التحميل...' : suppliers.length ? 'اختر المورد' : 'أضف مورداً أولاً'}</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
          <label className="tg-label">رقم الفاتورة / مرجع <span className="sr-only">اختياري</span>
            <input value={reference} maxLength={200} onChange={e => { touch(); setReference(e.target.value); }} placeholder="اختياري" disabled={busy} data-testid="input-purchase-reference" className="tg-input" /></label>
        </div>
        {(productsQ.isError || suppliersQ.isError) && <p className="m-0 text-xs text-[#8d2f29]" role="alert">تعذر تحميل المنتجات أو الموردين. <button type="button" className="font-bold underline" onClick={() => { productsQ.refetch(); suppliersQ.refetch(); }}>إعادة المحاولة</button></p>}
        <div className="grid gap-3">
          {lines.map((l, i) => { const q = Number(l.quantity), c = toCents(l.unitCost); const lt = Number.isInteger(q) && q > 0 && c >= 0 ? q * c / 100 : 0; return <div key={l.key} className="grid gap-2 rounded-2xl bg-[#f4f1e6] p-3 sm:grid-cols-[1.6fr_.7fr_.9fr_auto] sm:items-end" data-testid={`row-purchase-line-${i}`}>
            <label className="tg-label tg-label-sm">المنتج<select value={l.productId} onChange={e => setLine(l.key, { productId: e.target.value })} disabled={busy || productsQ.isLoading} data-testid={`select-purchase-product-${i}`} className="tg-input"><option value="">{productsQ.isLoading ? 'جارٍ التحميل...' : 'اختر منتجاً'}</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · الرصيد {p.quantity}</option>)}</select></label>
            <label className="tg-label tg-label-sm">الكمية<input type="number" min="1" step="1" inputMode="numeric" value={l.quantity} onChange={e => setLine(l.key, { quantity: e.target.value })} disabled={busy} data-testid={`input-purchase-quantity-${i}`} className="tg-input" /></label>
            <label className="tg-label tg-label-sm">تكلفة الوحدة (ج.م)<input type="number" min="0" step="0.01" inputMode="decimal" value={l.unitCost} onChange={e => setLine(l.key, { unitCost: e.target.value })} disabled={busy} data-testid={`input-purchase-cost-${i}`} className="tg-input" /></label>
            <div className="flex items-center justify-between gap-2 sm:h-11"><span className="text-xs font-bold sm:hidden" data-testid={`text-purchase-line-total-${i}`}>{money(lt)}</span><button type="button" aria-label="حذف السطر" disabled={busy || lines.length === 1} onClick={() => { touch(); setLines(ls => ls.filter(x => x.key !== l.key)); }} data-testid={`button-remove-purchase-line-${i}`} className="tg-icon-btn"><Trash2 size={16} /></button></div>
          </div>; })}
          <Button secondary testId="button-add-purchase-line" disabled={busy || lines.length >= 100} onClick={() => { touch(); setLines(ls => [...ls, newLine()]); }}><Plus size={15} />إضافة سطر</Button>
        </div>
        <div className="flex items-center justify-between border-t border-[#ece7d6] pt-4"><span className="text-sm font-semibold text-[#627080]">إجمالي الفاتورة</span><b className="text-xl" data-testid="text-purchase-total">{money(totalCents / 100)}</b></div>
        {error && <Notice kind="err" testId="status-purchase-error">{error}</Notice>}
        {notice && <Notice kind="ok" testId="status-purchase-success">{notice}</Notice>}
        <Button type="submit" testId="button-submit-purchase" disabled={busy || !products.length || !suppliers.length}><Check size={16} />{busy ? 'جارٍ تسجيل الاستلام...' : 'تأكيد استلام الفاتورة'}</Button>
      </form>
      <SectionCard title="سجل المشتريات" sub="الفواتير المستلمة وتفاصيل أصنافها">
        {purchasesQ.isLoading ? <SkeletonRows label="جارٍ تحميل سجل المشتريات" testId="status-purchases-loading" />
          : purchasesQ.isError ? <ErrorBlock bare testId="status-purchases-error" retryTestId="button-retry-purchases" title="تعذر تحميل سجل المشتريات" body="تحقق من اتصالك ثم أعد المحاولة." retry={() => purchasesQ.refetch()} />
          : purchases.length ? <div className="divide-y divide-[#ece7d6]">{purchases.map(p => <details key={p.id} className="group px-5 py-4" data-testid={`row-purchase-${p.id}`}><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{p.supplierName}{p.reference ? <span className="mr-2 text-xs font-normal text-[#5a6b61]">· {p.reference}</span> : null}</div><div className="mt-1 text-[11px] text-[#5a6b61]">#{p.id} · {new Date(p.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })} · {p.items.length} أصناف</div></div><b className="text-sm">{money(p.total)}</b></summary>
            <div className="mt-3 grid gap-1.5 rounded-2xl bg-[#f4f1e6] p-3 text-xs">{p.items.map(it => <div key={it.productId} className="flex justify-between gap-2"><span className="truncate">{it.productName} — {it.quantity} × {money(it.unitCost)}</span><b>{money(it.lineTotal)}</b></div>)}</div></details>)}</div>
          : <EmptyState testId="state-purchases-empty" title="لا توجد مشتريات بعد" body="سجّل أول فاتورة استلام لتظهر هنا مع تفاصيلها." />}
      </SectionCard>
    </div>
  </div>;
}

export default PurchasesPage;
