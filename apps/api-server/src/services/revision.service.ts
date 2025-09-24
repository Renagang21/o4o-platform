import { AppDataSource } from '../database/connection';
import { Post } from '../entities/Post';
import { Page } from '../entities/Page';
import { PostRevision, RevisionChanges } from '../entities/PostRevision';
import { PageRevision, PageRevisionChanges } from '../entities/PageRevision';
import { User } from '../entities/User';
import logger from '../utils/logger';

export interface CreateRevisionData {
  entityId: string;
  entityType: 'post' | 'page';
  authorId: string;
  revisionType: 'manual' | 'autosave' | 'publish' | 'restore';
  changeDescription?: string;
  isRestorePoint?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface RevisionComparison {
  revisionId: string;
  compareToId: string;
  changes: {
    title?: { from: string; to: string; type: 'added' | 'removed' | 'modified' };
    content?: { from: any; to: any; type: 'added' | 'removed' | 'modified' };
    status?: { from: string; to: string; type: 'added' | 'removed' | 'modified' };
    [key: string]: any;
  };
  summary: string;
  similarity: number;
}

export class RevisionService {
  private postRepository = AppDataSource.getRepository(Post);
  private pageRepository = AppDataSource.getRepository(Page);
  private postRevisionRepository = AppDataSource.getRepository(PostRevision);
  private pageRevisionRepository = AppDataSource.getRepository(PageRevision);

  private readonly maxRevisionsPerEntity = 20;

  /**
   * Create a new revision for a post
   */
  async createPostRevision(post: Post, revisionData: CreateRevisionData): Promise<PostRevision> {
    try {
      // Get current revision number
      const latestRevision = await this.postRevisionRepository.findOne({
        where: { postId: post.id },
        order: { revisionNumber: 'DESC' }
      });

      const revisionNumber = (latestRevision?.revisionNumber || 0) + 1;

      // Calculate changes if comparing to previous revision
      let changes: RevisionChanges | undefined;
      if (latestRevision) {
        changes = this.calculatePostChanges(latestRevision, post);
      }

      // Create revision
      const revision = this.postRevisionRepository.create({
        postId: post.id,
        revisionNumber,
        authorId: revisionData.authorId,
        revisionType: revisionData.revisionType,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        status: post.status,
        seo: post.seo,
        customFields: post.meta, // Post.meta → PostRevision.customFields for compatibility
        tags: post.tags?.map(tag => typeof tag === 'string' ? tag : tag.name) || [],
        postMeta: post.meta, // Post.meta → PostRevision.postMeta for compatibility
        changes,
        changeDescription: revisionData.changeDescription,
        isRestorePoint: revisionData.isRestorePoint || false,
        wordCount: this.calculateWordCount(post.content),
        ipAddress: revisionData.ipAddress,
        userAgent: revisionData.userAgent
      });

      const savedRevision = await this.postRevisionRepository.save(revision);

      // Clean up old revisions
      await this.cleanupOldPostRevisions(post.id);

      logger.info('Post revision created', {
        postId: post.id,
        revisionId: savedRevision.id,
        revisionNumber,
        revisionType: revisionData.revisionType,
        authorId: revisionData.authorId
      });

      return savedRevision;
    } catch (error) {
      logger.error('Error creating post revision:', error);
      throw error;
    }
  }

