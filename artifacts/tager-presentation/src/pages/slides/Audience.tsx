const base = import.meta.env.BASE_URL;

export default function Audience() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob right-[-22vw] bottom-[-38vh] -rotate-45" />
    <h1 className="enter">الفئة المستهدفة: صاحب المتجر الصغير</h1>
    <div className="grid grid-cols-[1fr_1.1fr] gap-[4vw] mt-[5vh] items-center h-[63vh] enter-later">
      <div className="list ink-panel">
        <p className="rule-item">أصحاب البقالات ومحلات الحي</p>
        <p className="rule-item">أصحاب المتاجر الصغيرة ذات المنتجات المتعددة</p>
        <p className="rule-item">من يحتاجون متابعة المخزون والمبيعات بالعربية</p>
        <p className="rule-item">من يستخدمون الهاتف والكمبيوتر لإدارة العمل اليومي</p>
      </div>
      <div className="relative"><img crossOrigin="anonymous" src={`${base}media/owner.jpg`} alt="صاحب متجر خيالي يستخدم جهازًا لوحيًا؛ صورة مولدة وليست لمستخدم حقيقي" className="scene h-[60vh]" /><span className="photo-label">شخصية توضيحية مولّدة</span></div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>05 / 12</span></div>
  </div>;
}
