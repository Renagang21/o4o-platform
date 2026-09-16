/**
 * Multimodal Home Chat — 첨부(이미지 · PDF)를 모델에 inline 으로 싣는 1회 호출
 *
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §6
 *
 * `@o4o/ai-core` 의 `execute()` 는 텍스트 전용이라 inline part 를 받지 못한다. Work Agent planner 가 이미 쓰는
 * Gemini generateContent 직접 호출 패턴(work-agent-runtime.createLlmPlanner)을 **같은 형태로** 재사용한다 —
 * 새 provider stack 이 아니다. provider 가 Gemini 가 아니면 inline 을 실을 수 없으므로 텍스트 경로로 돌아가고,
 * 프롬프트에 "이미지/PDF 를 볼 수 없다" 는 사실을 넣어 모델이 본 척하지 않게 한다.
 *
 * 이미지 · PDF base64 는 이 함수의 인자 → 요청 body 로만 흐른다. 로그 · DB · 파일에 쓰지 않는다.
 */

import { execute } from '@o4o/ai-core';
import type { AttachmentPart } from './attachment-reader.js';
import type { RuntimeProvider } from '../../utils/ai-provider-runtime.js';

export interface MultimodalChatInput {
  provider: RuntimeProvider;
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  parts: readonly AttachmentPart[];
  timeoutMs: number;
  /** 테스트 주입용. */
  fetchImpl?: typeof fetch;
}

export interface MultimodalChatResult {
  content: string;
  model: string;
  /** inline 첨부를 실제로 모델에 실었는가(false 면 텍스트 경로 fallback). */
  inlineDelivered: boolean;
}

export const INLINE_NOT_SUPPORTED_NOTE =
  '(주의: 현재 AI 제공자는 이미지·PDF 첨부를 직접 볼 수 없습니다. 첨부 이미지/PDF 의 내용은 모른다고 답하고, 텍스트로 붙은 자료만 사용하세요.)';

export async function executeMultimodalChat(input: MultimodalChatInput): Promise<MultimodalChatResult> {
  const inline = input.parts.filter((p): p is Extract<AttachmentPart, { kind: 'inline' }> => p.kind === 'inline');
  if (inline.length > 0 && input.provider === 'gemini') {
    const fetchImpl = input.fetchImpl ?? fetch;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.systemPrompt }] },
          contents: [
            {
              role: 'user',
              parts: [
                { text: input.userPrompt },
                ...inline.map((p) => ({ inline_data: { mime_type: p.mimeType, data: p.base64 } })),
              ],
            },
          ],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        // 상태코드만 실어 normalizeAiError 가 코드로 접게 한다(원문 · 키는 싣지 않는다).
        throw new Error(`multimodal provider ${response.status}`);
      }
      const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const content = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      return { content, model: input.model, inlineDelivered: true };
    } finally {
      clearTimeout(timer);
    }
  }

  const userPrompt = inline.length > 0 ? `${input.userPrompt}\n\n${INLINE_NOT_SUPPORTED_NOTE}` : input.userPrompt;
  const result = await execute({
    systemPrompt: input.systemPrompt,
    userPrompt,
    provider: input.provider,
    responseMode: 'text',
    config: {
      apiKey: input.apiKey,
      model: input.model,
      temperature: 0.5,
      maxTokens: 2048,
      responseMode: 'text',
      timeoutMs: input.timeoutMs,
    },
    retry: { maxAttempts: 1 },
    meta: { service: 'o4o-home', callerName: 'home-chat' },
  });
  return { content: result.content, model: result.model, inlineDelivered: false };
}
