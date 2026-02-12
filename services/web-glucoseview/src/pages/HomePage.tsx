import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';
import { useLoginModal } from '../contexts/LoginModalContext';
import { ServiceOnboardingBanner } from '../components/onboarding/ServiceOnboardingBanner';

// 슬라이드 배너 타입
interface SlideBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  linkUrl?: string;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  order: number;
}

// 파트너 업체 타입
interface Partner {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  websiteUrl: string;
  isActive: boolean;
  order: number;
}

// 슬라이드 배너 데이터 - 여러 배너 지원
// WO-GLOBAL-ALPHA-STATUS-HERO-V080: 운영형 알파 상태 표시
const sampleBanners: SlideBanner[] = [
  {
    id: '1',
    title: 'GlucoseView',
    subtitle: '약국용 CGM 데이터 관리 · 운영형 알파 v0.8.0',
    bgColor: 'bg-slate-800',
    textColor: 'text-white',
    isActive: true,
    order: 1,
  },
  {
    id: '2',
    title: '혈당 데이터 분석',
    subtitle: '연속혈당 데이터를 시각화하여 상담에 활용',
    bgColor: 'bg-slate-700',
    textColor: 'text-white',
    isActive: true,
    order: 2,
  },
  {
    id: '3',
    title: '약사 전용 서비스',
    subtitle: '대한약사회 인증 회원 전용',
    bgColor: 'bg-slate-600',
    textColor: 'text-white',
    isActive: true,
    order: 3,
  },
];

// 샘플 파트너 데이터 (나중에 관리자가 수정 가능)
const samplePartners: Partner[] = [
  {
    id: '1',
    name: 'LibreView',
    description: 'Abbott의 CGM 데이터 플랫폼',
    websiteUrl: 'https://www.libreview.com',
    isActive: true,
    order: 1,
  },
  {
    id: '2',
    name: 'Dexcom',
    description: '연속혈당측정 전문 기업',
    websiteUrl: 'https://www.dexcom.com',
    isActive: true,
    order: 2,
  },
  {
    id: '3',
    name: '대한약사회',
    description: '약사 직능단체',
    websiteUrl: 'https://www.kpanet.or.kr',
    isActive: true,
    order: 3,
  },
  {
    id: '4',
    name: '건강보험심사평가원',
    description: '의료 심사 및 평가 기관',
    websiteUrl: 'https://www.hira.or.kr',
    isActive: true,
    order: 4,
  },
  {
    id: '5',
    name: '국민건강보험공단',
    description: '건강보험 운영 기관',
    websiteUrl: 'https://www.nhis.or.kr',
    isActive: true,
    order: 5,
  },
];

// localStorage 키
const BANNERS_KEY = 'glucoseview_banners';
const PARTNERS_KEY = 'glucoseview_partners';

// 배너/파트너 데이터 로드
const loadBanners = (): SlideBanner[] => {
  try {
    const saved = localStorage.getItem(BANNERS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return sampleBanners;
};

const loadPartners = (): Partner[] => {
  try {
    const saved = localStorage.getItem(PARTNERS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return samplePartners;
};

export default function HomePage() {
  const { isAuthenticated, isApproved, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { openLoginModal } = useLoginModal();

  // 슬라이드 배너 상태 - useMemo로 한번만 계산
  const banners = useMemo(() => loadBanners().filter(b => b.isActive).sort((a, b) => a.order - b.order), []);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 파트너 상태 - useMemo로 한번만 계산
  const partners = useMemo(() => loadPartners().filter(p => p.isActive).sort((a, b) => a.order - b.order), []);

  // 자동 슬라이드 기능
  const nextSlideAuto = useCallback(() => {
    if (!isPaused && banners.length > 1) {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }
  }, [isPaused, banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(nextSlideAuto, 5000); // 5초마다 자동 전환
    return () => clearInterval(interval);
  }, [nextSlideAuto, banners.length]);

  // 보호된 기능 클릭 핸들러
  const handleProtectedClick = (path: string) => {
    if (!isAuthenticated) {
      openLoginModal();
    } else if (!isApproved) {
      navigate('/pending');
    } else {
      navigate(path);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Banner Section - 광고/파트너 대응 가능한 강화된 배너 */}
      {banners.length > 0 && (
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-6">
            <div
              className="relative overflow-hidden rounded-xl h-44 sm:h-52 md:h-56"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  } ${banner.bgColor}`}
                >
                  {banner.linkUrl ? (
                    <a
                      href={banner.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full"
                    >
                      <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                        <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-3 ${banner.textColor}`}>
                          {banner.title}
                        </h2>
                        <p className={`text-base sm:text-lg md:text-xl opacity-90 ${banner.textColor}`}>
                          {banner.subtitle}
                        </p>
                      </div>
                    </a>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                      <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-3 ${banner.textColor}`}>
                        {banner.title}
                      </h2>
                      <p className={`text-base sm:text-lg md:text-xl opacity-90 ${banner.textColor}`}>
                        {banner.subtitle}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* 슬라이드 컨트롤 - 배너 내부 */}
              {banners.length > 1 && (
                <>
                  {/* 이전/다음 버튼 */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* 인디케이터 */}
                  <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {banners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-colors ${
                          index === currentSlide ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Service Onboarding Banner - 미승인 사용자 */}
      <ServiceOnboardingBanner />

      {/* CTA Section - 로그인 후에만 표시 */}
      {isAuthenticated && isApproved && (
        <section className="py-8 px-6 bg-white border-b border-slate-100">
          <div className="max-w-4xl mx-auto text-center">
            <Link
              to="/patients"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              환자 관리 시작하기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* Feature Cards - 확장된 간격과 컨테이너 */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-4">
            {/* Card 1 - Patients */}
            <button
              onClick={() => handleProtectedClick('/patients')}
              className="block w-full text-left bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-slate-900">환자별 데이터</h3>
                    {!isAuthenticated && (
                      <span className="px-2 py-0.5 text-xs font-medium text-slate-700 bg-slate-100 rounded">로그인 필요</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    개별 환자의 CGM 데이터를 정리하여 확인합니다
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Card 2 - Insights */}
            <button
              onClick={() => handleProtectedClick('/insights')}
              className="block w-full text-left bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-slate-900">전체 현황</h3>
                    {!isAuthenticated && (
                      <span className="px-2 py-0.5 text-xs font-medium text-slate-700 bg-slate-100 rounded">로그인 필요</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    관리 중인 환자들의 전체 흐름을 파악합니다
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Card 3 - About (공개) */}
            <Link
              to="/about"
              className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-slate-900 mb-1">서비스 안내</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    GlucoseView가 하는 일과 하지 않는 일
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* Card 4 - Admin (관리자만) */}
            {isAdmin && (
              <Link
                to="/admin"
                className="block bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-slate-900">관리자</h3>
                      <span className="px-2 py-0.5 text-xs font-medium text-slate-700 bg-slate-100 rounded">Admin</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      회원 승인 및 시스템 관리
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Partner Section - 정적 그리드 */}
      {partners.length > 0 && (
        <section className="py-12 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <h3 className="text-sm font-medium text-slate-400 text-center mb-6">파트너</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {partners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt={partner.name} className="w-5 h-5 object-contain" />
                    ) : (
                      <span className="text-sm font-medium text-slate-400">{partner.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-sm text-slate-600">{partner.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer note - 확장된 간격 */}
      <section className="py-12 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm text-slate-400">
            본 서비스는 의료 진단이나 치료를 목적으로 하지 않습니다
          </p>
        </div>
      </section>

      {/* Login Modal */}
      <LoginModal />
    </div>
  );
}
