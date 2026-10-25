import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { getGetReportsQueryKey, useGetDashboard, useGetReports } from '@workspace/api-client-react';
import { AlertTriangle, ArrowLeft, BarChart3, Boxes, Info, PackageSearch, Plus, ReceiptText, RotateCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import emptyBox from '@/assets/images/empty-box.webp';

const TZ = 'Africa/Cairo';
function cairoToday() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const g = (t: string) => p.find(x => x.type === t)?.value || '';
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function shiftDays(d: string, n: number) { return new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10); }
const fmtDate = (s: string, long = false) => new Date(`${s.slice(0, 10)}T12:00:00Z`).toLocaleDateString('ar-EG', { timeZone: 'UTC', day: 'numeric', month: long ? 'long' : 'short' });
const fmt = (n: number) => n.toLocaleString('ar-EG', { maximumFractionDigits: 2 });

function Money({ amount, big = false }: { amount: number | null | undefined; big?: boolean }) {
  if (amount === null || amount === undefined) return <span className="text-[#8d2f29]">غير متاح</span>;
  return <span dir="ltr" className={`whitespace-nowrap ${amount < 0 ? 'text-[#a3392f]' : ''}`}>{amount < 0 ? '−' : ''}{fmt(Math.abs(amount))} <small className={big ? 'text-[.38em] font-semibold opacity-70' : 'text-[.75em] opacity-70'}>ج.م</small></span>;
}

type Period = '7' | '30' | 'month';
const periods: { id: Period; label: string }[] = [{ id: '7', label: 'آخر ٧ أيام' }, { id: '30', label: 'آخر ٣٠ يوماً' }, { id: 'month', label: 'الشهر الحالي' }];

type TipProps = { active?: boolean; payload?: { payload?: { date: string; sales: number; profit: number | null; salesCount: number } }[] };
function ChartTip({ active, payload }: TipProps) {
  const d = active ? payload?.[0]?.payload : undefined;
  if (!d) return null;
  return <div dir="rtl" className="rounded-2xl border border-[#e4e0d1] bg-[#fffdf6] p-3 text-xs shadow-lg"><div className="mb-2 font-bold">{fmtDate(d.date, true)}</div><div className="flex justify-between gap-6"><span>المبيعات</span><b><Money amount={d.sales} /></b></div><div className="flex justify-between gap-6"><span>الربح الإجمالي</span><b><Money amount={d.profit} /></b></div><div className="mt-1 text-[#5a6b61]">{d.salesCount.toLocaleString('ar-EG')} عملية</div></div>;
}

