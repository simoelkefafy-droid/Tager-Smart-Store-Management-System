import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { arSA } from '@clerk/localizations';
import { shadcn } from '@clerk/themes';
import authImg from '@/assets/images/auth-storefront.webp';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Activity, BarChart3, Home, LogOut, Menu, Package, Plus, ShoppingCart, Truck, X, ReceiptText } from 'lucide-react';
import { Route, Switch, Router as WouterRouter, Link, Redirect, useLocation } from 'wouter';
import { InventoryMovementsPage } from '@/pages/inventory-movements';
import { PurchasesPage } from '@/pages/purchases';
import { ReportsPage } from '@/pages/reports';
import { Landing } from '@/pages/landing';
import { Overview } from '@/pages/overview';
import { ProductPage } from '@/pages/products';
import { SalesPage } from '@/pages/sales';
import { SupplierPage } from '@/pages/suppliers';

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
