/**
 * ExamplesPage - o4o 예제 서비스 목록
 *
 * Work Order: WO-O4O-PUBLIC-SITE-PHASE1-BUILD-V1
 *
 * 목적:
 * - o4o 기반 예제 서비스 진입점
 * - 설명 최소화, 진입 동선 확보
 *
 * 예제:
 * - Neture (공급자 연결)
 * - K-Cosmetics (화장품)
 * - GlycoPharm (건강기능식품)
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function ExamplesPage() {
  const examples = [
    {
      name: '약국 매장',
      desc: '건강기능식품 취급',
      path: '/examples/store/pharmacy',
      status: 'active',
      featured: true,
    },
    {
      name: 'Neture',
      desc: '공급자 연결',
      path: '/supplier-ops',
      status: 'coming',
      featured: false,
    },
    {
      name: 'K-Cosmetics',
      desc: '화장품',
      path: '/k-cosmetics',
      status: 'coming',
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">예제 서비스</h1>
          <p className="text-slate-300">
            o4o 기반으로 운영 중인 서비스
          </p>
        </div>
      </div>

      {/* Examples List */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {examples.map((ex) =>
            ex.status === 'active' ? (
              <Link
                key={ex.name}
                to={ex.path}
                className={`group p-8 rounded-xl transition-colors border ${
                  ex.featured
                    ? 'bg-primary-50 border-primary-200 hover:bg-primary-100'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <h2 className="text-xl font-semibold text-slate-900 mb-2 flex items-center justify-between">
                  {ex.name}
                  <ArrowRight className={`w-5 h-5 transition-colors ${
                    ex.featured
                      ? 'text-primary-500 group-hover:text-primary-600'
                      : 'text-slate-400 group-hover:text-primary-600'
                  }`} />
                </h2>
                <p className="text-slate-600 text-sm">{ex.desc}</p>
              </Link>
            ) : (
              <div
                key={ex.name}
                className="p-8 bg-slate-50 rounded-xl border border-slate-200 opacity-60"
              >
                <h2 className="text-xl font-semibold text-slate-400 mb-2 flex items-center justify-between">
                  {ex.name}
                  <span className="text-xs font-normal text-slate-400">추가 예정</span>
                </h2>
                <p className="text-slate-400 text-sm">{ex.desc}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="border-t border-slate-200 pt-8">
          <div className="flex justify-between text-sm">
            <Link to="/" className="text-slate-500 hover:text-slate-700">
              메인으로
            </Link>
            <Link to="/manual/concepts" className="text-primary-600 hover:text-primary-700">
              개념 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
