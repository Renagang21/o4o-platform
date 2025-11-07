import { AppDataSource } from '../../../database/connection.js'
import { PostMeta } from '../../../entities/PostMeta.js'
import { validateMetaKey, InvalidMetaKeyError } from '../../../dto/meta.dto.js'
import logger from '../../../utils/logger.js'
import { Repository } from 'typeorm'

/**
 * PostMeta Module
 * Handles CRUD operations on normalized post_meta table
 *
 * Phase 4-1: Post Meta CRUD API
 * Created: 2025-11-06
 */
export class PostMetaModule {
  private get repository(): Repository<PostMeta> {
    return AppDataSource.getRepository(PostMeta)
  }

  /**
   * List all metadata for a post
   * GET /api/v1/posts/:id/meta
   */
  async list(postId: string): Promise<PostMeta[]> {
    try {
      const items = await this.repository.find({
        where: { post_id: postId },
        order: { meta_key: 'ASC' }
      })

      return items
    } catch (error: any) {
      logger.error('Error listing post meta:', error)
      throw new Error('Failed to list post meta')
    }
  }

  /**
   * Get specific metadata by key
   * GET /api/v1/posts/:id/meta/:key
   * Returns null if key doesn't exist (not 404)
   */
  async get(postId: string, metaKey: string): Promise<PostMeta | null> {
    try {
      if (!validateMetaKey(metaKey)) {
        throw new InvalidMetaKeyError(metaKey)
      }

      const item = await this.repository.findOne({
        where: { post_id: postId, meta_key: metaKey }
      })

      return item
    } catch (error: any) {
      if (error instanceof InvalidMetaKeyError) {
        throw error
      }
      logger.error('Error getting post meta:', error)
      throw new Error('Failed to get post meta')
    }
  }

  /**
   * Upsert (insert or update) metadata
   * PUT /api/v1/posts/:id/meta
   * Creates new entry if key doesn't exist, updates if exists
   */
  async upsert(postId: string, metaKey: string, metaValue: unknown): Promise<PostMeta> {
    try {
      if (!validateMetaKey(metaKey)) {
        throw new InvalidMetaKeyError(metaKey)
      }

      // Check if exists
      let existing = await this.repository.findOne({
        where: { post_id: postId, meta_key: metaKey }
      })

      if (existing) {
        // Update existing
        existing.meta_value = metaValue
        existing.updated_at = new Date()
        return await this.repository.save(existing)
      } else {
        // Insert new
        const newMeta = this.repository.create({
          post_id: postId,
          meta_key: metaKey,
          meta_value: metaValue
        })
        return await this.repository.save(newMeta)
      }
    } catch (error: any) {
      if (error instanceof InvalidMetaKeyError) {
        throw error
      }
      logger.error('Error upserting post meta:', error)
      throw new Error('Failed to upsert post meta')
    }
  }

  /**
   * Delete metadata by key
   * DELETE /api/v1/posts/:id/meta/:key
   * Idempotent - returns deleted:false if key doesn't exist
   */
  async delete(postId: string, metaKey: string): Promise<{ deleted: boolean }> {
    try {
      if (!validateMetaKey(metaKey)) {
        throw new InvalidMetaKeyError(metaKey)
      }

      const result = await this.repository.delete({
        post_id: postId,
        meta_key: metaKey
      })

      return { deleted: (result.affected || 0) > 0 }
    } catch (error: any) {
      if (error instanceof InvalidMetaKeyError) {
        throw error
      }
      logger.error('Error deleting post meta:', error)
      throw new Error('Failed to delete post meta')
    }
  }

  /**
   * Increment counter metadata
   * PATCH /api/v1/posts/:id/meta/:key/increment
   * If key doesn't exist, creates with initial value = by
   * If key exists but not a number, throws error
   */
  async increment(postId: string, metaKey: string, by: number = 1): Promise<PostMeta> {
    try {
      if (!validateMetaKey(metaKey)) {
        throw new InvalidMetaKeyError(metaKey)
      }

      const existing = await this.repository.findOne({
        where: { post_id: postId, meta_key: metaKey }
      })

      if (existing) {
        // Validate existing value is numeric
        const currentValue = existing.meta_value as any

        if (typeof currentValue !== 'object' || currentValue === null) {
          throw new Error(`Cannot increment non-object meta_value for key "${metaKey}"`)
        }

        // Expect format: { count: number } for counters
        if (typeof currentValue.count !== 'number') {
          // Initialize if not a counter yet
          currentValue.count = 0
        }

        currentValue.count += by
        existing.meta_value = currentValue
        existing.updated_at = new Date()

        return await this.repository.save(existing)
      } else {
        // Create new counter
        const newMeta = this.repository.create({
          post_id: postId,
          meta_key: metaKey,
          meta_value: { count: by }
        })
        return await this.repository.save(newMeta)
      }
    } catch (error: any) {
      if (error instanceof InvalidMetaKeyError) {
        throw error
      }
      logger.error('Error incrementing post meta:', error)
      throw error
    }
  }

  /**
   * Batch get metadata for multiple posts (N+1 prevention)
   * Returns Map<postId, PostMeta[]>
   */
  async getBatch(postIds: string[]): Promise<Map<string, PostMeta[]>> {
    try {
      if (postIds.length === 0) {
        return new Map()
      }

      const items = await this.repository
        .createQueryBuilder('pm')
        .where('pm.post_id IN (:...postIds)', { postIds })
        .orderBy('pm.meta_key', 'ASC')
        .getMany()

      // Group by post_id
      const grouped = new Map<string, PostMeta[]>()
      for (const item of items) {
        if (!grouped.has(item.post_id)) {
          grouped.set(item.post_id, [])
        }
        grouped.get(item.post_id)!.push(item)
      }

      return grouped
    } catch (error: any) {
      logger.error('Error getting post meta batch:', error)
      throw new Error('Failed to get post meta batch')
    }
  }
}

export const postMetaModule = new PostMetaModule()
