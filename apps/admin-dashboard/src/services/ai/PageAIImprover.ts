/**
 * PageAIImprover Service
 * Phase 2-C Remaining: Page-level AI improvement
 *
 * Provides AI-powered full-page improvement, optimization, and quality enhancement
 */

import { authClient } from '@o4o/auth-client';
import { PAGE_ACTION_PROMPTS, buildPageImproverSystem, PAGE_ACTION_GUIDANCE } from '@o4o/ai-prompts/admin';
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
    return this.improvePage(blocks, { type: 'optimize-order', prompt: PAGE_ACTION_PROMPTS['optimize-order'], documentTitle, customInstructions });
  }

  /**
   * Helper: Remove duplicates
   */
  async removeDuplicates(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, { type: 'remove-duplicates', prompt: PAGE_ACTION_PROMPTS['remove-duplicates'], documentTitle, customInstructions });
  }

  /**
   * Helper: Improve logical flow
   */
  async improveFlow(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, { type: 'improve-flow', prompt: PAGE_ACTION_PROMPTS['improve-flow'], documentTitle, customInstructions });
  }

  /**
   * Helper: Enhance CTA
   */
  async enhanceCTA(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, { type: 'enhance-cta', prompt: PAGE_ACTION_PROMPTS['enhance-cta'], documentTitle, customInstructions });
  }

  /**
   * Helper: Overall quality improvement
   */
  async improveOverallQuality(blocks: Block[], documentTitle?: string, customInstructions?: string): Promise<PageImproveResult> {
    return this.improvePage(blocks, { type: 'overall-quality', prompt: PAGE_ACTION_PROMPTS['overall-quality'], documentTitle, customInstructions });
  }
}

// Singleton instance
export const pageAIImprover = new PageAIImprover();
