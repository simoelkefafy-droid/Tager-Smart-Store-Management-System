const base = import.meta.env.BASE_URL;

export default function Value() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob left-[-24vw] bottom-[-35vh] rotate-45" />
    <h1 className="enter">قيمة المشروع: تفاصيل مترابطة وقرار أوضح</h1>
    <div className="grid grid-cols-[1.2fr_1fr] gap-[4vw] mt-[4vh] items-center h-[65vh] enter-later">
      <div className="list">
        <p className="bullet">مكان واحد بدل متابعة البيانات في مصادر متفرقة</p>
        <p className="bullet">معرفة الرصيد الحالي وسجل تغيّره</p>
        <p className="bullet">ملاحظة النواقص لمساندة قرار إعادة التوريد</p>
        <p className="bullet">حساب الربح الإجمالي من تكلفة الوحدة المحفوظة وقت البيع</p>
        <div className="ink-panel !p-[1.6vw]"><p>الربح المعروض قبل المصروفات والضرائب، وليس صافي ربح</p></div>
      </div>
      <div>
        <img crossOrigin="anonymous" src={`${base}media/ledger.jpg`} alt="التسجيل المتفرق؛ مشهد توضيحي مولد" className="scene h-[22vh]" />
        <div className="diagram-arrow my-[1vh]">↓</div>
        <img crossOrigin="anonymous" src={`${base}screens/overview.png`} alt="وضوح المتابعة في لوحة Tager الحقيقية" className="screenshot h-[31vh]" />
      </div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>10 / 12</span></div>
  </div>;
}
