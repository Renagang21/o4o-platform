// Form Builder Types - Formidable-style form builder

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
  
  // Validation
  validation?: FieldValidation;
  
  // Conditional Logic
  conditional?: ConditionalLogic;
  
  // Field-specific options
  options?: SelectOption[]; // for select, radio, checkbox
  min?: number; // for number, date
  max?: number; // for number, date
  step?: number; // for number
  rows?: number; // for textarea
  multiple?: boolean; // for file, select
  accept?: string; // for file input
  
  // Layout
  width?: 'full' | 'half' | 'third' | 'quarter';
  cssClass?: string;
  
  // Advanced
  calculation?: string; // Formula for calculated fields
  dynamicOptions?: DynamicOptions; // Load options from API
  repeatable?: boolean;
  maxRepeats?: number;
  
  // File field specific
  fileConfig?: {
    allowedTypes?: string[];
    maxSize?: number; // in MB
    multiple?: boolean;
  };
}

export type FormFieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'url'
  | 'tel'
  | 'date'
  | 'datetime'
  | 'time'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'image'
  | 'signature'
  | 'rating'
  | 'range'
  | 'color'
  | 'password'
  | 'hidden'
  | 'html'
  | 'divider'
  | 'heading'
  | 'paragraph'
  | 'repeater'
  | 'page-break'
  | 'calculation'
  | 'lookup'
  | 'address'
  | 'name'
  | 'payment';

export interface FieldValidation {
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  customValidator?: string; // JavaScript function as string
  errorMessage?: string;
  customMessage?: string;
}

export interface ConditionalLogic {
  enabled?: boolean;
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'send';
  rules: ConditionalRule[];
  logicType: 'all' | 'any'; // AND/OR
}

export interface ConditionalRule {
  field: string; // Field ID to check
  operator: ConditionalOperator;
  value: any;
}

export type ConditionalOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty';

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
  
  // Settings
  settings: FormSettings;
  
  // Notifications
  notifications: FormNotification[];
  
  // Confirmations
  confirmations: FormConfirmation[];
  
  // Styling
  styling?: FormStyling;
  
  // Metadata
  status: 'active' | 'inactive' | 'draft';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Stats
  submissionCount?: number;
  lastSubmission?: Date;
  
  // Shortcode
  shortcode?: string;
}

export interface FormSettings {
  // General
  submitButtonText: string;
  submitButtonProcessingText?: string;
  allowSave?: boolean; // Save and continue later
  requireLogin?: boolean;
  limitSubmissions?: boolean;
  maxSubmissions?: number;
  limitPerUser?: boolean;
  maxPerUser?: number;
  
  // Schedule
  scheduleForm?: boolean;
  startDate?: Date;
  endDate?: Date;
  
  // Anti-spam
  honeypot?: boolean;
  recaptcha?: boolean;
  recaptchaType?: 'v2' | 'v3';
  
  // Ajax
  ajax?: boolean;
  ajaxValidation?: boolean;
  
  // Multi-page
  multiPage?: boolean;
  pageBreaks?: number[]; // Field indices where page breaks occur
  progressBar?: boolean;
  progressBarStyle?: 'steps' | 'percentage';
  
  // Save
  saveProgress?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number; // seconds
}

export interface FormNotification {
  id: string;
  name: string;
  enabled: boolean;
  to: string | string[]; // Email addresses or {field:field_id}
  subject: string;
  message: string; // Can include {field:field_id} merge tags
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
  attachFiles?: boolean;
  attachments?: string[]; // Field IDs for file fields
  conditional?: ConditionalLogic;
}

export interface FormConfirmation {
  id: string;
  name: string;
  type: 'message' | 'redirect' | 'page';
  message?: string; // For type 'message'
  redirectUrl?: string; // For type 'redirect'
  pageId?: string; // For type 'page'
  queryString?: string; // Append to redirect
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
  
  // Submission data
  data: Record<string, any>;
  
  // User info
  userId?: string;
  userEmail?: string;
  userName?: string;
  ipAddress: string;
  userAgent: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  
  // Geo location
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
  
  // Status
  status: 'pending' | 'approved' | 'spam' | 'trash';
  
  // Metadata
  submittedAt: Date;
  updatedAt?: Date;
  
  // Additional info
  referrer?: string;
  source?: string; // Where form was embedded
  notes?: string;
  starred?: boolean;
  read?: boolean;
  
  // Payment info (if applicable)
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
  submissionsByDate: { date: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
}

export interface FieldStatistics {
  fieldId: string;
  fieldName: string;
  responses: number;
  skipped: number;
  averageValue?: number; // For numeric fields
  topValues?: { value: string; count: number }[]; // For select/radio
}

// View Integration
export interface FormView {
  id: string;
  name: string;
  formId: string;
  filters: ViewFilter[];
  columns: string[]; // Field IDs to display
  sorting: { field: string; direction: 'asc' | 'desc' }[];
  groupBy?: string; // Field ID
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

// Form Templates
export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'contact' | 'registration' | 'survey' | 'order' | 'feedback' | 'custom';
  thumbnail?: string;
  form: Partial<Form>;
  isPremium?: boolean;
}

// Form Import/Export
export interface FormExport {
  version: string;
  form: Form;
  includeSubmissions?: boolean;
  submissions?: FormSubmission[];
}