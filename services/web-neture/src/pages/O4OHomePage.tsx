/**
 * O4OHomePage — O4O 전체 서비스 대표 진입점 (`/`)
 *
 * WO-O4O-COMMON-HOME-PHASE1-V1
 *
 * 화면 원칙 (검색엔진 초기 화면형 — 포털형 홈이 아니다):
 *   상단 대형 navigation 없음 (계정 영역만 최소)
 *   중앙  O4O 워드마크 → 안내 문구 → 중앙 입력 영역
 *   하단  작은 서비스 진입 배너(pill)
 *
 * 이 화면은 향후 AI / Local Work Agent 작업 시작 화면의 기준이다.
 *   AI 입력 → Work Scope → Local Work Agent
 * 중앙 입력창은 그 자리를 미리 잡아둔 **비활성 placeholder** 다.
 * Phase 1 에서 AI API 호출 · Work Scope · Agent 는 구현하지 않는다.
 *
 * Neture 전용 chrome(NetureGlobalHeader / Footer / NetureBottomNav)은 쓰지 않는다 —
 * `/` 는 App.tsx 에서 NetureLayout 밖에 배치되어 있고, 기존 Neture 영역
 * (`/community`, `/mypage`, `/market-trial` 등)은 NetureLayout 을 그대로 유지한다.
 */

import { Link } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { useAuth, useLoginModal } from '../contexts';
import { getUserDisplayName } from '@o4o/account-ui';

// ─── 서비스 진입 ──────────────────────────────────────────────────────────────
// 신규 도메인·route 를 만들지 않는다.
// 외부 항목은 현재 운영 중인 진입 URL(= packages/shared-space-ui/src/O4OHelpSection.tsx
// cross-service 카탈로그와 동일 값), 내부 항목은 web-neture 의 기존 canonical route.

interface HomeEntry {
  label: string;
  href: string;
  external?: boolean;
}

const ENTRIES: HomeEntry[] = [
  { label: '약국', href: 'https://kpa-society.co.kr/', external: true },
  { label: '약국 경영', href: 'https://pharmacyhub.co.kr', external: true },
  { label: '화장품', href: 'https://www.k-cosmetics.site/', external: true },
  { label: '혈당 관리', href: 'https://www.glycopharm.co.kr', external: true },
  // '공급자·파트너' 는 진입 route 가 둘이므로 각각 노출한다(데드링크 0 / 기능 은폐 0).
  { label: '공급자', href: '/supplier' },
  { label: '파트너', href: '/partner' },
  { label: '커뮤니티', href: '/community' },
];

const PILL_CLASS =
  'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 no-underline ' +
  'transition-colors hover:border-slate-400 hover:text-slate-900';

function EntryPill({ entry }: { entry: HomeEntry }) {
  if (entry.external) {
    return (
      <a href={entry.href} target="_blank" rel="noopener noreferrer" className={PILL_CLASS}>
        {entry.label}
      </a>
    );
  }
  return (
    <Link to={entry.href} className={PILL_CLASS}>
      {entry.label}
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function O4OHomePage() {
  const { user, isAuthenticated } = useAuth();
  const { openLoginModal } = useLoginModal();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 최소 계정 영역만. 상단 navigation·서비스 메뉴바 없음. */}
      <div className="flex justify-end px-4 py-4 text-sm sm:px-6">
        {isAuthenticated && user ? (
          <Link
            to="/mypage"
            className="flex items-center gap-1.5 text-slate-600 no-underline hover:text-slate-900"
            title="내 정보"
          >
            <UserCircle className="h-5 w-5" />
            <span className="hidden sm:inline">{getUserDisplayName(user)}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openLoginModal()}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <UserCircle className="h-5 w-5" />
            <span>로그인</span>
          </button>
        )}
      </div>

      {/* 중앙 집중 — 워드마크 / 안내 / 입력 / 진입 배너 */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
        <h1 className="m-0 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">O4O</h1>

        <p className="mt-6 mb-0 text-base text-slate-500">무엇을 도와드릴까요?</p>

        {/* Phase 1: 비활성 placeholder. 후속 Phase 3 에서 실제 AI 입력으로 대체된다. */}
        <div className="mt-5 w-full max-w-xl">
          <input
            type="text"
            disabled
            aria-label="작업 입력 (준비 중)"
            placeholder="준비 중입니다"
            className="w-full cursor-not-allowed rounded-full border border-slate-200 bg-slate-50 px-6 py-4 text-base text-slate-400 shadow-sm outline-none placeholder:text-slate-400"
          />
        </div>

        <nav className="mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {ENTRIES.map((entry) => (
            <EntryPill key={entry.href} entry={entry} />
          ))}
        </nav>
      </main>

      {/* 법정 고지 링크만. 홍보·뉴스·통계 섹션 없음. */}
      <footer className="px-4 pb-6 text-center text-xs text-slate-400 sm:px-6">
        <Link to="/terms" className="no-underline hover:text-slate-600">
          이용약관
        </Link>
        <span className="mx-2">·</span>
        <Link to="/privacy" className="no-underline hover:text-slate-600">
          개인정보처리방침
        </Link>
        <span className="mx-2">·</span>
        <Link to="/contact" className="no-underline hover:text-slate-600">
          Contact
        </Link>
      </footer>
    </div>
  );
}
