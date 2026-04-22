/**
 * ResourcesHubPage — 공동자료실 Hub
 * WO-KPA-RESOURCE-SYSTEM-RESET-V1
 * WO-KPA-RESOURCES-HUB-LIVE-CONNECTION-V1
 *
 * 권한 분기:
 *   - 운영자(kpa:admin / kpa:operator): 실제 기능 경로로 이동 가능
 *   - 일반 회원: "운영자 전용" 표시 (현재 기능은 운영자 도구)
 */

import { useNavigate } from 'react-router-dom';
import { BookOpen, PlusCircle, Cpu, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyRole, PLATFORM_ROLES } from '../../lib/role-constants';

const s = {
  page: {
    maxWidth: '840px',
    margin: '0 auto',
    padding: '48px 20px',
  } as React.CSSProperties,
  header: {
    marginBottom: '40px',
  } as React.CSSProperties,
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
  } as React.CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,
  iconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '14px',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 6px',
  } as React.CSSProperties,
  cardDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  } as React.CSSProperties,
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '10px',
    fontSize: '11px',
    color: '#9ca3af',
    background: '#f3f4f6',
    borderRadius: '4px',
    padding: '2px 7px',
  } as React.CSSProperties,
  notice: {
    marginTop: '32px',
    padding: '16px 20px',
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#0369a1',
    lineHeight: 1.6,
  } as React.CSSProperties,
};

interface CardConfig {
  bg: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  path: string;
}

const CARDS: CardConfig[] = [
  {
    bg: '#d1fae5',
    icon: <BookOpen size={22} color="#059669" />,
    title: '공동자료실',
    desc: '카테고리별 자료를 확인하고 활용하세요',
    path: '/operator/resources',
  },
  {
    bg: '#dbeafe',
    icon: <PlusCircle size={22} color="#2563eb" />,
    title: '자료 등록',
    desc: '새 자료를 등록하고 관리하세요',
    path: '/operator/resources/new',
  },
  {
    bg: '#ede9fe',
    icon: <Cpu size={22} color="#7c3aed" />,
    title: 'AI 활용',
    desc: '선택한 자료를 바탕으로 AI 작업을 진행하세요',
    path: '/operator/resources/basket',
  },
];

export function ResourcesHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOperator = hasAnyRole(user?.roles ?? [], PLATFORM_ROLES);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>자료실</h1>
        <p style={s.subtitle}>
          회원들이 함께 이용하는 공동자료실입니다.
        </p>
      </div>

      <div style={s.grid}>
        {CARDS.map((card) =>
          isOperator ? (
            /* 운영자: 클릭 가능한 카드 */
            <button
              key={card.title}
              onClick={() => navigate(card.path)}
              style={{
                padding: '28px 22px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#c7d2fe';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb';
              }}
            >
              <div style={{ ...s.iconWrap, background: card.bg }}>
                {card.icon}
              </div>
              <p style={s.cardTitle}>{card.title}</p>
              <p style={s.cardDesc}>{card.desc}</p>
            </button>
          ) : (
            /* 일반 회원: 비활성 카드 */
            <div
              key={card.title}
              style={{
                padding: '28px 22px',
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: '12px',
                cursor: 'default',
                opacity: 0.75,
              }}
            >
              <div style={{ ...s.iconWrap, background: card.bg, opacity: 0.6 }}>
                {card.icon}
              </div>
              <p style={{ ...s.cardTitle, color: '#9ca3af' }}>{card.title}</p>
              <p style={s.cardDesc}>{card.desc}</p>
              <span style={s.badge}>
                <Lock size={10} />
                운영자 전용
              </span>
            </div>
          )
        )}
      </div>

      {!isOperator && (
        <div style={s.notice}>
          현재 자료실 기능은 운영자만 이용할 수 있습니다. 회원 공개 기능은 추후 제공될 예정입니다.
        </div>
      )}
    </div>
  );
}
