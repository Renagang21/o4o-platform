import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Search,
  X,
  Type,
  Image,
  Layout,
  Code,
  Film,
  Package,
  Palette,
  Grid,
  Clock,
  Star,
  FileText,
  List,
  Quote,
  Columns,
  Square,
  Play,
  Music,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface BlockType {
  name: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  keywords?: string[];
  isReusable?: boolean;
  isPro?: boolean;
  isNew?: boolean;
}

interface BlockCategory {
  slug: string;
  title: string;
  icon?: React.ReactNode;
  count?: number;
}

interface BlockInserterProps {
  onClose: () => void;
  onInsertBlock: (blockName: string) => void;
  isOpen: boolean;
}

// Category icons mapping
const categoryIcons: Record<string, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  media: <Image className="h-4 w-4" />,
  design: <Palette className="h-4 w-4" />,
  widgets: <Package className="h-4 w-4" />,
  theme: <Layout className="h-4 w-4" />,
  embed: <Code className="h-4 w-4" />,
  dynamic: <Grid className="h-4 w-4" />,
};

// Block icons mapping
const blockIcons: Record<string, React.ReactNode> = {
  'paragraph': <FileText className="h-5 w-5" />,
  'heading': <Type className="h-5 w-5" />,
  'list': <List className="h-5 w-5" />,
  'quote': <Quote className="h-5 w-5" />,
  'code': <Code className="h-5 w-5" />,
  'image': <Image className="h-5 w-5" />,
  'gallery': <Grid className="h-5 w-5" />,
  'video': <Film className="h-5 w-5" />,
  'audio': <Music className="h-5 w-5" />,
  'columns': <Columns className="h-5 w-5" />,
  'group': <Square className="h-5 w-5" />,
  'button': <Play className="h-5 w-5" />,
  'layout': <Layout className="h-5 w-5" />,
  'block-default': <Square className="h-5 w-5" />,
  'forms': <FileText className="h-5 w-5" />,
  'media-document': <FileText className="h-5 w-5" />,
  'default': <Square className="h-5 w-5" />,
};

