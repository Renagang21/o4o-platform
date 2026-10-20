import type { DataSource } from "typeorm";
import { getServiceName } from "../../config/service-catalog.js";
import {
  GEMINI_CANONICAL_MODEL,
  MODEL_WHITELIST,
} from "../../types/ai-proxy.types.js";
import {
  AI_USAGE_CATALOG,
  AI_NON_API_ITEMS,
  type AiUsageDefinition,
} from "./catalog.js";

type Database = Pick<DataSource, "query" | "isInitialized">;
type ReadResult<T> =
  | { state: "read"; value: T }
  | { state: "unavailable"; value: null };
interface PolicyRow {
  scope?: string;
  provider?: string;
  model: string;
  enabled: boolean;
}
interface Configuration {
  state: "stored" | "missing" | "unavailable" | "code" | "runtime";
  model: string | null;
  provider: string | null;
  enabled: boolean | null;
  description: string;
}
const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    envName: "GEMINI_API_KEY",
    support: "텍스트·일부 이미지/PDF·검색 근거·음성 합성",
  },
  {
    id: "openai",
    name: "OpenAI (ChatGPT API)",
    envName: "OPENAI_API_KEY",
    support: "텍스트·업무 화면 판독·음성 합성",
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    envName: "CLAUDE_API_KEY",
    support: "일반 블록 생성 경로에 한정",
  },
  {
    id: "qwen",
    name: "Qwen",
    envName: "QWEN_API_KEY",
    support: "허용된 저위험 편집 출력에 한정",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    envName: null,
    support: "현재 공통 실행 경로의 실제 연결 미확인",
  },
] as const;
const codeModel = (description: string): Configuration => ({
  state: "code",
  model: GEMINI_CANONICAL_MODEL,
  provider: "gemini",
  enabled: null,
  description,
});

