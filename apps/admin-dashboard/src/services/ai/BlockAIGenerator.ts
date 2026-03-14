/**
 * BlockAIGenerator Service
 * Phase 2-C: Block-level AI editing
 *
 * Provides AI-powered block refinement, improvement, and translation
 */

import { authClient } from '@o4o/auth-client';
import { buildBlockRefineSystem } from '@o4o/ai-prompts/admin';
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
    return this.refineBlock(block, {
      type: 'refine',
      prompt: '이 블록의 내용을 더 간결하고 명확하게 다시 작성해주세요. 핵심 메시지는 유지하되, 불필요한 단어나 문장을 제거해주세요.',
      customInstructions,
    });
  }

  /**
   * Helper: Refine block with "make it detailed" preset
   */
  async makeBlockDetailed(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, {
      type: 'improve',
      prompt: '이 블록의 내용을 더 설명적이고 자세하게 확장해주세요. 독자가 이해하기 쉽도록 예시나 세부사항을 추가해주세요.',
      customInstructions,
    });
  }

  /**
   * Helper: Translate block to Korean
   */
  async translateBlockToKorean(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, {
      type: 'translate-ko',
      prompt: '이 블록의 내용을 자연스러운 한국어로 번역해주세요. 문화적 맥락을 고려하여 번역해주세요.',
      targetLang: 'ko',
      customInstructions,
    });
  }

  /**
   * Helper: Translate block to English
   */
  async translateBlockToEnglish(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, {
      type: 'translate-en',
      prompt: 'Translate this block\'s content to natural English. Consider cultural context when translating.',
      targetLang: 'en',
      customInstructions,
    });
  }

  /**
   * Helper: Enhance CTA in block
   */
  async enhanceBlockCTA(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, {
      type: 'cta',
      prompt: '이 블록의 CTA(Call-to-Action)를 더 강력하고 설득력있게 만들어주세요. 행동을 유도하는 명확한 메시지로 개선해주세요.',
      customInstructions,
    });
  }

  /**
   * Helper: Optimize block for SEO
   */
  async optimizeBlockForSEO(block: Block, customInstructions?: string): Promise<BlockRefineResult> {
    return this.refineBlock(block, {
      type: 'seo',
      prompt: '이 블록의 내용을 SEO에 최적화된 형태로 개선해주세요. 키워드를 자연스럽게 포함하고, 검색엔진 친화적인 구조로 만들어주세요.',
      customInstructions,
    });
  }
}

// Singleton instance
export const blockAIGenerator = new BlockAIGenerator();