const BlockInserter: React.FC<BlockInserterProps> = ({
  onClose,
  onInsertBlock,
  isOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['text', 'media'])
  );
  const [availableBlocks, setAvailableBlocks] = useState<BlockType[]>([]);
  const [blockCategories, setBlockCategories] = useState<BlockCategory[]>([]);

  // Load blocks and categories from WordPress API
  useEffect(() => {
    if (!isOpen) return;
    
    // Function to load blocks from WordPress
    const loadBlocks = () => {
      // Get categories
      const wpCategories = window.wp?.blocks?.getCategories?.() || [];
      const categories = wpCategories.length > 0 
        ? wpCategories.map((cat: any) => ({
            slug: cat.slug,
            title: cat.title,
            icon: categoryIcons[cat.slug] || categoryIcons['default'],
            count: 0,
          }))
        : [
            { slug: 'text', title: 'Text', icon: categoryIcons.text, count: 0 },
            { slug: 'media', title: 'Media', icon: categoryIcons.media, count: 0 },
            { slug: 'design', title: 'Design', icon: categoryIcons.design, count: 0 },
            { slug: 'widgets', title: 'Widgets', icon: categoryIcons.widgets, count: 0 },
            { slug: 'theme', title: 'Theme', icon: categoryIcons.theme, count: 0 },
            { slug: 'embed', title: 'Embeds', icon: categoryIcons.embed, count: 0 },
            { slug: 'dynamic', title: 'Dynamic', icon: categoryIcons.dynamic, count: 0 },
          ];

      // Get blocks
      const wpBlocks = window.wp?.blocks?.getBlockTypes?.() || [];
      const blocks = wpBlocks.map((block: any) => ({
        name: block.name,
        title: block.title || block.name.split('/')[1] || block.name,
        description: block.description || '',
        category: block.category || 'common',
        icon: blockIcons[typeof block.icon === 'string' ? block.icon : 'default'] || blockIcons['default'],
        keywords: block.keywords || [],
      }));

      setAvailableBlocks(blocks);
      
      // Update category counts
      setBlockCategories(categories.map(cat => ({
        ...cat,
        count: blocks.filter(b => b.category === cat.slug).length
      })));
    };
    
    // Load immediately
    loadBlocks();
    
    // Subscribe to changes
    const unsubscribe = window.wp?.data?.subscribe?.(() => loadBlocks());
    
    return () => unsubscribe?.();
  }, [isOpen]);

  const filteredBlocks = useMemo(() => {
    if (!searchQuery) return availableBlocks;
    
    const query = searchQuery.toLowerCase();
    return availableBlocks.filter(
      (block) =>
        block.title.toLowerCase().includes(query) ||
        block.description.toLowerCase().includes(query) ||
        block.keywords?.some((keyword) => keyword.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const recentBlocks = availableBlocks.slice(0, 6);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const BlockItem: React.FC<{ block: BlockType }> = ({ block }) => (
    <Button
      variant="ghost"
      className="h-auto flex-col p-3 relative group hover:bg-gray-100"
      onClick={() => onInsertBlock(block.name)}
    >
      <div className="text-blue-600 mb-1">{block.icon}</div>
      <span className="text-xs font-medium">{block.title}</span>
      {block.isNew && (
        <Badge className="absolute top-1 right-1 text-[10px] px-1 py-0">
          NEW
        </Badge>
      )}
      {block.isPro && (
        <Badge variant="secondary" className="absolute top-1 right-1 text-[10px] px-1 py-0">
          PRO
        </Badge>
      )}
      <div className="hidden group-hover:block absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded max-w-xs">
        {block.description}
      </div>
    </Button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed left-0 top-14 bottom-0 w-80 bg-white border-r border-gray-200 z-40 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Block Library</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search blocks"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="blocks" className="flex-1">
        <TabsList className="w-full justify-start px-4 h-10 bg-transparent border-b rounded-none">
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="reusable">Reusable</TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-13rem)]">
          {/* Blocks Tab */}
          <TabsContent value="blocks" className="mt-0">
            {searchQuery ? (
              // Search Results
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-3">
                  {filteredBlocks.length} results for "{searchQuery}"
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {filteredBlocks.map((block) => (
                    <BlockItem key={block.name} block={block} />
                  ))}
                </div>
              </div>
            ) : (
              // Categories View
              <div>
                {/* Most Used */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">Most Used</span>
                    <Star className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {recentBlocks.map((block) => (
                      <BlockItem key={block.name} block={block} />
                    ))}
                  </div>
                </div>

                {/* Categories */}
                {blockCategories.map((category) => {
                  const categoryBlocks = availableBlocks.filter(
                    (b) => b.category === category.slug
                  );
                  const isExpanded = expandedCategories.has(category.slug);

                  return (
                    <Collapsible
                      key={category.slug}
                      open={isExpanded}
                      onOpenChange={() => toggleCategory(category.slug)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            {category.icon}
                            <span className="text-sm font-semibold">
                              {category.title}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {categoryBlocks.length}
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 py-3 border-b border-gray-200">
                          <div className="grid grid-cols-3 gap-2">
                            {categoryBlocks.map((block) => (
                              <BlockItem key={block.name} block={block} />
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="p-4 mt-0">
            <p className="text-sm text-gray-500 mb-3">
              Patterns are predefined block layouts. Choose a pattern to
              quickly add a complex layout.
            </p>
            <Button variant="outline" className="w-full">
              Explore Patterns
            </Button>
          </TabsContent>

          {/* Reusable Tab */}
          <TabsContent value="reusable" className="p-4 mt-0">
            <p className="text-sm text-gray-500 mb-3">
              No reusable blocks found.
            </p>
            <Button variant="outline" className="w-full">
              Create Reusable Block
            </Button>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default BlockInserter;