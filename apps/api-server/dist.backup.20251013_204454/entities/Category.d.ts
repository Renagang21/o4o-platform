import { Post } from './Post';
export declare class Category {
    id: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    sortOrder: number;
    isActive: boolean;
    metaTitle?: string;
    metaDescription?: string;
    parent?: Category;
    children: Category[];
    count: number;
    posts: Post[];
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=Category.d.ts.map