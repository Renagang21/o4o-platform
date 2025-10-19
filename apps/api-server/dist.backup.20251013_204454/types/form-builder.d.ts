export interface FormField {
    id: string;
    type: FormFieldType;
    name: string;
    label: string;
    description?: string;
    placeholder?: string;
    defaultValue?: any;
    required: boolean;
    readonly?: boolean;
    hidden?: boolean;
    validation?: FieldValidation;
    conditional?: ConditionalLogic;
    options?: SelectOption[];
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    multiple?: boolean;
    accept?: string;
    width?: 'full' | 'half' | 'third' | 'quarter';
    cssClass?: string;
    calculation?: string;
    dynamicOptions?: DynamicOptions;
    repeatable?: boolean;
    maxRepeats?: number;
    fileConfig?: {
        allowedTypes?: string[];
        maxSize?: number;
        multiple?: boolean;
    };
}
export type FormFieldType = 'text' | 'textarea' | 'number' | 'email' | 'url' | 'tel' | 'date' | 'datetime' | 'time' | 'select' | 'radio' | 'checkbox' | 'file' | 'image' | 'signature' | 'rating' | 'range' | 'color' | 'password' | 'hidden' | 'html' | 'divider' | 'heading' | 'paragraph' | 'repeater' | 'page-break' | 'calculation' | 'lookup' | 'address' | 'name' | 'payment';
export interface FieldValidation {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    step?: number;
    customValidator?: string;
    errorMessage?: string;
    customMessage?: string;
}
export interface ConditionalLogic {
    enabled?: boolean;
    action: 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'send';
    rules: ConditionalRule[];
    logicType: 'all' | 'any';
}
export interface ConditionalRule {
    field: string;
    operator: ConditionalOperator;
    value: any;
}
export type ConditionalOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'is_empty' | 'is_not_empty';
export interface SelectOption {
    label: string;
    value: string;
    disabled?: boolean;
    icon?: string;
}
export interface DynamicOptions {
    endpoint: string;
    valueField: string;
    labelField: string;
    searchable?: boolean;
    cache?: boolean;
}
export interface FormSettings {
    submitButtonText: string;
    submitButtonProcessingText?: string;
    allowSave?: boolean;
    requireLogin?: boolean;
    limitSubmissions?: boolean;
    maxSubmissions?: number;
    limitPerUser?: boolean;
    maxPerUser?: number;
    scheduleForm?: boolean;
    startDate?: Date;
    endDate?: Date;
    honeypot?: boolean;
    recaptcha?: boolean;
    recaptchaType?: 'v2' | 'v3';
    ajax?: boolean;
    ajaxValidation?: boolean;
    multiPage?: boolean;
    pageBreaks?: number[];
    progressBar?: boolean;
    progressBarStyle?: 'steps' | 'percentage';
    saveProgress?: boolean;
    autoSave?: boolean;
    autoSaveInterval?: number;
}
export interface FormNotification {
    id: string;
    name: string;
    enabled: boolean;
    to: string | string[];
    subject: string;
    message: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    cc?: string;
    bcc?: string;
    attachFiles?: boolean;
    attachments?: string[];
    conditional?: ConditionalLogic;
}
export interface FormConfirmation {
    id: string;
    name: string;
    type: 'message' | 'redirect' | 'page';
    message?: string;
    redirectUrl?: string;
    pageId?: string;
    queryString?: string;
    conditional?: ConditionalLogic;
}
export interface FormStyling {
    theme: 'default' | 'minimal' | 'modern' | 'custom';
    primaryColor?: string;
    fontFamily?: string;
    fontSize?: string;
    fieldSpacing?: string;
    fieldBorderRadius?: string;
    customCSS?: string;
}
//# sourceMappingURL=form-builder.d.ts.map