import { CustomPost } from './CustomPost';
export interface FieldSchema {
    id: string;
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'image' | 'url' | 'email' | 'relation';
    required: boolean;
    description?: string;
    placeholder?: string;
    options?: string[];
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
    };
    showIf?: {
        field: string;
        equals: string | number | boolean;
    };
    relationType?: string;
}
export interface FieldGroup {
    id: string;
    name: string;
    description?: string;
    fields: FieldSchema[];
    order: number;
}
export declare class CustomPostType {
    id: string;
    slug: string;
    name: string;
    description?: string;
    icon: string;
    active: boolean;
    public: boolean;
    hasArchive: boolean;
    showInMenu: boolean;
    supports: string[];
    taxonomies: string[];
    labels?: any;
    menuPosition?: number;
    capabilityType: string;
    rewrite?: any;
    posts: CustomPost[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=CustomPostType.d.ts.map