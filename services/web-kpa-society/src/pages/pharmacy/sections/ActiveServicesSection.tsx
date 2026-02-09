/**
 * ActiveServicesSection - 이용 중인 서비스 카드 그리드
 *
 * WO-PHARMACY-DASHBOARD-SERVICE-CONNECT-V1
 *
 * 약국경영 대시보드에서 연결되는 3개 서비스:
 * - GlycoPharm (외부 서비스)
 * - GlucoseView (외부 서비스)
 * - KPA Society (내부 라우트)
 */

import { useNavigate } from 'react-router-dom';

interface ServiceCard {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'pending' | 'inactive';
  icon: string;
  /** 내부 라우트 경로 (SPA 내 이동) */
  internalPath?: string;
  /** 외부 서비스 URL */
  externalUrl?: string;
}

/**
 * 외부 서비스 URL
 * 프로덕션: Cloud Run 배포 도메인
 * 개발: localhost 포트
 */
const GLYCOPHARM_URL = import.meta.env.DEV
  ? 'http://localhost:4201'
  : 'https://glycopharm.neture.co.kr';

const GLUCOSEVIEW_URL = import.meta.env.DEV
  ? 'http://localhost:4101'
  : 'https://glucoseview.neture.co.kr';

const SERVICE_CARDS: ServiceCard[] = [
  {
    id: 'glycopharm',
    name: 'GlycoPharm',
    description: '건강기능식품 유통·재고·판매 관리',
    status: 'active',
    icon: '💊',
    externalUrl: GLYCOPHARM_URL,
  },
  {
    id: 'glucoseview',
    name: 'GlucoseView',
    description: '약국 혈당관리 프로그램',
    status: 'active',
    icon: '📊',
    externalUrl: GLUCOSEVIEW_URL,
  },
  {
    id: 'kpa-society',
    name: 'KPA 약사 커뮤니티',
    description: '약국 운영 관련 포럼·교육·자료',
    status: 'active',
    icon: '🏛️',
    internalPath: '/forum',
  },
];

const STATUS_STYLES: Record<ServiceCard['status'], { bg: string; color: string; label: string }> = {
  active: { bg: '#dcfce7', color: '#166534', label: '이용 중' },
  pending: { bg: '#fef9c3', color: '#854d0e', label: '신청 중' },
  inactive: { bg: '#f1f5f9', color: '#64748b', label: '미이용' },
};

export function ActiveServicesSection() {
  const navigate = useNavigate();

  function handleCardClick(card: ServiceCard) {
    if (card.internalPath) {
      navigate(card.internalPath);
    } else if (card.externalUrl) {
      window.location.href = card.externalUrl;
    }
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{
        margin: '0 0 16px',
        fontSize: '18px',
        fontWeight: 600,
        color: '#0f172a',
      }}>
        이용 중인 서비스
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px',
      }}>
        {SERVICE_CARDS.map((service) => {
          const statusStyle = STATUS_STYLES[service.status];
          return (
            <div
              key={service.id}
              onClick={() => handleCardClick(service)}
              style={{
                padding: '20px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '28px' }}>{service.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                    {service.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                    {service.description}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: statusStyle.bg,
                  color: statusStyle.color,
                }}>
                  {statusStyle.label}
                </div>
                <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 500 }}>
                  서비스 이동 →
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
