/**
 * HospitalDrugPage — 원내 약품 안내 (병동 PC 공용 · 무로그인)
 *
 * WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1 (게이트1 = 옵션 C)
 * WO-O4O-HOSPITAL-DRUG-BROWSER-LOCAL-DATA-CONNECT-V1 (원내 자료 = 브라우저 Local Data)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 두 개의 "연결" 은 의미가 다르다 — 절대 같게 취급하지 않는다.
 *
 *   ① 원내 자료(Data Context) — [약품파일 연결]. 사용자가 원내 약품 Excel/CSV 를 고르면
 *      **브라우저에서** 파싱·정규화해 localStorage 에 담는다(localDataset.ts). 서버로 올리지 않고,
 *      새 서버 저장소도 만들지 않으며, Local Agent 도 요구하지 않는다. 원내 조회("원내에 이 약 있어?")는
 *      이 데이터로 **브라우저에서** 답한다 — 로그인·PC 연결이 없어도 된다.
 *
 *   ② PC 자동화(Local Agent) — 화면/업무 자동화 실행 환경. probeLocalAgent()(무인증 /health)로 상태만
 *      읽는다(pairing 은 설치 시 관리자가 끝냈다). 이건 **자료가 아니라 실행기**다. 원내 자료 연결과 무관하다.
 *
 * 설치 시 1회 관리자가 로그인 + Local Agent pairing(옵션 C) 을 끝낸다. 병동 사용자는 저장된 세션을 타고
 * research(효능 조사·Gemini)·screen(화면 조작·Astra) 요청을 보낸다. 세션 만료(401)면 로그인 모달을 열지
 * 않고 "재연결 필요"(설치자 몫)만 알린다. 원내 자료 조회는 이 세션과도 무관하게 브라우저에서 동작한다.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  HardDrive,
  Loader2,
  MonitorSmartphone,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';
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
import {
  LOCAL_DRUG_ACCEPT,
  clearLocalDataset,
  loadLocalDataset,
  makeDataset,
  matchLocalByResearchIngredients,
  parseDrugFile,
  queryLocalRows,
  renderLocalContextBlock,
  saveLocalDataset,
  type LocalDrugDataset,
  type LocalDrugRow,
} from '../lib/hospital-drug/localDataset';
import {
  classifyLocalQuery,
  extractQueryTerms,
  extractStrength,
} from '../lib/hospital-drug/localIntent';

/**
 * 병동 사용자가 바로 누를 수 있는 예시 질의. 자주 쓰는 업무를 문장으로 제안한다.
 * 소스 이름(약학정보원 등)은 노출하지 않는다 — 목적만 문장으로 둔다(§7).
 * 조사(효능)·원내 결합(동일성분+원내)·원내 보유 세 패턴을 보여 준다.
 */
