// Relations system types for managing post-to-post connections

export interface RelationEndpoint {
  postType: string;
  label: string;
  fieldName: string;
  maxItems?: number; // Max items that can be connected (undefined = unlimited)
  required: boolean;
}

export interface RelationSettings {
  sortable: boolean; // Allow manual sorting of connections
  duplicates: boolean; // Allow duplicate connections
  deleteAction: 'cascade' | 'restrict' | 'set_null'; // Behavior when related item is deleted
}

export interface Relation {
  id: string;
  name: string;
  label: string;
  description?: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: RelationEndpoint;
  to: RelationEndpoint;
  bidirectional: boolean; // Two-way relationship
  settings: RelationSettings;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RelationFormData {
  name: string;
  label: string;
  description: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  from: RelationEndpoint;
  to: RelationEndpoint;
  bidirectional: boolean;
  settings: RelationSettings;
}

export interface AvailableCPT {
  slug: string;
  name: string;
  icon: string;
}
