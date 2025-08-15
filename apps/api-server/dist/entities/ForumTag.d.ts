export declare class ForumTag {
    id: string;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    usageCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    incrementUsage(): void;
    decrementUsage(): void;
    static generateSlug(name: string): string;
}
//# sourceMappingURL=ForumTag.d.ts.map