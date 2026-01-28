/**
 * JoinRequestButton - 가입/권한 요청 버튼 컴포넌트
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 *
 * 권한 부족 시 "가입 요청" 또는 "권한 요청" UI를 표시
 */

import { useState } from 'react';
import { joinRequestApi } from '../../api/joinRequestApi';
import type { JoinRequestType, RequestedRole } from '../../types/joinRequest';

interface JoinRequestButtonProps {
  organizationId: string;
  requestType: JoinRequestType;
  requestedRole?: RequestedRole;
  requestedSubRole?: string;
  onSuccess?: () => void;
}

export function JoinRequestButton({
  organizationId,
  requestType,
  requestedRole = 'member',
  requestedSubRole,
  onSuccess,
}: JoinRequestButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<'success' | 'error' | 'duplicate' | null>(null);

  const buttonLabel = requestType === 'join' ? '가입 요청' : '권한 요청';
  const description =
    requestType === 'join'
      ? '이 조직에 가입을 요청합니다.'
      : requestType === 'promotion'
      ? '이 기능은 추가 권한이 필요합니다.'
      : '운영자 권한을 요청합니다.';

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      await joinRequestApi.create({
        organizationId,
        requestType,
        requestedRole,
        requestedSubRole,
        payload: message ? { note: message } : undefined,
      });
      setResult('success');
      setShowForm(false);
      onSuccess?.();
    } catch (error: any) {
      if (error.message?.includes('409') || error.message?.includes('DUPLICATE')) {
        setResult('duplicate');
      } else {
        setResult('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result === 'success') {
    return (
      <div style={{
        padding: '16px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, color: '#166534', fontWeight: 600 }}>
          요청이 접수되었습니다
        </p>
        <p style={{ margin: '8px 0 0', color: '#15803d', fontSize: '14px' }}>
          운영자 승인 후 이용하실 수 있습니다.
        </p>
      </div>
    );
  }

  if (result === 'duplicate') {
    return (
      <div style={{
        padding: '16px',
        background: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '8px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, color: '#92400e', fontWeight: 600 }}>
          이미 처리 대기 중인 요청이 있습니다
        </p>
        <p style={{ margin: '8px 0 0', color: '#a16207', fontSize: '14px' }}>
          운영자가 검토 중입니다. 잠시 기다려 주세요.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <p style={{ margin: '0 0 12px', color: '#475569', fontSize: '15px' }}>
        {description}
      </p>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '10px 24px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {buttonLabel}
        </button>
      ) : (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="요청 사유 (선택)"
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                background: isSubmitting ? '#93c5fd' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? '요청 중...' : '요청 보내기'}
            </button>
            <button
              onClick={() => { setShowForm(false); setMessage(''); }}
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
          {result === 'error' && (
            <p style={{ margin: '8px 0 0', color: '#dc2626', fontSize: '13px' }}>
              요청 중 오류가 발생했습니다. 다시 시도해 주세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
