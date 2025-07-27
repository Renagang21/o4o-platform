import { useState, useEffect, FC } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Save,
  X,
  Eye,
  Code,
  Settings,
  Filter,
  SortAsc,
  List,
  Grid,
  Calendar,
  Hash,
  Type,
  CheckSquare,
  Play,
  Copy,
  Database,
  Search,
  Layers,
  BarChart3,
  PieChart,
  LineChart,
  Table2,
  Download,
  RefreshCw,
  Clock,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

// Enhanced query builder types
interface AdvancedQueryFilter {
  id: string;
  groupId?: string;
  field: string;
  operator: string;
  value: any;
  dataType?: 'string' | 'number' | 'date' | 'boolean' | 'array';
  customFunction?: string;
}

interface FilterGroup {
  id: string;
  type: 'AND' | 'OR';
  filters: AdvancedQueryFilter[];
  groups?: FilterGroup[];
}

interface QueryJoin {
  type: 'INNER' | 'LEFT' | 'RIGHT';
  table: string;
  on: {
    leftField: string;
    operator: string;
    rightField: string;
  };
  alias?: string;
}

interface QueryAggregate {
  field: string;
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'GROUP_CONCAT';
  alias: string;
  distinct?: boolean;
}

interface QueryGroupBy {
  field: string;
  having?: {
    aggregate: string;
    operator: string;
    value: any;
  };
}

interface EnhancedViewQuery {
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

interface ViewVisualization {
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

interface ViewInteraction {
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

interface ViewCache {
  enabled: boolean;
  duration: number; // minutes
  invalidateOn?: ('create' | 'update' | 'delete')[];
  customKey?: string;
}

interface ViewSecurity {
  public: boolean;
  roles?: string[];
  capabilities?: string[];
  rowLevelSecurity?: {
    field: string;
    operator: string;
    value: string; // Can use {user.id}, {user.role}, etc.
  }[];
}

interface EnhancedView {
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

const EnhancedViewsManager: React.FC = () => {
  const [views, setViews] = useState<EnhancedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [editingView, setEditingView] = useState<EnhancedView | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [queryBuilderMode, setQueryBuilderMode] = useState<'visual' | 'sql'>('visual');

  // Available data sources
  const [dataSources] = useState([
    {
      name: 'posts',
      label: 'Posts',
      fields: [
        { name: 'id', type: 'number', label: 'ID' },
        { name: 'title', type: 'string', label: 'Title' },
        { name: 'content', type: 'text', label: 'Content' },
        { name: 'status', type: 'string', label: 'Status' },
        { name: 'author_id', type: 'number', label: 'Author ID' },
        { name: 'created_at', type: 'datetime', label: 'Created At' },
        { name: 'updated_at', type: 'datetime', label: 'Updated At' }
      ]
    },
    {
      name: 'users',
      label: 'Users',
      fields: [
        { name: 'id', type: 'number', label: 'ID' },
        { name: 'name', type: 'string', label: 'Name' },
        { name: 'email', type: 'string', label: 'Email' },
        { name: 'role', type: 'string', label: 'Role' },
        { name: 'created_at', type: 'datetime', label: 'Created At' }
      ]
    },
    {
      name: 'products',
      label: 'Products',
      fields: [
        { name: 'id', type: 'number', label: 'ID' },
        { name: 'name', type: 'string', label: 'Name' },
        { name: 'price', type: 'number', label: 'Price' },
        { name: 'stock', type: 'number', label: 'Stock' },
        { name: 'category_id', type: 'number', label: 'Category ID' },
        { name: 'vendor_id', type: 'number', label: 'Vendor ID' }
      ]
    },
    {
      name: 'orders',
      label: 'Orders',
      fields: [
        { name: 'id', type: 'number', label: 'ID' },
        { name: 'customer_id', type: 'number', label: 'Customer ID' },
        { name: 'total', type: 'number', label: 'Total' },
        { name: 'status', type: 'string', label: 'Status' },
        { name: 'created_at', type: 'datetime', label: 'Created At' }
      ]
    },
    {
      name: 'form_submissions',
      label: 'Form Submissions',
      fields: [
        { name: 'id', type: 'string', label: 'ID' },
        { name: 'form_id', type: 'string', label: 'Form ID' },
        { name: 'data', type: 'json', label: 'Submission Data' },
        { name: 'status', type: 'string', label: 'Status' },
        { name: 'submitted_at', type: 'datetime', label: 'Submitted At' }
      ]
    }
  ]);

  // New View state
  const [newView, setNewView] = useState<Partial<EnhancedView>>({
    name: '',
    title: '',
    description: '',
    query: {
      source: {
        type: 'single',
        tables: []
      },
      select: {
        fields: []
      },
      where: {
        id: 'root',
        type: 'AND',
        filters: [],
        groups: []
      },
      orderBy: [],
      distinct: false
    },
    visualization: {
      type: 'table'
    },
    interaction: {
      enableSearch: true,
      enableFilters: true,
      enableSort: true,
      enableExport: true,
      exportFormats: ['csv', 'excel'],
      enablePagination: true,
      pageSize: 25
    },
    cache: {
      enabled: true,
      duration: 60,
      invalidateOn: ['create', 'update', 'delete']
    },
    security: {
      public: false,
      roles: []
    }
  });

  // Advanced operators by data type
  const operatorsByType = {
    string: [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'not_contains', label: 'Not Contains' },
      { value: 'starts_with', label: 'Starts With' },
      { value: 'ends_with', label: 'Ends With' },
      { value: 'regex', label: 'Matches Regex' },
      { value: 'in', label: 'In List' },
      { value: 'not_in', label: 'Not In List' },
      { value: 'is_empty', label: 'Is Empty' },
      { value: 'is_not_empty', label: 'Is Not Empty' }
    ],
    number: [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'greater_than', label: 'Greater Than' },
      { value: 'less_than', label: 'Less Than' },
      { value: 'greater_or_equal', label: 'Greater or Equal' },
      { value: 'less_or_equal', label: 'Less or Equal' },
      { value: 'between', label: 'Between' },
      { value: 'not_between', label: 'Not Between' },
      { value: 'in', label: 'In List' },
      { value: 'not_in', label: 'Not In List' }
    ],
    date: [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'after', label: 'After' },
      { value: 'before', label: 'Before' },
      { value: 'between', label: 'Between' },
      { value: 'in_last', label: 'In Last' },
      { value: 'in_next', label: 'In Next' },
      { value: 'this_week', label: 'This Week' },
      { value: 'this_month', label: 'This Month' },
      { value: 'this_year', label: 'This Year' },
      { value: 'last_week', label: 'Last Week' },
      { value: 'last_month', label: 'Last Month' },
      { value: 'last_year', label: 'Last Year' }
    ],
    boolean: [
      { value: 'is_true', label: 'Is True' },
      { value: 'is_false', label: 'Is False' },
      { value: 'is_null', label: 'Is Null' },
      { value: 'is_not_null', label: 'Is Not Null' }
    ]
  };

