/**
 * ServiceOverviewSection - 약국 활용 서비스 개요 블록
 *
 * Work Order: WO-GP-HOME-SERVICE-SECTION-V1 (Block 1)
 *
 * 목적:
 * - "이 플랫폼으로 약국이 뭘 할 수 있는지" 한눈에 전달
 * - 프랜차이즈가 아닌 '운영 도구 묶음'으로 인식
 * - 각 카드: 제목 + 서브 키워드 + 한줄 메시지 + 진입 링크
 */

import { NavLink } from 'react-router-dom';
import {
  Monitor,
  Tag,
  Users,
  Activity,
  ArrowRight,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';

interface ServiceCard {
  id: string;
  title: string;
  keywords: string[];
  message: string;
  icon: LucideIcon;
  link: string;
  external?: boolean;
}

const serviceCards: ServiceCard[] = [
  {
    id: 'digital',
    title: '매장 디지털 활용',
    keywords: ['TV / 디지털 사이니지', '키오스크', '태블릿 / 웹 주문'],
    message: '매장 안과 밖에서 약국을 연결합니다',
    icon: Monitor,
    link: '/store/signage/my',
  },
  {
    id: 'commerce',
    title: '상품·판매 운영',
    keywords: ['신제품', '추천 제품', 'Market Trial'],
    message: '검증된 제품을 약국 기준으로 판매',
    icon: Tag,
    link: '/store/market-trial',
  },
  {
    id: 'community',
    title: '약국 공동 서비스',
    keywords: ['공지', '포럼', '강좌(LMS)'],
    message: '혼자 운영하지 않습니다',
    icon: Users,
    link: '/forum-ext',
  },
  {
    id: 'glucose',
    title: '혈당관리 전문 서비스',
    keywords: ['CGM 연계', 'GlucoseView'],
    message: '혈당관리 전문 약국으로 확장',
    icon: Activity,
    link: 'https://glucoseview.co.kr',
    external: true,
  },
];

export default function ServiceOverviewSection() {
  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          약국이 활용할 수 있는 서비스
        </h2>
        <p className="text-sm text-slate-500">
          혈당관리 약국 운영에 필요한 도구를 한곳에서 제공합니다
        </p>
      </div>

      {/* Service Cards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {serviceCards.map((card) => {
          const Icon = card.icon;
          const content = (
            <>
              <div className="flex items-start gap-4">
                {/* Icon - UX Trust Rules v1: gray-500 */}
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">
                    {card.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {card.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">{card.message}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                {card.external ? '바로가기' : '살펴보기'}
                {card.external ? (
                  <ExternalLink className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </div>
            </>
          );

          if (card.external) {
            return (
              <a
                key={card.id}
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-100"
              >
                {content}
              </a>
            );
          }

          return (
            <NavLink
              key={card.id}
              to={card.link}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-100"
            >
              {content}
            </NavLink>
          );
        })}
      </div>
    </section>
  );
}