function RevenueChart() {
  const today = cairoToday();
  const [period, setPeriod] = useState<Period>('7');
  const params = useMemo(() => ({ from: period === 'month' ? `${today.slice(0, 8)}01` : shiftDays(today, -(Number(period) - 1)), to: today }), [period, today]);
  const q = useGetReports(params, { query: { queryKey: getGetReportsQueryKey(params) } });
  const r = q.isError ? undefined : q.data;
  const data = useMemo(() => (r?.daily || []).map(d => ({ date: d.date, sales: d.sales, profit: d.profit, salesCount: d.salesCount })), [r]);
  const hasNeg = data.some(d => (d.profit ?? 0) < 0);
  const profit = r?.estimatedProfit;

  return <section className="tg-card tg-rise tg-rise-2 overflow-hidden" data-testid="section-overview-chart">
    <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-6 sm:px-7">
      <div><div className="flex items-center gap-2 text-xs font-bold text-[#1f6b45]"><BarChart3 size={15} />المبيعات والربح الإجمالي يومياً</div>
        <h2 className="tg-display m-0 mt-2 text-xl font-bold text-[#14261d]" data-testid="text-chart-period">{fmtDate(params.from, true)} – {fmtDate(params.to, true)}</h2>
        <div className="mt-1 text-xs text-[#5a6b61]">بتوقيت القاهرة</div></div>
      <div className="flex rounded-full border border-[#e4e0d1] bg-[#f4f1e6] p-1" role="group" aria-label="اختيار الفترة">
        {periods.map(p => <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)} data-testid={`button-chart-period-${p.id}`} className="tg-seg min-h-10 rounded-full px-3.5 text-xs font-bold text-[#2c4337] transition sm:px-4">{p.label}</button>)}
      </div>
    </div>
    {q.isLoading ? <div className="m-5 h-[300px] animate-pulse rounded-3xl bg-[#efeadb]" role="status"><span className="sr-only">جارٍ تحميل الرسم</span></div>
      : !r ? <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center" data-testid="status-chart-error"><AlertTriangle className="text-[#a3392f]" size={22} /><div className="font-bold">تعذر تحميل بيانات الرسم</div><p className="m-0 text-sm text-[#5a6b61]">باقي لوحة المتجر تعمل. أعد المحاولة.</p><button onClick={() => q.refetch()} data-testid="button-chart-retry" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d6d0bb] bg-[#fbf9f2] px-5 text-sm font-bold"><RotateCw size={15} />إعادة المحاولة</button></div>
      : <>
        <div className="mt-5 grid grid-cols-3 border-y border-[#ece7d6]">
          <div className="px-5 py-4 sm:px-7"><div className="text-[11px] font-semibold text-[#5a6b61]">مبيعات الفترة</div><div className="tg-num mt-1 text-lg font-bold sm:text-2xl" data-testid="text-chart-sales"><Money amount={r.totalSales} /></div></div>
          <div className="border-x border-[#ece7d6] px-5 py-4 sm:px-7"><div className="flex items-center gap-1 text-[11px] font-semibold text-[#5a6b61]">{(profit ?? 0) < 0 ? <TrendingDown size={13} className="text-[#a3392f]" /> : <TrendingUp size={13} className="text-[#1f6b45]" />}ربح إجمالي</div><div className="tg-num mt-1 text-lg font-bold sm:text-2xl" data-testid="text-chart-profit"><Money amount={profit} /></div></div>
          <div className="px-5 py-4 sm:px-7"><div className="text-[11px] font-semibold text-[#5a6b61]">عمليات</div><div className="tg-num mt-1 text-lg font-bold sm:text-2xl" data-testid="text-chart-count">{r.salesCount.toLocaleString('ar-EG')}</div></div>
        </div>
        {r.salesCount === 0 ? <div className="grid items-center gap-4 px-6 py-10 sm:grid-cols-[140px_1fr] sm:px-10" data-testid="state-chart-empty">
          <img src={emptyBox} width={160} height={160} loading="lazy" alt="" className="mx-auto h-32 w-32 object-contain" />
          <div className="text-center sm:text-right"><h3 className="tg-display m-0 text-lg font-bold">لا مبيعات في هذه الفترة بعد</h3><p className="mt-2 text-sm leading-7 text-[#5a6b61]">سيرتسم هنا عمود لكل يوم بمجرد تسجيل أول عملية بيع. جرّب فترة أطول أو سجّل بيعاً الآن.</p><Link href="/sales" data-testid="link-chart-empty-sale" className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#17402d] px-5 text-sm font-bold text-[#f4f1e6]"><Plus size={15} />تسجيل بيع</Link></div>
        </div> : <div className={`h-[300px] px-2 pb-2 pt-4 sm:px-4 ${q.isFetching ? 'opacity-60' : ''}`} dir="ltr" role="img" aria-label="رسم يومي للمبيعات والربح الإجمالي للفترة المختارة">
          <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#ece7d6" vertical={false} />
            <XAxis dataKey="date" reversed tickFormatter={(v: string) => fmtDate(v)} tick={{ fontSize: 11, fill: '#5a6b61' }} axisLine={false} tickLine={false} minTickGap={14} />
            <YAxis orientation="right" tickFormatter={(v: number) => v.toLocaleString('ar-EG')} tick={{ fontSize: 11, fill: '#5a6b61' }} axisLine={false} tickLine={false} width={58} />
            {hasNeg && <ReferenceLine y={0} stroke="#a3392f" strokeDasharray="4 4" />}
            <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(201,226,101,.25)' }} />
            <Bar dataKey="sales" name="المبيعات" fill="#1f6b45" radius={[8, 8, 0, 0]} maxBarSize={34} />
            <Line dataKey="profit" name="الربح الإجمالي" stroke="#b7791f" strokeWidth={2.5} dot={data.length <= 10} connectNulls={false} />
          </ComposedChart></ResponsiveContainer>
        </div>}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#ece7d6] px-5 py-3 text-xs text-[#5a6b61] sm:px-7">
          <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#1f6b45]" />المبيعات</span>
          <span className="flex items-center gap-2"><i className="h-0.5 w-4 bg-[#b7791f]" />الربح الإجمالي (قبل المصروفات)</span>
          {r.missingCostLines > 0 && <span className="text-[#8d2f29]" data-testid="warning-chart-missing-cost">{r.missingCostLines.toLocaleString('ar-EG')} بند بلا تكلفة — الربح يظهر «غير متاح» حيث يتأثر</span>}
          <Link href="/reports" className="mr-auto font-bold text-[#1f6b45] hover:underline" data-testid="link-chart-reports">التقرير الكامل</Link>
        </div>
      </>}
  </section>;
}

