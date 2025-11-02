/**
 * Views Manager Type Definitions
 * Extracted from ViewsManager.tsx for reusability
 */

export interface QueryFilter {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between' | 'exists' | 'not_exists';
  value: string | string[];
  relation?: 'AND' | 'OR';
}

export interface QuerySort {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface ViewQuery {
  postType: string;
  filters: QueryFilter[];
  sorting: QuerySort[];
  pagination: {
    enabled: boolean;
    itemsPerPage: number;
    showAll?: boolean;
  };
  limit?: number;
}

export interface ViewTemplate {
  type: 'list' | 'grid' | 'table' | 'custom';
  fields: string[];
  customHTML?: string;
  itemTemplate?: string;
  wrapperClass?: string;
  itemClass?: string;
}

export interface View {
  id: string;
  name: string;
  title: string;
  description?: string;
  query: ViewQuery;
  template: ViewTemplate;
  settings: {
    cache: boolean;
    cacheTime: number;
    ajaxPagination: boolean;
    showFilters: boolean;
    showSearch: boolean;
    showSort: boolean;
  };
  shortcode: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CPTField {
  name: string;
  label: string;
  type: string;
}

export interface AvailableCPT {
  slug: string;
  name: string;
  fields: CPTField[];
}

export interface ViewFormData {
  name: string;
  title: string;
  description: string;
  query: ViewQuery;
  template: ViewTemplate;
  settings: {
    cache: boolean;
    cacheTime: number;
    ajaxPagination: boolean;
    showFilters: boolean;
    showSearch: boolean;
    showSort: boolean;
  };
}
