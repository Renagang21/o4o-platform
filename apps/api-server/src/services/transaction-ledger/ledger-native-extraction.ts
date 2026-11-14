import {loadAiPriceCatalog,resolveAiPrice} from '../../modules/ai-policy/ai-pricing.js';
import type { DataSource } from "typeorm";
import type { UnifiedAttachment } from "../ai-tools/unified-request-contract.js";
import { readAttachments } from "../ai-tools/attachment-reader.js";
import { executeMultimodalChat } from "../ai-tools/multimodal-chat.js";
import { resolveAiTarget } from "../../utils/ai-provider-runtime.js";
import {
  executeAccountedAi,
  executeAccountedNativeAi,
} from "../../modules/ai-policy/ai-accounted-execution.js";
import { openAiNativeUsage } from "../../modules/ai-policy/ai-native-metering.js";
import { LedgerError } from "./contracts.js";
/** Uses existing admission/accounting for both providers; no silent text-only image fallback. */
export async function extractNativeInvoice(
  db: DataSource,
  userId: string,
  providerInput: unknown,
  attachments: readonly UnifiedAttachment[],
  systemPrompt: string,
  userPrompt: string,
) {
  const target = await resolveAiTarget(
      db,
      providerInput as string,
      "home.attachments",
    ),
    account = { scope: "SERVICE_QUERY" as const, serviceKey: "neture", userId };
  const outputLimit=Math.min(8192,resolveAiPrice(loadAiPriceCatalog(),target.provider,target.model).native?.multimodal?.maxOutputTokens??2048);
  const parts = readAttachments(attachments.filter((a) => a.kind === "image"));
  if (parts.length && !["openai", "gemini"].includes(target.provider))
    throw new LedgerError("LEDGER_IMAGE_PROVIDER_UNSUPPORTED", 422);
  if (target.provider === "openai" && parts.length) {
    return executeAccountedNativeAi(
      db,
      {
        kind: "multimodal",
        provider: "openai",
        model: target.model,
        textBytes: Buffer.byteLength(systemPrompt + userPrompt),
        maxOutputTokens: outputLimit,
      },
      account,
      async () => {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + target.apiKey,
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(90000),
            body: JSON.stringify({
              model: target.model,
              max_completion_tokens: outputLimit,
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content: [
                    { type: "text", text: userPrompt },
                    ...parts
                      .filter((p) => p.kind === "inline")
                      .map((p) => ({
                        type: "image_url",
                        image_url: {
                          url: `data:${p.mimeType};base64,${(p as { base64: string }).base64}`,
                        },
                      })),
                  ],
                },
              ],
            }),
          },
        );
        if (!response.ok)
          throw new LedgerError("LEDGER_EXTRACTION_UNAVAILABLE", 503);
        const data = (await response.json()) as {
          choices?: Array<{
            message?: { content?: string };
            finish_reason?: string;
          }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        if (
          data.choices?.[0]?.finish_reason !== "stop" ||
          !data.choices[0].message?.content
        )
          throw new LedgerError("LEDGER_EXTRACTION_INCOMPLETE", 422);
        return {
          value: data.choices[0].message.content,
          usage: openAiNativeUsage(data),
        };
      },
    );
  }
  const result = await executeMultimodalChat(
    {
      ...target,
      systemPrompt,
      userPrompt,
      parts,
      timeoutMs: 90000,
      maxOutputTokens: outputLimit,
    },
    (request) => executeAccountedAi(db, request, account),
    (request, invoke) => executeAccountedNativeAi(db, request, account, invoke),
  );
  if (parts.length && !result.inlineDelivered)
    throw new LedgerError("LEDGER_IMAGE_PROVIDER_UNSUPPORTED", 422);
  return result.content;
}
