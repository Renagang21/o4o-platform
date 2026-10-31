import type { DataSource } from "typeorm";
import { withAiModelControlLock } from "./model-control-lock.js";
import {
  MODEL_WHITELIST,
  GEMINI_CANONICAL_MODEL,
} from "../../types/ai-proxy.types.js";
import { AI_USAGE_CATALOG } from "./catalog.js";
import { consultationRuntimeSchema, type ConsultationRuntime } from './consultation-runtime.js';

export const MODEL_CONTROL_KEY = "ai:model-controls:v1";
export const MODEL_PROVIDERS = [
  "gemini",
  "openai",
  "claude",
  "qwen",
  "deepseek",
] as const;
export type ModelProvider = (typeof MODEL_PROVIDERS)[number];
export type ModelCapability = "text" | "image" | "grounding" | "speech";
export interface ManagedModel {
  provider: ModelProvider;
  id: string;
  name: string;
  capabilities: ModelCapability[];
}
export interface ModelSelection {
  provider: ModelProvider;
  model: string;
}
interface ModelMutation {
  action: "create" | "update" | "delete" | "select" | "consultation-runtime";
  runtime?: unknown;
  provider?: string;
  id?: string;
  model?: unknown;
  target?: string;
  selection?: ModelSelection | null;
}
interface Control {
  revision: number;
  models: ManagedModel[];
  deleted: string[];
  selections: Record<string, ModelSelection>;
  consultation?: ConsultationRuntime;
}
interface ModelReference {
  kind: "usage" | "policy" | "runtime";
  label: string;
  target?: string;
}
type ModelReferences = Record<string, ModelReference[]>;
type PolicyReference = ModelSelection & {
  label?: string;
  source?: string;
  scope?: string;
};
type Database = Pick<DataSource, "query" | "isInitialized">;
const CAPABILITIES: readonly ModelCapability[] = [
  "text",
  "image",
  "grounding",
  "speech",
];
const keyOf = (provider: string, model: string) => provider + ":" + model;
// These defaults are reached only when the corresponding managed selection is absent.
// Keep this list aligned with the actual callers, not the model catalog/whitelist.
const overridableDefaults: Record<string, string[]> = {
  "gemini:gemini-2.5-pro": ["work.planning.strong"],
  "openai:gpt-5-mini": ["admin.blocks"],
  "openai:gpt-4o-mini": ["lms.quiz", "lms.assignment", "operator.actions"],
  "openai:gpt-4o-mini-tts": ["audio.synthesis.openai"],
  "gemini:gemini-3.1-flash-tts-preview": ["audio.synthesis.gemini"],
  "claude:claude-sonnet-4.5": ["admin.blocks"],
};
const sharedScopes: Record<string, string> = {
  "product.content": "policy.PRODUCT_CONTENT",
  "pharmacy.guidance": "policy.PRODUCT_CONTENT",
  "product.correction-draft": "policy.PRODUCT_CONTENT",
};
// Execution consumers of resolveEditingModel / AiQueryPolicy, not inventory metadata.
const queryPolicyTargets = [
  "service.query",
  "home.chat",
  "home.attachments",
  "research.authenticated",
  "hospital.research",
  "file.structure",
  "hospital.structure",
  "work.planning",
  "work.vision",
  "assistant.understanding",
  "editor.content",
  "editor.url",
  "editor.store-use",
  "lecture.structure",
  "lecture.body",
  "image.analysis",
  "operator.insight",
];
export const modelTargetId = (usage: string) => sharedScopes[usage] ?? usage;
const multiProvider = new Set([
  "home.chat",
  "work.planning",
  "work.planning.strong",
  "work.vision",
  "assistant.understanding",
  "lms.quiz",
  "lms.assignment",
  "operator.insight",
  "operator.actions",
  "supplier.hub",
  "policy.PRODUCT_CONTENT",
  "store.translation",
  "pharmacy.consultation",
  "pharmacy.support",
  "store.overview",
  "supplier.overview",
  "cooperative.overview",
]);
export const MODEL_TARGETS = [
  ...new Map(
    AI_USAGE_CATALOG.filter(
      (x) => x.modelSelectable !== false && !["audio.synthesis", "supplier.hub"].includes(x.id),
    ).map((usage) => {
      const id = modelTargetId(usage.id);
      return [
        id,
        {
          id,
          name: id === 'policy.PRODUCT_CONTENT' ? '상품 콘텐츠·보완 초안·상담 근거 선택' : usage.name,
          providers: (usage.id === "admin.blocks"
            ? ["gemini", "openai", "claude"]
            : multiProvider.has(id)
              ? ["gemini", "openai"]
              : ["gemini"]) as ModelProvider[],
          capability: ([
            "home.attachments",
            "work.vision",
            "image.analysis",
          ].includes(usage.id)
            ? "image"
            : ["research.authenticated", "hospital.research"].includes(usage.id)
              ? "grounding"
              : "text") as ModelCapability,
        },
      ];
    }),
  ).values(),
  {
    id: "work.planning.strong",
    name: "업무 복구 · 강화 모델 (이미지 지원)",
    providers: ["gemini", "openai"] as ModelProvider[],
    capability: "image" as ModelCapability,
  },
  ...(["gemini", "openai"] as const).map((provider) => ({
    id: "audio.synthesis." + provider,
    name: "음성 합성 · " + provider,
    providers: [provider] as ModelProvider[],
    capability: "speech" as ModelCapability,
  })),
];

