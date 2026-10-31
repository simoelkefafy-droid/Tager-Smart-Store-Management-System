const base = import.meta.env.BASE_URL;

export default function Idea() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob right-[-28vw] top-[-38vh] rotate-12" />
    <h1 className="enter">فكرة المشروع: إدارة يوم المتجر من مكان واحد</h1>
    <div className="ink-panel mt-[3vh] enter-later"><p className="!text-[2.6vw] font-semibold">سؤال البداية: كيف نجمع المخزون والبيع والشراء في تجربة بسيطة؟</p></div>
    <div className="grid grid-cols-[1.2fr_1fr] gap-[4vw] mt-[3vh] items-center h-[45vh] enter-later">
      <div className="list">
        <p className="bullet">اخترت الفكرة لارتباطها باحتياج عملي لدى أصحاب المتاجر الصغيرة</p>
        <p className="bullet">حوّلت الفكرة إلى تطبيق عربي يربط العملية بأثرها على المخزون</p>
        <p className="bullet">ركّزت على الوضوح وسهولة الاستخدام من الهاتف والكمبيوتر</p>
      </div>
      <div className="relative h-[44vh]">
        <img crossOrigin="anonymous" src={`${base}media/ledger.jpg`} alt="دفتر متجر توضيحي" className="absolute left-0 top-0 w-[21vw] h-[27vh] object-cover rounded-[1.5vw] opacity-75" />
        <img crossOrigin="anonymous" src={`${base}screens/overview.png`} alt="لقطة حقيقية من لوحة متجر Tager بحساب العرض" className="screenshot absolute right-0 bottom-0 !w-[34vw] h-[34vh] shadow-lg" />
      </div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>03 / 12</span></div>
  </div>;
}
