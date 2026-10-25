import { z } from "zod";
import { unifiedApi } from "./unified-client";

const state = z.enum(["stored", "missing", "unavailable", "code", "runtime"]);
const definition = z.object({
  id: z.string(),
  evidenceId: z.string(),
  name: z.string(),
  group: z.string(),
  capability: z.string(),
  selection: z.string(),
  accounting: z.enum(["connected", "partial", "unconnected"]),
  stop: z.enum(["query", "scope", "none"]),
  scope: z.string().optional(),
  note: z.string(),
  application: z.literal("unverified"),
  configuration: z.object({
    state,
    model: z.string().nullable(),
    provider: z.string().nullable(),
    enabled: z.boolean().nullable(),
    description: z.string(),
  }),
});
const snapshot = z
  .object({
    observedAt: z.string().datetime(),
    notice: z.string(),
    queryPolicyRead: z.enum(["read", "unavailable"]),
    scopePolicyRead: z.enum(["read", "unavailable"]),
    groups: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        serviceKey: z.string().nullable(),
      }),
    ),
    usages: z.array(definition),
    providers: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        support: z.string(),
        credential: z.enum(["present", "missing", "unknown", "unsupported"]),
        databaseRead: z.enum(["read", "unavailable", "not-applicable"]),
        models: z.array(z.string()),
        modelSource: z.literal("code"),
      }),
    ),
    nonApiItems: z.array(
      z.object({ name: z.string(), status: z.string(), note: z.string() }),
    ),
  })
  .superRefine((value, ctx) => {
    const ids = new Set(value.usages.map((item) => item.id));
    const groups = new Set(value.groups.map((item) => item.id));
    if (
      ids.size !== value.usages.length ||
      value.usages.some((item) => !groups.has(item.group))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid usage catalog",
      });
    }
  });
const count = z.number().int().nonnegative().safe();
const money = z.string().regex(/^\d+\.\d{8}$/);
const totals = z.object({
  records: count,
  successes: count,
  errors: count,
  unpriced: count,
  unmetered: count,
  input: count,
  output: count,
  cost: money,
});
const usage = z.object({
  period: z.object({
    days: z.union([z.literal(7), z.literal(30), z.literal(90)]),
    timezone: z.literal("Asia/Seoul"),
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  coverage: z.literal("partial"),
  notice: z.string(),
  total: totals,
  groups: z.array(
    totals.extend({
      provider: z.string(),
      model: z.string(),
      scope: z.string().nullable(),
      relatedUsages: z.array(z.string()),
    }),
  ),
});
export type AiManagementSnapshot = z.infer<typeof snapshot>;
export type AiRecordedUsage = z.infer<typeof usage>;
export type AiUsageEntry = z.infer<typeof definition>;

async function get<T extends z.ZodTypeAny>(
  path: string,
  schema: T,
): Promise<z.infer<T>> {
  const response = await unifiedApi.raw.get(path);
  const parsed = z
    .object({ success: z.literal(true), data: schema })
    .safeParse(response.data);
  if (!parsed.success) throw new Error("AI 운영 응답을 확인할 수 없습니다.");
  return parsed.data.data;
}
export const getAiManagement = () => get("/ai/admin/management", snapshot);
export const getAiRecordedUsage = (days: 7 | 30 | 90) =>
  get(`/ai/admin/management/usage?days=${days}`, usage);

const modelProvider = z.enum([
  "gemini",
  "openai",
  "claude",
  "qwen",
  "deepseek",
]);
const managedModel = z.object({
  provider: modelProvider,
  id: z.string(),
  name: z.string(),
  capabilities: z.array(z.enum(["text", "image", "grounding", "speech"])),
});
const selection = z.object({ provider: modelProvider, model: z.string() });
const modelControls = z.object({
  revision: z.number().int().nonnegative().safe(),
  models: z.array(managedModel),
  deleted: z.array(z.string()),
  selections: z.record(selection),
  targets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      providers: z.array(modelProvider),
      capability: z.enum(["text", "image", "grounding", "speech"]),
    }),
  ),
  usageTargets: z.record(z.string()),
  protectedModels: z.array(z.string()),
  modelReferences: z
    .record(
      z.array(
        z.object({
          kind: z.enum(["usage", "policy", "runtime"]),
          label: z.string(),
          target: z.string().optional(),
        }),
      ),
    )
    .default({}),
});
export type AiModelControls = z.infer<typeof modelControls>;
export type ManagedAiModel = z.infer<typeof managedModel>;
export type AiModelSelection = z.infer<typeof selection>;
const modelBase = "/ai/admin/management";
export const getAiModelControls = () =>
  get(modelBase + "/models", modelControls);
async function writeModelControl(
  action: () => Promise<{ data: unknown }>,
): Promise<AiModelControls> {
  const response = await action();
  const parsed = z
    .object({ success: z.literal(true), data: modelControls })
    .safeParse(response.data);
  if (!parsed.success)
    throw new Error(
      "저장 응답을 확인하지 못했습니다. 최신 목록을 다시 조회해 주세요.",
    );
  return parsed.data.data;
}
export const createAiModel = (model: ManagedAiModel, revision: number) =>
  writeModelControl(() =>
    unifiedApi.raw.post(modelBase + "/models", { model, revision }),
  );
export const updateAiModel = (
  previous: ManagedAiModel,
  model: ManagedAiModel,
  revision: number,
) =>
  writeModelControl(() =>
    unifiedApi.raw.put(
      modelBase +
        "/models/" +
        encodeURIComponent(previous.provider) +
        "/" +
        encodeURIComponent(previous.id),
      { model, revision },
    ),
  );
export const deleteAiModel = (model: ManagedAiModel, revision: number) =>
  writeModelControl(() =>
    unifiedApi.raw.delete(
      modelBase +
        "/models/" +
        encodeURIComponent(model.provider) +
        "/" +
        encodeURIComponent(model.id),
      { data: { revision } },
    ),
  );
export const selectAiModel = (
  target: string,
  selection: AiModelSelection | null,
  revision: number,
) =>
  writeModelControl(() =>
    unifiedApi.raw.put(
      modelBase + "/model-selections/" + encodeURIComponent(target),
      { selection, revision },
    ),
  );