export class ModelControlError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, code: string, message: string): never => {
  throw new ModelControlError(status, code, message);
};
function defaults(): Control {
  const models: ManagedModel[] = Object.entries(MODEL_WHITELIST).flatMap(
    ([provider, ids]) =>
      ids.map((id) => ({
        provider: provider as ModelProvider,
        id,
        name: id,
        capabilities: (provider === "gemini" &&
        [GEMINI_CANONICAL_MODEL, "gemini-2.5-flash", "gemini-2.5-pro"].includes(
          id,
        )
          ? ["text", "image", "grounding"]
          : ["text", "image"]) as ModelCapability[],
      })),
  );
  models.push(
    {
      provider: "openai",
      id: "gpt-4o-mini",
      name: "gpt-4o-mini",
      capabilities: ["text", "image"],
    },
    {
      provider: "openai",
      id: "gpt-4o-mini-tts",
      name: "gpt-4o-mini-tts",
      capabilities: ["speech"],
    },
    {
      provider: "gemini",
      id: "gemini-3.1-flash-tts-preview",
      name: "gemini-3.1-flash-tts-preview",
      capabilities: ["speech"],
    },
  );
  return { revision: 0, models, deleted: [], selections: {} };
}
function validateModel(input: unknown): ManagedModel {
  const value = input as ManagedModel;
  if (
    !value ||
    !MODEL_PROVIDERS.includes(value.provider) ||
    typeof value.id !== "string" ||
    !/^[a-z][a-z0-9._-]{0,99}$/.test(value.id) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 100 ||
    !Array.isArray(value.capabilities) ||
    !value.capabilities.length ||
    value.capabilities.some((x) => !CAPABILITIES.includes(x)) ||
    new Set(value.capabilities).size !== value.capabilities.length ||
    (value.capabilities.includes("speech") && value.capabilities.length !== 1)
  )
    return fail(
      400,
      "AI_MODEL_INVALID",
      "공급자·모델 ID·이름·지원 기능을 확인해 주세요.",
    );
  return {
    provider: value.provider,
    id: value.id,
    name: value.name.trim(),
    capabilities: [...value.capabilities],
  };
}
function parse(input: unknown): Control {
  const value = input as Control;
  if (
    !value ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !Array.isArray(value.models) ||
    value.models.length > 250 ||
    !Array.isArray(value.deleted) ||
    value.deleted.some((x) => typeof x !== "string") ||
    !value.selections ||
    typeof value.selections !== "object" ||
    Array.isArray(value.selections)
  )
    throw new Error("Invalid model controls");
  const models = value.models.map(validateModel);
  if (
    new Set(models.map((x) => keyOf(x.provider, x.id))).size !== models.length
  )
    throw new Error("Duplicate model");
  const parsed: Control = {
    revision: value.revision,
    models,
    deleted: [...value.deleted],
    selections: { ...value.selections },
    consultation: consultationRuntimeSchema.parse(value.consultation ?? {}),
  };
  const legacyTranslation = parsed.selections["policy.CONTENT_TRANSLATION"];
  if (legacyTranslation) {
    parsed.selections["store.translation"] ??= legacyTranslation;
    parsed.selections["pharmacy.consultation"] ??= legacyTranslation;
    delete parsed.selections["policy.CONTENT_TRANSLATION"];
  }
  for (const [id, selection] of Object.entries(parsed.selections)) {
    checkSelection(parsed, id, selection);
    parsed.selections[id] = {
      provider: selection.provider,
      model: selection.model,
    };
  }
  return parsed;
}
function checkSelection(
  control: Control,
  id: string,
  selection: ModelSelection,
) {
  const target = MODEL_TARGETS.find((x) => x.id === id);
  const model = control.models.find(
    (x) => x.provider === selection?.provider && x.id === selection?.model,
  );
  if (
    !target ||
    !model ||
    !target.providers.includes(model.provider) ||
    !model.capabilities.includes(target.capability)
  )
    fail(
      400,
      "AI_MODEL_INCOMPATIBLE",
      "이 사용처에서 지원하는 등록 모델을 선택해 주세요.",
    );
}

