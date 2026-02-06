/**
 * RecommendedServicesSection - 플랫폼이 권하는 서비스 카드 그리드
 *
 * 약국경영 대시보드에서 표시되는 추천 서비스
 * 원래 MyServicesSection에서 분리됨
 */

import { useState, useEffect } from 'react';
import { listPlatformServices, applyForService } from '../../../api/platform-services';
import type { PlatformServiceItem } from '../../../api/platform-services';

export function RecommendedServicesSection() {
  const [services, setServices] = useState<PlatformServiceItem[]>([]);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [successApplied, setSuccessApplied] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    listPlatformServices()
      .then(setServices)
      .catch(() => {});
  }, []);

  // 추천 서비스만 필터 (미등록 + featured)
  const recommendedServices = services.filter(
    (s) => s.isFeatured && s.enrollmentStatus !== 'approved',
  );

  const handleApply = async (code: string, name: string) => {
    setApplyingCode(code);
    try {
      await applyForService(code);
      const updated = await listPlatformServices();
      setServices(updated);
      setSuccessApplied({ code, name });
    } catch {
      // silent
    } finally {
      setApplyingCode(null);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessApplied(null);
  };

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
              ) : svc.enrollmentStatus === 'rejected' ? (
                <button
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
                  }}
                  onClick={() => handleApply(svc.code, svc.name)}
                  disabled={applyingCode === svc.code}
                >
                  재신청
                </button>
              ) : (
                <button
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
                  }}
                  onClick={() => handleApply(svc.code, svc.name)}
                  disabled={applyingCode === svc.code}
                >
                  이용 신청
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Success Modal */}
      {successApplied && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '3rem' }}>✅</span>
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#0f172a',
              margin: '0 0 12px',
            }}>
              가입신청이 완료되었습니다
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#64748b',
              lineHeight: 1.6,
              margin: '0 0 24px',
            }}>
              <strong>{successApplied.name}</strong> 서비스 이용 신청이 접수되었습니다.<br />
              운영자 승인 후 서비스를 이용하실 수 있습니다.
            </p>
            <button
              style={{
                display: 'inline-block',
                padding: '10px 32px',
                borderRadius: '8px',
                backgroundColor: '#1e40af',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={handleCloseSuccess}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
