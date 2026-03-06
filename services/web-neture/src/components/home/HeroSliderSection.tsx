/**
 * HeroSliderSection - Hero 슬라이더
 *
 * Work Order: WO-O4O-NETURE-UI-REFACTORING-V1
 *
 * 4개 슬라이드:
 * 1. 플랫폼 소개
 * 2. 공급자 참여 CTA
 * 3. 파트너 참여 CTA
 * 4. 광고 / 프로모션
 *
 * 자동 슬라이드 (5초) + 좌우 버튼 + 인디케이터
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  gradient: string;
  cta?: { label: string; to: string };
}

const slides: Slide[] = [
  {
    id: 1,
    title: '공급자와 파트너를 연결하는\n협업 플랫폼',
    subtitle: 'Neture는 제품 공급자와 마케팅 파트너가\n매장 네트워크를 통해 비즈니스를 확장하는 플랫폼입니다.',
    gradient: 'from-primary-700 to-primary-900',
  },
  {
    id: 2,
    title: '제품을 매장 네트워크에\n공급하세요',
    subtitle: '검증된 유통 채널을 통해\n제품을 효율적으로 공급할 수 있습니다.',
    gradient: 'from-blue-600 to-indigo-800',
    cta: { label: '공급자 참여', to: '/supplier' },
  },
  {
    id: 3,
    title: '콘텐츠와 홍보 활동으로\n매장을 지원하세요',
    subtitle: '파트너로 참여하여\n매장 네트워크와 함께 성장하세요.',
    gradient: 'from-emerald-600 to-teal-800',
    cta: { label: '파트너 참여', to: '/partner' },
  },
  {
    id: 4,
    title: 'Neture에서\n비즈니스 기회를 찾으세요',
    subtitle: '공급자와 파트너의 협업으로\n새로운 유통 채널이 만들어집니다.',
    gradient: 'from-purple-600 to-violet-800',
    cta: { label: '자세히 보기', to: '/about' },
  },
];

const AUTO_SLIDE_INTERVAL = 5000;

export function HeroSliderSection() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setCurrent((index + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, AUTO_SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [next, isPaused]);

  const slide = slides[current];

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slide Content */}
      <div className={`bg-gradient-to-br ${slide.gradient} text-white py-24 transition-all duration-500`}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight whitespace-pre-line">
            {slide.title}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-10 whitespace-pre-line">
            {slide.subtitle}
          </p>
          {slide.cta && (
            <Link
              to={slide.cta.to}
              className="inline-flex items-center px-8 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              {slide.cta.label}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
        aria-label="다음 슬라이드"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              i === current ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`슬라이드 ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
