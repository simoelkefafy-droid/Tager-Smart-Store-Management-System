const base = import.meta.env.BASE_URL;

export default function Thanks() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob blob-gold left-[-14vw] top-[-25vh] rotate-45" />
    <div className="blob right-[-28vw] bottom-[-40vh] -rotate-12" />
    <h1 className="enter !text-[4.3vw]">شكرًا لكل من دعم هذه الفكرة</h1>
    <div className="grid grid-cols-[1.55fr_1fr] gap-[4vw] mt-[3vh] items-center h-[61vh] enter-later">
      <div className="space-y-[2.5vh]">
        <p>أتقدم بخالص الشكر والتقدير إلى د. طه محمود متولي نور الدين على إشرافه الأكاديمي وتوجيهاته القيّمة</p>
        <p>وإلى كل من ساهم بالدعم والتشجيع خلال تنفيذ المشروع</p>
        <p className="text-primary font-semibold">Tager — من فكرة إلى تطبيق يساعد صاحب المتجر على إدارة يومه بوضوح</p>
        <p className="attribution">تنفيذ وتقديم: <bdi dir="ltr">Seham Kamel Mahmoud Elkefafy</bdi></p>
        <p className="text-primary font-semibold">يسعدني الاستماع إلى أسئلتكم وملاحظاتكم</p>
      </div>
      <div className="grid grid-cols-2 gap-[1.4vw]">
        <img crossOrigin="anonymous" src={`${base}portraits/seham.jpg`} alt="صورة سهام الأصلية صاحبة المشروع ومنفذته" className="portrait h-[34vh] mt-[7vh]" />
        <img crossOrigin="anonymous" src={`${base}portraits/supervisor.jpg`} alt="صورة د. طه المشرف الأكاديمي" className="portrait h-[34vh]" />
      </div>
    </div>
    <div className="absolute bottom-[10vh] left-[5vw] flex items-center gap-[2vw]"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="شعار Tager" className="h-[3.5vw] w-[3.5vw]" /><img crossOrigin="anonymous" src={`${base}brand/replit.svg`} alt="شعار Replit الرسمي" className="logo-replit" /><img crossOrigin="anonymous" src={`${base}brand/nordpoints.jpg`} alt="شعار NordPoints الرسمي المرسل من صاحبة المشروع" className="h-[4vw] w-[4vw] object-contain rounded-[.3vw]" /></div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>12 / 12</span></div>
  </div>;
}
