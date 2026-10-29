import { MyHomeButton } from '@o4o/auth-react';
import { authClient } from '../../../lib/apiClient';
import { useAuth } from '../../../contexts/AuthContext';
import type { Mode } from './ConsultationParts';

export function consultationAccessError(code?: string): string | null {
  switch (code) {
    case 'PHARMACIST_CONFIRMATION_REQUIRED': return '개인의 승인된 약사 자격과 현재 약국의 약사 업무 허용을 모두 확인해 주세요. 경영자의 확인만으로 개인 자격 승인을 대신할 수 없습니다.';
    case 'SERVICE_FEATURE_REQUIRED': return '현재 약국의 제공 기능과 My Home의 근무자별 기능 허용을 확인해 주세요.';
    case 'STORE_ACCESS_REQUIRED':
    case 'PHARMACY_ACCESS_REQUIRED': return '현재 선택한 약국의 소속·승인·업무 접근 권한을 확인해 주세요.';
    case 'NETURE_MEMBERSHIP_REQUIRED': return 'My Home에서 현재 계정의 회원 이용 상태를 확인해 주세요.';
    case 'PROFESSIONAL_ACCESS_UNAVAILABLE':
    case 'FEATURE_ACCESS_UNAVAILABLE': return '상담 자격 조회에 실패했습니다. 자격 미승인으로 판정한 것이 아닙니다. 잠시 후 이용 상태를 다시 확인해 주세요.';
    default: return null;
  }
}

export function ConsultationMyHomeLink() {
  const { user, isLoading } = useAuth();
  return <MyHomeButton api={authClient.api} isAuthenticated={!!user} authLoading={isLoading} accountId={user?.id} className="min-h-11 rounded border bg-white px-3 py-2" />;
}

/** The existing context combines qualifications and store permission; never guess which one failed. */
export function ConsultationAccessNotice({ mode, onReload }: Readonly<{ mode?: Mode; onReload: () => void }>) {
  return <section aria-label="상담 이용 조건 안내" className="space-y-3 rounded border bg-amber-50 p-4">
    <h2 className="font-semibold">상담 이용 조건을 확인해 주세요</h2>
    {mode?.entitled && mode.professional ? <p>제공 기능은 확인됐습니다. 개인의 승인된 약사 자격과 현재 약국의 약사 업무 허용을 모두 확인해 주세요. 둘 중 하나라도 확인되지 않으면 약사 상담을 이용할 수 없습니다.</p>
      : <p>현재 약국의 기본·유료·협업체 제공 기능과 My Home에서 경영자가 허용한 근무자별 기능을 확인해 주세요.</p>}
    <ul className="list-disc space-y-2 pl-5">
      {mode?.professional && <li>개인 약사 자격은 중앙 담당자의 면허 근거 검토·승인이 필요합니다. 약국 경영자의 확인이나 유료 기능 가입이 이를 대신하지 않습니다.</li>}
      <li>약국의 소속·승인과 해당 약국의 업무 허용은 별도입니다. 직원은 경영자에게 기능 허용을 요청하고, 경영자는 My Home에서 현재 약국의 근무자 설정을 확인합니다.</li>
    </ul>
    <p>My Home에서 계정·약사 자격·근무자 설정을 확인한 뒤 이 화면으로 돌아와 이용 상태를 다시 확인해 주세요. 재확인하면 현재 입력·번역 초안이 초기화됩니다.</p>
    <div className="flex flex-wrap gap-3">
      <ConsultationMyHomeLink />
      <button type="button" className="min-h-11 rounded border bg-white px-3 py-2" onClick={onReload}>이용 상태 다시 확인</button>
      <a className="inline-flex min-h-11 items-center underline" href="/store/workspace/use">내 매장으로</a>
    </div>
  </section>;
}
