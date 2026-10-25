import { NeturePharmacyError } from "../neture-pharmacy/constants.js";
export const invalid = (message = "입력 값과 현재 상태를 확인해 주세요.") =>
  new NeturePharmacyError(400, "INVALID_COOPERATION_WORK", message);
export const conflict = () =>
  new NeturePharmacyError(
    409,
    "COOPERATION_WORK_CHANGED",
    "다른 처리가 반영됐습니다. 다시 조회한 뒤 처리해 주세요.",
  );
export const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
export function shortText(value: unknown, max: number, required = false) {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw invalid();
  return value.trim();
}
export function dateInput(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw invalid("날짜를 확인해 주세요.");
  return new Date(value).toISOString();
}
export function educationUrl(value: unknown): string | null {
  if (value === null || value === "") return null;
  const text = shortText(value, 1000);
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error();
    return url.href;
  } catch {
    throw invalid("교육 링크는 HTTPS 주소로 입력해 주세요.");
  }
}
export type WorkKind = "notice" | "activity";
export interface WorkInput {
  kind: WorkKind;
  title: string;
  body: string;
  category: string;
  priority: string;
  required: boolean;
  dueAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  state: string;
  targetIds: string[];
}
export function workInput(body: Record<string, unknown>): WorkInput {
  if (body.kind !== "notice" && body.kind !== "activity") throw invalid();
  const states =
    body.kind === "notice"
      ? ["draft", "published", "archived"]
      : ["draft", "recruiting", "active", "ended", "archived"];
  if (
    !states.includes(String(body.state)) ||
    !["normal", "important", "urgent"].includes(String(body.priority)) ||
    typeof body.required !== "boolean"
  )
    throw invalid();
  if (
    !Array.isArray(body.targetIds) ||
    body.targetIds.length > 1000 ||
    !body.targetIds.every(uuid)
  )
    throw invalid("대상을 확인해 주세요. 전체 대상은 개별 선택을 비워 두세요.");
  const result = {
    kind: body.kind,
    title: shortText(body.title, 300, true),
    body: shortText(body.body, 30000, true),
    category: shortText(body.category, 80),
    priority: String(body.priority),
    required: body.required,
    dueAt: dateInput(body.dueAt),
    startsAt: dateInput(body.startsAt),
    endsAt: dateInput(body.endsAt),
    state: String(body.state),
    targetIds: [
      ...new Set((body.targetIds as string[]).map((id) => id.toLowerCase())),
    ].sort((a, b) => a.localeCompare(b)),
  };
  if (result.startsAt && result.endsAt && result.startsAt >= result.endsAt)
    throw invalid("종료일은 시작일 이후여야 합니다.");
  return result as WorkInput;
}
export function assertWorkTransition(
  before: string,
  next: string,
  kind: WorkKind,
) {
  const transitions: Record<string, string[]> =
    kind === "notice"
      ? {
          draft: ["draft", "published", "archived"],
          published: ["draft", "published", "archived"],
          archived: ["draft", "published", "archived"],
        }
      : {
          draft: ["draft", "recruiting", "archived"],
          recruiting: ["recruiting", "active", "ended", "archived"],
          active: ["active", "ended"],
          ended: ["ended", "archived"],
          archived: ["archived"],
        };
  if (!transitions[before]?.includes(next))
    throw invalid("이 업무의 현재 상태에서 가능한 처리를 선택해 주세요.");
}
export function assertApplicationTransition(before: string, next: string) {
  const transitions: Record<string, string[]> = {
    submitted: ["approved", "rejected"],
    approved: ["completed"],
    rejected: [],
    withdrawn: [],
    completed: [],
  };
  if (!transitions[before]?.includes(next))
    throw invalid("신청 상태에 맞는 처리를 선택해 주세요.");
}
