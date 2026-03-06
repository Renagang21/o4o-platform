/**
 * CommunityPage - 커뮤니티 허브
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 3개 섹션: Forum, Knowledge, Ideas
 */

import { Link } from 'react-router-dom';
import { MessageSquare, BookOpen, Lightbulb, ArrowRight } from 'lucide-react';

export default function CommunityPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-3">Community</h1>
          <p className="text-lg text-white/80">
            포럼, 자료실, 아이디어 공유 공간
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Forum */}
            <Link
              to="/community/forum"
              className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Forum</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                o4o 개념과 네뚜레 구조에 대한 질문과 의견을 나누는 공간입니다.
                공급자, 파트너, 매장 운영자 간 소통이 이루어집니다.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-primary-600 group-hover:text-primary-700">
                포럼 바로가기
                <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>

            {/* Knowledge */}
            <Link
              to="/community/knowledge"
              className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Knowledge</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                공급자 제품 정보, POP 디자인, 매장 운영 가이드 등
                실무에 필요한 자료를 공유합니다.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-emerald-600 group-hover:text-emerald-700">
                자료실 바로가기
                <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>

            {/* Ideas */}
            <div className="p-8 bg-white rounded-2xl border border-gray-200">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <Lightbulb className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Ideas</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                플랫폼 개선 아이디어와 새로운 기능 제안을 공유하는 공간입니다.
                함께 만들어가는 Neture.
              </p>
              <span className="inline-flex items-center text-sm font-medium text-amber-600">
                준비 중
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
