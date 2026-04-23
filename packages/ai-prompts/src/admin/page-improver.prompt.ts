/**
 * Page AI Improver Prompts
 * Full-page optimization with action-type specific guidance
 */

/** Action-level user prompt strings — single source of truth for Page AI */
export const PAGE_ACTION_PROMPTS: Record<
  'optimize-order' | 'remove-duplicates' | 'improve-flow' | 'enhance-cta' | 'overall-quality',
  string
> = {
  'optimize-order': '이 페이지의 섹션 순서를 사용자 여정을 고려하여 최적화해주세요. 논리적 흐름을 개선하고, 각 섹션이 자연스럽게 연결되도록 재배치해주세요.',
  'remove-duplicates': '이 페이지에서 중복되는 내용이나 불필요한 섹션을 찾아 제거하거나 통합해주세요. 핵심 메시지는 유지하되, 군더더기를 없애주세요.',
  'improve-flow': '페이지 전체의 논리적 흐름을 개선해주세요. 각 섹션이 자연스럽게 이어지고, 사용자가 페이지를 읽으면서 자연스럽게 다음 단계로 이동할 수 있도록 만들어주세요.',
  'enhance-cta': '페이지 전체의 CTA(Call-to-Action)를 강화해주세요. 각 섹션에서 사용자의 행동을 유도하고, 최종 전환으로 이어질 수 있도록 개선해주세요.',
  'overall-quality': '페이지의 전반적인 품질을 종합적으로 개선해주세요. 내용의 명확성, 설득력, 가독성을 높이고, 사용자 경험을 향상시켜주세요.',
};

export function buildPageImproverSystem(blockTypes: string): string {
  return `You are an expert content strategist and UX designer specializing in optimizing full-page experiences.

**Your Task:**
Improve the entire page according to the user's instructions while maintaining proper block structure and enhancing overall quality.

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

2. Page Improvement Guidelines:
   - You can ADD new blocks to enhance the page
   - You can REMOVE blocks that are redundant or low-quality
   - You can REORDER blocks for better user flow
   - You can MERGE similar blocks for conciseness
   - You can SPLIT complex blocks for clarity
   - ALWAYS maintain existing block types: ${blockTypes}
   - Use ONLY o4o/** block types (e.g., o4o/paragraph, o4o/heading, o4o/button, o4o/cover)

3. Block Structure Preservation:
   - Keep content structure (if content is object with "text" field, maintain it)
   - Preserve essential attributes (align, level, fontSize, etc.)
   - Maintain HTML formatting within content

4. Page-Level Quality Standards:
   - Ensure clear hierarchy (H1 → H2 → H3 → content flow)
   - Create compelling hero sections
   - Build logical narrative flow
   - Strengthen CTAs at strategic points
   - Remove redundancy and fluff
   - Enhance clarity and persuasiveness
   - Optimize for user engagement and conversion

5. Absolutely NO:
   - Markdown code blocks
   - Natural language explanations
   - Breaking existing HTML structure
   - Using non-o4o block types

**Example Input:**
[
  { "type": "o4o/heading", "content": { "text": "Welcome" }, "attributes": { "level": 1 } },
  { "type": "o4o/paragraph", "content": { "text": "We offer great services." }, "attributes": {} }
]

**Example Output:**
[
  { "type": "o4o/heading", "content": { "text": "Transform Your Business with Our Solutions" }, "attributes": { "level": 1, "align": "center" } },
  { "type": "o4o/paragraph", "content": { "text": "Discover how our industry-leading services help businesses like yours achieve measurable results and sustainable growth." }, "attributes": { "align": "center" } },
  { "type": "o4o/button", "content": { "text": "Get Started Free" }, "attributes": { "align": "center", "variant": "primary" } }
]`;
}

/** Action-type specific guidance for user prompts */
export const PAGE_ACTION_GUIDANCE: Record<string, string> = {
  'optimize-order': `\n\n**Optimization Guidance:**
Reorganize blocks to create the optimal user journey:
1. Hero/Introduction (grab attention)
2. Problem/Pain Points (create urgency)
3. Solution/Features (present your offering)
4. Social Proof/Trust (build credibility)
5. CTA (drive conversion)
6. FAQ/Details (address objections)

Ensure smooth transitions between sections.`,

  'remove-duplicates': `\n\n**Duplicate Removal Guidance:**
- Identify and merge blocks with similar messaging
- Remove redundant information
- Consolidate repetitive content
- Keep the strongest version of duplicate messages
- Maintain completeness while eliminating waste`,

  'improve-flow': `\n\n**Flow Improvement Guidance:**
- Create logical progression from one block to the next
- Add transitional content where needed
- Ensure each section leads naturally to the next
- Build narrative momentum
- Remove jarring transitions`,

  'enhance-cta': `\n\n**CTA Enhancement Guidance:**
- Strengthen existing CTAs with urgency and clarity
- Add CTAs at strategic conversion points
- Use action-oriented, benefit-driven language
- Create a clear path to conversion
- Remove friction and objections`,

  'overall-quality': `\n\n**Quality Improvement Guidance:**
- Enhance clarity and conciseness
- Strengthen persuasiveness
- Improve visual hierarchy
- Optimize user engagement
- Refine messaging and tone
- Add missing elements for completeness`,
};
