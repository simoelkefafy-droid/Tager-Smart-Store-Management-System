const base = import.meta.env.BASE_URL;

export default function Problem() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob blob-gold left-[-13vw] bottom-[-33vh] -rotate-12" />
    <h1 className="enter">المشكلة: بيانات متفرقة وقرارات أصعب</h1>
    <div className="grid grid-cols-[1.1fr_1fr] gap-[4vw] mt-[5vh] items-center h-[63vh] enter-later">
      <div className="list">
        <p className="bullet">التسجيل اليدوي يصعّب متابعة الكميات المتاحة</p>
        <p className="bullet">تفرّق المبيعات والمشتريات يحجب الصورة الكاملة</p>
        <p className="bullet">تأخر ملاحظة النواقص يربك إعادة التوريد</p>
        <p className="bullet">معرفة قيمة المبيعات وحدها لا توضح الربح الإجمالي</p>
      </div>
      <div className="relative"><img crossOrigin="anonymous" src={`${base}media/ledger.jpg`} alt="دفتر وفواتير داخل متجر؛ صورة توضيحية مولدة" className="scene h-[60vh]" /><span className="photo-label">صورة توضيحية مولّدة</span></div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>02 / 12</span></div>
  </div>;
}
