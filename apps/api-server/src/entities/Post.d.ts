import type { User } from './User.js';
import type { Category } from './Category.js';
import type { Tag } from './Tag.js';
import { AccessControl } from '@o4o/types';
import type { Block, SEOMetadata, PostRevision, PostMetaFields } from '@o4o/types/dist/cpt/index.js';
export type { Block, SEOMetadata, PostRevision };
export interface PostMeta extends PostMetaFields {
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
    tenant_id: string | null;
    template: string;
    featured_media: string;
    comment_status: 'open' | 'closed';
    ping_status: 'open' | 'closed';
    sticky: boolean;
    meta?: Record<string, any>;
    categories: Category[];
    tags: Tag[];
    seo: SEOMetadata;
    accessControl: AccessControl;
    hideFromSearchEngines: boolean;
    author_id: string;
    author: User;
    created_at: Date;
    updated_at: Date;
    published_at: Date;
}
//# sourceMappingURL=Post.d.ts.map