import { Newspaper } from 'lucide-react';

const newsItems = [
  { id: '1', title: '2026년 혈당관리 약국 지원 정책 안내', date: '2026.03.05', source: '약업신문' },
  { id: '2', title: 'CGM 기기 급여화 추진 동향', date: '2026.03.03', source: '약사공론' },
  { id: '3', title: '당뇨병 환자 복약지도 최신 가이드라인', date: '2026.02.28', source: '팜뉴스' },
];

export default function PharmacyNewsPreview() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-slate-500" />
          약업 뉴스
        </h3>
        <button className="text-xs text-primary-600 font-medium hover:text-primary-700">더보기</button>
      </div>
      <div className="space-y-3">
        {newsItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3 group cursor-pointer">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-2 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-slate-700 group-hover:text-primary-600 transition-colors line-clamp-1">
                {item.title}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {item.source} · {item.date}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
