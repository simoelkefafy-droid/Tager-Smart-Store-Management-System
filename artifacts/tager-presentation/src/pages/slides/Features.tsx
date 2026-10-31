import { Package, ShoppingCart, PackagePlus, Truck, Activity, ChartNoAxesCombined } from 'lucide-react';
const base = import.meta.env.BASE_URL;

export default function Features() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob blob-gold left-[-27vw] bottom-[-36vh] rotate-12" />
    <h1 className="enter">خصائص منفذة تربط أجزاء المتجر</h1>
    <div className="grid grid-cols-[3fr_1fr] gap-[3.2vw] mt-[4vh] h-[65vh] enter-later">
      <div className="grid grid-cols-3 gap-x-[2.4vw] gap-y-[3vh] content-center">
        <div><Package className="symbol mb-[1vh]" /><p><strong className="text-primary">المنتجات:</strong> الأصناف والأسعار والكميات والحد الأدنى للمخزون</p></div>
        <div><ShoppingCart className="symbol mb-[1vh]" /><p><strong className="text-primary">المبيعات:</strong> سلة أصناف وخصم الكمية عند تأكيد البيع</p></div>
        <div><PackagePlus className="symbol mb-[1vh]" /><p><strong className="text-primary">المشتريات:</strong> فواتير استلام وتحديث متوسط التكلفة المرجّح</p></div>
        <div><Truck className="symbol mb-[1vh]" /><p><strong className="text-primary">الموردون:</strong> بيانات التواصل والأصناف التي يوفرونها</p></div>
        <div><Activity className="symbol mb-[1vh]" /><p><strong className="text-primary">حركة المخزون:</strong> رصيد قبل وبعد وفلاتر وتصدير CSV</p></div>
        <div><ChartNoAxesCombined className="symbol mb-[1vh]" /><p><strong className="text-primary">التقارير:</strong> مبيعات وتكلفة وربح إجمالي ومقارنة فترات</p></div>
      </div>
      <div className="relative self-center">
        <img crossOrigin="anonymous" src={`${base}media/store.jpg`} alt="متجر منظم؛ صورة توضيحية مولدة" className="scene h-[22vh] mb-[2vh]" />
        <img crossOrigin="anonymous" src={`${base}screens/sales.png`} alt="لقطة حقيقية من واجهة المبيعات" className="screenshot h-[32vh]" />
      </div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>06 / 12</span></div>
  </div>;
}
