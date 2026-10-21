import { randomUUID } from "node:crypto";
import { runAiExtension } from "@o4o/ai-core";
import { AppDataSource } from "../../database/connection.js";
import { AiQueryPolicy } from "../../entities/AiQueryPolicy.js";
import { executeAccountedAi } from "../../modules/ai-policy/ai-accounted-execution.js";
import { resolveEditingModel } from "../../utils/ai-editing-model-resolver.js";
import { resolveAiApiKey } from "../../utils/ai-key.util.js";
import { requireCommunityManager } from "./community-management.service.js";
import {
  createCommunityNewsExtension,
  type NewsCandidate,
} from "./community-news-policy.js";
import logger from "../../utils/logger.js";

export async function generateNewsSuggestions(
  input: readonly NewsCandidate[],
  actor: string,
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
        actorId: actor,
        audience: "staff",
      },
      materials: [],
      funding: { payer: "platform" },
    },
    {
      invoke: async (prompt) => {
        const result = await executeAccountedAi(
          AppDataSource,
          {
            ...prompt,
            provider: "gemini",
            responseMode: "text",
            config: { apiKey, model, temperature: 0.1, maxTokens: 1800 },
            timeoutMs: 24000,
            retry: { maxAttempts: 1 },
            meta: {
              service: "community",
              callerName: "community.industry-news",
            },
          },
          { scope: "SERVICE_QUERY", serviceKey: "community", userId: actor },
        );
        return { ...result, provider: result.provider ?? "gemini" };
      },
    },
    {
      authorize: async () => {
        await requireCommunityManager(AppDataSource, actor);
        return true;
      },
      record: async (event) => {
        logger.info("[COMMUNITY_NEWS_AI]", event);
      },
    },
  );
  return run.output;
}
