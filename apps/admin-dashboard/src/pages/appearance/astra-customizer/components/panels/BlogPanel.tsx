/**
 * Blog Panel Component
 * Customizer의 Blog/Archive 설정 패널
 */

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BlogSettings, PostMetaItem } from '../../types/customizer-types';
import { Grid, Palette, Type, Settings, Image, Hash, User } from 'lucide-react';

interface BlogPanelProps {
  settings?: BlogSettings;
  onChange: (settings: BlogSettings) => void;
}

const defaultSettings: BlogSettings = {
  archive: {
    layout: 'grid',
    showArchiveHeader: true,
    showLayoutSwitcher: true,
    showSortOptions: true,
    cardSpacing: 20,
    featuredImage: {
      enabled: true,
      position: 'top',
      ratio: '16:9',
      customRatio: { width: 16, height: 9 },
      size: 'medium',
      hoverEffect: 'zoom'
    },
    meta: {
      position: 'after-title',
      showIcons: true,
      items: [
        { id: 'date', label: 'Date', enabled: true, showIcon: true, order: 1 },
        { id: 'author', label: 'Author', enabled: true, showIcon: true, order: 2 },
        { id: 'category', label: 'Category', enabled: true, showIcon: true, order: 3 },
        { id: 'comments', label: 'Comments', enabled: false, showIcon: true, order: 4 }
      ],
      colors: {
        text: '#6c757d',
        links: '#0073e6',
        icons: '#6c757d'
      }
    },
    content: {
      showTitle: true,
      titleTag: 'h2',
      showExcerpt: true,
      excerptSource: 'auto',
      excerptLength: 25,
      showReadMoreButton: true,
      readMoreText: 'Read More'
    },
    pagination: {
      type: 'numbers',
      postsPerPage: 12,
      showNumbers: true,
      showPrevNext: true,
      prevText: 'Previous',
      nextText: 'Next',
      infiniteScrollThreshold: 100
    },
    sorting: {
      defaultOrder: 'date-desc',
      showSortOptions: true,
      enableSearch: false,
      enableFilters: false
    },
    cardStyle: 'shadow',
    styling: {
      backgroundColor: '#ffffff',
      borderColor: '#e1e5e9',
      borderRadius: 8,
      cardPadding: 20,
      titleColor: '#333333',
      titleHoverColor: '#0073e6',
      excerptColor: '#6c757d',
      metaColor: '#6c757d',
      typography: {
        titleSize: { desktop: 20, tablet: 18, mobile: 16 },
        titleWeight: 600,
        excerptSize: { desktop: 14, tablet: 13, mobile: 12 },
        metaSize: { desktop: 12, tablet: 11, mobile: 10 }
      }
    }
  }
};

