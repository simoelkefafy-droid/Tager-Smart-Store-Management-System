import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardQueryKey, getGetReportsQueryKey, getListProductsQueryKey, getListInventoryMovementsQueryKey,
  useCreateProduct, useDeleteProduct, useListProducts, useListSuppliers, useUpdateProduct, type Product,
} from '@workspace/api-client-react';
import { AlertTriangle, Apple, Candy, CupSoda, Filter, Milk, Package, Pencil, Plus, RotateCw, Search, Shirt, SprayCan, Trash2, Wheat, Wrench, type LucideIcon } from 'lucide-react';
import { Button, Dialog, EGP, EmptyState, Field, PageTitle, SelectField, getErrorMessage, useApiOptions } from '@/components/app/ui';

const iconMap: [string[], LucideIcon][] = [
  [['مشروب', 'عصير', 'مياه', 'ماء', 'شاي', 'قهوة'], CupSoda],
  [['ألبان', 'لبن', 'جبن', 'زبادي'], Milk],
  [['خضار', 'فاكهة', 'فواكه', 'طازج'], Apple],
  [['حلويات', 'سناك', 'وجبات', 'شيكولاتة', 'بسكويت'], Candy],
  [['بقالة', 'حبوب', 'أرز', 'مكرونة', 'دقيق', 'مخبوزات'], Wheat],
  [['منظفات', 'تنظيف', 'نظافة', 'عناية'], SprayCan],
  [['ملابس', 'أزياء'], Shirt],
  [['أدوات', 'عدة', 'كهرباء'], Wrench],
];
function categoryIcon(cat: string): LucideIcon {
  const c = cat.trim();
  return iconMap.find(([keys]) => keys.some(k => c.includes(k)))?.[1] || Package;
}
const n = (v: number) => v.toLocaleString('ar-EG');

