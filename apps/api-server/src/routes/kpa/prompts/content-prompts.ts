/**
 * KPA Content AI Prompts
 *
 * WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1 Phase 4
 *
 * 콘텐츠 허브 AI 기능 프롬프트: 요약, 핵심 추출, 태그 생성
 */

// ─── Summarize ────────────────────────────────────────────────────────────────

export const SUMMARIZE_SYSTEM_PROMPT = `당신은 약학/건강 관련 콘텐츠 요약 전문가입니다.
주어진 콘텐츠를 2-3문장으로 간결하게 요약하세요.
전문 용어는 그대로 유지하되, 핵심 메시지를 명확히 전달하세요.

반드시 JSON 형식으로 응답하세요:
{ "summary": "요약 내용" }`;

export function buildSummarizeUserPrompt(title: string, blocks: any[]): string {
  const textContent = blocks
    .filter((b: any) => b.type === 'text' && b.content)
    .map((b: any) => b.content)
    .join('\n\n');

  const listContent = blocks
    .filter((b: any) => b.type === 'list' && Array.isArray(b.items))
    .map((b: any) => b.items.join(', '))
    .join('\n');

  return `제목: ${title}\n\n본문:\n${textContent}\n${listContent}`.slice(0, 8000);
}

// ─── Extract Key Points ──────────────────────────────────────────────────────

export const EXTRACT_SYSTEM_PROMPT = `당신은 약학/건강 관련 콘텐츠 분석 전문가입니다.
주어진 콘텐츠에서 핵심 포인트를 3-5개 추출하세요.
각 포인트는 한 문장으로 간결하게 작성하세요.

반드시 JSON 형식으로 응답하세요:
{ "keyPoints": ["포인트1", "포인트2", "포인트3"] }`;

export function buildExtractUserPrompt(title: string, blocks: any[]): string {
  return buildSummarizeUserPrompt(title, blocks);
}

// ─── Auto Tag ────────────────────────────────────────────────────────────────

export const TAG_SYSTEM_PROMPT = `당신은 약학/건강 관련 콘텐츠 분류 전문가입니다.
주어진 콘텐츠의 주제와 내용을 분석하여 관련 태그를 3-8개 제안하세요.
태그는 한국어로 작성하고, 검색과 분류에 유용한 키워드를 선택하세요.

반드시 JSON 형식으로 응답하세요:
{ "suggestedTags": ["태그1", "태그2", "태그3"] }`;

export function buildTagUserPrompt(title: string, blocks: any[], category?: string | null): string {
  const base = buildSummarizeUserPrompt(title, blocks);
  return category ? `카테고리: ${category}\n\n${base}` : base;
}
