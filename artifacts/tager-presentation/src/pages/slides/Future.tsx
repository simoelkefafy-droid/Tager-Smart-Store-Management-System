import { Barcode, ReceiptText, Users, BellRing } from 'lucide-react';
const base = import.meta.env.BASE_URL;

export default function Future() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob blob-gold right-[-26vw] top-[-40vh] -rotate-45" />
    <h1 className="enter">التطويرات المستقبلية: خطوات مقترحة وليست منفذة</h1>
    <div className="grid grid-cols-[1.2fr_1fr] gap-[4vw] mt-[4vh] items-center h-[63vh] enter-later">
      <div>
        <div className="future-row"><Barcode className="symbol" /><p>قراءة الباركود لتسريع اختيار المنتجات</p></div>
        <div className="future-row"><ReceiptText className="symbol" /><p>تسجيل المرتجعات والخصومات والمصروفات</p></div>
        <div className="future-row"><Users className="symbol" /><p>صلاحيات متعددة للعاملين وإدارة الفروع</p></div>
        <div className="future-row"><BellRing className="symbol" /><p>تنبيهات خارج التطبيق وتوقع احتياجات إعادة التوريد</p></div>
      </div>
      <div className="relative"><img crossOrigin="anonymous" src={`${base}media/future.jpg`} alt="تصور مولد لمستقبل إدارة المتاجر، وليس ميزة منفذة" className="scene h-[59vh] !rounded-[2vw_10vw_2vw_2vw]" /><span className="photo-label">تصور مستقبلي مولّد</span></div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>11 / 12</span></div>
  </div>;
}
