/**
 * ServiceEntryPage — 다른 서비스로 로그인 상태를 이어 들어가는 출발점 (`/service-entry/:serviceKey?returnPath=`)
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1
 *
 * 자체 로그인 화면이 없는 서비스(O4O 강의)는 이 주소로 보낸다:
 *   로그인 안 됨 → 로그인 모달(성공하면 같은 주소로 복귀) → 기존 handoff 발급(`resolveServiceEntryUrl`) → 대상 서비스 /handoff.
 * 새 API 없음 — `/auth/handoff` 계약 그대로(대상 서비스 가입 · returnPath 검증은 서버).
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth, useLoginModal } from '../../contexts';
import { resolveServiceEntryUrl } from '../../lib/home-entry';

/** 이 출발점으로 들어갈 수 있는 서비스. 로그인 화면을 가진 서비스는 각자 로그인한다. */
const SERVICE_ENTRY_TARGETS: Readonly<Record<string, { label: string; publicUrl: string }>> = Object.freeze({
  lecture: { label: 'O4O 강의', publicUrl: 'https://study.neture.co.kr/' },
});

function safeReturnPath(raw: string | null): string | undefined {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : undefined;
}

export default function ServiceEntryPage() {
  const { serviceKey = '' } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const target = SERVICE_ENTRY_TARGETS[serviceKey];
  const returnPath = safeReturnPath(searchParams.get('returnPath'));
  const here = `${location.pathname}${location.search}`;
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!target || isLoading) return;
    if (!isAuthenticated) {
      openLoginModal(here);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    resolveServiceEntryUrl(serviceKey, returnPath)
      .then((url) => window.location.assign(url))
      .catch((e: Error) => setError(e.message));
  }, [target, isLoading, isAuthenticated, openLoginModal, here, serviceKey, returnPath]);

  const box = 'mx-auto max-w-md px-6 py-20 text-center';
  if (!target) {
    return <main className={box}><p className="text-gray-700">알 수 없는 서비스 주소입니다.</p></main>;
  }
  if (error) {
    return (
      <main className={box} data-testid="service-entry-error">
        <h1 className="text-lg font-bold text-gray-900">{target.label}로 이동하지 못했습니다</h1>
        <p className="mt-3 text-sm text-gray-600" role="alert">{error}</p>
        <a className="mt-6 inline-block text-sm font-medium text-green-700 underline" href={target.publicUrl}>{target.label} 둘러보기</a>
      </main>
    );
  }
  if (!isLoading && !isAuthenticated) {
    return (
      <main className={box} data-testid="service-entry-login">
        <h1 className="text-lg font-bold text-gray-900">{target.label} 로그인</h1>
        <p className="mt-3 text-sm text-gray-600">O4O 계정으로 로그인하면 {target.label}로 이어서 이동합니다.</p>
        <button type="button" onClick={() => openLoginModal(here)} className="mt-6 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700">
          로그인
        </button>
      </main>
    );
  }
  return <main className={box}><p className="text-sm text-gray-500">{target.label}로 이동하고 있습니다…</p></main>;
}
