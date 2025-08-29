import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  FileText,
  Eye,
  Calendar,
  User,
  Box as BoxIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';

interface InspectorPanelProps {
  selectedBlock?: any;
  documentSettings?: any;
  onUpdateBlock?: (updates: any) => void;
  onUpdateDocument?: (updates: any) => void;
  activeTab?: string;
  onUploadFeaturedImage?: () => void;
}

const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedBlock,
  documentSettings = {},
  activeTab = 'document',
  onUploadFeaturedImage,
  onUpdateBlock,
}) => {
  // Document settings state
  const [visibility, setVisibility] = useState(documentSettings.visibility || 'public');
  // const [publishDate, setPublishDate] = useState(documentSettings.publishDate || '');
  // const [categories, setCategories] = useState<string[]>(documentSettings.categories || []);
  // const [tags, setTags] = useState<string[]>(documentSettings.tags || []);
  const [featuredImage, setFeaturedImage] = useState(documentSettings.featuredImage || '');
  const [excerpt, setExcerpt] = useState(documentSettings.excerpt || '');
  const [allowComments, setAllowComments] = useState(documentSettings.allowComments ?? true);
  const [allowPingbacks, setAllowPingbacks] = useState(documentSettings.allowPingbacks ?? true);

  // Block settings state
  const [fontSize, setFontSize] = useState(selectedBlock?.attributes?.fontSize || 16);
  const [textAlign, setTextAlign] = useState(selectedBlock?.attributes?.align || 'left');
  const [textColor, setTextColor] = useState(selectedBlock?.attributes?.textColor || '#000000');
  const [backgroundColor, setBackgroundColor] = useState(selectedBlock?.attributes?.backgroundColor || '');

  // Sync block settings when selected block changes
  useEffect(() => {
    if (selectedBlock) {
      setFontSize(selectedBlock.attributes?.fontSize || 16);
      setTextAlign(selectedBlock.attributes?.align || 'left');
      setTextColor(selectedBlock.attributes?.textColor || '#000000');
      setBackgroundColor(selectedBlock.attributes?.backgroundColor || '');
    }
  }, [selectedBlock?.id]);

  // Update font size
  const handleFontSizeChange = (value: number) => {
    setFontSize(value);
    if (onUpdateBlock && selectedBlock) {
      onUpdateBlock({
        ...selectedBlock.attributes,
        fontSize: value
      });
    }
  };

  // Update text alignment
  const handleTextAlignChange = (value: string) => {
    setTextAlign(value);
    if (onUpdateBlock && selectedBlock) {
      onUpdateBlock({
        ...selectedBlock.attributes,
        align: value
      });
    }
  };

  // Update text color
  const handleTextColorChange = (value: string) => {
    setTextColor(value);
    if (onUpdateBlock && selectedBlock) {
      onUpdateBlock({
        ...selectedBlock.attributes,
        textColor: value
      });
    }
  };

  // Update background color
  const handleBackgroundColorChange = (value: string) => {
    setBackgroundColor(value);
    if (onUpdateBlock && selectedBlock) {
      onUpdateBlock({
        ...selectedBlock.attributes,
        backgroundColor: value
      });
    }
  };

  return (
    <div className="fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-gray-200 z-30">
      <Tabs defaultValue={activeTab} className="h-full flex flex-col">
        <TabsList className="w-full grid grid-cols-2 p-1">
          <TabsTrigger value="document" className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Document
          </TabsTrigger>
          <TabsTrigger 
            value="block" 
            disabled={!selectedBlock}
            className="flex items-center gap-1"
          >
            <BoxIcon className="h-3 w-3" />
            Block
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Document Tab */}
          <TabsContent value="document" className="p-4 space-y-4 mt-0">
            {/* Status & Visibility */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Status & Visibility</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <Label className="text-sm">Visibility</Label>
                  </div>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="password">Password</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Label className="text-sm">Publish</Label>
                  </div>
                  <Button variant="link" size="sm" className="text-blue-600 p-0 h-auto">
                    Immediately
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <Label className="text-sm">Author</Label>
                  </div>
                  <Select defaultValue="admin">
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4" />

            {/* Permalink */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Permalink</h3>
              <Input 
                placeholder="sample-post" 
                className="h-8 text-sm"
              />
              <Button variant="link" size="sm" className="text-blue-600 p-0 h-auto">
                View Post
              </Button>
            </div>

            <div className="border-t pt-4" />

            {/* Categories */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Categories</h3>
              <Input 
                placeholder="Search categories" 
                className="h-8 text-sm"
              />
              <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                {['Uncategorized', 'News', 'Updates', 'Tutorials'].map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    {cat}
                  </label>
                ))}
              </div>
              <Button variant="link" size="sm" className="text-blue-600 p-0 h-auto">
                Add New Category
              </Button>
            </div>

            <div className="border-t pt-4" />

            {/* Tags */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Tags</h3>
              <Input 
                placeholder="Add new tag" 
                className="h-8 text-sm"
              />
              <div className="flex flex-wrap gap-1">
                {['wordpress', 'blog', 'tutorial'].map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t pt-4" />

            {/* Featured Image */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Featured Image</h3>
              {featuredImage ? (
                <div className="relative">
                  <img src={featuredImage} alt="Featured" className="w-full rounded" />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => setFeaturedImage('')}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={onUploadFeaturedImage}
                >
                  Set Featured Image
                </Button>
              )}
            </div>

            <div className="border-t pt-4" />

            {/* Excerpt */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Excerpt</h3>
              <Textarea
                placeholder="Write an excerpt (optional)"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>

            <div className="border-t pt-4" />

            {/* Discussion */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Discussion</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Allow comments</Label>
                  <Switch
                    checked={allowComments}
                    onCheckedChange={setAllowComments}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Allow pingbacks</Label>
                  <Switch
                    checked={allowPingbacks}
                    onCheckedChange={setAllowPingbacks}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Block Tab */}
          <TabsContent value="block" className="p-4 space-y-4 mt-0">
            {selectedBlock ? (
              <>
                {/* Typography */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Typography</h3>
                  <div className="space-y-2">
                    <Label className="text-sm">Font Size</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[fontSize]}
                        onValueChange={([value]) => handleFontSizeChange(value)}
                        min={12}
                        max={48}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm w-12 text-right">{fontSize}px</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Text Alignment</Label>
                    <div className="flex gap-1">
                      <Button
                        variant={textAlign === 'left' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTextAlignChange('left')}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={textAlign === 'center' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTextAlignChange('center')}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={textAlign === 'right' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTextAlignChange('right')}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={textAlign === 'justify' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTextAlignChange('justify')}
                      >
                        <AlignJustify className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4" />

                {/* Colors */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Colors</h3>
                  <div className="space-y-2">
                    <Label className="text-sm">Text Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => handleTextColorChange(e.target.value)}
                        className="h-8 w-8 border rounded cursor-pointer"
                      />
                      <Input
                        value={textColor}
                        onChange={(e) => handleTextColorChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextColorChange('#000000')}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Background Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={backgroundColor || '#ffffff'}
                        onChange={(e) => handleBackgroundColorChange(e.target.value)}
                        className="h-8 w-8 border rounded cursor-pointer"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => handleBackgroundColorChange(e.target.value)}
                        placeholder="transparent"
                        className="h-8 text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBackgroundColorChange('')}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4" />

                {/* Advanced */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Advanced</h3>
                  <div className="space-y-2">
                    <Label className="text-sm">HTML Anchor</Label>
                    <Input placeholder="anchor-id" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">CSS Classes</Label>
                    <Input placeholder="custom-class" className="h-8 text-sm" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <BoxIcon className="h-12 w-12 mb-2" />
                <p className="text-sm">No block selected</p>
                <p className="text-xs mt-1">Select a block to see its settings</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default InspectorPanel;