/**
 * ForumAIService
 * Phase 16: AI Summary & Auto-Tagging
 *
 * Provides AI-powered features for forum posts:
 * - Content summarization (short + bullet points)
 * - Auto-tagging suggestions
 * - Domain-specific analysis (cosmetics/yaksa)
 *
 * Uses Adapter pattern for AI provider abstraction.
 * Initial implementation uses rule-based fallback.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { ForumPost } from '@o4o/forum-core/entities';
import type { Block } from '@o4o/types';

// =============================================================================
// AI Provider Interface (Adapter Pattern)
// =============================================================================

export interface AISummaryResult {
  shortSummary: string;
  bulletSummary: string[];
  model: string;
}

export interface AITagsResult {
  suggestedTags: string[];
  suggestedCategory?: string;
  confidence: number;
  cosmeticsTags?: {
    skinType?: string;
    concerns?: string[];
    productTypes?: string[];
  };
  yaksaTags?: {
    documentType?: 'notice' | 'admin' | 'education' | 'resource' | 'inquiry';
    isOrganizational?: boolean;
    topics?: string[];
  };
}

export interface AIProvider {
  name: string;
  generateSummary(text: string, options?: SummaryOptions): Promise<AISummaryResult>;
  generateTags(text: string, domain?: 'cosmetics' | 'yaksa' | 'general'): Promise<AITagsResult>;
}

export interface SummaryOptions {
  maxLength?: number;
  bulletCount?: number;
  language?: string;
}

// =============================================================================
// Rule-Based Fallback Provider (No External AI)
// =============================================================================

class RuleBasedProvider implements AIProvider {
  name = 'rule-based-v1';

  async generateSummary(text: string, options?: SummaryOptions): Promise<AISummaryResult> {
    const maxLength = options?.maxLength || 150;
    const bulletCount = options?.bulletCount || 3;

    // Extract sentences
    const sentences = text
      .replace(/\n+/g, ' ')
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    // Short summary: First meaningful sentence, truncated
    let shortSummary = sentences[0] || text.substring(0, maxLength);
    if (shortSummary.length > maxLength) {
      shortSummary = shortSummary.substring(0, maxLength - 3) + '...';
    }

    // Bullet summary: Key sentences (prioritize longer ones with keywords)
    const scoredSentences = sentences.map(s => ({
      text: s,
      score: this.scoreSentence(s),
    }));

    const bulletSummary = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, bulletCount)
      .map(s => s.text.length > 100 ? s.text.substring(0, 97) + '...' : s.text);

    return {
      shortSummary,
      bulletSummary,
      model: this.name,
    };
  }

  async generateTags(text: string, domain?: 'cosmetics' | 'yaksa' | 'general'): Promise<AITagsResult> {
    const lowerText = text.toLowerCase();
    const suggestedTags: string[] = [];
    let confidence = 0.5;

    // Common tag extraction (word frequency)
    const words = lowerText.split(/\W+/).filter(w => w.length > 3);
    const wordFreq = new Map<string, number>();
    words.forEach(w => wordFreq.set(w, (wordFreq.get(w) || 0) + 1));

    // Filter out common words
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'will', 'would', 'could', 'should', 'about', 'there', 'their', 'what', 'when', 'where', 'which', 'while']);
    const topWords = [...wordFreq.entries()]
      .filter(([word]) => !stopWords.has(word))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    suggestedTags.push(...topWords);

    const result: AITagsResult = {
      suggestedTags,
      confidence,
    };

    // Domain-specific analysis
    if (domain === 'cosmetics') {
      result.cosmeticsTags = this.analyzeCosmeticsContent(lowerText);
      if (result.cosmeticsTags.skinType || result.cosmeticsTags.concerns?.length) {
        confidence += 0.2;
      }
    } else if (domain === 'yaksa') {
      result.yaksaTags = this.analyzeYaksaContent(lowerText);
      if (result.yaksaTags.documentType) {
        confidence += 0.2;
      }
    }

    result.confidence = Math.min(confidence, 1.0);
    return result;
  }

  private scoreSentence(sentence: string): number {
    let score = sentence.length / 100; // Length factor

    // Keyword bonus
    const keywords = ['중요', '핵심', '결론', 'important', 'key', 'summary', '추천', '효과', '방법'];
    keywords.forEach(kw => {
      if (sentence.toLowerCase().includes(kw)) score += 0.5;
    });

    return score;
  }

  private analyzeCosmeticsContent(text: string): AITagsResult['cosmeticsTags'] {
    const result: AITagsResult['cosmeticsTags'] = {};

    // Skin type detection
    const skinTypes: Record<string, string> = {
      '건성': 'dry',
      '지성': 'oily',
      '복합성': 'combination',
      '민감성': 'sensitive',
      '중성': 'normal',
      'dry skin': 'dry',
      'oily skin': 'oily',
    };

    for (const [keyword, type] of Object.entries(skinTypes)) {
      if (text.includes(keyword)) {
        result.skinType = type;
        break;
      }
    }

    // Concerns detection
    const concernKeywords = [
      '여드름', '주름', '미백', '보습', '모공', '색소침착', '탄력',
      'acne', 'wrinkle', 'whitening', 'moisturizing', 'pore',
    ];
    result.concerns = concernKeywords.filter(kw => text.includes(kw));

    // Product types
    const productKeywords = ['세럼', '크림', '토너', '에센스', '마스크', '선크림'];
    result.productTypes = productKeywords.filter(kw => text.includes(kw));

    return result;
  }

  private analyzeYaksaContent(text: string): AITagsResult['yaksaTags'] {
    const result: AITagsResult['yaksaTags'] = {};

    // Document type detection
    if (text.includes('공지') || text.includes('안내') || text.includes('notice')) {
      result.documentType = 'notice';
    } else if (text.includes('행정') || text.includes('서류') || text.includes('신청')) {
      result.documentType = 'admin';
    } else if (text.includes('교육') || text.includes('연수') || text.includes('학습')) {
      result.documentType = 'education';
    } else if (text.includes('자료') || text.includes('참고') || text.includes('문서')) {
      result.documentType = 'resource';
    } else if (text.includes('질문') || text.includes('문의') || text.includes('?')) {
      result.documentType = 'inquiry';
    }

    // Organizational detection
    result.isOrganizational = text.includes('약사회') || text.includes('지부') || text.includes('협회');

    // Topics
    const topicKeywords = ['보험', '급여', '조제', '복약', '처방', '약품'];
    result.topics = topicKeywords.filter(kw => text.includes(kw));

    return result;
  }
}

// =============================================================================
// ForumAIService
// =============================================================================

class ForumAIService {
  private provider: AIProvider;
  private postRepository: Repository<ForumPost> | null = null;

  constructor(provider?: AIProvider) {
    // Default to rule-based provider
    this.provider = provider || new RuleBasedProvider();
  }

  private getPostRepository(): Repository<ForumPost> {
    if (!this.postRepository || !AppDataSource.isInitialized) {
      this.postRepository = AppDataSource.getRepository(ForumPost);
    }
    return this.postRepository;
  }

  /**
   * Set AI provider (for testing or switching providers)
   */
  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Generate AI summary for a post
   */
  async generateSummary(
    postId: string,
    options?: SummaryOptions
  ): Promise<AISummaryResult> {
    const repo = this.getPostRepository();
    const post = await repo.findOne({ where: { id: postId } });

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    const text = this.extractTextFromPost(post);
    if (!text || text.length < 50) {
      throw new Error('Post content too short for summarization');
    }

    return this.provider.generateSummary(text, options);
  }

  /**
   * Generate AI tags for a post
   */
  async generateTags(
    postId: string,
    domain?: 'cosmetics' | 'yaksa' | 'general'
  ): Promise<AITagsResult> {
    const repo = this.getPostRepository();
    const post = await repo.findOne({ where: { id: postId } });

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    const text = this.extractTextFromPost(post);

    // Auto-detect domain if not specified
    const detectedDomain = domain || this.detectDomain(post);

    return this.provider.generateTags(text, detectedDomain);
  }

  /**
   * Process a post (generate summary + tags) and save to metadata
   */
  async processPost(
    postId: string,
    options?: { regenerate?: boolean }
  ): Promise<{ summary: AISummaryResult; tags: AITagsResult }> {
    const repo = this.getPostRepository();
    const post = await repo.findOne({ where: { id: postId } });

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    // Check if already processed
    const existingAI = post.metadata?.ai;
    if (existingAI?.status === 'completed' && !options?.regenerate) {
      return {
        summary: existingAI.summary!,
        tags: existingAI.tags!,
      };
    }

    // Mark as processing
    await this.updatePostAIMeta(postId, {
      status: 'processing',
      lastProcessedAt: new Date().toISOString(),
    });

    try {
      const text = this.extractTextFromPost(post);
      const domain = this.detectDomain(post);

      // Generate in parallel
      const [summary, tags] = await Promise.all([
        this.provider.generateSummary(text),
        this.provider.generateTags(text, domain),
      ]);

      // Save results
      await this.updatePostAIMeta(postId, {
        summary: {
          ...summary,
          generatedAt: new Date().toISOString(),
        },
        tags,
        status: 'completed',
        lastProcessedAt: new Date().toISOString(),
        error: undefined,
      });

      return { summary, tags };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updatePostAIMeta(postId, {
        status: 'failed',
        error: errorMessage,
        lastProcessedAt: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Apply suggested tags to post (requires approval)
   */
  async applyTags(
    postId: string,
    userId: string,
    tagsToApply?: string[]
  ): Promise<void> {
    const repo = this.getPostRepository();
    const post = await repo.findOne({ where: { id: postId } });

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    const aiMeta = post.metadata?.ai;
    if (!aiMeta?.tags?.suggestedTags) {
      throw new Error('No AI-suggested tags available');
    }

    // Use specified tags or all suggested tags
    const newTags = tagsToApply || aiMeta.tags.suggestedTags;

    // Merge with existing tags
    const existingTags = post.tags || [];
    const mergedTags = [...new Set([...existingTags, ...newTags])];

    // Update post
    await repo.update(postId, {
      tags: mergedTags,
      metadata: {
        ...post.metadata,
        ai: {
          ...aiMeta,
          tagsApproved: true,
          tagsApprovedBy: userId,
          tagsApprovedAt: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Get AI metadata for a post
   */
  async getAIMetadata(postId: string): Promise<any> {
    const repo = this.getPostRepository();
    const post = await repo.findOne({
      where: { id: postId },
      select: ['id', 'metadata'],
    });

    if (!post) {
      throw new Error(`Post not found: ${postId}`);
    }

    return post.metadata?.ai || null;
  }

  // =============================================================================
  // Private Helpers
  // =============================================================================

  private extractTextFromPost(post: any): string {
    // Prefer contentText if available (Phase 15-A)
    if (post.contentText) {
      return post.contentText;
    }

    // Fall back to extracting from Block[]
    if (Array.isArray(post.content)) {
      return this.blocksToText(post.content);
    }

    // Fall back to string content
    if (typeof post.content === 'string') {
      return post.content;
    }

    return '';
  }

  private blocksToText(blocks: Block[]): string {
    return blocks
      .map(block => {
        if (typeof block.content === 'string') {
          return block.content;
        }
        if (typeof block.content === 'object' && block.content?.text) {
          return block.content.text;
        }
        return '';
      })
      .filter(text => text.trim())
      .join('\n\n');
  }

  private detectDomain(post: any): 'cosmetics' | 'yaksa' | 'general' {
    // Check metadata extensions
    if (post.metadata?.extensions?.neture || post.metadata?.neture) {
      return 'cosmetics';
    }
    if (post.metadata?.extensions?.yaksa || post.metadata?.yaksa) {
      return 'yaksa';
    }

    // Check organizationId pattern (if yaksa orgs have specific patterns)
    if (post.organizationId) {
      return 'yaksa';
    }

    return 'general';
  }

  private async updatePostAIMeta(postId: string, aiMeta: any): Promise<void> {
    const repo = this.getPostRepository();
    const post = await repo.findOne({ where: { id: postId } });

    if (!post) return;

    const updatedMetadata = {
      ...post.metadata,
      ai: {
        ...(post.metadata?.ai || {}),
        ...aiMeta,
      },
    };

    await repo.update(postId, { metadata: updatedMetadata });
  }
}

// Export singleton instance
export const forumAIService = new ForumAIService();

// Export class and types for testing
export { ForumAIService, RuleBasedProvider };
