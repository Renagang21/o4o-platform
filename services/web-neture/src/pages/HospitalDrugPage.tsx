/**
 * HospitalDrugPage — 원내 약품 안내 (병동 PC 공용 · 무로그인)
 *
 * WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1 (게이트1 = 옵션 C)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 화면이 다른 화면과 다른 점
 *
 *   병동 PC 앞의 누구나 **로그인 없이** 원내 약품(재고·가격·정보)과 약학정보원
 *   조회를 쓰게 하는 파일럿 진입점이다. 그러나 trust boundary 를 넓히지 않는다:
 *
 *     · 설치 시 1회, 관리자가 로그인 + Local Agent pairing 을 끝낸다(옵션 C).
 *     · 그 뒤 병동 사용자는 저장된 세션 토큰(o4o_accessToken)을 **그대로 타고**
 *       AI 요청을 보낸다 — 이 화면은 로그인 UI 를 두지 않는다.
 *     · 세션이 만료되거나 PC 가 초기화되면 요청이 401 로 떨어진다. 그때
 *       로그인 모달을 열거나 /login 으로 보내지 않는다(O4OHomePage 와 다른 점).
 *       대신 "재연결 필요" 를 안내한다 — 재로그인·재pairing 은 **설치자**의 몫이다.
 *       (Pilot limitation. 계약 완화가 아니라 기존 경계를 그대로 둔 결과다.)
 *
 * Local Agent 상태는 probeLocalAgent()(무인증 /health)로 **읽기만** 한다. 이
 * 화면에서 pairing 을 실행하지 않는다 — pairing 은 설치 시 관리자가 이미 했다.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, HardDrive, Loader2, MonitorSmartphone, Send, Wifi, WifiOff } from 'lucide-react';
import { useWorkScope } from '../contexts';
import {
  sendUnifiedRequest,
  UnifiedRequestError,
  type UnifiedRequestResult,
} from '../lib/ai/unified-request';
import {
  describeLocalAgentUnavailable,
  probeLocalAgent,
  type LocalAgentUnavailableReason,
} from '../api/localAgent';

/** 병동 사용자가 바로 누를 수 있는 예시 질의. 자주 쓰는 업무를 문장으로 제안한다. */
const EXAMPLE_QUERIES: readonly string[] = [
  '타이레놀정 재고와 가격 알려줘',
  '아목시실린 원내 보유 여부 확인해줘',
  '리피토정 동일성분 의약품 약학정보원에서 찾아줘',
];

type AgentStatus =
  | { state: 'checking' }
  | { state: 'connected' }
  | { state: 'unavailable'; reason: LocalAgentUnavailableReason };

/**
 * 이 화면 전용 PWA manifest (§11). 사이트 전역 manifest 를 만들지 않는다 —
 * 이 페이지에 있는 동안만 `<link rel="manifest">` 를 Blob 으로 끼웠다가 떠날 때 뺀다.
 * 그래서 표시명 `원내 약품 안내`·start_url `/hospital-drug` 로 Chrome/Edge 의
 * "앱 설치" 가 이 화면에만 뜨고, 다른 Neture 화면에는 영향이 없다.
 * 설치를 강제하지 않는다 — 어떤 브라우저든 URL 직접 사용은 그대로 가능하다.
 */
