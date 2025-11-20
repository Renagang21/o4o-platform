/**
 * SectionAIGenerator Service
 * Phase 2-C Remaining: Section-level AI reconstruction
 *
 * Provides AI-powered section refinement, restructuring, and enhancement
 */

import { authClient } from '@o4o/auth-client';
import { Block } from '@/types/post.types';
import { devLog, devError } from '@/utils/logger';

export interface SectionRefineOptions {
  type: 'restructure' | 'problem-solution-cta' | 'enhance-cta' | 'add-block' | 'custom';
  sectionRole?: 'hero' | 'feature' | 'cta' | 'about' | 'timeline' | 'faq';
  prompt: string;
  customInstructions?: string;
}

export interface SectionRefineResult {
  success: boolean;
  blocks?: Block[];
  error?: string;
}

/**
 * SectionAIGenerator - Service for section-level AI editing
 */
class SectionAIGenerator {
  /**
   * Refine a section (multiple blocks) using AI
   */
  async refineSection(
    blocks: Block[],
    options: SectionRefineOptions
  ): Promise<SectionRefineResult> {
    try {
      devLog('🎨 Refining section with AI:', blocks.length, 'blocks', options.type);

      if (blocks.length < 2) {
        throw new Error('Section refinement requires at least 2 blocks');
      }

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(blocks, options);

      // Build user prompt
      const userPrompt = this.buildUserPrompt(blocks, options);

      // Call AI via server proxy
      const response = await authClient.api.post('/ai/generate', {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.4,
        maxTokens: 4096,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'AI section refinement failed');
      }

      // Parse AI response
      const refinedBlocks = this.parseBlocksResponse(data.result.blocks, blocks);

      devLog('✅ Section refined successfully:', refinedBlocks.length, 'blocks');

      return {
        success: true,
        blocks: refinedBlocks,
      };
    } catch (error: any) {
      devError('❌ Section refinement failed:', error);

      return {
        success: false,
        error: error.message || 'Failed to refine section',
      };
    }
  }

