import { User } from './User';
import { Category } from './Category';
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
export interface PostRevision {
    id: string;
    timestamp: string;
    author: string;
    changes: Partial<Post>;
}
export interface PostFormat {
    type: 'standard' | 'aside' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio' | 'chat';
}
export interface PostMeta {
    featuredImage?: string;
    excerpt?: string;
    readingTime?: number;
    featured?: boolean;
    sticky?: boolean;
    [key: string]: unknown;
}
export declare class Post {
    id: string;
    title: string;
    slug: string;
    content: {
        blocks: Block[];
    };
    excerpt: string;
    status: string;
    type: string;
    format: string;
    template: string;
    categories: Category[];
    tags: string[];
    seo: SEOMetadata;
    customFields: Record<string, unknown>;
    postMeta: PostMeta;
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
    featured: boolean;
    sticky: boolean;
    featuredImage: string;
    readingTime: number;
    layoutSettings: Record<string, unknown>;
    revisions: PostRevision[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Post.d.ts.map