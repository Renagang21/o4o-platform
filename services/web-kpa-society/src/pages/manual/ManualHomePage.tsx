/**
 * ManualHomePage — 매뉴얼 메인 페이지 (5카드 구조)
 *
 * WO-KPA-A-MANUAL-MAIN-PAGE-V1
 *
 * 5개 카드:
 * 1. 서비스 안내 — 공개
 * 2. 일반 사용자 매뉴얼 — 공개
 * 3. 약국 개설자 매뉴얼 — pharmacy_owner 배지, 공개 접근
 * 4. 운영자(Admin) 매뉴얼 — kpa:admin 전용
 * 5. 운영자(Operator) 매뉴얼 — kpa:operator 전용
 */

import { useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts';
import { ROLES, hasAnyRole } from '../../lib/role-constants';

interface ManualCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  badge?: string;
  badgeColor?: string;
  requiredRoles?: readonly string[];
}

const MANUAL_CARDS: ManualCard[] = [
  {
    id: 'service',
    title: '서비스 안내',
    description: '플랫폼 전체 서비스 구조와 이용 방법을 안내합니다.',
    icon: '📘',
    route: '/manual/service',
  },
  {
    id: 'general',
    title: '일반 사용자 매뉴얼',
    description: '커뮤니티, 포럼, 강의, 콘텐츠 등 기본 기능 사용법.',
    icon: '👤',
    route: '/manual/general',
  },
  {
    id: 'pharmacy',
    title: '약국 개설자 매뉴얼',
    description: '매장 개설, 상품 등록, 채널 관리, 주문 처리 등.',
    icon: '💊',
    route: '/manual/pharmacy',
    badge: '매장 운영자용',
    badgeColor: '#059669',
  },
  {
    id: 'admin',
    title: '운영자(Admin) 매뉴얼',
    description: '플랫폼 관리, 승인 처리, 사용자 관리 등 관리자 업무.',
    icon: '🛡️',
    route: '/manual/admin',
    badge: '운영자 전용',
    badgeColor: '#d97706',
    requiredRoles: [ROLES.KPA_ADMIN],
  },
  {
    id: 'operator',
    title: '운영자(Operator) 매뉴얼',
    description: '콘텐츠 운영, 서비스 관리, 데이터 모니터링 등.',
    icon: '⚙️',
    route: '/manual/operator',
    badge: '운영자 전용',
    badgeColor: '#d97706',
    requiredRoles: [ROLES.KPA_ADMIN, ROLES.KPA_OPERATOR],
  },
];

export function ManualHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRoles = user?.roles ?? [];

  const handleCardClick = (card: ManualCard) => {
    if (card.requiredRoles && !hasAnyRole(userRoles, card.requiredRoles)) {
      toast.error('해당 매뉴얼은 운영자 권한이 필요합니다.');
      return;
    }
    navigate(card.route);
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
          매뉴얼
        </h1>
        <p style={{ fontSize: '15px', color: '#64748b', margin: 0 }}>
          역할별 사용 안내서를 확인하세요.
        </p>
      </div>

      {/* Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px',
      }}>
        {MANUAL_CARDS.map((card) => {
          const locked = !!card.requiredRoles && !hasAnyRole(userRoles, card.requiredRoles);

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: locked ? '#f8fafc' : '#fff',
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.6 : 1,
                textAlign: 'left',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!locked) {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              {/* Icon + Badge row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', width: '100%' }}>
                <span style={{ fontSize: '32px' }}>{card.icon}</span>
                {card.badge && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: card.badgeColor ?? '#475569',
                    background: card.badgeColor ? `${card.badgeColor}15` : '#f1f5f9',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>
                    {card.badge}
                  </span>
                )}
              </div>

              <span style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                {card.title}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                {card.description}
              </span>

              {locked && (
                <span style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  color: '#94a3b8',
                }}>
                  🔒 권한 필요
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