  /**
   * Build system prompt for section refinement
   */
  private buildSystemPrompt(blocks: Block[], options: SectionRefineOptions): string {
    const blockTypes = [...new Set(blocks.map(b => b.type))].join(', ');

    let sectionRoleContext = '';
    if (options.sectionRole) {
      const roleDescriptions: Record<string, string> = {
        hero: 'Hero Section - 페이지의 첫인상을 결정하는 메인 영역. 강력한 헤드라인, 명확한 가치 제안, 시각적 임팩트가 중요',
        feature: 'Feature Section - 제품/서비스의 핵심 기능과 장점을 명확하게 전달. 각 기능은 구체적이고 이해하기 쉬워야 함',
        cta: 'CTA Section - 사용자의 행동을 유도하는 영역. 명확한 혜택과 긴박감, 행동 장벽 제거가 핵심',
        about: 'About Section - 회사/제품의 스토리와 비전 전달. 신뢰 구축과 차별화 포인트 강조',
        timeline: 'Timeline Section - 시간순 프로세스나 히스토리. 논리적 순서와 진행 단계 명확화',
        faq: 'FAQ Section - 자주 묻는 질문과 답변. 명확하고 간결한 Q&A 형식',
      };
      sectionRoleContext = `\n\n**Section Role Context:**\n이 섹션의 역할: ${roleDescriptions[options.sectionRole]}\n위 역할에 맞게 블록 구조와 내용을 최적화하세요.`;
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

  /**
   * Build user prompt with section data and instructions
   */
  private buildUserPrompt(blocks: Block[], options: SectionRefineOptions): string {
    const blocksData = blocks.map((block, index) => {
      const contentStr = typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content);

      return `**Block ${index + 1}:**
Type: ${block.type}
Content: ${contentStr}
Attributes: ${JSON.stringify(block.attributes || {})}`;
    }).join('\n\n');

    let prompt = `Please refine this section according to the following instructions:

**Current Section (${blocks.length} blocks):**
${blocksData}

**Instructions:**
${options.prompt}`;

    if (options.customInstructions) {
      prompt += `\n\n**Additional Requirements:**
${options.customInstructions}`;
    }

    // Add action-specific guidance
    if (options.type === 'problem-solution-cta') {
      prompt += `\n\n**Structure Guidance:**
Reorganize into three clear phases:
1. PROBLEM: Identify and articulate the user's pain point
2. SOLUTION: Present your product/service as the answer
3. CTA: Strong call-to-action to drive conversion

Each phase should be distinct and flow naturally to the next.`;
    } else if (options.type === 'enhance-cta') {
      prompt += `\n\n**CTA Enhancement Guidance:**
- Add urgency and scarcity if appropriate
- Clarify the benefit of taking action
- Remove friction and objections
- Make the next step crystal clear
- Use action-oriented language`;
    } else if (options.type === 'add-block') {
      prompt += `\n\n**Block Addition Guidance:**
Analyze what's missing from this section and add blocks to:
- Fill content gaps
- Improve persuasiveness
- Enhance clarity
- Strengthen the message
- Complete the user journey`;
    }

    prompt += `\n\nOutput the refined section as a JSON array of blocks following the exact structure shown in the system prompt.`;

    return prompt;
  }

  /**
   * Parse AI response and extract refined blocks
   */
  private parseBlocksResponse(aiResult: any, originalBlocks: Block[]): Block[] {
    try {
      let refinedData: any;

      // Handle different AI response formats
      if (typeof aiResult === 'string') {
        refinedData = JSON.parse(aiResult);
      } else if (Array.isArray(aiResult)) {
        refinedData = aiResult;
      } else if (aiResult && typeof aiResult === 'object') {
        // If it's an object, check if it has a blocks property
        if (Array.isArray(aiResult.blocks)) {
          refinedData = aiResult.blocks;
        } else {
          refinedData = [aiResult];
        }
      } else {
        throw new Error('Invalid AI response format');
      }

      // Ensure it's an array
      if (!Array.isArray(refinedData)) {
        throw new Error('AI response is not an array of blocks');
      }

      // Construct refined blocks with preserved/new IDs
      const refinedBlocks: Block[] = refinedData.map((blockData: any, index: number) => {
        // Try to preserve original block ID if index matches and type is same
        const originalBlock = originalBlocks[index];
        const shouldPreserveId = originalBlock && originalBlock.type === blockData.type;

        return {
          id: shouldPreserveId ? originalBlock.id : `block-${Date.now()}-${index}`,
          type: blockData.type,
          content: blockData.content,
          attributes: {
            ...(shouldPreserveId ? originalBlock.attributes : {}),
            ...blockData.attributes,
          },
          innerBlocks: blockData.innerBlocks || [],
        };
      });

      return refinedBlocks;
    } catch (error: any) {
      devError('Failed to parse blocks response:', error);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Helper: Restructure section for better flow
   */
  async restructureSection(blocks: Block[], customInstructions?: string): Promise<SectionRefineResult> {
    return this.refineSection(blocks, {
      type: 'restructure',
      prompt: '이 섹션의 블록들을 더 효과적인 구조로 재구성해주세요. 논리적 흐름을 개선하고, 중복을 제거하며, 가독성을 높여주세요.',
      customInstructions,
    });
  }

  /**
   * Helper: Convert to Problem-Solution-CTA structure
   */
  async convertToProblemSolutionCTA(blocks: Block[], customInstructions?: string): Promise<SectionRefineResult> {
    return this.refineSection(blocks, {
      type: 'problem-solution-cta',
      prompt: '이 섹션을 Problem(문제 제기) → Solution(해결책 제시) → CTA(행동 유도) 구조로 재구성해주세요. 각 단계가 명확하게 구분되도록 해주세요.',
      customInstructions,
    });
  }

  /**
   * Helper: Enhance CTA in section
   */
  async enhanceSectionCTA(blocks: Block[], customInstructions?: string): Promise<SectionRefineResult> {
    return this.refineSection(blocks, {
      type: 'enhance-cta',
      prompt: '이 섹션의 CTA(Call-to-Action)를 더 강력하고 설득력있게 만들어주세요. 명확한 행동 유도와 긴박감을 추가해주세요.',
      customInstructions,
    });
  }

  /**
   * Helper: Add useful blocks to section
   */
  async addBlocksToSection(blocks: Block[], customInstructions?: string): Promise<SectionRefineResult> {
    return this.refineSection(blocks, {
      type: 'add-block',
      prompt: '이 섹션에 부족한 요소를 파악하고, 섹션을 완성하는 데 도움이 되는 새로운 블록을 추가해주세요.',
      customInstructions,
    });
  }
}

// Singleton instance
export const sectionAIGenerator = new SectionAIGenerator();
