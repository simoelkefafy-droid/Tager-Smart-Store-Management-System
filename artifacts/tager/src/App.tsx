import { useEffect, useMemo, useState, createContext, useContext, type FormEvent, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { arSA } from '@clerk/localizations';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  getGetDashboardQueryKey, getGetReportsQueryKey, getListProductsQueryKey,
  getListSalesQueryKey, getListSuppliersQueryKey,
  useCreateProduct, useCreateSale, useCreateSupplier, useDeleteProduct,
  useDeleteSupplier, useGetDashboard, useGetReports, useListProducts,
  useListSales, useListSuppliers, useUpdateProduct, useUpdateSupplier,
  type Product, type Supplier, type Sale,
} from '@workspace/api-client-react';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowUpLeft, BarChart3,
  Boxes, CalendarDays, Check, ChevronDown, CircleHelp, FileBarChart2, Filter,
  Home, LogOut, Menu, Package, Plus, Search, ShoppingBag, ShoppingCart,
  Store, Truck, Wallet, X, Pencil, Trash2, RotateCw, Users,
} from 'lucide-react';
import { Route, Switch, Router as WouterRouter, Link, Redirect, useLocation } from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#286247', colorForeground: '#1d2d42', colorMutedForeground: '#687789',
    colorDanger: '#bd4540', colorBackground: '#fffefa', colorInput: '#fffefa',
    colorInputForeground: '#1d2d42', colorNeutral: '#dce1df',
    fontFamily: "'IBM Plex Sans Arabic', sans-serif", borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffefa] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#e1e5df]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#1d2d42] font-bold', headerSubtitle: 'text-[#687789]',
    socialButtonsBlockButtonText: 'text-[#1d2d42]', formFieldLabel: 'text-[#26374b]',
    footerActionLink: 'text-[#286247]', footerActionText: 'text-[#687789]',
    dividerText: 'text-[#687789]', identityPreviewEditButton: 'text-[#286247]',
    formFieldSuccessText: 'text-[#286247]', alertText: 'text-[#8d3734]',
    logoBox: 'mb-3', logoImage: 'max-h-10', socialButtonsBlockButton: 'border-[#dce1df]',
    formButtonPrimary: 'bg-[#286247] hover:bg-[#204f39]', formFieldInput: 'border-[#dce1df]',
    footerAction: 'border-t border-[#e7e8e4]', dividerLine: 'bg-[#dce1df]',
    alert: 'border-[#efceca] bg-[#fff5f3]', otpCodeFieldInput: 'border-[#dce1df]',
    formFieldRow: 'mb-4', main: 'gap-5',
  },
};

type DemoContextType = { demo: boolean; enterDemo: () => void; leaveDemo: () => void };
const DemoContext = createContext<DemoContextType>({ demo: false, enterDemo: () => {}, leaveDemo: () => {} });
const useDemo = () => useContext(DemoContext);

function DemoProvider({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(() => localStorage.getItem('tager-demo') === 'yes');
  const enterDemo = () => { localStorage.setItem('tager-demo', 'yes'); setDemo(true); };
  const leaveDemo = () => { localStorage.removeItem('tager-demo'); setDemo(false); };
  return <DemoContext.Provider value={{ demo, enterDemo, leaveDemo }}>{children}</DemoContext.Provider>;
}

function CacheUserWatcher() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useMemo(() => ({ id: undefined as string | null | undefined }), []);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.id !== undefined && previous.id !== id) client.clear();
    previous.id = id;
  }), [addListener, client, previous]);
  return null;
}

function SignInPage() {
  return <div className="min-h-[100dvh] bg-[#f7f6f1] px-4 py-10 flex items-center justify-center"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}
function SignUpPage() {
  return <div className="min-h-[100dvh] bg-[#f7f6f1] px-4 py-10 flex items-center justify-center"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

const navItems = [
  { href: '/app', label: 'نظرة عامة', icon: Home },
  { href: '/products', label: 'المنتجات والمخزون', icon: Package },
  { href: '/sales', label: 'المبيعات', icon: ShoppingCart },
  { href: '/suppliers', label: 'الموردون', icon: Truck },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
];

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { demo, leaveDemo } = useDemo();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logOut = async () => {
    if (demo) { leaveDemo(); setLocation('/'); return; }
    await signOut({ redirectUrl: basePath || '/' });
  };
  return <div className="app-shell" dir="rtl">
    <aside className="desktop-sidebar fixed right-0 top-0 z-30 flex h-full w-[252px] flex-col bg-[#172d45] px-4 py-6 text-white">
      <Link href="/app" className="mb-9 flex items-center gap-3 px-2" data-testid="link-brand"><img src={`${basePath}/logo.svg`} className="h-10 w-10 rounded-xl" alt="شعار تاجر" /><div><div className="text-xl font-bold">تاجر</div><div className="text-[11px] text-[#b7c7d0]">إدارة متجرك ببساطة</div></div></Link>
      <div className="px-3 pb-3 text-[10px] font-bold tracking-[.16em] text-[#8fa3b2]">مساحة العمل</div>
      <nav className="space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`nav-${href.slice(1)}`} className={`sidebar-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${location === href ? 'active' : 'text-[#d2dce1]'}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></Link>)}
      </nav>
      <div className="mt-auto">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[.06] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold"><CircleHelp size={16} className="text-[#a4d4b3]" />دفتر يومك</div>
          <p className="m-0 text-xs leading-6 text-[#c0ccd3]">تابع كل حركة في متجرك من مكان واحد، بدون تعقيد.</p>
        </div>
        <button onClick={logOut} data-testid="button-logout" className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#d2dce1] transition hover:bg-white/10"><LogOut size={17} />{demo ? 'إنهاء وضع التجربة' : 'تسجيل الخروج'}</button>
        <div className="mt-2 truncate px-3 text-[11px] text-[#93a6b3]">{demo ? 'وضع التجربة' : user?.primaryEmailAddress?.emailAddress || 'حساب تاجر'}</div>
      </div>
    </aside>
    {mobileOpen && <button aria-label="إغلاق القائمة" className="fixed inset-0 z-40 bg-[#14273d]/40 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed right-0 top-0 z-50 flex h-full w-[270px] flex-col bg-[#172d45] px-4 py-6 text-white transition-transform md:hidden ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="mb-7 flex items-center justify-between"><Link href="/app" className="flex items-center gap-3"><img src={`${basePath}/logo.svg`} className="h-9 w-9 rounded-lg" alt="شعار تاجر" /><b>تاجر</b></Link><button onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={20} /></button></div>
      <nav className="space-y-1">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`mobile-nav-${href.slice(1)}`} className={`sidebar-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${location === href ? 'active' : 'text-[#d2dce1]'}`}><Icon size={18} />{label}</Link>)}</nav>
      <button onClick={logOut} data-testid="button-mobile-logout" className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#d2dce1]"><LogOut size={17} />{demo ? 'إنهاء وضع التجربة' : 'تسجيل الخروج'}</button>
    </aside>
    <div className="md:mr-[252px]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e7e8e4] bg-[#f7f6f1]/95 px-4 backdrop-blur md:px-8">
        <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-[#24364c] md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu size={21} /></button><div><div className="text-xs text-[#778391]">مساحة عملك</div><div className="text-sm font-bold text-[#1d2d42]">{navItems.find(n => n.href === location)?.label || 'تاجر'}</div></div></div>
        <div className="flex items-center gap-3">
          {demo && <span className="rounded-full border border-[#b8d5c2] bg-[#eaf4ed] px-3 py-1.5 text-[11px] font-bold text-[#286247]" data-testid="status-demo">بيانات تجريبية</span>}
          <div className="hidden text-left sm:block"><div className="text-xs font-bold">{demo ? 'متجر النخبة' : user?.fullName || 'أهلاً بك'}</div><div className="text-[10px] text-[#82909c]">{demo ? 'حساب تجريبي' : 'حساب المتجر'}</div></div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dceae0] text-sm font-bold text-[#286247]">{demo ? 'ن' : user?.firstName?.slice(0, 1) || 'ت'}</div>
        </div>
      </header>
      <main className="mobile-content mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e1e4df] bg-[#fffefa]/95 px-1 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur md:hidden">
      {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`bottom-nav-${href.slice(1)}`} className={`flex flex-col items-center gap-1 py-1 text-[10px] ${location === href ? 'font-bold text-[#286247]' : 'text-[#778391]'}`}><Icon size={19} strokeWidth={location === href ? 2.2 : 1.8} /><span>{label}</span></Link>)}
    </nav>
  </div>;
}

