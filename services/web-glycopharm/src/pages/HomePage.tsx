/**
 * HomePage - GlycoPharm 세미 프랜차이즈 쇼윈도
 *
 * Work Order: WO-GP-HOME-SERVICE-SECTION-V1
 *
 * 화면 구조 (상→하) - 서비스 중심 재구성:
 * 0. Hero - 플랫폼 정체성 선언 (heroConfig 분리)
 * 1. Service Overview - 약국 활용 서비스 개요 [신규]
 * 2. Now Running - 지금 진행 중인 것 (보조 정보)
 * 3. Operation Frame - 혈당관리 약국 운영 프레임
 * 4. Notice - 운영 공지
 * 5. Partner Trust - 협력 네트워크 / 신뢰 요소
 * 6. CTA - 비로그인 사용자용
 *
 * 원칙:
 * - "약국이 뭘 할 수 있는지"가 첫 인상 ⭕
 * - Now Running은 보조 정보 ⭕
 * - 운영 주체의 존재감 ⭕
 * - 왜 이 서비스가 필요한가 ⭕
 */

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Tag,
  Pin,
  Sparkles,
  Calendar,
  Users,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { heroSlides, heroSettings, type HeroSlide } from '@/config/heroConfig';
import OperationFrameSection from '@/components/home/OperationFrameSection';
import ServiceOverviewSection from '@/components/home/ServiceOverviewSection';
import {
  publicApi,
  fallbackNowRunning,
  fallbackNotices,
  type NowRunningItem as ApiNowRunningItem,
  type Notice as ApiNotice,
} from '@/api/public';

// ========================================
// Types
// ========================================

// NowRunningItem, Notice 타입은 @/api/public에서 import
// ApiNowRunningItem, ApiNotice로 사용

interface Partner {
  id: string;
  name: string;
  logo?: string;
  type: 'association' | 'supplier' | 'partner';
}

// ========================================
// Static Data (운영자 관리 콘텐츠로 대체 예정)
// heroSlides는 config/heroConfig.ts에서 import
// ========================================

