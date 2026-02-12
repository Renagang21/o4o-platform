import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminTable, AdminTableColumn, AdminTableRow } from '@/components/common/AdminTable';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiClient';
import type { Category } from '@o4o/types';
import { useAdminNotices } from '@/hooks/useAdminNotices';

interface AdminCategory extends Category {
  postCount?: number
}

const CategoryList: FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<any[]>([]);

  // Default column configuration
  const defaultColumns: ColumnOption[] = [
    { id: 'name', label: 'Name', visible: true, required: true },
    { id: 'description', label: 'Description', visible: true },
    { id: 'slug', label: 'Slug', visible: true },
    { id: 'count', label: 'Count', visible: true },
    { id: 'date', label: 'Date', visible: true }
  ];

  // Use screen options hook
  const {
    options,
    itemsPerPage,
    isColumnVisible,
    updateColumnVisibility,
    setItemsPerPage
  } = useScreenOptions('categories-list', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch categories
  const { data: categories = [] as AdminCategory[], isLoading } = useQuery<AdminCategory[]>({
    queryKey: ['categories', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await apiClient.get(`/categories?${params}`);
      return response as AdminCategory[];
    }
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      success('Category deleted.');
    },
    onError: () => {
      error('Failed to delete category.');
    }
  });

  // Duplicate category mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/categories/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      success('Category duplicated successfully.');
    },
    onError: () => {
      error('Failed to duplicate category.');
    }
  });

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedCategories.length === 0) {
      error('No categories selected.');
      return;
    }
    
    switch (action) {
      case 'delete':
        success(`${selectedCategories.length} categor(y/ies) deleted.`);
        setSelectedCategories([]);
        break;
      default:
        break;
    }
  };

  // Define table columns - only show visible ones
  const allColumns: AdminTableColumn[] = [
    { id: 'name', label: 'Name', sortable: true },
    { id: 'description', label: 'Description' },
    { id: 'slug', label: 'Slug' },
    { id: 'count', label: 'Count', align: 'center' },
    { id: 'date', label: 'Date', sortable: true }
  ];
  
  const columns = allColumns.filter((col: any) => isColumnVisible(col.id));

  // Transform categories to table rows
  const rows: AdminTableRow[] = categories.map((category: AdminCategory) => ({
    id: category.id,
    data: {
      name: (
        <div>
          <strong>
            <a href={`/categories/${category.id}/edit`} className="row-title">
              {category.name}
            </a>
          </strong>
          {category.parentId && (
            <span className="ml-2 text-gray-500">— Child of {category.parentId}</span>
          )}
        </div>
      ),
      description: category.description || '—',
      slug: category.slug,
      count: (
        <span className="category-count">
          {category.postCount || 0}
        </span>
      ),
      date: (
        <div>
          {category.createdAt && (
            <abbr title={formatDate(category.createdAt)}>
              {formatDate(category.createdAt)}
            </abbr>
          )}
        </div>
      )
    },
    actions: [
      {
        label: 'Edit',
        href: `/categories/${category.id}/edit`,
        primary: true
      },
      {
        label: 'Quick Edit',
        onClick: () => {/* TODO: Implement quick edit */}
      },
      {
        label: 'Delete',
        onClick: () => deleteMutation.mutate(category.id),
        destructive: true
      },
      {
        label: 'View',
        href: `/category/${category.slug}`,
        external: true
      },
      {
        label: 'Duplicate',
        onClick: () => duplicateMutation.mutate(category.id)
      }
    ]
  }));

  return (
    <div className="wrap">
      <h1 className="o4o-heading-inline">Categories</h1>
      
      <Button 
        className="page-title-action ml-2"
        onClick={() => window.location.href = '/categories/new'}
      >
        Add New
      </Button>
      
      <hr className="o4o-header-end" />

      {/* Search and Filters */}
      <div className="tablenav top">
        <div className="alignleft actions bulkactions">
          <Select onValueChange={handleBulkAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Bulk Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delete">Delete</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="secondary" 
            size="sm" 
            className="ml-2"
            onClick={() => handleBulkAction('apply')}
          >
            Apply
          </Button>
        </div>

        <div className="tablenav-pages">
          <div className="displaying-num">{categories.length} items</div>
        </div>
      </div>

      {/* Search Box */}
      <p className="search-box">
        <label className="screen-reader-text" htmlFor="category-search-input">
          Search Categories:
        </label>
        <Input
          type="search"
          id="category-search-input"
          value={searchQuery}
          onChange={(e: any) => setSearchQuery(e.target.value)}
          placeholder="Search categories..."
          className="w-auto inline-block mr-2"
        />
        <Button variant="secondary" size="sm">
          Search Categories
        </Button>
      </p>

      {/* Admin Table */}
      <AdminTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedCategories}
        onSelectRow={(rowId, selected) => {
          if (selected) {
            setSelectedCategories([...selectedCategories, rowId]);
          } else {
            setSelectedCategories(selectedCategories.filter(id => id !== rowId));
          }
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedCategories(categories.map((cat: AdminCategory) => cat.id));
          } else {
            setSelectedCategories([]);
          }
        }}
        loading={isLoading}
        emptyMessage="No categories found."
        className="o4o-list-table widefat fixed striped categories"
      />

      {/* Bottom table nav */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <div className="displaying-num">{categories.length} items</div>
        </div>
      </div>

      {/* Screen Options */}
      <ScreenOptionsReact
        columns={options.columns}
        itemsPerPage={itemsPerPage}
        onColumnToggle={updateColumnVisibility}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default CategoryList;