  /**
   * Create a new revision for a page
   */
  async createPageRevision(page: Page, revisionData: CreateRevisionData): Promise<PageRevision> {
    try {
      const latestRevision = await this.pageRevisionRepository.findOne({
        where: { pageId: page.id },
        order: { revisionNumber: 'DESC' }
      });

      const revisionNumber = (latestRevision?.revisionNumber || 0) + 1;

      let changes: PageRevisionChanges | undefined;
      if (latestRevision) {
        changes = this.calculatePageChanges(latestRevision, page);
      }

      const revision = this.pageRevisionRepository.create({
        pageId: page.id,
        revisionNumber,
        authorId: revisionData.authorId,
        revisionType: revisionData.revisionType,
        title: page.title,
        content: page.content,
        excerpt: page.excerpt,
        status: page.status,
        parentId: page.parentId,
        menuOrder: page.menuOrder,
        showInMenu: page.showInMenu,
        template: page.template,
        seo: page.seo,
        customFields: page.customFields,
        changes,
        changeDescription: revisionData.changeDescription,
        isRestorePoint: revisionData.isRestorePoint || false,
        ipAddress: revisionData.ipAddress,
        userAgent: revisionData.userAgent
      });

      const savedRevision = await this.pageRevisionRepository.save(revision);

      await this.cleanupOldPageRevisions(page.id);

      logger.info('Page revision created', {
        pageId: page.id,
        revisionId: savedRevision.id,
        revisionNumber,
        revisionType: revisionData.revisionType,
        authorId: revisionData.authorId
      });

      return savedRevision;
    } catch (error) {
      logger.error('Error creating page revision:', error);
      throw error;
    }
  }

  /**
   * Get revisions for a post
   */
  async getPostRevisions(postId: string, limit: number = 20): Promise<PostRevision[]> {
    try {
      return await this.postRevisionRepository.find({
        where: { postId },
        relations: ['author'],
        order: { revisionNumber: 'DESC' },
        take: limit
      });
    } catch (error) {
      logger.error('Error getting post revisions:', error);
      throw error;
    }
  }

  /**
   * Get revisions for a page
   */
  async getPageRevisions(pageId: string, limit: number = 20): Promise<PageRevision[]> {
    try {
      return await this.pageRevisionRepository.find({
        where: { pageId },
        relations: ['author'],
        order: { revisionNumber: 'DESC' },
        take: limit
      });
    } catch (error) {
      logger.error('Error getting page revisions:', error);
      throw error;
    }
  }

  /**
   * Restore post to a specific revision
   */
  async restorePostRevision(postId: string, revisionId: string, restoredBy: string): Promise<Post> {
    try {
      const revision = await this.postRevisionRepository.findOne({
        where: { id: revisionId, postId }
      });

      if (!revision) {
        throw new Error('Revision not found');
      }

      const post = await this.postRepository.findOne({ where: { id: postId } });
      if (!post) {
        throw new Error('Post not found');
      }

      // Create a revision of current state before restoring
      await this.createPostRevision(post, {
        entityId: postId,
        entityType: 'post',
        authorId: restoredBy,
        revisionType: 'restore',
        changeDescription: `Restored to revision #${revision.revisionNumber}`,
        isRestorePoint: true
      });

      // Restore content (exclude tags for now as they need special handling)
      post.title = revision.title;
      post.content = revision.content;
      post.excerpt = revision.excerpt;
      post.status = revision.status as 'draft' | 'publish' | 'private' | 'trash';
      post.seo = revision.seo;
      post.meta = revision.customFields || revision.postMeta || {}; // Restore from either field to Post.meta
      post.updated_at = new Date();
      
      const updatedPost = await this.postRepository.save(post);

      // TODO: Handle tag restoration - need to convert string[] back to PostTag[]

      logger.info('Post restored from revision', {
        postId,
        revisionId,
        revisionNumber: revision.revisionNumber,
        restoredBy
      });

      return updatedPost;
    } catch (error) {
      logger.error('Error restoring post revision:', error);
      throw error;
    }
  }

  /**
   * Restore page to a specific revision
   */
  async restorePageRevision(pageId: string, revisionId: string, restoredBy: string): Promise<Page> {
    try {
      const revision = await this.pageRevisionRepository.findOne({
        where: { id: revisionId, pageId }
      });

      if (!revision) {
        throw new Error('Revision not found');
      }

      const page = await this.pageRepository.findOne({ where: { id: pageId } });
      if (!page) {
        throw new Error('Page not found');
      }

      await this.createPageRevision(page, {
        entityId: pageId,
        entityType: 'page',
        authorId: restoredBy,
        revisionType: 'restore',
        changeDescription: `Restored to revision #${revision.revisionNumber}`,
        isRestorePoint: true
      });

      const updatedPage = await this.pageRepository.save({
        ...page,
        title: revision.title,
        content: revision.content,
        excerpt: revision.excerpt,
        status: revision.status,
        parentId: revision.parentId,
        menuOrder: revision.menuOrder,
        showInMenu: revision.showInMenu,
        template: revision.template,
        seo: revision.seo,
        customFields: revision.customFields,
        lastModifiedBy: restoredBy,
        updated_at: new Date()
      });

      logger.info('Page restored from revision', {
        pageId,
        revisionId,
        revisionNumber: revision.revisionNumber,
        restoredBy
      });

      return updatedPage;
    } catch (error) {
      logger.error('Error restoring page revision:', error);
      throw error;
    }
  }

