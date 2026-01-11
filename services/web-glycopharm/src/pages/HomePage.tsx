/**
 * HomePage - GlycoPharm 세미 프랜차이즈 쇼윈도
 *
 * Work Order: WO-GP-HOME-RESTRUCTURE-V1
 *
 * 화면 구조 (상→하):
 * 1. Hero / Campaign Slider - 플랫폼 정체성 + 캠페인
 * 2. Quick Action - 운영 도구 상태 요약 (Signage, Supply, Market Trial, CGM Hub)
 * 3. Now Running - 신제품/Trial/이벤트
 * 4. 운영 공지 / 가이드
 * 5. 협력기관 / 파트너 신뢰 Zone
 *
 * 원칙:
 * - 통계/차트 ❌
 * - 매출 데이터 ❌
 * - 환영 문구/기능 나열 ❌
 * - 지금 진행 중인 것 ⭕
 * - 참여 가능한 것 ⭕
 * - 운영 주체의 존재감 ⭕
 */

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Tag,
  Pin,
  Activity,
  Sparkles,
  Calendar,
  Users,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ========================================
// Types
// ========================================

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  cta?: { label: string; link: string; variant: 'primary' | 'secondary' };
}

interface QuickActionCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  link: string;
  color: string;
  status: { label: string; value: string | number };
}

interface NowRunningItem {
  id: string;
  type: 'trial' | 'event' | 'campaign';
  title: string;
  supplier?: string;
  deadline?: string;
  participants?: number;
  link: string;
}

interface Notice {
  id: string;
  title: string;
  date: string;
  isPinned: boolean;
  link: string;
}

interface Partner {
  id: string;
  name: string;
  logo?: string;
  type: 'association' | 'supplier' | 'partner';
}

// ========================================
// Static Data (운영자 관리 콘텐츠로 대체 예정)
// ========================================

const heroSlides: HeroSlide[] = [
  {
    id: 'main',
    title: '혈당관리 약국을 위한\n운영 플랫폼',
    subtitle: '제품·콘텐츠·실험·판매가 연결됩니다',
    bgGradient: 'from-primary-600 via-primary-700 to-primary-800',
    cta: { label: '시작하기', link: '/pharmacy', variant: 'primary' },
  },
  {
    id: 'trial',
    title: '신제품 Market Trial\n참여 약국 모집 중',
    subtitle: '공급사의 신제품을 먼저 체험하고 피드백을 공유하세요',
    bgGradient: 'from-green-600 via-green-700 to-emerald-800',
    cta: { label: '자세히 보기', link: '/pharmacy/market-trial', variant: 'primary' },
  },
  {
    id: 'cgm',
    title: '지금 8개 약국\n· CGM 데이터 연결 중',
    subtitle: 'CGM Hub를 통해 실시간 연결됩니다',
    bgGradient: 'from-blue-600 via-blue-700 to-indigo-800',
    cta: { label: 'CGM Hub 보기', link: 'https://glucoseview.co.kr', variant: 'primary' },
  },
  {
    id: 'trust',
    title: '다수 약국·다수 기업이 함께하는\n세미 프랜차이즈 플랫폼',
    subtitle: '한국당뇨협회, 협력 공급사와 함께 성장합니다',
    bgGradient: 'from-slate-700 via-slate-800 to-slate-900',
  },
];

const quickActionCards: QuickActionCard[] = [
  {
    id: 'signage',
    title: 'Signage',
    subtitle: '콘텐츠 라이브러리',
    description: '약국 TV에 노출할 교육 콘텐츠를 관리하세요',
    icon: Monitor,
    link: '/pharmacy/signage/my',
    color: 'bg-accent-500',
    status: { label: '방영 중', value: 3 },
  },
  {
    id: 'supply',
    title: 'Supply',
    subtitle: 'B2B 공급',
    description: '검증된 공급자의 제품을 조달합니다',
    icon: Building2,
    link: '/b2b/supply',
    color: 'bg-blue-600',
    status: { label: '공급', value: '사용 중' },
  },
  {
    id: 'trial',
    title: 'Market Trial',
    subtitle: '신제품 체험',
    description: '공급사의 신제품 Trial에 참여하세요',
    icon: Tag,
    link: '/pharmacy/market-trial',
    color: 'bg-green-500',
    status: { label: '진행 중', value: 2 },
  },
  {
    id: 'cgm-hub',
    title: 'CGM Hub',
    subtitle: 'CGM 데이터 허브',
    description: '약국·환자·CGM 데이터를 연결합니다',
    icon: Activity,
    link: 'https://glucoseview.co.kr',
    color: 'bg-indigo-500',
    status: { label: '연결 중', value: '환자' },
  },
];

