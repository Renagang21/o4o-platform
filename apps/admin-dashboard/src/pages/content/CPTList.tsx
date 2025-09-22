import { FC, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
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
import { useCPTTypes, useDeleteCPTType } from '@/features/cpt-acf/hooks';
import type { CustomPostType } from '@/features/cpt-acf/types/cpt.types';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { Eye, EyeOff, Database, Settings2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

/**
 * WordPress-style Custom Post Types list
 * Standardized with WordPressTable component
 */
const CPTList: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPublic, setFilterPublic] = useState<'all' | 'public' | 'private'>('all');

  // Fetch custom post types using new hook
  const { data: allPostTypes = [], isLoading, error } = useCPTTypes();

  // Apply client-side filtering
  const postTypes = useMemo(() => {
    let types = [...allPostTypes];

    // Apply public/private filter
    if (filterPublic !== 'all') {
      types = types.filter((t: CustomPostType) =>
        filterPublic === 'public' ? t.showInRest : !t.showInRest
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      types = types.filter((t: CustomPostType) =>
        t.name.toLowerCase().includes(query) ||
        t.labels?.plural?.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query)
      );
    }

    return types;
  }, [allPostTypes, filterPublic, searchQuery]);

  // Use the delete CPT hook
  const deleteMutation = useDeleteCPTType();

  const handleDelete = (postType: CustomPostType) => {
    if (confirm(`Are you sure you want to delete "${postType.name}"?\nAll posts of this type will also be deleted.`)) {
      deleteMutation.mutate(postType.slug);
    }
  };

  // Get support features as text
  const getSupportFeatures = (supports: CustomPostType['supports']) => {
    if (!supports) return [];
    const features = [];
    if (supports.title) features.push('Title');
    if (supports.editor) features.push('Editor');
    if (supports.thumbnail) features.push('Thumbnail');
    if (supports.customFields) features.push('Custom Fields');
    if (supports.comments) features.push('Comments');
    if (supports.excerpt) features.push('Excerpt');
    return features;
  };

  // Table columns configuration
  const columns: WordPressTableColumn[] = [
    {
      id: 'name',
      label: 'Name',
      sortable: true
    },
    {
      id: 'slug',
      label: 'Slug',
      width: '150px'
    },
    {
      id: 'visibility',
      label: 'Visibility',
      width: '100px',
      align: 'center'
    },
    {
      id: 'supports',
      label: 'Supports',
      width: '250px'
    },
    {
      id: 'fields',
      label: 'Custom Fields',
      width: '120px',
      align: 'center'
    },
    {
      id: 'taxonomies',
      label: 'Taxonomies',
      width: '150px'
    },
    {
      id: 'date',
      label: 'Date Created',
      sortable: true,
      width: '150px'
    }
  ];

  // Add default post types to the list
  const defaultPostTypes = [
    // Default Post Type
    {
      id: 'default-post',
      name: 'Post',
      pluralName: 'Posts',
      slug: 'post',
      description: 'Default post type for blog posts and news',
      isPublic: true,
      isBuiltin: true,
      supports: {
        title: true,
        editor: true,
        thumbnail: true,
        customFields: false,
        comments: true,
        revisions: true,
        author: true,
        excerpt: true,
        pageAttributes: false
      },
      fieldGroups: [],
      taxonomies: ['category', 'tag'],
      createdAt: new Date('2020-01-01').toISOString()
    },
    // Default Page Type
    {
      id: 'default-page',
      name: 'Page',
      pluralName: 'Pages',
      slug: 'page',
      description: 'Default post type for static pages',
      isPublic: true,
      isBuiltin: true,
      supports: {
        title: true,
        editor: true,
        thumbnail: true,
        customFields: false,
        comments: false,
        revisions: true,
        author: true,
        excerpt: false,
        pageAttributes: true
      },
      fieldGroups: [],
      taxonomies: [],
      createdAt: new Date('2020-01-01').toISOString()
    },
    ...postTypes
  ];

  // Transform post types to table rows
  const rows: WordPressTableRow[] = defaultPostTypes.map((postType: any) => ({
    id: postType.id,
    data: {
      name: (
        <div>
          <Link 
            to={postType.isBuiltin ? `/content/${postType.slug}` : `/content/cpt/${postType.id}/edit`}
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            {postType.pluralName}
          </Link>
          {postType.description && (
            <div className="text-sm text-gray-600 mt-1">{postType.description}</div>
          )}
          {postType.isBuiltin && (
            <Badge variant="secondary" className="ml-2 text-xs">Built-in</Badge>
          )}
        </div>
      ),
      slug: (
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{postType.slug}</code>
      ),
      visibility: (
        <div className="flex items-center justify-center">
          {postType.isPublic ? (
            <Eye className="w-4 h-4 text-green-600" title="Public" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-400" title="Private" />
          )}
        </div>
      ),
      supports: (
        <div className="flex flex-wrap gap-1">
          {getSupportFeatures(postType.supports).slice(0, 3).map((feature: string) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
          {getSupportFeatures(postType.supports).length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{getSupportFeatures(postType.supports).length - 3} more
            </Badge>
          )}
        </div>
      ),
      fields: postType.fieldGroups?.length > 0 ? (
        <div className="flex items-center justify-center gap-1">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="text-sm">
            {postType.fieldGroups.reduce((acc: number, group: any) => 
              acc + (group.fields?.length || 0), 0
            )}
          </span>
        </div>
      ) : (
        <span className="text-gray-400 text-center block">—</span>
      ),
      taxonomies: postType.taxonomies?.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {postType.taxonomies.map((taxonomy: string) => (
            <Badge key={taxonomy} variant="secondary" className="text-xs">
              {taxonomy}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-gray-400">—</span>
      ),
      date: (
        <div className="text-sm text-gray-600">
          {formatDate(postType.createdAt)}
        </div>
      )
    },
    actions: postType.isBuiltin ? [
      {
        label: 'View Posts',
        onClick: () => navigate(`/content/${postType.slug}`)
      }
    ] : [
      {
        label: 'Edit',
        onClick: () => navigate(`/content/cpt/${postType.id}/edit`)
      },
      {
        label: 'Manage Fields',
        onClick: () => navigate(`/content/cpt/${postType.id}/fields`)
      },
      {
        label: 'View Posts',
        onClick: () => navigate(`/content/${postType.slug}`)
      },
      {
        label: 'Delete',
        onClick: () => handleDelete(postType),
        className: 'text-red-600'
      }
    ]
  }));

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Custom Post Types</h1>
      <Link to="/content/cpt/new" className="page-title-action">
        Add New
      </Link>
      <hr className="wp-header-end" />

      {/* Filters */}
      <div className="wp-filter">
        <div className="filter-items">
          <Select value={filterPublic} onValueChange={(value: string) => setFilterPublic(value as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="public">Public only</SelectItem>
              <SelectItem value="private">Private only</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="search-box">
            <Input
              type="search"
              placeholder="Search post types..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="w-[300px]"
            />
            <Button variant="secondary">
              Search Post Types
            </Button>
          </div>
        </div>
      </div>

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        emptyMessage="No custom post types found. Create your first custom post type!"
      />

      {/* Info Notice */}
      <div className="notice notice-info inline">
        <p>
          <strong>Note:</strong> Custom Post Types allow you to create different content structures. 
          Built-in types (Post and Page) cannot be edited or deleted.
        </p>
      </div>

      {error && (
        <div className="notice notice-error">
          <p>Error loading custom post types. Please try again.</p>
        </div>
      )}
    </div>
  );
};

export default CPTList;
