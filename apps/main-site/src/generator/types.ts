/**
 * ViewGenerator Types
 * NextGen Frontend Automatic View Generator
 */

export interface AnalyzedIntent {
  viewId: string;
  category: 'commerce' | 'dashboard' | 'auth' | 'admin' | 'other';
  action: 'list' | 'detail' | 'create' | 'edit' | 'view' | 'custom';
  params?: Record<string, string>;
}

export interface FetchConfig {
  queryKey: string[];
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface ViewComponent {
  type: string;
  props?: Record<string, any>;
}

export interface ViewSchema {
  viewId: string;
  meta: {
    title: string;
    description?: string;
  };
  layout: {
    type: string;
  };
  components: ViewComponent[];
}

export type LayoutType =
  | 'DefaultLayout'
  | 'ShopLayout'
  | 'DashboardLayout'
  | 'AuthLayout';
