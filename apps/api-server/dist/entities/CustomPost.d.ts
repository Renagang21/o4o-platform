import { CustomPostType } from './CustomPostType';
export declare enum PostStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    PRIVATE = "private",
    TRASH = "trash"
}
export declare class CustomPost {
    id: string;
    title: string;
    slug: string;
    postTypeSlug: string;
    status: PostStatus;
    fields: Record<string, string | number | boolean | Date | null | string[] | Record<string, unknown>>;
    content?: string;
    meta?: {
        seoTitle?: string;
        seoDescription?: string;
        featured?: boolean;
        thumbnail?: string;
        tags?: string[];
    };
    authorId?: string;
    viewCount: number;
    publishedAt?: Date;
    postType: CustomPostType;
    createdAt: Date;
    updatedAt: Date;
    getField<T = string | number | boolean | Date | null | string[] | Record<string, unknown>>(fieldName: string): T | undefined;
    setField(fieldName: string, value: string | number | boolean | Date | null | string[] | Record<string, unknown>): void;
    generateSlug(): string;
}
//# sourceMappingURL=CustomPost.d.ts.map