function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="m-0 text-[25px] font-bold tracking-tight text-[#1d2d42]">{title}</h1><p className="mb-0 mt-1 text-sm text-[#778391]">{subtitle}</p></div>{action}</div>;
}
function Button({ children, onClick, secondary = false, danger = false, testId, type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean; danger?: boolean; testId: string; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55 ${danger ? 'border border-[#f0d4d1] bg-[#fff5f3] text-[#a9433f] hover:bg-[#fce9e6]' : secondary ? 'border border-[#dfe4df] bg-white text-[#344357] hover:bg-[#f8f9f6]' : 'bg-[#286247] text-white shadow-sm hover:bg-[#204f39]'}`}>{children}</button>;
}
function LoadingBlock({ label = 'جارٍ تحميل البيانات' }: { label?: string }) {
  return <div className="panel flex min-h-52 flex-col items-center justify-center gap-4 p-6" role="status" data-testid="status-loading"><div className="grid w-full max-w-xl gap-3"><div className="h-4 animate-pulse rounded bg-[#eef0eb]" /><div className="h-10 animate-pulse rounded-xl bg-[#f0f2ed]" /><div className="h-10 animate-pulse rounded-xl bg-[#f0f2ed]" /></div><span className="text-xs text-[#778391]">{label}</span></div>;
}
function ErrorBlock({ retry }: { retry: () => void }) {
  return <div className="panel flex min-h-56 flex-col items-center justify-center p-8 text-center" data-testid="status-error"><div className="mb-3 rounded-full bg-[#fff1ef] p-3 text-[#b94d47]"><AlertTriangle size={21} /></div><h3 className="m-0 text-base font-bold">تعذر تحميل البيانات</h3><p className="mt-2 text-sm text-[#778391]">تحقق من اتصالك ثم أعد المحاولة.</p><Button secondary testId="button-retry" onClick={retry}><RotateCw size={15} />إعادة المحاولة</Button></div>;
}
function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center" data-testid="state-empty"><div className="mb-3 rounded-2xl bg-[#edf4ef] p-3 text-[#286247]"><Boxes size={23} /></div><h3 className="m-0 text-base font-bold text-[#28394d]">{title}</h3><p className="mb-4 mt-2 max-w-sm text-sm leading-6 text-[#778391]">{body}</p>{action}</div>;
}
function EGP({ amount }: { amount: number }) { return <span dir="ltr" className="whitespace-nowrap">{Number(amount || 0).toLocaleString('ar-EG')} <small className="text-[.8em] text-[#778391]">ج.م</small></span>; }
function StatCard({ icon: Icon, label, value, note, accent }: { icon: typeof Wallet; label: string; value: ReactNode; note: string; accent: string }) {
  return <div className="panel metric-card p-5"><div className="flex items-start justify-between"><div><div className="text-sm text-[#778391]">{label}</div><div className="mt-3 text-[25px] font-bold tracking-tight text-[#1d2d42]" data-testid={`metric-${label}`}>{value}</div></div><div className={`rounded-xl p-3 ${accent}`}><Icon size={19} /></div></div><div className="mt-4 text-xs text-[#87919b]">{note}</div></div>;
}
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#122237]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[22px] bg-[#fffefa] p-5 shadow-2xl sm:rounded-[22px] sm:p-7" role="dialog" aria-modal="true" aria-label={title}><div className="mb-5 flex items-center justify-between"><h2 className="m-0 text-xl font-bold">{title}</h2><button onClick={onClose} data-testid="button-dialog-close" className="rounded-lg p-2 text-[#75818c] hover:bg-[#f1f2ee]"><X size={19} /></button></div>{children}</section></div>;
}
function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="grid gap-2 text-sm font-semibold text-[#344357]">{label}<input {...props} className="h-11 rounded-xl border border-[#dfe4df] bg-[#fffefa] px-3 outline-none transition focus:border-[#428260] focus:ring-2 focus:ring-[#b6d3c0]/50" /></label>;
}
function SelectField({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold text-[#344357]">{label}<select {...props} className="h-11 rounded-xl border border-[#dfe4df] bg-[#fffefa] px-3 outline-none focus:border-[#428260]">{children}</select></label>;
}
function getErrorMessage(error: unknown) { return error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ البيانات'; }
function useApiOptions() { const { demo } = useDemo(); return { request: { headers: demo ? { 'x-tager-demo': 'true' } : undefined } }; }

function Overview() {
  const api = useApiOptions();
  const dashboard = useGetDashboard(api);
  const data = dashboard.data;
  if (dashboard.isLoading) return <LoadingBlock />;
  if (dashboard.isError || !data) return <ErrorBlock retry={() => dashboard.refetch()} />;
  const recent = data.recentSales || [];
  return <div className="fade-up">
    <PageTitle title="نظرة عامة" subtitle="صباح الخير، إليك ملخص حركة متجرك اليوم." action={<Link href="/sales" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#286247] px-4 text-sm font-bold text-white hover:bg-[#204f39]" data-testid="button-new-sale"><Plus size={16} />تسجيل عملية بيع</Link>} />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Wallet} label="إجمالي المبيعات" value={<EGP amount={data.totalSales} />} note="إجمالي قيمة المبيعات المسجلة" accent="bg-[#e8f2ec] text-[#286247]" />
      <StatCard icon={Activity} label="الربح التقديري" value={<EGP amount={data.totalProfit} />} note="بعد خصم تكلفة المنتجات المباعة" accent="bg-[#eaf0f6] text-[#385a7c]" />
      <StatCard icon={Package} label="المنتجات" value={Number(data.productsCount || 0).toLocaleString('ar-EG')} note="أصناف مسجلة في المخزون" accent="bg-[#f3eee4] text-[#927442]" />
      <StatCard icon={AlertTriangle} label="مخزون منخفض" value={Number(data.lowStockCount || 0).toLocaleString('ar-EG')} note="منتجات تحتاج إلى متابعة" accent="bg-[#fff0ed] text-[#b44c43]" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]">
      <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[#edf0eb] px-5 py-4"><div><h2 className="m-0 text-base font-bold">أحدث المبيعات</h2><p className="mb-0 mt-1 text-xs text-[#84909a]">آخر العمليات المسجلة في متجرك</p></div><Link href="/sales" className="text-xs font-bold text-[#286247] hover:underline" data-testid="link-all-sales">كل المبيعات</Link></div>
        {recent.length ? <SalesTable sales={recent.slice(0, 6)} /> : <EmptyState title="لا توجد مبيعات بعد" body="سجّل أول عملية بيع لتبدأ متابعة حركة متجرك." action={<Link href="/sales" className="text-sm font-bold text-[#286247]" data-testid="link-start-sale">ابدأ بتسجيل بيع</Link>} />}
      </section>
      <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-[#edf0eb] px-5 py-4"><div><h2 className="m-0 text-base font-bold">تنبيه المخزون</h2><p className="mb-0 mt-1 text-xs text-[#84909a]">أصناف وصلت إلى حد إعادة الطلب</p></div><span className="rounded-full bg-[#fff1ed] px-2.5 py-1 text-xs font-bold text-[#aa4c43]">{(data.lowStockProducts || []).length} أصناف</span></div>
        {(data.lowStockProducts || []).length ? <div className="divide-y divide-[#edf0eb]">{data.lowStockProducts.slice(0, 6).map(p => <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-4" data-testid={`row-low-stock-${p.id}`}><div className="min-w-0"><div className="truncate text-sm font-bold">{p.name}</div><div className="mt-1 text-xs text-[#84909a]">{p.category}</div></div><div className="text-left"><div className="text-sm font-bold text-[#b44c43]">{p.quantity} قطعة</div><div className="text-[10px] text-[#84909a]">الحد الأدنى {p.minStock}</div></div></div>)}</div> : <EmptyState title="المخزون مستقر" body="كل المنتجات أعلى من الحد الأدنى المحدد." />}
      </section>
    </div>
  </div>;
}

function SalesTable({ sales }: { sales: Sale[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-right text-sm"><thead className="bg-[#f8f9f6] text-[11px] font-semibold text-[#778391]"><tr><th className="px-5 py-3">رقم العملية</th><th className="px-4 py-3">المنتجات</th><th className="px-4 py-3">التاريخ</th><th className="px-5 py-3">الإجمالي</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{sales.map(s => <tr key={s.id} data-testid={`row-sale-${s.id}`} className="hover:bg-[#fbfcf9]"><td className="px-5 py-4 font-bold">#{s.id}</td><td className="px-4 py-4 text-[#627080]">{s.items?.length || 0} أصناف</td><td className="px-4 py-4 text-[#627080]">{new Date(s.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className="px-5 py-4 font-bold"><EGP amount={s.total} /></td></tr>)}</tbody></table></div>;
}

function ProductPage() {
  const api = useApiOptions(); const client = useQueryClient();
  const q = useListProducts(api); const suppliersQ = useListSuppliers(api);
  const create = useCreateProduct(api); const update = useUpdateProduct(api); const remove = useDeleteProduct(api);
  const products = q.data || []; const suppliers = suppliersQ.data || [];
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('all');
  const [form, setForm] = useState<Product | null | false>(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const categories = [...new Set(products.map(p => p.category))];
  const filtered = products.filter(p => (category === 'all' || p.category === category) && `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: getListProductsQueryKey() }), client.invalidateQueries({ queryKey: getGetDashboardQueryKey() })]); };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError('');
    const f = new FormData(e.currentTarget);
    const payload = { name: String(f.get('name')), category: String(f.get('category')), purchasePrice: Number(f.get('purchasePrice')), sellingPrice: Number(f.get('sellingPrice')), quantity: Number(f.get('quantity')), minStock: Number(f.get('minStock')), supplierId: f.get('supplierId') ? Number(f.get('supplierId')) : null };
    try { if (form) await update.mutateAsync({ id: form.id, data: payload }); else await create.mutateAsync({ data: payload }); await refresh(); setNotice(form ? 'تم تحديث بيانات المنتج.' : 'تمت إضافة المنتج بنجاح.'); setForm(false); } catch (err) { setError(getErrorMessage(err)); }
  };
  const deleteItem = async (p: Product) => { if (!window.confirm(`حذف المنتج «${p.name}»؟`)) return; try { await remove.mutateAsync({ id: p.id }); await refresh(); setNotice('تم حذف المنتج.'); setError(''); } catch (e) { setError(getErrorMessage(e)); } };
  if (q.isLoading) return <LoadingBlock />;
  if (q.isError) return <ErrorBlock retry={() => q.refetch()} />;
  return <div className="fade-up">
     <PageTitle title="المنتجات والمخزون" subtitle="تابع أصناف متجرك، أسعارها، والكميات المتاحة." action={<Button testId="button-add-product" onClick={() => { setForm(null); setError(''); setNotice(''); }}><Plus size={16} />إضافة منتج</Button>} />
     {notice && <div className="mb-4 rounded-xl border border-[#d6e7da] bg-[#edf6ef] px-4 py-3 text-sm font-semibold text-[#286247]" role="status" data-testid="status-product-success">{notice}</div>}
    <div className="panel mb-5 flex flex-wrap items-center gap-3 p-4">
      <label className="relative min-w-[220px] flex-1"><Search className="absolute right-3 top-3 text-[#8b969e]" size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن منتج أو فئة..." data-testid="input-search-products" className="h-11 w-full rounded-xl border border-[#dfe4df] bg-[#fffefa] pr-10 pl-3 text-sm outline-none focus:border-[#428260]" /></label>
      <label className="flex items-center gap-2 text-xs text-[#75818c]"><Filter size={15} /><select value={category} onChange={e => setCategory(e.target.value)} data-testid="filter-product-category" className="h-11 rounded-xl border border-[#dfe4df] bg-white px-3 text-sm text-[#344357]"><option value="all">كل الفئات</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      <span className="mr-auto text-xs text-[#778391]" data-testid="text-products-count">{filtered.length} منتج</span>
    </div>
    <div className="panel overflow-hidden">{filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-right text-sm"><thead className="bg-[#f8f9f6] text-[11px] text-[#778391]"><tr><th className="px-5 py-4">المنتج</th><th className="px-4 py-4">الفئة</th><th className="px-4 py-4">سعر الشراء</th><th className="px-4 py-4">سعر البيع</th><th className="px-4 py-4">الكمية</th><th className="px-5 py-4">الإجراءات</th></tr></thead><tbody className="divide-y divide-[#edf0eb]">{filtered.map(p => <tr key={p.id} data-testid={`row-product-${p.id}`} className="hover:bg-[#fbfcf9]"><td className="px-5 py-4"><div className="font-bold">{p.name}</div><div className="mt-1 text-[11px] text-[#87919b]">حد إعادة الطلب {p.minStock}</div></td><td className="px-4 py-4 text-[#667483]">{p.category}</td><td className="px-4 py-4"><EGP amount={p.purchasePrice} /></td><td className="px-4 py-4 font-semibold"><EGP amount={p.sellingPrice} /></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.quantity <= p.minStock ? 'bg-[#fff0ed] text-[#a94842]' : 'bg-[#eaf4ed] text-[#286247]'}`}>{p.quantity} قطعة</span></td><td className="px-5 py-4"><div className="flex gap-1"><button onClick={() => { setForm(p); setError(''); }} data-testid={`button-edit-product-${p.id}`} aria-label="تعديل المنتج" className="rounded-lg p-2 text-[#607183] hover:bg-[#edf3ef] hover:text-[#286247]"><Pencil size={16} /></button><button onClick={() => deleteItem(p)} data-testid={`button-delete-product-${p.id}`} aria-label="حذف المنتج" className="rounded-lg p-2 text-[#929ba2] hover:bg-[#fff0ed] hover:text-[#b44c43]"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title={search || category !== 'all' ? 'لا توجد نتائج مطابقة' : 'ابدأ بإضافة منتجاتك'} body={search || category !== 'all' ? 'جرّب كلمة بحث أخرى أو غيّر الفئة المختارة.' : 'أضف أصناف متجرك لتتابع الكميات والأسعار في مكان واحد.'} action={!search && category === 'all' ? <Button testId="button-empty-add-product" onClick={() => setForm(null)}><Plus size={15} />إضافة أول منتج</Button> : undefined} />}</div>
    {error && <p className="mt-3 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#a94842]" data-testid="status-product-error">{error}</p>}
    {form !== false && <Dialog title={form ? 'تعديل المنتج' : 'إضافة منتج جديد'} onClose={() => setForm(false)}><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="اسم المنتج" name="name" required defaultValue={form?.name || ''} data-testid="input-product-name" />
      <Field label="الفئة" name="category" required defaultValue={form?.category || ''} placeholder="مثال: مشروبات" data-testid="input-product-category" />
      <Field label="سعر الشراء (ج.م)" name="purchasePrice" type="number" min="0" step="0.01" required defaultValue={form?.purchasePrice ?? ''} data-testid="input-product-cost" />
      <Field label="سعر البيع (ج.م)" name="sellingPrice" type="number" min="0" step="0.01" required defaultValue={form?.sellingPrice ?? ''} data-testid="input-product-price" />
      <Field label="الكمية الحالية" name="quantity" type="number" min="0" required defaultValue={form?.quantity ?? 0} data-testid="input-product-quantity" />
      <Field label="حد المخزون الأدنى" name="minStock" type="number" min="0" required defaultValue={form?.minStock ?? 5} data-testid="input-product-min-stock" />
      <SelectField label="المورد" name="supplierId" defaultValue={form?.supplierId || ''} data-testid="select-product-supplier"><option value="">بدون مورد</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</SelectField>
      {error && <div className="sm:col-span-2 text-sm text-[#b44c43]" data-testid="status-product-error">{error}</div>}
      <div className="mt-1 flex gap-2 sm:col-span-2"><Button type="submit" testId="button-save-product" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'جارٍ الحفظ...' : 'حفظ المنتج'}</Button><Button secondary testId="button-cancel-product" onClick={() => setForm(false)}>إلغاء</Button></div>
    </form></Dialog>}
  </div>;
}

function SalesPage() {
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
    try { await createSale.mutateAsync({ data: { items: cart } }); setCart([]); setNotice('تم تسجيل عملية البيع وتحديث المخزون.'); await Promise.all([client.invalidateQueries({ queryKey: getListSalesQueryKey() }), client.invalidateQueries({ queryKey: getListProductsQueryKey() }), client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }), client.invalidateQueries({ queryKey: getGetReportsQueryKey() })]); }
    catch (e) { setError(getErrorMessage(e)); }
  };
  if (productsQ.isLoading || salesQ.isLoading) return <LoadingBlock />;
  if (productsQ.isError || salesQ.isError) return <ErrorBlock retry={() => { productsQ.refetch(); salesQ.refetch(); }} />;
  return <div className="fade-up">
    <PageTitle title="المبيعات" subtitle="سجّل المبيعات بسهولة وراجع سجل عمليات متجرك." />
    <div className="grid items-start gap-5 xl:grid-cols-[.85fr_1.4fr]">
      <section className="panel p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="m-0 text-lg font-bold">عملية بيع جديدة</h2><p className="mb-0 mt-1 text-xs text-[#84909a]">أضف المنتجات وحدد الكمية</p></div><span className="rounded-xl bg-[#eaf4ed] p-2.5 text-[#286247]"><ShoppingCart size={19} /></span></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_100px_auto]">
          <SelectField label="المنتج" value={selected} onChange={e => setSelected(e.target.value)} data-testid="select-sale-product"><option value="">اختر منتجاً</option>{products.map(p => <option key={p.id} value={p.id} disabled={p.quantity < 1}>{p.name} — {p.quantity} متاح</option>)}</SelectField>
          <Field label="الكمية" type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} data-testid="input-sale-quantity" />
          <div className="flex items-end"><Button testId="button-add-to-sale" onClick={add} secondary><Plus size={16} />أضف</Button></div>
        </div>
        <div className="my-5 border-t border-[#edf0eb]" />
        {cart.length ? <div className="space-y-3">{cart.map(item => { const p = products.find(x => x.id === item.productId)!; return <div key={item.productId} className="flex items-center justify-between gap-2 rounded-xl bg-[#f8f9f6] p-3" data-testid={`cart-item-${p.id}`}><div><div className="text-sm font-bold">{p.name}</div><div className="mt-1 text-xs text-[#778391]">{item.quantity} × <EGP amount={p.sellingPrice} /></div></div><div className="flex items-center gap-3"><b className="text-sm"><EGP amount={item.quantity * p.sellingPrice} /></b><button aria-label="إزالة المنتج" onClick={() => setCart(old => old.filter(i => i.productId !== item.productId))} data-testid={`button-remove-cart-${p.id}`} className="rounded-lg p-1.5 text-[#9b6b65] hover:bg-[#fff0ed]"><X size={16} /></button></div></div>; })}</div> : <div className="rounded-xl border border-dashed border-[#dfe4df] py-7 text-center text-sm text-[#88939c]" data-testid="state-cart-empty">لم تُضف منتجات إلى هذه العملية</div>}
        <div className="mt-5 flex items-center justify-between border-t border-[#edf0eb] pt-4"><span className="text-sm font-semibold text-[#627080]">الإجمالي</span><b className="text-xl"><EGP amount={total} /></b></div>
        {error && <div className="mt-3 rounded-xl bg-[#fff1ef] p-3 text-sm text-[#a94842]" data-testid="status-sale-error">{error}</div>}
        {notice && <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#eaf4ed] p-3 text-sm text-[#286247]" data-testid="status-sale-success"><Check size={16} />{notice}</div>}
        <Button testId="button-complete-sale" onClick={checkout} disabled={!cart.length || createSale.isPending}><Check size={16} />{createSale.isPending ? 'جارٍ تسجيل البيع...' : 'تأكيد عملية البيع'}</Button>
      </section>
      <section className="panel overflow-hidden"><div className="border-b border-[#edf0eb] px-5 py-4"><h2 className="m-0 text-base font-bold">سجل المبيعات</h2><p className="mb-0 mt-1 text-xs text-[#84909a]">العمليات الأخيرة المسجلة</p></div>{sales.length ? <SalesTable sales={sales} /> : <EmptyState title="لا توجد عمليات بيع" body="ستظهر هنا كل عملية تسجلها في متجرك." />}</section>
    </div>
  </div>;
}

