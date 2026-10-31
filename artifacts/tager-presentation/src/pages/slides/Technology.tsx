const base = import.meta.env.BASE_URL;

export default function Technology() {
  return <div className="w-screen h-screen overflow-hidden relative deck-frame">
    <div className="blob right-[-25vw] bottom-[-40vh] rotate-45" />
    <h1 className="enter">التقنيات المستخدمة فعليًا</h1>
    <div className="grid grid-cols-[1.6fr_1fr] gap-[4vw] mt-[4vh] h-[64vh] items-center enter-later">
      <div className="space-y-[1.2vh] tech-stack">
        <p className="rule-item"><strong className="text-primary">الواجهة:</strong> <bdi dir="ltr">React • TypeScript • Vite • Tailwind CSS</bdi></p>
        <p className="rule-item"><strong className="text-primary">البيانات والرسوم:</strong> <bdi dir="ltr">TanStack Query • Recharts</bdi></p>
        <p className="rule-item"><strong className="text-primary">الخادم:</strong> <bdi dir="ltr">Node.js • Express</bdi></p>
        <p className="rule-item"><strong className="text-primary">قاعدة البيانات:</strong> <bdi dir="ltr">PostgreSQL • Drizzle ORM</bdi></p>
        <p className="rule-item"><strong className="text-primary">تسجيل الدخول:</strong> <bdi dir="ltr">Clerk</bdi></p>
        <p className="rule-item"><strong className="text-primary">واجهات API:</strong> <bdi dir="ltr">OpenAPI • Orval</bdi> — بيئة التطوير: <bdi dir="ltr">Replit</bdi></p>
      </div>
      <div className="relative">
        <img crossOrigin="anonymous" src={`${base}media/future.jpg`} alt="صورة تقنية توضيحية مولدة لمتجر" className="scene h-[47vh]" />
        <div className="mt-[3vh] flex items-center justify-center gap-[2vw]"><img crossOrigin="anonymous" src={`${base}brand/replit.svg`} alt="شعار Replit الرسمي" className="logo-replit !w-[13vw]" /><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="شعار Tager" className="logo-tager" /></div>
      </div>
    </div>
    <div className="footer"><span className="brand"><img crossOrigin="anonymous" src={`${base}brand/tager.svg`} alt="" />Tager</span><span>08 / 12</span></div>
  </div>;
}