function Skeleton() {
  return <div className="grid gap-5" role="status" data-testid="status-loading"><div className="h-56 animate-pulse rounded-[32px] bg-[#e7e1cd]" /><div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]"><div className="h-96 animate-pulse rounded-[28px] bg-[#efeadb]" /><div className="h-96 animate-pulse rounded-[28px] bg-[#efeadb]" /></div><span className="sr-only">جارٍ تحميل البيانات</span></div>;
}

function Panel({ title, sub, action, children, testId }: { title: string; sub: string; action?: ReactNode; children: ReactNode; testId?: string }) {
  return <section className="tg-card overflow-hidden" data-testid={testId}><div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5 sm:px-6"><div><h2 className="tg-display m-0 text-lg font-bold">{title}</h2><p className="m-0 mt-1 text-xs text-[#5a6b61]">{sub}</p></div>{action}</div>{children}</section>;
}

export function Overview() {
  const dashboard = useGetDashboard();
  const data = dashboard.data;
  const today = cairoToday();
  if (dashboard.isLoading) return <Skeleton />;
  if (dashboard.isError || !data) return <div className="tg-card flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center" data-testid="status-error"><img src={emptyBox} width={160} height={160} loading="lazy" alt="" className="h-24 w-24 object-contain" /><h3 className="tg-display m-0 text-lg font-bold">تعذر تحميل لوحة المتجر</h3><p className="m-0 text-sm text-[#5a6b61]">تحقق من اتصالك ثم أعد المحاولة.</p><button onClick={() => dashboard.refetch()} data-testid="button-retry" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d6d0bb] bg-[#fbf9f2] px-5 text-sm font-bold"><RotateCw size={15} />إعادة المحاولة</button></div>;
  const recent = (data.recentSales || []).slice(0, 6);
  const low = data.lowStockProducts || [];
  const margin = data.totalSales > 0 ? (data.totalProfit / data.totalSales) * 100 : null;

  return <div className="grid gap-5">
    {/* Ledger header: all-time figures */}
    <section className="tg-rise relative overflow-hidden rounded-[32px] bg-[#17402d] text-[#f4f1e6]">
      <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full border-[40px] border-[#c9e265]/10" aria-hidden />
      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:p-10">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#c9e265]"><span>{new Date(`${today}T12:00:00Z`).toLocaleDateString('ar-EG', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })}</span><span className="rounded-full border border-[#c9e265]/40 px-2 py-0.5">منذ بداية التسجيل</span></div>
          <div className="mt-4 text-sm text-[#c8d6c9]">إجمالي المبيعات المسجلة</div>
          <div className="tg-num mt-1 text-[44px] font-extrabold leading-none tracking-tight sm:text-[64px]" data-testid="metric-إجمالي المبيعات"><Money amount={data.totalSales} big /></div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/sales" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#c9e265] px-6 text-sm font-bold text-[#17402d] hover:bg-[#d7ec84]" data-testid="button-new-sale"><Plus size={17} />تسجيل عملية بيع</Link>
            <Link href="/purchases" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-6 text-sm font-bold hover:bg-white/10" data-testid="link-overview-purchases"><ReceiptText size={16} />فاتورة مشتريات</Link>
          </div>
        </div>
        <div className="grid gap-px overflow-hidden rounded-[24px] bg-white/15 sm:grid-cols-2 lg:grid-cols-1">
          <div className="bg-[#1d4a35] p-5"><div className="text-xs text-[#c8d6c9]">الربح الإجمالي التقديري</div><div className="tg-num mt-2 text-3xl font-bold" data-testid="metric-الربح التقديري"><Money amount={data.totalProfit} /></div><div className="mt-2 text-[11px] leading-5 text-[#a9bfae]">قبل المصروفات والضرائب، بتكلفة الوحدة وقت البيع{margin !== null && <> · هامش <span dir="ltr">{fmt(Math.round(margin * 10) / 10)}%</span></>}</div></div>
          <div className="grid grid-cols-2 gap-px">
            <Link href="/products" className="bg-[#1d4a35] p-5 hover:bg-[#235540]" data-testid="link-overview-products"><Boxes size={18} className="text-[#c9e265]" /><div className="tg-num mt-2 text-3xl font-bold" data-testid="metric-المنتجات">{Number(data.productsCount || 0).toLocaleString('ar-EG')}</div><div className="mt-1 text-[11px] text-[#c8d6c9]">صنف مسجل</div></Link>
            <Link href="/products" className={`p-5 ${data.lowStockCount ? 'bg-[#c9e265] text-[#17402d]' : 'bg-[#1d4a35] hover:bg-[#235540]'}`} data-testid="link-overview-low-stock"><AlertTriangle size={18} /><div className="tg-num mt-2 text-3xl font-bold" data-testid="metric-مخزون منخفض">{Number(data.lowStockCount || 0).toLocaleString('ar-EG')}</div><div className="mt-1 text-[11px] opacity-80">تحت الحد الأدنى</div></Link>
          </div>
        </div>
      </div>
    </section>

    <div className="tg-rise tg-rise-2 flex items-start gap-2 px-1 text-xs leading-6 text-[#6b5a2f]"><Info size={14} className="mt-1 shrink-0" />الأرقام أعلاه تراكمية منذ بداية التسجيل. الربح المعروض إجمالي (المبيعات − تكلفة البضاعة) وليس صافي ربح.</div>

    <RevenueChart />

    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <Panel title="أحدث المبيعات" sub="آخر العمليات المسجلة" testId="section-recent-sales" action={<Link href="/sales" className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs font-bold text-[#1f6b45] hover:bg-[#efeadb]" data-testid="link-all-sales">كل المبيعات<ArrowLeft size={14} /></Link>}>
        {recent.length ? <ul className="m-0 list-none p-0">{recent.map(s => <li key={s.id} data-testid={`row-sale-${s.id}`} className="tg-ledger-row flex items-center gap-4 border-t border-dashed border-[#e4e0d1] px-5 py-4 sm:px-6">
          <span className="tg-num flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#efeadb] text-xs font-bold text-[#17402d]">#{s.id}</span>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{(s.items || []).map(i => i.productName).join('، ') || `${s.items?.length || 0} أصناف`}</div><div className="mt-0.5 text-xs text-[#5a6b61]">{new Date(s.createdAt).toLocaleString('ar-EG', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} · {(s.items?.length || 0).toLocaleString('ar-EG')} بند</div></div>
          <div className="tg-num text-left text-sm font-bold"><Money amount={s.total} /></div>
        </li>)}</ul> : <div className="flex flex-col items-center px-6 pb-10 pt-4 text-center" data-testid="state-empty"><img src={emptyBox} width={160} height={160} loading="lazy" alt="صندوق فارغ" className="h-28 w-28 object-contain" /><h3 className="tg-display m-0 mt-2 font-bold">الدرج لسه فاضي</h3><p className="mt-1 max-w-xs text-sm text-[#5a6b61]">سجّل أول عملية بيع لتبدأ متابعة حركة متجرك.</p><Link href="/sales" className="inline-flex min-h-11 items-center rounded-full bg-[#17402d] px-5 text-sm font-bold text-[#f4f1e6]" data-testid="link-start-sale">ابدأ بتسجيل بيع</Link></div>}
      </Panel>
      <Panel title="على وشك النفاد" sub="الكمية الحالية مقابل الحد الأدنى" testId="section-low-stock" action={<span className="tg-num rounded-full bg-[#fbe9e4] px-3 py-1 text-xs font-bold text-[#a3392f]">{low.length.toLocaleString('ar-EG')}</span>}>
        {low.length ? <ul className="m-0 list-none p-0">{low.slice(0, 6).map(p => { const pct = p.minStock > 0 ? Math.min(100, (p.quantity / p.minStock) * 100) : 0; return <li key={p.id} data-testid={`row-low-stock-${p.id}`} className="border-t border-dashed border-[#e4e0d1] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{p.name}</div><div className="text-xs text-[#5a6b61]">{p.category}</div></div><div className="tg-num shrink-0 text-sm font-bold text-[#a3392f]">{p.quantity.toLocaleString('ar-EG')} <span className="text-xs font-normal text-[#5a6b61]">/ {p.minStock.toLocaleString('ar-EG')}</span></div></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#efeadb]"><div className="h-full rounded-full bg-[#c0573f]" style={{ width: `${pct}%` }} /></div>
        </li>; })}</ul> : <div className="flex flex-col items-center px-6 pb-10 pt-6 text-center" data-testid="state-empty"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e6efd0] text-[#1f6b45]"><PackageSearch size={24} /></span><h3 className="tg-display m-0 mt-3 font-bold">الرفوف مستقرة</h3><p className="mt-1 max-w-xs text-sm text-[#5a6b61]">كل الأصناف أعلى من الحد الأدنى المحدد.</p></div>}
      </Panel>
    </div>
  </div>;
}
