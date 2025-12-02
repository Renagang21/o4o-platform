export interface ViewSchema {
  viewId: string;
  meta?: Record<string, any>;
  layout: {
    type: string;
    props?: Record<string, any>;
  };
  components: ViewComponentSchema[];
}

export interface ViewComponentSchema {
  type: string;
  props?: Record<string, any>;
  if?: string;
  loop?: string;
}

export interface ViewContext {
  user: any;
  router: any;
  params: Record<string, string>;
  query: Record<string, string>;
}

export interface FetchConfig {
  queryKey: string[];
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  body?: Record<string, any>;
}
