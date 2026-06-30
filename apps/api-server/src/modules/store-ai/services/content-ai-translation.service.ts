import type { DataSource } from 'typeorm';
import { CONTENT_TRANSLATION_PROMPT } from '@o4o/ai-prompts/store';
import type { TranslationLocale } from '@o4o/ai-prompts/store';
import { createPolicyExecutor } from '../../ai-policy/ai-policy-factory.js';
import type { AiPolicyExecutorService } from '../../ai-policy/ai-policy-executor.service.js';

/**
 * ContentTranslationService — WO-O4O-KPA-CONTENT-MULTILINGUAL-TRANSLATION-V1
 *
 * 매장 콘텐츠(kpa_store_contents)의 title + content_json.html 을 대상 언어로 번역.
 * - 마크업/인라인 style 유지, 사람이 읽는 텍스트만 번역 (프롬프트 규칙).
 * - AiPolicyExecutorService(scope=CONTENT_TRANSLATION) 재사용 → retry/policy/usage logging 위임.
 * - HTML 은 길 수 있으므로 maxTokens override(6000).
 */

export interface TranslatedContent {
  title: string;
  html: string;
}

export type { TranslationLocale } from '@o4o/ai-prompts/store';

const TRANSLATE_MAX_TOKENS = 6000;

export class ContentTranslationService {
  private aiPolicyExecutor: AiPolicyExecutorService;

  constructor(dataSource: DataSource) {
    this.aiPolicyExecutor = createPolicyExecutor(dataSource);
  }

  /**
   * 단일 언어 번역. 실패 시 null.
   */
  async translate(
    title: string,
    html: string,
    targetLocale: TranslationLocale,
  ): Promise<{ result: TranslatedContent; model: string } | null> {
    try {
      const userPrompt = CONTENT_TRANSLATION_PROMPT.user({ title, html, targetLocale });
      const out = await this.aiPolicyExecutor.execute(
        'CONTENT_TRANSLATION',
        CONTENT_TRANSLATION_PROMPT.system,
        userPrompt,
        { maxTokens: TRANSLATE_MAX_TOKENS, temperature: 0.2 },
      );

      const parsed = JSON.parse(out.content) as Partial<TranslatedContent>;
      if (typeof parsed.title !== 'string' || typeof parsed.html !== 'string') {
        console.error('[ContentTranslation] Invalid LLM response shape', {
          targetLocale,
          raw: out.content.slice(0, 200),
        });
        return null;
      }
      return { result: { title: parsed.title, html: parsed.html }, model: out.model };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[ContentTranslation] translate failed:', { targetLocale, error: msg });
      return null;
    }
  }
}
