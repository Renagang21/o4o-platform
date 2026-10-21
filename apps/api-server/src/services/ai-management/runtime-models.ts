import type { DataSource } from "typeorm";
import {
  execute,
  type ExecuteRequest,
  type AIExecuteProviderId,
} from "@o4o/ai-core";
import { ModelControlService, type ModelProvider } from "./model-controls.js";
import { resolveAiApiKey } from "../../utils/ai-key.util.js";

/** Apply administrator selection before the existing transport or accounting admission. */
export async function prepareManagedAiRequest(
  db: DataSource,
  usage: string,
  request: ExecuteRequest,
): Promise<ExecuteRequest> {
  const config =
    typeof request.config === "function"
      ? await request.config()
      : request.config;
  const provider = request.provider ?? "gemini";
  const selected = await new ModelControlService(db).resolve(usage, {
    provider,
    model: config.model,
  });
  if (selected.provider !== "gemini" && selected.provider !== "openai")
    throw new Error("AI_PROVIDER_UNSUPPORTED");
  const apiKey =
    selected.provider === provider && (!selected.managed || config.apiKey)
      ? config.apiKey
      : await resolveAiApiKey(db, selected.provider);
  if (selected.managed && !apiKey) throw new Error("AI_NOT_CONFIGURED");
  return {
    ...request,
    provider: selected.provider as AIExecuteProviderId,
    config: { ...config, model: selected.model, apiKey },
  };
}
export async function executeManagedAi(
  db: DataSource,
  usage: string,
  request: ExecuteRequest,
) {
  return execute(await prepareManagedAiRequest(db, usage, request));
}

/** Direct multimodal adapters retain their own request/response and parameter contracts. */
export async function resolveManagedAiTarget<
  T extends { provider: string; model: string; apiKey: string },
>(db: DataSource, usage: string, fallback: T): Promise<T> {
  const selected = await new ModelControlService(db).resolve(usage, {
    provider: fallback.provider as ModelProvider,
    model: fallback.model,
  });
  const apiKey =
    selected.provider === fallback.provider &&
    (!selected.managed || fallback.apiKey)
      ? fallback.apiKey
      : await resolveAiApiKey(
          db,
          selected.provider as "gemini" | "openai" | "claude",
        );
  if (selected.managed && !apiKey) throw new Error("AI_NOT_CONFIGURED");
  return { ...fallback, ...selected, apiKey };
}
