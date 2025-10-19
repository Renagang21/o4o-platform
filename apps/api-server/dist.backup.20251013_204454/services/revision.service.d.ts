import { Post } from '../entities/Post';
import { Page } from '../entities/Page';
import { PostRevision } from '../entities/PostRevision';
import { PageRevision } from '../entities/PageRevision';
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
        title?: {
            from: string;
            to: string;
            type: 'added' | 'removed' | 'modified';
        };
        content?: {
            from: any;
            to: any;
            type: 'added' | 'removed' | 'modified';
        };
        status?: {
            from: string;
            to: string;
            type: 'added' | 'removed' | 'modified';
        };
        [key: string]: any;
    };
    summary: string;
    similarity: number;
}
export declare class RevisionService {
    private postRepository;
    private pageRepository;
    private postRevisionRepository;
    private pageRevisionRepository;
    private readonly maxRevisionsPerEntity;
    /**
     * Create a new revision for a post
     */
    createPostRevision(post: Post, revisionData: CreateRevisionData): Promise<PostRevision>;
    /**
     * Create a new revision for a page
     */
    createPageRevision(page: Page, revisionData: CreateRevisionData): Promise<PageRevision>;
    /**
     * Get revisions for a post
     */
    getPostRevisions(postId: string, limit?: number): Promise<PostRevision[]>;
    /**
     * Get revisions for a page
     */
    getPageRevisions(pageId: string, limit?: number): Promise<PageRevision[]>;
    /**
     * Restore post to a specific revision
     */
    restorePostRevision(postId: string, revisionId: string, restoredBy: string): Promise<Post>;
    /**
     * Restore page to a specific revision
     */
    restorePageRevision(pageId: string, revisionId: string, restoredBy: string): Promise<Page>;
    /**
     * Compare two revisions
     */
    compareRevisions(entityType: 'post' | 'page', revisionId1: string, revisionId2: string): Promise<RevisionComparison>;
    /**
     * Auto-save content (for drafts)
     */
    autoSaveContent(entityId: string, entityType: 'post' | 'page', content: any, authorId: string): Promise<{
        success: boolean;
        revisionId?: string;
    }>;
    /**
     * Delete old revisions to maintain limit
     */
    private cleanupOldPostRevisions;
    private cleanupOldPageRevisions;
    /**
     * Calculate changes between revisions
     */
    private calculatePostChanges;
    private calculatePageChanges;
    private calculateDetailedChanges;
    private getChangeType;
    private calculateSimilarity;
    private generateComparisonSummary;
    private calculateWordCount;
    private extractTextContent;
    private levenshteinDistance;
    /**
     * Get revision statistics
     */
    getRevisionStats(entityType: 'post' | 'page', entityId: string): Promise<{
        totalRevisions: number;
        manualRevisions: number;
        autosaveRevisions: number;
        restorePoints: number;
        averageTimeBetweenRevisions: number;
        mostActiveAuthor: {
            authorId: string;
            revisionCount: number;
        } | null;
    }>;
}
export declare const revisionService: RevisionService;
//# sourceMappingURL=revision.service.d.ts.map