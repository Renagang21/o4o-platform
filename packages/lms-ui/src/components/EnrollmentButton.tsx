import type { CSSProperties } from 'react';
import type { EnrollmentState } from '../types';
import { DEFAULT_ACCENT } from '../types';

export interface EnrollmentButtonProps {
  state: EnrollmentState;
  /** 미수강(state='none') 상태에서 신청 핸들러. 실제 enroll API 는 서비스 wrapper 담당. */
  onEnroll?: () => void;
  /** 신청 진행 중(로딩) 표시. */
  enrolling?: boolean;
  /** 라벨 override. */
  labels?: Partial<Record<EnrollmentState | 'enroll' | 'enrolling', string>>;
  accent?: string;
  style?: CSSProperties;
}

const baseButton: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  border: 'none',
  borderRadius: '10px',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  color: '#fff',
};

const noteStyle: CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  textAlign: 'center',
  marginTop: '8px',
};

/**
 * 수강 상태별 버튼 shell. 표현만 담당하고, 실제 enroll/진행 이동은 호출자가 주입한다.
 * - none: 활성 "시작하기"(onEnroll)
 * - pending/rejected/archived: 비활성 안내 버튼
 * - in_progress/approved/completed 등 진행형: 표현은 서비스 화면에 맡기고 여기선 신청 버튼만 다룸
 */
export function EnrollmentButton({
  state,
  onEnroll,
  enrolling = false,
  labels,
  accent = DEFAULT_ACCENT,
  style,
}: EnrollmentButtonProps) {
  if (state === 'none') {
    return (
      <button
        type="button"
        onClick={onEnroll}
        disabled={enrolling}
        style={{ ...baseButton, background: accent, opacity: enrolling ? 0.6 : 1, ...style }}
      >
        {enrolling ? labels?.enrolling ?? '시작 중...' : labels?.enroll ?? '시작하기'}
      </button>
    );
  }

  if (state === 'pending') {
    return (
      <div>
        <button type="button" disabled style={{ ...baseButton, background: '#94a3b8', cursor: 'not-allowed' }}>
          {labels?.pending ?? '승인 대기 중'}
        </button>
        <p style={noteStyle}>강사 승인 후 수강이 가능합니다.</p>
      </div>
    );
  }

  if (state === 'rejected') {
    return (
      <div>
        <button type="button" disabled style={{ ...baseButton, background: '#ef4444', cursor: 'not-allowed' }}>
          {labels?.rejected ?? '수강 거절됨'}
        </button>
        <p style={noteStyle}>강사에게 문의하세요.</p>
      </div>
    );
  }

  if (state === 'archived' || state === 'cancelled' || state === 'expired') {
    return (
      <button type="button" disabled style={{ ...baseButton, background: '#cbd5e1', cursor: 'not-allowed' }}>
        {labels?.[state] ?? '신청 불가'}
      </button>
    );
  }

  // approved / in_progress / completed → 진행형 UI 는 서비스 화면(계속 보기/수료증)이 담당. 신청 버튼 미노출.
  return null;
}
