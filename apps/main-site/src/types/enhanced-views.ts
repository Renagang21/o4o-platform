// Enhanced query builder types for advanced view system

export interface AdvancedQueryFilter {
  id: string;
  groupId?: string;
  field: string;
  operator: string;
  value: unknown;
  dataType?: 'string' | 'number' | 'date' | 'boolean' | 'array';
  customFunction?: string;
}

export interface FilterGroup {
  id: string;
  type: 'AND' | 'OR';
  filters: AdvancedQueryFilter[];
  groups?: FilterGroup[];
}

export interface QueryJoin {
  type: 'INNER' | 'LEFT' | 'RIGHT';
  table: string;
  on: {
    leftField: string;
    operator: string;
    rightField: string;
  };
  alias?: string;
}

export interface QueryAggregate {
  field: string;
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'GROUP_CONCAT';
  alias: string;
  distinct?: boolean;
}

export interface QueryGroupBy {
  field: string;
  having?: {
    aggregate: string;
    operator: string;
    value: unknown;
  };
}

export interface EnhancedViewQuery {
  source: {
    type: 'single' | 'multiple' | 'custom';
    tables: string[];
    joins?: QueryJoin[];
  };
  select: {
    fields: string[];
    aggregates?: QueryAggregate[];
    expressions?: { expression: string; alias: string }[];
  };
  where: FilterGroup;
  groupBy?: QueryGroupBy[];
  orderBy: {
    field: string;
    direction: 'ASC' | 'DESC';
    nulls?: 'FIRST' | 'LAST';
  }[];
  limit?: {
    offset: number;
    count: number;
  };
  distinct?: boolean;
}

export interface ViewVisualization {
  type: 'table' | 'list' | 'grid' | 'chart' | 'map' | 'calendar' | 'kanban';
  chartType?: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap';
  chartConfig?: {
    xAxis: string;
    yAxis: string;
    series?: string[];
    stacked?: boolean;
    colors?: string[];
  };
  mapConfig?: {
    latField: string;
    lngField: string;
    markerField?: string;
    infoFields?: string[];
  };
  calendarConfig?: {
    dateField: string;
    titleField: string;
    colorField?: string;
  };
  kanbanConfig?: {
    columnField: string;
    cardFields: string[];
    swimlaneField?: string;
  };
}

export interface ViewInteraction {
  enableSearch?: boolean;
  searchFields?: string[];
  enableFilters?: boolean;
  filterFields?: string[];
  enableSort?: boolean;
  sortFields?: string[];
  enableExport?: boolean;
  exportFormats?: ('csv' | 'excel' | 'json' | 'pdf')[];
  enablePagination?: boolean;
  pageSize?: number;
  enableInlineEdit?: boolean;
  editableFields?: string[];
  actions?: {
    type: 'link' | 'modal' | 'function';
    label: string;
    icon?: string;
    handler?: string;
  }[];
}

export interface ViewCache {
  enabled: boolean;
  duration: number; // minutes
  invalidateOn?: ('create' | 'update' | 'delete')[];
  customKey?: string;
}

export interface ViewSecurity {
  public: boolean;
  roles?: string[];
  capabilities?: string[];
  rowLevelSecurity?: {
    field: string;
    operator: string;
    value: string; // Can use {user.id}, {user.role}, etc.
  }[];
}

export interface EnhancedView {
  id: string;
  name: string;
  title: string;
  description?: string;
  query: EnhancedViewQuery;
  visualization: ViewVisualization;
  interaction: ViewInteraction;
  cache: ViewCache;
  security: ViewSecurity;
  styling?: {
    customCSS?: string;
    theme?: 'default' | 'minimal' | 'modern' | 'dark';
    responsive?: boolean;
  };
  schedule?: {
    enabled: boolean;
    cron: string;
    export?: {
      format: 'csv' | 'pdf' | 'excel';
      recipients: string[];
    };
  };
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DataSourceField {
  name: string;
  type: string;
  label: string;
}

export interface DataSource {
  name: string;
  label: string;
  fields: DataSourceField[];
}

export interface OperatorOption {
  value: string;
  label: string;
}

export interface OperatorsByType {
  string: OperatorOption[];
  number: OperatorOption[];
  date: OperatorOption[];
  boolean: OperatorOption[];
}
