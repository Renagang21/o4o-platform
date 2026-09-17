/**
 * ServiceUsageGate — 공급자 업무 공간 진입 게이트 (파트너 축은 Legacy Partner 은퇴)
 *
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 *
 * O4O 로그인(신원) 과 서비스 이용 상태는 별개다. 업무 공간(/supplier/*) 은
 * **그 서비스 이용 상태가 active 일 때만** 연다. 그 외 상태는 상태별 안내 화면을 보여 주고
 * 대표 홈(로그인 유지) 으로 돌아가는 길만 준다 — 여기서 로그아웃하지 않는다.
 *
 *   none      → 서비스 신청 안내 (랜딩)
 *   pending   → 신청 중 (승인 대기)
 *   rejected  → 반려 + 다시 신청
 *   suspended → 이용 정지
 *   withdrawn → 탈퇴 + 다시 신청
 *   조회 실패 → 미가입으로 취급하지 않고 재시도만
 *
 * 관리자 예외 없음 — 서버 guard(requireLinkedSupplier) 도 role 이 아니라 서비스 행의
 * 상태만 본다. 서비스 행이 없는 관리자를 통과시키면 업무 화면의 API 가 NO_SUPPLIER 를 낸다
 * (과거 401 → auth-client refresh 실패 → 토큰 삭제 → **대표 로그아웃** 연쇄가 운영 검증에서 확인됐고,
 * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1 에서 403 으로 정정). 운영 목적의
 * 조회 · 승인은 /operator/* 콘솔에서 한다. 최종 판정은 서버 guard 가 한다.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NETURE_SERVICE_INFO, SERVICE_STATUS_LABELS } from '../../lib/home-entry';
import { useNetureServiceStates } from '../../lib/neture-service-state';

type ServiceKey = 'supplier';

const STATUS_MESSAGES: Record<ServiceKey, Record<string, { title: string; body: string; action: 'apply' | 'reapply' | null }>> = {
  supplier: {
    none: { title: '공급자 서비스 신청이 필요합니다', body: 'O4O 계정으로 로그인되어 있지만 공급자 서비스는 아직 신청하지 않았습니다. 신청 후 승인되면 공급자 업무를 이용할 수 있습니다.', action: 'apply' },
    pending: { title: '공급자 서비스 신청 중', body: '신청이 접수되어 승인을 기다리고 있습니다. 승인되면 공급자 업무를 이용할 수 있습니다.', action: null },
    rejected: { title: '공급자 서비스 신청이 반려되었습니다', body: '신청 내용을 확인한 뒤 다시 신청할 수 있습니다. 다른 서비스 이용에는 영향이 없습니다.', action: 'reapply' },
    suspended: { title: '공급자 서비스 이용이 정지되었습니다', body: '공급자 업무 공간을 이용할 수 없습니다. 자세한 내용은 운영자에게 문의해 주세요.', action: null },
    withdrawn: { title: '공급자 서비스를 탈퇴했습니다', body: '공급자 서비스만 종료된 상태입니다. O4O 계정과 다른 서비스는 그대로 이용할 수 있습니다.', action: 'reapply' },
  },
};

export function ServiceUsageGate({ service, children }: { service: ServiceKey; children: ReactNode }) {
  const { user } = useAuth();
  const { states, loading, error, reload } = useNetureServiceStates(Boolean(user));

  if (loading || (!states && !error)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">서비스 이용 상태를 확인하는 중...</p>
      </div>
    );
  }

  if (error || !states) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8" data-testid="service-gate-error">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">이용 상태를 확인하지 못했습니다</h1>
        <p className="text-gray-600 mb-6">{error ?? '잠시 후 다시 시도해 주세요.'}</p>
        <div className="flex gap-4">
          <button type="button" onClick={reload} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
            다시 시도
          </button>
          <Link to="/" className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            O4O 홈으로
          </Link>
        </div>
      </div>
    );
  }

  const status = states[service].status;
  if (status === 'active') return <>{children}</>;

  const info = NETURE_SERVICE_INFO[service];
  const msg = STATUS_MESSAGES[service][status] ?? STATUS_MESSAGES[service].none;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8" data-testid={`service-gate-${service}-${status}`}>
      <p className="text-xs font-medium text-gray-500 mb-2">
        {info.name} · {SERVICE_STATUS_LABELS[status]}
      </p>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{msg.title}</h1>
      <p className="text-gray-600 mb-6 max-w-md">{msg.body}</p>
      <div className="flex gap-4">
        {msg.action && (
          <Link to={info.landing} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
            {msg.action === 'apply' ? `${info.name} 신청` : '다시 신청하기'}
          </Link>
        )}
        {status === 'pending' && (
          <Link to={info.landing} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
            신청 상태 보기
          </Link>
        )}
        <Link to="/" className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
          O4O 홈으로
        </Link>
      </div>
    </div>
  );
}
