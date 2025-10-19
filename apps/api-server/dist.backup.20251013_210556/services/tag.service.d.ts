import { Tag } from '../entities/Tag';
import { CreateTagDto, UpdateTagDto, TagStatistics } from '../types/tag.types';
export declare class TagService {
    private tagRepository;
    private postRepository;
    constructor();
    /**
     * Get all tags with pagination and filtering
     */
    getTags(options: {
        page: number;
        limit: number;
        search?: string;
        sortBy?: string;
        sortOrder?: 'ASC' | 'DESC';
    }): Promise<{
        tags: Tag[];
        total: number;
    }>;
    /**
     * Get a single tag by ID
     */
    getTagById(id: string): Promise<Tag | null>;
    /**
     * Find tag by slug
     */
    findBySlug(slug: string): Promise<Tag | null>;
    /**
     * Create a new tag
     */
    createTag(data: CreateTagDto & {
        createdBy?: string;
    }): Promise<Tag>;
    /**
     * Update an existing tag
     */
    updateTag(id: string, data: UpdateTagDto & {
        updatedBy?: string;
    }): Promise<Tag>;
    /**
     * Delete a tag
     */
    deleteTag(id: string): Promise<void>;
    /**
     * Get the number of posts using a tag
     */
    getTagPostCount(tagId: string): Promise<number>;
    /**
     * Merge one tag into another
     */
    mergeTags(fromId: string, toId: string): Promise<{
        targetTag: Tag;
        postsUpdated: number;
    }>;
    /**
     * Get tag statistics
     */
    getTagStatistics(tagId: string): Promise<TagStatistics | null>;
    /**
     * Get popular tags based on post count
     */
    getPopularTags(limit?: number): Promise<any[]>;
    /**
     * Search tags by name
     */
    searchTags(query: string, limit?: number): Promise<Tag[]>;
    /**
     * Bulk create tags
     */
    bulkCreateTags(tagNames: string[]): Promise<Tag[]>;
    /**
     * Get tags by IDs
     */
    getTagsByIds(ids: string[]): Promise<Tag[]>;
}
//# sourceMappingURL=tag.service.d.ts.map