// Custom Post Type (CPT) types for flexible content management

export interface CustomField {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'image' | 'file' | 'repeater' | 'relationship' | 'wysiwyg' | 'color' | 'url' | 'email' | 'flexible_content' | 'group' | 'clone' | 'gallery' | 'post_object' | 'taxonomy' | 'user' | 'google_map' | 'date_picker' | 'color_picker' | 'true_false' | 'button_group' | 'date_time_picker';
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  options?: Array<{ label: string; value: string }>; // For select, radio, checkbox
  min?: number; // For number type
  max?: number; // For number type
  maxLength?: number; // For text, textarea
  multiple?: boolean; // For select, file, image
  validation?: {
    pattern?: string;
    message?: string;
  };
  conditional?: {
    field: string;
    value: any;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  };
  repeaterFields?: CustomField[]; // For repeater type
  relationshipType?: string; // For relationship type (e.g., 'post', 'page', 'user')
  // Additional properties for extended field types
  rows?: number; // For wysiwyg
  minWidth?: number; // For image
  minHeight?: number; // For image
  subFields?: CustomField[]; // For repeater, group, flexible_content
}

export interface CustomFieldGroup {
  id: string;
  name: string;
  key: string;
  description?: string;
  fields: CustomField[];
  position: 'normal' | 'side' | 'advanced';
  order: number;
  rules?: {
    postType?: string[];
    template?: string[];
    category?: string[];
  };
}

export interface CustomPostType {
  id: string;
  name: string;
  singularName: string;
  pluralName: string;
  slug: string;
  description?: string;
  icon?: string;
  menuPosition?: number;

  // Compatibility aliases
  label?: string; // Alias for pluralName
  singularLabel?: string; // Alias for singularName
  isActive?: boolean; // Alias for active
  public?: boolean; // Alias for isPublic

  isPublic: boolean;
  showInMenu: boolean;
  showInAdminBar: boolean;
  hasArchive: boolean;
  active?: boolean; // For compatibility

  // Phase 1: Default Preset IDs for Archive and Single views
  defaultViewPresetId?: string; // Default ViewPreset for archive/listing pages
  defaultTemplatePresetId?: string; // Default TemplatePreset for single/detail pages

  supports: {
    title: boolean;
    editor: boolean;
    excerpt: boolean;
    thumbnail: boolean;
    customFields: boolean;
    comments: boolean;
    revisions?: boolean;
    author?: boolean;
    pageAttributes?: boolean;
  };
  labels: {
    addNew?: string;
    addNewItem?: string;
    editItem?: string;
    newItem?: string;
    viewItem?: string;
    searchItems?: string;
    notFound?: string;
    notFoundInTrash?: string;
    allItems?: string;
    menuName?: string;
  };
  capabilities?: {
    editPost?: string;
    readPost?: string;
    deletePost?: string;
    editPosts?: string;
    editOthersPosts?: string;
    publishPosts?: string;
    readPrivatePosts?: string;
  };
  taxonomies: string[]; // Associated taxonomies (categories, tags, custom)
  fieldGroups?: CustomFieldGroup[];
  restApiEndpoint?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomPostTypePost {
  id: string;
  postType: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'scheduled' | 'trash';
  author: {
    id: string;
    name: string;
    email: string;
  };
  customFields: Record<string, any>;
  featuredImage?: {
    id: string;
    url: string;
    alt?: string;
  };
  categories?: Array<{ id: string; name: string; slug: string }>;
  tags?: Array<{ id: string; name: string; slug: string }>;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomPostTypeDto {
  name: string;
  singularName: string;
  pluralName: string;
  slug: string;
  description?: string;
  icon?: string;
  menuPosition?: number;
  isPublic?: boolean;
  showInMenu?: boolean;
  showInAdminBar?: boolean;
  hasArchive?: boolean;
  defaultViewPresetId?: string;
  defaultTemplatePresetId?: string;
  supports?: Partial<CustomPostType['supports']>;
  labels?: Partial<CustomPostType['labels']>;
  taxonomies?: string[];
}

export interface UpdateCustomPostTypeDto extends Partial<CreateCustomPostTypeDto> {
  id: string;
}

export interface CreateCustomFieldGroupDto {
  name: string;
  key: string;
  description?: string;
  fields: Omit<CustomField, 'id'>[];
  position?: 'normal' | 'side' | 'advanced';
  order?: number;
  rules?: CustomFieldGroup['rules'];
}

export interface CustomPostTypeListResponse {
  postTypes: CustomPostType[];
  total: number;
}