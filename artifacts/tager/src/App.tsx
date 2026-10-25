import { useEffect, useMemo, useState, type FormEvent, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { arSA } from '@clerk/localizations';
import { shadcn } from '@clerk/themes';
import authImg from '@/assets/images/auth-storefront.webp';
import emptyBox from '@/assets/images/empty-box.webp';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  getGetDashboardQueryKey, getGetReportsQueryKey, getListProductsQueryKey,
  getListSalesQueryKey, getListSuppliersQueryKey,
  getListInventoryMovementsQueryKey,
  useCreateProduct, useCreateSale, useCreateSupplier, useDeleteProduct,
  useDeleteSupplier, useGetDashboard, useListProducts,
  useListSales, useListSuppliers, useUpdateProduct, useUpdateSupplier,
  type Product, type Supplier, type Sale,
} from '@workspace/api-client-react';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowUpLeft, BarChart3,
  Boxes, Check, ChevronDown, CircleHelp, FileBarChart2, Filter,
  Home, LogOut, Menu, Package, Plus, Search, ShoppingCart,
  Store, Truck, Wallet, X, Pencil, Trash2, RotateCw, Users, ReceiptText,
} from 'lucide-react';
import { Route, Switch, Router as WouterRouter, Link, Redirect, useLocation } from 'wouter';
import { InventoryMovementsPage } from '@/pages/inventory-movements';
import { PurchasesPage } from '@/pages/purchases';
import { ReportsPage } from '@/pages/reports';
import { Landing } from '@/pages/landing';
import { Overview } from '@/pages/overview';
import { ProductPage } from '@/pages/products';
import { PageTitle, Button, LoadingBlock, ErrorBlock, EmptyState, EGP, StatCard, Dialog, Field, SelectField, getErrorMessage, useApiOptions } from '@/components/app/ui';

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
    colorPrimary: '#17402d', colorForeground: '#14261d', colorMutedForeground: '#687789',
    colorDanger: '#bd4540', colorBackground: '#fffdf6', colorInput: '#fffdf6',
    colorInputForeground: '#14261d', colorNeutral: '#dce1df',
    fontFamily: "'IBM Plex Sans Arabic', sans-serif", borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf6] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#e1e5df]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#14261d] font-bold', headerSubtitle: 'text-[#687789]',
    socialButtonsBlockButtonText: 'text-[#14261d]', formFieldLabel: 'text-[#26374b]',
    footerActionLink: 'text-[#1f6b45]', footerActionText: 'text-[#687789]',
    dividerText: 'text-[#687789]', identityPreviewEditButton: 'text-[#1f6b45]',
    formFieldSuccessText: 'text-[#1f6b45]', alertText: 'text-[#8d3734]',
    logoBox: 'mb-3', logoImage: 'max-h-10', socialButtonsBlockButton: 'border-[#dce1df]',
    formButtonPrimary: 'bg-[#17402d] hover:bg-[#0f2f20] !text-white', formFieldInput: 'border-[#dce1df]',
    footerAction: 'border-t border-[#e4e0d1]', dividerLine: 'bg-[#dce1df]',
    alert: 'border-[#efceca] bg-[#fbe9e4]', otpCodeFieldInput: 'border-[#dce1df]',
    formFieldRow: 'mb-4', main: 'gap-5',
  },
};

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
  return <div className="grid min-h-[100dvh] grid-cols-1 bg-[#f6f5ef] lg:grid-cols-[1fr_1.05fr]" dir="rtl"><div className="flex min-w-0 items-center justify-center px-4 py-10"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} fallbackRedirectUrl={`${basePath}/app`} forceRedirectUrl={`${basePath}/app`} /></div><div className="relative hidden lg:block"><img src={authImg} width={1024} height={1280} alt="واجهة متجر صغير في حي سكني" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-[#172d45]/85 via-[#172d45]/20 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-12 text-white"><div className="text-3xl font-bold leading-snug">أهلاً بعودتك إلى متجرك</div><p className="mt-3 max-w-sm text-sm leading-7 text-white/80">مخزونك ومبيعاتك وموردوك في مكان واحد واضح.</p></div></div></div>;
}
function SignUpPage() {
  return <div className="grid min-h-[100dvh] grid-cols-1 bg-[#f6f5ef] lg:grid-cols-[1fr_1.05fr]" dir="rtl"><div className="flex min-w-0 items-center justify-center px-4 py-10"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} fallbackRedirectUrl={`${basePath}/app`} forceRedirectUrl={`${basePath}/app`} /></div><div className="relative hidden lg:block"><img src={authImg} width={1024} height={1280} alt="واجهة متجر صغير في حي سكني" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-[#172d45]/85 via-[#172d45]/20 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-12 text-white"><div className="text-3xl font-bold leading-snug">ابدأ دفتر متجرك اليوم</div><p className="mt-3 max-w-sm text-sm leading-7 text-white/80">مخزونك ومبيعاتك وموردوك في مكان واحد واضح.</p></div></div></div>;
}

