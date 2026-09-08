/**
 * O4OHomePage — O4O 전체 서비스 대표 진입점 (`/`)
 *
 * WO-O4O-COMMON-HOME-PHASE1-V1
 *
 * 이 페이지는 Neture 커뮤니티 홈(CommunityPage, `/community`)을 대체하는 것이 아니라
 * `/` 를 O4O 전체(약국 · 화장품 · 공급자 · 파트너 · 커뮤니티)의 공통 진입점으로 올린 것이다.
 *
 * 범위 (Phase 1):
 *   - 서비스/업무 진입 카드 + 최소 shell (자체 헤더/푸터)
 *   - NetureLayout(NetureGlobalHeader/Footer/BottomNav)을 씌우지 않는다 — Neture 전용 chrome 이므로
 *     `/community`, `/mypage`, `/market-trial` 등 기존 Neture 영역은 그대로 NetureLayout 을 유지한다.
 *
 * 범위 밖 (후속 Phase):
 *   AI 입력창 · Work Scope 본체 · Local Work Agent · Computer Use · Local SQLite · Device 등록.
 *   향후 중앙 AI 입력 영역이 들어갈 자리를 고려해 hero 아래를 단순한 세로 흐름으로 둔다.
 */

import { Link } from 'react-router-dom';
import { useAuth, useLoginModal } from '../contexts';
import { getUserDisplayName } from '@o4o/account-ui';
import { NetureUserMenuItems, useNetureUserRoles } from '../components/NetureUserMenu';

// ─── 서비스 진입 카드 ─────────────────────────────────────────────────────────
// 외부 서비스 URL 은 신규 도메인을 만들지 않고 현재 운영 중인 진입 URL 을 그대로 사용한다
// (packages/shared-space-ui/src/O4OHelpSection.tsx 의 cross-service 카탈로그와 동일 값).
// 내부 항목은 web-neture 의 기존 canonical route 를 그대로 사용한다.

interface HomeEntry {
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

const SERVICE_ENTRIES: HomeEntry[] = [
  {
    title: '약국 — KPA Society',
    description: '약사회 회원을 위한 커뮤니티 · 학술 · 매장 운영 서비스',
    href: 'https://kpa-society.co.kr/',
    external: true,
  },
  {
    title: '약국 경영 — PharmacyHub',
    description: '약국 경영자를 위한 매장 운영 · 공급 · 콘텐츠 허브',
    href: 'https://pharmacyhub.co.kr',
    external: true,
  },
  {
    title: '화장품 — K-Cosmetics',
    description: '매장에서 취급할 수 있는 화장품 제품과 판매 확장 지원',
    href: 'https://www.k-cosmetics.site/',
    external: true,
  },
  {
    title: '혈당 관리 — GlycoPharm',
    description: '약국 고객의 혈당 관리와 상담을 지원하는 서비스',
    href: 'https://www.glycopharm.co.kr',
    external: true,
  },
];

const WORK_ENTRIES: HomeEntry[] = [
  {
    title: '공급자',
    description: '제품 · 오퍼 등록과 매장 공급을 담당하는 공급자 진입점',
    href: '/supplier',
  },
  {
    title: '파트너',
    description: '매장과 협업하는 파트너 프로그램 안내와 진입점',
    href: '/partner',
  },
  {
    title: '커뮤니티',
    description: '공지 · 포럼 · 자료 — Neture 커뮤니티 홈',
    href: '/community',
  },
  {
    title: '이용 안내',
    description: 'O4O 구조와 기능별 이용 방법 안내',
    href: '/guide',
  },
];

// ─── Card ────────────────────────────────────────────────────────────────────

function EntryCard({ entry }: { entry: HomeEntry }) {
  const body = (
    <>
      <h3 className="text-base font-bold text-slate-900 m-0">{entry.title}</h3>
      <p className="mt-1.5 mb-0 text-sm text-slate-500 leading-relaxed">{entry.description}</p>
    </>
  );

  const className =
    'block rounded-xl border border-slate-200 bg-white p-5 no-underline transition-colors hover:border-slate-400 hover:shadow-sm';

  if (entry.external) {
    return (
      <a href={entry.href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link to={entry.href} className={className}>
      {body}
    </Link>
  );
}

function EntrySection({ title, entries }: { title: string; entries: HomeEntry[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-slate-800 m-0">{title}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map((entry) => (
          <EntryCard key={entry.href} entry={entry} />
        ))}
      </div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function O4OHomePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useLoginModal();
  const roles = useNetureUserRoles(user, isAuthenticated);
  const hasWorkspace = roles.isAdmin || roles.isOperator || roles.isSupplier || roles.isPartner;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 최소 O4O Home shell — Neture 전용 chrome(NetureGlobalHeader) 을 쓰지 않는다 */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-lg font-bold tracking-tight text-slate-900 no-underline">
            O4O
          </Link>
          <div className="flex items-center gap-2 text-sm">
            {isAuthenticated && user ? (
              <>
                <Link to="/mypage" className="px-3 py-1.5 font-medium text-slate-700 no-underline hover:text-slate-900">
                  {getUserDisplayName(user)}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openLoginModal()}
                  className="rounded-lg px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={openRegisterModal}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
                >
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <section className="pt-12 sm:pt-16">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            O4O — 전문 매장 업무 플랫폼
          </h1>
          <p className="mt-3 mb-0 max-w-2xl text-base text-slate-600">
            약국, 화장품 매장, 공급자와 파트너를 위한 O4O 서비스 통합 진입점입니다.
            이용하실 서비스나 업무를 선택하세요.
          </p>
        </section>

        {/* 로그인 사용자는 자동 이동 없이 이 화면에 머문다 (WO §7).
            보유 역할이 있으면 업무 공간 진입만 추가로 노출한다. */}
        {isAuthenticated && hasWorkspace && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="m-0 text-sm font-bold text-slate-500">내 업무 공간</h2>
            <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-4">
              <NetureUserMenuItems user={user} isAuthenticated={isAuthenticated} />
            </div>
          </section>
        )}

        <EntrySection title="서비스" entries={SERVICE_ENTRIES} />
        <EntrySection title="업무" entries={WORK_ENTRIES} />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <span>&copy; 2026 O4O</span>
          <div className="flex items-center gap-4">
            <Link to="/contact" className="no-underline hover:text-slate-600">
              Contact Us
            </Link>
            <Link to="/terms" className="no-underline hover:text-slate-600">
              이용약관
            </Link>
            <Link to="/privacy" className="no-underline hover:text-slate-600">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
