import { Page } from './Page';
import { User } from './User';
export interface PageRevisionChanges {
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
    parentId?: {
        from: string | null;
        to: string | null;
    };
    menuOrder?: {
        from: number;
        to: number;
    };
    showInMenu?: {
        from: boolean;
        to: boolean;
    };
    template?: {
        from: string;
        to: string;
    };
    [key: string]: any;
}
export declare class PageRevision {
    id: string;
    pageId: string;
    page: Page;
    revisionNumber: number;
    authorId: string;
    author: User;
    revisionType: 'manual' | 'autosave' | 'publish' | 'restore';
    title: string;
    content: any;
    excerpt?: string;
    status: string;
    parentId?: string;
    menuOrder: number;
    showInMenu: boolean;
    template?: string;
    seo?: any;
    customFields?: any;
    changes?: PageRevisionChanges;
    changeDescription?: string;
    isRestorePoint: boolean;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    getDiffSummary(): string;
    isStructuralChange(): boolean;
}
//# sourceMappingURL=PageRevision.d.ts.map