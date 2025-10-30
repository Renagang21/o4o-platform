import { AppDataSource } from '../database/connection.js';
import { Post } from '../entities/Post.js';
import { Page } from '../entities/Page.js';
import { Tag } from '../entities/Tag.js';
import { Category } from '../entities/Category.js';

export class SlugService {
  private postRepository = AppDataSource.getRepository(Post);
  private pageRepository = AppDataSource.getRepository(Page);
  private tagRepository = AppDataSource.getRepository(Tag);
  private categoryRepository = AppDataSource.getRepository(Category);

  /**
   * Generate URL-friendly slug from title
   */
  generateSlug(title: string): string {
    if (!title || title.trim().length === 0) {
      return '';
    }

    return title
      .trim()
      .toLowerCase()
      // Convert Korean characters to romanized equivalents (basic mapping)
      .replace(/[가-힣]/g, (char) => this.koreanToRoman(char))
      // Remove special characters except hyphens and underscores
      .replace(/[^a-z0-9\s\-_]/g, '')
      // Replace spaces and multiple hyphens with single hyphen
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Limit length
      .substring(0, 100);
  }

  /**
   * Ensure slug uniqueness for posts
   */
  async ensureUniquePostSlug(input: string, excludeId?: string, isSlug: boolean = false): Promise<string> {
    let baseSlug: string;
    
    if (isSlug) {
      // 이미 처리된 slug 값 - 그대로 사용
      baseSlug = input;
    } else {
      // title에서 slug 생성
      baseSlug = this.generateSlug(input);
    }
    
    if (!baseSlug) {
      baseSlug = 'post';
    }

    let slug = baseSlug;
    let counter = 0;

    while (await this.isPostSlugTaken(slug, excludeId)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Ensure slug uniqueness for pages
   */
  async ensureUniquePageSlug(slugOrTitle: string, excludeId?: string): Promise<string> {
    // If it looks like a slug already, use it directly, otherwise generate from title
    let baseSlug = slugOrTitle.includes(' ') || /[A-Z가-힣]/.test(slugOrTitle) 
      ? this.generateSlug(slugOrTitle) 
      : slugOrTitle;
    
    if (!baseSlug) {
      baseSlug = 'page';
    }

    let slug = baseSlug;
    let counter = 0;

    while (await this.isPageSlugTaken(slug, excludeId)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Ensure slug uniqueness for tags
   */
  async ensureUniqueTagSlug(slugOrName: string, excludeId?: string): Promise<string> {
    // If it looks like a slug already, use it directly, otherwise generate from name
    let baseSlug = slugOrName.includes(' ') || /[A-Z가-힣]/.test(slugOrName) 
      ? this.generateSlug(slugOrName) 
      : slugOrName;
    
    if (!baseSlug) {
      baseSlug = 'tag';
    }

    let slug = baseSlug;
    let counter = 0;

    while (await this.isTagSlugTaken(slug, excludeId)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Ensure slug uniqueness for categories
   */
  async ensureUniqueCategorySlug(slugOrName: string, excludeId?: string): Promise<string> {
    // If it looks like a slug already, use it directly, otherwise generate from name
    let baseSlug = slugOrName.includes(' ') || /[A-Z가-힣]/.test(slugOrName) 
      ? this.generateSlug(slugOrName) 
      : slugOrName;
    
    if (!baseSlug) {
      baseSlug = 'category';
    }

    let slug = baseSlug;
    let counter = 0;

    while (await this.isCategorySlugTaken(slug, excludeId)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    return slug;
  }

  /**
   * Validate slug format
   */
  validateSlug(slug: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!slug || slug.trim().length === 0) {
      errors.push('Slug cannot be empty');
      return { valid: false, errors };
    }

    // Check length
    if (slug.length > 100) {
      errors.push('Slug cannot exceed 100 characters');
    }

    // Check format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      errors.push('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    // Check for consecutive hyphens
    if (slug.includes('--')) {
      errors.push('Slug cannot contain consecutive hyphens');
    }

    // Check for leading/trailing hyphens
    if (slug.startsWith('-') || slug.endsWith('-')) {
      errors.push('Slug cannot start or end with a hyphen');
    }

    // Check for reserved words
    const reservedSlugs = [
      'admin', 'api', 'www', 'mail', 'ftp', 'blog', 'shop', 'store',
      'user', 'users', 'account', 'accounts', 'profile', 'profiles',
      'settings', 'config', 'dashboard', 'login', 'logout', 'register',
      'signin', 'signup', 'auth', 'oauth', 'callback', 'webhooks',
      'uploads', 'assets', 'static', 'public', 'private', 'tmp',
      'test', 'tests', 'dev', 'development', 'staging', 'production'
    ];

    if (reservedSlugs.includes(slug)) {
      errors.push(`'${slug}' is a reserved slug and cannot be used`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get slug suggestions based on title
   */
  getSuggestedSlugs(title: string, count: number = 5): string[] {
    const baseSlug = this.generateSlug(title);
    const suggestions = [baseSlug];

    if (!baseSlug) {
      return ['untitled'];
    }

    // Generate variations
    const titleWords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    if (titleWords.length > 1) {
      // Use first few words
      suggestions.push(titleWords.slice(0, 2).join('-'));
      suggestions.push(titleWords.slice(0, 3).join('-'));
      
      // Use key words (longer than 3 characters)
      const keyWords = titleWords.filter(word => word.length > 3);
      if (keyWords.length > 0) {
        suggestions.push(keyWords.slice(0, 2).join('-'));
      }
    }

    // Add numbered variations
    for (let i = 1; i <= count - suggestions.length; i++) {
      suggestions.push(`${baseSlug}-${i}`);
    }

    return suggestions.slice(0, count);
  }


  /**
   * Update page slug and handle redirects
   */
  async updatePageSlug(pageId: string, newSlug: string): Promise<{ success: boolean; slug: string; errors?: string[] }> {
    try {
      const validation = this.validateSlug(newSlug);
      if (!validation.valid) {
        return { success: false, slug: '', errors: validation.errors };
      }

      const uniqueSlug = await this.ensureUniquePageSlug(newSlug, pageId);

      await this.pageRepository.update(pageId, { slug: uniqueSlug });

      return { success: true, slug: uniqueSlug };
    } catch (error) {
      return { success: false, slug: '', errors: [error.message] };
    }
  }

  // Private helper methods

  private async isPostSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .where('post.slug = :slug', { slug });

    if (excludeId) {
      queryBuilder.andWhere('post.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  private async isPageSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.pageRepository
      .createQueryBuilder('page')
      .where('page.slug = :slug', { slug });

    if (excludeId) {
      queryBuilder.andWhere('page.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  private async isTagSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.tagRepository
      .createQueryBuilder('tag')
      .where('tag.slug = :slug', { slug });

    if (excludeId) {
      queryBuilder.andWhere('tag.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  private async isCategorySlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.slug = :slug', { slug });

    if (excludeId) {
      queryBuilder.andWhere('category.id != :excludeId', { excludeId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * Basic Korean to Roman character mapping
   * This is a simplified version - for full romanization, use a dedicated library
   */
  private koreanToRoman(char: string): string {
    // Basic Korean consonant/vowel to roman mapping
    const koreanMap: Record<string, string> = {
      '가': 'ga', '나': 'na', '다': 'da', '라': 'ra', '마': 'ma',
      '바': 'ba', '사': 'sa', '아': 'a', '자': 'ja', '차': 'cha',
      '카': 'ka', '타': 'ta', '파': 'pa', '하': 'ha',
      // Add more mappings as needed
    };

    return koreanMap[char] || char;
  }

  /**
   * Clean and optimize existing slugs in database
   */
  async cleanupExistingSlugs(): Promise<{
    postsUpdated: number;
    pagesUpdated: number;
    categoriesUpdated: number;
    tagsUpdated: number;
  }> {
    let postsUpdated = 0;
    let pagesUpdated = 0;
    let categoriesUpdated = 0;
    let tagsUpdated = 0;

    try {
      // Clean up post slugs
      const posts = await this.postRepository.find();
      for (const post of posts) {
        const newSlug = await this.ensureUniquePostSlug(post.title, post.id);
        if (newSlug !== post.slug) {
          await this.postRepository.update(post.id, { slug: newSlug });
          postsUpdated++;
        }
      }

      // Clean up page slugs
      const pages = await this.pageRepository.find();
      for (const page of pages) {
        const newSlug = await this.ensureUniquePageSlug(page.title, page.id);
        if (newSlug !== page.slug) {
          await this.pageRepository.update(page.id, { slug: newSlug });
          pagesUpdated++;
        }
      }

      // Clean up category slugs
      const categories = await this.categoryRepository.find();
      for (const category of categories) {
        const newSlug = await this.ensureUniqueCategorySlug(category.name, category.id);
        if (newSlug !== category.slug) {
          await this.categoryRepository.update(category.id, { slug: newSlug });
          categoriesUpdated++;
        }
      }

      // Clean up tag slugs
      const tags = await this.tagRepository.find();
      for (const tag of tags) {
        const newSlug = await this.ensureUniqueTagSlug(tag.name, tag.id);
        if (newSlug !== tag.slug) {
          await this.tagRepository.update(tag.id, { slug: newSlug });
          tagsUpdated++;
        }
      }

      return {
        postsUpdated,
        pagesUpdated,
        categoriesUpdated,
        tagsUpdated
      };
    } catch (error) {
      throw new Error(`Slug cleanup failed: ${error.message}`);
    }
  }
}

export const slugService = new SlugService();