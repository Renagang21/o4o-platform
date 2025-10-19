import { User } from './User';
export interface Block {
    id: string;
    type: string;
    data: unknown;
    order: number;
}
export interface SEOMetadata {
    title?: string;
    description?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    twitterCard?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    canonicalUrl?: string;
    noindex?: boolean;
    nofollow?: boolean;
    schema?: Record<string, unknown>;
}
export interface PageRevision {
    id: string;
    timestamp: string;
    author: string;
    changes: Partial<Page>;
}
export declare class Page {
    id: string;
    title: string;
    slug: string;
    content: {
        blocks: Block[];
    };
    excerpt: string;
    status: string;
    type: string;
    template: string;
    parentId: string;
    parent: Page;
    children: Page[];
    menuOrder: number;
    showInMenu: boolean;
    isHomepage: boolean;
    seo: SEOMetadata;
    customFields: Record<string, unknown>;
    publishedAt: Date;
    scheduledAt: Date;
    authorId: string;
    author: User;
    lastModifiedBy: string;
    lastModifier: User;
    views: number;
    password: string;
    passwordProtected: boolean;
    allowComments: boolean;
    commentStatus: string;
    layoutSettings: Record<string, unknown>;
    revisions: PageRevision[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Page.d.ts.map