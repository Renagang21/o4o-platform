import { Image } from 'lucide-react';

export default function BannerSection() {
  return (
    <section className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-slate-100 to-slate-50 rounded-2xl p-8 border border-slate-200 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center mx-auto mb-3">
          <Image className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">광고 배너 영역</p>
        <p className="text-xs text-slate-400 mt-1">파트너 광고가 이곳에 표시됩니다</p>
      </div>
    </section>
  );
}
