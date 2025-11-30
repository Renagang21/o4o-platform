import { Repository } from 'typeorm';
import type { ForumPost } from '@o4o-apps/forum';

/**
 * Neture Forum Service
 *
 * Handles Neture cosmetics forum operations including:
 * - Skin type filtering
 * - Concern-based filtering
 * - Product-related posts
 */

export interface NetureMetadata {
  skinType?: 'dry' | 'oily' | 'combination' | 'sensitive';
  concerns?: string[];
  routine?: string[];
  productIds?: string[];
}

export interface PostFilter {
  category?: string;
  skinType?: string;
  concerns?: string[];
  productId?: string;
  page?: number;
  limit?: number;
}

export interface CreatePostData {
  title: string;
  content: string;
  categoryId: string;
  authorId: string;
  netureMeta?: NetureMetadata;
  type?: string;
  tags?: string[];
}

export class NetureForumService {
  private forumPostRepository: Repository<ForumPost>;

  constructor(forumPostRepository: Repository<ForumPost>) {
    this.forumPostRepository = forumPostRepository;
  }

  /**
   * List posts with Neture-specific filtering
   */
  async listPosts(filter: PostFilter): Promise<ForumPost[]> {
    const limit = filter.limit || 20;
    const offset = ((filter.page || 1) - 1) * limit;

    const queryBuilder = this.forumPostRepository
      .createQueryBuilder('post')
      .where("post.status = :status", { status: 'publish' });

    // Filter by category
    if (filter.category) {
      queryBuilder.andWhere("post.categoryId = :categoryId", { categoryId: filter.category });
    }

    // Filter by skin type
    if (filter.skinType) {
      queryBuilder.andWhere(
        "post.metadata->'neture'->>'skinType' = :skinType",
        { skinType: filter.skinType }
      );
    }

    // Filter by concerns (array contains)
    if (filter.concerns && filter.concerns.length > 0) {
      filter.concerns.forEach((concern, index) => {
        queryBuilder.andWhere(
          `post.metadata->'neture'->'concerns' ? :concern${index}`,
          { [`concern${index}`]: concern }
        );
      });
    }

    // Filter by product ID (array contains)
    if (filter.productId) {
      queryBuilder.andWhere(
        "post.metadata->'neture'->'productIds' ? :productId",
        { productId: filter.productId }
      );
    }

    const posts = await queryBuilder
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return posts;
  }

  /**
   * Get a single post by ID
   */
  async getPost(id: string): Promise<ForumPost | null> {
    return await this.forumPostRepository.findOne({
      where: { id },
    });
  }

  /**
   * Create a new post with Neture metadata
   */
  async createPost(data: CreatePostData): Promise<ForumPost> {
    // Generate slug from title
    const slug = this.generateSlug(data.title);

    const post = this.forumPostRepository.create({
      title: data.title,
      content: data.content,
      authorId: data.authorId,
      categoryId: data.categoryId,
      type: data.type as any || 'discussion',
      tags: data.tags,
      status: 'publish' as any,
      slug,
      metadata: {
        neture: data.netureMeta || {},
      },
      publishedAt: new Date() as any,
    });

    return await this.forumPostRepository.save(post);
  }

  /**
   * List posts for a specific product
   */
  async listProductPosts(productId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<ForumPost[]> {
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const posts = await this.forumPostRepository
      .createQueryBuilder('post')
      .where("post.status = :status", { status: 'publish' })
      .andWhere(
        "post.metadata->'neture'->'productIds' ? :productId",
        { productId }
      )
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return posts;
  }

  /**
   * Update post (admin only)
   */
  async updatePost(id: string, data: Partial<CreatePostData>): Promise<ForumPost> {
    const post = await this.getPost(id);

    if (!post) {
      throw new Error('Post not found');
    }

    if (data.title) post.title = data.title;
    if (data.content) post.content = data.content;
    if (data.categoryId) post.categoryId = data.categoryId;
    if (data.type) post.type = data.type as any;
    if (data.tags) post.tags = data.tags;

    if (data.netureMeta) {
      post.metadata = {
        ...post.metadata,
        neture: {
          ...(post.metadata as any)?.neture,
          ...data.netureMeta,
        },
      };
    }

    return await this.forumPostRepository.save(post);
  }

  /**
   * Delete post (soft delete - set status to trash)
   */
  async deletePost(id: string): Promise<void> {
    const post = await this.getPost(id);

    if (!post) {
      throw new Error('Post not found');
    }

    post.status = 'trash' as any;
    await this.forumPostRepository.save(post);
  }

  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200) + '-' + Date.now();
  }

  /**
   * Get post statistics
   */
  async getStats(): Promise<{
    total: number;
    bySkinType: Record<string, number>;
    byConcern: Record<string, number>;
  }> {
    const total = await this.forumPostRepository.count({
      where: { status: 'publish' as any },
    });

    // Note: These would be more efficient with dedicated SQL queries
    // For now, returning basic stats
    return {
      total,
      bySkinType: {},
      byConcern: {},
    };
  }
}
