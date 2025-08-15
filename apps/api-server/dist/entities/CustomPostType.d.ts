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
    slug: string;
    name: string;
    singularName: string;
    description?: string;
    icon: string;
    fieldGroups: FieldGroup[];
    settings: {
        public: boolean;
        hasArchive: boolean;
        supports: string[];
        menuIcon?: string;
        menuPosition?: number;
        capabilities?: string[];
    };
    active: boolean;
    createdBy?: string;
    posts: CustomPost[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=CustomPostType.d.ts.map