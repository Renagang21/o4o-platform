import type { DataSource } from "typeorm";
import { PHARMACY_COLLABORATORS } from "@o4o/types";
import { getServiceOrigin } from "../../config/service-catalog.js";
import { getStartupState } from "../../bootstrap/startup-state.js";

export type CheckState = "passed" | "failed" | "unknown";
export interface HealthCheck {
  name: string;
  state: CheckState;
  detail: string;
}
export interface ServiceHealthRow {
  id: string;
  name: string;
  url: string;
  checkedAt: string;
  checks: HealthCheck[];
}
// Finite public targets only. These are addresses, not service identity/membership or business activation.
export const SERVICE_HEALTH_TARGETS = [
  ...Object.entries(PHARMACY_COLLABORATORS).map(([id, value]) => ({
    id,
    name:
      id === "pharmcoop"
        ? "약국·약사 협동조합 연합회"
        : id === "pharmacy"
          ? "O4O 약국 경영지원"
          : value.label,
    url: `https://${value.domain}/`,
  })),
  ...(
    [
      "supplier",
      "community",
      "kpa-branch",
      "lecture",
      "funding",
      "neture",
    ] as const
  ).map((id) => ({
    id,
    name: {
      supplier: "공급자",
      community: "커뮤니티",
      "kpa-branch": "분회",
      lecture: "O4O 강의",
      funding: "유통참여형 펀딩",
      neture: "O4O 대표 홈",
    }[id],
    url: getServiceOrigin(id)! + "/",
  })),
  { id: "store", name: "내 매장", url: "https://store.neture.co.kr/" },
  { id: "admin", name: "전체 관리자", url: "https://admin.neture.co.kr/" },
];
const TTL = 60_000;
const TIMEOUT = 4_000;
const MAX_HTML = 512 * 1024;
async function bounded<T>(task: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function readHtml(response: Response): Promise<string> {
  if (!response.body) throw new Error("empty body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = "",
    size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return html;
      size += value.byteLength;
      if (size > MAX_HTML) throw new Error("body limit");
      html += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}
export async function checkWebTarget(
  target: (typeof SERVICE_HEALTH_TARGETS)[number],
  fetcher: typeof fetch = fetch,
): Promise<ServiceHealthRow> {
  const checks: HealthCheck[] = [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  const isAppAsset = (url: URL) =>
    url.origin === new URL(target.url).origin &&
    !url.username &&
    !url.password &&
    (url.pathname.startsWith("/assets/") ||
      (target.id === "kpa-branch" && url.pathname.startsWith("/kpa/assets/")));
  const request = (url: string) =>
    fetcher(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { Accept: "text/html,application/javascript" },
    });
  try {
    const response = await request(target.url);
    checks.push({
      name: "HTTPS 응답",
      state: response.ok
        ? "passed"
        : response.status >= 500 || response.status === 404
          ? "failed"
          : "unknown",
      detail: `HTTP ${response.status}`,
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      checks.push({
        name: "화면·필수 파일",
        state: "unknown",
        detail: "정상 HTML 응답을 받지 못해 확인하지 않았습니다.",
      });
    } else if (!response.headers.get("content-type")?.includes("text/html")) {
      await response.body?.cancel().catch(() => {});
      checks.push({
        name: "화면·필수 파일",
        state: "failed",
        detail: "HTML 화면 응답이 아닙니다.",
      });
    } else {
      const html = await readHtml(response);
      const tags = html.match(/<script\b[^>]*>/gi) ?? [];
      const asset = tags
        .map((tag) => /\bsrc\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1])
        .filter(
          (value): value is string => !!value && /\.m?js(?:\?|$)/i.test(value),
        )
        .map((value) => new URL(value, target.url))
        .find(isAppAsset);
      // No redirects, cross-origin assets, arbitrary URL query input, cookies or authorization forwarding.
      if (!asset || !isAppAsset(asset))
        checks.push({
          name: "화면·필수 파일",
          state: "unknown",
          detail: "점검 가능한 동일 주소의 앱 파일이 없습니다.",
        });
      else {
        const js = await request(asset.href);
        const reader = js.body?.getReader();
        let prefix = "";
        try {
          if (reader) {
            const chunk = await reader.read();
            if (chunk.value) prefix = new TextDecoder().decode(chunk.value);
          }
        } finally {
          await reader?.cancel().catch(() => {});
        }
        const valid =
          js.ok &&
          /(?:javascript|ecmascript)/i.test(
            js.headers.get("content-type") ?? "",
          ) &&
          !!prefix.trim() &&
          !/^\s*(?:<!doctype|<html)/i.test(prefix);
        checks.push({
          name: "화면·필수 파일",
          state: valid
            ? "passed"
            : js.status >= 300 && js.status < 400
              ? "unknown"
              : "failed",
          detail: valid
            ? "HTML 및 앱 JavaScript 응답 확인"
            : `앱 파일 응답 확인 실패 (HTTP ${js.status})`,
        });
      }
    }
  } catch {
    checks.push({
      name: "접속 확인",
      state: "unknown",
      detail: "제한 시간·DNS·TLS·네트워크 문제로 확인하지 못했습니다.",
    });
  } finally {
    clearTimeout(timer);
  }
  return { ...target, checkedAt: new Date().toISOString(), checks };
}
export class ServiceHealthService {
  private cached?: {
    at: number;
    data: Awaited<ReturnType<ServiceHealthService["collect"]>>;
  };
  private pending?: ReturnType<ServiceHealthService["collect"]>;
  constructor(
    private db: Pick<DataSource, "query" | "isInitialized">,
    private fetcher: typeof fetch = fetch,
    private startup: () => string = getStartupState,
  ) {}
  async snapshot() {
    if (this.cached && Date.now() - this.cached.at < TTL)
      return { ...this.cached.data, cached: true };
    if (!this.pending)
      this.pending = this.collect()
        .then((data) => {
          this.cached = { at: Date.now(), data };
          return data;
        })
        .finally(() => {
          this.pending = undefined;
        });
    return { ...(await this.pending), cached: false };
  }
  private async collect() {
    const rows: ServiceHealthRow[] = [];
    let next = 0;
    const workers = Array.from({ length: 6 }, async () => {
      while (next < SERVICE_HEALTH_TARGETS.length) {
        const target = SERVICE_HEALTH_TARGETS[next++];
        rows.push(
          await bounded(
            checkWebTarget(target, this.fetcher),
            TIMEOUT + 100,
          ).catch(() => ({
            ...target,
            checkedAt: new Date().toISOString(),
            checks: [
              {
                name: "접속 확인",
                state: "unknown" as const,
                detail: "점검 제한 시간을 초과했습니다.",
              },
            ],
          })),
        );
      }
    });
    const infrastructure: HealthCheck[] = [
      {
        name: "공통 API 실행 준비",
        state: this.startup() === "READY" ? "passed" : "failed",
        detail:
          this.startup() === "READY"
            ? "서버 시작 상태 READY"
            : "서버가 준비 상태가 아닙니다.",
      },
    ];
    const database = (async () => {
      try {
        if (!this.db.isInitialized) throw new Error("not initialized");
        await bounded(this.db.query("SELECT 1"), 2500);
        infrastructure.push({
          name: "공통 DB 연결",
          state: "passed",
          detail: "읽기 전용 SELECT 1 응답 확인",
        });
      } catch {
        infrastructure.push({
          name: "공통 DB 연결",
          state: "unknown",
          detail: "DB 연결 또는 응답을 확인하지 못했습니다.",
        });
      }
    })();
    await Promise.all([...workers, database]);
    rows.sort(
      (a, b) =>
        SERVICE_HEALTH_TARGETS.findIndex((x) => x.id === a.id) -
        SERVICE_HEALTH_TARGETS.findIndex((x) => x.id === b.id),
    );
    return {
      checkedAt: new Date().toISOString(),
      cacheSeconds: TTL / 1000,
      services: rows,
      infrastructure,
      scope:
        "기본 접속 점검입니다. 로그인·서비스 식별·권한·가입·승인·결제·AI 실행은 검사하지 않습니다.",
    };
  }
}
