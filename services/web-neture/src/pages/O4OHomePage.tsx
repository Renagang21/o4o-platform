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
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1:
 *   neture.co.kr 을 O4O 대표 진입으로 삼는다. 로그인 후에는 같은 화면 안에
 *   내 업무 공간(4 카드) / 플랫폼 관리 / 내 서비스 / 가입·이용 상태 / 가입 가능한 서비스 를 보여준다
 *   (components/home/HomeEntryPanel · lib/home-entry). 로그인 전에는 서비스 안내 pill 과
 *   로그인·회원가입만 — 공개 안내 링크는 로그인 없이 그대로 열린다.
 *   다른 서비스로의 이동은 기존 세션 인계(POST /auth/handoff)를 재사용하며 정적 외부 링크로
 *   보내지 않는다. 판정은 서버가 최종이다.
 *
 * WO-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1:
 *   「O4O 서비스 소식」(components/home/HomeServiceNews · lib/home-news) — 로그인 후에는
 *   HomeEntryPanel 의 newsSlot(내 서비스 아래 · 가입·이용 상태 위), 로그인 전에는
 *   서비스 안내 pill 아래. 소식 포럼의 공개 글 최신 5건 + 분류 바로가기 3종. 실패해도 홈은 막히지 않는다.
 *
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1:
 *   [작업 수행] / [전송] 두 버튼과 이미지 전용 첨부를 **＋ · 입력창 · ↑** 하나의 흐름으로 합쳤다. 사용자는 질문인지
 *   작업인지 고르지 않는다 — `POST /api/ai/request` 의 서버 라우터가 판정한다(lib/ai/unified-request). ＋ 는 범용 자료
 *   입력(파일 첨부: 이미지 · PDF · DOCX · TXT/MD · XLSX/XLS/CSV — 같은 파이프라인 / 내 PC 자료 연결: PHASE 3 자리).
 *   첨부는 이번 요청에서만 쓰고 저장하지 않는다. `/home-chat` · `/work-agent/run` 클라이언트는 그대로 두었다(회귀 금지).
 *
 * Neture 전용 chrome(NetureGlobalHeader / Footer / NetureBottomNav)은 쓰지 않는다 —
 * `/` 는 App.tsx 에서 NetureLayout 밖에 배치되어 있고, 기존 Neture 영역
 * (`/community`, `/mypage`, `/market-trial` 등)은 NetureLayout 을 그대로 유지한다.
 */

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle, Loader2, ArrowUp, Plus, Paperclip, HardDrive, FileText, Image as ImageIcon, Table2, X, LogOut, ChevronDown } from 'lucide-react';
import { useAuth, useLoginModal, useWorkScope } from '../contexts';
import { getUserDisplayName } from '@o4o/account-ui';
import { HOME_CHAT_MAX_MESSAGE_LENGTH } from '../lib/ai/home-chat';
import { type WorkAgentResult } from '../lib/ai/work-agent';
import {
  addPendingAttachments,
  sendUnifiedRequest,
  UnifiedRequestError,
  UNIFIED_ATTACHMENT_ACCEPT,
  UNIFIED_ATTACHMENT_EXTENSIONS,
  type PendingAttachment,
  type UnifiedRequestResult,
} from '../lib/ai/unified-request';
import { useHomeEntry } from '../lib/home-entry';
import HomeEntryPanel from '../components/home/HomeEntryPanel';
import HomeServiceNews from '../components/home/HomeServiceNews';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { loadFooterLegal } from '../lib/footerLegal';

// ─── 서비스 안내 (로그인 전) ────────────────────────────────────────────────────
// 신규 도메인·route 를 만들지 않는다.
// 외부 항목은 현재 운영 중인 공개 진입 URL(= packages/shared-space-ui/src/O4OHelpSection.tsx
// cross-service 카탈로그와 동일 값), 내부 항목은 web-neture 의 기존 canonical route.
// 로그인 후에는 이 pill 대신 HomeEntryPanel(접근 가능한 기능 · 세션 인계 이동)을 보여준다.

interface HomeEntry {
  label: string;
  href: string;
  external?: boolean;
}

