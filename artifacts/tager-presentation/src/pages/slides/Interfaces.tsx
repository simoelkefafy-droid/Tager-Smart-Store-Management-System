const base = import.meta.env.BASE_URL;

export default function Interfaces() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob blob-gold left-[-22vw] top-[-48vh] -rotate-12" />
    <h1 className="enter">من داخل Tager: واجهات حقيقية من التطبيق</h1>
    <div className="grid grid-cols-3 gap-[2.5vw] mt-[4vh] h-[63vh] enter-later">
      <div className="flex flex-col">
        <img crossOrigin="anonymous" src={`${base}screens/overview.png`} alt="لوحة المتجر الحقيقية من التطبيق" className="screenshot h-[36vh]" />
        <p className="mt-[2vh]"><strong className="text-primary">لوحة المتجر:</strong> ملخص المبيعات والأصناف منخفضة المخزون</p>
      </div>
      <div><img crossOrigin="anonymous" src={`${base}screens/products.png`} alt="واجهة المنتجات والمخزون الحقيقية" className="screenshot h-[36vh]" /><p className="mt-[2vh]"><strong className="text-primary">المنتجات والمخزون:</strong> بحث وتصنيف ومتابعة الكميات والأسعار</p></div>
      <div><img crossOrigin="anonymous" src={`${base}screens/reports.png`} alt="واجهة التقارير الحقيقية" className="screenshot h-[36vh]" /><p className="mt-[2vh]"><strong className="text-primary">التقارير:</strong> فلاتر زمنية ورسوم يومية وترتيب الأعلى مبيعًا</p></div>
    </div>
    <p className="caption soft absolute bottom-[10vh] right-[5vw]">لقطات فعلية من حساب عرض منفصل، دون تعديل بيانات المتجر الحقيقي.</p>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>07 / 12</span></div>
  </div>;
}
