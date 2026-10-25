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
import { Activity, ArrowDownLeft, ArrowUpLeft, CalendarDays, Clock3, Download, Package, Search, Truck } from 'lucide-react';
import { Button, EmptyState, ErrorBlock, Notice, PageTitle, SectionCard, SelectField, SkeletonRows } from '@/components/app/ui';

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
  const isoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  const rangeInvalid = (from !== '' && !isoDate(from)) || (to !== '' && !isoDate(to)) || Boolean(from && to && from > to);
  const movementsQ = useListInventoryMovements(params, { query: { enabled: !rangeInvalid, queryKey: getListInventoryMovementsQueryKey(params) } });
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
    <PageTitle title="سجل حركة المخزون" subtitle="كل تغيير في رصيد منتجاتك، مرتباً كما حدث." action={<span className="tg-chip tg-chip-lg" data-testid="text-movements-count"><Activity size={15} />{movementsQ.isLoading ? 'جارٍ التحديث' : `${totalMovements.toLocaleString('ar-EG')} حركة`}</span>} />

    <div className="mb-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
      <SectionCard title="سجل الحركات" sub="ابحث أو صفِّ الحركات حسب النوع والتاريخ." titleId="movement-history-title" icon={<CalendarDays size={19} />} headerExtra={<>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <span className="sr-only">البحث باسم المنتج</span><Search className="absolute right-3 top-[14px] text-[#5a6b61]" size={16} />
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="ابحث باسم المنتج..." data-testid="input-movement-search" className="tg-input has-icon-r" />
            </label>
            <label><span className="sr-only">تصفية حسب النوع</span><select value={type} onChange={event => { setType(event.target.value as ListInventoryMovementsType | ''); setPage(1); }} data-testid="filter-movement-type" className="tg-input">
              <option value="">كل أنواع الحركة</option><option value="opening">رصيد افتتاحي</option><option value="sale">بيع</option><option value="supply">توريد</option><option value="adjustment">تسوية</option>
            </select></label>
            <label className="relative"><span className="sr-only">من تاريخ</span><span className="absolute right-3 top-[15px] text-[10px] text-[#5a6b61]">من</span><input type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); setPage(1); }} aria-label="من تاريخ" data-testid="filter-movement-from" className="tg-input has-icon-r text-xs" /></label>
            <label className="relative"><span className="sr-only">إلى تاريخ</span><span className="absolute right-3 top-[15px] text-[10px] text-[#5a6b61]">إلى</span><input type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} aria-label="إلى تاريخ" data-testid="filter-movement-to" className="tg-input has-icon-r text-xs" /></label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[#5a6b61]">التصدير يشمل كل النتائج المطابقة ضمن الفترة، وليس الصفحة الحالية.</span>
            <Button secondary testId="button-export-movements" onClick={downloadExport} disabled={isExporting || rangeInvalid || (!from && !to)}><Download size={14} />{isExporting ? 'جارٍ تجهيز الملف...' : 'تصدير الفترة إلى CSV'}</Button>
          </div>
          {!from && !to && <p className="mb-0 mt-2 text-[11px] text-[#5a6b61]">اختر تاريخ البداية أو النهاية لتفعيل التصدير.</p>}
          {exportError && <Notice kind="err" className="mt-3" testId="status-export-movements-error">{exportError}</Notice>}
          {filtersActive && <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#5a6b61]">
            <span data-testid="text-filter-summary">نتائج البحث تتحدث تلقائياً</span><Button secondary testId="button-clear-movement-filters" onClick={clearFilters}>مسح عوامل التصفية</Button>
          </div>}

        </>}>
        <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(125px,.8fr)_minmax(135px,.9fr)_minmax(170px,1fr)] gap-4 bg-[#f4f1e6] px-5 py-3 text-[10px] font-bold text-[#5a6b61] sm:grid">
          <span>المنتج والتفاصيل</span><span>نوع الحركة والكمية</span><span>الرصيد قبل ← بعد</span><span>التاريخ والمرجع</span>
        </div>
        {rangeInvalid ? <div className="p-5"><Notice kind="err" testId="status-movement-range-error">أدخل تاريخين صحيحين، وتاريخ البداية يسبق النهاية أو يساويه، لعرض الحركات.</Notice></div> :
          movementsQ.isLoading ? <SkeletonRows count={4} label="جارٍ تحميل سجل الحركات" testId="status-movements-loading" /> :
          movementsQ.isError ? <ErrorBlock bare testId="status-movements-error" retryTestId="button-retry-movements" title="تعذر تحميل سجل الحركات" body="تحقق من اتصالك ثم حاول مرة أخرى." retry={() => movementsQ.refetch()} /> :
          movements.length ? <div className="divide-y divide-[#ece7d6]" data-testid="list-inventory-movements">{movements.map(movement => <MovementRow key={movement.id} movement={movement} />)}</div> :
          <EmptyState testId="state-movements-empty" title={filtersActive ? 'لا توجد حركات مطابقة' : 'سجل المخزون يبدأ من هنا'} body={filtersActive ? 'جرّب كلمة بحث مختلفة أو غيّر النوع والفترة المحددة.' : 'ستظهر هنا أرصدة البداية والمبيعات والتوريدات والتسويات المسجلة.'} action={filtersActive ? <Button secondary testId="button-empty-clear-filters" onClick={clearFilters}>عرض كل الحركات</Button> : undefined} />}
        {!rangeInvalid && !movementsQ.isLoading && !movementsQ.isError && totalMovements > 0 && <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece7d6] px-5 py-3" aria-label="صفحات سجل الحركات" data-testid="pagination-inventory-movements">
          <span className="text-xs text-[#5a6b61]">الصفحة {page.toLocaleString('ar-EG')} من {pageCount.toLocaleString('ar-EG')} · {totalMovements.toLocaleString('ar-EG')} حركة</span>
          <div className="flex gap-2">
            <Button secondary testId="button-newer-movements" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1}>الأحدث</Button>
            <Button secondary testId="button-older-movements" onClick={() => setPage(current => Math.min(pageCount, current + 1))} disabled={page >= pageCount}>الأقدم</Button>
          </div>
        </nav>}
      </SectionCard>

      <SectionCard as="aside" className="xl:sticky xl:top-[92px]" title="تسجيل توريد" sub="أضف الكمية الواردة إلى رصيد منتج." titleId="supply-form-title" icon={<ArrowDownLeft size={19} />}>
        <form onSubmit={submitSupply} className="grid gap-4 p-5">
          <SelectField label="المنتج" required value={productId} onChange={event => updateSupplyField(() => setProductId(event.target.value))} disabled={productsQ.isLoading || productsQ.isError || products.length === 0 || createSupply.isPending} data-testid="select-supply-product">
            <option value="">{productsQ.isLoading ? 'جارٍ تحميل المنتجات...' : products.length ? 'اختر المنتج' : 'لا توجد منتجات متاحة'}</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} · الرصيد {product.quantity}</option>)}
          </SelectField>
          {productsQ.isError && <p className="-mt-2 text-xs text-[#8d2f29]" role="alert" data-testid="status-supply-products-error">تعذر تحميل قائمة المنتجات.</p>}
          <SelectField label="المورد (اختياري)" value={supplierId} onChange={event => updateSupplyField(() => setSupplierId(event.target.value))} disabled={suppliersQ.isLoading || suppliersQ.isError || createSupply.isPending} data-testid="select-supply-supplier">
            <option value="">{suppliersQ.isLoading ? 'جارٍ تحميل الموردين...' : 'بدون تحديد مورد'}</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </SelectField>
          {suppliersQ.isError && <p className="-mt-2 text-xs text-[#8d2f29]" role="alert" data-testid="status-supply-suppliers-error">تعذر تحميل الموردين؛ يمكنك متابعة التوريد بدون تحديد مورد.</p>}
          <label className="tg-label">الكمية الواردة
            <span className="relative"><input type="number" min="1" step="1" required value={quantity} onChange={event => updateSupplyField(() => setQuantity(event.target.value))} placeholder="مثال: ١٢" disabled={createSupply.isPending} data-testid="input-supply-quantity" className="tg-input has-suffix" /><span className="absolute left-3 top-[14px] text-xs font-medium text-[#5a6b61]">قطعة</span></span>
          </label>
          <label className="tg-label">سبب التوريد
            <textarea required maxLength={500} rows={3} value={reason} onChange={event => updateSupplyField(() => setReason(event.target.value))} placeholder="مثال: استلام طلبية الأسبوع" disabled={createSupply.isPending} data-testid="input-supply-reason" className="tg-input resize-y leading-6" />
            <span className="text-left text-[10px] font-normal text-[#5a6b61]" dir="ltr" data-testid="text-supply-reason-length">{reason.length}/500</span>
          </label>
          {formError && <Notice kind="err" testId="status-supply-error">{formError}</Notice>}
          {notice && <Notice kind="ok" testId="status-supply-success">{notice}</Notice>}
          <Button type="submit" testId="button-submit-supply" disabled={createSupply.isPending || productsQ.isLoading || products.length === 0}><ArrowDownLeft size={17} />{createSupply.isPending ? 'جارٍ تسجيل التوريد...' : 'تسجيل التوريد'}</Button>
          <p className="m-0 text-center text-[11px] leading-5 text-[#5a6b61]" data-testid="text-supply-note">سيُحدَّث رصيد المنتج ويُضاف التوريد إلى سجل الحركات.</p>
        </form>
      </SectionCard>
    </div>
  </div>;
}

export default InventoryMovementsPage;
