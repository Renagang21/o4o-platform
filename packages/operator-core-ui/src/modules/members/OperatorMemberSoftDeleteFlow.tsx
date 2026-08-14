/**
 * OperatorMemberSoftDeleteFlow — operator 회원 탈퇴(soft delete) 확인 플로우 공통 컴포넌트
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1
 *
 * K-Cosmetics(`KcosDeleteFlow`) 와 Neture(`NetureDeleteFlow`) 가 동일한 업무
 * (`DELETE /operator/members/:id?mode=soft` + 성공/실패 toast + 목록 갱신)를
 * 각자 구현하고 있었다. Neture 는 확인 모달까지 직접 마크업했다.
 * → 단일 컴포넌트로 수렴하고 확인 UI 는 공통 `ConfirmActionDialog` 로 통일한다.
 *
 * admin 측 `OperatorMemberDeleteFlow`(soft+hard, 위험도 조회 포함)와는 다른 흐름이다.
 * 이쪽은 operator 목록의 단순 탈퇴 확인 경로다.
 *
 * 표시 문구는 서비스마다 다르므로(‘탈퇴 처리’ / ‘비활성화’) props 로 주입한다.
 * endpoint · payload · 권한은 호출부(execute)가 그대로 소유한다 — 계약 변경 없음.
 */

import { useState } from 'react';
import { ConfirmActionDialog } from '@o4o/ui';
import { toast } from '@o4o/error-handling';
import type { UserData } from './types';

export interface OperatorMemberSoftDeleteFlowProps {
  user: UserData;
  onClose: () => void;
  onDeleted: () => void;
  /** 실제 삭제 호출 (서비스 client 소유). 실패 시 throw 하면 errorMessage 로 toast. */
  execute: (userId: string) => Promise<void>;
  /** 확인 모달 제목 (예: '탈퇴 처리 확인' / '회원 비활성화 확인') */
  title: string;
  /** 확인 버튼 라벨 (예: '탈퇴 처리' / '비활성화') */
  confirmText: string;
  /**
   * 본문 문구 빌더. 대상 표시명과 user 를 받아 문자열을 만든다.
   * (서비스별 안내 문구가 달라 문자열 자체를 주입한다.)
   */
  buildMessage: (displayName: string, user: UserData) => string;
  /** 성공 toast 문구 */
  successMessage: string;
  /** 실패 toast 기본 문구 (에러 메시지가 없을 때) */
  errorMessage: string;
}

/**
 * 표시명 도출 — name → `${lastName}${firstName}` → 이메일 local-part 순.
 * (KCos/Neture 두 구현이 순서만 달랐고 결과는 같은 규칙이다. 여기서 하나로 고정한다.)
 */
function resolveDisplayName(user: UserData): string {
  const full = `${user.lastName || ''}${user.firstName || ''}`.trim();
  if (user.name && user.name !== user.email) return user.name;
  if (full) return full;
  return user.email?.split('@')[0] || '사용자';
}

export function OperatorMemberSoftDeleteFlow({
  user,
  onClose,
  onDeleted,
  execute,
  title,
  confirmText,
  buildMessage,
  successMessage,
  errorMessage,
}: OperatorMemberSoftDeleteFlowProps) {
  const [loading, setLoading] = useState(false);
  const displayName = resolveDisplayName(user);

  const handle = async () => {
    setLoading(true);
    try {
      await execute(user.id);
      toast.success(successMessage);
      onDeleted();
    } catch (err: any) {
      toast.error(err?.message || errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmActionDialog
      open
      onClose={onClose}
      onConfirm={handle}
      title={title}
      message={buildMessage(displayName, user)}
      confirmText={confirmText}
      variant="warning"
      loading={loading}
    />
  );
}