  useEffect(() => {
    loadViews();
  }, []);

  const loadViews = async () => {
    try {
      // Mock data - would be API call
      const mockViews: EnhancedView[] = [
        {
          id: 'view_1',
          name: 'sales_dashboard',
          title: 'Sales Dashboard',
          description: 'Real-time sales analytics with advanced filtering',
          query: {
            source: {
              type: 'multiple',
              tables: ['orders', 'products', 'users'],
              joins: [
                {
                  type: 'INNER',
                  table: 'order_items',
                  on: {
                    leftField: 'orders.id',
                    operator: '=',
                    rightField: 'order_items.order_id'
                  }
                },
                {
                  type: 'LEFT',
                  table: 'products',
                  on: {
                    leftField: 'order_items.product_id',
                    operator: '=',
                    rightField: 'products.id'
                  }
                }
              ]
            },
            select: {
              fields: ['orders.id', 'orders.created_at', 'products.name', 'products.category_id'],
              aggregates: [
                {
                  field: 'order_items.quantity',
                  function: 'SUM',
                  alias: 'total_quantity'
                },
                {
                  field: 'order_items.price',
                  function: 'SUM',
                  alias: 'total_revenue'
                }
              ]
            },
            where: {
              id: 'root',
              type: 'AND',
              filters: [
                {
                  id: 'f1',
                  field: 'orders.status',
                  operator: 'equals',
                  value: 'completed'
                }
              ],
              groups: []
            },
            groupBy: [
              {
                field: 'products.category_id',
                having: {
                  aggregate: 'total_revenue',
                  operator: 'greater_than',
                  value: 1000
                }
              }
            ],
            orderBy: [
              {
                field: 'total_revenue',
                direction: 'DESC'
              }
            ]
          },
          visualization: {
            type: 'chart',
            chartType: 'bar',
            chartConfig: {
              xAxis: 'category_name',
              yAxis: 'total_revenue',
              colors: ['#3B82F6', '#10B981', '#F59E0B']
            }
          },
          interaction: {
            enableSearch: true,
            searchFields: ['products.name', 'products.category'],
            enableFilters: true,
            filterFields: ['orders.created_at', 'products.category_id'],
            enableExport: true,
            exportFormats: ['csv', 'excel', 'pdf'],
            enablePagination: false
          },
          cache: {
            enabled: true,
            duration: 15,
            invalidateOn: ['create', 'update']
          },
          security: {
            public: false,
            roles: ['admin', 'manager'],
            rowLevelSecurity: [
              {
                field: 'orders.vendor_id',
                operator: 'equals',
                value: '{user.vendor_id}'
              }
            ]
          },
          version: 2,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-20',
          createdBy: 'admin'
        }
      ];

      setViews(mockViews);
    } catch (error) {
      console.error('Failed to load views:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSQL = (view: Partial<EnhancedView>): string => {
    if (!view.query) return '';
    
    const { source, select, where, groupBy, orderBy, limit, distinct } = view.query;
    
    let sql = 'SELECT ';
    
    // DISTINCT
    if (distinct) sql += 'DISTINCT ';
    
    // SELECT clause
    const selectParts = [];
    if (select.fields?.length) {
      selectParts.push(...select.fields);
    }
    if (select.aggregates?.length) {
      selectParts.push(...select.aggregates.map(agg => 
        `${agg.function}(${agg.distinct ? 'DISTINCT ' : ''}${agg.field}) AS ${agg.alias}`
      ));
    }
    if (select.expressions?.length) {
      selectParts.push(...select.expressions.map(exp => 
        `${exp.expression} AS ${exp.alias}`
      ));
    }
    sql += selectParts.join(', ');
    
    // FROM clause
    sql += `\nFROM ${source.tables[0]}`;
    
    // JOIN clauses
    if (source.joins?.length) {
      source.joins.forEach(join => {
        sql += `\n${join.type} JOIN ${join.table}`;
        if (join.alias) sql += ` AS ${join.alias}`;
        sql += ` ON ${join.on.leftField} ${join.on.operator} ${join.on.rightField}`;
      });
    }
    
    // WHERE clause
    const whereClause = generateWhereClause(where);
    if (whereClause) {
      sql += `\nWHERE ${whereClause}`;
    }
    
    // GROUP BY clause
    if (groupBy?.length) {
      sql += `\nGROUP BY ${groupBy.map(g => g.field).join(', ')}`;
      
      // HAVING clause
      const havingClauses = groupBy.filter(g => g.having).map(g => 
        `${g.having!.aggregate} ${g.having!.operator} ${g.having!.value}`
      );
      if (havingClauses.length) {
        sql += `\nHAVING ${havingClauses.join(' AND ')}`;
      }
    }
    
    // ORDER BY clause
    if (orderBy?.length) {
      sql += `\nORDER BY ${orderBy.map(o => 
        `${o.field} ${o.direction}${o.nulls ? ` NULLS ${o.nulls}` : ''}`
      ).join(', ')}`;
    }
    
    // LIMIT clause
    if (limit) {
      sql += `\nLIMIT ${limit.count}`;
      if (limit.offset) sql += ` OFFSET ${limit.offset}`;
    }
    
    return sql;
  };

  const generateWhereClause = (group: FilterGroup): string => {
    const parts: string[] = [];
    
    // Process filters
    if (group.filters?.length) {
      parts.push(...group.filters.map(filter => {
        let value = filter.value;
        if (filter.dataType === 'string' && !['in', 'not_in'].includes(filter.operator)) {
          value = `'${value}'`;
        }
        
        switch (filter.operator) {
          case 'contains':
            return `${filter.field} LIKE '%${filter.value}%'`;
          case 'starts_with':
            return `${filter.field} LIKE '${filter.value}%'`;
          case 'ends_with':
            return `${filter.field} LIKE '%${filter.value}'`;
          case 'between':
            return `${filter.field} BETWEEN ${filter.value[0]} AND ${filter.value[1]}`;
          case 'in':
            return `${filter.field} IN (${filter.value.join(', ')})`;
          case 'is_empty':
            return `(${filter.field} IS NULL OR ${filter.field} = '')`;
          case 'is_not_empty':
            return `(${filter.field} IS NOT NULL AND ${filter.field} != '')`;
          default:
            return `${filter.field} ${filter.operator} ${value}`;
        }
      }));
    }
    
    // Process nested groups
    if (group.groups?.length) {
      parts.push(...group.groups.map(g => `(${generateWhereClause(g)})`));
    }
    
    return parts.join(` ${group.type} `);
  };

  const createView = async () => {
    try {
      console.log('Creating view:', newView);
      // API call would go here
      
      await loadViews();
      resetForm();
      setActiveTab('list');
      alert('✅ View created successfully!');
    } catch (error) {
      console.error('Failed to create view:', error);
      alert('❌ Failed to create view');
    }
  };

  const deleteView = async (id: string) => {
    if (!confirm('Are you sure you want to delete this view?')) return;
    
    try {
      console.log('Deleting view:', id);
      setViews(prev => prev.filter(view => view.id !== id));
      alert('✅ View deleted successfully');
    } catch (error) {
      console.error('Failed to delete view:', error);
      alert('❌ Failed to delete view');
    }
  };

  const resetForm = () => {
    setNewView({
      name: '',
      title: '',
      description: '',
      query: {
        source: {
          type: 'single',
          tables: []
        },
        select: {
          fields: []
        },
        where: {
          id: 'root',
          type: 'AND',
          filters: [],
          groups: []
        },
        orderBy: [],
        distinct: false
      },
      visualization: {
        type: 'table'
      },
      interaction: {
        enableSearch: true,
        enableFilters: true,
        enableSort: true,
        enableExport: true,
        exportFormats: ['csv', 'excel'],
        enablePagination: true,
        pageSize: 25
      },
      cache: {
        enabled: true,
        duration: 60,
        invalidateOn: ['create', 'update', 'delete']
      },
      security: {
        public: false,
        roles: []
      }
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Enhanced Views Manager" subtitle="Advanced query builder for dynamic content">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading views...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Enhanced Views Manager" 
      subtitle="Advanced query builder with visualization and caching"
      fullWidth={activeTab === 'create' || activeTab === 'preview'}
    >
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            View List
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create View
          </button>
          {activeTab === 'preview' && (
            <button
              onClick={() => setActiveTab('preview')}
              className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
            >
              <Play className="w-4 h-4 inline mr-2" />
              Preview
            </button>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'list' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Registered Views</h3>
                <p className="text-sm text-gray-500">Total {views.length} views created</p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New View
              </button>
            </div>

            {views.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No views created yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create your first dynamic query view
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create View
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {views.map((view) => (
                  <div key={view.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{view.title}</h3>
                          {getVisualizationIcon(view.visualization.type)}
                        </div>
                        <p className="text-sm text-gray-500">/{view.name}</p>
                        {view.description && (
                          <p className="text-gray-600 text-sm mt-2">{view.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => previewView(view)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Preview"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => copyShortcode(view)}
                          className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Copy shortcode"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteView(view.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Query Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Source:</span>
                          <div className="font-medium">{view.query.source.tables.join(', ')}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <div className="font-medium capitalize">{view.query.source.type}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Fields:</span>
                          <div className="font-medium">{view.query.select.fields.length}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Cache:</span>
                          <div className="font-medium">
                            {view.cache.enabled ? `${view.cache.duration}min` : 'Disabled'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {view.query.source.joins && view.query.source.joins.length > 0 && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          Joins
                        </span>
                      )}
                      {view.query.select.aggregates && view.query.select.aggregates.length > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          Aggregates
                        </span>
                      )}
                      {view.query.groupBy && view.query.groupBy.length > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          Group By
                        </span>
                      )}
                      {view.security.rowLevelSecurity && view.security.rowLevelSecurity.length > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          RLS
                        </span>
                      )}
                      {view.schedule?.enabled && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          Scheduled
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>v{view.version}</span>
                      <span>Updated {new Date(view.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New View</h3>
                <p className="text-gray-600 mt-1">Build advanced queries with visual or SQL editor</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQueryBuilderMode('visual')}
                  className={`px-3 py-1 rounded ${
                    queryBuilderMode === 'visual' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Layers className="w-4 h-4 inline mr-1" />
                  Visual
                </button>
                <button
                  onClick={() => setQueryBuilderMode('sql')}
                  className={`px-3 py-1 rounded ${
                    queryBuilderMode === 'sql' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Code className="w-4 h-4 inline mr-1" />
                  SQL
                </button>
              </div>
            </div>
            
            {/* View creation form would go here - showing SQL preview for now */}
            <div className="bg-gray-900 text-gray-100 p-6 rounded-lg font-mono text-sm">
              <pre>{generateSQL(newView)}</pre>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createView}
                disabled={!newView.name || !newView.title}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                Create View
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );

  function getVisualizationIcon(type: ViewVisualization['type']) {
    const icons = {
      table: <Table2 className="w-4 h-4 text-gray-500" />,
      list: <List className="w-4 h-4 text-gray-500" />,
      grid: <Grid className="w-4 h-4 text-gray-500" />,
      chart: <BarChart3 className="w-4 h-4 text-gray-500" />,
      map: <Globe className="w-4 h-4 text-gray-500" />,
      calendar: <Calendar className="w-4 h-4 text-gray-500" />,
      kanban: <Layers className="w-4 h-4 text-gray-500" />
    };
    return icons[type] || null;
  }

  function previewView(view: EnhancedView) {
    // Mock preview implementation
    setPreviewData([]);
    setEditingView(view);
    setActiveTab('preview');
  }

  function copyShortcode(view: EnhancedView) {
    const shortcode = `[view name="${view.name}"]`;
    navigator.clipboard.writeText(shortcode);
    alert('✅ Shortcode copied to clipboard!');
  }
};

export default EnhancedViewsManager;