/**
 * Shortcode Registry Types
 * AI 페이지 생성을 위한 shortcode 정보 관리
 */
export interface ShortcodeParameter {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    default?: any;
    description: string;
    options?: string[];
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
}
export interface ShortcodeMigration {
    version: string;
    description: string;
    migrate?: string;
}
export interface ShortcodeInfo {
    name: string;
    description: string;
    category: string;
    parameters: Record<string, ShortcodeParameter>;
    examples: string[];
    version: string;
    tags: string[];
    deprecated?: boolean;
    replacedBy?: string;
    migrations?: ShortcodeMigration[];
    aiPrompts?: string[];
}
export interface ShortcodeCategory {
    name: string;
    description: string;
    icon?: string;
    priority: number;
}
export interface ShortcodeAIReference {
    name: string;
    usage: string;
    description: string;
    parameters: string;
    examples: string[];
    category: string;
    tags: string[];
    aiPrompts: string[];
}
export interface ShortcodeRegistryResponse {
    total: number;
    categories: ShortcodeCategory[];
    shortcodes: ShortcodeAIReference[];
    schemaVersion: string;
    lastUpdated: string;
}
//# sourceMappingURL=shortcode.types.d.ts.map