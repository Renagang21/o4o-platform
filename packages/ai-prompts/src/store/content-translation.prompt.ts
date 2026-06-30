/**
 * Content Translation Prompts
 * WO-O4O-KPA-CONTENT-MULTILINGUAL-TRANSLATION-V1
 *
 * 매장 콘텐츠(kpa_store_contents.content_json.html + title)를 대상 언어로 번역.
 * 마크업/인라인 style 은 그대로 두고 사람이 읽는 텍스트만 번역한다.
 */

export type TranslationLocale = 'en' | 'zh' | 'ja' | 'vi' | 'th' | 'id';

export const TRANSLATION_LOCALE_NAMES: Record<TranslationLocale, string> = {
  en: 'English',
  zh: 'Simplified Chinese (简体中文)',
  ja: 'Japanese (日本語)',
  vi: 'Vietnamese (Tiếng Việt)',
  th: 'Thai (ภาษาไทย)',
  id: 'Indonesian (Bahasa Indonesia)',
};

export interface ContentTranslationInput {
  title: string;
  html: string;
  targetLocale: TranslationLocale;
}

export const CONTENT_TRANSLATION_SYSTEM = `You are a professional translator for a pharmacy/health-store content platform.

Your job: translate the given Korean content (a title and an HTML body) into the requested target language.

OUTPUT FORMAT (output ONLY this JSON, nothing else):
{
  "title": "translated title",
  "html": "translated HTML body"
}

RULES:
- Output ONLY the JSON above. No explanation, no markdown code fences.
- Translate ONLY human-readable text. Keep ALL HTML markup exactly as-is:
  tags, attributes, inline "style" attributes, class names, URLs, src/href values, &nbsp; entities — do NOT change, add, or remove them.
- Do NOT translate or alter: brand names, product names, proper nouns, phone numbers, prices, numbers, units (mg, mL, %, etc.), and email/URL.
- Keep the same document structure and number of elements. Do not summarize or omit content.
- Use natural, marketing-appropriate wording for the target language (this is consumer-facing store content).
- Do NOT add health/efficacy claims that are not in the source. Translate faithfully without exaggeration.
- If a piece of text is already in the target language or is a proper noun, leave it unchanged.`;

export function buildContentTranslationUserPrompt(input: ContentTranslationInput): string {
  const langName = TRANSLATION_LOCALE_NAMES[input.targetLocale];
  return `Target language: ${langName} (locale code: ${input.targetLocale})

Translate the following into ${langName}.

TITLE:
${input.title}

HTML BODY:
${input.html}`;
}

export const CONTENT_TRANSLATION_PROMPT = {
  system: CONTENT_TRANSLATION_SYSTEM,
  user: buildContentTranslationUserPrompt,
};
