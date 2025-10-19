import { Post } from './Post';
import { User } from './User';
export interface RevisionChanges {
    title?: {
        from: string;
        to: string;
    };
    content?: {
        from: any;
        to: any;
    };
    status?: {
        from: string;
        to: string;
    };
    excerpt?: {
        from: string;
        to: string;
    };
    seo?: {
        from: any;
        to: any;
    };
    customFields?: {
        from: any;
        to: any;
    };
    [key: string]: any;
}
export declare class PostRevision {
    id: string;
    postId: string;
    post: Post;
    revisionNumber: number;
    authorId: string;
    author: User;
    revisionType: 'manual' | 'autosave' | 'publish' | 'restore';
    title: string;
    content: any;
    excerpt?: string;
    status: string;
    seo?: any;
    customFields?: any;
    tags?: string[];
    postMeta?: any;
    changes?: RevisionChanges;
    changeDescription?: string;
    isRestorePoint: boolean;
    wordCount?: number;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    getDiffSummary(): string;
    isMajorChange(): boolean;
    private isContentSignificantlyChanged;
    private extractTextFromContent;
    private calculateSimilarity;
    private levenshteinDistance;
}
//# sourceMappingURL=PostRevision.d.ts.map