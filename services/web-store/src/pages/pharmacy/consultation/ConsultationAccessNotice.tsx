import { MyHomeButton } from '@o4o/auth-react';
import { authClient } from '../../../lib/apiClient';
import { useAuth } from '../../../contexts/AuthContext';
import type { Mode } from './ConsultationParts';

export function consultationAccessError(code?: string): string | null {
  switch (code) {
    case 'PHARMACIST_QUALIFICATION_REQUIRED': return '개인의 약사 자격 신청·승인 상태를 My Home에서 확인해 주시기 바랍니다. 매장 소속이나 로그인 성공만으로 약사 자격이 승인되지는 않습니다.';
    case 'STORE_OWNER_AGREEMENT_REQUIRED': return 'My Home에서 매장 경영자 이용계약 동의 상태를 확인해 주시기 바랍니다.';
    case 'AMBIGUOUS_STORE_CONNECTION': return '이용할 매장을 선택한 뒤 다시 확인해 주시기 바랍니다.';
    case 'PHARMACIST_CONFIRMATION_REQUIRED': return '약사 상담 이용 상태를 확인하지 못했습니다. 이용 상태를 다시 확인해 주시기 바랍니다.';
    case 'SERVICE_FEATURE_REQUIRED': return '이 매장의 이용 기능에 이 상담이 포함되어 있지 않습니다. 매장 경영자에게 확인해 주시기 바랍니다.';
    case 'STORE_ACCESS_REQUIRED':
    case 'PHARMACY_ACCESS_REQUIRED': return '현재 선택한 약국의 소속·승인·업무 접근 권한을 확인해 주시기 바랍니다.';
    case 'NETURE_MEMBERSHIP_REQUIRED': return 'My Home에서 현재 계정의 회원 이용 상태를 확인해 주시기 바랍니다.';
    case 'PROFESSIONAL_ACCESS_UNAVAILABLE':
    case 'FEATURE_ACCESS_UNAVAILABLE': return '상담 자격 조회에 실패했습니다. 자격 미승인으로 판정한 것이 아닙니다. 잠시 후 이용 상태를 다시 확인해 주시기 바랍니다.';
    default: return null;
  }
}

export function ConsultationMyHomeLink() {
  const { user, isLoading } = useAuth();
  return <MyHomeButton api={authClient.api} isAuthenticated={!!user} authLoading={isLoading} accountId={user?.id} className="min-h-11 rounded border bg-white px-3 py-2" />;
}

/**
 * 상담 화면을 쓸 수 없을 때의 안내. 상담은 매장 단위로 판단한다(2026-11-13 사용자 결정 — 약국 경영자는 약사이고,
 * 어느 태블릿을 누가 쓸지는 경영자가 매장에서 정한다). 그래서 이 안내는 매장의 이용 기능이 없을 때만 나온다.
 */
export function ConsultationAccessNotice({ mode, onReload }: Readonly<{ mode?: Mode; onReload: () => void }>) {
  const name = mode?.professional ? '약사 상담' : '이 상담';
  return <section aria-label="상담 이용 조건 안내" className="space-y-3 rounded border bg-amber-50 p-4">
    <h2 className="font-semibold">이 매장에서 {name}을 아직 쓸 수 없습니다</h2>
    <p>이 매장의 이용 기능에 {name}이 포함되어 있지 않습니다. 매장 경영자가 My Home에서 매장의 이용 기능(기본 · 유료 · 협업)을 확인해 주시기 바랍니다.</p>
    <p className="text-sm text-slate-600">기능이 열리면 매장 직원 초대나 계정별 허용 없이, 경영자가 정한 상담 태블릿에서 바로 쓸 수 있습니다.</p>
    <p>확인한 뒤 「이용 상태 다시 확인」을 누르시기 바랍니다. 입력 중이던 내용과 번역은 지워집니다.</p>
    <div className="flex flex-wrap gap-3">
      <ConsultationMyHomeLink />
      <button type="button" className="min-h-11 rounded border bg-white px-3 py-2" onClick={onReload}>이용 상태 다시 확인</button>
      <a className="inline-flex min-h-11 items-center underline" href="/store/workspace/use">내 매장으로</a>
    </div>
  </section>;
}
