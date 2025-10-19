import { User } from './User';
export interface BlockContent {
    id: string;
    type: string;
    data: unknown;
    innerBlocks?: BlockContent[];
}
export interface ReusableBlockRevision {
    id: string;
    timestamp: string;
    author: string;
    changes: Partial<ReusableBlock>;
    blockData: BlockContent[];
}
export declare class ReusableBlock {
    id: string;
    title: string;
    slug: string;
    description: string;
    content: BlockContent[];
    status: string;
    category: string;
    tags: string[];
    usageCount: number;
    lastUsedAt: Date;
    isGlobal: boolean;
    isEditable: boolean;
    preview: {
        html?: string;
        css?: string;
        screenshot?: string;
        width?: number;
        height?: number;
    };
    authorId: string;
    author: User;
    lastModifiedBy: string;
    lastModifier: User;
    revisions: ReusableBlockRevision[];
    visibility: 'private' | 'public' | 'organization';
    metadata: {
        version?: string;
        compatibility?: string[];
        requirements?: string[];
        keywords?: string[];
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        [key: string]: unknown;
    };
    createdAt: Date;
    updatedAt: Date;
    incrementUsage(): void;
    canEdit(userId: string): boolean;
    static generateSlug(title: string): string;
    generatePreview(html: string, css?: string): void;
}
//# sourceMappingURL=ReusableBlock.d.ts.map