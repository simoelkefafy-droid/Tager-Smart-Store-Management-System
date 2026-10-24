import { useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardQueryKey, getGetReportsQueryKey, getListInventoryMovementsQueryKey,
  getListProductsQueryKey, getListPurchasesQueryKey,
  useCreatePurchase, useListProducts, useListPurchases, useListSuppliers,
} from '@workspace/api-client-react';
import { AlertTriangle, Check, Info, PackagePlus, Plus, ReceiptText, RotateCw, Trash2 } from 'lucide-react';

type Line = { key: number; productId: string; quantity: string; unitCost: string };
const money = (n: number) => <span dir="ltr" className="whitespace-nowrap">{Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small className="text-[.8em] text-[#778391]">ج.م</small></span>;
const inputCls = 'h-11 w-full rounded-xl border border-[#dfe4df] bg-[#fffefa] px-3 text-sm outline-none focus:border-[#428260] disabled:opacity-60';
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
    <div className="mb-6"><h1 className="m-0 text-[25px] font-bold tracking-tight text-[#1d2d42]">المشتريات</h1><p className="mb-0 mt-1 text-sm text-[#778391]">سجّل فواتير الاستلام من الموردين لتدخل الكميات للمخزون بتكلفتها الحقيقية.</p></div>
    <div className="mb-5 flex gap-3 rounded-2xl border border-[#dce8df] bg-[#f3f8f4] p-4 text-sm leading-7 text-[#38505f]" data-testid="text-purchase-explainer">
      <Info size={18} className="mt-1 shrink-0 text-[#286247]" />
      <div>عند حفظ الفاتورة تُضاف كل الكميات إلى المخزون دفعة واحدة؛ إما أن تُسجَّل الفاتورة كاملة أو لا يُسجَّل شيء. يُعاد حساب <b>سعر الشراء</b> لكل منتج كمتوسط مرجّح: (الرصيد الحالي × التكلفة الحالية + الكمية الواردة × تكلفة الوحدة) ÷ الرصيد الجديد. المبيعات السابقة تحتفظ بتكلفتها وقت البيع، فلا تتغير أرباحك القديمة.</div>
    </div>
    <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_1fr]">
      <form onSubmit={submit} className="panel grid gap-4 p-5 sm:p-6" data-testid="form-purchase">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-[#eaf4ed] p-2.5 text-[#286247]"><PackagePlus size={19} /></span><div><h2 className="m-0 text-lg font-bold">فاتورة استلام جديدة</h2><p className="m-0 mt-1 text-xs text-[#84909a]">أضف سطراً لكل منتج مستلم</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-[#344357]">المورد
            <select value={supplierId} onChange={e => { touch(); setSupplierId(e.target.value); }} disabled={busy || suppliersQ.isLoading} data-testid="select-purchase-supplier" className={inputCls}>
              <option value="">{suppliersQ.isLoading ? 'جارٍ التحميل...' : suppliers.length ? 'اختر المورد' : 'أضف مورداً أولاً'}</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
          <label className="grid gap-2 text-sm font-semibold text-[#344357]">رقم الفاتورة / مرجع <span className="sr-only">اختياري</span>
            <input value={reference} maxLength={200} onChange={e => { touch(); setReference(e.target.value); }} placeholder="اختياري" disabled={busy} data-testid="input-purchase-reference" className={inputCls} /></label>
        </div>
        {(productsQ.isError || suppliersQ.isError) && <p className="m-0 text-xs text-[#a94842]" role="alert">تعذر تحميل المنتجات أو الموردين. <button type="button" className="font-bold underline" onClick={() => { productsQ.refetch(); suppliersQ.refetch(); }}>إعادة المحاولة</button></p>}
        <div className="grid gap-3">
          {lines.map((l, i) => { const q = Number(l.quantity), c = toCents(l.unitCost); const lt = Number.isInteger(q) && q > 0 && c >= 0 ? q * c / 100 : 0; return <div key={l.key} className="grid gap-2 rounded-xl bg-[#f8f9f6] p-3 sm:grid-cols-[1.6fr_.7fr_.9fr_auto] sm:items-end" data-testid={`row-purchase-line-${i}`}>
            <label className="grid gap-1 text-xs font-semibold text-[#5d6b79]">المنتج<select value={l.productId} onChange={e => setLine(l.key, { productId: e.target.value })} disabled={busy || productsQ.isLoading} data-testid={`select-purchase-product-${i}`} className={inputCls}><option value="">{productsQ.isLoading ? 'جارٍ التحميل...' : 'اختر منتجاً'}</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} · الرصيد {p.quantity}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-semibold text-[#5d6b79]">الكمية<input type="number" min="1" step="1" inputMode="numeric" value={l.quantity} onChange={e => setLine(l.key, { quantity: e.target.value })} disabled={busy} data-testid={`input-purchase-quantity-${i}`} className={inputCls} /></label>
            <label className="grid gap-1 text-xs font-semibold text-[#5d6b79]">تكلفة الوحدة (ج.م)<input type="number" min="0" step="0.01" inputMode="decimal" value={l.unitCost} onChange={e => setLine(l.key, { unitCost: e.target.value })} disabled={busy} data-testid={`input-purchase-cost-${i}`} className={inputCls} /></label>
            <div className="flex items-center justify-between gap-2 sm:h-11"><span className="text-xs font-bold sm:hidden" data-testid={`text-purchase-line-total-${i}`}>{money(lt)}</span><button type="button" aria-label="حذف السطر" disabled={busy || lines.length === 1} onClick={() => { touch(); setLines(ls => ls.filter(x => x.key !== l.key)); }} data-testid={`button-remove-purchase-line-${i}`} className="rounded-lg p-2 text-[#929ba2] hover:bg-[#fff0ed] hover:text-[#b44c43] disabled:opacity-40"><Trash2 size={16} /></button></div>
          </div>; })}
          <button type="button" onClick={() => { touch(); setLines(ls => [...ls, newLine()]); }} disabled={busy || lines.length >= 100} data-testid="button-add-purchase-line" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-dashed border-[#bcd2c3] text-sm font-bold text-[#286247] hover:bg-[#f3f8f4] disabled:opacity-50"><Plus size={15} />إضافة سطر</button>
        </div>
        <div className="flex items-center justify-between border-t border-[#edf0eb] pt-4"><span className="text-sm font-semibold text-[#627080]">إجمالي الفاتورة</span><b className="text-xl" data-testid="text-purchase-total">{money(totalCents / 100)}</b></div>
        {error && <div className="flex gap-2 rounded-xl border border-[#f0d4d1] bg-[#fff5f3] p-3 text-sm text-[#a9433f]" role="alert" data-testid="status-purchase-error"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</div>}
        {notice && <div className="flex items-center gap-2 rounded-xl bg-[#eaf4ed] p-3 text-sm font-semibold text-[#286247]" role="status" data-testid="status-purchase-success"><Check size={16} />{notice}</div>}
        <button type="submit" disabled={busy || !products.length || !suppliers.length} data-testid="button-submit-purchase" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#286247] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#204f39] disabled:cursor-not-allowed disabled:opacity-55"><Check size={16} />{busy ? 'جارٍ تسجيل الاستلام...' : 'تأكيد استلام الفاتورة'}</button>
      </form>
      <section className="panel overflow-hidden"><div className="border-b border-[#edf0eb] px-5 py-4"><h2 className="m-0 text-base font-bold">سجل المشتريات</h2><p className="mb-0 mt-1 text-xs text-[#84909a]">الفواتير المستلمة وتفاصيل أصنافها</p></div>
        {purchasesQ.isLoading ? <div className="grid gap-3 p-5" role="status" data-testid="status-purchases-loading">{[0, 1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-[#f0f2ed]" />)}</div>
          : purchasesQ.isError ? <div className="flex flex-col items-center p-8 text-center" data-testid="status-purchases-error"><AlertTriangle size={20} className="mb-2 text-[#b94d47]" /><p className="m-0 text-sm text-[#778391]">تعذر تحميل سجل المشتريات.</p><button type="button" onClick={() => purchasesQ.refetch()} data-testid="button-retry-purchases" className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-[#dfe4df] bg-white px-3 text-sm font-bold"><RotateCw size={14} />إعادة المحاولة</button></div>
          : purchases.length ? <div className="divide-y divide-[#edf0eb]">{purchases.map(p => <details key={p.id} className="group px-5 py-4" data-testid={`row-purchase-${p.id}`}><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{p.supplierName}{p.reference ? <span className="mr-2 text-xs font-normal text-[#778391]">· {p.reference}</span> : null}</div><div className="mt-1 text-[11px] text-[#84909a]">#{p.id} · {new Date(p.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })} · {p.items.length} أصناف</div></div><b className="text-sm">{money(p.total)}</b></summary>
            <div className="mt-3 grid gap-1.5 rounded-xl bg-[#f8f9f6] p-3 text-xs">{p.items.map(it => <div key={it.productId} className="flex justify-between gap-2"><span className="truncate">{it.productName} — {it.quantity} × {money(it.unitCost)}</span><b>{money(it.lineTotal)}</b></div>)}</div></details>)}</div>
          : <div className="flex flex-col items-center px-5 py-10 text-center" data-testid="state-purchases-empty"><span className="mb-3 rounded-2xl bg-[#edf4ef] p-3 text-[#286247]"><ReceiptText size={22} /></span><h3 className="m-0 text-base font-bold">لا توجد مشتريات بعد</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#778391]">سجّل أول فاتورة استلام لتظهر هنا مع تفاصيلها.</p></div>}
      </section>
    </div>
  </div>;
}

export default PurchasesPage;
