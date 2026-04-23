/**
 * Section AI Refinement Prompt
 * Multi-block section restructuring
 */

/** Action-level user prompt strings — single source of truth for Section AI */
export const SECTION_ACTION_PROMPTS: Record<
  'restructure' | 'problem-solution-cta' | 'enhance-cta' | 'add-block',
  string
> = {
  'restructure': '이 섹션의 블록들을 더 효과적인 구조로 재구성해주세요. 논리적 흐름을 개선하고, 중복을 제거하며, 가독성을 높여주세요.',
  'problem-solution-cta': '이 섹션을 Problem(문제 제기) → Solution(해결책 제시) → CTA(행동 유도) 구조로 재구성해주세요. 각 단계가 명확하게 구분되도록 해주세요.',
  'enhance-cta': '이 섹션의 CTA(Call-to-Action)를 더 강력하고 설득력있게 만들어주세요. 명확한 행동 유도와 긴박감을 추가해주세요.',
  'add-block': '이 섹션에 부족한 요소를 파악하고, 섹션을 완성하는 데 도움이 되는 새로운 블록을 추가해주세요.',
};

export const SECTION_ROLE_DESCRIPTIONS: Record<string, string> = {
  hero: 'Hero Section - 페이지의 첫인상을 결정하는 메인 영역. 강력한 헤드라인, 명확한 가치 제안, 시각적 임팩트가 중요',
  feature: 'Feature Section - 제품/서비스의 핵심 기능과 장점을 명확하게 전달. 각 기능은 구체적이고 이해하기 쉬워야 함',
  cta: 'CTA Section - 사용자의 행동을 유도하는 영역. 명확한 혜택과 긴박감, 행동 장벽 제거가 핵심',
  about: 'About Section - 회사/제품의 스토리와 비전 전달. 신뢰 구축과 차별화 포인트 강조',
  timeline: 'Timeline Section - 시간순 프로세스나 히스토리. 논리적 순서와 진행 단계 명확화',
  faq: 'FAQ Section - 자주 묻는 질문과 답변. 명확하고 간결한 Q&A 형식',
};

export function buildSectionRefineSystem(blockTypes: string, sectionRole?: string): string {
  let sectionRoleContext = '';
  if (sectionRole && SECTION_ROLE_DESCRIPTIONS[sectionRole]) {
    sectionRoleContext = `\n\n**Section Role Context:**\n이 섹션의 역할: ${SECTION_ROLE_DESCRIPTIONS[sectionRole]}\n위 역할에 맞게 블록 구조와 내용을 최적화하세요.`;
  }

  return `You are an expert content strategist specializing in refining and restructuring content sections.

**Your Task:**
Refine the provided section (multiple blocks) according to the user's instructions while maintaining proper block structure.

**Critical Rules:**
1. Output ONLY a valid JSON array of blocks with this exact structure:
[
  {
    "type": "block-type",
    "content": "content here (can be string or object based on block type)",
    "attributes": { ...block attributes... }
  },
  ...
]

2. Section Refinement Guidelines:
   - You can ADD new blocks if needed to improve the section
   - You can REMOVE blocks if they're redundant or don't fit
   - You can REORDER blocks for better logical flow
   - You can MERGE similar blocks for conciseness
   - You can SPLIT complex blocks for clarity
   - ALWAYS maintain the original block types available: ${blockTypes}
   - Use ONLY o4o/** block types (e.g., o4o/paragraph, o4o/heading, o4o/button, o4o/cover)

3. Block Type Preservation:
   - Keep existing block types when possible
   - If you need new block types, use common ones: o4o/paragraph, o4o/heading, o4o/button
   - Preserve content structure (if content is object with "text" field, maintain it)
   - Keep essential attributes (align, level, fontSize, etc.)

4. Content Quality:
   - Improve clarity and coherence across the section
   - Ensure logical flow between blocks
   - Remove redundancy while maintaining completeness
   - Enhance messaging effectiveness
   - Use appropriate tone and language

5. Absolutely NO:
   - Markdown code blocks
   - Natural language explanations
   - Breaking existing HTML structure
   - Using non-o4o block types${sectionRoleContext}

**Example Input:**
[
  { "type": "o4o/heading", "content": { "text": "Our Features" }, "attributes": { "level": 2 } },
  { "type": "o4o/paragraph", "content": { "text": "We have many features." }, "attributes": {} }
]

**Example Output:**
[
  { "type": "o4o/heading", "content": { "text": "Powerful Features That Drive Results" }, "attributes": { "level": 2, "align": "center" } },
  { "type": "o4o/paragraph", "content": { "text": "Discover the comprehensive suite of tools designed to transform your workflow and maximize productivity." }, "attributes": { "align": "center" } }
]`;
}
