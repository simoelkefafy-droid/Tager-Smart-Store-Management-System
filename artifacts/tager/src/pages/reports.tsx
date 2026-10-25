import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { getGetReportsQueryKey, useGetReports, useListProducts, type Report } from '@workspace/api-client-react';
import { Activity, CalendarDays, Download, Filter, Package, ShoppingBag, Wallet } from 'lucide-react';
import { Button, EmptyState, ErrorBlock, Field, LoadingBlock, Notice, PageTitle, SectionCard, SelectField, StatCard } from '@/components/app/ui';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const TZ = 'Africa/Cairo';
const MAX_DAYS = 366;

function cairoToday() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const g = (t: string) => p.find(x => x.type === t)?.value || '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;
function validate(from: string, to: string): string {
  if (!isDate(from) || !isDate(to)) return 'أدخل تاريخي البداية والنهاية بشكل صحيح.';
  if (from > to) return 'تاريخ البداية يجب أن يسبق تاريخ النهاية أو يساويه.';
  if (daysBetween(from, to) > MAX_DAYS) return `أقصى مدة للتقرير ${MAX_DAYS.toLocaleString('ar-EG')} يوماً.`;
  return '';
}
const fmtNum = (n: number) => n.toLocaleString('ar-EG', { maximumFractionDigits: 2 });
const fmtDate = (s: string, long = false) => new Date(`${s.slice(0, 10)}T12:00:00Z`).toLocaleDateString('ar-EG', { timeZone: 'UTC', day: 'numeric', month: long ? 'long' : 'short', ...(long ? { year: 'numeric' } : {}) });

function Money({ amount }: { amount: number | null | undefined }) {
  if (amount === null || amount === undefined) return <span className="text-[#8d2f29]" title="التكلفة غير متاحة لبعض البنود">غير متاح</span>;
  return <span dir="ltr" className={`tg-num whitespace-nowrap ${amount < 0 ? 'text-[#8d2f29]' : ''}`}>{fmtNum(amount)} <small className="text-[.8em] text-[#5a6b61]">ج.م</small></span>;
}
type Applied = { from: string; to: string; productId: string };

