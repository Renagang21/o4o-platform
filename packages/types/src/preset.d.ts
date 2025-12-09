/**
 * CPT/ACF Preset Type Definitions
 *
 * Presets define reusable templates for forms, views, and page layouts.
 * They follow the SSOT (Single Source of Truth) principle.
 */
export interface BasePreset {
    id: string;
    name: string;
    description?: string;
    cptSlug: string;
    version: number;
    roles?: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
}
export interface PresetConditionalRule {
    field: string;
    operator: '==' | '!=' | '>' | '<' | 'contains';
    value: any;
}
export interface PresetConditionalLogic {
    rules: PresetConditionalRule[];
    operator: 'AND' | 'OR';
}
export interface PresetFieldConfig {
    fieldKey: string;
    order: number;
    sectionId?: string;
    required: boolean;
    placeholder?: string;
    helpText?: string;
    conditional?: PresetConditionalLogic;
}
export interface FormSection {
    id: string;
    title: string;
    description?: string;
    order: number;
    collapsible: boolean;
    defaultCollapsed: boolean;
}
export interface PresetValidationRule {
    field: string;
    type: 'required' | 'email' | 'url' | 'number' | 'pattern';
    pattern?: string;
    message: string;
}
export interface SubmitBehavior {
    redirectTo?: string;
    showSuccessMessage: boolean;
    successMessage?: string;
}
export interface FormPresetConfig {
    fields: PresetFieldConfig[];
    layout: {
        columns: 1 | 2 | 3;
        sections: FormSection[];
    };
    validation: PresetValidationRule[];
    submitBehavior: SubmitBehavior;
}
export interface FormPreset extends BasePreset {
    config: FormPresetConfig;
}
export type ViewRenderMode = 'list' | 'grid' | 'card' | 'table';
export type FieldFormat = 'text' | 'html' | 'image' | 'date' | 'number' | 'badge';
export interface DateFormatter {
    type: 'date';
    pattern?: string;
}
export interface NumberFormatter {
    type: 'number';
    currency?: string;
    decimals?: number;
}
export interface BadgeFormatter {
    type: 'badge';
    colorMap?: Record<string, string>;
}
export type FieldFormatter = DateFormatter | NumberFormatter | BadgeFormatter;
export interface ViewField {
    fieldKey: string;
    label?: string;
    format: FieldFormat;
    formatter?: FieldFormatter;
    sortable: boolean;
    order: number;
}
export interface SortConfig {
    field: string;
    order: 'ASC' | 'DESC';
}
export interface PaginationConfig {
    pageSize: number;
    showPagination: boolean;
    showPageSizeSelector: boolean;
    pageSizeOptions: number[];
}
export type FilterType = 'select' | 'date-range' | 'number-range' | 'checkbox';
export interface FilterOption {
    label: string;
    value: any;
}
export interface FilterConfig {
    id: string;
    label: string;
    field: string;
    type: FilterType;
    options?: FilterOption[];
    defaultValue?: any;
}
export interface SearchConfig {
    enabled: boolean;
    fields: string[];
    placeholder?: string;
}
export type CacheStrategy = 'stale-while-revalidate' | 'cache-first' | 'no-cache';
export interface CacheConfig {
    ttl: number;
    strategy: CacheStrategy;
    revalidateOnFocus: boolean;
}
export interface ViewPresetConfig {
    renderMode: ViewRenderMode;
    fields: ViewField[];
    defaultSort: SortConfig;
    pagination: PaginationConfig;
    filters?: FilterConfig[];
    search?: SearchConfig;
    cache?: CacheConfig;
}
export interface ViewPreset extends BasePreset {
    config: ViewPresetConfig;
}
export type TemplateLayoutType = '1-column' | '2-column-left' | '2-column-right' | '3-column';
export interface BlockReference {
    blockName: string;
    props: Record<string, any>;
    presetId?: string;
    order: number;
}
export interface SlotConfig {
    blocks: BlockReference[];
}
export interface TemplateLayoutConfig {
    type: TemplateLayoutType;
    header?: SlotConfig;
    main: SlotConfig;
    sidebar?: SlotConfig;
    footer?: SlotConfig;
}
export interface SeoMetaConfig {
    titleTemplate: string;
    descriptionField?: string;
    ogImageField?: string;
    keywords?: string[];
    keywordsField?: string;
}
export type SchemaOrgType = 'Product' | 'Article' | 'Event' | 'Organization';
export interface SchemaOrgConfig {
    type: SchemaOrgType;
    fieldMapping: Record<string, any>;
}
export interface TemplatePresetConfig {
    layout: TemplateLayoutConfig;
    seoMeta: SeoMetaConfig;
    schemaOrg?: SchemaOrgConfig;
}
export interface TemplatePreset extends BasePreset {
    config: TemplatePresetConfig;
}
export interface CreateFormPresetRequest {
    name: string;
    description?: string;
    cptSlug: string;
    config: FormPresetConfig;
    roles?: string[];
}
export interface CreateViewPresetRequest {
    name: string;
    description?: string;
    cptSlug: string;
    config: ViewPresetConfig;
    roles?: string[];
}
export interface CreateTemplatePresetRequest {
    name: string;
    description?: string;
    cptSlug: string;
    config: TemplatePresetConfig;
    roles?: string[];
}
export interface UpdateFormPresetRequest {
    name?: string;
    description?: string;
    config?: FormPresetConfig;
    roles?: string[];
    isActive?: boolean;
}
export interface UpdateViewPresetRequest {
    name?: string;
    description?: string;
    config?: ViewPresetConfig;
    roles?: string[];
    isActive?: boolean;
}
export interface UpdateTemplatePresetRequest {
    name?: string;
    description?: string;
    config?: TemplatePresetConfig;
    roles?: string[];
    isActive?: boolean;
}
export interface PresetListResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    pagination?: {
        page: number;
        limit: number;
        pages: number;
    };
}
export interface PresetResponse<T> {
    success: boolean;
    data: T;
}
export interface PresetErrorResponse {
    success: false;
    error: string;
    details?: any;
}
export interface PresetQueryOptions {
    cptSlug?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
}
export declare function isFormPreset(preset: BasePreset): preset is FormPreset;
export declare function isViewPreset(preset: BasePreset): preset is ViewPreset;
export declare function isTemplatePreset(preset: BasePreset): preset is TemplatePreset;
//# sourceMappingURL=preset.d.ts.map