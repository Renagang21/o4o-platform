import { AppDataSource } from '../database/connection.js';
import { Product } from '../entities/Product.js';
import { Post } from '../entities/Post.js';
import { Page } from '../entities/Page.js';
import { Category } from '../entities/Category.js';
import { Repository } from 'typeorm';

export interface SearchSuggestion {
  id: string;
  type: 'product' | 'post' | 'page' | 'category';
  title: string;
  description?: string;
  url: string;
}

export class SearchService {
  private productRepository: Repository<Product>;
  private postRepository: Repository<Post>;
  private pageRepository: Repository<Page>;
  private categoryRepository: Repository<Category>;

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
    this.postRepository = AppDataSource.getRepository(Post);
    this.pageRepository = AppDataSource.getRepository(Page);
    this.categoryRepository = AppDataSource.getRepository(Category);
  }

  /**
   * Sanitize and validate search query
   */
  private sanitizeQuery(query: string): string | null {
    if (!query || typeof query !== 'string') {
      return null;
    }

    // Trim and normalize whitespace
    let sanitized = query.trim().replace(/\s+/g, ' ');

    // Limit to 64 characters
    if (sanitized.length > 64) {
      sanitized = sanitized.substring(0, 64);
    }

    // Minimum 2 characters
    if (sanitized.length < 2) {
      return null;
    }

    // Escape special SQL characters for safety
    sanitized = sanitized.replace(/[%_]/g, '\\$&');

    return sanitized;
  }

  /**
   * Search products by title or description
   */
  private async searchProducts(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      const products = await this.productRepository
        .createQueryBuilder('product')
        .select(['product.id', 'product.name', 'product.slug', 'product.description'])
        .where('product.status = :status', { status: 'active' })
        .andWhere(
          '(LOWER(product.name) LIKE LOWER(:query) OR LOWER(product.description) LIKE LOWER(:query))',
          { query: `%${query}%` }
        )
        .orderBy('product.name', 'ASC')
        .limit(limit)
        .getMany();

      return products.map(product => ({
        id: product.id,
        type: 'product' as const,
        title: product.name,
        description: product.description?.substring(0, 100),
        url: `/products/${product.slug || product.id}`
      }));
    } catch (error) {
      console.error('[SearchService] Product search error:', error);
      return [];
    }
  }

  /**
   * Search posts by title or content
   */
  private async searchPosts(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      const posts = await this.postRepository
        .createQueryBuilder('post')
        .select(['post.id', 'post.title', 'post.slug', 'post.excerpt'])
        .where('post.status = :status', { status: 'publish' })
        .andWhere(
          '(LOWER(post.title) LIKE LOWER(:query) OR LOWER(post.excerpt) LIKE LOWER(:query))',
          { query: `%${query}%` }
        )
        .orderBy('post.createdAt', 'DESC')
        .limit(limit)
        .getMany();

      return posts.map(post => ({
        id: post.id,
        type: 'post' as const,
        title: post.title,
        description: post.excerpt?.substring(0, 100),
        url: `/blog/${post.slug || post.id}`
      }));
    } catch (error) {
      console.error('[SearchService] Post search error:', error);
      return [];
    }
  }

  /**
   * Search pages by title or content
   */
  private async searchPages(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      const pages = await this.pageRepository
        .createQueryBuilder('page')
        .select(['page.id', 'page.title', 'page.slug'])
        .where('page.status = :status', { status: 'publish' })
        .andWhere('LOWER(page.title) LIKE LOWER(:query)', { query: `%${query}%` })
        .orderBy('page.title', 'ASC')
        .limit(limit)
        .getMany();

      return pages.map(page => ({
        id: page.id,
        type: 'page' as const,
        title: page.title,
        url: `/${page.slug || page.id}`
      }));
    } catch (error) {
      console.error('[SearchService] Page search error:', error);
      return [];
    }
  }

  /**
   * Search categories by name or description
   */
  private async searchCategories(query: string, limit: number): Promise<SearchSuggestion[]> {
    try {
      const categories = await this.categoryRepository
        .createQueryBuilder('category')
        .select(['category.id', 'category.name', 'category.slug', 'category.description'])
        .where('category.isActive = :isActive', { isActive: true })
        .andWhere(
          '(LOWER(category.name) LIKE LOWER(:query) OR LOWER(category.description) LIKE LOWER(:query))',
          { query: `%${query}%` }
        )
        .orderBy('category.name', 'ASC')
        .limit(limit)
        .getMany();

      return categories.map(category => ({
        id: category.id,
        type: 'category' as const,
        title: category.name,
        description: category.description?.substring(0, 100),
        url: `/category/${category.slug || category.id}`
      }));
    } catch (error) {
      console.error('[SearchService] Category search error:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on query and type
   */
  async getSuggestions(
    query: string,
    limit: number = 8,
    type: 'product' | 'post' | 'page' | 'category' | 'all' = 'all'
  ): Promise<SearchSuggestion[]> {
    const sanitized = this.sanitizeQuery(query);
    if (!sanitized) {
      return [];
    }

    // Ensure limit is reasonable (max 10)
    const maxLimit = Math.min(Math.max(limit, 1), 10);

    try {
      let suggestions: SearchSuggestion[] = [];

      if (type === 'all') {
        // Search across all types with proportional limits
        const perTypeLimit = Math.ceil(maxLimit / 4);

        const [products, posts, pages, categories] = await Promise.all([
          this.searchProducts(sanitized, perTypeLimit),
          this.searchPosts(sanitized, perTypeLimit),
          this.searchPages(sanitized, perTypeLimit),
          this.searchCategories(sanitized, perTypeLimit)
        ]);

        // Interleave results for better diversity
        suggestions = this.interleaveResults([products, posts, pages, categories], maxLimit);
      } else {
        // Search specific type only
        switch (type) {
          case 'product':
            suggestions = await this.searchProducts(sanitized, maxLimit);
            break;
          case 'post':
            suggestions = await this.searchPosts(sanitized, maxLimit);
            break;
          case 'page':
            suggestions = await this.searchPages(sanitized, maxLimit);
            break;
          case 'category':
            suggestions = await this.searchCategories(sanitized, maxLimit);
            break;
        }
      }

      return suggestions;
    } catch (error) {
      console.error('[SearchService] Suggestions error:', error);
      return [];
    }
  }

  /**
   * Interleave multiple result arrays to provide diverse suggestions
   */
  private interleaveResults(arrays: SearchSuggestion[][], limit: number): SearchSuggestion[] {
    const result: SearchSuggestion[] = [];
    let index = 0;

    while (result.length < limit) {
      let added = false;

      for (const array of arrays) {
        if (array[index]) {
          result.push(array[index]);
          added = true;

          if (result.length >= limit) {
            break;
          }
        }
      }

      if (!added) {
        break; // All arrays exhausted
      }

      index++;
    }

    return result;
  }
}
