import { User } from './User';
export interface PatternBlock {
    name: string;
    attributes?: Record<string, any>;
    innerBlocks?: PatternBlock[];
    innerHTML?: string;
}
export interface PatternViewport {
    mobile?: number;
    tablet?: number;
    desktop?: number;
}
export interface PatternMetadata {
    version?: string;
    keywords?: string[];
    viewportWidth?: number | PatternViewport;
    inserter?: boolean;
    customCategories?: string[];
    blockTypes?: string[];
    postTypes?: string[];
    templateTypes?: string[];
}
export declare class BlockPattern {
    id: string;
    title: string;
    slug: string;
    description: string;
    content: PatternBlock[];
    category: string;
    subcategories: string[];
    tags: string[];
    preview: {
        html?: string;
        css?: string;
        screenshot?: string;
        width?: number;
        height?: number;
    };
    source: string;
    featured: boolean;
    usageCount: number;
    lastUsedAt: Date;
    visibility: string;
    isPremium: boolean;
    metadata: PatternMetadata;
    authorId: string;
    author: User;
    version: string;
    dependencies: string[];
    colorScheme: string[];
    typography: {
        fontFamily?: string;
        fontSize?: string;
        lineHeight?: string;
        fontWeight?: string;
    };
    status: string;
    createdAt: Date;
    updatedAt: Date;
    incrementUsage(): void;
    static generateSlug(title: string): string;
    isCompatible(blockTypes: string[], plugins: string[]): boolean;
    generatePreviewHtml(): string;
}
//# sourceMappingURL=BlockPattern.d.ts.map