  /**
   * Compare two revisions
   */
  async compareRevisions(
    entityType: 'post' | 'page',
    revisionId1: string,
    revisionId2: string
  ): Promise<RevisionComparison> {
    try {
      let revision1: PostRevision | PageRevision | null;
      let revision2: PostRevision | PageRevision | null;

      if (entityType === 'post') {
        [revision1, revision2] = await Promise.all([
          this.postRevisionRepository.findOne({ where: { id: revisionId1 } }),
          this.postRevisionRepository.findOne({ where: { id: revisionId2 } })
        ]);
      } else {
        [revision1, revision2] = await Promise.all([
          this.pageRevisionRepository.findOne({ where: { id: revisionId1 } }),
          this.pageRevisionRepository.findOne({ where: { id: revisionId2 } })
        ]);
      }

      if (!revision1 || !revision2) {
        throw new Error('One or both revisions not found');
      }

      const changes = this.calculateDetailedChanges(revision1, revision2);
      const similarity = this.calculateSimilarity(revision1, revision2);
      const summary = this.generateComparisonSummary(changes);

      return {
        revisionId: revisionId1,
        compareToId: revisionId2,
        changes,
        summary,
        similarity
      };
    } catch (error) {
      logger.error('Error comparing revisions:', error);
      throw error;
    }
  }

  /**
   * Auto-save content (for drafts)
   */
  async autoSaveContent(
    entityId: string,
    entityType: 'post' | 'page',
    content: any,
    authorId: string
  ): Promise<{ success: boolean; revisionId?: string }> {
    try {
      // Check if content has actually changed
      const entity = entityType === 'post' 
        ? await this.postRepository.findOne({ where: { id: entityId } })
        : await this.pageRepository.findOne({ where: { id: entityId } });

      if (!entity) {
        throw new Error(`${entityType} not found`);
      }

      // Simple content comparison - if identical, skip autosave
      if (JSON.stringify(entity.content) === JSON.stringify(content)) {
        return { success: true };
      }

      // Update entity with new content
      await (entityType === 'post' ? this.postRepository : this.pageRepository)
        .update(entityId, { content, updated_at: new Date() });

      // Create autosave revision
      const updatedEntity = entityType === 'post'
        ? await this.postRepository.findOne({ where: { id: entityId } })
        : await this.pageRepository.findOne({ where: { id: entityId } });

      if (!updatedEntity) {
        throw new Error('Failed to retrieve updated entity');
      }

      const revision = entityType === 'post'
        ? await this.createPostRevision(updatedEntity as Post, {
            entityId,
            entityType,
            authorId,
            revisionType: 'autosave',
            changeDescription: 'Auto-saved content'
          })
        : await this.createPageRevision(updatedEntity as Page, {
            entityId,
            entityType,
            authorId,
            revisionType: 'autosave',
            changeDescription: 'Auto-saved content'
          });

      return { success: true, revisionId: revision.id };
    } catch (error) {
      logger.error('Error auto-saving content:', error);
      return { success: false };
    }
  }

