import { coreApiClient } from "./client";

export const CONSULTATION_BASE = "/neture/pharmacy";
export type OperatingType = "standard" | "large";
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
export async function fetchConsultationLayout() {
  const r = await coreApiClient.get<
    Envelope<{
      organizationId: string;
      name: string;
      operatingType: OperatingType;
    }>
  >(`${CONSULTATION_BASE}/consultation-layout`);
  if (!r.success || !["large", "standard"].includes(r.data?.operatingType))
    throw new Error("상담 화면 구성을 확인하지 못했습니다.");
  return r.data;
}
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
export async function findConsultationProducts(input: { mode: string; question: string; context: string[]; stationId?: string; epoch?: string }) {
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
}): Promise<ConsultationSupportResult> {
  const r = await coreApiClient.post<Envelope<ConsultationSupportResult>>(`${CONSULTATION_BASE}/consultation-support`, input);
  if (!r.success || !['ready', 'empty', 'verified'].includes(r.data?.state) ||
    (r.data.state === 'ready' && (!r.data.brief || !r.data.sourceVersion || !Array.isArray(r.data.sources))))
    throw new Error('판단 지원 응답을 확인하지 못했습니다.');
  return r.data;
}
