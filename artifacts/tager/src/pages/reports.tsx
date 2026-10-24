import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { getGetReportsQueryKey, useGetReports, useListProducts, type Report } from '@workspace/api-client-react';
import { Activity, AlertTriangle, BarChart3, CalendarDays, Download, Filter, Info, Package, RotateCw, ShoppingBag, Wallet } from 'lucide-react';
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
const fmtDate = (s: string, long = false) => new Date(`${s}T12:00:00Z`).toLocaleDateString('ar-EG', { timeZone: 'UTC', day: 'numeric', month: long ? 'long' : 'short', ...(long ? { year: 'numeric' } : {}) });

function Money({ amount }: { amount: number | null | undefined }) {
  if (amount === null || amount === undefined) return <span className="text-[#a9433f]" title="التكلفة غير متاحة لبعض البنود">غير متاح</span>;
  return <span dir="ltr" className={`whitespace-nowrap ${amount < 0 ? 'text-[#a9433f]' : ''}`}>{fmtNum(amount)} <small className="text-[.8em] text-[#778391]">ج.م</small></span>;
}
function Btn({ children, onClick, secondary, testId, type = 'button', disabled }: { children: ReactNode; onClick?: () => void; secondary?: boolean; testId: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55 ${secondary ? 'border border-[#dfe4df] bg-white text-[#344357] hover:bg-[#f8f9f6]' : 'bg-[#286247] text-white shadow-sm hover:bg-[#204f39]'}`}>{children}</button>;
}
function Card({ icon: Icon, label, value, note, accent, testId }: { icon: typeof Wallet; label: string; value: ReactNode; note: ReactNode; accent: string; testId: string }) {
  return <div className="panel metric-card p-5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="text-sm text-[#778391]">{label}</div><div className="mt-3 text-[22px] font-bold tracking-tight text-[#1d2d42]" data-testid={testId}>{value}</div></div><div className={`rounded-xl p-3 ${accent}`}><Icon size={19} /></div></div><div className="mt-3 text-xs leading-5 text-[#87919b]">{note}</div></div>;
}
function Section({ title, sub, children, testId }: { title: string; sub: string; children: ReactNode; testId?: string }) {
  return <section className="panel overflow-hidden" data-testid={testId}><div className="border-b border-[#edf0eb] px-5 py-4"><h2 className="m-0 text-base font-bold">{title}</h2><p className="mb-0 mt-1 text-xs text-[#84909a]">{sub}</p></div>{children}</section>;
}
function Empty({ title, body }: { title: string; body: string }) {
  return <div className="flex min-h-44 flex-col items-center justify-center px-5 py-8 text-center" data-testid="state-empty"><div className="mb-3 rounded-2xl bg-[#edf4ef] p-3 text-[#286247]"><BarChart3 size={22} /></div><h3 className="m-0 text-base font-bold text-[#28394d]">{title}</h3><p className="mb-0 mt-2 max-w-sm text-sm leading-6 text-[#778391]">{body}</p></div>;
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
  return <div dir="rtl" role="status" className="rounded-xl border border-[#e1e5df] bg-[#fffefa] p-3 text-xs shadow-lg"><div className="mb-1 font-bold">{label ? fmtDate(label, true) : ''}</div>{payload.map(p => <div key={p.dataKey} className="flex items-center gap-2"><i className="h-2 w-2 rounded-sm" style={{ background: p.color }} />{p.name}: <Money amount={p.value ?? null} /></div>)}</div>;
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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="m-0 text-[25px] font-bold tracking-tight text-[#1d2d42]">التقارير</h1><p className="mb-0 mt-1 text-sm text-[#778391]">المبيعات وتكلفة البضاعة والربح الإجمالي بتوقيت القاهرة.</p></div>
      <Btn secondary testId="button-export-report" disabled={!report || q.isFetching} onClick={() => report && exportCsv(report, applied, productName)}><Download size={15} />تصدير CSV</Btn></div>

    <form onSubmit={submit} className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1.3fr_auto] lg:items-end">
      <div className="flex items-center gap-2 text-sm font-bold text-[#344357] lg:self-center"><CalendarDays size={18} className="text-[#286247]" />الفلاتر</div>
      <label className="grid gap-2 text-sm font-semibold text-[#344357]">من تاريخ<input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} data-testid="input-report-from" className="h-11 rounded-xl border border-[#dfe4df] bg-[#fffefa] px-3 outline-none focus:border-[#428260]" /></label>
      <label className="grid gap-2 text-sm font-semibold text-[#344357]">إلى تاريخ<input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} data-testid="input-report-to" className="h-11 rounded-xl border border-[#dfe4df] bg-[#fffefa] px-3 outline-none focus:border-[#428260]" /></label>
      <label className="grid gap-2 text-sm font-semibold text-[#344357]">المنتج<select value={productId} onChange={e => setProductId(e.target.value)} data-testid="select-report-product" disabled={productsQ.isLoading} className="h-11 rounded-xl border border-[#dfe4df] bg-[#fffefa] px-3 outline-none focus:border-[#428260]"><option value="">كل المنتجات</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <Btn type="submit" testId="button-apply-report-filter" disabled={!!pendingErr}><Filter size={15} />تطبيق</Btn>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-5">
        <span className="text-xs text-[#778391]">اختيار سريع:</span>
        <button type="button" data-testid="button-range-today" onClick={() => apply({ from: today, to: today, productId })} className="rounded-full border border-[#dfe4df] bg-white px-3 py-1.5 text-xs font-bold text-[#344357] hover:bg-[#edf4ef]">اليوم</button>
        <button type="button" data-testid="button-range-month" onClick={() => apply({ from: monthStart, to: today, productId })} className="rounded-full border border-[#dfe4df] bg-white px-3 py-1.5 text-xs font-bold text-[#344357] hover:bg-[#edf4ef]">الشهر الحالي</button>
        {pendingErr && <span className="text-xs text-[#b44c43]" role="alert" data-testid="status-date-error">{pendingErr}</span>}
        {productsQ.isError && <span className="text-xs text-[#b44c43]">تعذر تحميل قائمة المنتجات.</span>}
        {dirty && !pendingErr && <span className="text-xs text-[#9b7842]" data-testid="status-pending-filters">لديك تغييرات لم تُطبّق بعد.</span>}
      </div>
    </form>

    <div className="mb-5 flex gap-3 rounded-xl border border-[#e8dcc4] bg-[#fbf6ea] px-4 py-3 text-xs leading-6 text-[#6f5a32]" data-testid="notice-gross-profit"><Info size={16} className="mt-1 shrink-0" /><div>المعروض هو <b>الربح الإجمالي</b> (المبيعات − تكلفة البضاعة المباعة) وليس صافي ربح: الخصومات والمرتجعات والمصروفات التشغيلية والضرائب غير مسجلة حالياً. التكلفة مأخوذة من تكلفة الوحدة المحفوظة وقت البيع (متوسط مرجّح للمشتريات)، لا من سعر الشراء الحالي.</div></div>

    {appliedErr ? <div className="panel"><Empty title="الفلاتر غير صالحة" body={appliedErr} /></div>
      : q.isLoading ? <div className="grid gap-4" role="status" data-testid="status-loading"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="panel h-32 animate-pulse bg-[#f0f2ed]" />)}</div><div className="panel h-72 animate-pulse bg-[#f0f2ed]" /><span className="sr-only">جارٍ تحميل التقرير</span></div>
      : q.isError || !report ? <div className="panel flex min-h-56 flex-col items-center justify-center p-8 text-center" data-testid="status-error"><div className="mb-3 rounded-full bg-[#fff1ef] p-3 text-[#b94d47]"><AlertTriangle size={21} /></div><h3 className="m-0 text-base font-bold">تعذر تحميل التقرير</h3><p className="mt-2 text-sm text-[#778391]">تحقق من الفترة والاتصال ثم أعد المحاولة.</p><Btn secondary testId="button-retry" onClick={() => q.refetch()}><RotateCw size={15} />إعادة المحاولة</Btn></div>
      : <div className={`grid gap-5 transition-opacity ${q.isFetching ? 'opacity-60' : ''}`}>
        <div className="text-xs text-[#778391]" data-testid="text-applied-filters">التقرير المعروض: {fmtDate(applied.from, true)} – {fmtDate(applied.to, true)} · {productName} · {report.timeZone || TZ}</div>
        {report.missingCostLines > 0 && <div className="flex gap-3 rounded-xl border border-[#f0d4d1] bg-[#fff5f3] px-4 py-3 text-sm text-[#a9433f]" role="alert" data-testid="warning-missing-cost"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><div>{report.missingCostLines.toLocaleString('ar-EG')} بند بيع بدون تكلفة محفوظة. لن نفترض تكلفتها صفراً، لذا تظهر التكلفة والربح «غير متاح» حيث تتأثر.</div></div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card icon={CalendarDays} label="اليوم (القاهرة)" testId="metric-today" value={<Money amount={report.todaySales} />} note={`${report.todayCount.toLocaleString('ar-EG')} عملية · مستقل عن الفترة المختارة`} accent="bg-[#e8f2ec] text-[#286247]" />
          <Card icon={CalendarDays} label="الشهر الحالي" testId="metric-month" value={<Money amount={report.monthSales} />} note={`${report.monthCount.toLocaleString('ar-EG')} عملية · مستقل عن الفترة المختارة`} accent="bg-[#eaf0f6] text-[#385a7c]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card icon={Wallet} label="مبيعات الفترة" testId="metric-sales" value={<Money amount={report.totalSales} />} note="إجمالي قيمة البيع" accent="bg-[#e8f2ec] text-[#286247]" />
          <Card icon={Package} label="تكلفة البضاعة المباعة" testId="metric-cost" value={<Money amount={report.totalCost} />} note={report.totalCost === null ? 'غير مكتملة بسبب بنود بلا تكلفة' : 'من تكلفة الوحدة وقت البيع'} accent="bg-[#f3eee4] text-[#927442]" />
          <Card icon={Activity} label="الربح الإجمالي" testId="metric-profit" value={<Money amount={report.estimatedProfit} />} note="قبل المصروفات والضرائب — ليس صافي ربح" accent="bg-[#edf1f6] text-[#426181]" />
          <Card icon={ShoppingBag} label="عدد عمليات البيع" testId="metric-count" value={report.salesCount.toLocaleString('ar-EG')} note="خلال الفترة" accent="bg-[#f5efe4] text-[#9b7842]" />
        </div>

        <div className="panel p-5" data-testid="section-comparison"><h2 className="m-0 text-base font-bold">مقارنة بالفترة السابقة</h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><div className="text-xs text-[#778391]">الفترة الحالية ({fmtDate(applied.from)} – {fmtDate(applied.to)})</div><div className="mt-1 font-bold"><Money amount={report.totalSales} /></div></div>
            <div><div className="text-xs text-[#778391]">الفترة السابقة ({fmtDate(report.previousFrom)} – {fmtDate(report.previousTo)})</div><div className="mt-1 font-bold" data-testid="text-previous-sales"><Money amount={report.previousSales} /></div></div>
            <div><div className="text-xs text-[#778391]">نسبة التغير</div><div className="mt-1 font-bold" data-testid="text-change-percent">{report.salesChangePercent === null ? <span className="text-[#778391]">غير قابلة للحساب (مبيعات الفترة السابقة صفر)</span> : <span dir="ltr" className={report.salesChangePercent < 0 ? 'text-[#a9433f]' : 'text-[#286247]'}>{report.salesChangePercent > 0 ? '+' : ''}{fmtNum(report.salesChangePercent)}%</span>}</div></div>
          </div>
        </div>

        <Section title="المبيعات والتكلفة والربح الإجمالي يومياً" sub="الأيام بلا تكلفة مكتملة تظهر فجوة في خطي التكلفة والربح" testId="chart-daily-sales">
          {report.salesCount === 0 ? <Empty title="لا توجد مبيعات في هذه الفترة" body="غيّر الفترة أو المنتج، أو سجّل مبيعات جديدة." /> :
            <div className="h-[300px] p-3" dir="ltr" role="img" aria-label="رسم بياني يومي للمبيعات والتكلفة والربح الإجمالي، التفاصيل في الجدول أدناه">
              <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#edf0eb" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v: string) => fmtDate(v)} tick={{ fontSize: 10, fill: '#7b8792' }} minTickGap={16} />
                <YAxis tickFormatter={(v: number) => v.toLocaleString('ar-EG')} tick={{ fontSize: 10, fill: '#7b8792' }} width={56} />
                {hasNeg && <ReferenceLine y={0} stroke="#a9433f" strokeDasharray="3 3" />}
                <Tooltip content={<ChartTip />} />
                <Legend formatter={(v: string) => <span className="text-xs text-[#344357]">{v}</span>} />
                <Bar dataKey="sales" name="المبيعات" fill="#4c8b68" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line dataKey="cost" name="التكلفة" stroke="#c08a3e" strokeWidth={2} dot={chartData.length < 15} connectNulls={false} />
                <Line dataKey="profit" name="الربح الإجمالي" stroke="#385a7c" strokeWidth={2} dot={chartData.length < 15} connectNulls={false} />
              </ComposedChart></ResponsiveContainer>
            </div>}
          {report.daily.length > 0 && <details className="border-t border-[#edf0eb] px-5 py-3 text-sm"><summary className="cursor-pointer text-xs font-bold text-[#286247]" data-testid="toggle-daily-table">عرض البيانات اليومية كجدول</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-right text-sm"><thead className="bg-[#f8f9f6] text-[11px] text-[#778391]"><tr><th className="px-3 py-2">التاريخ</th><th className="px-3 py-2">المبيعات</th><th className="px-3 py-2">التكلفة</th><th className="px-3 py-2">الربح الإجمالي</th><th className="px-3 py-2">العمليات</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{report.daily.map(d => <tr key={d.date} data-testid={`row-daily-${d.date}`}><td className="px-3 py-2">{fmtDate(d.date, true)}</td><td className="px-3 py-2"><Money amount={d.sales} /></td><td className="px-3 py-2"><Money amount={d.cost} /></td><td className="px-3 py-2"><Money amount={d.profit} /></td><td className="px-3 py-2">{d.salesCount.toLocaleString('ar-EG')}</td></tr>)}</tbody></table></div></details>}
        </Section>

        <div className="grid gap-5 xl:grid-cols-[.8fr_1.4fr]">
          <Section title="الأعلى مبيعاً (أفضل ٥)" sub="ترتيب حسب الكمية المباعة" testId="section-top5">
            {top.length ? <><div className="h-[220px] p-3" dir="ltr" role="img" aria-label="ترتيب أفضل خمسة منتجات حسب الكمية"><ResponsiveContainer width="100%" height="100%"><BarChart data={top} layout="vertical" margin={{ left: 0, right: 16 }}><CartesianGrid stroke="#edf0eb" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#7b8792' }} /><YAxis type="category" dataKey="name" orientation="right" width={100} tick={{ fontSize: 11, fill: '#344357' }} /><Tooltip formatter={(v: number) => [`${v.toLocaleString('ar-EG')} قطعة`, 'الكمية']} /><Bar dataKey="quantity" name="الكمية" fill="#286247" radius={[4, 0, 0, 4]} maxBarSize={22} /></BarChart></ResponsiveContainer></div>
              <ol className="m-0 divide-y divide-[#edf0eb] p-0">{report.bestSellers.slice(0, 5).map((b, i) => <li key={b.productId} className="flex items-center gap-3 px-5 py-3 text-sm" data-testid={`row-bestseller-${b.productId}`}><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#edf4ef] text-xs font-bold text-[#286247]">{(i + 1).toLocaleString('ar-EG')}</span><span className="min-w-0 flex-1 truncate font-bold">{b.name}</span><span className="text-xs text-[#778391]">{b.quantity.toLocaleString('ar-EG')} قطعة</span><span className="text-xs font-bold"><Money amount={b.revenue} /></span></li>)}</ol></>
              : <Empty title="لا توجد بيانات كافية" body="سيظهر الترتيب بعد تسجيل مبيعات في الفترة." />}
          </Section>
          <Section title="تقرير المنتجات الكامل" sub="الإيراد والتكلفة والربح الإجمالي لكل منتج" testId="section-products">
            {report.products.length ? <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-right text-sm"><thead className="bg-[#f8f9f6] text-[11px] text-[#778391]"><tr><th className="px-5 py-3">المنتج</th><th className="px-3 py-3">الكمية</th><th className="px-3 py-3">الإيراد</th><th className="px-3 py-3">التكلفة</th><th className="px-5 py-3">الربح الإجمالي</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{report.products.map(p => <tr key={p.productId} className="hover:bg-[#fbfcf9]" data-testid={`row-report-product-${p.productId}`}><td className="px-5 py-3 font-bold">{p.name}</td><td className="px-3 py-3">{p.quantity.toLocaleString('ar-EG')}</td><td className="px-3 py-3"><Money amount={p.revenue} /></td><td className="px-3 py-3"><Money amount={p.cost} /></td><td className="px-5 py-3 font-bold"><Money amount={p.profit} /></td></tr>)}</tbody></table></div>
              : <Empty title="لا توجد منتجات مباعة" body="لم تُسجل مبيعات لهذه الفلاتر." />}
          </Section>
        </div>
      </div>}
  </div>;
}
