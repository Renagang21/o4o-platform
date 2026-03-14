/**
 * PageAIImprover Service
 * Phase 2-C Remaining: Page-level AI improvement
 *
 * Provides AI-powered full-page improvement, optimization, and quality enhancement
 */

import { authClient } from '@o4o/auth-client';
import { buildPageImproverSystem, PAGE_ACTION_GUIDANCE } from '@o4o/ai-prompts/admin';
import { Block } from '@/types/post.types';
import { devLog, devError } from '@/utils/logger';

export interface PageImproveOptions {
  type: 'optimize-order' | 'remove-duplicates' | 'improve-flow' | 'enhance-cta' | 'overall-quality';
  prompt: string;
  customInstructions?: string;
  documentTitle?: string;
}

export interface PageImproveResult {
  success: boolean;
  blocks?: Block[];
  error?: string;
}

/**
 * PageAIImprover - Service for page-level AI improvement
 */
class PageAIImprover {
  /**
   * Improve an entire page using AI
   */
  async improvePage(
    blocks: Block[],
    options: PageImproveOptions
  ): Promise<PageImproveResult> {
    try {
      devLog('🎨 Improving page with AI:', blocks.length, 'blocks', options.type);

      if (blocks.length === 0) {
        throw new Error('Page improvement requires at least 1 block');
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
        temperature: 0.5,
        maxTokens: 8192,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'AI page improvement failed');
      }

      // Parse AI response
      const improvedBlocks = this.parseBlocksResponse(data.result.blocks);

      devLog('✅ Page improved successfully:', improvedBlocks.length, 'blocks');

      return {
        success: true,
        blocks: improvedBlocks,
      };
    } catch (error: any) {
      devError('❌ Page improvement failed:', error);

      return {
        success: false,
        error: error.message || 'Failed to improve page',
      };
    }
  }

  /**
   * Build system prompt for page improvement
   */
  private buildSystemPrompt(blocks: Block[], options: PageImproveOptions): string {
    const blockTypes = [...new Set(blocks.map(b => b.type))].join(', ');
    return buildPageImproverSystem(blockTypes);
  }

  /**
   * Build user prompt with page data and instructions
   */
  private buildUserPrompt(blocks: Block[], options: PageImproveOptions): string {
    const blocksData = blocks.map((block, index) => {
      const contentStr = typeof block.content === 'string'
        ? block.content
        : JSON.stringify(block.content);

      return `**Block ${index + 1}:**
Type: ${block.type}
Content: ${contentStr}
Attributes: ${JSON.stringify(block.attributes || {})}`;
    }).join('\n\n');

    let prompt = `Please improve this page according to the following instructions:

**Page Title:** ${options.documentTitle || '(Untitled)'}

**Current Page (${blocks.length} blocks):**
${blocksData}

**Instructions:**
${options.prompt}`;

    if (options.customInstructions) {
      prompt += `\n\n**Additional Requirements:**
${options.customInstructions}`;
    }

    // Add action-specific guidance from prompt package
    const actionGuidance = PAGE_ACTION_GUIDANCE[options.type];
    if (actionGuidance) {
      prompt += actionGuidance;
    }

    prompt += `\n\nOutput the improved page as a JSON array of blocks following the exact structure shown in the system prompt.`;

    return prompt;
  }

  /**
   * Parse AI response and extract improved blocks
   */
  private parseBlocksResponse(aiResult: any): Block[] {
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

      // Construct improved blocks with new IDs
      const improvedBlocks: Block[] = refinedData.map((blockData: any, index: number) => {
        return {
          id: `block-${Date.now()}-${index}`,
          type: blockData.type,
          content: blockData.content,
          attributes: blockData.attributes || {},
          innerBlocks: blockData.innerBlocks || [],
        };
      });

      return improvedBlocks;
    } catch (error: any) {
      devError('Failed to parse blocks response:', error);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Helper: Optimize section order
   */
  async optimizeSectionOrder(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, {
      type: 'optimize-order',
      prompt: '이 페이지의 섹션 순서를 사용자 여정을 고려하여 최적화해주세요. 논리적 흐름을 개선하고, 각 섹션이 자연스럽게 연결되도록 재배치해주세요.',
      documentTitle,
      customInstructions,
    });
  }

  /**
   * Helper: Remove duplicates
   */
  async removeDuplicates(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, {
      type: 'remove-duplicates',
      prompt: '이 페이지에서 중복되는 내용이나 불필요한 섹션을 찾아 제거하거나 통합해주세요. 핵심 메시지는 유지하되, 군더더기를 없애주세요.',
      documentTitle,
      customInstructions,
    });
  }

  /**
   * Helper: Improve logical flow
   */
  async improveFlow(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, {
      type: 'improve-flow',
      prompt: '페이지 전체의 논리적 흐름을 개선해주세요. 각 섹션이 자연스럽게 이어지고, 사용자가 페이지를 읽으면서 자연스럽게 다음 단계로 이동할 수 있도록 만들어주세요.',
      documentTitle,
      customInstructions,
    });
  }

  /**
   * Helper: Enhance CTA
   */
  async enhanceCTA(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, {
      type: 'enhance-cta',
      prompt: '페이지 전체의 CTA(Call-to-Action)를 강화해주세요. 각 섹션에서 사용자의 행동을 유도하고, 최종 전환으로 이어질 수 있도록 개선해주세요.',
      documentTitle,
      customInstructions,
    });
  }

  /**
   * Helper: Overall quality improvement
   */
  async improveOverallQuality(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, {
      type: 'overall-quality',
      prompt: '페이지의 전반적인 품질을 종합적으로 개선해주세요. 내용의 명확성, 설득력, 가독성을 높이고, 사용자 경험을 향상시켜주세요.',
      documentTitle,
      customInstructions,
    });
  }
}

// Singleton instance
export const pageAIImprover = new PageAIImprover();
