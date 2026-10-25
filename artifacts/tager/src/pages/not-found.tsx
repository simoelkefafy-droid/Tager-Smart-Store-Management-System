import { Link } from 'wouter';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return <div dir="rtl" className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f5ef] p-6 text-center">
    <span className="mb-4 rounded-2xl bg-[#e8f2ec] p-4 text-[#25694a]"><Compass size={28} /></span>
    <h1 className="m-0 text-2xl font-bold text-[#1d2d42]">الصفحة غير موجودة</h1>
    <p className="mt-2 text-sm text-[#5a6877]">قد يكون الرابط غير صحيح أو أن الصفحة نُقلت.</p>
    <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-[#25694a] px-5 text-sm font-bold text-white">العودة للرئيسية</Link>
  </div>;
}