const EXAMPLE_QUERIES: readonly string[] = [
  '타이레놀정의 효능을 조사해줘',
  '타이레놀정과 같은 성분의 원내약 있어?',
  '아목시실린 원내 보유 여부 확인해줘',
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

/** 같은 제품·함량 행 중복 제거(제품 토큰 매칭 ∪ 성분 매칭 결합 시). */
function dedupeRows(rows: LocalDrugRow[]): LocalDrugRow[] {
  const seen = new Set<string>();
  const out: LocalDrugRow[] = [];
  for (const r of rows) {
    const key = `${r.product_name}${r.strength ?? ''}${r.manufacturer ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

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

  // ① 원내 자료(Data Context) — 브라우저 localStorage. Local Agent 와 독립.
  const [dataset, setDataset] = useState<LocalDrugDataset | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // 새로고침 후에도 유지되는 원내 데이터셋 복원(criterion D).
  useEffect(() => {
    setDataset(loadLocalDataset());
  }, []);

  const refreshAgent = useCallback(async () => {
    setAgent({ state: 'checking' });
    const outcome = await probeLocalAgent();
    setAgent(outcome.ok ? { state: 'connected' } : { state: 'unavailable', reason: outcome.reason });
  }, []);

  useEffect(() => {
    void refreshAgent();
  }, [refreshAgent]);

  /** [약품파일 연결]/[약품파일 변경] → 실제 파일 선택창. */
  const openFilePicker = useCallback(() => {
    setLocalError(null);
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일 재선택도 onChange 가 나도록 값 비우기.
    e.target.value = '';
    if (!file) return;
    setLocalBusy(true);
    setLocalError(null);
    try {
      const outcome = await parseDrugFile(file);
      if (outcome.missingNameColumn) {
        const seen = outcome.detectedHeaders.length > 0 ? `\n이 파일에서 인식한 열 제목: ${outcome.detectedHeaders.join(', ')}` : '';
        setLocalError(
          `약품명 열을 찾지 못했습니다. 제품명 · 약품명 · 품목명 등 약품 이름 열이 있는 파일인지 확인해 주세요.${seen}`,
        );
        return;
      }
      if (outcome.rows.length === 0) {
        setLocalError('약품 행을 찾지 못했습니다. 파일 내용을 확인해 주세요.');
        return;
      }
      const next = makeDataset(file.name, outcome.rows);
      const saved = saveLocalDataset(next);
      if (!saved.ok) {
        setLocalError(
          saved.reason === 'quota'
            ? '이 브라우저의 저장 공간이 부족해 원내 자료를 저장하지 못했습니다. 항목 수가 더 적은 파일로 시도해 주세요.'
            : '원내 자료를 이 브라우저에 저장하지 못했습니다.',
        );
        return;
      }
      setDataset(next); // 즉시 상태 갱신(criterion B·C).
    } catch {
      setLocalError('파일을 읽지 못했습니다. xlsx · xls · csv 형식인지 확인해 주세요.');
    } finally {
      setLocalBusy(false);
    }
  }, []);

  const disconnectLocal = useCallback(() => {
    clearLocalDataset();
    setDataset(null);
    setLocalError(null);
  }, []);

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
        const localKind = dataset ? classifyLocalQuery(text) : 'none';

        // ── 원내 보유 조회(local_only) — 브라우저 데이터로 **완전히** 답한다. 서버·Local Agent 불요. ──
        // criterion E·F: "우리 원내에 아세트아미노펜 있어?" 를 로그인·PC 연결 없이 처리.
        if (dataset && localKind === 'local_only') {
          const terms = extractQueryTerms(text);
          const strength = extractStrength(text);
          const needles = terms.length > 0 ? terms : [text];
          const matches = queryLocalRows(dataset.rows, needles, { limit: 50 });
          const label = terms.length > 0 ? terms.join(' · ') : text.trim();
          setInput('');
          setAnswer(`'${label}' 의 원내 보유 여부를 확인했습니다.\n\n${renderLocalContextBlock(matches, strength)}`);
          return;
        }

        // ── 그 밖 — 서버 공통 Core. 원내 데이터가 연결돼 있으면 localSource='client' 로 알려
        //    서버는 자기 원내 조회(Local Agent)를 열지 않는다. research(조사)·screen(화면)·question 만.
        const result = await sendUnifiedRequest({
          text,
          attachments: [],
          workScope,
          routeHint,
          surface: 'hospital-drug',
          ...(dataset ? { localSource: 'client' as const } : {}),
        });
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
        // 공통 Core 의 텍스트 답(research·되묻기)은 chat.message 로 온다.
        // composite 는 은퇴했으나 구버전 서버 호환을 위해 분기만 남긴다(현행 서버는 내려보내지 않는다).
        let text_answer = result.kind === 'composite' ? result.composite.message : result.chat.message;

        // ── 동일성분(research_and_local) 결합 — 서버 research 위에 원내 Context 를 **브라우저에서** 얹는다.
        //    제품 토큰 매칭 ∪ research 본문에 등장한 성분과 같은 성분의 원내 행.
        if (dataset && localKind === 'research_and_local') {
          const strength = extractStrength(text);
          const terms = extractQueryTerms(text);
          const byTerms = terms.length > 0 ? queryLocalRows(dataset.rows, terms, { limit: 50 }) : [];
          const byIngredient = matchLocalByResearchIngredients(dataset.rows, text_answer, 50);
          const merged = dedupeRows([...byTerms, ...byIngredient]);
          text_answer = `${text_answer}\n\n[원내 약품] 같은 성분 원내 보유 현황\n${renderLocalContextBlock(merged, strength)}`;
        }

        setAnswer(text_answer);
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
    [blocked, workScope, dataset],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(trimmed);
  };

  const hasThread =
    question !== null || answer !== null || error !== null || workResult !== null || confirm !== null || reconnectNeeded;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* 헤더 — 계정/네비게이션 없음. 화면 정체성 + 두 연결(원내 자료 · PC 자동화)만. */}
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="m-0 text-lg font-semibold text-slate-900">원내 약품 안내</h1>
            <p className="m-0 mt-0.5 text-xs text-slate-500">원내 보유 약품 조회 · 약학정보원 안내</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <LocalDataConnector
              dataset={dataset}
              busy={localBusy}
              onConnect={openFilePicker}
              onDisconnect={disconnectLocal}
            />
            <AgentBadge agent={agent} onRetry={refreshAgent} />
          </div>
        </div>
        {localError && (
          <div className="mx-auto mt-2 max-w-3xl">
            <p className="m-0 whitespace-pre-line text-xs text-red-600" data-testid="hospital-drug-local-data-error">
              {localError}
            </p>
          </div>
        )}
        {/* 실제 파일 선택창 — 숨김 input. accept 는 xlsx/xls/csv. */}
        <input
          ref={fileInputRef}
          type="file"
          accept={LOCAL_DRUG_ACCEPT}
          onChange={onFileChange}
          className="hidden"
          data-testid="hospital-drug-local-data-input"
        />
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

/**
 * ① 원내 자료(Data Context) 연결 — 브라우저 Local Data. 파일을 서버로 올리지 않는다.
 * 미연결: [원내 자료 미연결] + [약품파일 연결]. 연결됨: [원내 자료 연결됨 · N개 품목] + [약품파일 변경].
 * PC 자동화(Local Agent)와 **의미가 다르다** — 여기서는 자료만 다룬다.
 */
function LocalDataConnector({
  dataset,
  busy,
  onConnect,
  onDisconnect,
}: {
  dataset: LocalDrugDataset | null;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {dataset ? (
        <span
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"
          data-testid="hospital-drug-local-data-status"
          title={`${dataset.fileName} · ${dataset.count}개 품목`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          원내 자료 연결됨 · {dataset.count}개 품목
        </span>
      ) : (
        <span
          className="flex items-center gap-1.5 text-xs text-slate-500"
          data-testid="hospital-drug-local-data-status"
          title="원내 약품 파일(Excel · CSV)을 연결하면 원내 보유 조회를 쓸 수 있습니다"
        >
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          원내 자료 미연결
        </span>
      )}
      <button
        type="button"
        onClick={onConnect}
        disabled={busy}
        data-testid="hospital-drug-local-data-connect"
        className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
        {busy ? '불러오는 중' : dataset ? '약품파일 변경' : '약품파일 연결'}
      </button>
      {dataset && !busy && (
        <button
          type="button"
          onClick={onDisconnect}
          data-testid="hospital-drug-local-data-disconnect"
          className="text-xs text-slate-400 hover:text-slate-600"
          title="연결 해제"
        >
          해제
        </button>
      )}
    </div>
  );
}

/**
 * ② PC 자동화(Local Agent) 연결 상태 — 읽기 전용. pairing 은 하지 않는다.
 * 이건 화면/업무 자동화 실행기 상태다 — 원내 자료(Data Context)와 다르다.
 */
function AgentBadge({ agent, onRetry }: { agent: AgentStatus; onRetry: () => void }) {
  if (agent.state === 'checking') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400" data-testid="hospital-drug-agent-status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        PC 자동화 확인 중
      </span>
    );
  }
  if (agent.state === 'connected') {
    return (
      <span
        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"
        data-testid="hospital-drug-agent-status"
        title="이 PC 의 자동화(화면/업무 실행) 환경이 연결되어 있습니다"
      >
        <Wifi className="h-3.5 w-3.5" />
        PC 자동화 연결됨
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
      PC 자동화 미연결
    </button>
  );
}
