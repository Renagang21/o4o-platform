import { Post } from './Post';
export declare class Tag {
    id: string;
    name: string;
    slug: string;
    description?: string;
    count: number;
    meta: Record<string, any>;
    posts: Post[];
    created_at: Date;
    updated_at: Date;
    generateSlug(): void;
    incrementUsage(): void;
    decrementUsage(): void;
}
//# sourceMappingURL=Tag.d.ts.map