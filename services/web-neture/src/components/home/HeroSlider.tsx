/**
 * HeroSlider — CMS 기반 Hero 슬라이드
 * WO-O4O-NETURE-HOMEPAGE-CMS-V1
 *
 * 자동 전환 (5초) + 수동 네비게이션 + dots
 * 데이터 0건이면 기존 정적 Hero 폴백
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CmsContent } from '../../lib/api/content';
import { homepageCmsApi } from '../../lib/api/content';

export default function HeroSlider() {
  const [slides, setSlides] = useState<CmsContent[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homepageCmsApi.getHeroSlides().then((data) => {
      setSlides(data);
      setLoading(false);
    });
  }, []);

  // Auto-advance
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);

  // Loading or no data → static fallback
  if (loading || slides.length === 0) {
    return <StaticHero />;
  }

  const slide = slides[current];
  const bg = slide.imageUrl
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${slide.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <section
      className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 min-h-[400px] flex items-center transition-all duration-700"
      style={bg}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">{slide.title}</h1>
        {slide.summary && (
          <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto">{slide.summary}</p>
        )}
        {slide.linkUrl && (
          <Link
            to={slide.linkUrl}
            className="inline-flex items-center px-8 py-3 bg-white text-primary-700 font-medium rounded-md hover:bg-primary-50 transition-colors"
          >
            {slide.linkText || '자세히 보기'}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        )}
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full hover:bg-black/50 transition-colors">
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-3 h-3 rounded-full transition-all ${i === current ? 'bg-white scale-110' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Fallback: 기존 정적 Hero (CMS 데이터 없을 때) */
function StaticHero() {
  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs text-primary-100 mb-4">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <span>o4o 플랫폼 기반 서비스</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">공급자·파트너 연결, Neture</h1>
        <p className="text-xl text-primary-100 mb-8">
          공급자를 탐색하고, 파트너로 참여하세요.
          <br />
          주문·결제 없이 조건과 기회를 투명하게 확인합니다.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/workspace/suppliers" className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-md text-slate-500 bg-white hover:bg-primary-50 transition-colors">
            공급자 보기 <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link to="/partners/requests" className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-md text-white hover:bg-white hover:text-slate-500 transition-colors">
            제휴 요청 보기 <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
