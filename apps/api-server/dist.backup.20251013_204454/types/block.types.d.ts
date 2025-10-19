/**
 * Block Registry Types
 * AI 페이지 생성을 위한 블록 정보 관리
 */
export interface BlockAttribute {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default?: any;
    description?: string;
    enum?: string[];
}
export interface BlockMigration {
    version: string;
    description: string;
    migrate?: string;
}
export interface BlockInfo {
    name: string;
    title: string;
    description: string;
    category: string;
    attributes: Record<string, BlockAttribute>;
    example: {
        json: string;
        text?: string;
    };
    version: string;
    tags: string[];
    deprecated?: boolean;
    replacedBy?: string;
    migrations?: BlockMigration[];
    aiPrompts?: string[];
    supports?: {
        html?: boolean;
        className?: boolean;
        anchor?: boolean;
        align?: boolean;
        [key: string]: any;
    };
}
export interface BlockCategory {
    name: string;
    title: string;
    icon?: string;
    priority: number;
}
export interface BlockAIReference {
    name: string;
    title: string;
    description: string;
    category: string;
    attributes: Record<string, BlockAttribute>;
    example: {
        json: string;
        text?: string;
    };
    version: string;
    tags: string[];
    aiPrompts: string[];
    deprecated?: boolean;
    replacedBy?: string;
}
export interface BlockRegistryResponse {
    total: number;
    categories: BlockCategory[];
    blocks: BlockAIReference[];
    schemaVersion: string;
    lastUpdated: string;
}
//# sourceMappingURL=block.types.d.ts.map