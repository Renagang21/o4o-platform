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
 * 이 화면은 AI / Local Work Agent 작업 시작 화면의 기준이다.
 *   AI 입력 → Work Scope → (후속) Local Work Agent
 *
 * WO-O4O-COMMON-HOME-AI-INPUT-V0:
 *   중앙 입력창을 실제 AI 질의응답 진입점으로 활성화했다.
 *   **텍스트 응답 전용** — tool 실행 · Local Agent · 브라우저 조작은 하지 않는다.
 *   대화는 저장하지 않는다(새로고침하면 사라진다). 화면은 검색 초기화면형을 유지하며
 *   답변이 있을 때만 입력창 아래에 영역이 나타난다(대기 상태 레이아웃 불변).
 *
 * Neture 전용 chrome(NetureGlobalHeader / Footer / NetureBottomNav)은 쓰지 않는다 —
 * `/` 는 App.tsx 에서 NetureLayout 밖에 배치되어 있고, 기존 Neture 영역
 * (`/community`, `/mypage`, `/market-trial` 등)은 NetureLayout 을 그대로 유지한다.
 */

import { useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle, Loader2, ArrowUp, ImagePlus, Play, X } from 'lucide-react';
import { useAuth, useLoginModal, useWorkScope } from '../contexts';
import { getUserDisplayName } from '@o4o/account-ui';
import { sendHomeChat, HomeChatError, HOME_CHAT_MAX_MESSAGE_LENGTH } from '../lib/ai/home-chat';
import { isSupportedWorkImage, readWorkImage, runWorkAgent, WorkAgentError, type WorkAgentResult } from '../lib/ai/work-agent';

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
  // Phase 3 연결점 — 현재 업무 컨텍스트를 그대로 AI 요청에 싣는다.
  // 서버가 membership·매장을 다시 확정하므로 여기 값은 권한 근거가 아니다.
  const { workScope, isResolvingStore } = useWorkScope();

  const [input, setInput] = useState('');
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /**
   * WO-O4O-BROWSER-CONTROL-V0 §5·§19·§41·§42
   *
   * 사이트가 열렸을 때만 [로그인 완료] 버튼을 띄운다. 로그인은 사용자가 사이트에서 직접 하고,
   * 버튼은 **사용자의 명시적 완료 신호**다. O4O 는 로그인 여부를 판정하지 않는다.
   *
   * 이 상태는 **React state 뿐**이다 — localStorage · sessionStorage · 서버 어디에도 저장하지
   * 않는다(§42). 새로고침하면 사라지는 것이 맞다. credential 상태가 아니라 "이번 요청에서
   * 사용자가 완료를 눌렀다" 는 transient 신호다.
   */
  const [openedSite, setOpenedSite] = useState<{ siteId: string; displayName: string } | null>(null);
  const [loginReady, setLoginReady] = useState(false);
  /**
   * WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 §48 — 최소 진입점. 같은 입력창의 문장을 **목적**으로 보내는 [작업 수행]
   * 버튼과, 사용자가 붙여넣거나 고른 이미지 한 장(§6·§11). 이미지 · 결과는 React state 뿐이다 — 저장하지 않는다(§23).
   */
  const [workImage, setWorkImage] = useState<File | Blob | null>(null);
  const [workResult, setWorkResult] = useState<WorkAgentResult | null>(null);
  const [workPending, setWorkPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const takeImage = (file: File | Blob | null | undefined) => {
    if (!file || !isSupportedWorkImage(file)) return false;
    setWorkImage(file);
    return true;
  };
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.kind === 'file' && it.type.startsWith('image/'));
    if (item && takeImage(item.getAsFile())) e.preventDefault();
  };
  const handleWork = async () => {
    if (!trimmed || blocked || workPending) return;
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    setWorkPending(true);
    setError(null);
    setQuestion(trimmed);
    setAnswer(null);
    setWorkResult(null);
    setOpenedSite(null);
    try {
      const image = workImage ? await readWorkImage(workImage) : undefined;
      const result = await runWorkAgent(trimmed, image);
      setWorkResult(result);
      setInput('');
      setWorkImage(null);
    } catch (err) {
      setError(err instanceof WorkAgentError ? err.message : '작업을 수행하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setWorkPending(false);
    }
  };

  const trimmed = input.trim();
  // 매장 scope 해석 중에는 불완전한 컨텍스트로 보내지 않는다(§12).
  const blocked = pending || isResolvingStore;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed || blocked) return;

    // 비로그인은 기존 로그인 모달로 보낸다. 입력은 state 에 남아 있으므로
    // 로그인 후 그대로 다시 보낼 수 있다(§30 — auth/redirect 계약은 건드리지 않는다).
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    setPending(true);
    setError(null);
    setQuestion(trimmed);
    setAnswer(null);
    // 새 요청이 시작되면 이전 로그인 완료 신호는 의미가 없다 — 업무 단위 transient(§42).
    setOpenedSite(null);
    setLoginReady(false);
    try {
      const result = await sendHomeChat(trimmed, workScope);
      setAnswer(result.message);
      setOpenedSite(result.browserSiteOpened ?? null);
      setInput('');
    } catch (err) {
      setAnswer(null);
      setError(
        err instanceof HomeChatError
          ? err.message
          : '응답을 생성하지 못했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setPending(false);
    }
  };

  const hasThread = question !== null || answer !== null || error !== null || workResult !== null;

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

        {/* AI 입력 (WO-O4O-COMMON-HOME-AI-INPUT-V0). 단일 행 입력이라 Enter 전송이 곧 submit 이다. */}
        <form onSubmit={handleSubmit} className="mt-5 w-full max-w-xl">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={HOME_CHAT_MAX_MESSAGE_LENGTH}
              disabled={pending || workPending}
              onPaste={handlePaste}
              aria-label="무엇을 도와드릴까요?"
              placeholder="무엇이든 물어보세요 — 사진을 붙여넣고 [작업 수행]도 가능"
              className="w-full rounded-full border border-slate-200 bg-white py-4 pl-6 pr-36 text-base text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
            />
            {/* 사용자가 고른 이미지만 처리한다(§6). */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                takeImage(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending || workPending}
              aria-label="이미지 첨부"
              title="이미지 첨부(작업 수행에 함께 보냅니다)"
              className="absolute right-[5.75rem] top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-700 disabled:cursor-not-allowed"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleWork}
              disabled={!trimmed || blocked || workPending}
              aria-label="작업 수행"
              title="이 문장을 목적으로 등록된 사이트에서 작업을 수행합니다"
              className="absolute right-12 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              {workPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="submit"
              disabled={!trimmed || blocked}
              aria-label="전송"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>

        {workImage && (
          <div className="mt-2 flex w-full max-w-xl items-center gap-2 text-xs text-slate-500">
            <span>이미지 1장 첨부됨 — [작업 수행] 시 함께 보냅니다(저장되지 않음).</span>
            <button type="button" onClick={() => setWorkImage(null)} aria-label="이미지 제거" className="rounded-full p-0.5 text-slate-400 hover:text-slate-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/*
          답변 영역 — 있을 때만 렌더한다. 항상 존재하는 빈 컨테이너를 두면
          justify-center 때문에 대기 상태에서 워드마크가 밀린다.
          Markdown 렌더러는 web-neture 에 없으므로(의존성 추가 금지) 줄 단위 문단으로 표시한다.
        */}
        {hasThread && (
          <div className="mt-6 w-full max-w-xl text-left">
            {question && (
              <p className="m-0 mb-3 text-sm font-medium text-slate-500">{question}</p>
            )}
            {pending && (
              <p className="m-0 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                응답 생성 중...
              </p>
            )}
            {workPending && (
              <p className="m-0 flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                등록된 사이트 화면을 보며 작업 중... (Chrome 탭을 그대로 두세요)
              </p>
            )}
            {/* WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 §19·§20 — 결과와 인계 안내. 실제 화면은 Chrome 에 그대로 있다. */}
            {workResult && !workPending && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-[0.95rem] leading-relaxed text-slate-800">
                <p className="m-0 whitespace-pre-wrap">{workResult.message}</p>
                <p className="m-0 mt-2 text-xs text-slate-500">
                  {workResult.goal.displayName} · 행동 {workResult.stepCount}단계 · AI 판단 {workResult.aiPlanCount}회
                  {workResult.takeover ? ` · 인계 사유 ${workResult.takeover.reason}` : ''}
                  {workResult.path ? ` · 현재 경로 ${workResult.path}` : ''}
                </p>
                {workResult.progress === 'needs_user' && (
                  <p className="m-0 mt-2 text-sm text-slate-700">Chrome 의 현재 화면에서 직접 이어서 진행하세요. 필요하면 다음 문장으로 다시 요청할 수 있습니다.</p>
                )}
              </div>
            )}
            {error && !pending && (
              <p className="m-0 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}
            {answer && !pending && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-[0.95rem] leading-relaxed text-slate-800">
                {answer.split('\n').map((line, i) => (
                  <p key={i} className="m-0 whitespace-pre-wrap">
                    {line || <br />}
                  </p>
                ))}
              </div>
            )}
            {/* WO-O4O-BROWSER-CONTROL-V0 §19 — 사이트가 열렸을 때만. 로그인은 사용자가 직접 한다. */}
            {openedSite && !pending && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700">
                {loginReady ? (
                  <p className="m-0">로그인 완료를 확인했습니다.</p>
                ) : (
                  <>
                    <p className="m-0">{openedSite.displayName} 사이트를 열었습니다.</p>
                    <p className="m-0 mt-1 text-slate-500">
                      로그인이 필요한 경우 사이트에서 직접 로그인해 주세요. 이미 로그인되어 있으면 바로 눌러 주세요.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLoginReady(true)}
                      className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm text-white transition-opacity hover:opacity-80"
                    >
                      로그인 완료
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

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
