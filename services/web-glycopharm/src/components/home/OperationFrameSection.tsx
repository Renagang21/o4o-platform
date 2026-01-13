/**
 * OperationFrameSection - 혈당관리 약국 운영 프레임 설명 블록
 *
 * Work Order: WO-GP-HOME-RESTRUCTURE-V1 (Phase 1)
 *
 * 목적:
 * - 혈당관리 약국의 차별화된 운영 방식 설명
 * - CGM/데이터 가치를 "기능"이 아닌 "개념"으로 전달
 * - GlucoseView 직접 링크 없음 (확장 경로로만 언급)
 */

import {
  BarChart3,
  HeartPulse,
  Stethoscope,
  RefreshCcw,
} from 'lucide-react';

interface FrameCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

// UX Trust Rules v1: 아이콘 색상 gray-500 통일
const frameCards: FrameCard[] = [
  {
    id: 'data-consulting',
    icon: BarChart3,
    title: '데이터 기반 상담',
    description: 'CGM 리포트로 환자 맞춤 상담을 제공합니다',
  },
  {
    id: 'patient-experience',
    icon: HeartPulse,
    title: '환자 체감 중심 관리',
    description: '혈당 변화를 눈으로 확인하며 동기를 부여합니다',
  },
  {
    id: 'pharmacist-role',
    icon: Stethoscope,
    title: '약사 역할 확장',
    description: '처방을 넘어 관리 파트너로 자리매김합니다',
  },
  {
    id: 'trust-revisit',
    icon: RefreshCcw,
    title: '신뢰 기반 재방문',
    description: '데이터가 만드는 단골, 지속되는 관계를 형성합니다',
  },
];

export default function OperationFrameSection() {
  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          혈당관리 약국 운영 프레임
        </h2>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          일반 약국과 다른 운영 방식으로 환자 신뢰와 재방문을 만듭니다
        </p>
      </div>

      {/* Frame Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {frameCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all group"
            >
              {/* Icon - UX Trust Rules v1: gray-500 통일 */}
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Icon className="w-6 h-6 text-slate-500" />
              </div>

              {/* Content */}
              <h3 className="font-semibold text-slate-800 mb-1 text-sm md:text-base">
                {card.title}
              </h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* GlucoseView Expansion Path (subtle mention) */}
      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400">
          CGM 데이터 연동이 필요하신가요?{' '}
          <a
            href="https://glucoseview.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            GlucoseView로 확장
          </a>
          할 수 있습니다
        </p>
      </div>
    </section>
  );
}