function ProductCard({ p, onEdit, onDelete }: { p: Product; onEdit: () => void; onDelete: () => void }) {
  const Icon = categoryIcon(p.category);
  const low = p.quantity <= p.minStock;
  const pct = p.minStock > 0 ? Math.min(100, (p.quantity / (p.minStock * 2)) * 100) : (p.quantity > 0 ? 100 : 0);
  return <article data-testid={`row-product-${p.id}`} className={`tg-card flex flex-col gap-4 p-5 !rounded-[24px] ${low ? '!border-[#e3b3a8]' : ''}`}>
    <div className="flex items-start gap-3">
      <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${low ? 'bg-[#fbe9e4] text-[#8d2f29]' : 'bg-[#e6efd0] text-[#17402d]'}`}><Icon size={22} strokeWidth={1.8} /></span>
      <div className="min-w-0 flex-1">
        <h3 className="tg-display m-0 break-words text-base font-bold leading-6 text-[#14261d]">{p.name}</h3>
        <span className="tg-chip mt-1">{p.category}</span>
      </div>
      {low && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#8d2f29] px-2.5 py-1 text-[11px] font-bold text-white"><AlertTriangle size={12} strokeWidth={2} />مخزون منخفض</span>}
    </div>
    <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#e4e0d1] bg-[#e4e0d1] text-sm">
      <div className="bg-[#fffdf6] p-3"><dt className="text-[11px] text-[#5a6b61]">سعر الشراء</dt><dd className="m-0 mt-1 font-bold"><EGP amount={p.purchasePrice} /></dd></div>
      <div className="bg-[#fffdf6] p-3"><dt className="text-[11px] text-[#5a6b61]">سعر البيع</dt><dd className="m-0 mt-1 font-bold"><EGP amount={p.sellingPrice} /></dd></div>
      <div className="bg-[#fffdf6] p-3"><dt className="text-[11px] text-[#5a6b61]">الكمية</dt><dd className={`tg-num m-0 mt-1 font-bold ${low ? 'text-[#8d2f29]' : ''}`}>{n(p.quantity)} قطعة</dd></div>
      <div className="bg-[#fffdf6] p-3"><dt className="text-[11px] text-[#5a6b61]">حد إعادة الطلب</dt><dd className="tg-num m-0 mt-1 font-bold">{n(p.minStock)}</dd></div>
    </dl>
    <div className="h-1.5 overflow-hidden rounded-full bg-[#efeadb]" role="img" aria-label={`الكمية ${p.quantity} مقابل الحد الأدنى ${p.minStock}`}><div className={`h-full rounded-full ${low ? 'bg-[#c0573f]' : 'bg-[#1f6b45]'}`} style={{ width: `${pct}%` }} /></div>
    <div className="flex gap-2">
      <button onClick={onEdit} data-testid={`button-edit-product-${p.id}`} aria-label={`تعديل المنتج ${p.name}`} className="tg-btn tg-btn-secondary flex-1"><Pencil size={16} strokeWidth={1.9} />تعديل</button>
      <button onClick={onDelete} data-testid={`button-delete-product-${p.id}`} aria-label={`حذف المنتج ${p.name}`} className="tg-btn tg-btn-danger !px-4"><Trash2 size={16} strokeWidth={1.9} /><span className="sr-only sm:not-sr-only">حذف</span></button>
    </div>
  </article>;
}

function SkeletonGrid() {
  return <div role="status" data-testid="status-loading"><div className="tg-skel mb-5 h-[74px]" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="tg-skel h-72" />)}</div><span className="sr-only">جارٍ تحميل المنتجات</span></div>;
}

export function ProductPage() {
  const api = useApiOptions(); const client = useQueryClient();
  const q = useListProducts(api); const suppliersQ = useListSuppliers(api);
  const create = useCreateProduct(api); const update = useUpdateProduct(api); const remove = useDeleteProduct(api);
  const products = q.data || []; const suppliers = suppliersQ.data || [];
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('all');
  const [form, setForm] = useState<Product | null | false>(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const categories = [...new Set(products.map(p => p.category.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  const filtered = products.filter(p => (category === 'all' || p.category.trim() === category) && `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: getListProductsQueryKey() }), client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }), client.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }), client.invalidateQueries({ queryKey: [getGetReportsQueryKey()[0]] })]); };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError('');
    const f = new FormData(e.currentTarget);
    const reason = String(f.get('reason') || '').trim();
    const payload = { name: String(f.get('name')), category: String(f.get('category')), purchasePrice: Number(f.get('purchasePrice')), sellingPrice: Number(f.get('sellingPrice')), quantity: Number(f.get('quantity')), minStock: Number(f.get('minStock')), supplierId: f.get('supplierId') ? Number(f.get('supplierId')) : null, ...(reason ? { reason } : {}) };
    try { if (form) await update.mutateAsync({ id: form.id, data: payload }); else await create.mutateAsync({ data: payload }); await refresh(); setNotice(form ? 'تم تحديث بيانات المنتج.' : 'تمت إضافة المنتج بنجاح.'); setForm(false); } catch (err) { setError(getErrorMessage(err)); }
  };
  const deleteItem = async (p: Product) => { if (!window.confirm(`حذف المنتج «${p.name}»؟`)) return; try { await remove.mutateAsync({ id: p.id }); await refresh(); setNotice('تم حذف المنتج.'); setError(''); } catch (e) { setError(getErrorMessage(e)); } };
  if (q.isLoading) return <SkeletonGrid />;
  if (q.isError) return <div className="panel flex min-h-56 flex-col items-center justify-center gap-2 p-8 text-center" data-testid="status-error"><AlertTriangle size={22} strokeWidth={1.9} className="text-[#8d2f29]" /><h3 className="tg-display m-0 text-base font-bold">تعذر تحميل المنتجات</h3><p className="m-0 mb-2 text-sm text-[#5a6b61]">تحقق من اتصالك ثم أعد المحاولة.</p><Button secondary testId="button-retry" onClick={() => q.refetch()}><RotateCw size={16} strokeWidth={1.9} />إعادة المحاولة</Button></div>;
  const filtering = !!search || category !== 'all';
  return <div className="fade-up">
    <PageTitle title="المنتجات والمخزون" subtitle="تابع أصناف متجرك، أسعارها، والكميات المتاحة." action={<Button testId="button-add-product" onClick={() => { setForm(null); setError(''); setNotice(''); }}><Plus size={16} strokeWidth={1.9} />إضافة منتج</Button>} />
    {notice && <div className="tg-notice-ok mb-4" role="status" data-testid="status-product-success">{notice}</div>}
    <div className="panel mb-5 flex flex-wrap items-center gap-3 p-4">
      <label className="relative min-w-[220px] flex-1"><span className="sr-only">بحث</span><Search className="pointer-events-none absolute right-3 top-3.5 text-[#5a6b61]" size={17} strokeWidth={1.9} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن منتج أو فئة..." data-testid="input-search-products" className="tg-input !pr-10" /></label>
      <label className="flex items-center gap-2 text-xs text-[#5a6b61]"><Filter size={15} strokeWidth={1.9} /><select value={category} onChange={e => setCategory(e.target.value)} aria-label="تصفية حسب الفئة" data-testid="filter-product-category" className="tg-input !w-auto"><option value="all">كل الفئات</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <span className="tg-num mr-auto text-xs font-bold text-[#5a6b61]" data-testid="text-products-count">{filtered.length} منتج</span>
    </div>
    {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(p => <ProductCard key={p.id} p={p} onEdit={() => { setForm(p); setError(''); }} onDelete={() => deleteItem(p)} />)}</div>
      : <div className="panel"><EmptyState title={filtering ? 'لا توجد نتائج مطابقة' : 'ابدأ بإضافة منتجاتك'} body={filtering ? 'جرّب كلمة بحث أخرى أو غيّر الفئة المختارة.' : 'أضف أصناف متجرك لتتابع الكميات والأسعار في مكان واحد.'} action={!filtering ? <Button testId="button-empty-add-product" onClick={() => setForm(null)}><Plus size={16} strokeWidth={1.9} />إضافة أول منتج</Button> : undefined} /></div>}
    {error && form === false && <p className="tg-notice-err mt-3" data-testid="status-product-error">{error}</p>}
    {form !== false && <Dialog title={form ? 'تعديل المنتج' : 'إضافة منتج جديد'} onClose={() => setForm(false)}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="اسم المنتج" name="name" required defaultValue={form?.name || ''} data-testid="input-product-name" />
      <Field label="الفئة" name="category" required defaultValue={form?.category || ''} placeholder="اختر فئة موجودة أو اكتب جديدة" list="product-categories" autoComplete="off" data-testid="input-product-category" />
      <datalist id="product-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
      <Field label="سعر الشراء (ج.م)" name="purchasePrice" type="number" min="0" step="0.01" required defaultValue={form?.purchasePrice ?? ''} data-testid="input-product-cost" />
      <Field label="سعر البيع (ج.م)" name="sellingPrice" type="number" min="0" step="0.01" required defaultValue={form?.sellingPrice ?? ''} data-testid="input-product-price" />
      <Field label="الكمية الحالية" name="quantity" type="number" min="0" required defaultValue={form?.quantity ?? 0} data-testid="input-product-quantity" />
      <Field label={form ? 'سبب تسوية الكمية (مطلوب عند تغييرها)' : 'سبب الرصيد الافتتاحي (اختياري)'} name="reason" maxLength={500} defaultValue="" placeholder={form ? 'مثال: جرد فعلي للمخزون' : 'مثال: رصيد بداية التشغيل'} data-testid="input-product-stock-reason" />
      <Field label="حد المخزون الأدنى" name="minStock" type="number" min="0" required defaultValue={form?.minStock ?? 5} data-testid="input-product-min-stock" />
      <SelectField label="المورد" name="supplierId" defaultValue={form?.supplierId || ''} data-testid="select-product-supplier"><option value="">بدون مورد</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</SelectField>
      {error && <div className="tg-notice-err sm:col-span-2" data-testid="status-product-error">{error}</div>}
      <div className="mt-1 flex gap-2 sm:col-span-2"><Button type="submit" testId="button-save-product" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'جارٍ الحفظ...' : 'حفظ المنتج'}</Button><Button secondary testId="button-cancel-product" onClick={() => setForm(false)}>إلغاء</Button></div>
    </form></Dialog>}
  </div>;
}
