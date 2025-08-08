/**
 * Block Patterns Browser Component
 * WordPress-style interface for browsing and inserting block patterns
 */

import { useState, useEffect } from 'react';
import { Search, Grid, List, Star, Eye, Layers } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';

interface PatternBlock {
  name: string;
  attributes?: Record<string, any>;
  innerBlocks?: PatternBlock[];
  innerHTML?: string;
}

interface BlockPattern {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: PatternBlock[];
  category: string;
  subcategories?: string[];
  tags: string[];
  preview?: {
    html?: string;
    css?: string;
    screenshot?: string;
    width?: number;
    height?: number;
  };
  source: 'core' | 'theme' | 'plugin' | 'user';
  featured: boolean;
  usageCount: number;
  lastUsedAt?: string;
  visibility: 'public' | 'private' | 'pro';
  isPremium: boolean;
  metadata?: {
    version?: string;
    keywords?: string[];
    viewportWidth?: number | { mobile?: number; tablet?: number; desktop?: number };
    inserter?: boolean;
    customCategories?: string[];
    blockTypes?: string[];
    postTypes?: string[];
    templateTypes?: string[];
  };
  author: {
    id: string;
    name: string;
  };
  version: string;
  dependencies?: string[];
  colorScheme?: string[];
  typography?: {
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    fontWeight?: string;
  };
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface PatternCategory {
  id: string;
  name: string;
  description: string;
  count: number;
}

interface BlockPatternsBrowserProps {
  onInsertPattern?: (pattern: BlockPattern) => void;
  onPreviewPattern?: (pattern: BlockPattern) => void;
  compact?: boolean;
  selectedCategory?: string;
}

const BlockPatternsBrowser: React.FC<BlockPatternsBrowserProps> = ({
  onInsertPattern,
  onPreviewPattern,
  compact = false,
  selectedCategory: initialCategory = 'all'
}) => {
  const [patterns, setPatterns] = useState<BlockPattern[]>([]);
  const [categories, setCategories] = useState<PatternCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hoveredPattern, setHoveredPattern] = useState<string | null>(null);

  // Fetch patterns
  const fetchPatterns = async (page = 1, search = '', category = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: compact ? '12' : '24',
        search,
        orderby: 'featured',
        order: 'DESC'
      });

      if (category !== 'all') {
        params.append('category', category);
      }

      const response = await fetch(`/api/block-patterns?${params}`);
      if (!response.ok) throw new Error('Failed to fetch patterns');

      const data = await response.json();
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');

      setPatterns(data);
      setTotalPages(totalPages);
    } catch (error) {
    // Error logging - use proper error handler
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/block-patterns/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
    // Error logging - use proper error handler
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPatterns(currentPage, searchQuery, selectedCategory);
  }, [currentPage, searchQuery, selectedCategory]);

  // Handle pattern insertion
  const handleInsertPattern = (pattern: BlockPattern) => {
    if (onInsertPattern) {
      onInsertPattern(pattern);
    }
  };

  // Handle pattern preview
  const handlePreviewPattern = (pattern: BlockPattern) => {
    if (onPreviewPattern) {
      onPreviewPattern(pattern);
    }
  };

  // Render pattern card
  const renderPatternCard = (pattern: BlockPattern) => (
    <Card 
      key={pattern.id} 
      className={`group relative overflow-hidden cursor-pointer transition-all ${
        hoveredPattern === pattern.id ? 'ring-2 ring-blue-500' : ''
      }`}
      onMouseEnter={() => setHoveredPattern(pattern.id)}
      onMouseLeave={() => setHoveredPattern(null)}
      onClick={() => handleInsertPattern(pattern)}
    >
      {/* Preview */}
      <div className="aspect-[4/3] bg-gray-50 border-b overflow-hidden relative">
        {pattern.preview?.screenshot ? (
          <img
            src={pattern.preview.screenshot}
            alt={pattern.title}
            className="w-full h-full object-cover"
          />
        ) : pattern.preview?.html ? (
          <div className="w-full h-full p-4 overflow-hidden">
            <div className="transform scale-50 origin-top-left w-[200%] h-[200%]">
              <div dangerouslySetInnerHTML={{ __html: pattern.preview.html }} />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layers className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {pattern.featured && (
            <Badge className="bg-yellow-500 text-white">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Featured
            </Badge>
          )}
          {pattern.isPremium && (
            <Badge className="bg-purple-500 text-white">
              Pro
            </Badge>
          )}
          {pattern.source === 'core' && (
            <Badge variant="secondary">
              Core
            </Badge>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleInsertPattern(pattern);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Insert Pattern
          </Button>
          {onPreviewPattern && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handlePreviewPattern(pattern);
              }}
              className="text-white border-white hover:bg-white/20"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-sm mb-1">{pattern.title}</h3>
        {pattern.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {pattern.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {categories.find(c => c.id === pattern.category)?.name || pattern.category}
            </Badge>
            {pattern.usageCount > 0 && (
              <span className="text-xs text-gray-500">
                {pattern.usageCount} uses
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">
            by {pattern.author.name}
          </span>
        </div>

        {pattern.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {pattern.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-gray-500">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );

  // Render pattern list item
  const renderPatternListItem = (pattern: BlockPattern) => (
    <Card 
      key={pattern.id} 
      className="p-4 hover:bg-gray-50 cursor-pointer"
      onClick={() => handleInsertPattern(pattern)}
    >
      <div className="flex items-center gap-4">
        {/* Mini preview */}
        <div className="w-20 h-16 bg-gray-100 rounded border overflow-hidden flex-shrink-0">
          {pattern.preview?.screenshot ? (
            <img
              src={pattern.preview.screenshot}
              alt={pattern.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Layers className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-sm flex items-center gap-2">
                {pattern.title}
                {pattern.featured && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                {pattern.isPremium && <Badge className="text-xs bg-purple-500 text-white">Pro</Badge>}
              </h3>
              {pattern.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                  {pattern.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="text-xs">
                  {categories.find(c => c.id === pattern.category)?.name || pattern.category}
                </Badge>
                <span className="text-xs text-gray-500">
                  {pattern.usageCount} uses
                </span>
                <span className="text-xs text-gray-500">
                  by {pattern.author.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInsertPattern(pattern);
                }}
              >
                Insert
              </Button>
              {onPreviewPattern && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewPattern(pattern);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  // Loading skeleton
  const renderSkeleton = () => (
    <div className={viewMode === 'grid' 
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'space-y-3'
    }>
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className={viewMode === 'grid' ? 'h-48' : 'h-20'} />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {/* Compact search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search patterns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category tabs */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name} ({category.count})
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Patterns grid */}
        <div className="space-y-3">
          {loading ? (
            renderSkeleton()
          ) : patterns.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No patterns found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {patterns.slice(0, 6).map(renderPatternCard)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Block Patterns</h2>
          <p className="text-gray-600">Pre-designed block layouts to speed up your workflow</p>
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

      {/* Search and filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Category tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">
            All Patterns
            {categories.length > 0 && (
              <span className="ml-2 text-xs">
                ({categories.reduce((sum, c) => sum + c.count, 0)})
              </span>
            )}
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
              <span className="ml-2 text-xs">({category.count})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {loading ? (
            renderSkeleton()
          ) : patterns.length === 0 ? (
            <div className="text-center py-16">
              <Layers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No patterns found</h3>
              <p className="text-gray-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-3'
              }>
                {viewMode === 'grid' 
                  ? patterns.map(renderPatternCard)
                  : patterns.map(renderPatternListItem)
                }
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8">
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlockPatternsBrowser;