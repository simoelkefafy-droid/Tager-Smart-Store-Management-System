import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardQueryKey,
  getListInventoryMovementsQueryKey,
  getListProductsQueryKey,
  exportInventoryMovements,
  useCreateInventorySupply,
  useListInventoryMovements,
  useListProducts,
  useListSuppliers,
  type InventoryMovement,
  type ExportInventoryMovementsParams,
  type ListInventoryMovementsParams,
  type ListInventoryMovementsType,
} from '@workspace/api-client-react';
import { Activity, AlertTriangle, ArrowDownLeft, ArrowUpLeft, CalendarDays, Check, Clock3, Download, Package, RotateCw, Search, Truck } from 'lucide-react';

const PAGE_SIZE = 25;

const movementLabels: Record<InventoryMovement['type'], string> = {
  opening: 'رصيد افتتاحي',
  sale: 'بيع',
  supply: 'توريد',
  adjustment: 'تسوية',
};

const movementStyles: Record<InventoryMovement['type'], string> = {
  opening: 'bg-[#eef1f4] text-[#526477]',
  sale: 'bg-[#fff0ed] text-[#8d2f29]',
  supply: 'bg-[#e6efd0] text-[#1f6b45]',
  adjustment: 'bg-[#f5f0e5] text-[#8a6c2f]',
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MovementIcon({ type }: { type: InventoryMovement['type'] }) {
  if (type === 'supply') return <ArrowDownLeft size={17} />;
  if (type === 'sale') return <ArrowUpLeft size={17} />;
  if (type === 'adjustment') return <Activity size={17} />;
  return <Package size={17} />;
}

function LoadingRows() {
  return <div className="divide-y divide-[#ece7d6] p-5" role="status" data-testid="status-movements-loading">
    <span className="sr-only">جارٍ تحميل سجل الحركات</span>
    {[0, 1, 2, 3].map(row => <div key={row} className="flex animate-pulse items-center gap-4 py-5 first:pt-1">
      <div className="h-10 w-10 rounded-2xl bg-[#ece7d6]" />
      <div className="flex-1 space-y-2"><div className="h-3 w-1/3 rounded bg-[#ece7d6]" /><div className="h-3 w-1/2 rounded bg-[#f3f4f0]" /></div>
      <div className="hidden h-8 w-24 rounded bg-[#f3f4f0] sm:block" />
    </div>)}
  </div>;
}

function MovementRow({ movement }: { movement: InventoryMovement }) {
  const incoming = movement.type === 'supply' || movement.type === 'opening' || (movement.type === 'adjustment' && movement.balanceAfter >= movement.balanceBefore);
  return <article className="grid gap-4 px-4 py-4 transition-colors hover:bg-[#f7f3e7] sm:grid-cols-[minmax(220px,1.5fr)_minmax(125px,.8fr)_minmax(135px,.9fr)_minmax(170px,1fr)] sm:items-center sm:px-5" data-testid={`row-movement-${movement.id}`}>
    <div className="flex min-w-0 items-start gap-3">
      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${movementStyles[movement.type]}`}><MovementIcon type={movement.type} /></div>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-[#14261d]" data-testid={`text-movement-product-${movement.id}`}>{movement.productName}</div>
        <div className="mt-1 truncate text-xs text-[#5a6b61]" data-testid={`text-movement-reason-${movement.id}`}>{movement.reason || 'بدون تفاصيل إضافية'}</div>
        {movement.supplierName && <div className="mt-1 flex items-center gap-1 text-[11px] text-[#5a6b61]"><Truck size={12} />{movement.supplierName}</div>}
      </div>
    </div>
    <div className="flex items-center justify-between gap-3 sm:block">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${movementStyles[movement.type]}`} data-testid={`text-movement-type-${movement.id}`}>{movementLabels[movement.type]}</span>
      <span className={`text-sm font-bold sm:mt-1 sm:block ${incoming ? 'text-[#1f6b45]' : 'text-[#8d2f29]'}`} data-testid={`text-movement-quantity-${movement.id}`}>
        {incoming ? '+' : '−'}{movement.quantity.toLocaleString('ar-EG')} قطعة
      </span>
    </div>
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#f4f1e6] px-3 py-2 text-xs sm:block sm:bg-transparent sm:p-0">
      <span className="text-[#5a6b61] sm:hidden">الرصيد قبل وبعد</span>
      <div className="flex items-center gap-2 font-semibold text-[#2c4337]" dir="ltr" data-testid={`text-movement-balances-${movement.id}`}>
        <span>{movement.balanceBefore.toLocaleString('ar-EG')}</span><span className="text-[#5a6b61]">←</span><span className="font-bold text-[#14261d]">{movement.balanceAfter.toLocaleString('ar-EG')}</span>
      </div>
      <div className="mt-1 hidden text-[10px] text-[#5a6b61] sm:block">قبل الحركة <span className="mx-1">·</span> بعد الحركة</div>
    </div>
    <div className="flex items-center gap-2 text-xs text-[#5a6b61]" data-testid={`text-movement-date-${movement.id}`}><Clock3 size={14} /><time dateTime={movement.createdAt}>{formatDate(movement.createdAt)}</time>{movement.saleId !== null && <span className="mr-auto rounded-md bg-[#fff0ed] px-2 py-1 text-[10px] font-bold text-[#8d2f29]">بيع #{movement.saleId}</span>}</div>
  </article>;
}

export function InventoryMovementsPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<ListInventoryMovementsType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef<string | null>(null);
  const exportParams = useMemo<ExportInventoryMovementsParams>(() => ({
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(type ? { type } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }), [search, type, from, to]);
  const params = useMemo<ListInventoryMovementsParams>(() => ({
    ...exportParams,
    page,
    pageSize: PAGE_SIZE,
  }), [exportParams, page]);
  const movementsQ = useListInventoryMovements(params);
  const productsQ = useListProducts();
  const suppliersQ = useListSuppliers();
  const createSupply = useCreateInventorySupply();
  const movements = movementsQ.data?.items || [];
  const totalMovements = movementsQ.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalMovements / PAGE_SIZE));
  const products = productsQ.data || [];
  const suppliers = suppliersQ.data || [];
  const filtersActive = Boolean(search || type || from || to);
  const updateSupplyField = (update: () => void) => {
    requestId.current = null;
    setFormError('');
    update();
  };

  const submitSupply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setNotice('');
    const selectedProduct = Number(productId);
    const amount = Number(quantity);
    if (!productId || !Number.isInteger(selectedProduct) || selectedProduct < 1) {
      setFormError('اختر المنتج المراد توريده.');
      return;
    }
    if (!Number.isInteger(amount) || amount < 1) {
      setFormError('أدخل كمية صحيحة لا تقل عن قطعة واحدة.');
      return;
    }
    const cleanReason = reason.trim();
    if (!cleanReason || cleanReason.length > 500) {
      setFormError('اكتب سبب التوريد بحد أقصى ٥٠٠ حرف.');
      return;
    }
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try {
      await createSupply.mutateAsync({
        data: {
          productId: selectedProduct,
          supplierId: supplierId ? Number(supplierId) : null,
          quantity: amount,
          reason: cleanReason,
          requestId: requestId.current,
        },
      });
      await Promise.all([
        client.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() }),
        client.invalidateQueries({ queryKey: getListProductsQueryKey() }),
        client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }),
        client.invalidateQueries({ queryKey: ['/api/reports'] }),
      ]);
      requestId.current = null;
      setQuantity('');
      setReason('');
      setNotice('تم تسجيل التوريد وتحديث رصيد المنتج.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر تسجيل التوريد. تحقق من البيانات ثم أعد المحاولة.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setType('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const downloadExport = async () => {
    setExportError('');
    setIsExporting(true);
    try {
      const csv = await exportInventoryMovements(exportParams);
      const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-movements_${from || 'start'}_${to || 'end'}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('تعذر تصدير الحركات. تحقق من الاتصال ثم حاول مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  return <div className="fade-up" dir="rtl">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#1f6b45]"><Activity size={15} /> دفتر المخزون</div>
        <h1 className="m-0 text-[25px] font-bold tracking-tight text-[#14261d]">سجل حركة المخزون</h1>
        <p className="mb-0 mt-1 text-sm text-[#5a6b61]">كل تغيير في رصيد منتجاتك، مرتباً كما حدث.</p>
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-[#dce8df] bg-[#edf5ef] px-3 py-2 text-xs font-semibold text-[#1f6b45]" data-testid="text-movements-count">
        <Activity size={15} />{movementsQ.isLoading ? 'جارٍ التحديث' : `${totalMovements.toLocaleString('ar-EG')} حركة`}
      </div>
    </div>

    <div className="mb-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
      <section className="panel overflow-hidden" aria-labelledby="movement-history-title">
        <div className="border-b border-[#ece7d6] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div><h2 id="movement-history-title" className="m-0 text-base font-bold text-[#14261d]">سجل الحركات</h2><p className="mb-0 mt-1 text-xs text-[#5a6b61]">ابحث أو صفِّ الحركات حسب النوع والتاريخ.</p></div>
            <div className="hidden h-9 w-9 items-center justify-center rounded-2xl bg-[#f3f5f0] text-[#72817c] sm:flex"><CalendarDays size={17} /></div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <span className="sr-only">البحث باسم المنتج</span><Search className="absolute right-3 top-3 text-[#5a6b61]" size={16} />
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="ابحث باسم المنتج..." data-testid="input-movement-search" className="h-11 w-full rounded-2xl border border-[#cfc8b1] bg-white pr-9 pl-3 text-sm outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20" />
            </label>
            <label><span className="sr-only">تصفية حسب النوع</span><select value={type} onChange={event => { setType(event.target.value as ListInventoryMovementsType | ''); setPage(1); }} data-testid="filter-movement-type" className="h-11 w-full rounded-2xl border border-[#cfc8b1] bg-white px-3 text-sm text-[#2c4337] outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20">
              <option value="">كل أنواع الحركة</option><option value="opening">رصيد افتتاحي</option><option value="sale">بيع</option><option value="supply">توريد</option><option value="adjustment">تسوية</option>
            </select></label>
            <label className="relative"><span className="sr-only">من تاريخ</span><span className="absolute right-3 top-3 text-[10px] text-[#5a6b61]">من</span><input type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); setPage(1); }} aria-label="من تاريخ" data-testid="filter-movement-from" className="h-11 w-full rounded-2xl border border-[#cfc8b1] bg-white px-3 pr-10 text-xs text-[#2c4337] outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20" /></label>
            <label className="relative"><span className="sr-only">إلى تاريخ</span><span className="absolute right-3 top-3 text-[10px] text-[#5a6b61]">إلى</span><input type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} aria-label="إلى تاريخ" data-testid="filter-movement-to" className="h-11 w-full rounded-2xl border border-[#cfc8b1] bg-white px-3 pr-10 text-xs text-[#2c4337] outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20" /></label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[#5a6b61]">التصدير يشمل كل النتائج المطابقة ضمن الفترة، وليس الصفحة الحالية.</span>
            <button type="button" onClick={downloadExport} disabled={isExporting || (!from && !to)} data-testid="button-export-movements" className="inline-flex h-9 items-center gap-2 rounded-2xl border border-[#dce8df] bg-white px-3 text-xs font-bold text-[#1f6b45] hover:bg-[#f5f9f5] disabled:cursor-not-allowed disabled:opacity-50">
              <Download size={14} />{isExporting ? 'جارٍ تجهيز الملف...' : 'تصدير الفترة إلى CSV'}
            </button>
          </div>
          {!from && !to && <p className="mb-0 mt-2 text-[11px] text-[#5a6b61]">اختر تاريخ البداية أو النهاية لتفعيل التصدير.</p>}
          {exportError && <p className="mb-0 mt-2 text-xs text-[#8d2f29]" role="alert" data-testid="status-export-movements-error">{exportError}</p>}
          {filtersActive && <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#5a6b61]">
            <span data-testid="text-filter-summary">نتائج البحث تتحدث تلقائياً</span><button type="button" onClick={clearFilters} data-testid="button-clear-movement-filters" className="font-bold text-[#1f6b45] hover:underline">مسح عوامل التصفية</button>
          </div>}
        </div>
        <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(125px,.8fr)_minmax(135px,.9fr)_minmax(170px,1fr)] gap-4 bg-[#f4f1e6] px-5 py-3 text-[10px] font-bold text-[#5a6b61] sm:grid">
          <span>المنتج والتفاصيل</span><span>نوع الحركة والكمية</span><span>الرصيد قبل ← بعد</span><span>التاريخ والمرجع</span>
        </div>
        {movementsQ.isLoading ? <LoadingRows /> :
          movementsQ.isError ? <div className="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center" data-testid="status-movements-error">
            <span className="mb-3 rounded-full bg-[#fbe9e4] p-3 text-[#b94d47]"><AlertTriangle size={20} /></span><h3 className="m-0 text-base font-bold text-[#14261d]">تعذر تحميل سجل الحركات</h3><p className="mt-2 text-sm text-[#5a6b61]">تحقق من اتصالك ثم حاول مرة أخرى.</p>
            <button type="button" onClick={() => movementsQ.refetch()} data-testid="button-retry-movements" className="mt-2 inline-flex h-10 items-center gap-2 rounded-2xl border border-[#d6d0bb] bg-white px-4 text-sm font-bold text-[#2c4337] hover:bg-[#f4f1e6]"><RotateCw size={15} />إعادة المحاولة</button>
          </div> :
          movements.length ? <div className="divide-y divide-[#ece7d6]" data-testid="list-inventory-movements">{movements.map(movement => <MovementRow key={movement.id} movement={movement} />)}</div> :
          <div className="flex min-h-60 flex-col items-center justify-center px-6 py-10 text-center" data-testid="state-movements-empty">
            <span className="mb-3 rounded-2xl bg-[#e6efd0] p-3 text-[#1f6b45]"><Package size={22} /></span>
            <h3 className="m-0 text-base font-bold text-[#14261d]">{filtersActive ? 'لا توجد حركات مطابقة' : 'سجل المخزون يبدأ من هنا'}</h3>
            <p className="mb-0 mt-2 max-w-sm text-sm leading-6 text-[#5a6b61]">{filtersActive ? 'جرّب كلمة بحث مختلفة أو غيّر النوع والفترة المحددة.' : 'ستظهر هنا أرصدة البداية والمبيعات والتوريدات والتسويات المسجلة.'}</p>
            {filtersActive && <button type="button" onClick={clearFilters} data-testid="button-empty-clear-filters" className="mt-4 text-sm font-bold text-[#1f6b45] hover:underline">عرض كل الحركات</button>}
          </div>}
        {!movementsQ.isLoading && !movementsQ.isError && totalMovements > 0 && <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece7d6] px-5 py-3" aria-label="صفحات سجل الحركات" data-testid="pagination-inventory-movements">
          <span className="text-xs text-[#5a6b61]">الصفحة {page.toLocaleString('ar-EG')} من {pageCount.toLocaleString('ar-EG')} · {totalMovements.toLocaleString('ar-EG')} حركة</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1} data-testid="button-newer-movements" className="h-9 rounded-lg border border-[#d6d0bb] bg-white px-3 text-xs font-bold text-[#2c4337] hover:bg-[#f4f1e6] disabled:cursor-not-allowed disabled:opacity-45">الأحدث</button>
            <button type="button" onClick={() => setPage(current => Math.min(pageCount, current + 1))} disabled={page >= pageCount} data-testid="button-older-movements" className="h-9 rounded-lg border border-[#d6d0bb] bg-white px-3 text-xs font-bold text-[#2c4337] hover:bg-[#f4f1e6] disabled:cursor-not-allowed disabled:opacity-45">الأقدم</button>
          </div>
        </nav>}
      </section>

      <aside className="panel overflow-hidden xl:sticky xl:top-[92px]" aria-labelledby="supply-form-title">
        <div className="border-b border-[#ece7d6] bg-[#f8faf7] px-5 py-4">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e6f1e9] text-[#1f6b45]"><ArrowDownLeft size={19} /></span><div><h2 id="supply-form-title" className="m-0 text-base font-bold text-[#14261d]">تسجيل توريد</h2><p className="mb-0 mt-1 text-xs text-[#5a6b61]">أضف الكمية الواردة إلى رصيد منتج.</p></div></div>
        </div>
        <form onSubmit={submitSupply} className="grid gap-4 p-5">
          <label className="grid gap-2 text-sm font-semibold text-[#2c4337]">المنتج
             <select required value={productId} onChange={event => updateSupplyField(() => setProductId(event.target.value))} disabled={productsQ.isLoading || productsQ.isError || products.length === 0 || createSupply.isPending} data-testid="select-supply-product" className="h-11 rounded-2xl border border-[#cfc8b1] bg-white px-3 text-sm outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20 disabled:cursor-not-allowed disabled:opacity-60">
              <option value="">{productsQ.isLoading ? 'جارٍ تحميل المنتجات...' : products.length ? 'اختر المنتج' : 'لا توجد منتجات متاحة'}</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} · الرصيد {product.quantity}</option>)}
            </select>
          </label>
          {productsQ.isError && <p className="-mt-2 text-xs text-[#8d2f29]" role="alert" data-testid="status-supply-products-error">تعذر تحميل قائمة المنتجات.</p>}
          <label className="grid gap-2 text-sm font-semibold text-[#2c4337]">المورد <span className="text-[11px] font-normal text-[#5a6b61]">اختياري</span>
             <select value={supplierId} onChange={event => updateSupplyField(() => setSupplierId(event.target.value))} disabled={suppliersQ.isLoading || suppliersQ.isError || createSupply.isPending} data-testid="select-supply-supplier" className="h-11 rounded-2xl border border-[#cfc8b1] bg-white px-3 text-sm outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20 disabled:cursor-not-allowed disabled:opacity-60">
              <option value="">{suppliersQ.isLoading ? 'جارٍ تحميل الموردين...' : 'بدون تحديد مورد'}</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          {suppliersQ.isError && <p className="-mt-2 text-xs text-[#8d2f29]" role="alert" data-testid="status-supply-suppliers-error">تعذر تحميل الموردين؛ يمكنك متابعة التوريد بدون تحديد مورد.</p>}
          <label className="grid gap-2 text-sm font-semibold text-[#2c4337]">الكمية الواردة
             <span className="relative"><input type="number" min="1" step="1" required value={quantity} onChange={event => updateSupplyField(() => setQuantity(event.target.value))} placeholder="مثال: ١٢" disabled={createSupply.isPending} data-testid="input-supply-quantity" className="h-11 w-full rounded-2xl border border-[#cfc8b1] bg-white px-3 pl-14 text-sm outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20 disabled:opacity-60" /><span className="absolute left-3 top-3 text-xs font-medium text-[#5a6b61]">قطعة</span></span>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-[#2c4337]">سبب التوريد
             <textarea required maxLength={500} rows={3} value={reason} onChange={event => updateSupplyField(() => setReason(event.target.value))} placeholder="مثال: استلام طلبية الأسبوع" disabled={createSupply.isPending} data-testid="input-supply-reason" className="resize-y rounded-2xl border border-[#cfc8b1] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20 disabled:opacity-60" />
            <span className="text-left text-[10px] font-normal text-[#5a6b61]" dir="ltr" data-testid="text-supply-reason-length">{reason.length}/500</span>
          </label>
          {formError && <div className="rounded-2xl border border-[#f0d4d1] bg-[#fbe9e4] px-3 py-2.5 text-sm leading-6 text-[#8d2f29]" role="alert" data-testid="status-supply-error">{formError}</div>}
          {notice && <div className="flex items-center gap-2 rounded-2xl border border-[#d6e7da] bg-[#edf6ef] px-3 py-2.5 text-sm font-semibold text-[#1f6b45]" role="status" data-testid="status-supply-success"><Check size={16} />{notice}</div>}
          <button type="submit" disabled={createSupply.isPending || productsQ.isLoading || products.length === 0} data-testid="button-submit-supply" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#17402d] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0f2f20] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55">
            {createSupply.isPending ? <><span className="h-4 w-4 animate-pulse rounded-full border-2 border-white/40 border-t-white" />جارٍ تسجيل التوريد...</> : <><ArrowDownLeft size={17} />تسجيل التوريد</>}
          </button>
          <p className="m-0 text-center text-[11px] leading-5 text-[#5a6b61]" data-testid="text-supply-note">سيُحدَّث رصيد المنتج ويُضاف التوريد إلى سجل الحركات.</p>
        </form>
      </aside>
    </div>
  </div>;
}

export default InventoryMovementsPage;