const navItems = [
  { href: '/app', label: 'نظرة عامة', mobileLabel: 'الرئيسية', icon: Home },
  { href: '/products', label: 'المنتجات والمخزون', mobileLabel: 'المنتجات', icon: Package },
  { href: '/sales', label: 'المبيعات', mobileLabel: 'المبيعات', icon: ShoppingCart },
  { href: '/purchases', label: 'المشتريات', mobileLabel: 'المشتريات', icon: ReceiptText },
  { href: '/suppliers', label: 'الموردون', mobileLabel: 'الموردون', icon: Truck },
  { href: '/inventory-movements', label: 'سجل حركة المخزون', mobileLabel: 'المخزون', icon: Activity },
  { href: '/reports', label: 'التقارير', mobileLabel: 'التقارير', icon: BarChart3 },
];

const navGroups = [
  { title: 'اليوم', items: ['/app', '/sales'] },
  { title: 'البضاعة', items: ['/products', '/purchases', '/inventory-movements'] },
  { title: 'الحسابات', items: ['/suppliers', '/reports'] },
];

function NavList({ location, onPick, prefix }: { location: string; onPick?: () => void; prefix: string }) {
  return <nav className="space-y-6" aria-label="التنقل الرئيسي">{navGroups.map(g => <div key={g.title}>
    <div className="mb-2 px-3 text-[11px] font-bold text-[#8a8466]">{g.title}</div>
    <div className="space-y-1">{g.items.map(h => { const n = navItems.find(x => x.href === h)!; const Icon = n.icon; return <Link key={h} href={h} onClick={onPick} data-testid={`${prefix}${h.slice(1)}`} aria-current={location === h ? 'page' : undefined} className={`tg-navlink flex min-h-12 items-center gap-3 rounded-2xl px-2 text-sm font-semibold ${location === h ? 'is-active' : 'text-[#2c4337]'}`}><span className="tg-navicon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"><Icon size={18} strokeWidth={1.9} /></span><span>{n.label}</span></Link>; })}</div>
  </div>)}</nav>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const client = useQueryClient();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const logOut = async () => {
    await signOut({ redirectUrl: basePath || '/' });
    client.clear();
  };
  const current = navItems.find(n => n.href === location);
  return <div className="app-shell tg-paper" dir="rtl">
    <aside className="desktop-sidebar tg-rail fixed right-0 top-0 z-30 flex h-full w-[264px] flex-col overflow-y-auto px-4 py-6">
      <Link href="/app" className="mb-8 flex items-center gap-3 px-2" data-testid="link-brand"><img src={`${basePath}/logo.svg`} width={40} height={40} className="h-10 w-10 rounded-2xl" alt="شعار تاجر" /><div><div className="tg-display text-xl font-bold text-[#17402d]">تاجر</div><div className="text-[11px] text-[#7b7a66]">دفتر محلك</div></div></Link>
      <NavList location={location} prefix="nav-" />
      <div className="mt-auto pt-6">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-[#e4e0d1] bg-[#f4f1e6] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17402d] text-sm font-bold text-[#c9e265]">{user?.firstName?.slice(0, 1) || 'ت'}</div><div className="min-w-0"><div className="truncate text-xs font-bold text-[#14261d]">{user?.fullName || 'حساب المتجر'}</div><div className="truncate text-[11px] text-[#7b7a66]">{user?.primaryEmailAddress?.emailAddress || 'حساب تاجر'}</div></div></div>
        <button onClick={logOut} data-testid="button-logout" className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-[#5a6b61] transition hover:bg-[#efeadb] hover:text-[#14261d]"><LogOut size={17} />تسجيل الخروج</button>
      </div>
    </aside>
    {mobileOpen && <button aria-label="إغلاق القائمة" className="fixed inset-0 z-40 bg-[#14261d]/40 md:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`tg-rail fixed right-0 top-0 z-50 flex h-full w-[284px] flex-col overflow-y-auto px-4 py-6 transition-transform md:hidden ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!mobileOpen}>
      <div className="mb-7 flex items-center justify-between"><Link href="/app" onClick={() => setMobileOpen(false)} className="flex items-center gap-3"><img src={`${basePath}/logo.svg`} width={36} height={36} className="h-9 w-9 rounded-xl" alt="شعار تاجر" /><b className="tg-display text-lg text-[#17402d]">تاجر</b></Link><button aria-label="إغلاق القائمة" className="flex h-11 w-11 items-center justify-center rounded-xl text-[#2c4337] hover:bg-[#efeadb]" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={20} /></button></div>
      <NavList location={location} prefix="mobile-nav-" onPick={() => setMobileOpen(false)} />
      <button onClick={logOut} data-testid="button-mobile-logout" className="mt-auto flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-[#5a6b61]"><LogOut size={17} />تسجيل الخروج</button>
    </aside>
    <div className="md:mr-[264px]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-[#e4e0d1] bg-[#f4f1e6]/90 px-4 backdrop-blur md:px-8">
        <div className="flex min-w-0 items-center gap-3"><button aria-label="فتح القائمة" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#17402d] hover:bg-[#efeadb] md:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu size={21} /></button><div className="min-w-0"><div className="text-[11px] font-semibold text-[#7b7a66]">تاجر /</div><div className="tg-display truncate text-lg font-bold text-[#14261d]">{current?.label || 'تاجر'}</div></div></div>
        <div className="flex items-center gap-2">
          {location !== '/sales' && <Link href="/sales" className="hidden min-h-11 items-center gap-2 rounded-full bg-[#17402d] px-4 text-sm font-bold text-[#f4f1e6] hover:bg-[#0f2f20] sm:inline-flex" data-testid="link-header-new-sale"><Plus size={16} />بيع جديد</Link>}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17402d] text-sm font-bold text-[#c9e265] md:hidden" aria-hidden>{user?.firstName?.slice(0, 1) || 'ت'}</div>
        </div>
      </header>
      <main className="mobile-content mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
    <nav className="fixed inset-x-2 bottom-2 z-30 grid grid-cols-7 rounded-[22px] border border-[#e4e0d1] bg-[#fbf9f2]/95 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 shadow-[0_10px_30px_rgba(20,38,29,.14)] backdrop-blur md:hidden" aria-label="تنقل سريع">
      {navItems.map(({ href, mobileLabel, icon: Icon }) => <Link key={href} href={href} data-testid={`bottom-nav-${href.slice(1)}`} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-[9px] ${location === href ? 'bg-[#17402d] font-bold text-[#f4f1e6]' : 'text-[#5a6b61]'}`}><Icon size={18} strokeWidth={location === href ? 2.2 : 1.8} /><span className="max-w-full truncate">{mobileLabel}</span></Link>)}
    </nav>
  </div>;
}


function SalesTable({ sales }: { sales: Sale[] }) {
  return <div className="overflow-x-auto"><table className="responsive-table w-full text-right text-sm"><thead className="bg-[#f4f1e6] text-[11px] font-semibold text-[#5a6b61]"><tr><th className="px-5 py-3">رقم العملية</th><th className="px-4 py-3">المنتجات</th><th className="px-4 py-3">التاريخ</th><th className="px-5 py-3">الإجمالي</th></tr></thead><tbody className="divide-y divide-[#ece7d6]">{sales.map(s => <tr key={s.id} data-testid={`row-sale-${s.id}`} className="hover:bg-[#f7f3e7]"><td data-label="رقم العملية" className="px-5 py-4 font-bold">#{s.id}</td><td data-label="المنتجات" className="px-4 py-4 text-[#627080]">{s.items?.length || 0} أصناف</td><td data-label="التاريخ" className="px-4 py-4 text-[#627080]">{new Date(s.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td data-label="الإجمالي" className="px-5 py-4 font-bold"><EGP amount={s.total} /></td></tr>)}</tbody></table></div>;
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
    try { await createSale.mutateAsync({ data: { items: cart } }); setCart([]); setNotice('تم تسجيل عملية البيع وتحديث المخزون.'); await Promise.all([client.invalidateQueries({ queryKey: getListSalesQueryKey() }), client.invalidateQueries({ queryKey: getListProductsQueryKey() }), client.invalidateQueries({ queryKey: getGetDashboardQueryKey() }), client.invalidateQueries({ queryKey: getGetReportsQueryKey() }), client.invalidateQueries({ queryKey: getListInventoryMovementsQueryKey() })]); }
    catch (e) { setError(getErrorMessage(e)); }
  };
  if (productsQ.isLoading || salesQ.isLoading) return <LoadingBlock />;
  if (productsQ.isError || salesQ.isError) return <ErrorBlock retry={() => { productsQ.refetch(); salesQ.refetch(); }} />;
  return <div className="fade-up">
    <PageTitle title="المبيعات" subtitle="سجّل المبيعات بسهولة وراجع سجل عمليات متجرك." />
    <div className="grid items-start gap-5 xl:grid-cols-[.85fr_1.4fr]">
      <section className="panel p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="m-0 text-lg font-bold">عملية بيع جديدة</h2><p className="mb-0 mt-1 text-xs text-[#5a6b61]">أضف المنتجات وحدد الكمية</p></div><span className="rounded-2xl bg-[#e6efd0] p-2.5 text-[#1f6b45]"><ShoppingCart size={19} /></span></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_100px_auto]">
          <SelectField label="المنتج" value={selected} onChange={e => setSelected(e.target.value)} data-testid="select-sale-product"><option value="">اختر منتجاً</option>{products.map(p => <option key={p.id} value={p.id} disabled={p.quantity < 1}>{p.name} — {p.quantity} متاح</option>)}</SelectField>
          <Field label="الكمية" type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} data-testid="input-sale-quantity" />
          <div className="flex items-end"><Button testId="button-add-to-sale" onClick={add} secondary><Plus size={16} />أضف</Button></div>
        </div>
        <div className="my-5 border-t border-[#ece7d6]" />
        {cart.length ? <div className="space-y-3">{cart.map(item => { const p = products.find(x => x.id === item.productId)!; return <div key={item.productId} className="flex items-center justify-between gap-2 rounded-2xl bg-[#f4f1e6] p-3" data-testid={`cart-item-${p.id}`}><div><div className="text-sm font-bold">{p.name}</div><div className="mt-1 text-xs text-[#5a6b61]">{item.quantity} × <EGP amount={p.sellingPrice} /></div></div><div className="flex items-center gap-3"><b className="text-sm"><EGP amount={item.quantity * p.sellingPrice} /></b><button aria-label="إزالة المنتج" onClick={() => setCart(old => old.filter(i => i.productId !== item.productId))} data-testid={`button-remove-cart-${p.id}`} className="rounded-lg p-1.5 text-[#5a6b61] hover:bg-[#fff0ed]"><X size={16} /></button></div></div>; })}</div> : <div className="rounded-2xl border border-dashed border-[#d6d0bb] py-7 text-center text-sm text-[#5a6b61]" data-testid="state-cart-empty">لم تُضف منتجات إلى هذه العملية</div>}
        <div className="mt-5 flex items-center justify-between border-t border-[#ece7d6] pt-4"><span className="text-sm font-semibold text-[#627080]">الإجمالي</span><b className="text-xl"><EGP amount={total} /></b></div>
        {error && <div className="mt-3 rounded-2xl border border-[#f0c9c4] bg-[#fbe9e4] p-3 text-sm font-medium text-[#8d2f29]" data-testid="status-sale-error">{error}</div>}
        {notice && <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#e6efd0] p-3 text-sm text-[#1f6b45]" data-testid="status-sale-success"><Check size={16} />{notice}</div>}
        <Button testId="button-complete-sale" onClick={checkout} disabled={!cart.length || createSale.isPending}><Check size={16} />{createSale.isPending ? 'جارٍ تسجيل البيع...' : 'تأكيد عملية البيع'}</Button>
      </section>
      <section className="panel overflow-hidden"><div className="border-b border-[#ece7d6] px-5 py-4"><h2 className="m-0 text-base font-bold">سجل المبيعات</h2><p className="mb-0 mt-1 text-xs text-[#5a6b61]">العمليات الأخيرة المسجلة</p></div>{sales.length ? <SalesTable sales={sales} /> : <EmptyState title="لا توجد عمليات بيع" body="ستظهر هنا كل عملية تسجلها في متجرك." />}</section>
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
     {notice && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#bfdcc9] bg-[#e8f4ec] px-4 py-3 text-sm font-semibold text-[#1f6b45] shadow-sm" role="status" data-testid="status-supplier-success">{notice}</div>}
    <div className="mb-5"><label className="relative block max-w-md"><Search size={17} className="absolute right-3 top-3 text-[#5a6b61]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مورد..." data-testid="input-search-suppliers" className="h-11 w-full rounded-2xl border border-[#d6d0bb] bg-white pr-10 pl-3 text-sm outline-none focus:border-[#17402d] focus:ring-2 focus:ring-[#17402d]/20" /></label></div>
    {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((s, index) => <article key={s.id} className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-md" data-testid={`card-supplier-${s.id}`}><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl font-bold ${['bg-[#eaf2ed] text-[#1f6b45]', 'bg-[#edf1f6] text-[#426181]', 'bg-[#f5efe4] text-[#9b7842]'][index % 3]}`}><Users size={19} /></div><div><h2 className="m-0 text-base font-bold">{s.name}</h2><div className="mt-1 text-xs text-[#5a6b61]">مورد رقم {s.id}</div></div></div><div className="flex"><button onClick={() => { setForm(s); setError(''); }} data-testid={`button-edit-supplier-${s.id}`} aria-label="تعديل المورد" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#4d5f72] hover:bg-[#edf3ef]"><Pencil size={15} /></button><button onClick={() => deleteItem(s)} data-testid={`button-delete-supplier-${s.id}`} aria-label="حذف المورد" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#5a6b61] hover:bg-[#fff0ed] hover:text-[#8d2f29]"><Trash2 size={15} /></button></div></div><div className="mt-5 grid gap-3 border-t border-[#ece7d6] pt-4"><div className="flex items-center gap-2 text-sm text-[#617080]"><span className="text-xs font-semibold text-[#5a6b61]">الهاتف</span><span dir="ltr">{s.phone || '—'}</span></div><div><div className="mb-2 text-xs font-semibold text-[#5a6b61]">الأصناف التي يوفرها</div><div className="rounded-lg bg-[#f4f1e6] px-3 py-2 text-sm text-[#425163]">{s.products || 'لم تُحدد أصناف بعد'}</div></div></div></article>)}</div> : <div className="panel"><EmptyState title={search ? 'لا توجد نتائج مطابقة' : 'سجّل موردي متجرك'} body={search ? 'جرّب البحث باسم أو رقم هاتف مختلف.' : 'احتفظ ببيانات التواصل والأصناف التي يوفرها كل مورد.'} action={!search ? <Button testId="button-empty-add-supplier" onClick={() => setForm(null)}><Plus size={15} />إضافة مورد</Button> : undefined} /></div>}
    {error && <div className="mt-3 rounded-2xl border border-[#f0c9c4] bg-[#fbe9e4] p-3 text-sm font-medium text-[#8d2f29]" data-testid="status-supplier-error">{error}</div>}
    {form !== false && <Dialog title={form ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'} onClose={() => setForm(false)}><form onSubmit={submit} className="grid gap-4"><Field label="اسم المورد" name="name" required defaultValue={form?.name || ''} data-testid="input-supplier-name" /><Field label="رقم الهاتف" name="phone" type="tel" defaultValue={form?.phone || ''} data-testid="input-supplier-phone" /><Field label="الأصناف التي يوفرها" name="products" required defaultValue={form?.products || ''} placeholder="مثال: مشروبات، وجبات خفيفة" data-testid="input-supplier-products" />{error && <p className="m-0 text-sm font-medium text-[#8d2f29]" data-testid="status-supplier-error">{error}</p>}<div className="flex gap-2"><Button type="submit" testId="button-save-supplier" disabled={create.isPending || update.isPending}>{create.isPending || update.isPending ? 'جارٍ الحفظ...' : 'حفظ المورد'}</Button><Button secondary testId="button-cancel-supplier" onClick={() => setForm(false)}>إلغاء</Button></div></form></Dialog>}
  </div>;
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-[#f7f6f1]" />;
  if (isSignedIn) return <Redirect to="/app" />;
  return <Landing />;
}
function ProtectedPage({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-[#f7f6f1]" />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <Shell>{children}</Shell>;
}
function AppRoute() { return <ProtectedPage><Overview /></ProtectedPage>; }
function ProductsRoute() { return <ProtectedPage><ProductPage /></ProtectedPage>; }
function SalesRoute() { return <ProtectedPage><SalesPage /></ProtectedPage>; }
function SuppliersRoute() { return <ProtectedPage><SupplierPage /></ProtectedPage>; }
function ReportsRoute() { return <ProtectedPage><ReportsPage /></ProtectedPage>; }
function InventoryMovementsRoute() { return <ProtectedPage><InventoryMovementsPage /></ProtectedPage>; }
function PurchasesRoute() { return <ProtectedPage><PurchasesPage /></ProtectedPage>; }
function NotFoundPage() { return <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f7f6f1] p-6 text-center" dir="rtl"><div className="text-6xl font-bold text-[#1f6b45]">٤٠٤</div><h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h1><p className="text-sm text-[#5a6b61]">قد يكون الرابط غير صحيح أو أن الصفحة نُقلت.</p><Link href="/" className="mt-4 rounded-2xl bg-[#17402d] px-5 py-3 text-sm font-bold text-white" data-testid="link-not-found-home">العودة للرئيسية</Link></div>; }

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
    <QueryClientProvider client={queryClient}><TooltipProvider><CacheUserWatcher /><RoutedErrorBoundary><Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/app" component={AppRoute} />
      <Route path="/products" component={ProductsRoute} />
      <Route path="/sales" component={SalesRoute} />
      <Route path="/purchases" component={PurchasesRoute} />
      <Route path="/suppliers" component={SuppliersRoute} />
      <Route path="/inventory-movements" component={InventoryMovementsRoute} />
      <Route path="/reports" component={ReportsRoute} />
      <Route component={NotFoundPage} />
    </Switch></RoutedErrorBoundary><Toaster /></TooltipProvider></QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <WouterRouter base={basePath}><RoutedApp /></WouterRouter>;
}

export default App;
