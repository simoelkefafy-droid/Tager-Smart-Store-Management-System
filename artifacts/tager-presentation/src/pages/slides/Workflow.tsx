const base = import.meta.env.BASE_URL;

export default function Workflow() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob blob-gold left-[-28vw] top-[-30vh] rotate-12" />
    <h1 className="enter">كيف يعمل النظام؟ من العملية إلى التقرير</h1>
    <div className="grid grid-cols-[1.2fr_1fr] gap-[3vw] mt-[4vh] items-center h-[65vh] enter-later">
      <div className="flex flex-col gap-[1vh]">
        <div className="diagram-node"><p>تسجيل الدخول ← الوصول إلى بيانات الحساب</p></div>
        <span className="diagram-arrow">↓</span>
        <div className="diagram-node"><p>إعداد المنتجات والموردين</p></div>
        <span className="diagram-arrow">↓</span>
        <div className="grid grid-cols-2 gap-[1.5vw]">
          <div className="diagram-node !bg-primary !text-bg"><p>شراء: استلام الكمية ← زيادة الرصيد وتحديث متوسط التكلفة</p></div>
          <div className="diagram-node !bg-primary !text-bg"><p>بيع: التحقق من المتاح ← تسجيل البيع وخصم الكمية</p></div>
        </div>
        <span className="diagram-arrow">↓</span>
        <div className="diagram-node"><p>توثيق الحركة ← تحديث لوحة المتجر والتقارير</p></div>
      </div>
      <div className="relative"><img crossOrigin="anonymous" src={`${base}media/owner.jpg`} alt="مشهد توضيحي مولد لإدارة يوم المتجر" className="scene h-[59vh]" /><span className="photo-label">صورة توضيحية مولّدة</span></div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>09 / 12</span></div>
  </div>;
}
