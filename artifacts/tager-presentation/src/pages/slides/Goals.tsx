import { Boxes, PackageCheck, ReceiptText, ChartNoAxesCombined } from 'lucide-react';
const base = import.meta.env.BASE_URL;

export default function Goals() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob blob-gold left-[-24vw] top-[-35vh] rotate-45" />
    <h1 className="enter">أهداف المشروع: تنظيم أوضح ومتابعة أدق</h1>
    <div className="grid grid-cols-[1.4fr_1fr] gap-[5vw] mt-[5vh] items-center h-[63vh] enter-later">
      <div className="grid grid-cols-2 gap-x-[3vw] gap-y-[5vh]">
        <div><Boxes className="symbol mb-[2vh]" /><p>توحيد بيانات المنتجات والموردين والعمليات</p></div>
        <div><PackageCheck className="symbol mb-[2vh]" /><p>تحديث الكميات عند تسجيل البيع واستلام المشتريات</p></div>
        <div><ReceiptText className="symbol mb-[2vh]" /><p>توثيق حركة المخزون وإبراز الأصناف منخفضة الرصيد</p></div>
        <div><ChartNoAxesCombined className="symbol mb-[2vh]" /><p>عرض المبيعات والتكلفة والربح الإجمالي بوضوح</p></div>
      </div>
      <div className="relative"><img crossOrigin="anonymous" src={`${base}media/store.jpg`} alt="رفوف متجر منظمة؛ مشهد توضيحي مولد" className="scene h-[59vh] !rounded-[10vw_2vw_2vw_2vw]" /><span className="photo-label">صورة توضيحية مولّدة</span></div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>04 / 12</span></div>
  </div>;
}
