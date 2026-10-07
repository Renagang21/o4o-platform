/**
 * ServiceEntryPage — 다른 서비스로 로그인 상태를 이어 들어가는 출발점 (`/service-entry/:serviceKey?returnPath=`)
 * WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1
 *
 * 자체 로그인 화면이 없는 서비스(O4O 강의)는 이 주소로 보낸다:
 *   로그인 안 됨 → 로그인 모달(성공하면 같은 주소로 복귀) → 기존 handoff 발급(`resolveServiceEntryUrl`) → 대상 서비스 /handoff.
 * 새 API 없음 — `/auth/handoff` 계약 그대로(대상 서비스 가입 · returnPath 검증은 서버).
 *
 * WO-O4O-LECTURE-HANDOFF-NONMEMBER-UX-V1:
 *   handoff 가 대상 서비스 membership 으로 거절되면(`HANDOFF_TARGET_*`) 일반 오류가 아니라 "로그인은 됐고 서비스 이용 자격이
 *   필요하다" 화면을 보인다 — 공개 화면(원래 보던 공개 경로 또는 목록)으로 가는 길과 이용 문의 경로를 준다.
 *   membership 을 만들거나 가입 정책을 바꾸지 않는다(handoff 는 가입 surface 가 아니다 — IDENTITY §7.4 · §7.5).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth, useLoginModal } from '../../contexts';
import { resolveServiceEntryUrl, ServiceEntryError } from '../../lib/home-entry';

interface ServiceEntryTarget {
  label: string;
  /** 대상 서비스 origin (끝 `/` 없음) */
  origin: string;
  /** 로그인 · 가입 없이 볼 수 있는 경로 — 미가입이어도 원래 경로가 여기 속하면 그대로 돌려보낸다 */
  publicPaths: readonly string[];
  /** 위와 같되 하위 경로 포함 (`/courses` 는 `/courses/…` 까지, `/` 로 끝나면 그 접두사) */
  publicPathPrefixes: readonly string[];
  /** 미가입 사용자에게 보여 줄 공개 목록 경로 */
  browsePath: string;
}

/** 이 출발점으로 들어갈 수 있는 서비스. 로그인 화면을 가진 서비스는 각자 로그인한다. */
const SERVICE_ENTRY_TARGETS: Readonly<Record<string, ServiceEntryTarget>> = Object.freeze({
  lecture: {
    label: 'O4O 강의',
    origin: 'https://study.neture.co.kr',
    // web-lecture App.tsx 의 공개 route 와 같다 (/my · /instructor · /operator 는 membership 필요)
    publicPaths: ['/', '/terms', '/privacy'],
    publicPathPrefixes: ['/courses', '/certificates/verify/', '/certificate/verify/'],
    browsePath: '/courses',
  },
});

/** handoff 가 대상 서비스 membership 때문에 거절된 경우 — 인증 실패가 아니다 */
const MEMBERSHIP_DENIAL_TEXT: Readonly<Record<string, (label: string) => string>> = Object.freeze({
  HANDOFF_TARGET_NO_MEMBERSHIP: (label) =>
    `이 계정은 아직 ${label} 서비스 회원이 아닙니다. 다른 O4O 서비스 회원 자격은 ${label}로 이어지지 않습니다.`,
  HANDOFF_TARGET_NOT_ACTIVE: (label) => `${label} 서비스 이용이 아직 승인되지 않았거나 정지된 상태입니다.`,
  HANDOFF_TARGET_WITHDRAWN: (label) => `${label} 서비스에서 탈퇴한 계정입니다.`,
});

function safeReturnPath(raw: string | null): string | undefined {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : undefined;
}

function isPublicPath(target: ServiceEntryTarget, path: string | undefined): path is string {
  if (!path) return false;
  const pathname = path.split(/[?#]/)[0];
  if (target.publicPaths.includes(pathname)) return true;
  return target.publicPathPrefixes.some((p) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)));
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
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
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
      .catch((e: Error) => setError({ message: e.message, code: e instanceof ServiceEntryError ? e.code : undefined }));
  }, [target, isLoading, isAuthenticated, openLoginModal, here, serviceKey, returnPath]);

  const box = 'mx-auto max-w-md px-6 py-20 text-center';
  if (!target) {
    return <main className={box}><p className="text-gray-700">알 수 없는 서비스 주소입니다.</p></main>;
  }
  const denial = error?.code ? MEMBERSHIP_DENIAL_TEXT[error.code] : undefined;
  if (error && denial) {
    const backToPublic = isPublicPath(target, returnPath);
    const browseHref = `${target.origin}${backToPublic ? returnPath : target.browsePath}`;
    return (
      <main className={box} data-testid="service-entry-not-member" data-code={error.code}>
        <h1 className="text-lg font-bold text-gray-900">{target.label} 이용 자격이 필요합니다</h1>
        <p className="mt-3 text-sm text-gray-600">O4O 계정 로그인은 정상적으로 완료되었습니다.</p>
        <p className="mt-1 text-sm text-gray-600" role="alert">{denial(target.label)}</p>
        <p className="mt-3 text-sm text-gray-500">
          공개 강의는 회원이 아니어도 볼 수 있습니다. {target.label} 이용 신청은 문의하기로 남겨 주시면 확인 후 안내해 드립니다.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
            href={browseHref}
            data-testid="service-entry-browse"
          >
            {backToPublic ? '보던 화면으로 돌아가기' : '공개 강의 둘러보기'}
          </a>
          <Link className="text-sm font-medium text-green-700 underline" to="/contact" data-testid="service-entry-inquiry">
            {target.label} 이용 문의하기
          </Link>
          <Link className="text-sm text-gray-500 underline" to="/">Neture 홈으로</Link>
        </div>
      </main>
    );
  }
  if (error) {
    return (
      <main className={box} data-testid="service-entry-error">
        <h1 className="text-lg font-bold text-gray-900">{target.label}로 이동하지 못했습니다</h1>
        <p className="mt-3 text-sm text-gray-600" role="alert">{error.message}</p>
        <a className="mt-6 inline-block text-sm font-medium text-green-700 underline" href={`${target.origin}/`}>{target.label} 둘러보기</a>
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