/** No provider network, initialization writes, raw keys, prompts, or per-user history. */
export class AiManagementService {
  constructor(
    private readonly db: Database,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  private async read<T>(
    sql: string,
    params?: unknown[],
  ): Promise<ReadResult<T>> {
    try {
      if (!this.db.isInitialized) throw new Error("DB_NOT_INITIALIZED");
      return { state: "read", value: await this.db.query(sql, params) };
    } catch {
      return { state: "unavailable", value: null };
    }
  }

  async snapshot() {
    const [query, policies, credentials] = await Promise.all([
      this.read<PolicyRow[]>(
        "SELECT default_model AS model, ai_enabled AS enabled FROM ai_query_policy WHERE id = 1",
      ),
      this.read<PolicyRow[]>(
        "SELECT scope, provider, model, is_enabled AS enabled FROM ai_llm_policies WHERE scope = ANY($1)",
        [["PRODUCT_CONTENT", "CONTENT_TRANSLATION"]],
      ),
      // Resolve presence in SQL; credential values never enter this service or its response.
      this.read<{ provider: string; configured: boolean }[]>(
        `SELECT provider,
        BOOL_OR("isEnabled" = true AND NULLIF(BTRIM("apiKey"), '') IS NOT NULL) AS configured
        FROM ai_settings WHERE provider = ANY($1) GROUP BY provider`,
        [["gemini", "openai", "claude"]],
      ),
    ]);
    const groups = [
      { id: "shared", name: "서비스 공통", serviceKey: null },
      { id: "neture", name: getServiceName("neture"), serviceKey: "neture" },
      { id: "hospital", name: "병원약국 공개 도구", serviceKey: null },
      { id: "editor", name: "편집·관리자 공통", serviceKey: null },
      { id: "product", name: "O4O 상품 DB", serviceKey: null },
      { id: "store", name: "매장 공통", serviceKey: null },
      {
        id: "kpa-society",
        name: getServiceName("kpa-society"),
        serviceKey: "kpa-society",
      },
      { id: "lecture", name: getServiceName("lecture"), serviceKey: "lecture" },
    ];
    const usages = AI_USAGE_CATALOG.map((definition) => ({
      ...definition,
      configuration: this.configuration(definition, query, policies),
      application: "unverified" as const,
    }));
    const providers = PROVIDERS.map((provider) => {
      const supported = provider.id !== "deepseek";
      const environmentPresent = !!(
        provider.envName && this.env[provider.envName]?.trim()
      );
      const databasePresent =
        credentials.value?.some(
          (row) => row.provider === provider.id && row.configured === true,
        ) ?? false;
      const credential = !supported
        ? "unsupported"
        : environmentPresent || databasePresent
          ? "present"
          : provider.id === "qwen" || credentials.state === "read"
            ? "missing"
            : "unknown";
      return {
        id: provider.id,
        name: provider.name,
        support: provider.support,
        credential,
        databaseRead:
          provider.id === "qwen" || !supported
            ? "not-applicable"
            : credentials.state,
        models:
          provider.id in MODEL_WHITELIST
            ? [...MODEL_WHITELIST[provider.id as keyof typeof MODEL_WHITELIST]]
            : [],
        modelSource: "code" as const,
      };
    });
    return {
      observedAt: new Date().toISOString(),
      groups,
      usages,
      providers,
      nonApiItems: AI_NON_API_ITEMS,
      queryPolicyRead: query.state,
      scopePolicyRead: policies.state,
      notice:
        "소스 연결과 저장 설정 조회입니다. 실행 적용·운영 이용·공급자 인증 성공은 확인하지 않았습니다.",
    };
  }

  private configuration(
    def: AiUsageDefinition,
    query: ReadResult<PolicyRow[]>,
    policies: ReadResult<PolicyRow[]>,
  ): Configuration {
    if (def.selection === "scope") {
      if (policies.state === "unavailable")
        return {
          state: "unavailable",
          model: null,
          provider: null,
          enabled: null,
          description: "정책을 조회하지 못했습니다.",
        };
      const row = policies.value.find((policy) => policy.scope === def.scope);
      return row
        ? {
            state: "stored",
            model: row.model,
            provider: row.provider ?? null,
            enabled: row.enabled,
            description:
              "저장된 공통 정책값입니다. 실행기 캐시·실제 호출 적용은 미확인입니다.",
          }
        : {
            state: "missing",
            model: null,
            provider: null,
            enabled: null,
            description: `등록 정책 없음. 기존 실행기는 ${GEMINI_CANONICAL_MODEL} 기본값으로 대체할 수 있습니다.`,
          };
    }
    if (def.selection === "fixed")
      return codeModel(
        "코드 기본값입니다. 관리자 모델 설정과 연결되지 않았습니다.",
      );
    if (["query", "editing", "editing-provider"].includes(def.selection)) {
      if (query.state === "unavailable")
        return {
          state: "unavailable",
          model: null,
          provider: null,
          enabled: null,
          description:
            "공통 모델 설정을 조회하지 못했습니다. 기본 모델을 조회 성공처럼 표시하지 않습니다.",
        };
      const row = query.value[0];
      if (!row)
        return {
          state: "missing",
          model: null,
          provider: null,
          enabled: null,
          description:
            "저장된 공통 질의 정책이 없습니다. 이 조회는 정책을 생성하지 않습니다.",
        };
      return {
        state: "stored",
        model: row.model,
        provider: def.selection === "editing-provider" ? null : "gemini",
        enabled: def.stop === "query" ? row.enabled : null,
        description:
          def.selection === "query"
            ? "공통 질의의 저장 모델·사용 여부입니다."
            : "저장된 선택값입니다. 허용 모델·출력 종류·연결 상태에 따라 실제 모델은 대체될 수 있습니다. 공통 질의의 중지값은 적용되지 않습니다.",
      };
    }
    const description: Partial<Record<AiUsageDefinition["selection"], string>> =
      {
        runtime:
          "요청·서버 공급자 설정에 따라 결정됩니다. Gemini는 공통 모델값, OpenAI는 서버 기본값을 사용합니다.",
        strong:
          "일반/강화 모델이 분리되어 있습니다. 각 단계의 서버·공통 모델 설정을 실행 시 해석합니다.",
        environment:
          "서버 인증 연결 유무로 Gemini 또는 OpenAI와 코드 모델을 선택합니다. 연결이 없으면 규칙 결과로 대체합니다.",
        request:
          "요청 공급자·모델을 허용 목록으로 검증합니다. 현재 화면에서 결정하지 않습니다.",
        "legacy-hub":
          "이전 실행기의 기본 모델·서버 설정을 사용합니다. 현행 화면 이용은 미확인입니다.",
        tts: "요청 공급자와 서버의 음성 전용 고정 모델을 사용합니다.",
      };
    return {
      state: "runtime",
      model: null,
      provider: null,
      enabled: null,
      description: description[def.selection]!,
    };
  }

  async usage(days: number, now = new Date()) {
    const period = usagePeriod(days, now);
    // Historical usage has scope but no reliable per-row service/feature attribution.
    const rows = await this.read<UsageRow[]>(
      `SELECT provider::text AS provider, model, scope,
      COUNT(*)::text AS records,
      COUNT(*) FILTER (WHERE status = 'success')::text AS successes,
      COUNT(*) FILTER (WHERE status = 'error')::text AS errors,
      COUNT(*) FILTER (WHERE "costEstimated" IS NULL)::text AS unpriced,
      COUNT(*) FILTER (WHERE "promptTokens" IS NULL OR "completionTokens" IS NULL)::text AS unmetered,
      COALESCE(SUM("promptTokens"), 0)::text AS input,
      COALESCE(SUM("completionTokens"), 0)::text AS output,
      COALESCE(SUM("costEstimated"), 0)::text AS cost
      FROM ai_usage_logs WHERE "createdAt" >= $1 AND "createdAt" < $2
      GROUP BY provider, model, scope ORDER BY provider, model, scope`,
      [period.from, period.to],
    );
    if (rows.state === "unavailable")
      throw new AiManagementError(
        503,
        "AI_USAGE_UNAVAILABLE",
        "사용량을 조회하지 못했습니다. 0건으로 판단할 수 없습니다.",
      );
    const groups = rows.value.map((row) => ({
      provider: row.provider,
      model: row.model,
      scope: row.scope || null,
      records: count(row.records),
      successes: count(row.successes),
      errors: count(row.errors),
      unpriced: count(row.unpriced),
      unmetered: count(row.unmetered),
      input: count(row.input),
      output: count(row.output),
      cost: money(row.cost),
      relatedUsages: AI_USAGE_CATALOG.filter(
        (def) => def.scope === row.scope,
      ).map((def) => def.name),
    }));
    const total = groups.reduce(
      (sum, group) => ({
        records: sum.records + group.records,
        successes: sum.successes + group.successes,
        errors: sum.errors + group.errors,
        unpriced: sum.unpriced + group.unpriced,
        unmetered: sum.unmetered + group.unmetered,
        input: sum.input + group.input,
        output: sum.output + group.output,
        cost: sum.cost + decimalUnits(group.cost),
      }),
      {
        records: 0,
        successes: 0,
        errors: 0,
        unpriced: 0,
        unmetered: 0,
        input: 0,
        output: 0,
        cost: 0n,
      },
    );
    for (const [key, value] of Object.entries(total))
      if (key !== "cost") count(value);
    return {
      period,
      groups,
      total: { ...total, cost: formatMoney(total.cost) },
      coverage: "partial" as const,
      notice:
        "기존 원장에 기록된 건만 집계합니다. 기록 건수는 실제 유료 시도 수와 다를 수 있고, 미연결 호출은 제외됩니다. 추정 비용은 공급자 청구가 아닙니다. 서비스·기능별 전체 통계는 아직 연결되지 않았습니다.",
    };
  }
}

interface UsageRow {
  provider: string;
  model: string;
  scope: string | null;
  records: string;
  successes: string;
  errors: string;
  unpriced: string;
  unmetered: string;
  input: string;
  output: string;
  cost: string;
}
export class AiManagementError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function usagePeriod(days: number, now: Date) {
  if (![7, 30, 90].includes(days) || !Number.isFinite(now.getTime()))
    throw new AiManagementError(
      400,
      "AI_USAGE_PERIOD_INVALID",
      "조회 기간은 7일, 30일, 90일 중 선택하세요.",
    );
  const day = 86_400_000;
  const midnight =
    Math.floor((now.getTime() + 9 * 3_600_000) / day) * day - 9 * 3_600_000;
  return {
    days,
    timezone: "Asia/Seoul",
    from: new Date(midnight - (days - 1) * day).toISOString(),
    to: now.toISOString(),
  };
}
function count(value: unknown): number {
  if (!/^\d+$/.test(String(value)))
    throw new AiManagementError(
      503,
      "AI_USAGE_INVALID",
      "사용량 기록을 확인할 수 없습니다.",
    );
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0)
    throw new AiManagementError(
      503,
      "AI_USAGE_INVALID",
      "사용량 기록 범위를 확인할 수 없습니다.",
    );
  return result;
}
function decimalUnits(value: string): bigint {
  if (!/^\d+(\.\d{1,8})?$/.test(value))
    throw new AiManagementError(
      503,
      "AI_USAGE_INVALID",
      "비용 기록을 확인할 수 없습니다.",
    );
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
}
function formatMoney(value: bigint): string {
  return `${value / 100_000_000n}.${String(value % 100_000_000n).padStart(8, "0")}`;
}
function money(value: string): string {
  return formatMoney(decimalUnits(value));
}