const nowRunningItems: NowRunningItem[] = [
  {
    id: '1',
    type: 'trial',
    title: '당뇨병 환자용 신규 영양제 Trial',
    supplier: '글루코헬스',
    deadline: '2026.01.31',
    participants: 23,
    link: '/pharmacy/market-trial',
  },
  {
    id: '2',
    type: 'event',
    title: '혈당관리 앱 연동 이벤트',
    supplier: 'GlucoseView',
    deadline: '2026.02.15',
    link: '/pharmacy/market-trial',
  },
  {
    id: '3',
    type: 'campaign',
    title: '당뇨인의 날 캠페인',
    deadline: '2026.03.14',
    link: '/forum-ext',
  },
];

const notices: Notice[] = [
  {
    id: '1',
    title: '[공지] GlycoPharm 서비스 업데이트 안내 (v2.0)',
    date: '2026.01.06',
    isPinned: true,
    link: '/forum-ext',
  },
  {
    id: '2',
    title: '[안내] Market Trial 참여 가이드',
    date: '2026.01.05',
    isPinned: true,
    link: '/forum-ext',
  },
  {
    id: '3',
    title: '1월 Signage 콘텐츠 업데이트',
    date: '2026.01.03',
    isPinned: false,
    link: '/forum-ext',
  },
  {
    id: '4',
    title: '협력 공급사 추가 안내',
    date: '2026.01.02',
    isPinned: false,
    link: '/forum-ext',
  },
];

const partners: Partner[] = [
  { id: '1', name: '한국당뇨협회', type: 'association' },
  { id: '2', name: '글루코헬스', type: 'supplier' },
  { id: '3', name: '혈당케어', type: 'supplier' },
  { id: '4', name: 'GlucoseView', type: 'partner' },
  { id: '5', name: '바이오파마', type: 'supplier' },
];

// ========================================
// Components
// ========================================

function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto slide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[420px] md:h-[480px]">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div className={`h-full bg-gradient-to-br ${slide.bgGradient}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center">
                <div className="max-w-2xl">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 whitespace-pre-line">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white/80 mb-8">
                    {slide.subtitle}
                  </p>
                  {slide.cta && (
                    <NavLink
                      to={slide.cta.link}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                        slide.cta.variant === 'primary'
                          ? 'bg-white text-slate-800 hover:bg-slate-100 shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30'
                      }`}
                    >
                      {slide.cta.label}
                      <ArrowRight className="w-4 h-4" />
                    </NavLink>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Slide Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
        <button
          onClick={prevSlide}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          aria-label="이전 슬라이드"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/40 w-2'
              }`}
              aria-label={`슬라이드 ${index + 1}`}
            />
          ))}
        </div>
        <button
          onClick={nextSlide}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          aria-label="다음 슬라이드"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function QuickActionSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">운영 도구</h2>
          <p className="text-sm text-slate-500">약국 운영에 필요한 핵심 기능</p>
        </div>
        {isAuthenticated && (
          <NavLink
            to="/pharmacy"
            className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
          >
            대시보드
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {quickActionCards.map((card) => {
          const Icon = card.icon;
          return (
            <NavLink
              key={card.id}
              to={card.link}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">{card.status.value}</p>
                  <p className="text-xs text-slate-400">{card.status.label}</p>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{card.title}</h3>
              <p className="text-sm text-primary-600 font-medium mb-2">{card.subtitle}</p>
              <p className="text-sm text-slate-500">{card.description}</p>
              <div className="mt-4 flex items-center gap-1 text-sm text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                바로가기
                <ArrowRight className="w-4 h-4" />
              </div>
            </NavLink>
          );
        })}
      </div>
    </section>
  );
}

