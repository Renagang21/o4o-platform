/**
 * BlockAIGenerator Service
 * Phase 2-C: Block-level AI editing
 *
 * Provides AI-powered block refinement, improvement, and translation
 */

import { authClient } from '@o4o/auth-client';
import { buildBlockRefineSystem, BLOCK_ACTION_PROMPTS } from '@o4o/ai-prompts/admin';
import { Block } from '@/types/post.types';
import { devLog, devError } from '@/utils/logger';

export interface BlockRefineOptions {
  type: 'refine' | 'improve' | 'translate-ko' | 'translate-en' | 'cta' | 'seo' | 'custom';
  prompt: string;
  customInstructions?: string;
  targetLang?: 'ko' | 'en';
}

export interface BlockRefineResult {
  success: boolean;
  block?: Block;
  error?: string;
}

/**
 * BlockAIGenerator - Service for block-level AI editing
 */
class BlockAIGenerator {
  /**
   * Refine a block using AI
   */
  async refineBlock(
    block: Block,
    options: BlockRefineOptions
  ): Promise<BlockRefineResult> {
    try {
      devLog('🎨 Refining block with AI:', block.type, options.type);

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(block);

      // Build user prompt
      const userPrompt = this.buildUserPrompt(block, options);

      // Call AI via server proxy
      const response = await authClient.api.post('/ai/generate', {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 2048,
      });

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'AI refinement failed');
      }

      // Parse AI response
      const refinedBlock = this.parseBlockResponse(data.result.blocks, block);

      devLog('✅ Block refined successfully');

      return {
        success: true,
        block: refinedBlock,
      };
    } catch (error: any) {
      devError('❌ Block refinement failed:', error);

      return {
        success: false,
        error: error.message || 'Failed to refine block',
      };
    }
  }

  /**
   * Build system prompt for block refinement
   */
  private buildSystemPrompt(block: Block): string {
    return buildBlockRefineSystem(block.type);
  }

  /**
   * Build user prompt with block data and instructions
   */
  private buildUserPrompt(block: Block, options: BlockRefineOptions): string {
    const blockContent = typeof block.content === 'string'
      ? block.content
      : JSON.stringify(block.content);

    let prompt = `Please refine this block according to the following instructions:

**Current Block:**
Type: ${block.type}
Content: ${blockContent}
Attributes: ${JSON.stringify(block.attributes || {})}

**Instructions:**
${options.prompt}`;

    if (options.customInstructions) {
      prompt += `\n\n**Additional Requirements:**
${options.customInstructions}`;
    }

    // Add language-specific instructions
    if (options.type === 'translate-ko') {
      prompt += `\n\n**Translation Note:**
Translate the content to natural Korean. Consider cultural context and ensure the translation feels native to Korean speakers.`;
    } else if (options.type === 'translate-en') {
      prompt += `\n\n**Translation Note:**
Translate the content to natural English. Consider cultural context and ensure the translation feels native to English speakers.`;
    }

    prompt += `\n\nOutput the refined block as JSON following the exact structure shown in the system prompt.`;

    return prompt;
  }

  /**
   * Parse AI response and extract refined block
   */
  private parseBlockResponse(aiResult: any, originalBlock: Block): Block {
    try {
      let refinedData: any;

      // Handle different AI response formats
      if (typeof aiResult === 'string') {
        refinedData = JSON.parse(aiResult);
      } else if (Array.isArray(aiResult) && aiResult.length > 0) {
        refinedData = aiResult[0];
      } else if (aiResult && typeof aiResult === 'object') {
        refinedData = aiResult;
      } else {
        throw new Error('Invalid AI response format');
      }

      // Validate that type matches
      if (refinedData.type !== originalBlock.type) {
        devError('⚠️ AI changed block type, reverting to original type');
        refinedData.type = originalBlock.type;
      }

      // Construct refined block
      const refinedBlock: Block = {
        id: originalBlock.id, // Preserve ID
        type: refinedData.type,
        content: refinedData.content || originalBlock.content,
        attributes: {
          ...originalBlock.attributes, // Preserve original attributes
          ...refinedData.attributes, // Override with refined attributes
        },
        innerBlocks: originalBlock.innerBlocks, // Preserve inner blocks
      };

      return refinedBlock;
    } catch (error: any) {
      devError('Failed to parse block response:', error);
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  /**
   * Helper: Refine block with "make it concise" preset
   */
  async makeBlockConcise(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, { type: 'refine', prompt: BLOCK_ACTION_PROMPTS['refine'], customInstructions });
  }

  /**
   * Helper: Refine block with "make it detailed" preset
   */
  async makeBlockDetailed(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, { type: 'improve', prompt: BLOCK_ACTION_PROMPTS['improve'], customInstructions });
  }

  /**
   * Helper: Translate block to Korean
   */
  async translateBlockToKorean(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, { type: 'translate-ko', prompt: BLOCK_ACTION_PROMPTS['translate-ko'], targetLang: 'ko', customInstructions });
  }

  /**
   * Helper: Translate block to English
   */
  async translateBlockToEnglish(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, { type: 'translate-en', prompt: BLOCK_ACTION_PROMPTS['translate-en'], targetLang: 'en', customInstructions });
  }

  /**
   * Helper: Enhance CTA in block
   */
  async enhanceBlockCTA(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, { type: 'cta', prompt: BLOCK_ACTION_PROMPTS['cta'], customInstructions });
  }

  /**
   * Helper: Optimize block for SEO
   */
  async optimizeBlockForSEO(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, { type: 'seo', prompt: BLOCK_ACTION_PROMPTS['seo'], customInstructions });
  }
}

// Singleton instance
export const blockAIGenerator = new BlockAIGenerator();
