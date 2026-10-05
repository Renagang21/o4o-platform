/**
 * WO-O4O-NETURE-PHARMACY-SIGNUP-APPROVAL-UX-AND-AUTH-CONTRACT-V1 — 운영자 가입 처리 화면 계약
 *
 * docs/baseline/O4O-NETURE-PHARMACY-SIGNUP-APPROVAL-CONTRACT-V1.md §3-1 · §6-1
 * - 상태별 처리 가능 행동 = 원장 전이(서버 nextMembershipStatus)와 같다
 * - rejected · terminated 는 운영자 처리 없음(약국 재신청 대기)
 * - 반려 · 정지 · 종료는 사유 필수, 승인 · 재개는 사유를 받지 않는다
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-neture/vitest.config.mjs`
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MEMBERSHIP_ACTIONS_BY_STATUS, REASON_REQUIRED_ACTIONS } from '../neturePharmacy';
import { askReason } from '../../../components/neture-pharmacy/PharmacyCommerceUi';

const actionsOf = (status: string) => (MEMBERSHIP_ACTIONS_BY_STATUS[status] ?? []).map((a) => a.action);

describe('가입 처리 행동 — 원장 전이와 같다', () => {
  it('pending: 승인 · 반려', () => expect(actionsOf('pending')).toEqual(['approve', 'reject']));
  it('active: 정지 · 종료', () => expect(actionsOf('active')).toEqual(['suspend', 'terminate']));
  it('suspended: 재개 · 종료', () => expect(actionsOf('suspended')).toEqual(['reactivate', 'terminate']));
  it('rejected · terminated: 운영자 처리 없음', () => {
    expect(actionsOf('rejected')).toEqual([]);
    expect(actionsOf('terminated')).toEqual([]);
  });
});

describe('사유 필수 행동', () => {
  it('반려 · 정지 · 종료만 사유 필수', () => {
    expect([...REASON_REQUIRED_ACTIONS].sort()).toEqual(['reject', 'suspend', 'terminate']);
    expect(REASON_REQUIRED_ACTIONS.has('approve')).toBe(false);
    expect(REASON_REQUIRED_ACTIONS.has('reactivate')).toBe(false);
  });
});

describe('askReason', () => {
  afterEach(() => vi.restoreAllMocks());

  it('필수인데 비어 있으면 처리하지 않는다(null)', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('   ');
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    expect(askReason('반려', true)).toBeNull();
    expect(alert).toHaveBeenCalledOnce();
  });

  it('필수 사유는 앞뒤 공백을 지워 돌려준다', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('  서류 불일치 ');
    expect(askReason('반려', true)).toBe('서류 불일치');
  });

  it('선택 사유는 비어 있어도 처리한다(빈 문자열)', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('');
    expect(askReason('취소')).toBe('');
  });

  it('취소하면 null', () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    expect(askReason('반려', true)).toBeNull();
  });
});
