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
    posts: Post[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Category.d.ts.map