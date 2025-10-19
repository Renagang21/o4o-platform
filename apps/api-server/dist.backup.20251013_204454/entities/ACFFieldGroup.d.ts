import { ACFField } from './ACFField';
export declare enum LocationType {
    POST_TYPE = "post_type",
    PAGE_TEMPLATE = "page_template",
    POST_CATEGORY = "post_category",
    POST_TAXONOMY = "post_taxonomy",
    POST_FORMAT = "post_format",
    POST_STATUS = "post_status",
    USER_FORM = "user_form",
    USER_ROLE = "user_role",
    OPTIONS_PAGE = "options_page",
    MENU_ITEM = "menu_item",
    COMMENT = "comment",
    WIDGET = "widget",
    BLOCK = "block"
}
export declare enum LocationOperator {
    EQUALS = "==",
    NOT_EQUALS = "!=",
    CONTAINS = "contains",
    NOT_CONTAINS = "!contains"
}
export interface LocationRule {
    param: LocationType;
    operator: LocationOperator;
    value: string;
}
export interface LocationGroup {
    rules: LocationRule[];
}
export declare enum PositionType {
    NORMAL = "normal",
    SIDE = "side",
    ACF_AFTER_TITLE = "acf_after_title"
}
export declare enum StyleType {
    DEFAULT = "default",
    SEAMLESS = "seamless"
}
export declare enum LabelPlacement {
    TOP = "top",
    LEFT = "left"
}
export declare class ACFFieldGroup {
    id: string;
    title: string;
    key: string;
    description?: string;
    location: LocationGroup[];
    position: PositionType;
    style: StyleType;
    labelPlacement: LabelPlacement;
    hideOnScreen?: string[];
    isActive: boolean;
    menuOrder: number;
    instructionPlacement: boolean;
    wpPostType?: string;
    wpMeta?: Record<string, any>;
    version: number;
    changelog?: Array<{
        version: number;
        date: Date;
        changes: string;
        userId?: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    fields: ACFField[];
    generateKey(): string;
    matchesLocation(context: {
        postType?: string;
        pageTemplate?: string;
        postCategory?: string;
        userRole?: string;
        block?: string;
    }): boolean;
    clone(): Partial<ACFFieldGroup>;
    toJSON(): {
        id: string;
        title: string;
        key: string;
        description: string;
        location: LocationGroup[];
        position: PositionType;
        style: StyleType;
        labelPlacement: LabelPlacement;
        hideOnScreen: string[];
        isActive: boolean;
        menuOrder: number;
        instructionPlacement: boolean;
        fields: {
            subFields: any[];
            minRows: number;
            maxRows: number;
            buttonLabel: string;
            minLength: number;
            maxLength: number;
            min: number;
            max: number;
            step: number;
            id: string;
            label: string;
            name: string;
            key: string;
            type: import("./ACFField").ACFFieldType;
            instructions: string;
            required: boolean;
            defaultValue: string;
            placeholder: string;
            choices: import("./ACFField").FieldChoices;
            conditionalLogic: import("./ACFField").ConditionalLogic;
            validation: import("./ACFField").FieldValidation;
            appearance: import("./ACFField").FieldAppearance;
            order: number;
        }[];
        wpPostType: string;
        version: number;
        createdAt: Date;
        updatedAt: Date;
    };
}
//# sourceMappingURL=ACFFieldGroup.d.ts.map