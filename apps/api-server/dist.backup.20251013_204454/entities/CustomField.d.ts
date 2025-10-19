export interface FieldOption {
    label: string;
    value: string;
}
export interface ValidationRules {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
}
export interface ConditionalLogic {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number | boolean | null;
}
export interface LocationRule {
    param: string;
    operator: '==' | '!=' | 'contains';
    value: string;
}
export declare class FieldGroup {
    id: string;
    title: string;
    description: string;
    fields: CustomField[];
    location: LocationRule[];
    rules: LocationRule;
    options: {
        position?: 'high' | 'core' | 'normal' | 'side';
        style?: 'default' | 'seamless';
        labelPlacement?: 'top' | 'left';
        instructionPlacement?: 'label' | 'field';
        hideOnScreen?: string[];
        description?: string;
    };
    active: boolean;
    order: number;
    placement: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CustomField {
    id: string;
    name: string;
    label: string;
    type: string;
    description: string;
    required: boolean;
    defaultValue: string;
    placeholder: string;
    validation: ValidationRules;
    conditionalLogic: ConditionalLogic[];
    options: FieldOption[];
    min: number;
    max: number;
    step: number;
    maxLength: number;
    minLength: number;
    pattern: string;
    multiple: boolean;
    order: number;
    groupId: string;
    fieldGroup: FieldGroup;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CustomFieldValue {
    id: string;
    fieldId: string;
    field: CustomField;
    entityId: string;
    entityType: string;
    value: string | number | boolean | Date | null | string[] | Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=CustomField.d.ts.map