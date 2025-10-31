import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as DataLoader from 'dataloader';
import { PostEntity } from '../entities/post.entity';
import { UserEntity } from '../entities/user.entity';
import { MediaEntity } from '../entities/media.entity';
import { TermEntity } from '../entities/term.entity';
import { MetaEntity } from '../entities/meta.entity';

interface LoaderKey {
  type: string;
  id: string | number;
}

@Injectable()
export class PresetDataLoader {
  private loaders: Map<string, DataLoader<any, any>>;

  constructor(
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(MediaEntity)
    private mediaRepository: Repository<MediaEntity>,
    @InjectRepository(TermEntity)
    private termRepository: Repository<TermEntity>,
    @InjectRepository(MetaEntity)
    private metaRepository: Repository<MetaEntity>
  ) {
    this.initializeLoaders();
  }

  private initializeLoaders(): void {
    this.loaders = new Map();

    // User loader
    this.loaders.set('author', new DataLoader<string, UserEntity>(
      async (ids: readonly string[]) => {
        const users = await this.userRepository.findByIds(ids as string[]);
        const userMap = new Map(users.map(u => [u.id, u]));
        return ids.map(id => userMap.get(id) || null);
      },
      { cache: true }
    ));

    // Category loader
    this.loaders.set('category', new DataLoader<string, TermEntity>(
      async (ids: readonly string[]) => {
        const terms = await this.termRepository
          .createQueryBuilder('term')
          .where('term.id IN (:...ids)', { ids })
          .andWhere('term.taxonomy = :taxonomy', { taxonomy: 'category' })
          .getMany();
        const termMap = new Map(terms.map(t => [t.id, t]));
        return ids.map(id => termMap.get(id) || null);
      },
      { cache: true }
    ));

    // Tags loader
    this.loaders.set('tags', new DataLoader<string, TermEntity[]>(
      async (postIds: readonly string[]) => {
        const relations = await this.termRepository
          .createQueryBuilder('term')
          .innerJoin('term_relationships', 'tr', 'tr.termId = term.id')
          .where('tr.postId IN (:...postIds)', { postIds })
          .andWhere('term.taxonomy = :taxonomy', { taxonomy: 'tag' })
          .getMany();

        const tagsByPost = new Map<string, TermEntity[]>();
        postIds.forEach(id => tagsByPost.set(id, []));

        relations.forEach(term => {
          // Note: This is simplified - you'd need the actual post-term mapping
          postIds.forEach(postId => {
            tagsByPost.get(postId)?.push(term);
          });
        });

        return postIds.map(id => tagsByPost.get(id) || []);
      },
      { cache: true }
    ));

    // Media loader
    this.loaders.set('media', new DataLoader<string, MediaEntity>(
      async (ids: readonly string[]) => {
        const media = await this.mediaRepository.findByIds(ids as string[]);
        const mediaMap = new Map(media.map(m => [m.id, m]));
        return ids.map(id => mediaMap.get(id) || null);
      },
      { cache: true }
    ));

    // ACF Fields loader
    this.loaders.set('acfFields', new DataLoader<string, Record<string, any>>(
      async (postIds: readonly string[]) => {
        const metas = await this.metaRepository
          .createQueryBuilder('meta')
          .where('meta.postId IN (:...postIds)', { postIds })
          .andWhere('meta.metaKey LIKE :pattern', { pattern: 'acf_%' })
          .getMany();

        const acfByPost = new Map<string, Record<string, any>>();
        postIds.forEach(id => acfByPost.set(id, {}));

        metas.forEach(meta => {
          const postAcf = acfByPost.get(meta.postId);
          if (postAcf) {
            const fieldName = meta.metaKey.replace('acf_', '');
            postAcf[fieldName] = this.parseMetaValue(meta.metaValue);
          }
        });

        return postIds.map(id => acfByPost.get(id) || {});
      },
      { cache: true }
    ));

    // Related Posts loader
    this.loaders.set('related', new DataLoader<string, PostEntity[]>(
      async (postIds: readonly string[]) => {
        // Get related posts based on ACF relationship field
        const relationMetas = await this.metaRepository
          .createQueryBuilder('meta')
          .where('meta.postId IN (:...postIds)', { postIds })
          .andWhere('meta.metaKey = :key', { key: 'related_posts' })
          .getMany();

        const relatedIds: string[] = [];
        const relationMap = new Map<string, string[]>();

        relationMetas.forEach(meta => {
          const ids = this.parseMetaValue(meta.metaValue);
          if (Array.isArray(ids)) {
            relationMap.set(meta.postId, ids);
            relatedIds.push(...ids);
          }
        });

        if (relatedIds.length === 0) {
          return postIds.map(() => []);
        }

        const relatedPosts = await this.postRepository.findByIds(relatedIds);
        const postMap = new Map(relatedPosts.map(p => [p.id, p]));

        return postIds.map(id => {
          const relIds = relationMap.get(id) || [];
          return relIds.map(relId => postMap.get(relId)).filter(Boolean) as PostEntity[];
        });
      },
      { cache: true }
    ));

    // Children posts loader
    this.loaders.set('children', new DataLoader<string, PostEntity[]>(
      async (parentIds: readonly string[]) => {
        const children = await this.postRepository
          .createQueryBuilder('post')
          .where('post.parentId IN (:...parentIds)', { parentIds })
          .getMany();

        const childrenByParent = new Map<string, PostEntity[]>();
        parentIds.forEach(id => childrenByParent.set(id, []));

        children.forEach(child => {
          if (child.parentId) {
            childrenByParent.get(child.parentId)?.push(child);
          }
        });

        return parentIds.map(id => childrenByParent.get(id) || []);
      },
      { cache: true }
    ));

    // Parent post loader
    this.loaders.set('parent', new DataLoader<string, PostEntity | null>(
      async (ids: readonly string[]) => {
        const posts = await this.postRepository.findByIds(ids as string[]);
        const postMap = new Map(posts.map(p => [p.id, p]));
        return ids.map(id => postMap.get(id) || null);
      },
      { cache: true }
    ));

    // Comments loader
    this.loaders.set('comments', new DataLoader<string, any[]>(
      async (postIds: readonly string[]) => {
        // Simplified - in reality, you'd load from comments table
        const comments = await this.postRepository
          .createQueryBuilder('comment')
          .where('comment.postType = :type', { type: 'comment' })
          .andWhere('comment.parentId IN (:...postIds)', { postIds })
          .getMany();

        const commentsByPost = new Map<string, any[]>();
        postIds.forEach(id => commentsByPost.set(id, []));

        comments.forEach(comment => {
          if (comment.parentId) {
            commentsByPost.get(comment.parentId)?.push(comment);
          }
        });

        return postIds.map(id => commentsByPost.get(id) || []);
      },
      { cache: true }
    ));

    // Reviews loader
    this.loaders.set('reviews', new DataLoader<string, any[]>(
      async (productIds: readonly string[]) => {
        const reviews = await this.postRepository
          .createQueryBuilder('review')
          .where('review.postType = :type', { type: 'review' })
          .andWhere('review.parentId IN (:...productIds)', { productIds })
          .getMany();

        const reviewsByProduct = new Map<string, any[]>();
        productIds.forEach(id => reviewsByProduct.set(id, []));

        reviews.forEach(review => {
          if (review.parentId) {
            reviewsByProduct.get(review.parentId)?.push(review);
          }
        });

        return productIds.map(id => reviewsByProduct.get(id) || []);
      },
      { cache: true }
    ));
  }

