import { requireNewsAutomationEnabled } from "./community-news-review.service.js";
import { randomUUID } from "node:crypto";
import { runAiExtension } from "@o4o/ai-core";
import { AppDataSource } from "../../database/connection.js";
import { AiQueryPolicy } from "../../entities/AiQueryPolicy.js";
import { createAccountedExtensionRuntime } from "../ai-extensions/accounted-runtime.js";
import { resolveEditingModel } from "../../utils/ai-editing-model-resolver.js";
import { resolveAiApiKey } from "../../utils/ai-key.util.js";
import { requireCommunityManager } from "./community-management.service.js";
import {
  createCommunityNewsExtension,
  type NewsCandidate,
} from "./community-news-policy.js";
import logger from "../../utils/logger.js";

async function generate(
  input: readonly NewsCandidate[],
  actor: string | undefined,
) {
  const policy = await AppDataSource.getRepository(AiQueryPolicy).findOneBy({
    id: 1,
  });
  if (!policy?.aiEnabled) throw new Error("AI_DISABLED");
  const apiKey = await resolveAiApiKey(AppDataSource, "gemini");
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  const model = await resolveEditingModel();
  const run = await runAiExtension(
    {
      extension: createCommunityNewsExtension(input),
      input: undefined,
      context: {
        requestId: randomUUID(),
        serviceId: "community",
        featureId: "industry-news",
        actorId: actor ?? "community-news-scheduler",
        audience: "staff",
      },
      materials: [],
      funding: { payer: "platform" },
    },
    createAccountedExtensionRuntime(AppDataSource, {
      request: { provider: 'gemini', responseMode: 'text',
        config: { apiKey, model, temperature: 0.1, maxTokens: 1800 },
        timeoutMs: 24000, retry: { maxAttempts: 1 },
        meta: { service: 'community', callerName: 'community.industry-news' } },
      accounting: { scope: 'SERVICE_QUERY', serviceKey: 'community', userId: actor },
    }),
    {
      authorize: async () => {
        if (actor) await requireCommunityManager(AppDataSource, actor, false, 'editorial');
        else await requireNewsAutomationEnabled(AppDataSource);
        return true;
      },
      record: async (event) => {
        logger.info("[COMMUNITY_NEWS_AI]", event);
      },
    },
  );
  return run.output;
}

export function generateNewsSuggestions(
  input: readonly NewsCandidate[],
  actor: string,
) {
  return generate(input, actor);
}
/** Server job only: platform-funded draft work, with no impersonated user or publication authority. */
export function generateScheduledNewsSuggestions(
  input: readonly NewsCandidate[],
) {
  return generate(input, undefined);
}
