/**
 * O4O representative home. Canonical policy: O4O-HOME-SERVICE-DISCOVERY-V1.
 * AI → personal workspace → public service discovery → news.
 * The existing AI request, attachment, session and membership checks remain the execution boundary.
 * Public discovery is independent of authentication and service membership.
 */

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { UserCircle, Loader2, ArrowUp, Plus, Paperclip, HardDrive, FileText, Image as ImageIcon, Table2, X, LogOut, ChevronDown } from 'lucide-react';
import { useAuth, useLoginModal, useWorkScope } from '../contexts';
import { getUserDisplayName } from '@o4o/account-ui';
import { HOME_CHAT_MAX_MESSAGE_LENGTH } from '../lib/ai/home-chat';
import { nextResumeAnchor, type ResumeAnchor, type WorkAgentResult } from '../lib/ai/work-agent';
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
import { NetureMembershipNotice } from '../components/home/NetureMembershipNotice';
import HomeEntryPanel from '../components/home/HomeEntryPanel';
import HomeServiceNews from '../components/home/HomeServiceNews';
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { loadFooterLegal } from '../lib/footerLegal';
import ServiceDiscovery from '../components/home/ServiceDiscovery';

// FIRST_USE_GUIDANCE — WO-O4O-COMMON-AUTOMATION-CORE-USER-COLLABORATION-AND-QUESTION-FLOW-V1 §2·§11.
// 첫 사용 안내를 봤는지 한 칸만 기억한다. colon-namespaced·버전 포함. 백엔드 테이블·새 설정 없음.
const AUTOMATION_INTRO_SEEN_KEY = 'neture:automation:intro-seen:v1';

// ─── Page ────────────────────────────────────────────────────────────────────