function SupplierPage() {
  const api = useApiOptions(); const client = useQueryClient(); const q = useListSuppliers(api);
  const create = useCreateSupplier(api); const update = useUpdateSupplier(api); const remove = useDeleteSupplier(api);
   const suppliers = q.data || []; const [form, setForm] = useState<Supplier | null | false>(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [search, setSearch] = useState('');
  const filtered = suppliers.filter(s => `${s.name} ${s.phone} ${s.products}`.toLowerCase().includes(search.toLowerCase()));
   const submit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const data = { name: String(f.get('name')), phone: String(f.get('phone')), products: String(f.get('products')) }; setError(''); try { if (form) await update.mutateAsync({ id: form.id, data }); else await create.mutateAsync({ data }); await client.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setNotice(form ? 'تم تحديث بيانات المورد.' : 'تمت إضافة المورد بنجاح.'); setForm(false); } catch (e) { setError(getErrorMessage(e)); } };
   const deleteItem = async (s: Supplier) => { if (!window.confirm(`حذف المورد «${s.name}»؟`)) return; try { await remove.mutateAsync({ id: s.id }); await client.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setNotice('تم حذف المورد.'); setError(''); } catch (e) { setError(getErrorMessage(e)); } };
  if (q.isLoading) return <LoadingBlock />;
  if (q.isError) return <ErrorBlock retry={() => q.refetch()} />;
  return <div className="fade-up">
     <PageTitle title="الموردون" subtitle="بيانات الموردين والأصناف التي يوفرونها." action={<Button testId="button-add-supplier" onClick={() => { setForm(null); setError(''); setNotice(''); }}><Plus size={16} />إضافة مورد</Button>} />
     {notice && <div className="mb-4 rounded-xl border border-[#d6e7da] bg-[#edf6ef] px-4 py-3 text-sm font-semibold text-[#286247]" role="status" data-testid="status-supplier-success">{notice}</div>}
    <div className="mb-5"><label className="relative block max-w-md"><Search size={17} className="absolute right-3 top-3 text-[#87919b]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مورد..." data-testid="input-search-suppliers" className="h-11 w-full rounded-xl border border-[#dfe4df] bg-white pr-10 pl-3 text-sm outline-none focus:border-[#428260]" /></label></div>
    {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((s, index) => <article key={s.id} className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-md" data-testid={`card-supplier-${s.id}`}><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${['bg-[#eaf2ed] text-[#286247]', 'bg-[#edf1f6] text-[#426181]', 'bg-[#f5efe4] text-[#9b7842]'][index % 3]}`}><Users size={19} /></div><div><h2 className="m-0 text-base font-bold">{s.name}</h2><div className="mt-1 text-xs text-[#82909b]">مورد رقم {s.id}</div></div></div><div className="flex"><button onClick={() => { setForm(s); setError(''); }} data-testid={`button-edit-supplier-${s.id}`} aria-label="تعديل المورد" className="rounded-lg p-2 text-[#687789] hover:bg-[#edf3ef]"><Pencil size={15} /></button><button onClick={() => deleteItem(s)} data-testid={`button-delete-supplier-${s.id}`} aria-label="حذف المورد" className="rounded-lg p-2 text-[#929ba2] hover:bg-[#fff0ed] hover:text-[#b44c43]"><Trash2 size={15} /></button></div></div><div className="mt-5 grid gap-3 border-t border-[#edf0eb] pt-4"><div className="flex items-center gap-2 text-sm text-[#617080]"><span className="text-xs font-semibold text-[#87919b]">الهاتف</span><span dir="ltr">{s.phone || '—'}</span></div><div><div className="mb-2 text-xs font-semibold text-[#87919b]">الأصناف التي يوفرها</div><div className="rounded-lg bg-[#f8f9f6] px-3 py-2 text-sm text-[#425163]">{s.products || 'لم تُحدد أصناف بعد'}</div></div></div></article>)}</div> : <div className="panel"><EmptyState title={search ? 'لا توجد نتائج مطابقة' : 'سجّل موردي متجرك'} body={search ? 'جرّب البحث باسم أو رقم هاتف مختلف.' : 'احتفظ ببيانات التواصل والأصناف التي يوفرها كل مورد.'} action={!search ? <Button testId="button-empty-add-supplier" onClick={() => setForm(null)}><Plus size={15} />إضافة مورد</Button> : undefined} /></div>}
    {error && <div className="mt-3 rounded-xl bg-[#fff1ef] p-3 text-sm text-[#a94842]" data-testid="status-supplier-error">{error}</div>}
    {form !== false && <Dialog title={form ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'} onClose={() => setForm(false)}><form onSubmit={submit} className="grid gap-4"><Field label="اسم المورد" name="name" required defaultValue={form?.name || ''} data-testid="input-supplier-name" /><Field label="رقم الهاتف" name="phone" type="tel" defaultValue={form?.phone || ''} data-testid="input-supplier-phone" /><Field label="الأصناف التي يوفرها" name="products" required defaultValue={form?.products || ''} placeholder="مثال: مشروبات، وجبات خفيفة" data-testid="input-supplier-products" />{error && <p className="m-0 text-sm text-[#b44c43]" data-testid="status-supplier-error">{error}</p>}<div className="flex gap-2"><Button type="submit" testId="button-save-supplier" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'جارٍ الحفظ...' : 'حفظ المورد'}</Button><Button secondary testId="button-cancel-supplier" onClick={() => setForm(false)}>إلغاء</Button></div></form></Dialog>}
  </div>;
}

function ReportsPage() {
  const api = useApiOptions(); const today = new Date();
  const formatLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const initialFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`; const initialTo = formatLocalDate(today);
  const [from, setFrom] = useState(initialFrom); const [to, setTo] = useState(initialTo); const [range, setRange] = useState({ from: initialFrom, to: initialTo });
  const q = useGetReports(range, api); const report = q.data;
  const submit = (e: FormEvent) => { e.preventDefault(); if (from <= to) setRange({ from, to }); };
  if (q.isLoading) return <LoadingBlock />;
  if (q.isError || !report) return <ErrorBlock retry={() => q.refetch()} />;
  const daily = report.daily || []; const max = Math.max(1, ...daily.flatMap(d => [Number(d.sales || 0), Number(d.profit || 0)]));
  const best = report.bestSellers || [];
  return <div className="fade-up">
    <PageTitle title="التقارير" subtitle="صورة أوضح عن أداء متجرك خلال الفترة التي تختارها." />
    <form onSubmit={submit} className="panel mb-5 flex flex-wrap items-end gap-3 p-4">
      <div className="flex items-center gap-2 self-center text-sm font-bold text-[#344357]"><CalendarDays size={18} className="text-[#286247]" />الفترة</div>
      <Field label="من تاريخ" type="date" value={from} onChange={e => setFrom(e.target.value)} data-testid="input-report-from" />
      <Field label="إلى تاريخ" type="date" value={to} onChange={e => setTo(e.target.value)} data-testid="input-report-to" />
      <Button type="submit" testId="button-apply-report-filter" disabled={from > to}><Filter size={15} />تطبيق الفترة</Button>
      {from > to && <span className="text-xs text-[#b44c43]" data-testid="status-date-error">تاريخ البداية يجب أن يسبق تاريخ النهاية.</span>}
    </form>
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      <StatCard icon={Wallet} label="إجمالي المبيعات" value={<EGP amount={report.totalSales} />} note="خلال الفترة المحددة" accent="bg-[#e8f2ec] text-[#286247]" />
      <StatCard icon={Activity} label="الربح التقديري" value={<EGP amount={report.estimatedProfit} />} note="تقدير الأرباح بعد تكلفة البضاعة" accent="bg-[#edf1f6] text-[#426181]" />
      <StatCard icon={ShoppingBag} label="عدد عمليات البيع" value={Number(report.salesCount || 0).toLocaleString('ar-EG')} note="عملية خلال الفترة" accent="bg-[#f5efe4] text-[#9b7842]" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
      <section className="panel p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="m-0 text-base font-bold">حركة المبيعات اليومية</h2><p className="mb-0 mt-1 text-xs text-[#84909a]">قيمة المبيعات لكل يوم</p></div><span className="rounded-lg bg-[#eaf4ed] p-2 text-[#286247]"><BarChart3 size={18} /></span></div>
        {daily.length ? <div className="flex h-[230px] items-end gap-2 overflow-x-auto border-b border-[#e9ece7] pb-2" data-testid="chart-daily-sales">{daily.map(d => <div key={d.date} className="flex h-full min-w-[42px] flex-1 flex-col items-center justify-end gap-2"><div className="flex h-[88%] w-full max-w-[48px] items-end justify-center gap-1"><div title={`المبيعات ${d.sales} ج.م`} className="w-1/2 rounded-t-md bg-[#4c8b68] transition hover:bg-[#286247]" style={{ height: `${Math.max(3, Number(d.sales || 0) / max * 100)}%` }} /><div title={`الربح ${d.profit} ج.م`} className="w-1/2 rounded-t-md bg-[#b8cfbd] transition hover:bg-[#8daf96]" style={{ height: `${Math.max(3, Number(d.profit || 0) / max * 100)}%` }} /></div><span className="whitespace-nowrap text-[9px] text-[#7b8792]">{new Date(d.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span></div>)}</div> : <EmptyState title="لا توجد حركة في هذه الفترة" body="غيّر الفترة المحددة أو سجّل مبيعات جديدة." />}
        {daily.length > 0 && <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#778391]"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#4c8b68]" />المبيعات</span><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#b8cfbd]" />الربح</span></div>}
      </section>
      <section className="panel overflow-hidden"><div className="border-b border-[#edf0eb] px-5 py-4"><h2 className="m-0 text-base font-bold">الأكثر مبيعاً</h2><p className="mb-0 mt-1 text-xs text-[#84909a]">حسب الكمية خلال الفترة</p></div>{best.length ? <div className="divide-y divide-[#edf0eb]">{best.slice(0, 7).map((item, i) => <div key={item.productId} className="flex items-center gap-3 px-5 py-4" data-testid={`row-bestseller-${item.productId}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? 'bg-[#e9f2ec] text-[#286247]' : 'bg-[#f1f3ef] text-[#697785]'}`}>{String(i + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{item.name}</div><div className="mt-1 text-[11px] text-[#84909a]">{item.quantity} قطعة</div></div><div className="text-left text-xs font-bold"><EGP amount={item.revenue} /></div></div>)}</div> : <EmptyState title="لا توجد بيانات كافية" body="ستظهر المنتجات الأكثر مبيعاً بعد تسجيل العمليات." />}</section>
    </div>
  </div>;
}

function Landing() {
  const { enterDemo } = useDemo(); const [, setLocation] = useLocation();
  return <div dir="rtl" className="min-h-[100dvh] overflow-hidden bg-[#f7f6f1] text-[#1d2d42]">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10"><Link href="/" className="flex items-center gap-3" data-testid="link-home-brand"><img src={`${basePath}/logo.svg`} className="h-11 w-11 rounded-xl" alt="شعار تاجر" /><div><b className="block text-xl">تاجر</b><span className="text-[10px] text-[#74818c]">رفيق شغلك كل يوم</span></div></Link><div className="flex items-center gap-2"><Link href="/sign-in" className="rounded-xl px-4 py-2.5 text-sm font-bold text-[#344357] hover:bg-white" data-testid="link-sign-in">تسجيل الدخول</Link><Link href="/sign-up" className="hidden rounded-xl bg-[#286247] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#204f39] sm:inline-flex" data-testid="link-sign-up">إنشاء حساب</Link></div></header>
    <main>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 md:grid-cols-[1.03fr_.97fr] md:px-10 md:pb-24 md:pt-16">
        <div className="fade-up"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8e5dc] bg-[#edf4ef] px-3 py-1.5 text-xs font-bold text-[#286247]"><span className="h-2 w-2 rounded-full bg-[#43835e]" />إدارة أسهل لمتجرك الصغير</div><h1 className="m-0 max-w-[630px] text-[42px] font-bold leading-[1.35] tracking-tight md:text-[60px]">كل تفاصيل متجرك،<br /><span className="text-[#347454]">في متناول يدك.</span></h1><p className="mt-5 max-w-[510px] text-base leading-8 text-[#697785] md:text-lg">تاجر يجمع المخزون والمبيعات والموردين في مساحة واحدة واضحة. حتى تعرف ماذا تبيع، وماذا تحتاج، وكيف يمشي يومك.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => { enterDemo(); setLocation('/app'); }} data-testid="button-enter-demo" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#286247] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(40,98,71,.16)] transition hover:-translate-y-0.5 hover:bg-[#204f39]"><Store size={17} />جرّب المتجر التجريبي<ArrowLeft size={15} /></button><Link href="/sign-up" className="inline-flex h-12 items-center rounded-xl border border-[#d9dfd9] bg-white px-5 text-sm font-bold text-[#344357] hover:border-[#a9bdb0]" data-testid="button-create-account">ابدأ بحسابك</Link></div><div className="mt-7 flex items-center gap-3 text-xs text-[#78848e]"><span className="flex -space-x-2 space-x-reverse">{['م', 'س', 'ع'].map((c, i) => <span key={c} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f7f6f1] text-xs font-bold ${['bg-[#dbe9df] text-[#286247]', 'bg-[#e7eaf0] text-[#405e7e]', 'bg-[#f1e8d9] text-[#8f7145]'][i]}`}>{c}</span>)}</span><span>مصمم لليوم الحقيقي في المتجر</span></div></div>
        <div className="relative mx-auto w-full max-w-[540px]">
          <div className="absolute -left-8 top-4 h-48 w-48 rounded-full bg-[#dceade]/70 blur-3xl" />
          <div className="relative overflow-hidden rounded-[28px] border border-[#e5e8e2] bg-[#fffefa] p-5 shadow-[0_22px_65px_rgba(34,52,68,.11)] md:p-7">
            <div className="mb-6 flex items-start justify-between"><div><div className="text-xs text-[#87919b]">ملخص المتجر</div><div className="mt-1 text-lg font-bold">الأربعاء، ١٢ يونيو</div></div><span className="rounded-xl bg-[#edf4ef] p-2.5 text-[#286247]"><Activity size={19} /></span></div>
            <div className="rounded-2xl bg-[#18334b] p-5 text-white"><div className="text-xs text-[#c2d3d6]">مبيعات هذا الأسبوع</div><div className="mt-2 flex items-end justify-between"><div className="text-3xl font-bold">١٨٬٧٥٠ <small className="text-sm font-medium text-[#b9cbd0]">ج.م</small></div><div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[10px] text-[#c5e2ce]"><ArrowUpLeft size={12} /> ١٢٪</div></div><div className="mt-5 flex h-16 items-end gap-2">{[30, 47, 38, 68, 52, 84, 72, 98, 62, 80, 57, 91].map((h, i) => <div key={i} className="flex-1 rounded-t bg-[#81b896]" style={{ height: `${h}%`, opacity: .4 + (i / 20) }} />)}</div></div>
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#e8ebe6] p-4"><div className="mb-3 flex items-center justify-between text-xs text-[#7b8792]">صافي الربح <Activity size={15} className="text-[#347454]" /></div><div className="font-bold">٤٬٢٨٠ <small className="text-[10px] font-normal text-[#84909a]">ج.م</small></div><div className="mt-2 text-[10px] text-[#6c987b]">هذا الأسبوع</div></div><div className="rounded-2xl border border-[#e8ebe6] p-4"><div className="mb-3 flex items-center justify-between text-xs text-[#7b8792]">حالة المخزون <Boxes size={15} className="text-[#927442]" /></div><div className="font-bold">٤٢ <small className="text-[10px] font-normal text-[#84909a]">منتج</small></div><div className="mt-2 text-[10px] text-[#b47748]">٣ أصناف قاربت على النفاد</div></div></div>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f6f7f3] px-4 py-3"><div className="rounded-lg bg-[#fff0e9] p-2 text-[#b56749]"><AlertTriangle size={16} /></div><div className="flex-1"><div className="text-xs font-bold">تنبيه المخزون</div><div className="mt-1 text-[10px] text-[#84909a]">زيت زيتون — المتبقي ٢ فقط</div></div><ArrowLeft size={15} className="text-[#89949b]" /></div>
          </div>
          <div className="absolute -bottom-5 -right-5 hidden items-center gap-3 rounded-2xl border border-[#e7e9e3] bg-white p-3 shadow-lg sm:flex"><span className="rounded-xl bg-[#eaf4ed] p-2 text-[#286247]"><Check size={17} /></span><div><div className="text-xs font-bold">بيع مسجل بنجاح</div><div className="mt-1 text-[10px] text-[#87919b]">تم تحديث المخزون تلقائياً</div></div></div>
        </div>
      </section>
      <section className="border-y border-[#e8e9e4] bg-[#fffefa] py-14"><div className="mx-auto max-w-7xl px-5 md:px-10"><div className="mb-8 max-w-xl"><div className="text-xs font-bold text-[#347454]">أدوات يومك في مكان واحد</div><h2 className="mt-2 text-2xl font-bold md:text-3xl">إدارة بسيطة، بدون تفاصيل تضيع وقتك.</h2></div><div className="grid gap-4 md:grid-cols-3">{[{ icon: Package, title: 'مخزون واضح', text: 'اعرف الكمية المتاحة وما يقترب من حد إعادة الطلب قبل أن يفوتك.' }, { icon: ShoppingCart, title: 'مبيعات مرتبة', text: 'سجّل عملية البيع في لحظتها ودع تاجر يحدّث الكميات نيابةً عنك.' }, { icon: FileBarChart2, title: 'قراءة سريعة للأداء', text: 'تابع الإيرادات والأرباح والمنتجات الأكثر حركة خلال أي فترة.' }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#e8ebe6] bg-[#fffefa] p-5"><span className="inline-flex rounded-xl bg-[#eaf4ed] p-3 text-[#286247]"><Icon size={19} /></span><h3 className="mb-2 mt-4 text-base font-bold">{title}</h3><p className="m-0 text-sm leading-7 text-[#778391]">{text}</p></article>)}</div></div></section>
      <section className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 md:grid-cols-2 md:px-10 md:py-20"><div><div className="text-xs font-bold text-[#347454]">معلومة وقت ما تحتاجها</div><h2 className="mt-2 text-2xl font-bold md:text-3xl">القرار الأفضل يبدأ بصورة أوضح.</h2><p className="mt-3 max-w-lg text-sm leading-7 text-[#778391]">بدلاً من أوراق متفرقة وحسابات ذهنية، شاهد مبيعاتك ومخزونك في لوحة واحدة، وارجع لتقارير بسيطة تساعدك تخطط لطلبك القادم.</p><button onClick={() => { enterDemo(); setLocation('/app'); }} data-testid="button-demo-secondary" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#cbd8ce] bg-white px-4 py-3 text-sm font-bold text-[#286247] hover:bg-[#edf4ef]">استكشف لوحة المتجر<ArrowLeft size={15} /></button></div><div className="rounded-[24px] bg-[#eaf0e9] p-6 md:p-8"><div className="rounded-2xl bg-[#fffefa] p-5 shadow-sm"><div className="flex items-center justify-between"><b className="text-sm">أكثر المنتجات مبيعاً</b><span className="text-[10px] text-[#82909a]">هذا الشهر</span></div>{[['قهوة مطحونة', '٧٢ قطعة', 88], ['شاي أخضر', '٥٤ قطعة', 66], ['بسكويت سادة', '٣٨ قطعة', 46]].map(([label, count, width]) => <div key={String(label)} className="mt-5"><div className="mb-2 flex justify-between text-xs"><span>{label}</span><span className="text-[#778391]">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf0eb]"><div className="h-full rounded-full bg-[#4a8865]" style={{ width: `${width}%` }} /></div></div>)}</div></div></section>
      <section className="mx-5 mb-14 rounded-[26px] bg-[#18334b] px-6 py-10 text-center text-white md:mx-auto md:mb-20 md:max-w-7xl md:px-10 md:py-14"><div className="mx-auto max-w-xl"><div className="text-xs font-bold text-[#b9d9c2]">ابدأ من هنا</div><h2 className="mb-3 mt-2 text-2xl font-bold md:text-3xl">جرّب تاجر على بيانات متجر جاهزة.</h2><p className="mb-6 text-sm leading-7 text-[#c3d0d7]">استكشف الصفحات وسجّل عملياتك في وضع التجربة — دون الحاجة لإنشاء حساب.</p><button onClick={() => { enterDemo(); setLocation('/app'); }} data-testid="button-enter-demo-bottom" className="inline-flex items-center gap-2 rounded-xl bg-[#79ac89] px-5 py-3 text-sm font-bold text-[#14334a] transition hover:bg-[#94c2a1]">الدخول إلى التجربة<ArrowLeft size={15} /></button></div></section>
    </main>
    <footer className="border-t border-[#e5e8e2] px-5 py-6 text-center text-xs text-[#89939b]">تاجر — مساحة أوضح لإدارة كل يوم في متجرك</footer>
  </div>;
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const { demo } = useDemo();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-[#f7f6f1]" />;
  if (demo) return <Redirect to="/app" />;
  if (isSignedIn) return <Redirect to="/app" />;
  return <Landing />;
}
function ProtectedPage({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth(); const { demo } = useDemo();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-[#f7f6f1]" />;
  if (!demo && !isSignedIn) return <Redirect to="/" />;
  return <Shell>{children}</Shell>;
}
function AppRoute() { return <ProtectedPage><Overview /></ProtectedPage>; }
function ProductsRoute() { return <ProtectedPage><ProductPage /></ProtectedPage>; }
function SalesRoute() { return <ProtectedPage><SalesPage /></ProtectedPage>; }
function SuppliersRoute() { return <ProtectedPage><SupplierPage /></ProtectedPage>; }
function ReportsRoute() { return <ProtectedPage><ReportsPage /></ProtectedPage>; }
function NotFoundPage() { return <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f7f6f1] p-6 text-center" dir="rtl"><div className="text-6xl font-bold text-[#286247]">٤٠٤</div><h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h1><p className="text-sm text-[#778391]">قد يكون الرابط غير صحيح أو أن الصفحة نُقلت.</p><Link href="/" className="mt-4 rounded-xl bg-[#286247] px-5 py-3 text-sm font-bold text-white" data-testid="link-not-found-home">العودة للرئيسية</Link></div>; }

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function RoutedApp() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={arSA}
    routerPush={to => setLocation(stripBase(to))}
    routerReplace={to => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><TooltipProvider><DemoProvider><CacheUserWatcher /><RoutedErrorBoundary><Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/app" component={AppRoute} />
      <Route path="/products" component={ProductsRoute} />
      <Route path="/sales" component={SalesRoute} />
      <Route path="/suppliers" component={SuppliersRoute} />
      <Route path="/reports" component={ReportsRoute} />
      <Route component={NotFoundPage} />
    </Switch></RoutedErrorBoundary><Toaster /></DemoProvider></TooltipProvider></QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <WouterRouter base={basePath}><RoutedApp /></WouterRouter>;
}

export default App;