export const BlogPanel: React.FC<BlogPanelProps> = ({
  settings: propSettings,
  onChange
}) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  const settings = { ...defaultSettings, ...propSettings };

  const handleChange = <K extends keyof BlogSettings['archive']>(
    field: K,
    value: BlogSettings['archive'][K]
  ) => {
    onChange({
      ...settings,
      archive: {
        ...settings.archive,
        [field]: value
      }
    });
  };

  const handleNestedChange = <T extends keyof BlogSettings['archive']>(
    section: T,
    field: keyof BlogSettings['archive'][T],
    value: any
  ) => {
    onChange({
      ...settings,
      archive: {
        ...settings.archive,
        [section]: {
          ...settings.archive[section],
          [field]: value
        }
      }
    });
  };

  const handleResponsiveChange = (
    section: 'typography',
    field: 'titleSize' | 'excerptSize' | 'metaSize',
    value: number
  ) => {
    onChange({
      ...settings,
      archive: {
        ...settings.archive,
        styling: {
          ...settings.archive.styling,
          typography: {
            ...settings.archive.styling.typography,
            [field]: {
              ...settings.archive.styling.typography[field],
              [device]: value
            }
          }
        }
      }
    });
  };

  const handleMetaItemChange = (itemId: string, field: keyof PostMetaItem, value: any) => {
    const updatedItems = settings.archive.meta.items.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    );
    
    handleNestedChange('meta', 'items', updatedItems);
  };

  const renderColorInput = (
    label: string,
    value: string,
    section: keyof BlogSettings['archive'],
    field: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => {
            if (section === 'styling') {
              handleNestedChange('styling', field as any, e.target.value);
            } else if (section === 'meta') {
              handleNestedChange('meta', 'colors' as any, {
                ...settings.archive.meta.colors,
                [field]: e.target.value
              });
            }
          }}
          className="w-16 h-10 p-1 cursor-pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            if (section === 'styling') {
              handleNestedChange('styling', field as any, e.target.value);
            } else if (section === 'meta') {
              handleNestedChange('meta', 'colors' as any, {
                ...settings.archive.meta.colors,
                [field]: e.target.value
              });
            }
          }}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Blog & Archive Settings</h3>
        
        {/* Preview */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-3">Layout Preview</p>
          <div className="flex gap-2 items-center mb-2">
            <div className="text-xs text-gray-500">Layout:</div>
            <div className="text-sm font-medium">{settings.archive.layout}</div>
            <div className="text-xs text-gray-500">•</div>
            <div className="text-xs text-gray-500">Card Style:</div>
            <div className="text-sm font-medium">{settings.archive.cardStyle}</div>
          </div>
          <div 
            className={`grid gap-3 ${
              settings.archive.layout === 'grid' ? 'grid-cols-3' : 
              settings.archive.layout === 'list' ? 'grid-cols-1' : 'columns-3'
            }`}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i}
                className={`bg-white rounded border p-3 ${
                  settings.archive.cardStyle === 'shadow' ? 'shadow-sm' :
                  settings.archive.cardStyle === 'boxed' ? 'border-gray-300' :
                  'border-transparent'
                }`}
                style={{
                  borderRadius: `${settings.archive.styling.borderRadius}px`,
                  backgroundColor: settings.archive.styling.backgroundColor
                }}
              >
                {settings.archive.featuredImage.enabled && (
                  <div className="w-full h-12 bg-gray-200 rounded mb-2"></div>
                )}
                <div 
                  className="text-xs font-medium mb-1"
                  style={{ 
                    color: settings.archive.styling.titleColor,
                    fontSize: `${settings.archive.styling.typography.titleSize[device] * 0.6}px`
                  }}
                >
                  Post Title {i + 1}
                </div>
                {settings.archive.content.showExcerpt && (
                  <div 
                    className="text-xs text-gray-500 mb-2"
                    style={{ 
                      color: settings.archive.styling.excerptColor,
                      fontSize: `${settings.archive.styling.typography.excerptSize[device] * 0.6}px`
                    }}
                  >
                    Excerpt text here...
                  </div>
                )}
                {settings.archive.meta.items.filter(item => item.enabled).length > 0 && (
                  <div className="flex gap-2 text-xs">
                    {settings.archive.meta.items
                      .filter(item => item.enabled)
                      .slice(0, 2)
                      .map(item => (
                        <span 
                          key={item.id}
                          style={{ color: settings.archive.meta.colors.text }}
                        >
                          {item.id === 'date' ? 'Jan 1' :
                           item.id === 'author' ? 'Author' :
                           item.id === 'category' ? 'Tech' : '5 comments'}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Tabs defaultValue="layout" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="layout" className="flex items-center gap-2">
              <Grid size={16} />
              Layout
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Type size={16} />
              Content
            </TabsTrigger>
            <TabsTrigger value="meta" className="flex items-center gap-2">
              <User size={16} />
              Meta
            </TabsTrigger>
            <TabsTrigger value="styling" className="flex items-center gap-2">
              <Palette size={16} />
              Styling
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings size={16} />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="layout" className="space-y-6 mt-6">
            {/* Layout Type */}
            <div className="space-y-2">
              <Label>Layout Type</Label>
              <Select
                value={settings.archive.layout}
                onValueChange={(value) => handleChange('layout', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="masonry">Masonry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Card Style */}
            <div className="space-y-2">
              <Label>Card Style</Label>
              <Select
                value={settings.archive.cardStyle}
                onValueChange={(value) => handleChange('cardStyle', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat</SelectItem>
                  <SelectItem value="boxed">Boxed</SelectItem>
                  <SelectItem value="shadow">Shadow</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Card Spacing */}
            <div>
              <Label>
                Card Spacing
                <span className="ml-2 text-sm text-gray-500">
                  {settings.archive.cardSpacing}px
                </span>
              </Label>
              <Slider
                value={[settings.archive.cardSpacing]}
                onValueChange={([value]) => handleChange('cardSpacing', value)}
                min={10}
                max={50}
                step={2}
                className="mt-2"
              />
            </div>

            {/* Featured Image Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="featured-image"
                  checked={settings.archive.featuredImage.enabled}
                  onCheckedChange={(checked) => handleNestedChange('featuredImage', 'enabled', checked)}
                />
                <Label htmlFor="featured-image">Show Featured Images</Label>
              </div>

              {settings.archive.featuredImage.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Image Position</Label>
                    <Select
                      value={settings.archive.featuredImage.position}
                      onValueChange={(value) => handleNestedChange('featuredImage', 'position', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Image Ratio</Label>
                    <Select
                      value={settings.archive.featuredImage.ratio}
                      onValueChange={(value) => handleNestedChange('featuredImage', 'ratio', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="4:3">4:3</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Hover Effect</Label>
                    <Select
                      value={settings.archive.featuredImage.hoverEffect}
                      onValueChange={(value) => handleNestedChange('featuredImage', 'hoverEffect', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="fade">Fade</SelectItem>
                        <SelectItem value="overlay">Overlay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Archive Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="archive-header"
                  checked={settings.archive.showArchiveHeader}
                  onCheckedChange={(checked) => handleChange('showArchiveHeader', checked)}
                />
                <Label htmlFor="archive-header">Show Archive Header</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="layout-switcher"
                  checked={settings.archive.showLayoutSwitcher}
                  onCheckedChange={(checked) => handleChange('showLayoutSwitcher', checked)}
                />
                <Label htmlFor="layout-switcher">Show Layout Switcher</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="sort-options"
                  checked={settings.archive.showSortOptions}
                  onCheckedChange={(checked) => handleChange('showSortOptions', checked)}
                />
                <Label htmlFor="sort-options">Show Sort Options</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6 mt-6">
            {/* Content Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-title"
                  checked={settings.archive.content.showTitle}
                  onCheckedChange={(checked) => handleNestedChange('content', 'showTitle', checked)}
                />
                <Label htmlFor="show-title">Show Post Title</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-excerpt"
                  checked={settings.archive.content.showExcerpt}
                  onCheckedChange={(checked) => handleNestedChange('content', 'showExcerpt', checked)}
                />
                <Label htmlFor="show-excerpt">Show Excerpt</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="show-readmore"
                  checked={settings.archive.content.showReadMoreButton}
                  onCheckedChange={(checked) => handleNestedChange('content', 'showReadMoreButton', checked)}
                />
                <Label htmlFor="show-readmore">Show Read More Button</Label>
              </div>
            </div>

            {/* Excerpt Settings */}
            {settings.archive.content.showExcerpt && (
              <>
                <div className="space-y-2">
                  <Label>Excerpt Source</Label>
                  <Select
                    value={settings.archive.content.excerptSource}
                    onValueChange={(value) => handleNestedChange('content', 'excerptSource', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto Generated</SelectItem>
                      <SelectItem value="manual">Manual Excerpt</SelectItem>
                      <SelectItem value="content">From Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Excerpt Length (words)</Label>
                  <Input
                    type="number"
                    min="10"
                    max="100"
                    value={settings.archive.content.excerptLength}
                    onChange={(e) => handleNestedChange('content', 'excerptLength', parseInt(e.target.value) || 25)}
                  />
                </div>
              </>
            )}

            {/* Read More Button */}
            {settings.archive.content.showReadMoreButton && (
              <div className="space-y-2">
                <Label>Read More Text</Label>
                <Input
                  value={settings.archive.content.readMoreText}
                  onChange={(e) => handleNestedChange('content', 'readMoreText', e.target.value)}
                  placeholder="Read More"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="meta" className="space-y-6 mt-6">
            {/* Meta Position */}
            <div className="space-y-2">
              <Label>Meta Position</Label>
              <Select
                value={settings.archive.meta.position}
                onValueChange={(value) => handleNestedChange('meta', 'position', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before-title">Before Title</SelectItem>
                  <SelectItem value="after-title">After Title</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Show Icons */}
            <div className="flex items-center space-x-2">
              <Switch
                id="meta-icons"
                checked={settings.archive.meta.showIcons}
                onCheckedChange={(checked) => handleNestedChange('meta', 'showIcons', checked)}
              />
              <Label htmlFor="meta-icons">Show Meta Icons</Label>
            </div>

            {/* Meta Items */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Meta Items</Label>
              {settings.archive.meta.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(checked) => handleMetaItemChange(item.id, 'enabled', checked)}
                    />
                    <Label className="capitalize">{item.id}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Order:</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={item.order}
                      onChange={(e) => handleMetaItemChange(item.id, 'order', parseInt(e.target.value) || 1)}
                      className="w-16"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Meta Colors */}
            <div className="grid grid-cols-1 gap-4">
              {renderColorInput('Text Color', settings.archive.meta.colors.text, 'meta', 'text')}
              {renderColorInput('Link Color', settings.archive.meta.colors.links, 'meta', 'links')}
              {renderColorInput('Icon Color', settings.archive.meta.colors.icons, 'meta', 'icons')}
            </div>
          </TabsContent>

          <TabsContent value="styling" className="space-y-6 mt-6">
            {/* Device Switcher */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded">
              {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`flex-1 px-3 py-1 text-sm rounded transition-colors ${
                    device === d ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                  }`}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              {renderColorInput('Background Color', settings.archive.styling.backgroundColor, 'styling', 'backgroundColor')}
              {renderColorInput('Border Color', settings.archive.styling.borderColor, 'styling', 'borderColor')}
              {renderColorInput('Title Color', settings.archive.styling.titleColor, 'styling', 'titleColor')}
              {renderColorInput('Title Hover Color', settings.archive.styling.titleHoverColor, 'styling', 'titleHoverColor')}
              {renderColorInput('Excerpt Color', settings.archive.styling.excerptColor, 'styling', 'excerptColor')}
            </div>

            {/* Typography */}
            <div className="space-y-4">
              <div>
                <Label>Title Font Size ({device})</Label>
                <Input
                  type="number"
                  min="12"
                  max="32"
                  value={settings.archive.styling.typography.titleSize[device]}
                  onChange={(e) => handleResponsiveChange('typography', 'titleSize', parseInt(e.target.value) || 20)}
                />
              </div>

              <div>
                <Label>Excerpt Font Size ({device})</Label>
                <Input
                  type="number"
                  min="10"
                  max="20"
                  value={settings.archive.styling.typography.excerptSize[device]}
                  onChange={(e) => handleResponsiveChange('typography', 'excerptSize', parseInt(e.target.value) || 14)}
                />
              </div>

              <div>
                <Label>Meta Font Size ({device})</Label>
                <Input
                  type="number"
                  min="8"
                  max="16"
                  value={settings.archive.styling.typography.metaSize[device]}
                  onChange={(e) => handleResponsiveChange('typography', 'metaSize', parseInt(e.target.value) || 12)}
                />
              </div>

              <div>
                <Label>Title Font Weight</Label>
                <Select
                  value={settings.archive.styling.typography.titleWeight.toString()}
                  onValueChange={(value) => handleNestedChange('styling', 'typography', {
                    ...settings.archive.styling.typography,
                    titleWeight: parseInt(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">Light (300)</SelectItem>
                    <SelectItem value="400">Normal (400)</SelectItem>
                    <SelectItem value="500">Medium (500)</SelectItem>
                    <SelectItem value="600">Semi Bold (600)</SelectItem>
                    <SelectItem value="700">Bold (700)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <Label>
                Border Radius
                <span className="ml-2 text-sm text-gray-500">
                  {settings.archive.styling.borderRadius}px
                </span>
              </Label>
              <Slider
                value={[settings.archive.styling.borderRadius]}
                onValueChange={([value]) => handleNestedChange('styling', 'borderRadius', value)}
                min={0}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Card Padding */}
            <div>
              <Label>
                Card Padding
                <span className="ml-2 text-sm text-gray-500">
                  {settings.archive.styling.cardPadding}px
                </span>
              </Label>
              <Slider
                value={[settings.archive.styling.cardPadding]}
                onValueChange={([value]) => handleNestedChange('styling', 'cardPadding', value)}
                min={10}
                max={40}
                step={2}
                className="mt-2"
              />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-6">
            {/* Pagination Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="pagination"
                  checked={settings.archive.pagination.enabled}
                  onCheckedChange={(checked) => handleNestedChange('pagination', 'enabled', checked)}
                />
                <Label htmlFor="pagination">Enable Pagination</Label>
              </div>

              {settings.archive.pagination.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Pagination Type</Label>
                    <Select
                      value={settings.archive.pagination.type}
                      onValueChange={(value) => handleNestedChange('pagination', 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="numbers">Numbers</SelectItem>
                        <SelectItem value="prevNext">Previous/Next Only</SelectItem>
                        <SelectItem value="loadMore">Load More Button</SelectItem>
                        <SelectItem value="infinite">Infinite Scroll</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Posts Per Page</Label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={settings.archive.pagination.postsPerPage}
                      onChange={(e) => handleNestedChange('pagination', 'postsPerPage', parseInt(e.target.value) || 12)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pagination Alignment</Label>
                    <Select
                      value={settings.archive.pagination.alignment}
                      onValueChange={(value) => handleNestedChange('pagination', 'alignment', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Sorting Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="sorting"
                  checked={settings.archive.sorting.enabled}
                  onCheckedChange={(checked) => handleNestedChange('sorting', 'enabled', checked)}
                />
                <Label htmlFor="sorting">Enable Sorting</Label>
              </div>

              {settings.archive.sorting.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Default Sort By</Label>
                    <Select
                      value={settings.archive.sorting.sortBy}
                      onValueChange={(value) => handleNestedChange('sorting', 'sortBy', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="views">Views</SelectItem>
                        <SelectItem value="comments">Comments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Order</Label>
                    <Select
                      value={settings.archive.sorting.order}
                      onValueChange={(value) => handleNestedChange('sorting', 'order', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="user-sort"
                      checked={settings.archive.sorting.allowUserSort}
                      onCheckedChange={(checked) => handleNestedChange('sorting', 'allowUserSort', checked)}
                    />
                    <Label htmlFor="user-sort">Allow User to Change Sort</Label>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
        <strong>Note:</strong> These settings control how your blog archive pages appear. 
        You can customize layouts, styling, meta information, and pagination to match your design needs.
      </div>
    </div>
  );
};

export default BlogPanel;