/**
 * HomePage - GlycoPharm 운영 허브
 *
 * 프랜차이즈 표준 화면 배치:
 * 1. Hero: 운영 메시지 슬라이드 + CTA
 * 2. 광고 슬롯
 * 3. 핵심 3대 Extension 카드
 * 4. 공지 요약
 * 5. 협력업체 로고/링크
 */

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Tag,
  MessageSquare,
  Pin,
  ExternalLink,
  Building2,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/common';

// Types
interface HeroSlide {
  id: string;
  title: string;
  description: string;
  bgColor: string;
  cta: { label: string; link: string; primary: boolean }[];
}

interface AdSlot {
  id: string;
  title: string;
  description: string;
  link: string;
  bgImage: string | null;
  bgColor: string;
}

interface ExtensionCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconType: string;
  link: string;
  color: string;
  stats: { label: string; value: string };
}

interface Notice {
  id: string;
  title: string;
  date: string;
  isPinned: boolean;
  forumId: string;
}

interface Partner {
  id: number;
  name: string;
  logo: string;
}


// Default extension cards (static fallback)
const defaultExtensionCards: (ExtensionCard & { icon: LucideIcon })[] = [
  {
    id: 'signage',
    title: 'Signage',
    subtitle: '콘텐츠 라이브러리',
    description: '약국 TV에 노출할 교육 콘텐츠를 관리하세요',
    iconType: 'monitor',
    icon: Monitor,
    link: '/pharmacy/signage/library',
    color: 'bg-accent-500',
    stats: { label: '등록 콘텐츠', value: '-' },
  },
  {
    id: 'trial',
    title: 'Market Trial',
    subtitle: '신제품 체험',
    description: '공급사의 신제품 Trial 프로그램에 참여하세요',
    iconType: 'tag',
    icon: Tag,
    link: '/pharmacy/market-trial',
    color: 'bg-green-500',
    stats: { label: '진행 중 Trial', value: '-' },
  },
  {
    id: 'forum',
    title: 'Forum',
    subtitle: '약사 커뮤니티',
    description: '혈당관리 노하우와 경험을 공유하세요',
    iconType: 'messageSquare',
    icon: MessageSquare,
    link: '/forum-ext',
    color: 'bg-blue-500',
    stats: { label: '활성 포럼', value: '-' },
  },
];

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [heroSlides] = useState<HeroSlide[]>([]);
  const [adSlot] = useState<AdSlot | null>(null);
  const [extensionCards] = useState<(ExtensionCard & { icon: LucideIcon })[]>(defaultExtensionCards);
  const [notices] = useState<Notice[]>([]);
  const [partners] = useState<Partner[]>([]);

  // 홈페이지 데이터 로드
  useEffect(() => {
    // TODO: /api/v1/glycopharm/home 엔드포인트 구현 시 API 호출 활성화
    // 현재는 기본값 사용 (백엔드 엔드포인트 미구현)
    setIsLoading(false);
  }, []);

  // Auto slide
  useEffect(() => {
    if (heroSlides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  if (isLoading) {
    return <LoadingState message="페이지를 불러오는 중..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section - 대형 슬라이드 */}
      {heroSlides.length > 0 ? (
        <section className="relative overflow-hidden">
          {/* Slides */}
          <div className="relative h-[400px] md:h-[480px]">
            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-500 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
              >
                <div className={`h-full bg-gradient-to-br ${slide.bgColor}`}>
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center">
                    <div className="max-w-2xl">
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4 whitespace-pre-line">
                        {slide.title}
                      </h1>
                      <p className="text-lg text-white/80 mb-8">
                        {slide.description}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {slide.cta.map((btn, btnIdx) => (
                          <NavLink
                            key={btnIdx}
                            to={btn.link}
                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${btn.primary
                                ? 'bg-white text-slate-800 hover:bg-slate-100 shadow-lg'
                                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm border border-white/30'
                              }`}
                          >
                            {btn.label}
                            <ArrowRight className="w-4 h-4" />
                          </NavLink>
                        ))}
                      </div>
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
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {heroSlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all ${index === currentSlide ? 'bg-white w-8' : 'bg-white/40'
                    }`}
                />
              ))}
            </div>
            <button
              onClick={nextSlide}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-gradient-to-br from-primary-600 to-primary-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              GlycoPharm에 오신 것을 환영합니다
            </h1>
            <p className="text-lg text-white/80">
              혈당관리 전문 약국을 위한 운영 플랫폼
            </p>
          </div>
        </section>
      )}

      {/* Ad Slot - 프로모션 배너 */}
      {adSlot && (
        <section className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
          <NavLink
            to={adSlot.link}
            className={`block ${adSlot.bgColor} rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Megaphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white">{adSlot.title}</h3>
                  <p className="text-white/80 text-sm">{adSlot.description}</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-white/60 hidden md:block" />
            </div>
          </NavLink>
        </section>
      )}

      {/* Extension Cards - 핵심 3대 운영 기능 */}
      <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">운영 도구</h2>
            <p className="text-sm text-slate-500">약국 운영에 필요한 핵심 기능</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {extensionCards.map((card) => {
            const Icon = card.icon;
            return (
              <NavLink
                key={card.id}
                to={card.link}
                className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800">{card.stats.value}</p>
                    <p className="text-xs text-slate-400">{card.stats.label}</p>
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

      {/* Notice Summary - 공지 요약 */}
      <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">공지사항</h2>
            <NavLink
              to="/forum-ext"
              className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
            >
              전체보기
              <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
          {notices.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {notices.map((notice) => (
                <NavLink
                  key={notice.id}
                  to={`/forum-ext/${notice.forumId}`}
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
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">
              등록된 공지사항이 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions for Non-authenticated Users */}
      {!isAuthenticated && (
        <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-center">
            <Building2 className="w-12 h-12 text-primary-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">GlycoPharm과 함께 성장하세요</h2>
            <p className="text-slate-400 mb-6">
              혈당관리 전문 약국으로 성장할 수 있는 모든 도구를 제공합니다
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
      )}

      {/* Partners Section - 협력업체 */}
      {partners.length > 0 && (
        <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
          <p className="text-center text-sm text-slate-400 mb-6">
            신뢰할 수 있는 파트너사와 함께합니다
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="w-28 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <span className="text-slate-500 font-medium text-sm">{partner.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
