/**
 * RecommendedServicesSection - 플랫폼이 권하는 서비스 카드 그리드
 *
 * 약국경영 대시보드에서 표시되는 추천 서비스
 * WO-O4O-USER-DOMAIN-CLEANUP-V1: enrollment 제거 → entryUrl 직접 링크
 */

import { useState, useEffect } from 'react';
import { listPlatformServices } from '../../../api/platform-services';
import type { PlatformServiceItem } from '../../../api/platform-services';

export function RecommendedServicesSection() {
  const [services, setServices] = useState<PlatformServiceItem[]>([]);

  useEffect(() => {
    listPlatformServices()
      .then(setServices)
      .catch(() => {});
  }, []);

  // 추천 서비스만 필터 (미가입 + featured)
  const recommendedServices = services.filter(
    (s) => s.isFeatured && s.enrollmentStatus !== 'approved',
  );

  if (recommendedServices.length === 0) return null;

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{
        margin: '0 0 16px',
        fontSize: '18px',
        fontWeight: 600,
        color: '#0f172a',
      }}>
        플랫폼이 권하는 서비스
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        {recommendedServices.map((svc) => (
          <div
            key={svc.code}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: '1.75rem',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
              }}>
                {svc.iconEmoji || '📦'}
              </span>
              {svc.isFeatured && (
                <span style={{
                  fontSize: '0.688rem',
                  fontWeight: 500,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#FFF7ED',
                  color: '#C2410C',
                }}>
                  추천
                </span>
              )}
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#0f172a',
              marginBottom: '4px',
            }}>
              {svc.name}
            </div>
            {svc.shortDescription && (
              <div style={{
                fontSize: '14px',
                color: '#64748b',
                marginBottom: '16px',
                lineHeight: 1.5,
                flex: 1,
              }}>
                {svc.shortDescription}
              </div>
            )}
            <div style={{ marginTop: 'auto' }}>
              {svc.enrollmentStatus === 'applied' ? (
                <span style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '14px',
                  fontWeight: 500,
                }}>
                  승인 대기
                </span>
              ) : svc.entryUrl ? (
                <a
                  href={svc.entryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#ffffff',
                    color: '#1e40af',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: '1px solid #1e40af',
                    cursor: 'pointer',
                    textAlign: 'center',
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  바로 이동
                </a>
              ) : (
                <span style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#94a3b8',
                  fontSize: '14px',
                  fontWeight: 500,
                }}>
                  준비 중
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
