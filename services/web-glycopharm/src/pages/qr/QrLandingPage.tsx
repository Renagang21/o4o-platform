/**
 * QrLandingPage
 *
 * WO-O4O-REQUEST-UX-REFINEMENT-PHASE2B
 *
 * QR 스캔 후 목적 확인 + 요청 생성 페이지
 *
 * URL: /qr/:pharmacyId?purpose=consultation&sourceId=qr-001
 *
 * 동작 분기:
 * - purpose ∈ {consultation, sample, order} → 확인 화면 → POST /events → Request 생성
 * - purpose ∈ {info, survey, event} → 스토어 페이지로 즉시 이동
 * - purpose 없음 → 기본 스토어 페이지로 이동
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { MessageCircle, Package, ShoppingCart, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

/** 승격 가능 purpose */
const PROMOTABLE_PURPOSES = ['consultation', 'sample', 'order'] as const;
type PromotablePurpose = typeof PROMOTABLE_PURPOSES[number];

/** purpose별 UI 구성 */
const PURPOSE_CONFIG: Record<PromotablePurpose, {
  title: string;
  description: string;
  confirmText: string;
  icon: typeof MessageCircle;
  color: string;
  bgColor: string;
}> = {
  consultation: {
    title: '상담 요청',
    description: '직원에게 상담을 요청하시겠습니까?',
    confirmText: '상담 요청하기',
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  sample: {
    title: '샘플 신청',
    description: '샘플 신청은 직원 확인 후 진행됩니다.',
    confirmText: '샘플 신청하기',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  order: {
    title: '주문 요청',
    description: '주문 요청 단계이며, 결제는 이후 진행됩니다.',
    confirmText: '주문 요청하기',
    icon: ShoppingCart,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
};

type PageState = 'confirm' | 'submitting' | 'success' | 'cooldown' | 'error';

export default function QrLandingPage() {
  const { pharmacyId } = useParams<{ pharmacyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const purpose = searchParams.get('purpose');
  const sourceId = searchParams.get('sourceId');

  const [state, setState] = useState<PageState>('confirm');
  const [errorMsg, setErrorMsg] = useState('');

  // purpose가 승격 불가능하거나 없으면 스토어로 이동
  useEffect(() => {
    if (!purpose || !PROMOTABLE_PURPOSES.includes(purpose as PromotablePurpose)) {
      navigate(`/store/${pharmacyId}`, { replace: true });
    }
  }, [purpose, pharmacyId, navigate]);

  if (!purpose || !PROMOTABLE_PURPOSES.includes(purpose as PromotablePurpose)) {
    return null;
  }

  const config = PURPOSE_CONFIG[purpose as PromotablePurpose];
  const Icon = config.icon;

  const handleSubmit = async () => {
    if (!pharmacyId) return;
    setState('submitting');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/glycopharm/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId,
          eventType: 'qr_scan',
          sourceType: 'qr',
          sourceId: sourceId || undefined,
          purpose,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        if (result.data?.promoted) {
          setState('success');
        } else {
          setState('cooldown');
        }
      } else {
        throw new Error(result.error || '요청 처리에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to submit request:', err);
      setErrorMsg(err.message || '네트워크 오류가 발생했습니다.');
      setState('error');
    }
  };

  const handleCancel = () => {
    navigate(`/store/${pharmacyId}`, { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* 확인 단계 */}
        {(state === 'confirm' || state === 'submitting') && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              backgroundColor: purpose === 'consultation' ? '#eff6ff'
                : purpose === 'sample' ? '#faf5ff' : '#f0fdf4',
            }}>
              <Icon size={32} style={{
                color: purpose === 'consultation' ? '#2563eb'
                  : purpose === 'sample' ? '#9333ea' : '#16a34a',
              }} />
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 12px',
            }}>
              {config.title}
            </h1>

            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: '0 0 32px',
              lineHeight: 1.5,
            }}>
              {config.description}
            </p>

            <button
              onClick={handleSubmit}
              disabled={state === 'submitting'}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: purpose === 'consultation' ? '#2563eb'
                  : purpose === 'sample' ? '#9333ea' : '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.05rem',
                fontWeight: 600,
                cursor: state === 'submitting' ? 'wait' : 'pointer',
                opacity: state === 'submitting' ? 0.7 : 1,
              }}
            >
              {state === 'submitting' ? '처리 중...' : `${config.confirmText} →`}
            </button>

            <button
              onClick={handleCancel}
              disabled={state === 'submitting'}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: 'none',
                fontSize: '0.9rem',
                cursor: 'pointer',
                marginTop: '12px',
              }}
            >
              취소
            </button>
          </div>
        )}

        {/* 성공 */}
        {state === 'success' && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle size={32} style={{ color: '#16a34a' }} />
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 12px',
            }}>
              요청이 접수되었습니다
            </h1>

            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: '0 0 32px',
              lineHeight: 1.5,
            }}>
              잠시만 기다려주세요.<br />
              직원이 곧 확인합니다.
            </p>

            <button
              onClick={handleCancel}
              style={{
                padding: '12px 32px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              확인
            </button>
          </div>
        )}

        {/* 쿨타임 (이미 접수됨) */}
        {state === 'cooldown' && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertCircle size={32} style={{ color: '#d97706' }} />
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 12px',
            }}>
              이미 접수된 요청이 있습니다
            </h1>

            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: '0 0 32px',
              lineHeight: 1.5,
            }}>
              잠시 후 다시 시도해주세요.
            </p>

            <button
              onClick={handleCancel}
              style={{
                padding: '12px 32px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              확인
            </button>
          </div>
        )}

        {/* 에러 */}
        {state === 'error' && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertCircle size={32} style={{ color: '#dc2626' }} />
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 12px',
            }}>
              오류가 발생했습니다
            </h1>

            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: '0 0 32px',
              lineHeight: 1.5,
            }}>
              {errorMsg || '네트워크 오류가 발생했습니다.'}
            </p>

            <button
              onClick={() => setState('confirm')}
              style={{
                padding: '12px 32px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
