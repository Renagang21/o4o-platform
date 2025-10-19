import { User } from './User';
export interface TemplatePartBlock {
    id: string;
    type: string;
    data: Record<string, unknown>;
    attributes?: Record<string, unknown>;
    innerBlocks?: TemplatePartBlock[];
}
export type TemplatePartArea = 'header' | 'footer' | 'sidebar' | 'general';
export declare class TemplatePart {
    id: string;
    name: string;
    slug: string;
    description: string;
    area: TemplatePartArea;
    content: TemplatePartBlock[];
    settings: {
        containerWidth?: 'full' | 'wide' | 'narrow';
        backgroundColor?: string;
        textColor?: string;
        padding?: {
            top?: string;
            bottom?: string;
            left?: string;
            right?: string;
        };
        customCss?: string;
    };
    isActive: boolean;
    isDefault: boolean;
    authorId: string;
    author: User;
    priority: number;
    tags: string[];
    conditions: {
        pages?: string[];
        postTypes?: string[];
        categories?: string[];
        userRoles?: string[];
        subdomain?: string;
        path_prefix?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=TemplatePart.d.ts.map