  /**
   * Delete old revisions to maintain limit
   */
  private async cleanupOldPostRevisions(postId: string): Promise<void> {
    try {
      const totalRevisions = await this.postRevisionRepository.count({
        where: { postId }
      });

      if (totalRevisions > this.maxRevisionsPerEntity) {
        const revisionsToDelete = totalRevisions - this.maxRevisionsPerEntity;
        
        const oldestRevisions = await this.postRevisionRepository.find({
          where: { 
            postId,
            isRestorePoint: false // Don't delete restore points
          },
          order: { revisionNumber: 'ASC' },
          take: revisionsToDelete
        });

        if (oldestRevisions.length > 0) {
          await this.postRevisionRepository.remove(oldestRevisions);
          
          logger.debug('Cleaned up old post revisions', {
            postId,
            deletedCount: oldestRevisions.length
          });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old post revisions:', error);
    }
  }

  private async cleanupOldPageRevisions(pageId: string): Promise<void> {
    try {
      const totalRevisions = await this.pageRevisionRepository.count({
        where: { pageId }
      });

      if (totalRevisions > this.maxRevisionsPerEntity) {
        const revisionsToDelete = totalRevisions - this.maxRevisionsPerEntity;
        
        const oldestRevisions = await this.pageRevisionRepository.find({
          where: { 
            pageId,
            isRestorePoint: false
          },
          order: { revisionNumber: 'ASC' },
          take: revisionsToDelete
        });

        if (oldestRevisions.length > 0) {
          await this.pageRevisionRepository.remove(oldestRevisions);
          
          logger.debug('Cleaned up old page revisions', {
            pageId,
            deletedCount: oldestRevisions.length
          });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up old page revisions:', error);
    }
  }

  /**
   * Calculate changes between revisions
   */
  private calculatePostChanges(oldRevision: PostRevision, newPost: Post): RevisionChanges {
    const changes: RevisionChanges = {};

    if (oldRevision.title !== newPost.title) {
      changes.title = { from: oldRevision.title, to: newPost.title };
    }

    if (JSON.stringify(oldRevision.content) !== JSON.stringify(newPost.content)) {
      changes.content = { from: oldRevision.content, to: newPost.content };
    }

    if (oldRevision.status !== newPost.status) {
      changes.status = { from: oldRevision.status, to: newPost.status };
    }

    if (oldRevision.excerpt !== newPost.excerpt) {
      changes.excerpt = { from: oldRevision.excerpt || '', to: newPost.excerpt || '' };
    }

    if (JSON.stringify(oldRevision.seo) !== JSON.stringify(newPost.seo)) {
      changes.seo = { from: oldRevision.seo, to: newPost.seo };
    }

    if (JSON.stringify(oldRevision.customFields) !== JSON.stringify(newPost.meta)) {
      changes.customFields = { from: oldRevision.customFields, to: newPost.meta };
    }

    if (JSON.stringify(oldRevision.tags) !== JSON.stringify(newPost.tags)) {
      changes.tags = { from: oldRevision.tags, to: newPost.tags };
    }

    return changes;
  }

  private calculatePageChanges(oldRevision: PageRevision, newPage: Page): PageRevisionChanges {
    const changes: PageRevisionChanges = {};

    if (oldRevision.title !== newPage.title) {
      changes.title = { from: oldRevision.title, to: newPage.title };
    }

    if (JSON.stringify(oldRevision.content) !== JSON.stringify(newPage.content)) {
      changes.content = { from: oldRevision.content, to: newPage.content };
    }

    if (oldRevision.status !== newPage.status) {
      changes.status = { from: oldRevision.status, to: newPage.status };
    }

    if (oldRevision.parentId !== newPage.parentId) {
      changes.parentId = { from: oldRevision.parentId, to: newPage.parentId };
    }

    if (oldRevision.menuOrder !== newPage.menuOrder) {
      changes.menuOrder = { from: oldRevision.menuOrder, to: newPage.menuOrder };
    }

    if (oldRevision.showInMenu !== newPage.showInMenu) {
      changes.showInMenu = { from: oldRevision.showInMenu, to: newPage.showInMenu };
    }

    if (oldRevision.template !== newPage.template) {
      changes.template = { from: oldRevision.template || '', to: newPage.template || '' };
    }

    return changes;
  }

  private calculateDetailedChanges(revision1: any, revision2: any): any {
    const changes: any = {};

    const fields = ['title', 'content', 'status', 'excerpt'];
    
    for (const field of fields) {
      const val1 = revision1[field];
      const val2 = revision2[field];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes[field] = {
          from: val1,
          to: val2,
          type: this.getChangeType(val1, val2)
        };
      }
    }

    return changes;
  }

  private getChangeType(oldValue: any, newValue: any): 'added' | 'removed' | 'modified' {
    if (!oldValue && newValue) return 'added';
    if (oldValue && !newValue) return 'removed';
    return 'modified';
  }

  private calculateSimilarity(revision1: any, revision2: any): number {
    const content1 = this.extractTextContent(revision1.content);
    const content2 = this.extractTextContent(revision2.content);
    
    if (content1.length === 0 && content2.length === 0) return 1.0;
    if (content1.length === 0 || content2.length === 0) return 0.0;

    const longer = content1.length > content2.length ? content1 : content2;
    const shorter = content1.length > content2.length ? content2 : content1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private generateComparisonSummary(changes: any): string {
    const changeTypes = Object.keys(changes);
    
    if (changeTypes.length === 0) {
      return 'No changes detected';
    }

    const summaryParts = changeTypes.map(field => {
      const change = changes[field];
      return `${field} ${change.type}`;
    });

    return summaryParts.join(', ');
  }

  private calculateWordCount(content: any): number {
    if (!content || !content.blocks) return 0;

    let wordCount = 0;
    for (const block of content.blocks) {
      if (block.data && block.data.text) {
        const text = block.data.text.replace(/<[^>]*>/g, ''); // Remove HTML tags
        const words = text.split(/\s+/).filter(word => word.length > 0);
        wordCount += words.length;
      }
    }

    return wordCount;
  }

  private extractTextContent(content: any): string {
    if (!content || !content.blocks) return '';

    return content.blocks
      .filter((block: any) => block.data && block.data.text)
      .map((block: any) => block.data.text.replace(/<[^>]*>/g, ''))
      .join(' ')
      .trim();
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get revision statistics
   */
  async getRevisionStats(entityType: 'post' | 'page', entityId: string): Promise<{
    totalRevisions: number;
    manualRevisions: number;
    autosaveRevisions: number;
    restorePoints: number;
    averageTimeBetweenRevisions: number;
    mostActiveAuthor: { authorId: string; revisionCount: number } | null;
  }> {
    try {
      const repository = entityType === 'post' ? this.postRevisionRepository : this.pageRevisionRepository;
      const whereClause = entityType === 'post' ? { postId: entityId } : { pageId: entityId };

      const revisions = await repository.find({
        where: whereClause,
        relations: ['author'],
        order: { createdAt: 'ASC' }
      });

      const totalRevisions = revisions.length;
      const manualRevisions = revisions.filter(r => r.revisionType === 'manual').length;
      const autosaveRevisions = revisions.filter(r => r.revisionType === 'autosave').length;
      const restorePoints = revisions.filter(r => r.isRestorePoint).length;

      // Calculate average time between revisions
      let averageTimeBetweenRevisions = 0;
      if (revisions.length > 1) {
        const timeIntervals = [];
        for (let i = 1; i < revisions.length; i++) {
          const interval = revisions[i].createdAt.getTime() - revisions[i - 1].createdAt.getTime();
          timeIntervals.push(interval);
        }
        averageTimeBetweenRevisions = timeIntervals.reduce((sum, interval) => sum + interval, 0) / timeIntervals.length;
      }

      // Find most active author
      const authorCounts = new Map<string, number>();
      revisions.forEach(revision => {
        const count = authorCounts.get(revision.authorId) || 0;
        authorCounts.set(revision.authorId, count + 1);
      });

      let mostActiveAuthor = null;
      if (authorCounts.size > 0) {
        const [authorId, revisionCount] = Array.from(authorCounts.entries())
          .sort(([, a], [, b]) => b - a)[0];
        mostActiveAuthor = { authorId, revisionCount };
      }

      return {
        totalRevisions,
        manualRevisions,
        autosaveRevisions,
        restorePoints,
        averageTimeBetweenRevisions: Math.round(averageTimeBetweenRevisions / (1000 * 60)), // Convert to minutes
        mostActiveAuthor
      };
    } catch (error) {
      logger.error('Error getting revision stats:', error);
      throw error;
    }
  }
}

export const revisionService = new RevisionService();