/**
 * StoreEntryPage - 약국 매장 허브 진입 포털
 *
 * WO-STORE-MAIN-ENTRY-LAYOUT-V1
 *
 * /store 접속 시 보여주는 2카드 선택 화면.
 * Store 내부 구조 진입 전 포털 역할만 수행.
 */

import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Settings,
  ArrowRight,
} from 'lucide-react';

const entryCards = [
  {
    id: 'hub',
    title: '약국 허브',
    description: '운영·성과 관리',
    details: ['운영 현황', '매출 요약', 'KPI', '네트워크 분석'],
    icon: BarChart3,
    link: '/store/hub',
  },
  {
    id: 'management',
    title: '내 약국 관리',
    description: '상품·주문·설정',
    details: ['상품 관리', '주문 관리', '설정', '콘텐츠 관리'],
    icon: Settings,
    link: '/store/management',
  },
];

export default function StoreEntryPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
            약국 운영 시스템
          </h1>
          <p className="text-slate-300 text-sm md:text-base">
            매장 운영과 관리 기능을 선택하세요
          </p>
        </div>
      </section>

      {/* 2 Card Grid */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {entryCards.map((card) => {
            const Icon = card.icon;
            return (
              <NavLink
                key={card.id}
                to={card.link}
                className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Icon className="w-7 h-7 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">{card.title}</h2>
                <p className="text-sm text-slate-500 mb-4">{card.description}</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {card.details.map((detail) => (
                    <span
                      key={detail}
                      className="inline-block px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-full border border-slate-100"
                    >
                      {detail}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-sm text-primary-600 font-medium">
                  진입하기
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </NavLink>
            );
          })}
        </div>
      </section>
    </div>
  );
}
