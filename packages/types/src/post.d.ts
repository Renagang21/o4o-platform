import type { Tag } from './common.js';
export interface PostCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    parentId?: string;
    parentName?: string;
    postCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export type PostStatus = 'draft' | 'pending' | 'published' | 'publish' | 'scheduled' | 'trash' | 'private';
export type PostType = 'post' | 'page';
export type PostVisibility = 'public' | 'private' | 'password';
export type CommentStatus = 'open' | 'closed';
export type PingStatus = 'open' | 'closed';
export interface PostMeta {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    ogImage?: string;
    canonicalUrl?: string;
}
export interface Post {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    type: PostType;
    status: PostStatus;
    visibility: PostVisibility;
    password?: string;
    authorId: string;
    author?: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    categoryIds?: string[];
    categories?: PostCategory[];
    tagIds?: string[];
    tags?: Tag[];
    featuredImageId?: string;
    featuredImage?: {
        id: string;
        url: string;
        alt?: string;
    };
    meta: PostMeta;
    publishedAt?: Date;
    scheduledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    revisions?: PostRevision[];
    commentCount?: number;
    viewCount?: number;
    commentStatus?: CommentStatus;
    pingStatus?: PingStatus;
    isSticky?: boolean;
}
export interface PostRevision {
    id: string;
    postId: string;
    title: string;
    content: string;
    excerpt?: string;
    authorId: string;
    createdAt: Date;
    reason?: string;
}
export interface CreatePostDto {
    title: string;
    content: string;
    excerpt?: string;
    slug?: string;
    type: PostType;
    status?: PostStatus;
    visibility?: PostVisibility;
    password?: string;
    categoryIds?: string[];
    tagIds?: string[];
    featuredImageId?: string;
    featuredImage?: {
        id: string;
        url: string;
        alt?: string;
    };
    meta?: PostMeta;
    metadata?: Record<string, any>;
    acfFields?: Record<string, any>;
    scheduledAt?: Date;
    template?: string;
    parentId?: string;
    order?: number;
}
export interface UpdatePostDto extends Partial<CreatePostDto> {
    id: string;
}
export interface PostFilter {
    type?: PostType;
    status?: PostStatus;
    authorId?: string;
    categoryId?: string;
    tagId?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
}
export interface PostListResponse {
    posts: Post[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface EditorBlock {
    id: string;
    type: string;
    content: any;
    attributes?: Record<string, unknown>;
}
export interface Block {
    id: string;
    type: string;
    content: any;
    attributes?: Record<string, unknown>;
    settings?: Record<string, unknown>;
    children?: Block[];
    innerBlocks?: Block[];
    order?: number;
    clientId?: string;
}
export interface EditorState {
    blocks: EditorBlock[];
    version: string;
}
export interface ColumnBlock extends Block {
    type: 'column';
    content: {
        columns: number;
        gap: string;
        verticalAlignment: 'top' | 'center' | 'bottom';
        stackOnMobile: boolean;
        backgroundColor?: string;
        padding?: string;
        borderRadius?: string;
        minHeight?: string;
    };
}
export interface TableBlock extends Block {
    type: 'table';
    content: {
        rows: any[][];
        hasHeader: boolean;
        hasFooter: boolean;
        striped: boolean;
        bordered: boolean;
        compact: boolean;
        responsive: boolean;
        headerBackgroundColor?: string;
        headerTextColor?: string;
        borderColor?: string;
        hoverColor?: string;
        fontSize?: string;
        cellPadding?: string;
        caption?: string;
    };
}
export interface PostWithBlocks extends Omit<Post, 'content'> {
    content: Block[];
    settings?: {
        layout?: string;
        template?: string;
        customCSS?: string;
    };
}
export interface CreatePostRequest extends Omit<CreatePostDto, 'content'> {
    slug: string;
    content: Block[] | string;
    settings?: {
        layout?: string;
        template?: string;
        customCSS?: string;
    };
    visibility: PostVisibility;
    categories?: PostCategory[];
    tags?: Tag[];
}
//# sourceMappingURL=post.d.ts.map