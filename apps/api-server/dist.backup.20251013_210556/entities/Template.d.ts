import { User } from './User';
export interface TemplateBlock {
    id: string;
    type: string;
    data: Record<string, unknown>;
    order: number;
}
export declare class Template {
    id: string;
    name: string;
    slug: string;
    description: string;
    type: string;
    layoutType: string;
    source: string;
    content: {
        blocks: TemplateBlock[];
    };
    settings: Record<string, unknown>;
    customFields: Record<string, unknown>;
    preview: string;
    authorId: string;
    author: User;
    active: boolean;
    featured: boolean;
    usageCount: number;
    tags: string[];
    version: string;
    compatibility: {
        minVersion?: string;
        maxVersion?: string;
        requiredPlugins?: string[];
    };
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=Template.d.ts.map