const ENTRIES: HomeEntry[] = [
  { label: '약국', href: 'https://kpa-society.co.kr/', external: true },
  { label: '약국 경영', href: 'https://pharmacyhub.co.kr', external: true },
  { label: '화장품', href: 'https://www.k-cosmetics.site/', external: true },
  // WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: 공개 Partner 진입 pill 은퇴.
  { label: '공급자', href: '/supplier' },
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
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useLoginModal();
  // WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1 — 로그인 후에만 조회. 실패는 미가입이 아니라 오류로 보여준다.
  const entry = useHomeEntry(isAuthenticated && !!user);
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
   * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 — 단일 요청 상태.
   *   attachments  : ＋ · drag&drop · 붙여넣기로 들어온 범용 첨부(이미지 · 문서 · 표). 이번 요청에서만 쓰고 저장하지 않는다(§7).
   *   workResult   : 서버가 Work 경로로 판정해 수행한 결과(WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 §23 — React state 뿐).
   *   confirm      : 서버가 "작업인지 모호" 로 되물은 상태. [진행] 은 같은 문장을 routeHint 로 다시 보낸다 — 모드 스위치가 아니다.
   *   resumeRunId  : 직전 Work 응답이 QUESTION(resumable)이면 다음 요청을 같은 업무로 잇는 앵커(PHASE 1 same-run).
   *   attachmentsUsed : 서버가 어떤 첨부를 읽었는지(이름 · 종류 · 읽힘 여부만).
   */
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [workResult, setWorkResult] = useState<WorkAgentResult | null>(null);
  const [confirm, setConfirm] = useState<{ text: string; message: string } | null>(null);
  const [resumeRunId, setResumeRunId] = useState<string | null>(null);
  const [attachmentsUsed, setAttachmentsUsed] = useState<{ name: string; kind: string; readable: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  /**
   * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1 §4
   *
   * 대표 홈의 `O4O 로그아웃` 은 대표 인증(실제 토큰) 종료다. 로그아웃 뒤에는 이전 사용자의 AI 응답 ·
   * 첨부 · 진행 중 응답이 화면에 남지 않아야 한다.
   *   - 세대 카운터(`aiGenRef`): 로그아웃 · 사용자 변경 시 증가 → 그 전에 시작된 요청의 응답은 버린다.
   *   - 사용자(id) 가 바뀌거나 사라지면(다른 탭 로그아웃 · bfcache 복원 포함) AI 상태를 전부 초기화한다.
   */
  const aiGenRef = useRef(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const resetAiState = () => {
    aiGenRef.current += 1;
    setInput('');
    setQuestion(null);
    setAnswer(null);
    setError(null);
    setPending(false);
    setOpenedSite(null);
    setLoginReady(false);
    setAttachments([]);
    setAttachError(null);
    setPlusMenuOpen(false);
    setWorkResult(null);
    setConfirm(null);
    setResumeRunId(null);
    setAttachmentsUsed([]);
  };
  const userId = user?.id ?? null;
  const prevUserIdRef = useRef<string | null>(userId);
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      resetAiState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  useEffect(() => {
    if (!accountMenuOpen && !plusMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (accountMenuOpen && accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) setAccountMenuOpen(false);
      if (plusMenuOpen && plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) setPlusMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [accountMenuOpen, plusMenuOpen]);
  const handleLogout = () => {
    setAccountMenuOpen(false);
    resetAiState();
    logout();
  };

  /** 어떤 경로(＋ · 붙여넣기 · drag&drop)로 들어와도 같은 첨부 파이프라인. 안 되는 파일만 사유를 알린다. */
  const takeFiles = (files: readonly (File | Blob)[]) => {
    if (files.length === 0) return;
    const { next, rejected } = addPendingAttachments(attachments, files);
    setAttachments(next);
    setAttachError(rejected.length > 0 ? rejected.join(' ') : null);
  };
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((it) => it.kind === 'file')
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length > 0) {
      e.preventDefault();
      takeFiles(files);
    }
  };
  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (pending) return;
    takeFiles(Array.from(e.dataTransfer?.files ?? []));
  };

  const trimmed = input.trim();
  // 매장 scope 해석 중에는 불완전한 컨텍스트로 보내지 않는다(§12).
  const blocked = pending || isResolvingStore;

  /**
   * 단일 실행. 질문 · 파일 분석 · 웹/PC 작업의 구분은 서버 라우터가 한다(§4·§5).
   *   text      : 보낼 문장(confirm [진행] 은 되물은 문장을 그대로 다시 보낸다)
   *   routeHint : confirm 에 "진행" 으로 답할 때만 'work'
   */
  const submit = async (text: string, routeHint?: 'work') => {
    if (!text || blocked) return;
    // 비로그인은 기존 로그인 모달로 보낸다. 입력은 state 에 남아 있으므로
    // 로그인 후 그대로 다시 보낼 수 있다(§30 — auth/redirect 계약은 건드리지 않는다).
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    setPending(true);
    setError(null);
    setQuestion(text);
    setAnswer(null);
    setWorkResult(null);
    setConfirm(null);
    setAttachmentsUsed([]);
    setPlusMenuOpen(false);
    // 새 요청이 시작되면 이전 로그인 완료 신호는 의미가 없다 — 업무 단위 transient(§42).
    setOpenedSite(null);
    setLoginReady(false);
    const gen = aiGenRef.current;
    const runId = resumeRunId ?? undefined;
    try {
      const result: UnifiedRequestResult = await sendUnifiedRequest({ text, attachments, workScope, runId, routeHint });
      if (gen !== aiGenRef.current) return; // 로그아웃 · 사용자 변경 후 도착한 응답은 버린다
      if (result.kind === 'confirm') {
        // 실행하지 않았다. 입력 · 첨부는 그대로 두고 [진행] 을 기다린다.
        setConfirm({ text, message: result.confirm.message });
        return;
      }
      setInput('');
      setAttachments([]);
      setAttachError(null);
      if (result.kind === 'work') {
        setWorkResult(result.work);
        setResumeRunId(result.work.resumable && result.work.runId ? result.work.runId : null);
        return;
      }
      setAnswer(result.chat.message);
      setOpenedSite(result.chat.browserSiteOpened ?? null);
      setAttachmentsUsed(result.chat.attachments ?? []);
      setResumeRunId(null);
    } catch (err) {
      if (gen !== aiGenRef.current) return;
      setAnswer(null);
      setError(err instanceof UnifiedRequestError || err instanceof Error ? err.message : '응답을 생성하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      if (gen === aiGenRef.current) setPending(false);
    }
  };
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(trimmed);
  };

  const hasThread = question !== null || answer !== null || error !== null || workResult !== null || confirm !== null;
  const ATTACH_ICON = { image: ImageIcon, document: FileText, spreadsheet: Table2 } as const;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 최소 계정 영역만. 상단 navigation·서비스 메뉴바 없음.
          WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1 §4:
          로그인 전 = 로그인 · 회원가입(기존 모달) / 로그인 후 = 이름 · 계정 메뉴(내 정보 · O4O 로그아웃).
          모바일도 같은 메뉴(작은 계정 메뉴). */}
      <div className="flex justify-end px-4 py-4 text-sm sm:px-6">
        {isAuthenticated && user ? (
          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              data-testid="home-account-menu-button"
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
              title="계정 메뉴"
            >
              <UserCircle className="h-5 w-5" />
              <span className="hidden sm:inline">{getUserDisplayName(user)}</span>
              <ChevronDown className="h-4 w-4" />
            </button>
            {accountMenuOpen && (
              <div
                role="menu"
                data-testid="home-account-menu"
                className="absolute right-0 mt-2 w-52 rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="m-0 text-sm font-medium text-slate-900 truncate">{getUserDisplayName(user)}</p>
                  <p className="m-0 text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <Link
                  to="/mypage"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 no-underline hover:bg-slate-50"
                >
                  <UserCircle className="h-4 w-4" />
                  내 정보
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  data-testid="home-o4o-logout"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  O4O 로그아웃
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openLoginModal()}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
            >
              <UserCircle className="h-5 w-5" />
              <span>로그인</span>
            </button>
            <button
              type="button"
              onClick={() => openRegisterModal()}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-50"
            >
              회원가입
            </button>
          </div>
        )}
      </div>

      {/* 중앙 집중 — 워드마크 / 안내 / 입력 / 진입 배너 */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
        <h1 className="m-0 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">O4O</h1>

        <p className="mt-6 mb-0 text-base text-slate-500">무엇을 도와드릴까요?</p>

        {/*
          AI 입력 — WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §3·§8·§9.
          [＋] 자료 입력 · 입력창 · [↑] 하나. 요청 유형을 고르는 버튼 · 모드 스위치는 없다. 단일 행 입력이라 Enter 가 곧 submit.
          PC · 모바일 같은 구조 — 공간만 tailwind 반응형으로 줄어든다.
        */}
        <form
          onSubmit={handleSubmit}
          onDragOver={(e) => {
            e.preventDefault();
            if (!pending) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="mt-5 w-full max-w-xl"
          data-testid="home-composer"
        >
          <div className={`relative rounded-full transition-shadow ${dragOver ? 'ring-2 ring-slate-400' : ''}`}>
            {/* ＋ 범용 자료 입력 진입점 — 파일 첨부 · 내 PC 자료 연결 */}
            <div ref={plusMenuRef} className="absolute left-2 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => setPlusMenuOpen((v) => !v)}
                disabled={pending}
                aria-label="자료 추가"
                aria-haspopup="menu"
                aria-expanded={plusMenuOpen}
                title="파일 첨부 · 내 PC 자료 연결"
                data-testid="home-composer-plus"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <Plus className="h-5 w-5" />
              </button>
              {plusMenuOpen && (
                <div role="menu" data-testid="home-composer-plus-menu" className="absolute left-0 top-11 z-40 w-64 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <span>
                      <span className="block text-sm text-slate-900">파일 첨부</span>
                      <span className="block text-xs text-slate-500">이미지 · PDF · DOCX · TXT/MD · XLSX/XLS/CSV — 이번 요청에서만 사용</span>
                    </span>
                  </button>
                  {/* PHASE 3 Local Data Source 진입 자리(§3). 반복 사용 자료 연결은 별도 계약 — 여기서는 구분만 보여준다. */}
                  <button
                    type="button"
                    role="menuitem"
                    aria-disabled="true"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      setAttachError('내 PC 자료 연결(반복 사용 자료)은 준비 중입니다. 지금은 [파일 첨부]로 이번 요청에 사용할 수 있습니다.');
                    }}
                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      <span className="block text-sm text-slate-500">내 PC 자료 연결</span>
                      <span className="block text-xs text-slate-400">원내 약품 목록 · 재고 · 가격표처럼 반복해서 쓰는 자료 — 준비 중</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={HOME_CHAT_MAX_MESSAGE_LENGTH}
              disabled={pending}
              onPaste={handlePaste}
              aria-label="무엇을 도와드릴까요?"
              placeholder="무엇을 도와드릴까요?"
              data-testid="home-composer-input"
              className="w-full rounded-full border border-slate-200 bg-white py-4 pl-14 pr-14 text-base text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
            />
            {/* 사용자가 고른 파일만 처리한다. 형식은 탐색기에서 고른다 — 종류별 메뉴를 두지 않는다(§3). */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={UNIFIED_ATTACHMENT_ACCEPT}
              className="hidden"
              data-testid="home-composer-file"
              onChange={(e) => {
                takeFiles(Array.from(e.target.files ?? []));
                e.target.value = '';
              }}
            />
            <button
              type="submit"
              disabled={!trimmed || blocked}
              aria-label="요청 실행"
              title="요청 실행"
              data-testid="home-composer-submit"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900 text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:bg-slate-200"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
        </form>

        {/* 첨부 chip — 종류별 아이콘 하나로 같은 목록. 제거만 가능. */}
        {attachments.length > 0 && (
          <ul className="mt-2 flex w-full max-w-xl flex-wrap gap-1.5" data-testid="home-composer-attachments">
            {attachments.map((a) => {
              const Icon = ATTACH_ICON[a.kind];
              return (
                <li key={a.id} className="flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1 text-xs text-slate-700">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  <span className="truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((cur) => cur.filter((x) => x.id !== a.id))}
                    disabled={pending}
                    aria-label={`${a.name} 제거`}
                    className="rounded-full p-0.5 text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
            <li className="self-center text-xs text-slate-400">이번 요청에서만 사용 · 저장되지 않음</li>
          </ul>
        )}
        {attachError && (
          <p className="mt-2 w-full max-w-xl rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status" data-testid="home-composer-attach-error">
            {attachError}
            <span className="sr-only"> 지원 형식: {UNIFIED_ATTACHMENT_EXTENSIONS.join(', ')}</span>
          </p>
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
              <p className="m-0 flex items-center gap-2 text-sm text-slate-400" data-testid="home-composer-pending">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                처리 중... (화면에서 작업이 필요하면 열려 있는 화면을 그대로 두세요)
              </p>
            )}
            {/* 서버가 "작업인지 모호" 로 되물은 경우 — 실행하지 않았다. [진행] 은 같은 문장을 다시 보낸다(§5-2). */}
            {confirm && !pending && (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-700" data-testid="home-composer-confirm">
                <p className="m-0">{confirm.message}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void submit(confirm.text, 'work')}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white transition-opacity hover:opacity-80"
                  >
                    진행
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition-colors hover:border-slate-500"
                  >
                    아니요, 질문을 고칠게요
                  </button>
                </div>
              </div>
            )}
            {/* WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 §19·§20 — 결과와 인계 안내. 실제 화면은 Chrome/프로그램에 그대로 있다. */}
            {workResult && !pending && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-[0.95rem] leading-relaxed text-slate-800" data-testid="home-composer-work-result">
                <p className="m-0 whitespace-pre-wrap">{workResult.message}</p>
                <p className="m-0 mt-2 text-xs text-slate-500">
                  {workResult.goal.displayName} · 행동 {workResult.stepCount}단계 · AI 판단 {workResult.aiPlanCount}회
                  {workResult.takeover ? ` · 인계 사유 ${workResult.takeover.reason}` : ''}
                  {workResult.path ? ` · 현재 경로 ${workResult.path}` : ''}
                </p>
                {workResult.progress === 'needs_user' && !workResult.resumable && (
                  <p className="m-0 mt-2 text-sm text-slate-700">
                    {workResult.target?.targetType === 'windows_app'
                      ? '프로그램의 현재 화면에서 직접 이어서 진행하세요.'
                      : 'Chrome 의 현재 화면에서 직접 이어서 진행하세요.'}{' '}
                    필요하면 다음 문장으로 다시 요청할 수 있습니다.
                  </p>
                )}
                {workResult.resumable && (
                  <p className="m-0 mt-2 text-sm text-slate-700">답을 입력하면 같은 작업을 이어서 진행합니다.</p>
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
                {attachmentsUsed.length > 0 && (
                  <p className="m-0 mt-3 text-xs text-slate-500">
                    참고한 첨부:{' '}
                    {attachmentsUsed.map((a) => `${a.name}${a.readable ? '' : '(읽지 못함)'}`).join(' · ')}
                  </p>
                )}
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

        {/* 로그인 후 개인화 영역 — WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1 */}
        {isAuthenticated && user && (
          <HomeEntryPanel
            user={user}
            data={entry.data}
            loading={entry.loading}
            error={entry.error}
            onReload={entry.reload}
            newsSlot={<HomeServiceNews />}
          />
        )}

        {/* 로그인 전(또는 세션 복구 중 · 개인화 조회 실패 시 공개 안내 대체) — 서비스 안내 · 로그인 · 회원가입 */}
        {(!isAuthenticated || entry.error) && (
          <>
            {!isAuthenticated && !authLoading && (
              <div className="mt-8 flex flex-col items-center gap-3 text-center">
                <p className="m-0 max-w-md text-sm text-slate-500">
                  O4O 는 약국 · 화장품 매장 · 공급자 · 서비스 운영자가 한 곳에서 일하는 서비스입니다. 로그인하면 이용 중인
                  서비스와 업무 화면을 바로 열 수 있습니다.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openLoginModal()}
                    className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white transition-opacity hover:opacity-80"
                  >
                    로그인
                  </button>
                  <button
                    type="button"
                    onClick={() => openRegisterModal()}
                    className="rounded-full border border-slate-300 px-5 py-2 text-sm text-slate-700 transition-colors hover:border-slate-500"
                  >
                    회원가입
                  </button>
                </div>
              </div>
            )}
            <nav aria-label="서비스 안내" className="mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-2">
              {ENTRIES.map((e) => (
                <EntryPill key={e.href} entry={e} />
              ))}
            </nav>
            {/* 로그인 전 공개 소식 — 공개 서비스 안내 아래. 로그인 후와 같은 컴포넌트 (WO-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1) */}
            <HomeServiceNews className="mt-8 w-full max-w-2xl text-left" />
          </>
        )}
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
        {/* WO-O4O-HOME-LEGAL-FOOTER-ADOPTION-V1: 대표 홈도 NetureLayout 과 같은 축으로
            법정정보 노출 — 하드코딩 없이 public footer-legal API 값만(미설정 시 비표시). */}
        <div className="mx-auto mt-3 max-w-3xl text-slate-400">
          <PublicLegalFooterInfo serviceKey="neture" loadProfile={loadFooterLegal} />
        </div>
      </footer>
    </div>
  );
}
