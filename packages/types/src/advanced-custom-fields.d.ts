export interface ACFLocation {
    param: 'post_type' | 'page_template' | 'post_status' | 'post_format' | 'post_category' | 'taxonomy' | 'user_role' | 'current_user';
    operator: '==' | '!=' | 'contains' | '!contains';
    value: string;
}
export interface ACFLocationGroup {
    rules: ACFLocation[];
    operator: 'AND' | 'OR';
}
export interface ACFConditionalLogic {
    field: string;
    operator: '==' | '!=' | '>' | '<' | 'contains' | '!contains' | 'empty' | '!empty';
    value: string | number | boolean;
}
export interface ACFConditionalGroup {
    rules: ACFConditionalLogic[];
    operator: 'AND' | 'OR';
}
export interface ACFFieldLayout {
    type: 'row' | 'block' | 'table';
    columns?: number;
    labelPlacement?: 'top' | 'left';
    instructionPlacement?: 'label' | 'field';
}
export interface ACFRepeaterField extends CustomField {
    type: 'repeater';
    subFields: CustomField[];
    minRows?: number;
    maxRows?: number;
    layout?: 'table' | 'block' | 'row';
    buttonLabel?: string;
    collapsed?: string;
}
export interface ACFFlexibleContentField extends CustomField {
    type: 'flexible_content';
    layouts: ACFFlexibleLayout[];
    minLayouts?: number;
    maxLayouts?: number;
    buttonLabel?: string;
}
export interface ACFFlexibleLayout {
    key: string;
    name: string;
    label: string;
    display: 'block' | 'table' | 'row';
    subFields: CustomField[];
}
export interface ACFGroupField extends CustomField {
    type: 'group';
    subFields: CustomField[];
    layout?: 'block' | 'table' | 'row';
}
export interface ACFCloneField extends CustomField {
    type: 'clone';
    cloneFields: string[];
    displayType: 'seamless' | 'group';
    layout?: 'block' | 'table' | 'row';
    prefixLabel?: boolean;
    prefixName?: boolean;
}
export interface ACFGalleryField extends CustomField {
    type: 'gallery';
    minImages?: number;
    maxImages?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    mimeTypes?: string[];
    library?: 'all' | 'uploadedTo';
    preview?: 'thumbnail' | 'medium' | 'large' | 'full';
}
export interface ACFRelationshipField extends CustomField {
    type: 'relationship';
    postTypes?: string[];
    taxonomies?: string[];
    filters?: ('search' | 'post_type' | 'taxonomy')[];
    minPosts?: number;
    maxPosts?: number;
    returnFormat?: 'object' | 'id';
}
export interface ACFPostObjectField extends CustomField {
    type: 'post_object';
    postTypes?: string[];
    taxonomies?: string[];
    allowNull?: boolean;
    multiple?: boolean;
    returnFormat?: 'object' | 'id';
    ui?: boolean;
}
export interface ACFTaxonomyField extends CustomField {
    type: 'taxonomy';
    taxonomy: string;
    fieldType?: 'checkbox' | 'multi_select' | 'radio' | 'select';
    allowNull?: boolean;
    addTerm?: boolean;
    saveTerms?: boolean;
    loadTerms?: boolean;
    returnFormat?: 'object' | 'id';
}
export interface ACFUserField extends CustomField {
    type: 'user';
    roles?: string[];
    allowNull?: boolean;
    multiple?: boolean;
    returnFormat?: 'object' | 'id' | 'array';
}
export interface ACFGoogleMapField extends CustomField {
    type: 'google_map';
    centerLat?: number;
    centerLng?: number;
    zoom?: number;
    height?: number;
}
export interface ACFDatePickerField extends CustomField {
    type: 'date_picker';
    displayFormat?: string;
    returnFormat?: string;
    firstDay?: number;
}
export interface ACFColorPickerField extends CustomField {
    type: 'color_picker';
    defaultColor?: string;
    enableOpacity?: boolean;
    returnFormat?: 'string' | 'array';
}
export interface ACFFieldGroup extends CustomFieldGroup {
    location: ACFLocationGroup[];
    menuOrder?: number;
    style?: 'default' | 'seamless';
    labelPlacement?: 'top' | 'left';
    instructionPlacement?: 'label' | 'field';
    hideOnScreen?: string[];
    active?: boolean;
    showInRest?: boolean;
    layout?: ACFFieldLayout;
    createdAt?: Date;
    updatedAt?: Date;
}
export type ACFField = CustomField | ACFRepeaterField | ACFFlexibleContentField | ACFGroupField | ACFCloneField | ACFGalleryField | ACFRelationshipField | ACFPostObjectField | ACFTaxonomyField | ACFUserField | ACFGoogleMapField | ACFDatePickerField | ACFColorPickerField;
export interface ACFValidation {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    customFunction?: string;
    errorMessage?: string;
}
import type { CustomField, CustomFieldGroup } from './custom-post-type';
export type { CustomField, CustomFieldGroup } from './custom-post-type';
//# sourceMappingURL=advanced-custom-fields.d.ts.map