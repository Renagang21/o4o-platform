/**
 * SectionAIGenerator Service
 * Phase 2-C Remaining: Section-level AI reconstruction
 *
 * Provides AI-powered section refinement, restructuring, and enhancement
 */

import { authClient } from '@o4o/auth-client';
import { SECTION_ACTION_PROMPTS, SECTION_ROLE_DESCRIPTIONS, buildSectionRefineSystem } from '@o4o/ai-prompts/admin';
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
    return buildSectionRefineSystem(blockTypes, options.sectionRole);
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
    return this.refineSection(blocks, { type: 'restructure', prompt: SECTION_ACTION_PROMPTS['restructure'], customInstructions });
  }

  /**
   * Helper: Convert to Problem-Solution-CTA structure
   */
  async convertToProblemSolutionCTA(blocks: Block[], customInstructions?: string): Promise<SectionRefineResult> {
    return this.refineSection(blocks, { type: 'problem-solution-cta', prompt: SECTION_ACTION_PROMPTS['problem-solution-cta'], customInstructions });
  }

  /**
   * Helper: Enhance CTA in section
   */
  async enhanceSectionCTA(blocks: Block[], customInstructions?: string): Promise<SectionRefineResult> {
    return this.refineSection(blocks, { type: 'enhance-cta', prompt: SECTION_ACTION_PROMPTS['enhance-cta'], customInstructions });
  }

  /**
   * Helper: Add useful blocks to section
   */
  async addBlocksToSection(blocks: Block[], customInstructions?: string): Promise<SectionRefineResult> {
    return this.refineSection(blocks, { type: 'add-block', prompt: SECTION_ACTION_PROMPTS['add-block'], customInstructions });
  }
}

// Singleton instance
export const sectionAIGenerator = new SectionAIGenerator();
