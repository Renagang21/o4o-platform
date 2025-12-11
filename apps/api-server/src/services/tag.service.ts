import { Repository, Like, In } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { Tag } from '../entities/Tag.js';
import { CreateTagDto, UpdateTagDto, TagStatistics } from '../types/tag.types.js';
import { generateSlug } from '../utils/slug.js';

export class TagService {
  private tagRepository: Repository<Tag>;

  constructor() {
    this.tagRepository = AppDataSource.getRepository(Tag);
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
    const allowedSortFields = ['name', 'slug', 'createdAt', 'updatedAt', 'count'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'name';
    queryBuilder.orderBy(`tag.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Add pagination
    queryBuilder.skip(skip).limit(limit);

    const tags = await queryBuilder.getMany();

    return { tags, total };
  }

  /**
   * Get a single tag by ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    return await this.tagRepository.findOne({
      where: { id }
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

    // Store meta information in meta field
    tag.meta = {
      ...(tag.meta || {}),
      ...(data.metaTitle && { metaTitle: data.metaTitle }),
      ...(data.metaDescription && { metaDescription: data.metaDescription }),
      ...(data.meta || {}),
      ...(!data.metaTitle && !data.meta?.metaTitle && { metaTitle: data.name }),
      ...(!data.metaDescription && !data.meta?.metaDescription && { metaDescription: data.description || '' })
    };

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

    // Update meta information if provided
    if (data.metaTitle !== undefined || data.metaDescription !== undefined || data.meta !== undefined) {
      tag.meta = {
        ...(tag.meta || {}),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.meta || {})
      };
    }

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

    // Check if tag is in use
    if (tag.count > 0) {
      throw new Error(`Cannot delete tag with ${tag.count} usages`);
    }

    await this.tagRepository.remove(tag);
  }

  /**
   * Get the usage count of a tag
   */
  async getTagPostCount(tagId: string): Promise<number> {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId }
    });

    return tag?.count || 0;
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

    // Transfer count from source to target
    const countMerged = fromTag.count;
    toTag.count += countMerged;

    // Save target tag
    await this.tagRepository.save(toTag);

    // Delete the source tag
    await this.tagRepository.remove(fromTag);

    return {
      targetTag: toTag,
      postsUpdated: countMerged
    };
  }

  /**
   * Get tag statistics
   */
  async getTagStatistics(tagId: string): Promise<TagStatistics | null> {
    const tag = await this.tagRepository.findOne({
      where: { id: tagId }
    });

    if (!tag) {
      return null;
    }

    return {
      tagId,
      name: tag.name,
      slug: tag.slug,
      postCount: tag.count,
      totalViews: 0,
      recentPosts: [],
      popularPosts: [],
      createdAt: tag.created_at,
      updatedAt: tag.updated_at
    };
  }

  /**
   * Get popular tags based on count
   */
  async getPopularTags(limit: number = 10): Promise<any[]> {
    const tags = await this.tagRepository
      .createQueryBuilder('tag')
      .orderBy('tag.count', 'DESC')
      .limit(limit)
      .getMany();

    return tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag.count
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
