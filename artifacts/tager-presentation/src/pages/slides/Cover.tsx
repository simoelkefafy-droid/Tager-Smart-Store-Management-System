const base = import.meta.env.BASE_URL;

export default function Cover() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob blob-gold left-[-10vw] top-[-25vh] rotate-12" />
    <div className="blob right-[-25vw] bottom-[-46vh] rotate-45" />
    <div className="absolute left-0 top-0 h-[100vh] w-[43vw] overflow-hidden">
      <img crossOrigin="anonymous" src={`${base}media/store.jpg`} alt="مشهد توضيحي مولد لمتجر صغير" className="h-full w-full object-cover opacity-15" />
    </div>
    <div className="relative grid grid-cols-[1.2fr_1fr] gap-[4vw] h-[82vh]">
      <div className="flex flex-col enter">
        <div className="flex items-center gap-[1.3vw]"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="شعار Tager الحالي" className="logo-tager" /><span className="font-display text-[2vw] font-bold text-primary">تاجر</span></div>
        <h1 className="mt-[2vh]"><span className="en block !text-[7vw] leading-[1.1]">Tager</span><span className="en block !text-[2.6vw] mt-[1vh]">— Smart Store Management System</span></h1>
        <p className="mt-[2vh] !text-[2.45vw] font-semibold">نظام ذكي لإدارة المتاجر الصغيرة</p>
        <div className="mt-auto space-y-[2.2vh] pb-[1vh]">
          <div><p className="attribution text-primary font-semibold">صاحبة المشروع والمنفذة: سهام كامل محمود الكفافي</p><p className="attribution en mt-[.7vh] text-left">Prepared by: Seham Kamel Mahmoud Elkefafy</p></div>
          <div className="border-t border-accent/40 pt-[2vh]"><p className="attribution text-primary font-semibold">الإشراف الأكاديمي: د. طه محمود متولي نور الدين</p><p className="attribution en mt-[.7vh] text-left">Under the supervision of: Dr. Taha Mahmoud Metwally Nour El-Dein</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-[1.6vw] items-center enter-later">
        <div className="pt-[11vh]"><img crossOrigin="anonymous" src={`${base}portraits/seham.jpg`} alt="صورة سهام الأصلية دون تغيير ملامحها" className="portrait h-[43vh]" /><p className="caption text-center mt-[2vh] font-semibold text-primary">صاحبة المشروع والمنفذة</p></div>
        <div className="pb-[11vh]"><img crossOrigin="anonymous" src={`${base}portraits/supervisor.jpg`} alt="صورة د. طه الأصلية" className="portrait h-[43vh]" /><p className="caption text-center mt-[2vh] font-semibold text-primary">المشرف الأكاديمي</p></div>
      </div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>01 / 12</span></div>
  </div>;
}
