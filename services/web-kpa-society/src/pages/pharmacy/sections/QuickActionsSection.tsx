/**
 * QuickActionsSection - 약국 운영자 빠른 실행
 *
 * WO-PHARMACY-OPERATOR-ACTIONS-V1
 *
 * 약국경영 대시보드에서 운영자가 실행 가능한 액션:
 * - 서비스 신청 (JoinRequest pharmacy_join)
 * - 운영자 권한 관리 (JoinRequest pharmacy_operator)
 */

import { useState } from 'react';
import { useOrganization } from '../../../contexts';
import { joinRequestApi } from '../../../api/joinRequestApi';

type ActionState = 'idle' | 'confirm' | 'submitting' | 'success' | 'error' | 'duplicate';

export function QuickActionsSection() {
  const { currentOrganization } = useOrganization();

  const [serviceApplyState, setServiceApplyState] = useState<ActionState>('idle');
  const [operatorState, setOperatorState] = useState<ActionState>('idle');

  async function handleJoinRequest(
    type: 'pharmacy_join' | 'pharmacy_operator',
    role: string,
    setState: (s: ActionState) => void,
  ) {
    setState('submitting');
    try {
      await joinRequestApi.create({
        organizationId: currentOrganization.id,
        requestType: type,
        requestedRole: role,
      });
      setState('success');
    } catch (err: any) {
      const code = err?.response?.data?.code || err?.code || '';
      if (code === 'DUPLICATE_REQUEST') {
        setState('duplicate');
      } else {
        setState('error');
      }
    }
  }

  function renderActionButton(
    id: string,
    icon: string,
    label: string,
    description: string,
    state: ActionState,
    onAction: () => void,
    onConfirm: () => void,
    onReset: () => void,
  ) {
    // Success / Duplicate / Error states
    if (state === 'success') {
      return (
        <div key={id} style={cardStyle('#f0fdf4', '#bbf7d0')}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>&#9989;</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>요청 완료</div>
            <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>
              관리자 승인 후 반영됩니다
            </div>
          </div>
          <button onClick={onReset} style={smallBtnStyle('#166534')}>확인</button>
        </div>
      );
    }

    if (state === 'duplicate') {
      return (
        <div key={id} style={cardStyle('#fffbeb', '#fde68a')}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>&#9888;&#65039;</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>이미 요청됨</div>
            <div style={{ fontSize: '12px', color: '#a16207', marginTop: '2px' }}>
              동일한 요청이 대기 중입니다
            </div>
          </div>
          <button onClick={onReset} style={smallBtnStyle('#92400e')}>확인</button>
        </div>
      );
    }

    if (state === 'error') {
      return (
        <div key={id} style={cardStyle('#fef2f2', '#fecaca')}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>&#10060;</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>요청 실패</div>
            <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
              잠시 후 다시 시도해 주세요
            </div>
          </div>
          <button onClick={onReset} style={smallBtnStyle('#991b1b')}>닫기</button>
        </div>
      );
    }

    // Confirm state
    if (state === 'confirm') {
      return (
        <div key={id} style={cardStyle('#eff6ff', '#bfdbfe')}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e40af' }}>
              {label} 요청을 보내시겠습니까?
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
              {currentOrganization.name} 대상
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={onConfirm}
              disabled={state !== 'confirm'}
              style={{
                ...smallBtnStyle('#ffffff'),
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
              }}
            >
              확인
            </button>
            <button onClick={onReset} style={smallBtnStyle('#64748b')}>취소</button>
          </div>
        </div>
      );
    }

    if (state === 'submitting') {
      return (
        <div key={id} style={cardStyle('#f8fafc', '#e2e8f0')}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>요청 중...</div>
          </div>
        </div>
      );
    }

    // Idle state — clickable button
    return (
      <button
        key={id}
        onClick={onAction}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s',
          width: '100%',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
        }}
      >
        <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{label}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{description}</div>
        </div>
      </button>
    );
  }

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{
        margin: '0 0 16px',
        fontSize: '18px',
        fontWeight: 600,
        color: '#0f172a',
      }}>
        빠른 실행
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '12px',
      }}>
        {/* 서비스 신청 — JoinRequest pharmacy_join */}
        {renderActionButton(
          'service-apply',
          '📝',
          '서비스 신청',
          '약국 경영 지원 서비스를 신청합니다',
          serviceApplyState,
          () => setServiceApplyState('confirm'),
          () => handleJoinRequest('pharmacy_join', 'member', setServiceApplyState),
          () => setServiceApplyState('idle'),
        )}

        {/* 운영자 권한 관리 — JoinRequest pharmacy_operator */}
        {renderActionButton(
          'operator-manage',
          '👤',
          '운영자 권한 요청',
          '약국 운영자 권한을 요청합니다',
          operatorState,
          () => setOperatorState('confirm'),
          () => handleJoinRequest('pharmacy_operator', 'admin', setOperatorState),
          () => setOperatorState('idle'),
        )}
      </div>
    </section>
  );
}

function cardStyle(bg: string, border: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: '10px',
    width: '100%',
  };
}

function smallBtnStyle(color: string): React.CSSProperties {
  return {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 500,
    color,
    background: 'transparent',
    border: `1px solid ${color}`,
    borderRadius: '6px',
    cursor: 'pointer',
    flexShrink: 0,
  };
}