  async load(type: string, id: string | number): Promise<any> {
    const loader = this.loaders.get(type);
    if (!loader) {
      throw new Error(`No loader found for type: ${type}`);
    }
    return loader.load(String(id));
  }

  async loadMany(type: string, ids: (string | number)[]): Promise<any[]> {
    const loader = this.loaders.get(type);
    if (!loader) {
      throw new Error(`No loader found for type: ${type}`);
    }
    return loader.loadMany(ids.map(String));
  }

  clearCache(type?: string): void {
    if (type) {
      const loader = this.loaders.get(type);
      if (loader) {
        loader.clearAll();
      }
    } else {
      // Clear all loaders
      this.loaders.forEach(loader => loader.clearAll());
    }
  }

  private parseMetaValue(value: string): any {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, return as string
      return value;
    }
  }

  // Method to prime cache with data
  prime(type: string, id: string | number, value: any): void {
    const loader = this.loaders.get(type);
    if (loader) {
      loader.prime(String(id), value);
    }
  }

  // Method to get loader stats
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    this.loaders.forEach((loader, type) => {
      // Note: DataLoader doesn't expose stats directly
      // This is a placeholder for custom stat tracking
      stats[type] = {
        type,
        cached: true // All loaders have cache enabled
      };
    });

    return stats;
  }

  // Create custom loader for specific use case
  createCustomLoader<K, V>(
    batchFn: DataLoader.BatchLoadFn<K, V>,
    options?: DataLoader.Options<K, V>
  ): DataLoader<K, V> {
    return new DataLoader(batchFn, { cache: true, ...options });
  }
}