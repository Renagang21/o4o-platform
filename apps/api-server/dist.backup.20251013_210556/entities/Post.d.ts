import { User } from './User';
import { Category } from './Category';
import { Tag } from './Tag';
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
    content: string;
    excerpt: string;
    status: 'draft' | 'publish' | 'private' | 'trash';
    type: string;
    template: string;
    featured_media: string;
    comment_status: 'open' | 'closed';
    ping_status: 'open' | 'closed';
    sticky: boolean;
    meta: Record<string, any>;
    categories: Category[];
    tags: Tag[];
    seo: SEOMetadata;
    author_id: string;
    author: User;
    created_at: Date;
    updated_at: Date;
    published_at: Date;
}
//# sourceMappingURL=Post.d.ts.map