function csvCell(v: string | number | null | undefined) {
  if (v === null || v === undefined) return '""';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '""';
  let t = v;
  if (/^(?:\s*[=+\-@]|[\t\r\n])/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
}
function exportCsv(r: Report, f: Applied, productName: string) {
  const NA = 'غير متاح';
  const n = (v: number | null) => (v === null ? NA : v);
  const rows: (string | number | null)[][] = [
    ['تقرير تاجر - المبيعات والتكلفة والربح الإجمالي'],
    ['المنطقة الزمنية', r.timeZone || TZ],
    ['من', f.from, 'إلى', f.to],
    ['المنتج', productName],
    ['ملاحظة', 'الخصومات والمرتجعات والمصروفات التشغيلية والضرائب غير مسجلة؛ الربح الإجمالي فقط وليس صافي ربح. التكلفة من تكلفة الوحدة المحفوظة وقت البيع.'],
    [],
    ['المؤشر', 'القيمة'],
    ['إجمالي المبيعات (ج.م)', r.totalSales],
    ['تكلفة البضاعة المباعة (ج.م)', n(r.totalCost)],
    ['الربح الإجمالي (ج.م)', n(r.estimatedProfit)],
    ['عدد عمليات البيع', r.salesCount],
    ['بنود بدون تكلفة', r.missingCostLines],
    ['مبيعات اليوم (ج.م)', r.todaySales], ['عمليات اليوم', r.todayCount],
    ['مبيعات الشهر الحالي (ج.م)', r.monthSales], ['عمليات الشهر الحالي', r.monthCount],
    ['الفترة السابقة من', r.previousFrom], ['الفترة السابقة إلى', r.previousTo],
    ['مبيعات الفترة السابقة (ج.م)', r.previousSales],
    ['نسبة التغير (%)', r.salesChangePercent === null ? 'غير قابلة للحساب' : r.salesChangePercent],
    [],
    ['التاريخ', 'المبيعات (ج.م)', 'التكلفة (ج.م)', 'الربح الإجمالي (ج.م)', 'عدد العمليات'],
    ...r.daily.map(d => [d.date, d.sales, n(d.cost), n(d.profit), d.salesCount]),
    [],
    ['المنتج', 'الكمية', 'الإيراد (ج.م)', 'التكلفة (ج.م)', 'الربح الإجمالي (ج.م)'],
    ...r.products.map(p => [p.name, p.quantity, p.revenue, n(p.cost), n(p.profit)]),
  ];
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `tager-report_${f.from}_${f.to}${f.productId ? `_p${f.productId}` : ''}.csv`;
  document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type TipProps = { active?: boolean; payload?: { name?: string; value?: number | null; color?: string; dataKey?: string }[]; label?: string };
function ChartTip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null;
  return <div dir="rtl" role="status" className="rounded-2xl border border-[#e1e5df] bg-[#fffdf6] p-3 text-xs shadow-lg"><div className="mb-1 font-bold">{label ? fmtDate(label, true) : ''}</div>{payload.map(p => <div key={p.dataKey} className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm" style={{ background: p.color }} />{p.name}: <Money amount={p.value ?? null} /></div>)}</div>;
}

export function ReportsPage() {
  const today = cairoToday();
  const monthStart = `${today.slice(0, 8)}01`;
  const init: Applied = { from: monthStart, to: today, productId: '' };
  const [from, setFrom] = useState(init.from); const [to, setTo] = useState(init.to); const [productId, setProductId] = useState('');
  const [applied, setApplied] = useState<Applied>(init);
  const pendingErr = validate(from, to);
  const appliedErr = validate(applied.from, applied.to);
  const params = useMemo(() => ({ from: applied.from, to: applied.to, ...(applied.productId ? { productId: Number(applied.productId) } : {}) }), [applied]);
  const q = useGetReports(params, { query: { enabled: !appliedErr, queryKey: getGetReportsQueryKey(params) } });
  const productsQ = useListProducts();
  const products = productsQ.data || [];
  const productName = applied.productId ? (products.find(p => String(p.id) === applied.productId)?.name || `منتج #${applied.productId}`) : 'كل المنتجات';
  const report = q.isError ? undefined : q.data;

  const apply = (next: Applied) => { setFrom(next.from); setTo(next.to); setProductId(next.productId); if (!validate(next.from, next.to)) setApplied(next); };
  const submit = (e: FormEvent) => { e.preventDefault(); if (!pendingErr) setApplied({ from, to, productId }); };

  const chartData = useMemo(() => (report?.daily || []).map(d => ({ date: d.date, sales: d.sales, cost: d.cost, profit: d.profit })), [report]);
  const top = useMemo(() => (report?.bestSellers || []).slice(0, 5).map(b => ({ name: b.name, quantity: b.quantity })), [report]);
  const hasNeg = chartData.some(d => (d.profit ?? 0) < 0);
  const dirty = from !== applied.from || to !== applied.to || productId !== applied.productId;

  return <div className="fade-up">
    <PageTitle title="التقارير" subtitle="المبيعات وتكلفة البضاعة والربح الإجمالي بتوقيت القاهرة." action={<Button secondary testId="button-export-report" disabled={!report || q.isFetching} onClick={() => report && exportCsv(report, applied, productName)}><Download size={15} />تصدير CSV</Button>} />

    <form onSubmit={submit} className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1.3fr_auto] lg:items-end">
      <div className="flex items-center gap-2 text-sm font-bold text-[#2c4337] lg:self-center"><CalendarDays size={18} className="text-[#1f6b45]" />الفلاتر</div>
      <Field label="من تاريخ" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} data-testid="input-report-from" />
      <Field label="إلى تاريخ" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} data-testid="input-report-to" />
      <SelectField label="المنتج" value={productId} onChange={e => setProductId(e.target.value)} data-testid="select-report-product" disabled={productsQ.isLoading}><option value="">كل المنتجات</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectField>
      <Button type="submit" testId="button-apply-report-filter" disabled={!!pendingErr}><Filter size={15} />تطبيق</Button>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-5">
        <span className="text-xs text-[#5a6b61]">اختيار سريع:</span>
        <button type="button" data-testid="button-range-today" onClick={() => apply({ from: today, to: today, productId })} className="tg-pill">اليوم</button>
        <button type="button" data-testid="button-range-month" onClick={() => apply({ from: monthStart, to: today, productId })} className="tg-pill">الشهر الحالي</button>
        {pendingErr && <span className="text-xs text-[#8d2f29]" role="alert" data-testid="status-date-error">{pendingErr}</span>}
        {productsQ.isError && <span className="text-xs text-[#8d2f29]">تعذر تحميل قائمة المنتجات.</span>}
        {dirty && !pendingErr && <span className="text-xs text-[#9b7842]" data-testid="status-pending-filters">لديك تغييرات لم تُطبّق بعد.</span>}
      </div>
    </form>

    <Notice kind="warn" testId="notice-gross-profit" className="mb-5">المعروض هو <b>الربح الإجمالي</b> (المبيعات − تكلفة البضاعة المباعة) وليس صافي ربح: الخصومات والمرتجعات والمصروفات التشغيلية والضرائب غير مسجلة حالياً. التكلفة مأخوذة من تكلفة الوحدة المحفوظة وقت البيع (متوسط مرجّح للمشتريات)، لا من سعر الشراء الحالي.</Notice>

    {appliedErr ? <div className="panel"><EmptyState title="الفلاتر غير صالحة" body={appliedErr} /></div>
      : q.isLoading ? <LoadingBlock label="جارٍ تحميل التقرير" />
      : q.isError || !report ? <ErrorBlock title="تعذر تحميل التقرير" body="تحقق من الفترة والاتصال ثم أعد المحاولة." retry={() => q.refetch()} />
      : <div className={`grid gap-5 transition-opacity ${q.isFetching ? 'opacity-60' : ''}`}>
        <div className="text-xs text-[#5a6b61]" data-testid="text-applied-filters">التقرير المعروض: {fmtDate(applied.from, true)} – {fmtDate(applied.to, true)} · {productName} · {report.timeZone || TZ}</div>
        {report.missingCostLines > 0 && <Notice kind="err" testId="warning-missing-cost">{report.missingCostLines.toLocaleString('ar-EG')} بند بيع بدون تكلفة محفوظة. لن نفترض تكلفتها صفراً، لذا تظهر التكلفة والربح «غير متاح» حيث تتأثر.</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard compact icon={CalendarDays} label="اليوم (القاهرة)" testId="metric-today" value={<Money amount={report.todaySales} />} note={`${report.todayCount.toLocaleString('ar-EG')} عملية · مستقل عن الفترة المختارة`} accent="bg-[#e8f2ec] text-[#1f6b45]" />
          <StatCard compact icon={CalendarDays} label="الشهر الحالي" testId="metric-month" value={<Money amount={report.monthSales} />} note={`${report.monthCount.toLocaleString('ar-EG')} عملية · مستقل عن الفترة المختارة`} accent="bg-[#eaf0f6] text-[#385a7c]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard compact icon={Wallet} label="مبيعات الفترة" testId="metric-sales" value={<Money amount={report.totalSales} />} note="إجمالي قيمة البيع" accent="bg-[#e8f2ec] text-[#1f6b45]" />
          <StatCard compact icon={Package} label="تكلفة البضاعة المباعة" testId="metric-cost" value={<Money amount={report.totalCost} />} note={report.totalCost === null ? 'غير مكتملة بسبب بنود بلا تكلفة' : 'من تكلفة الوحدة وقت البيع'} accent="bg-[#f3eee4] text-[#927442]" />
          <StatCard compact icon={Activity} label="الربح الإجمالي" testId="metric-profit" value={<Money amount={report.estimatedProfit} />} note="قبل المصروفات والضرائب — ليس صافي ربح" accent="bg-[#edf1f6] text-[#426181]" />
          <StatCard compact icon={ShoppingBag} label="عدد عمليات البيع" testId="metric-count" value={report.salesCount.toLocaleString('ar-EG')} note="خلال الفترة" accent="bg-[#f5efe4] text-[#9b7842]" />
        </div>

        <div className="panel p-5" data-testid="section-comparison"><h2 className="m-0 text-base font-bold">مقارنة بالفترة السابقة</h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><div className="text-xs text-[#5a6b61]">الفترة الحالية ({fmtDate(applied.from)} – {fmtDate(applied.to)})</div><div className="mt-1 font-bold"><Money amount={report.totalSales} /></div></div>
            <div><div className="text-xs text-[#5a6b61]">الفترة السابقة ({fmtDate(report.previousFrom)} – {fmtDate(report.previousTo)})</div><div className="mt-1 font-bold" data-testid="text-previous-sales"><Money amount={report.previousSales} /></div></div>
            <div><div className="text-xs text-[#5a6b61]">نسبة التغير</div><div className="mt-1 font-bold" data-testid="text-change-percent">{report.salesChangePercent === null ? <span className="text-[#5a6b61]">غير قابلة للحساب (مبيعات الفترة السابقة صفر)</span> : <span dir="ltr" className={report.salesChangePercent < 0 ? 'text-[#8d2f29]' : 'text-[#1f6b45]'}>{report.salesChangePercent > 0 ? '+' : ''}{fmtNum(report.salesChangePercent)}%</span>}</div></div>
          </div>
        </div>

        <SectionCard title="المبيعات والتكلفة والربح الإجمالي يومياً" sub="الأيام بلا تكلفة مكتملة تظهر فجوة في خطي التكلفة والربح" testId="chart-daily-sales">
          {report.salesCount === 0 ? <EmptyState title="لا توجد مبيعات في هذه الفترة" body="غيّر الفترة أو المنتج، أو سجّل مبيعات جديدة." /> :
            <div className="h-[300px] p-3" dir="ltr" role="img" aria-label="رسم بياني يومي للمبيعات والتكلفة والربح الإجمالي، التفاصيل في الجدول أدناه">
              <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#ece7d6" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v: string) => fmtDate(v)} tick={{ fontSize: 10, fill: '#5a6b61' }} minTickGap={16} />
                <YAxis tickFormatter={(v: number) => v.toLocaleString('ar-EG')} tick={{ fontSize: 10, fill: '#5a6b61' }} width={56} />
                {hasNeg && <ReferenceLine y={0} stroke="#a9433f" strokeDasharray="3 3" />}
                <Tooltip content={<ChartTip />} />
                <Legend formatter={(v: string) => <span className="text-xs text-[#2c4337]">{v}</span>} />
                <Bar dataKey="sales" name="المبيعات" fill="#4c8b68" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line dataKey="cost" name="التكلفة" stroke="#c08a3e" strokeWidth={2} dot={chartData.length < 15} connectNulls={false} />
                <Line dataKey="profit" name="الربح الإجمالي" stroke="#385a7c" strokeWidth={2} dot={chartData.length < 15} connectNulls={false} />
              </ComposedChart></ResponsiveContainer>
            </div>}
          {report.daily.length > 0 && <details className="border-t border-[#ece7d6] px-5 py-3 text-sm"><summary className="cursor-pointer text-xs font-bold text-[#1f6b45]" data-testid="toggle-daily-table">عرض البيانات اليومية كجدول</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-right text-sm"><thead className="bg-[#f4f1e6] text-[11px] text-[#5a6b61]"><tr><th className="px-3 py-2">التاريخ</th><th className="px-3 py-2">المبيعات</th><th className="px-3 py-2">التكلفة</th><th className="px-3 py-2">الربح الإجمالي</th><th className="px-3 py-2">العمليات</th></tr></thead><tbody className="divide-y divide-[#ece7d6]">{report.daily.map(d => <tr key={d.date} data-testid={`row-daily-${d.date}`}><td className="px-3 py-2">{fmtDate(d.date, true)}</td><td className="px-3 py-2"><Money amount={d.sales} /></td><td className="px-3 py-2"><Money amount={d.cost} /></td><td className="px-3 py-2"><Money amount={d.profit} /></td><td className="px-3 py-2">{d.salesCount.toLocaleString('ar-EG')}</td></tr>)}</tbody></table></div></details>}
        </SectionCard>

        <div className="grid gap-5 xl:grid-cols-[.8fr_1.4fr]">
          <SectionCard title="الأعلى مبيعاً (أفضل ٥)" sub="ترتيب حسب الكمية المباعة" testId="section-top5">
            {top.length ? <><div className="h-[220px] p-3" dir="ltr" role="img" aria-label="ترتيب أفضل خمسة منتجات حسب الكمية"><ResponsiveContainer width="100%" height="100%"><BarChart data={top} layout="vertical" margin={{ left: 0, right: 16 }}><CartesianGrid stroke="#ece7d6" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#5a6b61' }} /><YAxis type="category" dataKey="name" orientation="right" width={100} tick={{ fontSize: 11, fill: '#2c4337' }} /><Tooltip formatter={(v: number) => [`${v.toLocaleString('ar-EG')} قطعة`, 'الكمية']} /><Bar dataKey="quantity" name="الكمية" fill="#17402d" radius={[4, 0, 0, 4]} maxBarSize={22} /></BarChart></ResponsiveContainer></div>
              <ol className="m-0 divide-y divide-[#ece7d6] p-0">{report.bestSellers.slice(0, 5).map((b, i) => <li key={b.productId} className="flex items-center gap-3 px-5 py-3 text-sm" data-testid={`row-bestseller-${b.productId}`}><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e6efd0] text-xs font-bold text-[#1f6b45]">{(i + 1).toLocaleString('ar-EG')}</span><span className="min-w-0 flex-1 truncate font-bold">{b.name}</span><span className="text-xs text-[#5a6b61]">{b.quantity.toLocaleString('ar-EG')} قطعة</span><span className="text-xs font-bold"><Money amount={b.revenue} /></span></li>)}</ol></>
              : <EmptyState title="لا توجد بيانات كافية" body="سيظهر الترتيب بعد تسجيل مبيعات في الفترة." />}
          </SectionCard>
          <SectionCard title="تقرير المنتجات الكامل" sub="الإيراد والتكلفة والربح الإجمالي لكل منتج" testId="section-products">
            {report.products.length ? <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-right text-sm"><thead className="bg-[#f4f1e6] text-[11px] text-[#5a6b61]"><tr><th className="px-5 py-3">المنتج</th><th className="px-3 py-3">الكمية</th><th className="px-3 py-3">الإيراد</th><th className="px-3 py-3">التكلفة</th><th className="px-5 py-3">الربح الإجمالي</th></tr></thead><tbody className="divide-y divide-[#ece7d6]">{report.products.map(p => <tr key={p.productId} className="hover:bg-[#f7f3e7]" data-testid={`row-report-product-${p.productId}`}><td className="px-5 py-3 font-bold">{p.name}</td><td className="px-3 py-3">{p.quantity.toLocaleString('ar-EG')}</td><td className="px-3 py-3"><Money amount={p.revenue} /></td><td className="px-3 py-3"><Money amount={p.cost} /></td><td className="px-5 py-3 font-bold"><Money amount={p.profit} /></td></tr>)}</tbody></table></div>
              : <EmptyState title="لا توجد منتجات مباعة" body="لم تُسجل مبيعات لهذه الفلاتر." />}
          </SectionCard>
        </div>
      </div>}
  </div>;
}
