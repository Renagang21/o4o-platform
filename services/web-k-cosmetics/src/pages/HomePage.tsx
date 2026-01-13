/**
 * HomePage - K-Cosmetics 세미 프랜차이즈 쇼윈도
 *
 * Work Order: WO-KCOS-HOME-UI-V2
 * Reference: GlycoPharm HomePage 구조 기반
 *
 * 화면 구조 (상→하):
 * 1. Hero / Campaign Slider - 플랫폼 정체성 + 캠페인
 * 2. Quick Action - 운영 도구 상태 요약 (Products, Supply, Market Trial, Tourist Hub)
 * 3. Now Running - 신상품/Trial/이벤트
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
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts';

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
  icon: string;
  link: string;
  color: string;
  status: { label: string; value: string | number };
}

interface NowRunningItem {
  id: string;
  type: 'trial' | 'event' | 'campaign' | 'product';
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
  type: 'association' | 'supplier' | 'brand';
}

// ========================================
// Static Data (운영자 관리 콘텐츠로 대체 예정)
// ========================================

const heroSlides: HeroSlide[] = [
  {
    id: 'main',
    title: 'K-Beauty Store를 위한\n운영 플랫폼',
    subtitle: '브랜드·매장·관광객이 연결됩니다',
    bgGradient: 'linear-gradient(135deg, #e91e63 0%, #c2185b 50%, #ad1457 100%)',
    cta: { label: '시작하기', link: '/platform/stores', variant: 'primary' },
  },
  {
    id: 'trial',
    title: '신상품 Market Trial\n참여 매장 모집 중',
    subtitle: '브랜드의 신상품을 먼저 체험하고 피드백을 공유하세요',
    bgGradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 50%, #2e7d32 100%)',
    cta: { label: '자세히 보기', link: '/platform/stores', variant: 'primary' },
  },
  {
    id: 'tourist',
    title: '지금 12개 매장\n· 관광객 연결 중',
    subtitle: 'Tourist Hub를 통해 실시간 연결됩니다',
    bgGradient: 'linear-gradient(135deg, #2196f3 0%, #1976d2 50%, #1565c0 100%)',
    cta: { label: 'Tourist Hub 보기', link: '/services/tourists', variant: 'primary' },
  },
  {
    id: 'trust',
    title: '다수 매장·다수 브랜드가 함께하는\nK-Beauty 플랫폼',
    subtitle: '검증된 정품 매장만 연결합니다',
    bgGradient: 'linear-gradient(135deg, #455a64 0%, #37474f 50%, #263238 100%)',
  },
];

const quickActionCards: QuickActionCard[] = [
  {
    id: 'products',
    title: 'Products',
    subtitle: '상품 관리',
    description: '매장에 노출할 상품을 관리하세요',
    icon: '📦',
    link: '/platform/stores/products',
    color: '#e2e8f0',
    status: { label: '노출 중', value: 24 },
  },
  {
    id: 'supply',
    title: 'Supply',
    subtitle: 'B2B 공급',
    description: '검증된 공급자의 상품을 조달합니다',
    icon: '📋',
    link: '/b2b/supply',
    color: '#e2e8f0',
    status: { label: '공급', value: '사용 중' },
  },
  {
    id: 'trial',
    title: 'Market Trial',
    subtitle: '신상품 체험',
    description: '브랜드의 신상품 Trial에 참여하세요',
    icon: '🎯',
    link: '/platform/stores',
    color: '#e2e8f0',
    status: { label: '진행 중', value: 3 },
  },
  {
    id: 'tourist-hub',
    title: 'Tourist Hub',
    subtitle: '관광객 허브',
    description: '관광객·콘텐츠·매장을 연결합니다',
    icon: '🌏',
    link: '/services/tourists',
    color: '#e2e8f0',
    status: { label: '연결 중', value: '매장' },
  },
];

const nowRunningItems: NowRunningItem[] = [
  {
    id: '1',
    type: 'trial',
    title: '신규 스킨케어 라인 Trial',
    supplier: 'COSRX',
    deadline: '2026.01.31',
    participants: 15,
    link: '/platform/stores',
  },
  {
    id: '2',
    type: 'product',
    title: '2026 S/S 신상품 입고',
    supplier: 'Innisfree',
    deadline: '2026.02.15',
    link: '/products',
  },
  {
    id: '3',
    type: 'campaign',
    title: '설날 특별 캠페인',
    deadline: '2026.02.01',
    link: '/products',
  },
];

const notices: Notice[] = [
  {
    id: '1',
    title: '[공지] K-Cosmetics 플랫폼 오픈 안내',
    date: '2026.01.10',
    isPinned: true,
    link: '/about',
  },
  {
    id: '2',
    title: '[안내] Market Trial 참여 가이드',
    date: '2026.01.08',
    isPinned: true,
    link: '/for-store-owners',
  },
  {
    id: '3',
    title: '1월 신상품 입고 안내',
    date: '2026.01.05',
    isPinned: false,
    link: '/products',
  },
  {
    id: '4',
    title: '협력 브랜드 추가 안내',
    date: '2026.01.03',
    isPinned: false,
    link: '/about',
  },
];

const partners: Partner[] = [
  { id: '1', name: 'COSRX', type: 'brand' },
  { id: '2', name: 'Innisfree', type: 'brand' },
  { id: '3', name: 'Laneige', type: 'brand' },
  { id: '4', name: 'Sulwhasoo', type: 'brand' },
  { id: '5', name: 'Etude', type: 'brand' },
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
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'relative', height: '420px' }}>
        {heroSlides.map((slide, index) => (
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
            <div style={{
              height: '100%',
              background: slide.bgGradient,
            }}>
              <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 24px',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
              }}>
                <div style={{ maxWidth: '600px' }}>
                  <h1 style={{
                    fontSize: '40px',
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1.3,
                    marginBottom: '16px',
                    whiteSpace: 'pre-line',
                  }}>
                    {slide.title}
                  </h1>
                  <p style={{
                    fontSize: '18px',
                    color: 'rgba(255,255,255,0.8)',
                    marginBottom: '32px',
                  }}>
                    {slide.subtitle}
                  </p>
                  {slide.cta && (
                    <Link
                      to={slide.cta.link}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 28px',
                        borderRadius: '12px',
                        fontWeight: 500,
                        fontSize: '15px',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        backgroundColor: slide.cta.variant === 'primary' ? '#fff' : 'rgba(255,255,255,0.2)',
                        color: slide.cta.variant === 'primary' ? '#1a1a1a' : '#fff',
                        boxShadow: slide.cta.variant === 'primary' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                      }}
                    >
                      {slide.cta.label}
                      <span>→</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Slide Controls */}
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
        <button
          onClick={prevSlide}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            color: '#fff',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ‹
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                height: '8px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s',
                width: index === currentSlide ? '32px' : '8px',
                backgroundColor: index === currentSlide ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            />
          ))}
        </div>
        <button
          onClick={nextSlide}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            border: 'none',
            color: '#fff',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ›
        </button>
      </div>
    </section>
  );
}

function QuickActionSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section style={{ padding: '48px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>운영 도구</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>매장 운영에 필요한 핵심 기능</p>
        </div>
        {isAuthenticated && (
          <Link
            to="/platform/stores"
            style={{
              fontSize: '14px',
              color: '#64748b',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            대시보드 →
          </Link>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {quickActionCards.map((card) => (
          <Link
            key={card.id}
            to={card.link}
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #f0f0f0',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: card.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}>
                {card.icon}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>{card.status.value}</p>
                <p style={{ fontSize: '12px', color: '#999' }}>{card.status.label}</p>
              </div>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>{card.title}</h3>
            <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, marginBottom: '8px' }}>{card.subtitle}</p>
            <p style={{ fontSize: '14px', color: '#666' }}>{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function NowRunningSection() {
  const getTypeConfig = (type: NowRunningItem['type']) => {
    switch (type) {
      case 'trial':
        return { label: 'Trial', color: '#f1f5f9', textColor: '#475569', icon: '🎯' };
      case 'product':
        return { label: '신상품', color: '#f1f5f9', textColor: '#475569', icon: '✨' };
      case 'event':
        return { label: '이벤트', color: '#f1f5f9', textColor: '#475569', icon: '🎉' };
      case 'campaign':
        return { label: '캠페인', color: '#f1f5f9', textColor: '#475569', icon: '📢' };
    }
  };

  return (
    <section style={{ padding: '48px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>Now Running</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>지금 참여 가능한 프로그램</p>
        </div>
        <Link
          to="/products"
          style={{
            fontSize: '14px',
            color: '#64748b',
            fontWeight: 500,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          전체보기 →
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {nowRunningItems.map((item) => {
          const config = getTypeConfig(item.type);
          return (
            <Link
              key={item.id}
              to={item.link}
              style={{
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #f0f0f0',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: config.color,
                  color: config.textColor,
                }}>
                  {config.icon} {config.label}
                </span>
                {item.deadline && (
                  <span style={{ fontSize: '12px', color: '#999' }}>~{item.deadline}</span>
                )}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                {item.title}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                {item.supplier && (
                  <span style={{ color: '#666' }}>{item.supplier}</span>
                )}
                {item.participants && (
                  <span style={{ color: '#999' }}>
                    👥 {item.participants}개 매장 참여
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}


function NoticeSection() {
  return (
    <section style={{ padding: '48px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>운영 공지</h2>
          <Link
            to="/about"
            style={{
              fontSize: '14px',
              color: '#64748b',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            전체보기 ›
          </Link>
        </div>
        <div>
          {notices.map((notice, index) => (
            <Link
              key={notice.id}
              to={notice.link}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: index < notices.length - 1 ? '1px solid #f5f5f5' : 'none',
                textDecoration: 'none',
                transition: 'background 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {notice.isPinned && (
                  <span style={{ fontSize: '14px' }}>📌</span>
                )}
                <span style={{
                  fontSize: '14px',
                  color: notice.isPinned ? '#1a1a1a' : '#666',
                  fontWeight: notice.isPinned ? 500 : 400,
                }}>
                  {notice.title}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#999', flexShrink: 0, marginLeft: '16px' }}>
                {notice.date}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PartnerTrustSection() {
  return (
    <section style={{ padding: '48px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginBottom: '24px' }}>
        신뢰할 수 있는 브랜드와 함께합니다
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
        {partners.map((partner) => (
          <div
            key={partner.id}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: partner.type === 'association' ? '#fce4ec' : '#fff',
              border: partner.type === 'association' ? '1px solid #f48fb1' : '1px solid #e0e0e0',
              color: partner.type === 'association' ? '#c2185b' : '#666',
            }}
          >
            <span style={{ fontWeight: 500, fontSize: '14px' }}>{partner.name}</span>
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
    <section style={{ padding: '48px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, #37474f 0%, #263238 100%)',
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>💄</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
          K-Cosmetics와 함께하세요
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
          K-Beauty 매장으로 성장할 수 있는 모든 도구와 네트워크를 제공합니다
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
          <Link
            to="/for-store-owners"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 28px',
              backgroundColor: '#e91e63',
              color: '#fff',
              fontWeight: 500,
              borderRadius: '12px',
              textDecoration: 'none',
            }}
          >
            매장 시작하기 →
          </Link>
          <Link
            to="/auth/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 28px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontWeight: 500,
              borderRadius: '12px',
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
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
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {/* 1. Hero / Campaign Slider */}
      <HeroSection />

      {/* 2. Quick Action - 운영 도구 요약 */}
      <QuickActionSection />

      {/* 3. Now Running - 신상품/Trial/이벤트 */}
      <NowRunningSection />

      {/* 4. 운영 공지 / 가이드 */}
      <NoticeSection />

      {/* CTA for Non-authenticated Users */}
      <CTASection />

      {/* 5. 협력 브랜드 신뢰 Zone */}
      <PartnerTrustSection />
    </div>
  );
}
