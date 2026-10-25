import { Link } from 'wouter';
import { ArrowLeft, BarChart3, Boxes, ClipboardList, PackageCheck, ReceiptText, ShoppingCart, Truck } from 'lucide-react';
import heroWide from '@/assets/images/hero-original-wide.webp';
import heroMobile from '@/assets/images/hero-original-mobile.webp';
import inventoryImg from '@/assets/images/inventory.webp';
import storefront from '@/assets/images/auth-storefront.webp';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const ribbon = ['المخزون', 'المبيعات', 'المشتريات', 'الموردون', 'حركة المخزون', 'التقارير', 'الربح الإجمالي', 'تنبيهات النواقص'];

const day = [
  { time: 'الصبح', title: 'استلام بضاعة المورد', body: 'سجّل فاتورة المشتريات، فيرتفع الرصيد وتُحدَّث تكلفة الوحدة تلقائياً.', icon: Truck },
  { time: 'الضهر', title: 'زبون ورا زبون', body: 'أضف الأصناف لعملية البيع وأكّد. الكمية تُخصم من المخزون في نفس اللحظة.', icon: ShoppingCart },
  { time: 'العصر', title: 'جرد سريع', body: 'لو الرف مختلف عن الدفتر، عدّل الكمية مع سبب واضح يُحفظ في سجل الحركة.', icon: ClipboardList },
  { time: 'آخر اليوم', title: 'تقفيل الحساب', body: 'راجع المبيعات وتكلفة البضاعة والربح الإجمالي بتوقيت القاهرة، وصدّرها CSV.', icon: BarChart3 },
];