export default function O4OHomePage() {
  const { user, isAuthenticated, isLoading: authLoading, logout, pendingPolicyAcceptances } = useAuth();
  const { openLoginModal } = useLoginModal();
  // WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1 — 로그인 후에만 조회. 실패는 미가입이 아니라 오류로 보여준다.
  const hasPendingTerms = (pendingPolicyAcceptances?.length ?? 0) > 0;
  const canUseHomeWorkspace = isAuthenticated && !!user && !hasPendingTerms;
  const entry = useHomeEntry(canUseHomeWorkspace);
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
   *   resumeAnchor : 직전 Work 응답이 QUESTION(resumable)이면 다음 요청을 같은 업무로 잇는 앵커(runId + 원래 대상, PHASE 1 same-run).
   *   attachmentsUsed : 서버가 어떤 첨부를 읽었는지(이름 · 종류 · 읽힘 여부만).
   */
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [workResult, setWorkResult] = useState<WorkAgentResult | null>(null);
  const [confirm, setConfirm] = useState<{ text: string; message: string } | null>(null);
  const [resumeAnchor, setResumeAnchor] = useState<ResumeAnchor | null>(null);
  const [attachmentsUsed, setAttachmentsUsed] = useState<{ name: string; kind: string; readable: boolean }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // FIRST_USE_GUIDANCE — §2·§11. 첫 사용 시 한 번 가볍게 안내한다(튜토리얼·마법사 아님).
  // 사이트/PC/파일 유형을 미리 고르게 하지 않는다 — 사용자는 목표만 적는다. 상태는 localStorage 한 칸.
  const [introSeen, setIntroSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTOMATION_INTRO_SEEN_KEY) === '1';
    } catch {
      return true; // 저장소 접근 불가(사생활 모드 등)면 안내를 강요하지 않는다.
    }
  });
  const dismissIntro = () => {
    setIntroSeen(true);
    try {
      localStorage.setItem(AUTOMATION_INTRO_SEEN_KEY, '1');
    } catch {
      /* best-effort — 저장 실패해도 이 세션 동안은 숨긴다. */
    }
  };

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
    setResumeAnchor(null);
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
    const anchor = resumeAnchor;
    const runId = anchor?.runId;
    const resumeTargetId = anchor?.targetId ?? undefined;
    try {
      const result: UnifiedRequestResult = await sendUnifiedRequest({ text, attachments, workScope, runId, resumeTargetId, routeHint });
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
        // 재개 실패 한 번으로 대기 중인 run 을 버리지 않는다 — 종료 · 거부가 확정될 때만 해제(FIX-V1 §2-C).
        setResumeAnchor(nextResumeAnchor(anchor, result.work));
        return;
      }
      // §9 — 원내약 + 약학정보원 결합 응답. 서버가 이미 하나로 합친 한국어 답을 그대로 보여 준다.
      if (result.kind === 'composite') {
        setAnswer(result.composite.message);
        setResumeAnchor(null);
        return;
      }
      setAnswer(result.chat.message);
      setOpenedSite(result.chat.browserSiteOpened ?? null);
      setAttachmentsUsed(result.chat.attachments ?? []);
      setResumeAnchor(null);
    } catch (err) {
      if (gen !== aiGenRef.current) return;
      setAnswer(null);
      setError(err instanceof UnifiedRequestError || err instanceof Error ? err.message : '응답을 생성하지 못했습니다. 다시 시도해 주세요.');
      // 서버 guard 가 Neture 가입 승인 전이라고 답하면 상태를 다시 읽어 입력창 자리를 안내로 바꾼다.
      if (err instanceof UnifiedRequestError && err.code === 'NETURE_MEMBERSHIP_REQUIRED') entry.reload();
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

  // FIRST_USE_GUIDANCE — 로그인 후에만 보인다(로그인 전에는 O4O 소개 · 서비스 발견을 가리지 않는다).
  const introBanner = canUseHomeWorkspace ? (
    <>
      {/*
        FIRST_USE_GUIDANCE — WO-O4O-COMMON-AUTOMATION-CORE-USER-COLLABORATION-AND-QUESTION-FLOW-V1 §2·§4·§6.
        첫 사용 시 한 번만·가볍게. 목표만 적으면 된다는 점, 진행 중 짧게 물어볼 수 있다는 점(질문=정상)만 알린다.
        사이트/PC/파일 유형 선택 · 모델/도구/제공자 선택 UI 를 두지 않는다. Composer 는 그대로.
      */}
      {!introSeen && (
        <div
          data-testid="automation-intro"
          className="mt-4 w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm text-slate-600"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="m-0 leading-relaxed">
              하고 싶은 일을 한 문장으로 적어 주세요. O4O 가 할 수 있는 데까지 진행하고,
              더 필요한 정보가 있으면 <span className="font-medium text-slate-800">짧게 물어봅니다</span> — 질문은 정상 진행이에요.
            </p>
            <button
              type="button"
              onClick={dismissIntro}
              aria-label="안내 닫기"
              data-testid="automation-intro-dismiss"
              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  ) : null;

  /*
   * Neture 가입 승인 전에는 입력창 대신 상태 안내(CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E5).
   * 안내는 편의이고 판정은 서버 guard 다. 상태를 모르면(구 API · 로딩 · 오류) 입력창을 그대로 둔다.
   * platform:super_admin 은 서버 guard 예외와 같게 입력창을 둔다.
   */
  const netureMainStatus = entry.data?.serviceStates.netureMain?.status;
  const isSuperAdmin = !!user?.roles?.some((r) => String(r) === 'platform:super_admin');
  const netureGateStatus = netureMainStatus && netureMainStatus !== 'active' && !isSuperAdmin ? netureMainStatus : null;

  // AI Composer 는 하나다 — 로그인 전후로 **위치만** 다르다(복제하지 않는다).
  const composerArea = (
    <>
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
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 최소 계정 영역만. 상단 navigation·서비스 메뉴바 없음.
          WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1 §4:
          로그인 전 = 로그인 하나(Google — 가입 겸용) / 로그인 후 = 이름 · 계정 메뉴(내 정보 · O4O 로그아웃).
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
          // 로그인은 모달 하나(이메일 · Google). 이메일 가입은 모달의 '회원가입'(/signup).
          <button
            type="button"
            onClick={() => openLoginModal()}
            data-testid="home-login-button"
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <UserCircle className="h-5 w-5" />
            <span>로그인</span>
          </button>
        )}
      </div>

      <nav aria-label="대표 홈 메뉴" className="flex justify-center gap-6 px-4 py-3 text-sm"><a href="#all-services-title">전체 서비스</a><Link to="/contact">Contact Us</Link></nav>

      {canUseHomeWorkspace ? (
        /* 로그인 후 = AI + 내 업무 시작 (WO-O4O-NETURE-PUBLIC-HOME-IA-REFRESH-V1 — 구조 불변) */
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
          <h1 className="m-0 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">O4O</h1>

          <h2 className="mt-6 mb-0 text-lg font-semibold">O4O AI</h2>
          <p className="mt-2 mb-0 text-base text-slate-500">무엇을 도와드릴까요?</p>

          {netureGateStatus ? (
            <NetureMembershipNotice status={netureGateStatus} />
          ) : (
            <>
              {introBanner}
              {hasPendingTerms ? null : composerArea}
            </>
          )}

          {/* 로그인 후 개인화 영역 — WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1 */}
          <HomeEntryPanel
            user={user}
            data={entry.data}
            loading={entry.loading}
            error={entry.error}
            onReload={entry.reload}
          />

          <ServiceDiscovery />
          <HomeServiceNews hideWhenEmpty className="mt-12 w-full max-w-3xl" />
        </main>
      ) : (
        <main className="flex flex-1 flex-col items-center px-4 pb-16 pt-6 [word-break:keep-all] sm:pt-14">
          <section aria-labelledby="home-intro-title" className="flex w-full max-w-2xl flex-col items-center text-center">
            <h1 id="home-intro-title" className="m-0 text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">O4O</h1>
            {!authLoading && !hasPendingTerms && (
              <button
                type="button"
                onClick={() => openLoginModal()}
                data-testid="home-google-start"
                className="mt-7 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80"
              >
                {/* WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1: 모달은 이메일 · Google 둘 다 연다 — Google 한정 라벨 정정 */}
                로그인하고 시작하기
              </button>
            )}
            {hasPendingTerms && <p className="mt-6 text-sm text-slate-600">서비스를 둘러볼 수 있습니다. 업무를 시작하려면 <Link to="/mypage" className="font-medium text-blue-700 underline">약관 동의하기</Link>를 선택해 주세요.</p>}
          </section>

          <section aria-labelledby="home-ai-title" className="mt-8 flex w-full max-w-xl flex-col items-center text-center">
            <h2 id="home-ai-title" className="m-0 text-lg font-semibold text-slate-900">O4O AI</h2>
            <p className="mt-2 mb-0 text-sm text-slate-500">질문하거나 필요한 업무를 요청할 수 있습니다.</p>
            {hasPendingTerms ? null : composerArea}
          </section>
          <ServiceDiscovery />

          {/* 공개 소식 — 실제 글이 있을 때만(0건이면 빈 섹션을 두지 않는다). 로딩 · 오류는 그대로 보인다. */}
          <HomeServiceNews hideWhenEmpty className="mt-12 w-full max-w-2xl text-left" />
        </main>
      )}

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
          Contact Us
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
