/**
 * HomePage - K-Cosmetics 세미 프랜차이즈 쇼윈도
 *
 * WO-KCOS-HOME-UI-V2: 초기 구현 (정적)
 * WO-KCOS-HOME-DYNAMIC-IMPL-V1: 운영 공지 동적화 (CMS API 연동)
 * WO-KCOS-HOME-DYNAMIC-IMPL-V3: heroSlides CMS slots 연동
 *
 * 화면 구조 (상→하):
 * 1. Hero / Campaign Slider — 플랫폼 정체성 + 캠페인  [V3 완료: CMS slots 연동, 정적 fallback]
 * 2. Quick Action — 운영 도구 상태 요약               [TODO V4: storeHub KPI 연동]
 * 3. Now Running — 신상품/Trial/이벤트               [V2 완료: market-trial API 연동]
 * 4. 운영 공지 / 가이드                              [V1 완료: CMS 동적 연동]
 * 5. 협력 브랜드 신뢰 Zone                           [V2 완료: 파트너 API 연동]
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
import { Link } from 'react-router-dom';
import { PageHero, PageSection, PageContainer } from '@o4o/ui';
import { useAuth } from '../contexts';
import { BusinessOnboardingBanner } from '../components/onboarding/BusinessOnboardingBanner';
import { NoticeSection } from '../components/home/NoticeSection';
import { homeApi, HomePrefetchData, HomeRunningTrial, HomePartner, HomeHeroSlide } from '../api/home';
import {
  heroSlides,
  quickActionCards,
} from '../config/homeStaticData';

// ========================================
// Components
// ========================================

function HeroSection({ slides }: { slides: HomeHeroSlide[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setCurrentSlide(0);
  }, [slides]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: '320px' }}>
        {slides.map((slide: HomeHeroSlide, index: number) => (
          <div
            key={slide.id}
            style={{
              position: 'absolute',
              inset: 0,
              transition: 'opacity 0.7s ease',
              opacity: index === currentSlide ? 1 : 0,
              zIndex: index === currentSlide ? 10 : 0,
            }}
          >
            <div style={{ height: '100%', background: slide.bgGradient }}>
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8" style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <div style={{ maxWidth: '600px' }}>
                  {/* WO-GLOBAL-ALPHA-STATUS-HERO-V080: 운영형 알파 상태 표시 (첫 번째 슬라이드에만) */}
                  {index === 0 && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 12px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '20px',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.8)',
                      marginBottom: '16px',
                    }}>
                      <span style={{ width: '6px', height: '6px', backgroundColor: '#34d399', borderRadius: '50%' }}></span>
                      <span>운영형 알파 · v0.8.0</span>
                    </div>
                  )}
                  <h1 style={{
                    fontSize: '32px',
                    fontWeight: 600,
                    color: '#fff',
                    lineHeight: 1.4,
                    marginBottom: '12px',
                    whiteSpace: 'pre-line',
                  }}>
                    {slide.title}
                  </h1>
                  <p style={{
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: index === 0 ? '8px' : '24px',
                  }}>
                    {slide.subtitle}
                  </p>
                  {index === 0 && (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
                      매장·브랜드와 함께 운영 구조를 검증하는 단계입니다
                    </p>
                  )}
                  {slide.cta && (() => {
                    // WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1:
                    // 외부 URL은 <a target="_blank">, 내부는 <Link>
                    const ctaStyle = {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontWeight: 500,
                      fontSize: '14px',
                      textDecoration: 'none',
                      backgroundColor: '#fff',
                      color: '#1e293b',
                    } as const;
                    const isExternal = /^https?:\/\//.test(slide.cta.link);
                    if (isExternal) {
                      return (
                        <a href={slide.cta.link} target="_blank" rel="noopener noreferrer" style={ctaStyle}>
                          {slide.cta.label}<span>→</span>
                        </a>
                      );
                    }
                    return (
                      <Link to={slide.cta.link} style={ctaStyle}>
                        {slide.cta.label}<span>→</span>
                      </Link>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <button onClick={prevSlide} style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
          border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer',
        }}>‹</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {slides.map((_: HomeHeroSlide, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                height: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                transition: 'all 0.3s',
                width: index === currentSlide ? '32px' : '8px',
                backgroundColor: index === currentSlide ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
        <button onClick={nextSlide} style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
          border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer',
        }}>›</button>
      </div>
    </section>
  );
}

function QuickActionSection({
  productsVisibleCount,
  touristHubActiveStores,
}: {
  productsVisibleCount: number | null;
  touristHubActiveStores: number | null;
}) {
  const { isAuthenticated } = useAuth();

  const cardStyle = {
    backgroundColor: '#fff', borderRadius: '8px', padding: '20px',
    border: '1px solid #e2e8f0', textDecoration: 'none', display: 'block',
  } as const;

  return (
    <section style={{ padding: '40px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>운영 도구</h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>매장 운영에 필요한 핵심 기능</p>
        </div>
        {isAuthenticated && (
          <Link to="/platform/stores" style={{
            fontSize: '14px', color: '#64748b', fontWeight: 500,
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            대시보드 →
          </Link>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {quickActionCards.map((card) => {
          // WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V1: products — 로그인 시 실수치
          // WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V2: tourist-hub — public API 실수치
          const statusValue =
            card.id === 'products' && isAuthenticated && productsVisibleCount !== null
              ? productsVisibleCount
              : card.id === 'tourist-hub' && touristHubActiveStores !== null
                ? touristHubActiveStores
                : card.status.value;

          // 외부 URL 카드 (trial: Neture Market Trial 등) — <a target="_blank">
          // 내부 URL 카드 — <Link>
          const isExternal = /^https?:\/\//.test(card.link);
          const cardInner = (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}>
                  {card.icon}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b' }}>{statusValue}</p>
                  <p style={{ fontSize: '11px', color: '#94a3b8' }}>{card.status.label}</p>
                </div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>{card.title}</h3>
              <p style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>{card.subtitle}</p>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>{card.description}</p>
            </>
          );

          if (isExternal) {
            return (
              <a key={card.id} href={card.link} target="_blank" rel="noopener noreferrer" style={cardStyle}>
                {cardInner}
              </a>
            );
          }
          return (
            <Link key={card.id} to={card.link} style={cardStyle}>
              {cardInner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NowRunningSection({ items, loading }: { items: HomeRunningTrial[]; loading: boolean }) {
  if (loading) {
    return (
      <section style={{ padding: '40px 0' }}>
        <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>불러오는 중...</p>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section style={{ padding: '40px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>Now Running</h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>지금 참여 가능한 프로그램</p>
        </div>
        <a
          href="https://neture.co.kr/market-trial"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, textDecoration: 'none' }}
        >
          전체보기 →
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {items.map((item) => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#fff', borderRadius: '8px', padding: '16px',
              border: '1px solid #e2e8f0', textDecoration: 'none', display: 'block',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{
                padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                backgroundColor: '#f1f5f9', color: '#475569',
              }}>
                Trial
              </span>
              {item.deadline && (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>~{item.deadline}</span>
              )}
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
              {item.title}
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              {item.supplier && <span style={{ color: '#64748b' }}>{item.supplier}</span>}
              {typeof item.participants === 'number' && (
                <span style={{ color: '#94a3b8' }}>{item.participants}개 매장 참여</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function PartnerTrustSection({ partners }: { partners: HomePartner[] }) {
  if (partners.length === 0) return null;

  return (
    <section style={{ padding: '40px 0' }}>
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
        신뢰할 수 있는 브랜드와 함께합니다
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
        {partners.map((partner) => (
          partner.linkUrl ? (
            <a
              key={partner.id}
              href={partner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 16px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none',
              }}
            >
              <span style={{ fontWeight: 500, fontSize: '13px', color: '#475569' }}>{partner.name}</span>
            </a>
          ) : (
            <div key={partner.id} style={{
              padding: '10px 16px', borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
            }}>
              <span style={{ fontWeight: 500, fontSize: '13px', color: '#475569' }}>{partner.name}</span>
            </div>
          )
        ))}
      </div>
    </section>
  );
}

// WO-KCOS-COMMUNITY-CONTENT-INTEGRATION-V1: Home → 커뮤니티 진입 경로 추가
function CommunityCTASection() {
  return (
    <section style={{ padding: '0 0 40px' }}>
      <div style={{
        backgroundColor: '#f8fafc', borderRadius: '8px', padding: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>K-Cosmetics 커뮤니티</h3>
          <p style={{ fontSize: '13px', color: '#64748b' }}>포럼, 콘텐츠, 최신 K-Beauty 정보를 한 곳에서 확인하세요</p>
        </div>
        <Link to="/community" style={{
          padding: '10px 20px', backgroundColor: '#e91e63', color: '#fff',
          borderRadius: '8px', fontWeight: 500, fontSize: '14px', textDecoration: 'none', flexShrink: 0,
        }}>
          커뮤니티 →
        </Link>
      </div>
    </section>
  );
}

function CTASection() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return null;

  return (
    <section style={{ padding: '40px 0' }}>
      <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
          K-Cosmetics와 함께하세요
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>
          K-Beauty 매장으로 성장할 수 있는 모든 도구와 네트워크를 제공합니다
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <Link to="/for-store-owners" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 24px',
            backgroundColor: '#fff', color: '#1e293b', fontWeight: 500, borderRadius: '6px',
            textDecoration: 'none', fontSize: '14px',
          }}>
            매장 시작하기 →
          </Link>
          <Link to="/auth/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 24px',
            backgroundColor: 'transparent', color: '#94a3b8', fontWeight: 500, borderRadius: '6px',
            textDecoration: 'none', fontSize: '14px', border: '1px solid #475569',
          }}>
            로그인
          </Link>
        </div>
      </div>
    </section>
  );
}

// ========================================
// Main Component
// ========================================

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const [homeData, setHomeData] = useState<HomePrefetchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [productsVisibleCount, setProductsVisibleCount] = useState<number | null>(null);

  useEffect(() => {
    homeApi.prefetchAll()
      .then(setHomeData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // products 실수치: 로그인 시에만 호출 (requireAuth — 비로그인 시 401)
  useEffect(() => {
    if (!isAuthenticated) return;
    homeApi.getProductsVisibleCount()
      .then(setProductsVisibleCount)
      .catch(() => setProductsVisibleCount(null));
  }, [isAuthenticated]);

  // CMS heroSlides 우선, 없으면 정적 fallback (homeStaticData.ts)
  const activeHeroSlides = homeData?.heroSlides?.length ? homeData.heroSlides : heroSlides;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff' }}>
      {/* 1. Hero / Campaign Slider (V3: CMS 연동, 정적 fallback) */}
      <PageHero><HeroSection slides={activeHeroSlides} /></PageHero>

      {/* Business Onboarding Banner */}
      <PageSection>
        <PageContainer>
          <BusinessOnboardingBanner />
        </PageContainer>
      </PageSection>

      {/* 2. Quick Action — 운영 도구 요약 (V4 tune: products/tourist-hub 실수치, trial 링크 수정) */}
      <PageSection>
        <PageContainer>
          <QuickActionSection
            productsVisibleCount={productsVisibleCount}
            touristHubActiveStores={homeData?.touristHubActiveStores ?? null}
          />
        </PageContainer>
      </PageSection>

      {/* 3. Now Running — Market Trial (V2 동적화 완료) */}
      {(loading || (homeData?.runningTrials ?? []).length > 0) && (
        <PageSection>
          <PageContainer>
            <NowRunningSection items={homeData?.runningTrials ?? []} loading={loading} />
          </PageContainer>
        </PageSection>
      )}

      {/* 4. 운영 공지 (V1 동적화 완료) */}
      <PageSection>
        <PageContainer>
          <NoticeSection prefetchedNotices={homeData?.notices} loading={loading} />
        </PageContainer>
      </PageSection>

      {/* 커뮤니티 진입 CTA (WO-KCOS-COMMUNITY-CONTENT-INTEGRATION-V1) */}
      <PageSection>
        <PageContainer>
          <CommunityCTASection />
        </PageContainer>
      </PageSection>

      {/* CTA for Non-authenticated Users */}
      {!isAuthenticated && (
        <PageSection>
          <PageContainer>
            <CTASection />
          </PageContainer>
        </PageSection>
      )}

      {/* 5. 협력 브랜드 신뢰 Zone (V2 동적화 완료) */}
      {(homeData?.partners ?? []).length > 0 && (
        <PageSection last>
          <PageContainer>
            <PartnerTrustSection partners={homeData?.partners ?? []} />
          </PageContainer>
        </PageSection>
      )}
    </div>
  );
}
