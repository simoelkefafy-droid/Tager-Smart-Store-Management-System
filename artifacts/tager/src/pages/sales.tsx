import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardQueryKey, getGetReportsQueryKey, getListInventoryMovementsQueryKey,
  getListProductsQueryKey, getListSalesQueryKey,
  useCreateSale, useListProducts, useListSales, type Sale,
} from '@workspace/api-client-react';
import { Check, Plus, ShoppingCart, X } from 'lucide-react';
import { Button, EGP, EmptyState, ErrorBlock, Field, LoadingBlock, Notice, PageTitle, SectionCard, SelectField, getErrorMessage, useApiOptions } from '@/components/app/ui';

function SalesTable({ sales }: { sales: Sale[] }) {
  return <div className="overflow-x-auto"><table className="responsive-table w-full text-right text-sm"><thead className="bg-[#f4f1e6] text-[11px] font-semibold text-[#5a6b61]"><tr><th className="px-5 py-3">رقم العملية</th><th className="px-4 py-3">المنتجات</th><th className="px-4 py-3">التاريخ</th><th className="px-5 py-3">الإجمالي</th></tr></thead><tbody className="divide-y divide-[#ece7d6]">{sales.map(s => <tr key={s.id} data-testid={`row-sale-${s.id}`} className="hover:bg-[#f7f3e7]"><td data-label="رقم العملية" className="px-5 py-4 font-bold">#{s.id}</td><td data-label="المنتجات" className="px-4 py-4 text-[#5a6b61]">{s.items?.length || 0} أصناف</td><td data-label="التاريخ" className="px-4 py-4 text-[#5a6b61]">{new Date(s.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td data-label="الإجمالي" className="px-5 py-4 font-bold"><EGP amount={s.total} /></td></tr>)}</tbody></table></div>;
}

export function SalesPage() {
  const api = useApiOptions(); const client = useQueryClient();
  const productsQ = useListProducts(api); const salesQ = useListSales(undefined, api); const createSale = useCreateSale(api);
  const products = productsQ.data || []; const sales = salesQ.data || [];
  const [cart, setCart] = useState<{ productId: number; quantity: number }[]>([]);
  const [selected, setSelected] = useState(''); const [qty, setQty] = useState(1); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const total = cart.reduce((sum, item) => sum + (products.find(p => p.id === item.productId)?.sellingPrice || 0) * item.quantity, 0);
  const add = () => {
    const product = products.find(p => p.id === Number(selected));
    if (!product) return;
    const already = cart.find(i => i.productId === product.id)?.quantity || 0;
    if (qty < 1 || already + qty > product.quantity) { setError('الكمية المطلوبة أكبر من المخزون المتاح.'); return; }
    setError(''); setCart(old => { const existing = old.find(i => i.productId === product.id); return existing ? old.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i) : [...old, { productId: product.id, quantity: qty }]; });
  };
  const checkout = async () => {
    setError(''); setNotice('');
    try { await createSale.mutateAsync({ data: { items: cart } }); setCart([]); setNotice('تم تسجيل عملية البيع وتحديث المخزون.'); await Promise.all([client.invalidateQueries({ queryKey: getListSalesQueryKey() }), client.invalidateQueries({ queryKey: getListProductsQueryKey() }), client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }), client.invalidateQueries({ queryKey: getGetReportsQueryKey() }), client.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() })]); }
    catch (e) { setError(getErrorMessage(e)); }
  };
  if (productsQ.isLoading || salesQ.isLoading) return <LoadingBlock />;
  if (productsQ.isError || salesQ.isError) return <ErrorBlock retry={() => { productsQ.refetch(); salesQ.refetch(); }} />;
  return <div className="fade-up">
    <PageTitle title="المبيعات" subtitle="سجّل المبيعات بسهولة وراجع سجل عمليات متجرك." />
    <div className="grid items-start gap-5 xl:grid-cols-[.85fr_1.4fr]">
      <SectionCard title="عملية بيع جديدة" sub="أضف المنتجات وحدد الكمية" icon={<ShoppingCart size={19} />} titleId="sale-new-title">
        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_100px_auto]">
            <SelectField label="المنتج" value={selected} onChange={e => setSelected(e.target.value)} data-testid="select-sale-product"><option value="">اختر منتجاً</option>{products.map(p => <option key={p.id} value={p.id} disabled={p.quantity < 1}>{p.name} — {p.quantity} متاح</option>)}</SelectField>
            <Field label="الكمية" type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} data-testid="input-sale-quantity" />
            <div className="flex items-end"><Button testId="button-add-to-sale" onClick={add} secondary><Plus size={16} />أضف</Button></div>
          </div>
          <div className="my-5 border-t border-[#ece7d6]" />
          {cart.length ? <div className="space-y-3">{cart.map(item => { const p = products.find(x => x.id === item.productId)!; return <div key={item.productId} className="flex items-center justify-between gap-2 rounded-2xl bg-[#f4f1e6] p-3" data-testid={`cart-item-${p.id}`}><div className="min-w-0"><div className="truncate text-sm font-bold text-[#14261d]">{p.name}</div><div className="mt-1 text-xs text-[#5a6b61]">{item.quantity} × <EGP amount={p.sellingPrice} /></div></div><div className="flex shrink-0 items-center gap-1"><b className="text-sm"><EGP amount={item.quantity * p.sellingPrice} /></b><button type="button" aria-label="إزالة المنتج" onClick={() => setCart(old => old.filter(i => i.productId !== item.productId))} data-testid={`button-remove-cart-${p.id}`} className="tg-icon-btn"><X size={16} /></button></div></div>; })}</div> : <div className="rounded-2xl border border-dashed border-[#d6d0bb] py-7 text-center text-sm text-[#5a6b61]" data-testid="state-cart-empty">لم تُضف منتجات إلى هذه العملية</div>}
          <div className="mt-5 flex items-center justify-between border-t border-[#ece7d6] pt-4"><span className="text-sm font-semibold text-[#5a6b61]">الإجمالي</span><b className="text-xl"><EGP amount={total} /></b></div>
          {error && <Notice kind="err" testId="status-sale-error" className="mt-3">{error}</Notice>}
          {notice && <Notice kind="ok" testId="status-sale-success" className="mt-3">{notice}</Notice>}
          <Button testId="button-complete-sale" onClick={checkout} disabled={!cart.length || createSale.isPending}><Check size={16} />{createSale.isPending ? 'جارٍ تسجيل البيع...' : 'تأكيد عملية البيع'}</Button>
        </div>
      </SectionCard>
      <SectionCard title="سجل المبيعات" sub="العمليات الأخيرة المسجلة" titleId="sale-history-title">
        {sales.length ? <SalesTable sales={sales} /> : <EmptyState title="لا توجد عمليات بيع" body="ستظهر هنا كل عملية تسجلها في متجرك." />}
      </SectionCard>
    </div>
  </div>;
}
