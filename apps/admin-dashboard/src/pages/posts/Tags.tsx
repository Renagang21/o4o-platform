import { useState, FC } from 'react';
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
import type { Tag } from '@/types/content';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const Tags: FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

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
  } = useScreenOptions('tags-list', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch tags
  const { data, isLoading } = useQuery({
    queryKey: ['tags', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await authClient.api.get(`/tags?${params}`);
      return response.data;
    }
  });

  // Delete tag mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      success('Tag deleted.');
    },
    onError: () => {
      error('Failed to delete tag.');
    }
  });

  // Create tag mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const slug = data.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9가-힣]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      await authClient.api.post('/api/v1/tags', {
        ...data,
        slug
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      success('Tag created successfully.');
      setFormData({ name: '', description: '' });
      setShowAddForm(false);
    },
    onError: () => {
      error('Failed to create tag.');
    }
  });

  // Duplicate tag mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.post(`/tags/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      success('Tag duplicated successfully.');
    },
    onError: () => {
      error('Failed to duplicate tag.');
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
        success(`${selectedTags.length} tag(s) deleted.`);
        setSelectedTags([]);
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
  const tags = data?.tags || [];
  const rows: WordPressTableRow[] = tags.map((tag: Tag) => ({
    id: tag.id,
    data: {
      name: (
        <div>
          <strong>
            <a href={`/posts/tags/${tag.id}/edit`} className="row-title">
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
        href: `/posts/tags/${tag.id}/edit`,
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
      },
      {
        label: 'Duplicate',
        onClick: () => duplicateMutation.mutate(tag.id)
      }
    ]
  }));

  return (
    <div className="wrap">
      {/* Screen Options - Top Right */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <ScreenOptionsReact
          columns={options.columns}
          itemsPerPage={itemsPerPage}
          onColumnToggle={updateColumnVisibility}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      
      <h1 className="wp-heading-inline">Tags</h1>
      
      <Button 
        className="page-title-action ml-2"
        onClick={() => setShowAddForm(!showAddForm)}
      >
        Add New
      </Button>
      
      <hr className="wp-header-end" />

      {/* Add Tag Form - WordPress Style */}
      {showAddForm && (
        <div className="wp-tag-form" style={{ 
          background: '#fff', 
          border: '1px solid #c3c4c7', 
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 1px rgba(0,0,0,.04)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '1em', fontSize: '1.3em' }}>Add New Tag</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <Label htmlFor="tag-name" style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: 600 
            }}>
              Name
            </Label>
            <Input
              id="tag-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter tag name"
              style={{ maxWidth: '400px' }}
              required
            />
            <p style={{ 
              marginTop: '5px', 
              color: '#646970', 
              fontSize: '13px' 
            }}>
              The name is how it appears on your site.
            </p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <Label htmlFor="tag-description" style={{ 
              display: 'block', 
              marginBottom: '5px', 
              fontWeight: 600 
            }}>
              Description
            </Label>
            <Textarea
              id="tag-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter tag description (optional)"
              style={{ maxWidth: '400px', minHeight: '100px' }}
            />
            <p style={{ 
              marginTop: '5px', 
              color: '#646970', 
              fontSize: '13px' 
            }}>
              The description is not prominent by default; however, some themes may show it.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Adding...' : 'Add New Tag'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddForm(false);
                setFormData({ name: '', description: '' });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

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
        className="wp-list-table widefat fixed striped tags"
      />

      {/* Bottom table nav */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <div className="displaying-num">{tags.length} items</div>
        </div>
      </div>

    </div>
  );
};

export default Tags;