function NowRunningSection() {
  const getTypeConfig = (type: NowRunningItem['type']) => {
    switch (type) {
      case 'trial':
        return { label: 'Trial', color: 'bg-green-100 text-green-700', icon: Tag };
      case 'event':
        return { label: '이벤트', color: 'bg-blue-100 text-blue-700', icon: Sparkles };
      case 'campaign':
        return { label: '캠페인', color: 'bg-purple-100 text-purple-700', icon: Calendar };
    }
  };

  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Now Running</h2>
          <p className="text-sm text-slate-500">지금 참여 가능한 프로그램</p>
        </div>
        <NavLink
          to="/pharmacy/market-trial"
          className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
        >
          전체보기
          <ArrowRight className="w-4 h-4" />
        </NavLink>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {nowRunningItems.map((item) => {
          const config = getTypeConfig(item.type);
          const Icon = config.icon;
          return (
            <NavLink
              key={item.id}
              to={item.link}
              className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-slate-100"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  <Icon className="w-3 h-3" />
                  {config.label}
                </span>
                {item.deadline && (
                  <span className="text-xs text-slate-400">~{item.deadline}</span>
                )}
              </div>
              <h3 className="font-semibold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">
                {item.title}
              </h3>
              <div className="flex items-center justify-between text-sm">
                {item.supplier && (
                  <span className="text-slate-500">{item.supplier}</span>
                )}
                {item.participants && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Users className="w-3 h-3" />
                    {item.participants}명 참여
                  </span>
                )}
              </div>
            </NavLink>
          );
        })}
      </div>
    </section>
  );
}

function NoticeSection() {
  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">운영 공지</h2>
          <NavLink
            to="/forum-ext"
            className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
          >
            전체보기
            <ChevronRight className="w-4 h-4" />
          </NavLink>
        </div>
        <div className="divide-y divide-slate-100">
          {notices.map((notice) => (
            <NavLink
              key={notice.id}
              to={notice.link}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {notice.isPinned && (
                  <Pin className="w-4 h-4 text-primary-500 flex-shrink-0" />
                )}
                <span className={`text-sm ${notice.isPinned ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                  {notice.title}
                </span>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0 ml-4">{notice.date}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </section>
  );
}

function PartnerTrustSection() {
  return (
    <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
      <p className="text-center text-sm text-slate-500 mb-6">
        신뢰할 수 있는 기관·기업과 함께합니다
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {partners.map((partner) => (
          <div
            key={partner.id}
            className={`px-5 py-3 rounded-xl flex items-center justify-center transition-all ${
              partner.type === 'association'
                ? 'bg-primary-50 border border-primary-200 text-primary-700'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <span className="font-medium text-sm">{partner.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTASection() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return null;

  return (
    <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-center">
        <Building2 className="w-12 h-12 text-primary-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">GlycoPharm과 함께하세요</h2>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          혈당관리 전문 약국으로 성장할 수 있는 모든 도구와 네트워크를 제공합니다
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <NavLink
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
          >
            무료로 시작하기
            <ArrowRight className="w-4 h-4" />
          </NavLink>
          <NavLink
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors border border-white/20"
          >
            로그인
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
      {/* 1. Hero / Campaign Slider */}
      <HeroSection />

      {/* 2. Quick Action - 운영 도구 요약 */}
      <QuickActionSection />

      {/* 3. Now Running - 신제품/Trial/이벤트 */}
      <NowRunningSection />


      {/* 4. 운영 공지 / 가이드 */}
      <NoticeSection />

      {/* CTA for Non-authenticated Users */}
      <CTASection />

      {/* 5. 협력기관 / 파트너 신뢰 Zone */}
      <PartnerTrustSection />
    </div>
  );
}
