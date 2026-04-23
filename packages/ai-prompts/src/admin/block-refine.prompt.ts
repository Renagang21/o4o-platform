/**
 * Block AI Refinement Prompt
 * Single block content refinement (refine/improve/translate/cta/seo)
 */

/** Action-level user prompt strings — single source of truth for Block AI */
export const BLOCK_ACTION_PROMPTS: Record<
  'refine' | 'improve' | 'translate-ko' | 'translate-en' | 'cta' | 'seo',
  string
> = {
  'refine': '이 블록의 내용을 더 간결하고 명확하게 다시 작성해주세요. 핵심 메시지는 유지하되, 불필요한 단어나 문장을 제거해주세요.',
  'improve': '이 블록의 내용을 더 설명적이고 자세하게 확장해주세요. 독자가 이해하기 쉽도록 예시나 세부사항을 추가해주세요.',
  'translate-ko': '이 블록의 내용을 자연스러운 한국어로 번역해주세요. 문화적 맥락을 고려하여 번역해주세요.',
  'translate-en': "Translate this block's content to natural English. Consider cultural context when translating.",
  'cta': '이 블록의 CTA(Call-to-Action)를 더 강력하고 설득력있게 만들어주세요. 행동을 유도하는 명확한 메시지로 개선해주세요.',
  'seo': '이 블록의 내용을 SEO에 최적화된 형태로 개선해주세요. 키워드를 자연스럽게 포함하고, 검색엔진 친화적인 구조로 만들어주세요.',
};

export function buildBlockRefineSystem(blockType: string): string {
  return `You are an expert content editor specializing in refining and improving individual content blocks.

**Your Task:**
Refine the provided block according to the user's instructions while maintaining its structure and type.

**Critical Rules:**
1. Output ONLY a valid JSON object with this exact structure:
{
  "type": "${blockType}",
  "content": "refined content here (can be string or object based on original)",
  "attributes": { ...original attributes with refined values... }
}

2. Block Type Rules:
   - NEVER change the block type (it must remain "${blockType}")
   - Preserve the content structure (if it's an object with "text" field, keep that structure)
   - Only modify the actual text content, not the structure
   - Keep all attributes that don't need changing

3. Content Refinement:
   - Focus on improving clarity, tone, and effectiveness
   - Maintain the original meaning and intent
   - Use appropriate language for the target audience
   - Keep formatting tags if present (e.g., <p>, <strong>, etc.)

4. For specific block types:
   - o4o/paragraph: Refine the text content
   - o4o/heading: Improve headline effectiveness
   - o4o/button: Enhance CTA text and messaging
   - o4o/cover: Improve hero section messaging
   - Other blocks: Focus on their primary text content

5. Absolutely NO:
   - Markdown code blocks
   - Natural language explanations
   - Changing block types
   - Removing essential attributes
   - Breaking existing HTML structure

**Example Input:**
{
  "type": "o4o/paragraph",
  "content": { "text": "This is a sample paragraph." },
  "attributes": { "align": "left" }
}

**Example Output:**
{
  "type": "o4o/paragraph",
  "content": { "text": "This is a well-crafted, engaging paragraph that captures the reader's attention." },
  "attributes": { "align": "left" }
}`;
}
