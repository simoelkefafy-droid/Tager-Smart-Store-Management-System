import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListSuppliersQueryKey, useCreateSupplier, useDeleteSupplier, useListSuppliers, useUpdateSupplier,
  type Supplier,
} from '@workspace/api-client-react';
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { Button, Dialog, EmptyState, ErrorBlock, Field, LoadingBlock, Notice, PageTitle, getErrorMessage, useApiOptions } from '@/components/app/ui';

const avatarTones = ['bg-[#eaf2ed] text-[#1f6b45]', 'bg-[#edf1f6] text-[#426181]', 'bg-[#f5efe4] text-[#9b7842]'];

export function SupplierPage() {
  const api = useApiOptions(); const client = useQueryClient(); const q = useListSuppliers(api);
  const create = useCreateSupplier(api); const update = useUpdateSupplier(api); const remove = useDeleteSupplier(api);
  const suppliers = q.data || []; const [form, setForm] = useState<Supplier | null | false>(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [search, setSearch] = useState('');
  const filtered = suppliers.filter(s => `${s.name} ${s.phone} ${s.products}`.toLowerCase().includes(search.toLowerCase()));
  const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const data = { name: String(f.get('name')), phone: String(f.get('phone')), products: String(f.get('products')) }; setError(''); try { if (form) await update.mutateAsync({ id: form.id, data }); else await create.mutateAsync({ data }); await client.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setNotice(form ? 'تم تحديث بيانات المورد.' : 'تمت إضافة المورد بنجاح.'); setForm(false); } catch (e) { setError(getErrorMessage(e)); } };
  const deleteItem = async (s: Supplier) => { if (!window.confirm(`حذف المورد «${s.name}»؟`)) return; try { await remove.mutateAsync({ id: s.id }); await client.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setNotice('تم حذف المورد.'); setError(''); } catch (e) { setError(getErrorMessage(e)); } };
  if (q.isLoading) return <LoadingBlock />;
  if (q.isError) return <ErrorBlock retry={() => q.refetch()} />;
  const saving = create.isPending || update.isPending;
  return <div className="fade-up">
    <PageTitle title="الموردون" subtitle="بيانات الموردين والأصناف التي يوفرونها." action={<Button testId="button-add-supplier" onClick={() => { setForm(null); setError(''); setNotice(''); }}><Plus size={16} />إضافة مورد</Button>} />
    {notice && <Notice kind="ok" testId="status-supplier-success" className="mb-4">{notice}</Notice>}
    <div className="mb-5"><label className="relative block max-w-md"><span className="sr-only">ابحث عن مورد</span><Search size={17} className="absolute right-3 top-[14px] text-[#5a6b61]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مورد..." data-testid="input-search-suppliers" className="tg-input has-icon-r" /></label></div>
    {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((s, index) => <article key={s.id} className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-md" data-testid={`card-supplier-${s.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold ${avatarTones[index % avatarTones.length]}`}><Users size={19} /></div><div className="min-w-0"><h2 className="tg-display m-0 truncate text-base font-bold text-[#14261d]">{s.name}</h2><div className="mt-1 text-xs text-[#5a6b61]">مورد رقم {s.id}</div></div></div>
        <div className="flex shrink-0"><button type="button" onClick={() => { setForm(s); setError(''); }} data-testid={`button-edit-supplier-${s.id}`} aria-label="تعديل المورد" className="tg-icon-btn tg-icon-btn-neutral"><Pencil size={15} /></button><button type="button" onClick={() => deleteItem(s)} data-testid={`button-delete-supplier-${s.id}`} aria-label="حذف المورد" className="tg-icon-btn"><Trash2 size={15} /></button></div>
      </div>
      <div className="mt-5 grid gap-3 border-t border-[#ece7d6] pt-4">
        <div className="flex items-center gap-2 text-sm text-[#2c4337]"><span className="text-xs font-semibold text-[#5a6b61]">الهاتف</span><span dir="ltr" className="tg-num">{s.phone || '—'}</span></div>
        <div><div className="mb-2 text-xs font-semibold text-[#5a6b61]">الأصناف التي يوفرها</div><div className="rounded-lg bg-[#f4f1e6] px-3 py-2 text-sm text-[#2c4337]">{s.products || 'لم تُحدد أصناف بعد'}</div></div>
      </div>
    </article>)}</div> : <div className="panel"><EmptyState title={search ? 'لا توجد نتائج مطابقة' : 'سجّل موردي متجرك'} body={search ? 'جرّب البحث باسم أو رقم هاتف مختلف.' : 'احتفظ ببيانات التواصل والأصناف التي يوفرها كل مورد.'} action={!search ? <Button testId="button-empty-add-supplier" onClick={() => setForm(null)}><Plus size={15} />إضافة مورد</Button> : undefined} /></div>}
    {error && form === false && <Notice kind="err" testId="status-supplier-error" className="mt-3">{error}</Notice>}
    {form !== false && <Dialog title={form ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'} onClose={() => setForm(false)}><form onSubmit={submit} className="grid gap-4"><Field label="اسم المورد" name="name" required defaultValue={form?.name || ''} data-testid="input-supplier-name" /><Field label="رقم الهاتف" name="phone" type="tel" defaultValue={form?.phone || ''} data-testid="input-supplier-phone" /><Field label="الأصناف التي يوفرها" name="products" required defaultValue={form?.products || ''} placeholder="مثال: مشروبات، وجبات خفيفة" data-testid="input-supplier-products" />{error && <Notice kind="err" testId="status-supplier-error">{error}</Notice>}<div className="flex gap-2"><Button type="submit" testId="button-save-supplier" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ المورد'}</Button><Button secondary testId="button-cancel-supplier" onClick={() => setForm(false)}>إلغاء</Button></div></form></Dialog>}
  </div>;
}
