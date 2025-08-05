/**
 * Reusable Blocks Browser Component
 * WordPress-style interface for browsing, searching, and inserting reusable blocks
 */

import { useState, useEffect } from 'react';
import { Search, Grid, List, Star, Copy, Edit, Trash, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface ReusableBlock {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: any[];
  status: 'active' | 'archived' | 'draft';
  category?: string;
  tags: string[];
  usageCount: number;
  lastUsedAt?: string;
  isGlobal: boolean;
  isEditable: boolean;
  preview?: {
    html?: string;
    css?: string;
    screenshot?: string;
    width?: number;
    height?: number;
  };
  author: {
    id: string;
    name: string;
    email: string;
  };
  visibility: 'private' | 'public' | 'organization';
  metadata?: {
    version?: string;
    compatibility?: string[];
    requirements?: string[];
    keywords?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
  createdAt: string;
  updatedAt: string;
}

interface ReusableBlocksBrowserProps {
  onInsertBlock?: (block: ReusableBlock) => void;
  onEditBlock?: (blockId: string) => void;
  onCreateNew?: () => void;
  compact?: boolean;
}

const ReusableBlocksBrowser: React.FC<ReusableBlocksBrowserProps> = ({
  onInsertBlock,
  onEditBlock,
  onCreateNew,
  compact = false
}) => {
  const [blocks, setBlocks] = useState<ReusableBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categories, setCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch reusable blocks
  const fetchBlocks = async (page = 1, search = '', category = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: compact ? '8' : '12',
        search,
        status: 'active',
        order: 'DESC',
        orderby: 'usageCount'
      });

      if (category !== 'all') {
        params.append('category', category);
      }

      const response = await fetch(`/api/reusable-blocks?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch blocks');

      const data = await response.json();
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');

      setBlocks(data);
      setTotalPages(totalPages);
    } catch (error) {
      console.error('Error fetching reusable blocks:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/reusable-blocks/categories', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchBlocks(currentPage, searchQuery, selectedCategory);
  }, [currentPage, searchQuery, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle block insertion
  const handleInsertBlock = (block: ReusableBlock) => {
    if (onInsertBlock) {
      onInsertBlock(block);
    }
  };

  // Handle block duplication
  const handleDuplicateBlock = async (blockId: string) => {
    try {
      const response = await fetch(`/api/reusable-blocks/${blockId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });

      if (response.ok) {
        fetchBlocks(currentPage, searchQuery, selectedCategory);
        // TODO: Show success toast
      }
    } catch (error) {
      console.error('Error duplicating block:', error);
      // TODO: Show error toast
    }
  };

  // Handle block deletion
  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Are you sure you want to delete this reusable block?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reusable-blocks/${blockId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchBlocks(currentPage, searchQuery, selectedCategory);
        // TODO: Show success toast
      }
    } catch (error) {
      console.error('Error deleting block:', error);
      // TODO: Show error toast
    }
  };

  // Render block card
  const renderBlockCard = (block: ReusableBlock) => (
    <Card key={block.id} className="group relative overflow-hidden">
      {/* Preview */}
      <div className="aspect-video bg-gray-50 border-b overflow-hidden">
        {block.preview?.screenshot ? (
          <img
            src={block.preview.screenshot}
            alt={block.title}
            className="w-full h-full object-cover"
          />
        ) : block.preview?.html ? (
          <div
            className="w-full h-full p-2 text-xs overflow-hidden"
            dangerouslySetInnerHTML={{ __html: block.preview.html }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Grid className="h-8 w-8" />
          </div>
        )}
        
        {/* Overlay actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={() => handleInsertBlock(block)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Insert
          </Button>
          {block.isEditable && onEditBlock && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditBlock(block.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-sm line-clamp-2">{block.title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleInsertBlock(block)}>
                <Plus className="h-4 w-4 mr-2" />
                Insert Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicateBlock(block.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              {block.isEditable && onEditBlock && (
                <DropdownMenuItem onClick={() => onEditBlock(block.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {block.author.id === 'current-user-id' && (
                <DropdownMenuItem 
                  onClick={() => handleDeleteBlock(block.id)}
                  className="text-red-600"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {block.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {block.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            {block.category && (
              <Badge variant="secondary" className="text-xs">
                {block.category}
              </Badge>
            )}
            {block.isGlobal && (
              <Badge variant="outline" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Global
              </Badge>
            )}
          </div>
          <span>{block.usageCount} uses</span>
        </div>

        {block.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {block.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {block.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{block.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  // Render list item
  const renderBlockListItem = (block: ReusableBlock) => (
    <Card key={block.id} className="p-4 hover:bg-gray-50">
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="w-16 h-12 bg-gray-100 rounded border overflow-hidden flex-shrink-0">
          {block.preview?.screenshot ? (
            <img
              src={block.preview.screenshot}
              alt={block.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <Grid className="h-4 w-4" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm truncate">{block.title}</h3>
              {block.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                  {block.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {block.category && (
                  <Badge variant="secondary" className="text-xs">
                    {block.category}
                  </Badge>
                )}
                <span className="text-xs text-gray-500">
                  {block.usageCount} uses
                </span>
                <span className="text-xs text-gray-500">
                  by {block.author.name}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                onClick={() => handleInsertBlock(block)}
              >
                Insert
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="ghost" size="sm">
                    •••
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDuplicateBlock(block.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  {block.isEditable && onEditBlock && (
                    <DropdownMenuItem onClick={() => onEditBlock(block.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {block.author.id === 'current-user-id' && (
                    <DropdownMenuItem 
                      onClick={() => handleDeleteBlock(block.id)}
                      className="text-red-600"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Compact search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search reusable blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Compact grid */}
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-video bg-gray-100 rounded animate-pulse" />
            ))
          ) : blocks.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No reusable blocks found
            </div>
          ) : (
            blocks.map(renderBlockCard)
          )}
        </div>

        {/* Create new button */}
        {onCreateNew && (
          <Button onClick={onCreateNew} className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create New Block
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reusable Blocks</h2>
          <p className="text-gray-600">Browse and manage your reusable block library</p>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Block
          </Button>
        )}
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search reusable blocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline">
                  Category: {selectedCategory === 'all' ? 'All' : selectedCategory}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                  All Categories
                </DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs for organization */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Blocks</TabsTrigger>
          <TabsTrigger value="mine">My Blocks</TabsTrigger>
          <TabsTrigger value="global">Global Blocks</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Blocks grid/list */}
          {loading ? (
            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'gap-3'}`}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={viewMode === 'grid' ? 'aspect-video bg-gray-100 rounded animate-pulse' : 'h-20 bg-gray-100 rounded animate-pulse'} />
              ))}
            </div>
          ) : blocks.length === 0 ? (
            <div className="text-center py-12">
              <Grid className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No reusable blocks found</p>
              {onCreateNew && (
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Block
                </Button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-3'
            }>
              {viewMode === 'grid' 
                ? blocks.map(renderBlockCard)
                : blocks.map(renderBlockListItem)
              }
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mine">
          {/* User's blocks */}
          <p className="text-gray-500">Your personal reusable blocks</p>
        </TabsContent>

        <TabsContent value="global">
          {/* Global blocks */}
          <p className="text-gray-500">Blocks shared across the organization</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReusableBlocksBrowser;