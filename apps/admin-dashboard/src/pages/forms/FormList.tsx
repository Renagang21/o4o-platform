import { useState, FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Form } from '@o4o/types';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { 
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  BarChart,
  Eye,
  Download
} from 'lucide-react';

/**
 * WordPress-style Forms list
 * Standardized with WordPressTable component
 */
const FormList: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch forms
  const { data, isLoading, error } = useQuery({
    queryKey: ['forms', { search, status: statusFilter, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const response = await authClient.api.get(`/forms?${params}`);
      return response.data;
    }
  });

  const forms = data?.forms || [];

  // Delete form mutation
  const deleteMutation = useMutation({
    mutationFn: async (formIds: string[]) => {
      await Promise.all(formIds.map(id => authClient.api.delete(`/forms/${id}`)));
    },
    onSuccess: () => {
      toast.success('Forms deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      setSelectedRows([]);
    },
    onError: () => {
      toast.error('Failed to delete some forms');
    }
  });

  // Duplicate form mutation
  const duplicateMutation = useMutation({
    mutationFn: async (formId: string) => {
      const response = await authClient.api.get(`/forms/${formId}`);
      const form = response.data;
      
      // Create new form with copied data
      const newForm = {
        ...form,
        name: `${form.name}_copy`,
        title: `${form.title} (Copy)`,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        submissionCount: 0,
        lastSubmission: null
      };
      
      await authClient.api.post('/forms', newForm);
    },
    onSuccess: () => {
      toast.success('Form duplicated successfully');
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: () => {
      toast.error('Failed to duplicate form');
    }
  });

  // Status change mutation
  const statusChangeMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[], status: string }) => {
      await Promise.all(ids.map(id => 
        authClient.api.patch(`/forms/${id}`, { status })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.success('Form status updated successfully');
      setSelectedRows([]);
    },
    onError: () => {
      toast.error('Failed to update form status');
    }
  });

  // Bulk actions configuration
  const bulkActions = [
    {
      value: 'delete',
      label: 'Delete',
      action: async (ids: string[]) => {
        if (confirm('Are you sure you want to delete the selected forms? All submission data will also be deleted.')) {
          await deleteMutation.mutateAsync(ids);
        }
      },
      confirmMessage: 'Are you sure you want to delete {count} form(s)? All submission data will be lost.',
      isDestructive: true
    },
    {
      value: 'activate',
      label: 'Activate',
      action: async (ids: string[]) => {
        await statusChangeMutation.mutateAsync({ ids, status: 'active' });
      }
    },
    {
      value: 'deactivate',
      label: 'Deactivate',
      action: async (ids: string[]) => {
        await statusChangeMutation.mutateAsync({ ids, status: 'inactive' });
      }
    },
    {
      value: 'draft',
      label: 'Move to Draft',
      action: async (ids: string[]) => {
        await statusChangeMutation.mutateAsync({ ids, status: 'draft' });
      }
    }
  ];

  const {
    selectedCount,
    isProcessing,
    executeBulkAction
  } = useBulkActions({
    items: forms,
    idField: 'id',
    actions: bulkActions,
    selectedIds: selectedRows
  });

  const getStatusBadge = (status: Form['status']) => {
    const config = {
      active: { label: 'Active', variant: 'default' as const, icon: CheckCircle },
      inactive: { label: 'Inactive', variant: 'secondary' as const, icon: Clock },
      draft: { label: 'Draft', variant: 'outline' as const, icon: AlertCircle }
    };
    
    const { label, variant, icon: Icon } = config[status];
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  // Table columns configuration
  const columns: WordPressTableColumn[] = [
    {
      id: 'title',
      label: 'Form Title',
      sortable: true
    },
    {
      id: 'status',
      label: 'Status',
      width: '120px'
    },
    {
      id: 'fields',
      label: 'Fields',
      width: '80px',
      align: 'center'
    },
    {
      id: 'submissions',
      label: 'Submissions',
      sortable: true,
      width: '100px',
      align: 'center'
    },
    {
      id: 'lastSubmission',
      label: 'Last Submission',
      sortable: true,
      width: '150px'
    },
    {
      id: 'created',
      label: 'Created',
      sortable: true,
      width: '150px'
    }
  ];

  // Transform forms to table rows
  const rows: WordPressTableRow[] = forms.map((form: Form) => ({
    id: form.id,
    data: {
      title: (
        <div>
          <Link to={`/forms/edit/${form.id}`} className="font-medium text-blue-600 hover:text-blue-800">
            {form.title}
          </Link>
          <div className="text-sm text-gray-500 mt-1">
            /{form.name}
          </div>
          {form.description && (
            <div className="text-sm text-gray-600 mt-1 line-clamp-2">
              {form.description}
            </div>
          )}
        </div>
      ),
      status: getStatusBadge(form.status),
      fields: (
        <span className="text-center block font-mono">
          {form.fields.length}
        </span>
      ),
      submissions: (
        <Link 
          to={`/forms/${form.id}/submissions`} 
          className="text-center block font-mono text-blue-600 hover:text-blue-800"
        >
          {form.submissionCount || 0}
        </Link>
      ),
      lastSubmission: form.lastSubmission ? (
        <div className="text-sm text-gray-600">
          {formatDate(form.lastSubmission)}
        </div>
      ) : (
        <span className="text-gray-400">—</span>
      ),
      created: (
        <div className="text-sm text-gray-600">
          {formatDate(form.createdAt)}
        </div>
      )
    },
    actions: [
      {
        label: 'Edit',
        onClick: () => navigate(`/forms/edit/${form.id}`)
      },
      {
        label: 'View Submissions',
        onClick: () => navigate(`/forms/${form.id}/submissions`)
      },
      {
        label: 'Reports',
        onClick: () => navigate(`/forms/${form.id}/report`)
      },
      {
        label: 'Preview',
        onClick: () => navigate(`/forms/${form.id}/preview`),
        target: '_blank'
      },
      {
        label: 'Duplicate',
        onClick: () => duplicateMutation.mutate(form.id)
      },
      {
        label: 'Copy Shortcode',
        onClick: () => {
          navigator.clipboard.writeText(form.shortcode || `[form name="${form.name}"]`);
          toast.success('Shortcode copied to clipboard');
        }
      },
      {
        label: 'Export',
        onClick: () => {
          // TODO: Implement export functionality
          toast('Export feature coming soon!');
        }
      },
      {
        label: 'Delete',
        onClick: () => {
          if (confirm('Are you sure you want to delete this form? All submission data will be lost.')) {
            deleteMutation.mutate([form.id]);
          }
        },
        className: 'text-red-600'
      }
    ]
  }));

  // Handle row selection
  const handleSelectRow = (rowId: string, selected: boolean) => {
    if (selected) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== rowId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(forms.map((f: Form) => f.id));
    } else {
      setSelectedRows([]);
    }
  };

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Forms</h1>
      <Link to="/forms/new" className="page-title-action">
        Add New
      </Link>
      <hr className="wp-header-end" />

      {/* Filters */}
      <div className="wp-filter">
        <div className="filter-items">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="search-box">
            <Input
              type="search"
              placeholder="Search forms..."
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              className="w-[300px]"
            />
            <Button variant="secondary">
              Search Forms
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions - Top */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedCount}
        onActionExecute={executeBulkAction}
        isProcessing={isProcessing}
        position="top"
      />

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        loading={isLoading}
        emptyMessage="No forms found. Create your first form!"
      />

      {/* Bulk Actions - Bottom */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedCount}
        onActionExecute={executeBulkAction}
        isProcessing={isProcessing}
        position="bottom"
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="tablenav bottom">
          <div className="tablenav-pages">
            <span className="displaying-num">{data.totalItems} items</span>
            <span className="pagination-links">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                ‹ Previous
              </Button>
              
              <span className="paging-input">
                <span className="current-page">{page}</span> of{' '}
                <span className="total-pages">{data.totalPages}</span>
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === data.totalPages}
              >
                Next ›
              </Button>
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="notice notice-error">
          <p>Error loading forms. Please try again.</p>
        </div>
      )}
    </div>
  );
};

export default FormList;