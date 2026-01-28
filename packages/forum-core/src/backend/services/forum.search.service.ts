/**
 * Forum Search Service
 *
 * Phase 15-A: Full-text Search Engine for Forum
 *
 * Provides PostgreSQL full-text search functionality for forum posts.
 * Supports weighted ranking, generic extension filtering, and pagination.
 */

import type { DataSource, SelectQueryBuilder } from 'typeorm';
import { ForumPost, PostStatus, PostType } from '../entities/ForumPost.js';
import { buildTsQuery, getSearchConfig } from '../utils/searchUtils.js';

/**
 * Search query options
 */
export interface ForumSearchQuery {
  // Search query string
  query: string;

  // Filters
  postType?: PostType;
  status?: PostStatus;
  categoryId?: string;
  organizationId?: string;
  authorId?: string;

  /**
   * Generic extension key filter.
   * Filters posts that have metadata under `metadata->'extensions'->extensionKey`.
   * Replaces the old domain-specific `type` field.
   */
  extensionKey?: string;

  /**
   * Extension hook: apply custom query builder filters.
   * Used by extension packages (forum-cosmetics, forum-yaksa) to add
   * domain-specific WHERE clauses without Core knowing the domain.
   */
  applyExtensionFilters?: (qb: any) => void;

  // Sorting
  sort?: 'relevance' | 'latest' | 'popular' | 'oldest';

  // Pagination
  page?: number;
  limit?: number;
}

/**
 * Search result with ranking score
 */
