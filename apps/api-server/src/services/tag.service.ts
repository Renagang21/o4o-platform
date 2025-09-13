import { Repository, Like, In } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { Tag } from '../entities/Tag';
import { Post } from '../entities/Post';
import { CreateTagDto, UpdateTagDto, TagStatistics } from '../types/tag.types';
import { generateSlug } from '../utils/slug';

export class TagService {
  private tagRepository: Repository<Tag>;
  private postRepository: Repository<Post>;

  constructor() {
    this.tagRepository = AppDataSource.getRepository(Tag);
    this.postRepository = AppDataSource.getRepository(Post);
  }

  /**
   * Get all tags with pagination and filtering
   */
  async getTags(options: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ tags: Tag[]; total: number }> {
    const { page, limit, search, sortBy = 'name', sortOrder = 'ASC' } = options;
    const skip = (page - 1) * limit;

    const queryBuilder = this.tagRepository.createQueryBuilder('tag');

    // Add search condition
    if (search) {
      queryBuilder.where(
        '(tag.name LIKE :search OR tag.slug LIKE :search OR tag.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Add sorting
    const allowedSortFields = ['name', 'slug', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    queryBuilder.orderBy(`tag.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Add pagination
    queryBuilder.skip(skip).limit(limit);

    // Load post count for each tag
    queryBuilder.loadRelationCountAndMap('tag.postCount', 'tag.posts');

    const tags = await queryBuilder.getMany();

    return { tags, total };
  }

  /**
   * Get a single tag by ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    return await this.tagRepository.findOne({
      where: { id },
      relations: ['posts']
    });
  }

  /**
   * Find tag by slug
   */
  async findBySlug(slug: string): Promise<Tag | null> {
    const normalizedSlug = generateSlug(slug);
    return await this.tagRepository.findOne({
      where: { slug: normalizedSlug }
    });
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagDto & { createdBy?: string }): Promise<Tag> {
    const tag = new Tag();
    
    tag.name = data.name;
    tag.slug = data.slug || generateSlug(data.name);
    tag.description = data.description || '';
    tag.metaTitle = data.metaTitle || data.name;
    tag.metaDescription = data.metaDescription || data.description || '';
    
    // Set timestamps
    tag.createdAt = new Date();
    tag.updatedAt = new Date();

    return await this.tagRepository.save(tag);
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: string, data: UpdateTagDto & { updatedBy?: string }): Promise<Tag> {
    const tag = await this.getTagById(id);
    
    if (!tag) {
      throw new Error('Tag not found');
    }

    // Update fields if provided
    if (data.name !== undefined) tag.name = data.name;
    if (data.slug !== undefined) tag.slug = generateSlug(data.slug);
    if (data.description !== undefined) tag.description = data.description;
    if (data.metaTitle !== undefined) tag.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined) tag.metaDescription = data.metaDescription;

    // Update timestamp
    tag.updatedAt = new Date();

    return await this.tagRepository.save(tag);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    const tag = await this.getTagById(id);
    
    if (!tag) {
      throw new Error('Tag not found');
    }

    // Check if tag has posts
    const postCount = await this.getTagPostCount(id);
    if (postCount > 0) {
      throw new Error(`Cannot delete tag with ${postCount} associated posts`);
    }

    await this.tagRepository.remove(tag);
  }

  /**
   * Get the number of posts using a tag
   */
  async getTagPostCount(tagId: string): Promise<number> {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
      relations: ['posts']
    });

    return tag?.posts?.length || 0;
  }

  /**
   * Merge one tag into another
   */
  async mergeTags(fromId: string, toId: string): Promise<{ targetTag: Tag; postsUpdated: number }> {
    const fromTag = await this.getTagById(fromId);
    const toTag = await this.getTagById(toId);

    if (!fromTag || !toTag) {
      throw new Error('One or both tags not found');
    }

    // Get all posts with the source tag
    const posts = fromTag.posts || [];
    let postsUpdated = 0;

    // Update each post to use the target tag
    for (const post of posts) {
      // Remove old tag
      if (post.tags) {
        post.tags = post.tags.filter(tag => tag.id !== fromId);
        
        // Add new tag if not already present
        const hasTargetTag = post.tags.some(tag => tag.id === toId);
        if (!hasTargetTag) {
          post.tags.push(toTag);
          postsUpdated++;
        }
        
        await this.postRepository.save(post);
      }
    }

    // Delete the source tag
    await this.tagRepository.remove(fromTag);

    return {
      targetTag: toTag,
      postsUpdated
    };
  }

  /**
   * Get tag statistics
   */
  async getTagStatistics(tagId: string): Promise<TagStatistics | null> {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId },
      relations: ['posts']
    });

    if (!tag) {
      return null;
    }

    const posts = tag.posts || [];
    const postCount = posts.length;

    // Calculate view count (sum of all post views)
    let totalViews = 0;
    for (const post of posts) {
      totalViews += 0; // viewCount not available in Post entity yet
    }

    // Get recent posts
    const recentPosts = posts
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);

    // Get most viewed posts (using creation date as fallback for now)
    const popularPosts = posts
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);

    return {
      tagId,
      name: tag.name,
      slug: tag.slug,
      postCount,
      totalViews,
      recentPosts: recentPosts.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        createdAt: p.createdAt,
        viewCount: 0 // viewCount not available yet
      })),
      popularPosts: popularPosts.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        viewCount: 0 // viewCount not available yet
      })),
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
    };
  }

  /**
   * Get popular tags based on post count
   */
  async getPopularTags(limit: number = 10): Promise<any[]> {
    const tags = await this.tagRepository
      .createQueryBuilder('tag')
      .loadRelationCountAndMap('tag.postCount', 'tag.posts')
      .orderBy('tag.postCount', 'DESC')
      .limit(limit)
      .getMany();

    return tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: (tag as any).postCount || 0
    }));
  }

  /**
   * Search tags by name
   */
  async searchTags(query: string, limit: number = 10): Promise<Tag[]> {
    return await this.tagRepository.find({
      where: [
        { name: Like(`%${query}%`) },
        { slug: Like(`%${query}%`) }
      ],
      take: limit,
      order: {
        name: 'ASC'
      }
    });
  }

  /**
   * Bulk create tags
   */
  async bulkCreateTags(tagNames: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];
    
    for (const name of tagNames) {
      const slug = generateSlug(name);
      
      // Check if tag already exists
      let tag = await this.findBySlug(slug);
      
      if (!tag) {
        // Create new tag
        tag = await this.createTag({ name, slug });
      }
      
      tags.push(tag);
    }
    
    return tags;
  }

  /**
   * Get tags by IDs
   */
  async getTagsByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) {
      return [];
    }
    
    return await this.tagRepository.find({
      where: {
        id: In(ids)
      }
    });
  }
}