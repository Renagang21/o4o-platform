/**
 * HomePage - GlycoPharm 공개 홈
 *
 * WO-PUBLIC-HOME-FUNCTION-ALIGNMENT-V1
 *
 * 기능 요구 문서 기준 구조:
 * 1. Hero - 플랫폼 정체성 (기능 중심)
 * 2. Core Functions - 기능 4축 (환자관리/데이터수집/분석/코칭)
 * 3. Pharmacy Operations - 약국 운영 기능
 * 4. CTA - 로그인/문의
 *
 * 원칙:
 * - 홍보 페이지가 아닌 "기능 안내 페이지"
 * - 요구 기능 문서에 충실한 구조
 */

import { NavLink } from 'react-router-dom';
import {
  ArrowRight,
  Activity,
  Users,
  Database,
  BarChart3,
  MessageSquare,
  Store,
  ShoppingCart,
  TrendingUp,
  Monitor,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

// ========================================
// Hero Section
// ========================================

function HeroSection() {
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  return (
    <section className="relative overflow-hidden">
      <div className="h-[360px] md:h-[400px] bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 mb-4">
              <Activity className="w-3.5 h-3.5" />
              <span>혈당관리 전문 플랫폼</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              약국 중심{'\n'}환자 데이터 관리
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8">
              환자 등록부터 CGM 데이터 분석, 맞춤 코칭까지<br className="hidden md:block" />
              혈당관리에 필요한 모든 기능을 제공합니다
            </p>
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={openLoginModal}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-colors shadow-lg"
                >
                  약사 로그인
                  <ArrowRight className="w-4 h-4" />
                </button>
                <NavLink
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/20"
                >
                  회원가입
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ========================================
// Core Functions Section (기능 4축)
// ========================================

const coreFunctions = [
  {
    id: 'patient',
    icon: Users,
    title: '환자 등록·관리',
    description: '환자 등록, 리스트 관리, 요약 카드, 환자별 대시보드를 제공합니다',
    details: ['환자 등록·검색', '환자 리스트', '환자별 요약 카드', '환자 대시보드'],
  },
  {
    id: 'data',
    icon: Database,
    title: '데이터 수집·연동',
    description: '혈당, 생활, 복약, 신체건강 데이터를 수집하고 CGM/PHR과 연동합니다',
    details: ['혈당 데이터', '생활 데이터', '복약 데이터', 'CGM/PHR 연동'],
  },
  {
    id: 'analysis',
    icon: BarChart3,
    title: '분석·리스크 평가',
    description: 'TIR, CV, 저·고혈당 빈도, 패턴 분석으로 환자 상태를 평가합니다',
    details: ['평균 혈당·TIR·CV', '저·고혈당 빈도', '패턴 분석', '목표 달성률'],
  },
  {
    id: 'coaching',
    icon: MessageSquare,
    title: '맞춤 코칭·상담',
    description: '혈당, 생활, 복약, 신체건강 영역별 맞춤 코칭을 제공합니다',
    details: ['혈당 코칭', '생활 코칭', '복약 코칭', 'Q&A·가이드라인'],
  },
];

function CoreFunctionsSection() {
  return (
    <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          핵심 기능
        </h2>
        <p className="text-sm text-slate-500">
          혈당관리 전문 약국을 위한 4가지 핵심 기능 축
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {coreFunctions.map((func) => {
          const Icon = func.icon;
          return (
            <div
              key={func.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{func.title}</h3>
                  <p className="text-sm text-slate-500 mb-3">{func.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {func.details.map((detail) => (
                      <span
                        key={detail}
                        className="inline-block px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-full border border-slate-100"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ========================================
// Pharmacy Operations Section (약국 운영 기능)
// ========================================

const pharmacyOperations = [
  {
    id: 'product',
    icon: Store,
    title: '상품 관리',
    description: '검증된 혈당관리 제품을 약국 기준으로 관리합니다',
  },
  {
    id: 'order',
    icon: ShoppingCart,
    title: '주문 관리',
    description: '주문 접수부터 처리까지 체계적으로 운영합니다',
  },
  {
    id: 'revenue',
    icon: TrendingUp,
    title: '매출 관리',
    description: '매출 현황과 성과를 데이터로 확인합니다',
  },
  {
    id: 'digital',
    icon: Monitor,
    title: '디지털 연계',
    description: 'TV 사이니지, 키오스크 등 매장 디지털 도구를 연결합니다',
  },
];

function PharmacyOperationsSection() {
  return (
    <section className="py-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            약국 운영 기능
          </h2>
          <p className="text-sm text-slate-500">
            약국 매장 허브에서 운영 전반을 관리합니다
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pharmacyOperations.map((op) => {
            const Icon = op.icon;
            return (
              <div
                key={op.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1 text-sm md:text-base">{op.title}</h3>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{op.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ========================================
// CTA Section
// ========================================

function CTASection() {
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  if (isAuthenticated) return null;

  return (
    <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-center">
        <Activity className="w-12 h-12 text-primary-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">GlycoPharm 시작하기</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          혈당관리 전문 약국에 필요한 환자관리, 데이터 분석, 코칭 기능을 제공합니다
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={openLoginModal}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            약사 로그인
            <ArrowRight className="w-4 h-4" />
          </button>
          <NavLink
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/20"
          >
            회원가입
          </NavLink>
        </div>
      </div>
    </section>
  );
}

// ========================================
// Main Component
// ========================================

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Block 1: Hero - 기능 중심 플랫폼 선언 */}
      <HeroSection />

      {/* Block 2: Core Functions - 기능 4축 */}
      <CoreFunctionsSection />

      {/* Block 3: Pharmacy Operations - 약국 운영 기능 */}
      <PharmacyOperationsSection />

      {/* Block 4: CTA - 로그인/가입 */}
      <CTASection />
    </div>
  );
}