export function Landing() {
  return <div dir="rtl" className="min-h-[100dvh] overflow-x-hidden bg-[#f4f1e6] text-[#14261d]">
    {/* Top bar */}
    <header className="relative z-20 mx-auto flex max-w-[1320px] items-center justify-between gap-3 px-5 py-5 md:px-10">
      <Link href="/" className="flex items-center gap-3" data-testid="link-home-brand"><img src={`${basePath}/logo.svg`} width={44} height={44} className="h-11 w-11 rounded-2xl" alt="شعار تاجر" /><span className="tg-display text-2xl font-bold">تاجر</span></Link>
      <nav className="flex items-center gap-1.5 sm:gap-2">
        <Link href="/sign-in" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-[#2c4337] hover:bg-[#e9e4d3]" data-testid="link-sign-in">تسجيل الدخول</Link>
        <Link href="/sign-up" className="inline-flex min-h-11 items-center rounded-full bg-[#17402d] px-5 text-sm font-bold text-[#f4f1e6] hover:bg-[#0f2f20]" data-testid="link-sign-up">حساب جديد</Link>
      </nav>
    </header>

    <main>
      {/* Hero: centered editorial headline over a cinematic shop band */}
      <section className="relative px-5 pt-6 text-center md:px-10 md:pt-12">
        <div className="tg-rise mx-auto inline-flex items-center gap-2 rounded-full border border-[#d6d0bb] bg-[#fbf9f2] px-4 py-2 text-xs font-bold text-[#2f5a43]"><span className="h-2 w-2 rounded-full bg-[#7fae3a]" />دفتر المحل، بس أوضح</div>
        <h1 className="tg-display tg-rise tg-rise-2 mx-auto mt-6 max-w-[1050px] text-[38px] font-bold leading-[1.25] tracking-tight sm:text-[64px] lg:text-[92px]">
          اعرف إيه اللي <span className="relative inline-block text-[#1f6b45]">على الرف<svg aria-hidden className="absolute -bottom-2 right-0 h-3 w-full" viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M2 9 C 50 2, 150 2, 198 8" stroke="#c9e265" strokeWidth="6" fill="none" strokeLinecap="round" /></svg></span><br className="hidden sm:block" /> وإيه اللي في الدرج.
        </h1>
        <p className="tg-rise tg-rise-3 mx-auto mt-5 max-w-[620px] lg:mt-9 text-[15px] leading-8 text-[#4f6157] md:text-lg">تاجر مساحة عمل عربية لصاحب محل الحي: مخزون حقيقي، مبيعات تُخصم فوراً، مشتريات من الموردين، وتقارير ربح إجمالي بتوقيت القاهرة.</p>
        <div className="tg-rise tg-rise-4 mx-auto mt-7 flex max-w-[420px] flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
          <Link href="/sign-up" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#17402d] px-7 text-base font-bold text-[#f4f1e6] shadow-[0_10px_30px_rgba(23,64,45,.25)] hover:bg-[#0f2f20]" data-testid="button-create-account">افتح دفتر محلك<ArrowLeft size={18} /></Link>
          <Link href="/sign-in" className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#cfc8b1] bg-[#fbf9f2] px-7 text-base font-bold text-[#17402d] hover:bg-white" data-testid="button-hero-sign-in">عندي حساب</Link>
        </div>

        <div className="relative mx-auto mt-10 max-w-[1320px] md:mt-14">
          <div className="overflow-hidden rounded-[36px] border border-[#d6d0bb] md:rounded-[48px]">
            <picture><source media="(max-width: 640px)" srcSet={heroMobile} width={600} height={679} /><img src={heroWide} width={1024} height={679} fetchPriority="high" loading="eager" decoding="async" alt="طاولة بيع في محل صغير بالحي، عليها جهاز لوحي وأدوات البيع اليومية" className="tg-hero-img aspect-[600/679] w-full object-cover object-center sm:aspect-auto sm:h-[420px] lg:h-[520px]" /></picture>
          </div>
          {/* floating feature tickets, describe real features only */}
          <div className="absolute -bottom-8 right-4 hidden w-[290px] rotate-[-2deg] rounded-[22px] border border-[#d6d0bb] bg-[#fbf9f2] p-5 text-right shadow-[0_20px_50px_rgba(20,38,29,.18)] md:block lg:right-12">
            <div className="flex items-center gap-2 text-xs font-bold text-[#2f5a43]"><ReceiptText size={15} />عملية بيع</div>
            <div className="tg-display mt-2 text-lg font-bold">تأكيد البيع = خصم من المخزون</div>
            <div className="mt-3 border-t border-dashed border-[#cfc8b1] pt-3 text-xs leading-6 text-[#5a6b61]">تكلفة الوحدة تُحفظ وقت البيع، فيبقى الربح الإجمالي صحيحاً حتى لو تغيّر سعر الشراء.</div>
          </div>
          <div className="absolute -top-6 left-4 hidden w-[250px] rotate-[2deg] rounded-[22px] bg-[#17402d] p-5 text-right text-[#f4f1e6] shadow-[0_20px_50px_rgba(20,38,29,.25)] md:block lg:left-12">
            <div className="flex items-center gap-2 text-xs font-bold text-[#c9e265]"><PackageCheck size={15} />تنبيه نواقص</div>
            <div className="mt-2 text-sm leading-7 text-[#dfe8d9]">حدد حداً أدنى لكل صنف، ويظهر لك في الرئيسية قبل ما يخلص.</div>
          </div>
        </div>
      </section>

      {/* Ribbon */}
      <div className="mt-20 overflow-hidden border-y border-[#17402d] bg-[#c9e265] py-4" aria-hidden>
        <div className="tg-marquee flex w-max gap-10 whitespace-nowrap">
          {[...ribbon, ...ribbon, ...ribbon, ...ribbon].map((w, i) => <span key={i} className="tg-display flex items-center gap-10 text-xl font-bold text-[#17402d]">{w}<span className="h-2 w-2 rotate-45 bg-[#17402d]" /></span>)}
        </div>
      </div>

      {/* Day timeline */}
      <section className="mx-auto max-w-[1320px] px-5 py-20 md:px-10 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <div className="text-sm font-bold text-[#1f6b45]">يوم في المحل</div>
            <h2 className="tg-display mt-3 text-4xl font-bold leading-tight md:text-5xl">من فتح الباب<br />لحد التقفيل.</h2>
            <p className="mt-5 max-w-md text-base leading-8 text-[#4f6157]">كل خطوة في يومك لها مكان في تاجر، وكل حركة تترك أثراً في سجل المخزون تقدر ترجع له.</p>
          </div>
          <ol className="m-0 list-none p-0">
            {day.map(({ time, title, body, icon: Icon }, i) => <li key={title} className="grid grid-cols-[64px_1fr] gap-5 border-t border-[#d6d0bb] py-8 last:border-b">
              <div className="tg-num text-5xl font-extrabold text-[#c4bc9f]">{String(i + 1).padStart(2, '0')}</div>
              <div><div className="flex items-center gap-2 text-xs font-bold text-[#1f6b45]"><Icon size={15} />{time}</div><h3 className="tg-display mt-2 text-2xl font-bold">{title}</h3><p className="mt-2 max-w-lg text-[15px] leading-7 text-[#4f6157]">{body}</p></div>
            </li>)}
          </ol>
        </div>
      </section>

      {/* Inventory editorial split */}
      <section className="bg-[#17402d] text-[#f4f1e6]">
        <div className="mx-auto grid max-w-[1320px] items-stretch lg:grid-cols-2">
          <img src={inventoryImg} width={1024} height={1024} loading="lazy" alt="أصناف مخزون مرتبة على سطح خشبي" className="h-[320px] w-full object-cover lg:h-full" />
          <div className="px-6 py-16 md:px-14 md:py-24">
            <Boxes className="text-[#c9e265]" size={30} />
            <h2 className="tg-display mt-5 text-4xl font-bold leading-tight md:text-5xl">الرصيد مش تخمين.</h2>
            <p className="mt-5 max-w-md text-base leading-8 text-[#c8d6c9]">رصيد افتتاحي، مشتريات، مبيعات، وتسويات جرد. كل رقم في المخزون وراه حركة مسجلة بالرصيد قبلها وبعدها.</p>
            <ul className="mt-8 grid gap-3 p-0 text-sm">
              {['سجل حركة مخزون قابل للبحث والتصدير', 'متوسط تكلفة مرجّح مع كل فاتورة شراء', 'كل حساب يرى بيانات متجره وحده'].map(t => <li key={t} className="flex items-center gap-3 rounded-2xl border border-white/15 px-4 py-3"><span className="h-2 w-2 rounded-full bg-[#c9e265]" />{t}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* Closing CTA with storefront */}
      <section className="mx-auto max-w-[1320px] px-5 py-20 md:px-10 md:py-28">
        <div className="relative overflow-hidden rounded-[40px]">
          <img src={storefront} width={1024} height={1280} loading="lazy" alt="واجهة محل صغير في حي سكني" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-[#0f2f20]/95 via-[#0f2f20]/75 to-[#0f2f20]/30" />
          <div className="relative max-w-xl px-7 py-16 text-[#f4f1e6] md:px-14 md:py-24">
            <h2 className="tg-display text-4xl font-bold leading-tight md:text-5xl">محلك يستاهل دفتر يفهمه.</h2>
            <p className="mt-4 text-base leading-8 text-[#d3dfd2]">أنشئ حسابك، أضف أصنافك وأرصدتها الافتتاحية، وابدأ تسجّل من أول زبون.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-up" data-testid="link-signup-bottom" className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[#c9e265] px-7 font-bold text-[#17402d] hover:bg-[#d7ec84]">ابدأ الآن<ArrowLeft size={18} /></Link>
              <Link href="/sign-up" data-testid="link-signup-secondary" className="inline-flex min-h-[52px] items-center rounded-full border border-white/40 px-7 font-bold text-white hover:bg-white/10">إنشاء حساب مجاني</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
    <footer className="border-t border-[#d6d0bb] px-5 py-8 text-center text-xs text-[#5a6b61]"><span className="tg-display font-bold text-[#17402d]">تاجر</span> — دفتر محل الحي، بالعربي.</footer>
  </div>;
}
