import { useState, useEffect, FC } from 'react';
import { Eye, Plus, Play } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import { EnhancedViewsList } from '../../components/admin/enhanced-views/EnhancedViewsList';
import { EnhancedViewCreateForm } from '../../components/admin/enhanced-views/EnhancedViewCreateForm';
import type { EnhancedView, DataSource, OperatorsByType } from '../../types/enhanced-views';

const EnhancedViewsManager: FC = () => {
  const [views, setViews] = useState<EnhancedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [editingView, setEditingView] = useState<EnhancedView | null>(null);
  const [previewData, setPreviewData] = useState<unknown[]>([]);
  const [queryBuilderMode, setQueryBuilderMode] = useState<'visual' | 'sql'>('visual');

  // Available data sources (Mock data - would come from API)
  const [dataSources] = useState<DataSource[]>([
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

  // Advanced operators by data type (Mock data - would come from API)
  const operatorsByType: OperatorsByType = {
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
    } catch (error: unknown) {
      console.error('Failed to load views:', error);
    } finally {
      setLoading(false);
    }
  };


  const createView = async () => {
    try {
      // API call would go here

      await loadViews();
      resetForm();
      setActiveTab('list');
      alert('✅ View created successfully!');
    } catch (error: unknown) {
      console.error('Failed to create view:', error);
      alert('❌ Failed to create view');
    }
  };

  const deleteView = async (id: string) => {
    if (!confirm('Are you sure you want to delete this view?')) return;

    try {
      setViews(prev => prev.filter(view => view.id !== id));
      alert('✅ View deleted successfully');
    } catch (error: unknown) {
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
          <EnhancedViewsList
            views={views}
            onCreateClick={() => setActiveTab('create')}
            onPreview={previewView}
            onCopyShortcode={copyShortcode}
            onDelete={deleteView}
          />
        )}

        {activeTab === 'create' && (
          <EnhancedViewCreateForm
            formData={newView}
            queryBuilderMode={queryBuilderMode}
            onQueryBuilderModeChange={setQueryBuilderMode}
            onSubmit={createView}
            onCancel={() => {
              resetForm();
              setActiveTab('list');
            }}
          />
        )}
      </div>
    </AdminLayout>
  );

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