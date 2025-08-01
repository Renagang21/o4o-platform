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
export interface Form {
    id: string;
    name: string;
    title: string;
    description?: string;
    fields: FormField[];
    settings: FormSettings;
    notifications: FormNotification[];
    confirmations: FormConfirmation[];
    styling?: FormStyling;
    status: 'active' | 'inactive' | 'draft';
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    submissionCount?: number;
    lastSubmission?: Date;
    shortcode?: string;
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
export interface FormSubmission {
    id: string;
    formId: string;
    formName: string;
    data: Record<string, any>;
    userId?: string;
    userEmail?: string;
    userName?: string;
    ipAddress: string;
    userAgent: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    geoLocation?: {
        country?: string;
        region?: string;
        city?: string;
    };
    status: 'pending' | 'approved' | 'spam' | 'trash';
    submittedAt: Date;
    updatedAt?: Date;
    referrer?: string;
    source?: string;
    notes?: string;
    starred?: boolean;
    read?: boolean;
    paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
    paymentAmount?: number;
    paymentId?: string;
}
export interface FormReport {
    formId: string;
    totalSubmissions: number;
    uniqueSubmitters: number;
    conversionRate: number;
    averageCompletionTime: number;
    fieldStats: FieldStatistics[];
    submissionsByDate: {
        date: string;
        count: number;
    }[];
    topReferrers: {
        referrer: string;
        count: number;
    }[];
    deviceBreakdown: {
        device: string;
        count: number;
    }[];
}
export interface FieldStatistics {
    fieldId: string;
    fieldName: string;
    responses: number;
    skipped: number;
    averageValue?: number;
    topValues?: {
        value: string;
        count: number;
    }[];
}
export interface FormView {
    id: string;
    name: string;
    formId: string;
    filters: ViewFilter[];
    columns: string[];
    sorting: {
        field: string;
        direction: 'asc' | 'desc';
    }[];
    groupBy?: string;
    aggregate?: ViewAggregate[];
    chartType?: 'table' | 'bar' | 'pie' | 'line';
}
export interface ViewFilter {
    field: string;
    operator: ConditionalOperator;
    value: any;
}
export interface ViewAggregate {
    field: string;
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
    alias: string;
}
export interface FormTemplate {
    id: string;
    name: string;
    description: string;
    category: 'contact' | 'registration' | 'survey' | 'order' | 'feedback' | 'custom';
    thumbnail?: string;
    form: Partial<Form>;
    isPremium?: boolean;
}
export interface FormExport {
    version: string;
    form: Form;
    includeSubmissions?: boolean;
    submissions?: FormSubmission[];
}
//# sourceMappingURL=form-builder.d.ts.map