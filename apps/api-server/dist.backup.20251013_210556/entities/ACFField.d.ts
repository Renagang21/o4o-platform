import { ACFFieldGroup } from './ACFFieldGroup';
export declare enum ACFFieldType {
    TEXT = "text",
    TEXTAREA = "textarea",
    NUMBER = "number",
    EMAIL = "email",
    URL = "url",
    PASSWORD = "password",
    WYSIWYG = "wysiwyg",
    OEMBED = "oembed",
    IMAGE = "image",
    FILE = "file",
    GALLERY = "gallery",
    SELECT = "select",
    CHECKBOX = "checkbox",
    RADIO = "radio",
    TRUE_FALSE = "true_false",
    BUTTON_GROUP = "button_group",
    POST_OBJECT = "post_object",
    PAGE_LINK = "page_link",
    RELATIONSHIP = "relationship",
    TAXONOMY = "taxonomy",
    USER = "user",
    COLOR_PICKER = "color_picker",
    DATE_PICKER = "date_picker",
    DATE_TIME_PICKER = "date_time_picker",
    TIME_PICKER = "time_picker",
    GOOGLE_MAP = "google_map",
    TAB = "tab",
    GROUP = "group",
    REPEATER = "repeater",
    FLEXIBLE_CONTENT = "flexible_content",
    CLONE = "clone",
    MESSAGE = "message",
    ACCORDION = "accordion"
}
export declare enum ConditionalOperator {
    EQUALS = "==",
    NOT_EQUALS = "!=",
    CONTAINS = "contains",
    NOT_CONTAINS = "!contains",
    EMPTY = "empty",
    NOT_EMPTY = "!empty",
    GREATER_THAN = ">",
    LESS_THAN = "<",
    PATTERN_MATCH = "pattern"
}
export interface ConditionalRule {
    field: string;
    operator: ConditionalOperator;
    value: any;
}
export interface ConditionalLogic {
    enabled: boolean;
    rules: ConditionalRule[][];
}
export interface FieldChoices {
    [key: string]: string;
}
export interface FieldValidation {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    email?: boolean;
    url?: boolean;
    unique?: boolean;
}
export interface FieldAppearance {
    wrapper?: {
        width?: string;
        class?: string;
        id?: string;
    };
    class?: string;
    id?: string;
    readonly?: boolean;
    disabled?: boolean;
}
export declare class ACFField {
    id: string;
    fieldGroupId: string;
    fieldGroup: Promise<ACFFieldGroup>;
    label: string;
    name: string;
    key: string;
    type: ACFFieldType;
    instructions?: string;
    required: boolean;
    defaultValue?: string;
    placeholder?: string;
    prependText?: string;
    appendText?: string;
    choices?: FieldChoices;
    allowNull?: boolean;
    multiple?: boolean;
    allowCustom?: boolean;
    layout?: string;
    min?: number;
    max?: number;
    step?: number;
    minLength?: number;
    maxLength?: number;
    rows?: number;
    newLines?: boolean;
    returnFormat?: string;
    previewSize?: string;
    library?: string;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    minSize?: number;
    maxSize?: number;
    mimeTypes?: string[];
    tabs?: boolean;
    toolbar?: string;
    mediaUpload?: boolean;
    displayFormat?: string;
    returnDateFormat?: string;
    firstDay?: number;
    postTypes?: string[];
    taxonomies?: string[];
    filters?: string[];
    minPosts?: number;
    maxPosts?: number;
    subFields?: any[];
    buttonLabel?: string;
    minRows?: number;
    maxRows?: number;
    repeaterLayout?: string;
    layouts?: any[];
    cloneFields?: string[];
    cloneDisplay?: string;
    prefixLabel?: boolean;
    prefixName?: boolean;
    conditionalLogic?: ConditionalLogic;
    validation?: FieldValidation;
    appearance?: FieldAppearance;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    generateKey(): string;
    validateValue(value: any): boolean;
    checkConditionalLogic(fieldValues: Record<string, any>): boolean;
    toJSON(): {
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
        type: ACFFieldType;
        instructions: string;
        required: boolean;
        defaultValue: string;
        placeholder: string;
        choices: FieldChoices;
        conditionalLogic: ConditionalLogic;
        validation: FieldValidation;
        appearance: FieldAppearance;
        order: number;
    };
}
//# sourceMappingURL=ACFField.d.ts.map