/** One durable document and optimistic revision: catalog and selections change atomically across instances. */
export class ModelControlService {
  constructor(private db: Database) {}
  async read(): Promise<Control> {
    try {
      if (!this.db.isInitialized) return defaults();
      const rows = await this.db.query(
        "SELECT value FROM settings WHERE key=$1",
        [MODEL_CONTROL_KEY],
      );
      return rows.length ? parse(rows[0].value) : defaults();
    } catch {
      return fail(
        503,
        "AI_MODEL_CONTROL_UNAVAILABLE",
        "모델 설정을 확인하지 못했습니다. 다시 조회해 주세요.",
      );
    }
  }
  async snapshot() {
    if (!this.db.isInitialized)
      return fail(
        503,
        "AI_MODEL_CONTROL_UNAVAILABLE",
        "모델 설정을 조회할 수 없습니다.",
      );
    const control = await this.read();
    const modelReferences = this.references(
      control,
      await this.databaseReferences(),
    );
    return {
      ...control,
      protectedModels: Object.keys(modelReferences),
      modelReferences,
      targets: MODEL_TARGETS,
      usageTargets: Object.fromEntries(
        AI_USAGE_CATALOG.map((x) => [x.id, modelTargetId(x.id)]),
      ),
    };
  }
  private references(
    control: Control,
    rows: PolicyReference[],
  ): ModelReferences {
    const refs: ModelReferences = {};
    const add = (key: string, reference: ModelReference) => {
      (refs[key] ??= []).push(reference);
    };
    for (const row of rows) {
      if (!row.provider || !row.model) continue;
      const targets =
        row.source === "query"
          ? queryPolicyTargets
          : row.source === "scope" && row.scope === "PRODUCT_CONTENT"
            ? ["policy.PRODUCT_CONTENT", "pharmacy.support"]
            : row.source === 'scope' && row.scope === 'STORE_INSIGHT'
              ? ['store.overview']
              : row.source === 'scope' && row.scope === 'OPERATOR_INSIGHT'
                ? ['supplier.overview', 'cooperative.overview']
            : row.source === "scope" && row.scope === "CONTENT_TRANSLATION"
              ? ["store.translation", "pharmacy.consultation"]
              : undefined;
      const reference: ModelReference = {
        kind: "policy",
        label:
          row.label ?? "기존 공통·범위·연결 정책 또는 장애 시 대체 모델 설정",
      };
      // News generation still uses resolveEditingModel directly. Managed selections
      // do not replace that shared policy: only an explicit policy change releases it.
      if (row.source === "query")
        add(keyOf(row.provider, row.model), {
          kind: "policy",
          label: "공통 질의 정책 직접 사용 (커뮤니티 뉴스 등)",
        });
      if (targets) {
        for (const target of targets)
          if (!control.selections[target])
            add(keyOf(row.provider, row.model), { ...reference, target });
      } else add(keyOf(row.provider, row.model), reference);
    }
    const usage = (key: string, target: string) =>
      add(key, {
        kind: "usage",
        target,
        label: MODEL_TARGETS.find((x) => x.id === target)!.name,
      });
    for (const [target, x] of Object.entries(control.selections))
      usage(keyOf(x.provider, x.model), target);
    for (const [key, targets] of Object.entries(overridableDefaults))
      for (const target of targets)
        if (!control.selections[target]) usage(key, target);
    // Shared fallback and environment values retain their conservative protection.
    // gemini-2.5-flash is not a managed runtime default; DB policies still protect it when referenced.
    for (const [provider, ids] of Object.entries({
      gemini: [
        GEMINI_CANONICAL_MODEL,
        process.env.AI_DEFAULT_MODEL,
        process.env.AI_STRONG_MODEL,
      ],
      openai: [
        "gpt-6-astra",
        process.env.AI_DEFAULT_MODEL_OPENAI,
        process.env.AI_STRONG_MODEL_OPENAI,
      ],
    }))
      for (const id of ids)
        if (id)
          add(keyOf(provider, id), {
            kind: "runtime",
            label: "공통 기본 실행 경로 또는 서버 환경 설정",
          });
    return refs;
  }
  private async databaseReferences(): Promise<PolicyReference[]> {
    // Disabled policies and fallback references remain protected for later re-enabling.
    return this.db.query(
      "SELECT 'gemini' AS provider,default_model AS model,'공통 질의 기본 모델' AS label,'query' AS source,NULL::text AS scope FROM ai_query_policy UNION ALL SELECT provider,model,'범위별 AI 정책 기본 모델' AS label,'scope' AS source,to_jsonb(p)->>'scope' AS scope FROM ai_llm_policies p UNION ALL SELECT fallback_provider AS provider,fallback_model AS model,'범위별 AI 정책의 장애 시 대체 모델' AS label,'scope' AS source,to_jsonb(p)->>'scope' AS scope FROM ai_llm_policies p WHERE fallback_model IS NOT NULL UNION ALL SELECT provider,COALESCE(to_jsonb(s)->>'defaultmodel',to_jsonb(s)->>'defaultModel',to_jsonb(s)->'config'->>'model',to_jsonb(s)->'config'->>'defaultModel') AS model,'공급자 연결 기본 모델' AS label,'connection' AS source,NULL::text AS scope FROM ai_settings s",
    );
  }
  async change(expected: unknown, actorId: string, mutation: ModelMutation) {
    if (!this.db.isInitialized)
      return fail(
        503,
        "AI_MODEL_CONTROL_UNAVAILABLE",
        "모델 설정을 저장할 수 없습니다.",
      );
    return withAiModelControlLock(this.db as DataSource, async (manager) =>
      new ModelControlService({
        isInitialized: true,
        query: manager.query.bind(manager),
      }).changeLocked(expected, actorId, mutation),
    );
  }
  private async changeLocked(
    expected: unknown,
    actorId: string,
    mutation: ModelMutation,
  ) {
    if (!Number.isSafeInteger(expected) || Number(expected) < 0)
      return fail(
        400,
        "AI_MODEL_REVISION_REQUIRED",
        "최신 목록을 조회한 뒤 저장해 주세요.",
      );
    if (!this.db.isInitialized)
      return fail(
        503,
        "AI_MODEL_CONTROL_UNAVAILABLE",
        "모델 설정을 저장할 수 없습니다.",
      );
    const control = await this.read();
    if (control.revision !== expected)
      return fail(
        409,
        "AI_MODEL_CONTROL_CONFLICT",
        "다른 관리자가 변경했습니다. 최신 목록을 다시 조회해 주세요.",
      );
    let referenceRows: PolicyReference[];
    try {
      referenceRows = await this.databaseReferences();
    } catch {
      return fail(
        503,
        "AI_MODEL_REFERENCES_UNAVAILABLE",
        "현재 실행 설정을 확인하지 못해 변경하지 않았습니다.",
      );
    }
    if (mutation.action === 'consultation-runtime') {
      const parsed = consultationRuntimeSchema.safeParse(mutation.runtime);
      if (!parsed.success) return fail(400, 'CONSULTATION_RUNTIME_INVALID', '상담 실행 수단과 음성 후보 언어를 확인해 주세요.');
      control.consultation = parsed.data;
    } else if (mutation.action === "select") {
      // Old clients may still submit the former shared target during a rolling release.
      const targets =
        mutation.target === "policy.CONTENT_TRANSLATION"
          ? MODEL_TARGETS.filter((x) =>
              ["store.translation", "pharmacy.consultation"].includes(x.id),
            )
          : MODEL_TARGETS.filter((x) => x.id === mutation.target);
      if (!targets.length)
        return fail(400, "AI_MODEL_TARGET_INVALID", "사용처를 확인해 주세요.");
      for (const target of targets) {
        if (mutation.selection === null) delete control.selections[target.id];
        else {
          checkSelection(control, target.id, mutation.selection!);
          control.selections[target.id] = {
            provider: mutation.selection!.provider,
            model: mutation.selection!.model,
          };
        }
      }
    } else {
      const oldKey = keyOf(mutation.provider ?? "", mutation.id ?? "");
      const old = control.models.find(
        (x) => keyOf(x.provider, x.id) === oldKey,
      );
      if (mutation.action !== "create" && !old)
        return fail(404, "AI_MODEL_NOT_FOUND", "모델이 목록에 없습니다.");
      const model =
        mutation.action === "delete" ? null : validateModel(mutation.model);
      const nextKey = model ? keyOf(model.provider, model.id) : "";
      if (
        model &&
        control.models.some(
          (x) =>
            keyOf(x.provider, x.id) === nextKey &&
            (mutation.action === "create" || x !== old),
        )
      )
        return fail(409, "AI_MODEL_ALREADY_EXISTS", "이미 등록된 모델입니다.");
      if (
        old &&
        (nextKey !== oldKey ||
          model?.capabilities.join(",") !== old.capabilities.join(","))
      ) {
        if (this.references(control, referenceRows)[oldKey])
          return fail(
            409,
            "AI_MODEL_IN_USE",
            "현재 설정 또는 기본 실행 모델입니다. 다른 모델로 변경한 후 삭제하거나 ID·지원 기능을 변경해 주세요.",
          );
      }
      control.models = control.models.filter(
        (x) => keyOf(x.provider, x.id) !== oldKey,
      );
      if (model) control.models.push(model);
      if (old && oldKey !== nextKey) control.deleted.push(oldKey);
      control.deleted = [...new Set(control.deleted)].filter(
        (x) => x !== nextKey,
      );
    }
    const modelReferences = this.references(control, referenceRows);
    if (control.deleted.some((key) => modelReferences[key]))
      return fail(
        409,
        "AI_MODEL_REMOVED",
        "지정을 해제하면 삭제한 기본 모델이 다시 필요합니다. 다른 등록 모델을 지정하거나 이전 모델을 다시 등록해 주세요.",
      );
    for (const [key, targets] of Object.entries(overridableDefaults)) {
      const model = control.models.find((x) => keyOf(x.provider, x.id) === key);
      if (model)
        for (const target of targets)
          if (!control.selections[target])
            checkSelection(control, target, {
              provider: model.provider,
              model: model.id,
            });
    }
    if (control.models.length > 250)
      return fail(400, "AI_MODEL_LIMIT", "등록 모델 수 제한을 초과했습니다.");
    control.revision++;
    const value = JSON.stringify({ ...control, updatedBy: actorId });
    try {
      const rows = await this.db.query(
        "INSERT INTO settings(key,value,type,description) VALUES($1,$2::jsonb,'ai-model-controls','AI 모델 목록·사용 모델 지정') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,\"updatedAt\"=NOW() WHERE (settings.value->>'revision')::bigint=$3 RETURNING key",
        [MODEL_CONTROL_KEY, value, expected],
      );
      if (!rows.length)
        return fail(
          409,
          "AI_MODEL_CONTROL_CONFLICT",
          "다른 관리자가 변경했습니다. 최신 목록을 다시 조회해 주세요.",
        );
    } catch (error) {
      if (error instanceof ModelControlError) throw error;
      return fail(
        503,
        "AI_MODEL_CONTROL_UNAVAILABLE",
        "모델 설정을 저장하지 못했습니다. 다시 조회해 주세요.",
      );
    }
    return {
      ...control,
      protectedModels: Object.keys(modelReferences),
      modelReferences,
      targets: MODEL_TARGETS,
      usageTargets: Object.fromEntries(
        AI_USAGE_CATALOG.map((x) => [x.id, modelTargetId(x.id)]),
      ),
    };
  }
  /** Called immediately before the existing adapter. No provider request, key, quota, or parameter policy is replaced. */
  async resolve(
    usage: string,
    fallback: ModelSelection,
  ): Promise<ModelSelection & { managed?: boolean }> {
    const control = await this.read();
    const selection = control.selections[modelTargetId(usage)];
    if (selection) {
      checkSelection(control, modelTargetId(usage), selection);
      return { ...selection, managed: true };
    }
    if (control.deleted.includes(keyOf(fallback.provider, fallback.model)))
      return fail(
        409,
        "AI_MODEL_REMOVED",
        "이 모델은 관리자 목록에서 삭제됐습니다. 사용 모델을 다시 지정해 주세요.",
      );
    return fallback;
  }
  async allows(provider: string, model: string): Promise<boolean | undefined> {
    const control = await this.read();
    if (control.deleted.includes(keyOf(provider, model))) return false;
    const registered = control.models.find(
      (entry) => entry.provider === provider && entry.id === model,
    );
    return registered?.capabilities.includes("text");
  }
}