export interface SearchResultPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  type: PostType;
  status: PostStatus;
  categoryId: string;
  authorId: string;
  organizationId?: string;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;

  // Search-specific fields
  rank?: number;
  highlights?: {
    title?: string;
    content?: string;
  };

  // Joined data
  author?: {
    id: string;
    username?: string;
    nickname?: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Paginated search results
 */
export interface SearchResults {
  items: SearchResultPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
  executionTime?: number;
}

/**
 * Forum Search Service
 */
export class ForumSearchService {
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
  }

  /**
   * Static factory method
   */
  static fromDataSource(dataSource: DataSource): ForumSearchService {
    return new ForumSearchService(dataSource);
  }

  /**
   * Main search method - PostgreSQL full-text search
   */
  async searchPosts(options: ForumSearchQuery): Promise<SearchResults> {
    const startTime = Date.now();
    const {
      query,
      postType,
      status = PostStatus.PUBLISHED,
      categoryId,
      organizationId,
      authorId,
      extensionKey,
      applyExtensionFilters,
      sort = 'relevance',
      page = 1,
      limit = 20,
    } = options;

    // Build tsquery from search string
    const tsQuery = buildTsQuery(query);
    const searchConfig = getSearchConfig();

    if (!tsQuery) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        query,
        executionTime: Date.now() - startTime,
      };
    }

    const postRepo = this.dataSource.getRepository(ForumPost);
    const qb = postRepo.createQueryBuilder('post');

    // Select fields with rank
    qb.select([
      'post.id',
      'post.title',
      'post.slug',
      'post.excerpt',
      'post.type',
      'post.status',
      'post.categoryId',
      'post.authorId',
      'post.organizationId',
      'post.viewCount',
      'post.commentCount',
      'post.likeCount',
      'post.tags',
      'post.createdAt',
      'post.updatedAt',
      'post.publishedAt',
    ]);

    // Add search rank calculation
    qb.addSelect(
      `ts_rank_cd(post.search_vector, to_tsquery('${searchConfig}', :tsQuery))`,
      'rank'
    );

    // Full-text search condition
    qb.where(`post.search_vector @@ to_tsquery('${searchConfig}', :tsQuery)`, {
      tsQuery,
    });

    // Status filter (default: published)
    qb.andWhere('post.status = :status', { status });

    // Extension key filter (generic)
    if (extensionKey) {
      qb.andWhere(
        `(post.metadata->'extensions'->:extKey IS NOT NULL OR post.metadata->:extKey IS NOT NULL)`,
        { extKey: extensionKey }
      );
    }

    // Post type filter
    if (postType) {
      qb.andWhere('post.type = :postType', { postType });
    }

    // Category filter
    if (categoryId) {
      qb.andWhere('post.categoryId = :categoryId', { categoryId });
    }

    // Organization filter
    if (organizationId) {
      qb.andWhere('post.organizationId = :organizationId', { organizationId });
    }

    // Author filter
    if (authorId) {
      qb.andWhere('post.authorId = :authorId', { authorId });
    }

    // Extension-specific filters (applied via hook callback)
    if (applyExtensionFilters) {
      applyExtensionFilters(qb);
    }

    // Sorting
    switch (sort) {
      case 'relevance':
        qb.orderBy('rank', 'DESC');
        qb.addOrderBy('post.createdAt', 'DESC');
        break;
      case 'latest':
        qb.orderBy('post.createdAt', 'DESC');
        break;
      case 'oldest':
        qb.orderBy('post.createdAt', 'ASC');
        break;
      case 'popular':
        qb.orderBy('post.viewCount', 'DESC');
        qb.addOrderBy('post.likeCount', 'DESC');
        qb.addOrderBy('post.commentCount', 'DESC');
        break;
    }

    // Get total count
    const total = await qb.getCount();

    // Pagination
    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    // Execute query
    const rawResults = await qb.getRawAndEntities();

    // Map results with rank
    const items: SearchResultPost[] = rawResults.entities.map((entity, index) => {
      const raw = rawResults.raw[index];
      return {
        id: entity.id,
        title: entity.title,
        slug: entity.slug,
        excerpt: entity.excerpt,
        type: entity.type,
        status: entity.status,
        categoryId: entity.categoryId,
        authorId: entity.authorId,
        organizationId: entity.organizationId,
        viewCount: entity.viewCount,
        commentCount: entity.commentCount,
        likeCount: entity.likeCount,
        tags: entity.tags,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        publishedAt: entity.publishedAt,
        rank: raw?.rank || 0,
      };
    });

    const executionTime = Date.now() - startTime;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      query,
      executionTime,
    };
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(options: {
    query: string;
    extensionKey?: string;
    limit?: number;
  }): Promise<string[]> {
    const { query, extensionKey, limit = 10 } = options;

    if (!query || query.trim().length < 2) {
      return [];
    }

    const tsQuery = buildTsQuery(query);
    if (!tsQuery) return [];

    const postRepo = this.dataSource.getRepository(ForumPost);
    const qb = postRepo.createQueryBuilder('post');

    qb.select('post.title')
      .distinct(true)
      .where(`post.search_vector @@ to_tsquery('simple', :tsQuery)`, { tsQuery })
      .andWhere('post.status = :status', { status: PostStatus.PUBLISHED });

    if (extensionKey) {
      qb.andWhere(
        `(post.metadata->'extensions'->:extKey IS NOT NULL OR post.metadata->:extKey IS NOT NULL)`,
        { extKey: extensionKey }
      );
    }

    qb.orderBy(`ts_rank_cd(post.search_vector, to_tsquery('simple', :tsQuery))`, 'DESC')
      .setParameter('tsQuery', tsQuery)
      .limit(limit);

    const results = await qb.getRawMany();
    return results.map(r => r.post_title);
  }

  /**
   * Get popular search terms (based on tags and common keywords)
   */
  async getPopularSearchTerms(options: {
    extensionKey?: string;
    limit?: number;
  }): Promise<Array<{ term: string; count: number }>> {
    const { extensionKey, limit = 10 } = options;

    // Build extension filter clause
    const extFilter = extensionKey
      ? `AND (metadata->'extensions'->'${extensionKey.replace(/'/g, "''")}' IS NOT NULL OR metadata->'${extensionKey.replace(/'/g, "''")}' IS NOT NULL)`
      : '';

    // Get popular tags
    const result = await this.dataSource.query(`
      SELECT tag, COUNT(*) as count
      FROM (
        SELECT UNNEST(tags) as tag
        FROM forum_post
        WHERE status = 'publish'
        ${extFilter}
      ) sub
      GROUP BY tag
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);

    return result.map((r: any) => ({
      term: r.tag,
      count: parseInt(r.count, 10),
    }));
  }

  /**
   * Get headline with search term highlighting
   */
  async getHighlights(postId: string, query: string): Promise<{
    title?: string;
    content?: string;
  }> {
    const tsQuery = buildTsQuery(query);
    if (!tsQuery) return {};

    const result = await this.dataSource.query(`
      SELECT
        ts_headline('simple', title, to_tsquery('simple', $1), 'StartSel=<mark>, StopSel=</mark>') as title_highlight,
        ts_headline('simple', COALESCE(content_text, ''), to_tsquery('simple', $1), 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25') as content_highlight
      FROM forum_post
      WHERE id = $2
    `, [tsQuery, postId]);

    if (result.length === 0) return {};

    return {
      title: result[0].title_highlight,
      content: result[0].content_highlight,
    };
  }

  /**
   * Rebuild search index for a specific post
   * Used when post content is updated outside of normal TypeORM flow
   */
  async rebuildSearchIndex(postId: string): Promise<void> {
    await this.dataSource.query(`
      UPDATE forum_post
      SET
        content_text = extract_blocks_text(content),
        search_vector = build_forum_post_search_vector(title, content, excerpt, tags, metadata)
      WHERE id = $1
    `, [postId]);
  }

  /**
   * Rebuild search index for all posts
   * Used for maintenance or after migration
   */
  async rebuildAllSearchIndexes(): Promise<{ count: number }> {
    const result = await this.dataSource.query(`
      UPDATE forum_post
      SET
        content_text = extract_blocks_text(content),
        search_vector = build_forum_post_search_vector(title, content, excerpt, tags, metadata)
      WHERE search_vector IS NULL OR content_text IS NULL
    `);

    return { count: result?.[1] || 0 };
  }
}

export default ForumSearchService;
