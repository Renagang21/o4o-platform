import { ChangeEvent, FC, ReactNode, useState, useEffect } from 'react';
import {
  FileText,
  Settings,
  Eye,
  Lock,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  X,
  Search,
  Plus,
  AlertCircle,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface PostSettings {
  status: 'draft' | 'pending' | 'private' | 'publish';
  visibility: 'public' | 'private' | 'password';
  publishDate: string;
  author: string;
  featuredImage?: string;
  excerpt: string;
  slug: string;
  slugError?: boolean;
  categories: string[];
  tags: string[];
  template: string;
  commentStatus: boolean;
  pingStatus: boolean;
  sticky: boolean;
  format: 'standard' | 'aside' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio' | 'chat';
}

interface BlockSettings {
  id: string;
  type: string;
  attributes: any;
}

interface GutenbergSidebarProps {
  activeTab?: 'document' | 'block';
  postSettings: PostSettings;
  blockSettings?: BlockSettings;
  onPostSettingsChange: (settings: Partial<PostSettings>) => void;
  onBlockSettingsChange?: (settings: Partial<BlockSettings>) => void;
  onTabChange?: (tab: 'document' | 'block') => void;
  onClose?: () => void;
}

// Panel component for collapsible sections
const Panel: FC<{
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}> = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors">
        <h3 className="font-medium text-sm">{title}</h3>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const GutenbergSidebar: FC<GutenbergSidebarProps> = ({
  activeTab = 'document',
  postSettings,
  blockSettings,
  onPostSettingsChange,
  onBlockSettingsChange,
  onTabChange,
  onClose
}) => {
  const [tagInput, setTagInput] = useState('');
  const [showCategorySearch, setShowCategorySearch] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  
  // Ensure slug value is properly synced
  const [localSlug, setLocalSlug] = useState(postSettings.slug || '');
  const [showSlugWarning, setShowSlugWarning] = useState(false);
  
  // Update local slug when postSettings changes (e.g., when data loads from API)
  useEffect(() => {
    const newSlug = postSettings.slug || '';
    
    // DEBUG: Log slug sync
    // Logging removed for CI/CD
    
    setLocalSlug(newSlug);
  }, [postSettings.slug]);
  
  // Show warning only after user interaction or save attempt
  useEffect(() => {
    if (postSettings.slugError) {
      setShowSlugWarning(true);
    }
  }, [postSettings.slugError]);

  // Mock data for categories
  const availableCategories = [
    { id: '1', name: 'News', slug: 'news' },
    { id: '2', name: 'Tutorials', slug: 'tutorials' },
    { id: '3', name: 'Updates', slug: 'updates' },
    { id: '4', name: 'Announcements', slug: 'announcements' },
  ];

  const handleAddTag = () => {
    if (tagInput.trim()) {
      onPostSettingsChange({
        tags: [...postSettings.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onPostSettingsChange({
      tags: postSettings.tags.filter((tag: any) => tag !== tagToRemove)
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const isSelected = postSettings.categories.includes(categoryId);
    if (isSelected) {
      onPostSettingsChange({
        categories: postSettings.categories.filter((id: any) => id !== categoryId)
      });
    } else {
      onPostSettingsChange({
        categories: [...postSettings.categories, categoryId]
      });
    }
  };

  return (
    <div className="w-80 h-full bg-white border-l flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Tabs value={activeTab} onValueChange={(value) => onTabChange?.(value as 'document' | 'block')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="document" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Document
            </TabsTrigger>
            <TabsTrigger value="block" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Block
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {onClose && (
          <Button
            variant={"ghost" as const}
            size={"icon" as const}
            className="ml-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'document' ? (
          /* Document Tab */
          <div className="w-full">
            {/* Status & Visibility */}
            <Panel title="Status & visibility">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Visibility</Label>
                  <Select
                    value={postSettings.visibility}
                    onValueChange={(value: any) => 
                      onPostSettingsChange({ visibility: value })
                    }
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Public
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Private
                        </div>
                      </SelectItem>
                      <SelectItem value="password">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Password protected
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Publish</Label>
                  <Input
                    type="datetime-local"
                    value={postSettings.publishDate ? postSettings.publishDate.replace('Z', '').slice(0, 16) : ''}
                    onChange={(e: any) => 
                      onPostSettingsChange({ publishDate: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sticky" className="text-xs">
                    Stick to the top of the blog
                  </Label>
                  <Switch
                    id="sticky"
                    checked={postSettings.sticky}
                    onCheckedChange={(checked: boolean) => 
                      onPostSettingsChange({ sticky: checked })
                    }
                  />
                </div>
              </div>
            </Panel>

            {/* Permalink */}
            <Panel title="Permalink">
              <div className="space-y-2">
                <Label className="text-xs">URL Slug</Label>
                <div className="relative min-w-[200px]">
                  <Input
                    value={localSlug}
                    onChange={(e: any) => {
                      const inputValue = e.target.value;
                      // Auto-format slug as user types
                      const formattedSlug = inputValue
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^a-z0-9-]/g, '');
                      setLocalSlug(formattedSlug);
                      
                      // DEBUG: Log slug change
                      // Logging removed for CI/CD
                      
                      onPostSettingsChange({ slug: formattedSlug, slugError: false });
                      
                      // Clear warning when user starts typing
                      if (formattedSlug) {
                        setShowSlugWarning(false);
                      }
                    }}
                    placeholder="post-url-slug"
                    className={`min-w-[200px] w-full flex-shrink-0 ${(postSettings.slugError || (showSlugWarning && !localSlug)) ? "border-red-500 bg-red-50" : ""}`}
                    style={{ minWidth: '200px' }}
                  />
                  {(postSettings.slugError || (showSlugWarning && !localSlug)) && (
                    <div className="absolute -bottom-5 left-0 flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>
                        {!localSlug 
                          ? '⚠️ Slug가 비어있습니다. 한글 제목은 수동으로 slug를 입력해야 합니다.'
                          : 'This slug is already in use. Please choose another.'}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-6">
                  The last part of the URL. Read more about <a href="#" className="text-blue-600 hover:underline">permalinks</a>
                </p>
                {localSlug && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <Globe className="h-3 w-3 inline mr-1" />
                    Preview: /posts/{localSlug}
                  </div>
                )}
              </div>
            </Panel>

            {/* Categories */}
            <Panel title="Categories">
              <div className="space-y-3">
                <div className="relative">
                  <Button
                    variant={"outline" as const}
                    size={"sm" as const}
                    className="w-full justify-start"
                    onClick={() => setShowCategorySearch(!showCategorySearch)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search categories
                  </Button>
                  
                  {showCategorySearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10">
                      <Input
                        autoFocus
                        placeholder="Search..."
                        value={categorySearch}
                        onChange={(e: any) => setCategorySearch(e.target.value)}
                        className="border-0 focus-visible:ring-0"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableCategories
                    .filter((cat: any) => 
                      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                    )
                    .map((category: any) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={postSettings.categories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                </div>

                <Button
                  variant="link"
                  size={"sm" as const}
                  className="p-0 h-auto"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add New Category
                </Button>
              </div>
            </Panel>

            {/* Tags */}
            <Panel title="Tags">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new tag"
                    value={tagInput}
                    onChange={(e: any) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    size={"sm" as const}
                    onClick={handleAddTag}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {postSettings.tags.map((tag: any) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Featured Image */}
            <Panel title="Featured image">
              <div className="space-y-3">
                {postSettings.featuredImage ? (
                  <div className="relative group">
                    <img
                      src={postSettings.featuredImage}
                      alt="Featured"
                      className="w-full rounded-md"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                      <Button size={"sm" as const} variant="secondary">
                        Replace
                      </Button>
                      <Button
                        size={"sm" as const}
                        variant="secondary"
                        onClick={() => 
                          onPostSettingsChange({ featuredImage: undefined })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant={"outline" as const}
                    className="w-full"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Set featured image
                  </Button>
                )}
              </div>
            </Panel>

            {/* Excerpt */}
            <Panel title="Excerpt">
              <div className="space-y-2">
                <Textarea
                  placeholder="Write an excerpt (optional)"
                  value={postSettings.excerpt}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => 
                    onPostSettingsChange({ excerpt: e.target.value })
                  }
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Write an excerpt (optional)
                </p>
              </div>
            </Panel>

            {/* Discussion */}
            <Panel title="Discussion">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="comments" className="text-xs">
                    Allow comments
                  </Label>
                  <Switch
                    id="comments"
                    checked={postSettings.commentStatus}
                    onCheckedChange={(checked: boolean) => 
                      onPostSettingsChange({ commentStatus: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="pingbacks" className="text-xs">
                    Allow pingbacks & trackbacks
                  </Label>
                  <Switch
                    id="pingbacks"
                    checked={postSettings.pingStatus}
                    onCheckedChange={(checked: boolean) => 
                      onPostSettingsChange({ pingStatus: checked })
                    }
                  />
                </div>
              </div>
            </Panel>
          </div>
        ) : (
          /* Block Tab */
          <div className="w-full">
            {blockSettings ? (
              <>
                <Panel title="Block settings">
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm font-medium">{blockSettings.type}</p>
                      <p className="text-xs text-gray-500">Block ID: {blockSettings.id}</p>
                    </div>
                  </div>
                </Panel>

                {/* Dynamic block settings based on block type */}
                {blockSettings.type === 'heading' && (
                  <Panel title="Typography">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs">Level</Label>
                        <Select
                          value={blockSettings.attributes?.level || 'h2'}
                          onValueChange={(value: string) => 
                            onBlockSettingsChange?.({
                              attributes: { ...blockSettings.attributes, level: value }
                            })
                          }
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="h1">Heading 1</SelectItem>
                            <SelectItem value="h2">Heading 2</SelectItem>
                            <SelectItem value="h3">Heading 3</SelectItem>
                            <SelectItem value="h4">Heading 4</SelectItem>
                            <SelectItem value="h5">Heading 5</SelectItem>
                            <SelectItem value="h6">Heading 6</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs">Alignment</Label>
                        <div className="flex gap-1 mt-1">
                          {['left', 'center', 'right'].map((align: any) => (
                            <Button
                              key={align}
                              variant={blockSettings.attributes?.align === align ? 'default' : 'outline'}
                              size={"sm" as const}
                              onClick={() => 
                                onBlockSettingsChange?.({
                                  attributes: { ...blockSettings.attributes, align }
                                })
                              }
                            >
                              {align}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Panel>
                )}

                <Panel title="Advanced">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs">Additional CSS class(es)</Label>
                      <Input
                        placeholder="custom-class"
                        value={blockSettings.attributes?.className || ''}
                        onChange={(e: any) => 
                          onBlockSettingsChange?.({
                            attributes: { ...blockSettings.attributes, className: e.target.value }
                          })
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">HTML anchor</Label>
                      <Input
                        placeholder="anchor-id"
                        value={blockSettings.attributes?.anchor || ''}
                        onChange={(e: any) => 
                          onBlockSettingsChange?.({
                            attributes: { ...blockSettings.attributes, anchor: e.target.value }
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </Panel>
              </>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Select a block to see its settings</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default GutenbergSidebar;