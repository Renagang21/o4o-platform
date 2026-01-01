import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';

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

// 샘플 슬라이드 배너 데이터 (나중에 관리자가 수정 가능)
const sampleBanners: SlideBanner[] = [
  {
    id: '1',
    title: 'GlucoseView',
    subtitle: '약국을 위한 CGM 데이터 정리 도구',
    bgColor: 'bg-gradient-to-r from-blue-600 to-blue-400',
    textColor: 'text-white',
    isActive: true,
    order: 1,
  },
  {
    id: '2',
    title: '혈당 관리의 새로운 패러다임',
    subtitle: '환자별 CGM 데이터를 한눈에 파악하세요',
    bgColor: 'bg-gradient-to-r from-purple-600 to-pink-500',
    textColor: 'text-white',
    isActive: true,
    order: 2,
  },
  {
    id: '3',
    title: '약사님의 상담을 도와드립니다',
    subtitle: '데이터 기반의 전문 상담 지원',
    bgColor: 'bg-gradient-to-r from-emerald-600 to-teal-500',
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
  const [showLoginModal, setShowLoginModal] = useState(false);

  // 슬라이드 배너 상태
  const [banners] = useState<SlideBanner[]>(() => loadBanners().filter(b => b.isActive).sort((a, b) => a.order - b.order));
  const [currentSlide, setCurrentSlide] = useState(0);

  // 파트너 상태
  const [partners] = useState<Partner[]>(() => loadPartners().filter(p => p.isActive).sort((a, b) => a.order - b.order));

  // 자동 슬라이드
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

  // 보호된 기능 클릭 핸들러
  const handleProtectedClick = (path: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
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
      {/* Slide Banner Section - 사이트 폭에 맞춤 */}
      {banners.length > 0 && (
        <section className="pt-6 pb-4 px-4 md:px-6 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-2xl h-32 sm:h-40 md:h-48 shadow-md">
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
                      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                        <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 ${banner.textColor}`}>
                          {banner.title}
                        </h2>
                        <p className={`text-sm sm:text-base md:text-lg opacity-90 ${banner.textColor}`}>
                          {banner.subtitle}
                        </p>
                      </div>
                    </a>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center px-6 text-center">
                      <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 ${banner.textColor}`}>
                        {banner.title}
                      </h2>
                      <p className={`text-sm sm:text-base md:text-lg opacity-90 ${banner.textColor}`}>
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

      {/* Hero Section - CTA */}
      <section className="py-12 px-6 bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-slate-400 mb-2">
            glucoseview.co.kr
          </p>

          {/* 로그인 상태에 따른 CTA */}
          {!isAuthenticated ? (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                약사 로그인
              </button>
              <Link
                to="/register"
                className="px-6 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                회원가입
              </Link>
            </div>
          ) : isApproved ? (
            <div>
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
          ) : null}
        </div>
      </section>

      {/* Preview Cards */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid gap-4">
            {/* Card 1 - Patients */}
            <button
              onClick={() => handleProtectedClick('/patients')}
              className="block w-full text-left bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-slate-900">환자별 데이터</h3>
                    {!isAuthenticated && (
                      <span className="px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded">로그인 필요</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
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
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-slate-900">전체 현황</h3>
                    {!isAuthenticated && (
                      <span className="px-2 py-0.5 text-xs font-medium text-blue-600 bg-blue-50 rounded">로그인 필요</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
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
                  <p className="text-sm text-slate-500">
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
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-slate-900">관리자</h3>
                      <span className="px-2 py-0.5 text-xs font-medium text-red-600 bg-red-50 rounded">Admin</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
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

      {/* Partner Section - 사이트 폭에 맞춤 */}
      {partners.length > 0 && (
        <section className="py-6 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <h3 className="text-sm font-medium text-slate-500 text-center mb-4">파트너 & 관련 기관</h3>

            {/* 그리드 레이아웃 - 중앙 정렬 */}
            <div className="flex flex-wrap justify-center gap-3">
              {partners.map((partner) => (
                <a
                  key={partner.id}
                  href={partner.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-slate-200 hover:border-slate-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt={partner.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <span className="text-lg font-bold text-slate-400">{partner.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">{partner.name}</p>
                    <p className="text-xs text-slate-500">{partner.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer note */}
      <section className="py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs text-slate-400">
            본 서비스는 의료 진단이나 치료를 목적으로 하지 않습니다
          </p>
        </div>
      </section>

      {/* Test Account Info - 비로그인 시에만 표시 */}
      {!isAuthenticated && (
        <section className="pb-16 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 mb-2">테스트 계정 안내</p>
                  <div className="grid grid-cols-2 gap-3 text-xs text-amber-700">
                    <div className="p-2 bg-white/50 rounded">
                      <p className="font-medium mb-1">약사 계정</p>
                      <p>이메일: pharmacist@test.test</p>
                      <p>비밀번호: testID1234</p>
                    </div>
                    <div className="p-2 bg-white/50 rounded">
                      <p className="font-medium mb-1">관리자 계정</p>
                      <p>이메일: admin@test.test</p>
                      <p>비밀번호: adminID1234</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Login Modal */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
}