const WARD_MANIFEST = {
  name: '원내 약품 안내',
  short_name: '원내 약품',
  start_url: '/hospital-drug',
  scope: '/hospital-drug',
  display: 'standalone',
  background_color: '#f8fafc',
  theme_color: '#0f172a',
  icons: [
    { src: '/favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
};

export default function HospitalDrugPage() {
  const { workScope, isResolvingStore } = useWorkScope();

  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [workResult, setWorkResult] = useState<UnifiedRequestResult | null>(null);
  const [confirm, setConfirm] = useState<{ text: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 세션 만료(401) 전용 안내. 일반 오류와 문구·처치가 다르다(설치자 재연결). */
  const [reconnectNeeded, setReconnectNeeded] = useState(false);
  const [agent, setAgent] = useState<AgentStatus>({ state: 'checking' });
  const [helpOpen, setHelpOpen] = useState(false);

  // §11 — 이 화면에 있는 동안만 전용 manifest 를 끼운다. 떠나면 원상복구.
  useEffect(() => {
    let url: string;
    let link: HTMLLinkElement;
    try {
      url = URL.createObjectURL(new Blob([JSON.stringify(WARD_MANIFEST)], { type: 'application/manifest+json' }));
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = url;
      document.head.appendChild(link);
    } catch {
      return; // Blob/manifest 미지원 브라우저 — URL 직접 사용은 그대로 가능하다(§11).
    }
    return () => {
      link.remove();
      URL.revokeObjectURL(url);
    };
  }, []);

  const refreshAgent = useCallback(async () => {
    setAgent({ state: 'checking' });
    const outcome = await probeLocalAgent();
    setAgent(outcome.ok ? { state: 'connected' } : { state: 'unavailable', reason: outcome.reason });
  }, []);

  useEffect(() => {
    void refreshAgent();
  }, [refreshAgent]);

  const trimmed = input.trim();
  const blocked = pending || isResolvingStore;

  const submit = useCallback(
    async (text: string, routeHint?: 'work') => {
      if (!text || blocked) return;
      setPending(true);
      setError(null);
      setReconnectNeeded(false);
      setQuestion(text);
      setAnswer(null);
      setWorkResult(null);
      setConfirm(null);
      try {
        const result = await sendUnifiedRequest({ text, attachments: [], workScope, routeHint });
        if (result.kind === 'confirm') {
          // 실행하지 않았다. [진행] 을 기다린다.
          setConfirm({ text, message: result.confirm.message });
          return;
        }
        setInput('');
        if (result.kind === 'work') {
          setWorkResult(result);
          return;
        }
        setAnswer(result.chat.message);
      } catch (err) {
        // 저장된 세션이 만료·소실됐다. 로그인 모달을 열지 않는다(옵션 C):
        // 재로그인·재pairing 은 설치자가 한다. 여기서는 그 사실만 알린다.
        if (err instanceof UnifiedRequestError && err.status === 401) {
          setReconnectNeeded(true);
          return;
        }
        setError(err instanceof Error ? err.message : '응답을 생성하지 못했습니다. 다시 시도해 주세요.');
      } finally {
        setPending(false);
      }
    },
    [blocked, workScope],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(trimmed);
  };

  const hasThread =
    question !== null || answer !== null || error !== null || workResult !== null || confirm !== null || reconnectNeeded;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* 헤더 — 계정/네비게이션 없음. 화면 정체성만. */}
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-semibold text-slate-900">원내 약품 안내</h1>
            <p className="m-0 mt-0.5 text-xs text-slate-500">원내 보유 약품 조회 · 약학정보원 안내</p>
          </div>
          <AgentBadge agent={agent} onRetry={refreshAgent} />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-3xl">
          {!hasThread && (
            <div className="mb-6 text-center">
              <p className="m-0 text-base text-slate-600">찾으시는 약품이나 궁금한 점을 입력해 주세요.</p>
            </div>
          )}

          {/* 결과 영역 */}
          {hasThread && (
            <div className="mb-6 space-y-4" data-testid="hospital-drug-thread">
              {question !== null && (
                <div className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white">{question}</div>
              )}

              {reconnectNeeded && (
                <div
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                  data-testid="hospital-drug-reconnect"
                >
                  <p className="m-0 font-medium">재연결이 필요합니다.</p>
                  <p className="m-0 mt-1 text-amber-800">
                    이 PC 의 O4O 세션이 만료되었습니다. 담당자(설치자)가 다시 로그인하고 이 PC 를 연결하면
                    바로 이용할 수 있습니다.
                  </p>
                </div>
              )}

              {answer !== null && (
                <div
                  className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                  data-testid="hospital-drug-answer"
                >
                  {answer}
                </div>
              )}

              {workResult !== null && workResult.kind === 'work' && (
                <div
                  className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
                  data-testid="hospital-drug-work"
                >
                  {workResult.work.message}
                  {workResult.work.neededInput && (
                    <p className="m-0 mt-2 text-slate-600">{workResult.work.neededInput}</p>
                  )}
                </div>
              )}

              {confirm !== null && (
                <div
                  className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
                  data-testid="hospital-drug-confirm"
                >
                  <p className="m-0">{confirm.message}</p>
                  <button
                    type="button"
                    onClick={() => void submit(confirm.text, 'work')}
                    disabled={blocked}
                    data-testid="hospital-drug-confirm-proceed"
                    className="mt-3 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                  >
                    진행
                  </button>
                </div>
              )}

              {error !== null && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  data-testid="hospital-drug-error"
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* 입력 */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 타이레놀정 재고와 가격"
              disabled={blocked}
              data-testid="hospital-drug-input"
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!trimmed || blocked}
              data-testid="hospital-drug-submit"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
              title="실행"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </form>

          {/* 예시 질의 */}
          {!hasThread && (
            <div className="mt-4 flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void submit(q)}
                  disabled={blocked}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* §11 — 바탕화면 추가 안내. 설치를 강제하지 않고 방법만 알려준다. */}
          <div className="mt-8 rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              aria-expanded={helpOpen}
              data-testid="hospital-drug-help-toggle"
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-slate-700"
            >
              <span className="flex items-center gap-2">
                <MonitorSmartphone className="h-4 w-4 text-slate-500" />
                이 화면을 바탕화면에 추가하기
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
            </button>
            {helpOpen && (
              <div className="border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600" data-testid="hospital-drug-help">
                <p className="m-0">
                  Chrome · Edge: 주소창 오른쪽의 <span className="font-medium">설치 아이콘</span> 을 누르거나, 브라우저
                  메뉴에서 <span className="font-medium">앱 설치</span>(또는 「도구 더보기 → 바로가기 만들기」) 를 선택하면
                  「원내 약품 안내」 아이콘이 바탕화면에 만들어집니다.
                </p>
                <p className="m-0 mt-2">
                  설치 메뉴가 보이지 않는 브라우저에서는 이 주소를 즐겨찾기에 추가해 사용하세요:{' '}
                  <span className="font-mono text-slate-800">neture.co.kr/hospital-drug</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/** 이 PC 의 Local Agent 연결 상태를 읽기 전용으로 보여준다. pairing 은 하지 않는다. */
function AgentBadge({ agent, onRetry }: { agent: AgentStatus; onRetry: () => void }) {
  if (agent.state === 'checking') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400" data-testid="hospital-drug-agent-status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        연결 확인 중
      </span>
    );
  }
  if (agent.state === 'connected') {
    return (
      <span
        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"
        data-testid="hospital-drug-agent-status"
        title="이 PC 가 원내 자료에 연결되어 있습니다"
      >
        <Wifi className="h-3.5 w-3.5" />
        연결됨
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
      data-testid="hospital-drug-agent-status"
      title={describeLocalAgentUnavailable(agent.reason)}
    >
      {agent.reason === 'PERMISSION_REQUIRED' ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : (
        <HardDrive className="h-3.5 w-3.5" />
      )}
      원내 자료 미연결
    </button>
  );
}