// nowRunningItems와 notices는 API에서 로딩
// fallback 데이터는 @/api/public에서 import

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

  // Auto slide (using heroSettings)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, heroSettings.autoPlayInterval);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  // CTA 버튼 렌더링 (내부/외부 링크 처리)
  const renderCta = (slide: HeroSlide) => {
    if (!slide.cta) return null;

    const buttonClass = `inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${slide.cta.variant === 'primary'
      ? 'bg-white text-slate-800 hover:bg-slate-100 shadow-lg'
      : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30'
      }`;

    // 외부 링크 처리
    if (slide.cta.external) {
      return (
        <a
          href={slide.cta.link}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          {slide.cta.label}
          <ExternalLink className="w-4 h-4" />
        </a>
      );
    }

    // 앵커 링크 처리 (#으로 시작)
    if (slide.cta.link.startsWith('#')) {
      return (
        <a href={slide.cta.link} className={buttonClass}>
          {slide.cta.label}
          <ArrowRight className="w-4 h-4" />
        </a>
      );
    }

    // 내부 라우터 링크
    return (
      <NavLink to={slide.cta.link} className={buttonClass}>
        {slide.cta.label}
        <ArrowRight className="w-4 h-4" />
      </NavLink>
    );
  };

  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[420px] md:h-[480px]">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
          >
            <div className={`h-full bg-gradient-to-br ${slide.bgGradient}`}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center">
                <div className="max-w-2xl">
                  {/* WO-GLOBAL-ALPHA-STATUS-HERO-V080: 운영형 알파 상태 배지 (첫 번째 슬라이드에만) */}
                  {index === 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-white/80 mb-4">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      <span>운영형 알파 · v0.8.0</span>
                    </div>
                  )}
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 whitespace-pre-line">
                    {slide.title}
                  </h1>
                  <p className="text-lg md:text-xl text-white/80 mb-4">
                    {slide.subtitle}
                  </p>
                  {/* WO-GLOBAL-ALPHA-STATUS-HERO-V080: 알파 단계 안내 (첫 번째 슬라이드에만) */}
                  {index === 0 && (
                    <p className="text-sm text-white/50 mb-6">
                      협력 약국과 함께 운영 구조를 검증하는 단계입니다
                    </p>
                  )}
                  {renderCta(slide)}
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
              className={`h-2 rounded-full transition-all ${index === currentSlide ? 'bg-white w-8' : 'bg-white/40 w-2'
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

interface NowRunningSectionProps {
  items: ApiNowRunningItem[];
  loading?: boolean;
}

function NowRunningSection({ items, loading }: NowRunningSectionProps) {
  // UX Trust Rules v1: 뱃지 색상 neutral (gray 계열)
  const getTypeConfig = (type: ApiNowRunningItem['type']) => {
    switch (type) {
      case 'trial':
        return { label: 'Trial', color: 'bg-slate-100 text-slate-700', icon: Tag };
      case 'event':
        return { label: '이벤트', color: 'bg-slate-100 text-slate-700', icon: Sparkles };
      case 'campaign':
        return { label: '캠페인', color: 'bg-slate-100 text-slate-700', icon: Calendar };
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

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-20 mb-3" />
              <div className="h-5 bg-slate-200 rounded w-full mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((item) => {
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
      )}
    </section>
  );
}

interface NoticeSectionProps {
  items: ApiNotice[];
  loading?: boolean;
}

function NoticeSection({ items, loading }: NoticeSectionProps) {
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
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((notice) => (
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
        )}
      </div>
    </section>
  );
}

function PartnerTrustSection() {
  return (
    <section id="partners" className="py-12 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            협력 네트워크
          </h2>
          <p className="text-sm text-slate-500">
            신뢰할 수 있는 기관·기업과 함께합니다
          </p>
        </div>

        {/* Partner Marquee - UX Trust Rules v1: 색상 통일 */}
        <div className="overflow-hidden mb-8">
          <div className="flex gap-3 animate-marquee">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="px-5 py-3 rounded-xl flex items-center justify-center transition-all flex-shrink-0 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm"
              >
                <span className="font-medium text-sm">{partner.name}</span>
              </div>
            ))}
            {partners.map((partner) => (
              <div
                key={`${partner.id}-duplicate`}
                className="px-5 py-3 rounded-xl flex items-center justify-center transition-all flex-shrink-0 bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm"
              >
                <span className="font-medium text-sm">{partner.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Message */}
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500">
            전북 당뇨 약국 시범사업 기반 · 혈당관리 전문 약국 네트워크
          </p>
          <p className="text-xs text-slate-400">
            프랜차이즈가 아닌 <span className="font-medium text-slate-600">자율 참여 플랫폼</span>입니다
          </p>
        </div>
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
  const [nowRunning, setNowRunning] = useState<ApiNowRunningItem[]>(fallbackNowRunning);
  const [notices, setNotices] = useState<ApiNotice[]>(fallbackNotices);
  const [loading, setLoading] = useState(true);

  // API 데이터 로딩
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [nowRunningData, noticesData] = await Promise.all([
          publicApi.getNowRunning(),
          publicApi.getNotices(),
        ]);
        setNowRunning(nowRunningData);
        setNotices(noticesData);
      } catch (error) {
        console.warn('Failed to load home data, using fallback:', error);
        // fallback 데이터는 이미 기본값으로 설정됨
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Block 0: Hero - 플랫폼 정체성 선언 */}
      <HeroSection />

      {/* Block 1: Service Overview - 약국 활용 서비스 개요 */}
      <ServiceOverviewSection />

      {/* Block 2: Now Running - 지금 참여 가능한 프로그램 (보조 정보) */}
      <NowRunningSection items={nowRunning} loading={loading} />

      {/* Block 3: Operation Frame - 혈당관리 약국 운영 프레임 */}
      <div id="operation-frame">
        <OperationFrameSection />
      </div>

      {/* Block 4: Notice - 운영 공지 */}
      <NoticeSection items={notices} loading={loading} />

      {/* Block 5: Partner Trust - 협력 네트워크 */}
      <PartnerTrustSection />

      {/* Block 6: CTA - 비로그인 사용자용 */}
      <CTASection />
    </div>
  );
}
