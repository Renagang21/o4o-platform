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
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Tag } from '@o4o/types';
import { useAdminNotices } from '@/hooks/useAdminNotices';

const TagList: FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<any[]>([]);

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
  } = useScreenOptions('tags-list-categories', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch tags
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await authClient.api.get(`/tags?${params}`);
      return response.data || [];
    }
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      success('Tag deleted.');
    },
    onError: () => {
      error('Failed to delete tag.');
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return authClient.api.post('/tags/bulk-delete', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      success(`${selectedTags.length} tag(s) deleted.`);
      setSelectedTags([]);
    },
    onError: () => {
      error('Failed to delete tags.');
    }
  });

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedTags.length === 0) {
      error('No tags selected.');
      return;
    }
    
    switch (action) {
      case 'delete':
        bulkDeleteMutation.mutate(selectedTags);
        break;
      default:
        break;
    }
  };

  // Define table columns - only show visible ones
  const allColumns: WordPressTableColumn[] = [
    { id: 'name', label: 'Name', sortable: true },
    { id: 'description', label: 'Description' },
    { id: 'slug', label: 'Slug' },
    { id: 'count', label: 'Count', align: 'center' },
    { id: 'date', label: 'Date', sortable: true }
  ];
  
  const columns = allColumns.filter((col: any) => isColumnVisible(col.id));

  // Transform tags to table rows
  const rows: WordPressTableRow[] = tags.map((tag: Tag) => ({
    id: tag.id,
    data: {
      name: (
        <div>
          <strong>
            <a href={`/categories/tags/${tag.id}/edit`} className="row-title">
              {tag.name}
            </a>
          </strong>
        </div>
      ),
      description: tag.description || '—',
      slug: tag.slug,
      count: (
        <span className="tag-count">
          {tag.postCount || 0}
        </span>
      ),
      date: (
        <div>
          <abbr title={formatDate(tag.createdAt)}>
            {formatDate(tag.createdAt)}
          </abbr>
        </div>
      )
    },
    actions: [
      {
        label: 'Edit',
        href: `/categories/tags/${tag.id}/edit`,
        primary: true
      },
      {
        label: 'Quick Edit',
        onClick: () => {/* TODO: Implement quick edit */}
      },
      {
        label: 'Delete',
        onClick: () => deleteMutation.mutate(tag.id),
        destructive: true
      },
      {
        label: 'View',
        href: `/tag/${tag.slug}`,
        external: true
      }
    ]
  }));

  return (
    <div className="wrap">
      <h1 className="o4o-heading-inline">Tags</h1>
      
      <Button 
        className="page-title-action ml-2"
        onClick={() => window.location.href = '/categories/tags/new'}
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
            disabled={selectedTags.length === 0}
          >
            Apply
          </Button>
        </div>

        <div className="tablenav-pages">
          <div className="displaying-num">{tags.length} items</div>
        </div>
      </div>

      {/* Search Box */}
      <p className="search-box">
        <label className="screen-reader-text" htmlFor="tag-search-input">
          Search Tags:
        </label>
        <Input
          type="search"
          id="tag-search-input"
          value={searchQuery}
          onChange={(e: any) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          className="w-auto inline-block mr-2"
        />
        <Button variant="secondary" size="sm">
          Search Tags
        </Button>
      </p>

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedTags}
        onSelectRow={(rowId, selected) => {
          if (selected) {
            setSelectedTags([...selectedTags, rowId]);
          } else {
            setSelectedTags(selectedTags.filter(id => id !== rowId));
          }
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedTags(tags.map((tag: Tag) => tag.id));
          } else {
            setSelectedTags([]);
          }
        }}
        loading={isLoading}
        emptyMessage="No tags found."
        className="o4o-list-table widefat fixed striped tags"
      />

      {/* Bottom table nav */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <div className="displaying-num">{tags.length} items</div>
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

export default TagList;