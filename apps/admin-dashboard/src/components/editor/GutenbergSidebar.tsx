import { useState } from 'react';
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
  onClose?: () => void;
}

// Panel component for collapsible sections
const Panel: FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
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
  onClose
}) => {
  const [tagInput, setTagInput] = useState('');
  const [showCategorySearch, setShowCategorySearch] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

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
      tags: postSettings.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const isSelected = postSettings.categories.includes(categoryId);
    if (isSelected) {
      onPostSettingsChange({
        categories: postSettings.categories.filter(id => id !== categoryId)
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
        <Tabs value={activeTab} className="w-full">
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
            variant="ghost"
            size="icon"
            className="ml-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <Tabs value={activeTab} className="w-full">
          {/* Document Tab */}
          <TabsContent value="document" className="m-0">
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
                    value={postSettings.publishDate}
                    onChange={(e) => 
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
                    onCheckedChange={(checked) => 
                      onPostSettingsChange({ sticky: checked })
                    }
                  />
                </div>

                <div className="pt-2 border-t">
                  <Button
                    variant="link"
                    className="p-0 h-auto text-red-600 hover:text-red-700"
                  >
                    Move to trash
                  </Button>
                </div>
              </div>
            </Panel>

            {/* Permalink */}
            <Panel title="Permalink">
              <div className="space-y-2">
                <Label className="text-xs">URL Slug</Label>
                <Input
                  value={postSettings.slug}
                  onChange={(e) => 
                    onPostSettingsChange({ slug: e.target.value })
                  }
                  placeholder="post-url-slug"
                />
                <p className="text-xs text-gray-500">
                  The last part of the URL. Read more about <a href="#" className="text-blue-600 hover:underline">permalinks</a>
                </p>
              </div>
            </Panel>

            {/* Categories */}
            <Panel title="Categories">
              <div className="space-y-3">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
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
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="border-0 focus-visible:ring-0"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableCategories
                    .filter(cat => 
                      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                    )
                    .map(category => (
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
                  size="sm"
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
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddTag}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {postSettings.tags.map(tag => (
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
                      <Button size="sm" variant="secondary">
                        Replace
                      </Button>
                      <Button
                        size="sm"
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
                    variant="outline"
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
                  onChange={(e) => 
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
                    onCheckedChange={(checked) => 
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
                    onCheckedChange={(checked) => 
                      onPostSettingsChange({ pingStatus: checked })
                    }
                  />
                </div>
              </div>
            </Panel>
          </TabsContent>

          {/* Block Tab */}
          <TabsContent value="block" className="m-0">
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
                          onValueChange={(value) => 
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
                          {['left', 'center', 'right'].map(align => (
                            <Button
                              key={align}
                              variant={blockSettings.attributes?.align === align ? 'default' : 'outline'}
                              size="sm"
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
                        onChange={(e) => 
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
                        onChange={(e) => 
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
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};

export default GutenbergSidebar;