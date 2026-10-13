import type { AiBusinessExtension } from '@o4o/ai-core';
import { CONTENT_TRANSLATION_PROMPT, TRANSLATION_LOCALE_NAMES } from '@o4o/ai-prompts/store';
import type { TranslationLocale } from '@o4o/ai-prompts/store';

export interface ContentTranslationInput {
  title: string;
  html: string;
  targetLocale: TranslationLocale;
}
export interface TranslatedContent { title: string; html: string }

/** Business rules only. Provider/model/funding and persistence belong to the host runtime. */
export const contentTranslationExtension: AiBusinessExtension<ContentTranslationInput, TranslatedContent> = {
  id: 'content.translation',
  operation: 'draft',
  prepare(input) {
    if (typeof input.title !== 'string' || typeof input.html !== 'string' ||
        !Object.hasOwn(TRANSLATION_LOCALE_NAMES, input.targetLocale) ||
        (!input.title.trim() && !input.html)) throw new Error('Invalid translation input');
    return { systemPrompt: CONTENT_TRANSLATION_PROMPT.system, userPrompt: CONTENT_TRANSLATION_PROMPT.user(input) };
  },
  parse(content) {
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' ||
        typeof (parsed as TranslatedContent).title !== 'string' ||
        typeof (parsed as TranslatedContent).html !== 'string') throw new Error('Invalid translation result');
    const { title, html } = parsed as TranslatedContent;
    return { title, html };
  },
};
