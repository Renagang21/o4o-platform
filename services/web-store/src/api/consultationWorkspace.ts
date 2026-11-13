import { coreApiClient } from "./client";

export const CONSULTATION_BASE = "/neture/pharmacy";
export interface ConsultationExpression { tone: 'neutral' | 'friendly'; formality: 'polite' | 'plain'; length: 'short' | 'standard' }
export async function readConsultationExpression() {
  const r = await coreApiClient.get<Envelope<{ organizationId: string; expression: ConsultationExpression; canEdit: boolean }>>(`${CONSULTATION_BASE}/consultation-expression`);
  if (!r.success || !r.data?.expression) throw new Error('매장 표현 설정을 확인하지 못했습니다.');
  return r.data;
}
export async function saveConsultationExpression(expression: ConsultationExpression) {
  const r = await coreApiClient.put<Envelope<{ organizationId: string; expression: ConsultationExpression; canEdit: boolean }>>(`${CONSULTATION_BASE}/consultation-expression`, expression);
  if (!r.success || !r.data?.expression) throw new Error('매장 표현 설정을 저장하지 못했습니다.');
  return r.data;
}
export type ConsultationTabletRole = "pharmacist" | "staff" | "consumer";
/** speechLanguages: 이 태블릿의 Google 음성 자동 감지 후보(최대 3개). 없으면 관리자 기본 후보. */
/** showKorean: 소비자 태블릿 외국어 화면의 한국어 병기(없으면 켜짐 · 소비자 다국어 정책 §2-4). */
export interface ConsultationTablet { id: string; role: ConsultationTabletRole; name: string; speechLanguages?: string[]; showKorean?: boolean }
/** configured: 한 번이라도 저장했는지(false 면 기본 태블릿을 보여 준다). 이전 서버 응답에 없으면 목록이 비었는지로 판단한다. */
export interface ConsultationTablets { organizationId: string; tablets: ConsultationTablet[]; configured: boolean; canEdit: boolean }
function tablets(r: Envelope<ConsultationTablets>, message: string) {
  if (!r.success || typeof r.data?.organizationId !== "string" || !Array.isArray(r.data.tablets) || typeof r.data.canEdit !== "boolean" ||
    r.data.tablets.some((t) => typeof t?.id !== "string" || typeof t.name !== "string" || !["pharmacist", "staff", "consumer"].includes(t.role)))
    throw new Error(message);
  return { ...r.data, configured: typeof r.data.configured === "boolean" ? r.data.configured : r.data.tablets.length > 0 };
}
export async function readConsultationTablets() {
  return tablets(await coreApiClient.get<Envelope<ConsultationTablets>>(`${CONSULTATION_BASE}/consultation-tablets`), "상담 태블릿 목록을 확인하지 못했습니다.");
}
export async function saveConsultationTablets(list: ConsultationTablet[]) {
  return tablets(await coreApiClient.put<Envelope<ConsultationTablets>>(`${CONSULTATION_BASE}/consultation-tablets`, { tablets: list }), "상담 태블릿 목록을 저장하지 못했습니다.");
}
export interface SharedConsultation {
  kind: string;
  title: string;
  text: string;
  language?: string;
  publicKey?: string | null;
  requestedLanguage?: string;
  source?: { title: string; language: string };
  fallbackUsed?: boolean;
  translated?: boolean;
}
export interface CustomerReply {
  id: string;
  text: string;
  language: string;
}
export interface ConsultationStation {
  id: string;
  stationKey: string;
  name: string;
  mode: string;
  language: string;
  active: boolean;
  epoch: string;
  version: number;
  shared: SharedConsultation | Record<string, never>;
  reply: CustomerReply | null;
  connected: boolean;
  deviceSeenAt: string | null;
}
export interface CustomerCredential {
  id: string;
  name: string;
  token: string;
}
export interface CustomerScreen {
  id: string;
  name: string;
  epoch: string;
  version: number;
  language: string;
  state: "active" | "waiting";
  shared: SharedConsultation | null;
  languages: Array<{ key: string; label: string }>;
  runtime?: import('../pages/pharmacy/consultation/ConsultationParts').Context['runtime'];
}
type Envelope<T> = { success: boolean; data: T };
function station(r: Envelope<ConsultationStation>) {
  if (
    !r.success ||
    typeof r.data?.id !== "string" ||
    typeof r.data.epoch !== "string" ||
    !Number.isSafeInteger(r.data.version) ||
    typeof r.data.active !== "boolean" ||
    typeof r.data.connected !== "boolean"
  )
    throw new Error("상담 연결 응답을 확인하지 못했습니다.");
  return r.data;
}
export async function openConsultationStation(input: {
  stationKey: string;
  name: string;
  mode: string;
  language: string;
  replace?: boolean;
}) {
  return station(
    await coreApiClient.post<Envelope<ConsultationStation>>(
      `${CONSULTATION_BASE}/consultation-stations/open`,
      input,
    ),
  );
}
export async function stationHeartbeat(current: ConsultationStation) {
  return station(
    await coreApiClient.post<Envelope<ConsultationStation>>(
      `${CONSULTATION_BASE}/consultation-stations/${current.id}/heartbeat`,
      { epoch: current.epoch },
    ),
  );
}
export async function stationAction(
  current: ConsultationStation,
  input: Record<string, unknown>,
) {
  return station(
    await coreApiClient.post<Envelope<ConsultationStation>>(
      `${CONSULTATION_BASE}/consultation-stations/${current.id}/action`,
      { ...input, epoch: current.epoch },
    ),
  );
}
export async function createConsultationPairing(current: ConsultationStation) {
  const r = await coreApiClient.post<
    Envelope<{ code: string; expiresAt: string }>
  >(`${CONSULTATION_BASE}/consultation-stations/${current.id}/pairing`, {
    epoch: current.epoch,
  });
  if (
    !r.success ||
    typeof r.data?.code !== "string" ||
    !Number.isFinite(Date.parse(r.data.expiresAt))
  )
    throw new Error("연결 코드를 확인하지 못했습니다.");
  return r.data;
}
/** Public delivery never uses the employee API client, cookies, refresh or Store context. */
export async function customerRequest<T>(
  action: "claim" | "read" | "reply" | 'speech/recognize' | 'speech/synthesize',
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = window.setTimeout(cancel, action.startsWith('speech/') ? 25_000 : 10_000);
  try {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const response = await fetch(
      `${base}/api/v1${CONSULTATION_BASE}/consultation-device/${action}`,
      {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const result = await response.json();
    if (!response.ok || result.success !== true)
      throw Object.assign(
        new Error(
          typeof result.error === "string"
            ? result.error
            : "상담 연결을 확인하지 못했습니다.",
        ),
        { status: response.status, code: result.code },
      );
    return result.data as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
/** 경영자 화면: 소비자 태블릿(키오스크) 연결 코드(10분). */
export async function createKioskPairing(tabletId: string) {
  const r = await coreApiClient.post<Envelope<{ code: string; expiresAt: string }>>(
    `${CONSULTATION_BASE}/consultation-tablets/${encodeURIComponent(tabletId)}/pairing`, {});
  if (!r.success || typeof r.data?.code !== "string" || typeof r.data.expiresAt !== "string")
    throw new Error("연결 코드를 만들지 못했습니다.");
  return r.data;
}
export interface KioskCredential { id: string; name: string; token: string }
export interface KioskCard { kind: string; title: string; text: string; language: string; requestedLanguage: string; publicKey: string | null; fallbackUsed: boolean; translated: boolean; korean?: string }
export interface KioskAnswer { state: string; intent?: string; language: string; card?: KioskCard; message?: string;
  /** location: 매장이 등록한 위치(고객 언어로 번역 · 실패 시 한국어 원문) 또는 위치 미등록 안내. */
  products?: Array<{ kind: string; id: string; name: string; location?: { text: string; language: string; korean?: string } }> }
export interface KioskContext { name: string; languages: Array<{ key: string; label: string }>;
  runtime?: import('../pages/pharmacy/consultation/ConsultationParts').Context['runtime'] }
/**
 * 소비자 태블릿(키오스크) 요청. 직원 로그인 밖의 기기 자격(credentials: omit)만 쓴다 —
 * 고객 화면(consultation-device)과 같은 방식이다.
 */
export async function kioskRequest<T>(
  action: "claim" | "context" | "search" | "answer" | "pharmacist" | "speech/recognize" | "speech/synthesize",
  body: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), action === "claim" || action === "context" ? 10_000 : 30_000);
  try {
    const base = import.meta.env.VITE_API_BASE_URL || "";
    const response = await fetch(`${base}/api/v1${CONSULTATION_BASE}/consultation-kiosk/${action}`, {
      method: "POST", credentials: "omit", cache: "no-store", signal: controller.signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true)
      throw Object.assign(new Error(typeof result.error === "string" ? result.error : "연결을 확인하지 못했습니다."),
        { status: response.status, code: result.code });
    return result.data as T;
  } finally {
    clearTimeout(timer);
  }
}
export function validCustomerScreen(value: CustomerScreen): boolean {
  return (
    !!value &&
    typeof value.id === "string" &&
    typeof value.epoch === "string" &&
    Number.isSafeInteger(value.version) &&
    ["active", "waiting"].includes(value.state) &&
    typeof value.name === "string" &&
    Array.isArray(value.languages) &&
    value.languages.length > 0 &&
    value.languages.every(
      (l) => typeof l.key === "string" && typeof l.label === "string",
    ) &&
    (!value.shared ||
      (typeof value.shared.title === "string" &&
        typeof value.shared.text === "string"))
  );
}

export type GuidanceIntent =
  | "find-product"
  | "location"
  | "product-details"
  | "pharmacist"
  | "help";
export interface GuidanceCard extends SharedConsultation {
  language: string;
  requestedLanguage: string;
  source?: { title: string; language: string };
  fallbackUsed?: boolean;
  translated?: boolean;
}
export interface GuidanceResult {
  organizationId: string;
  mode: string;
  language: string;
  state: "ready" | "clarify" | "empty";
  intent: GuidanceIntent | null;
  message?: string;
  card?: GuidanceCard;
  deliveryId?: string;
  sourceVersion?: string;
  selection?: { sourceVersion: string; passageIds: number[] };
  canTranslate?: boolean;
  aiSelected?: boolean;
  publicKey?: string | null;
}
export async function prepareConsultationGuidance(input: {
  mode: string;
  language: string;
  intent: GuidanceIntent;
  question: string;
  reuseSession?: string;
  productKind?: string;
  productId?: string;
  useAi?: boolean;
  translateMaterial?: boolean;
  selection?: { sourceVersion: string; passageIds: number[] };
  stationId?: string;
  epoch?: string;
}) {
  const r = await coreApiClient.post<Envelope<GuidanceResult>>(
    `${CONSULTATION_BASE}/consultation-guidance`,
    input,
  );
  if (
    !r.success ||
    !["ready", "clarify", "empty"].includes(r.data?.state) ||
    (r.data.state === "ready" &&
      (!r.data.card ||
        typeof r.data.card.text !== "string" ||
        typeof r.data.card.language !== "string"))
  )
    throw new Error("상담 안내 응답을 확인하지 못했습니다.");
  return r.data;
}

export interface ConsultationSupportPoint { text: string; sourceIds: string[] }
export interface ConsultationProductSearchResult {
  organizationId: string; mode: string; state: 'candidates' | 'clarify' | 'not-needed' | 'empty'; message: string;
  candidates: Array<{ id: string; kind: 'listing' | 'local'; name: string; location: string }>;
}
export async function findConsultationProducts(input: { mode: string; question: string; context: string[]; stationId?: string; epoch?: string; reuseSession?: string }) {
  const response = await coreApiClient.post<Envelope<ConsultationProductSearchResult>>(`${CONSULTATION_BASE}/consultation-products/prepare`, input);
  const value = response.data;
  if (!response.success || !value || !['candidates', 'clarify', 'not-needed', 'empty'].includes(value.state) || !Array.isArray(value.candidates) ||
    value.candidates.some(item => !item.id || !['listing', 'local'].includes(item.kind) || typeof item.name !== 'string'))
    throw new Error('현재 매장의 상담 후보 응답을 확인하지 못했습니다.');
  return value;
}
export interface ConsultationSupportResult {
  organizationId: string;
  mode: string;
  productId: string;
  productKind: string;
  state: 'ready' | 'empty' | 'verified';
  message?: string;
  sourceVersion?: string;
  sources?: Array<{ id: string; kind: string; title: string; urls?: string[]; checkedOn?: string | null; revision?: string; currentness?: string }>;
  brief?: { productFacts: ConsultationSupportPoint[]; professionalNotes: ConsultationSupportPoint[];
    nextQuestion: string | null; customerDraft: ConsultationSupportPoint };
}
export interface ConsultationSupportSourceProof { mode: string; productKind: string; productId: string; sourceVersion: string }
export async function prepareConsultationSupport(input: {
  mode: string; productKind: string; productId: string; question?: string;
  reference?: { text: string; source: string; reviewed: boolean };
  verifyOnly?: boolean; sourceVersion?: string; stationId?: string; epoch?: string;
  reuseSession?: string;
}): Promise<ConsultationSupportResult> {
  const r = await coreApiClient.post<Envelope<ConsultationSupportResult>>(`${CONSULTATION_BASE}/consultation-support`, input);
  if (!r.success || !['ready', 'empty', 'verified'].includes(r.data?.state) ||
    (r.data.state === 'ready' && (!r.data.brief || !r.data.sourceVersion || !Array.isArray(r.data.sources))))
    throw new Error('판단 지원 응답을 확인하지 못했습니다.');
  return r.data;
}
