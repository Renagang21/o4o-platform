/**
 * Blog Archive Settings Component
 * Handles archive/grid layout, card style, featured images, and pagination settings
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { BlogSubComponentProps } from './types';
import { handleArchiveChange, handleNestedArchiveChange } from './utils';

/**
 * BlogArchiveSettings Component
 * Renders layout type, columns, card settings, featured images, and pagination controls
 */
export const BlogArchiveSettings: React.FC<BlogSubComponentProps> = ({
  settings,
  onChange
}) => {
  const handleChange = <K extends keyof typeof settings.archive>(
    field: K,
    value: typeof settings.archive[K]
  ) => {
    handleArchiveChange(settings, field, value, onChange);
  };

  const handleNested = <T extends keyof typeof settings.archive>(
    section: T,
    field: keyof typeof settings.archive[T],
    value: any
  ) => {
    handleNestedArchiveChange(settings, section, field, value, onChange);
  };

  return (
    <div className="space-y-6">
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
            onCheckedChange={(checked) => handleNested('featuredImage', 'enabled', checked)}
          />
          <Label htmlFor="featured-image">Show Featured Images</Label>
        </div>

        {settings.archive.featuredImage.enabled && (
          <>
            <div className="space-y-2">
              <Label>Image Position</Label>
              <Select
                value={settings.archive.featuredImage.position}
                onValueChange={(value) => handleNested('featuredImage', 'position', value)}
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
                onValueChange={(value) => handleNested('featuredImage', 'ratio', value)}
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
                onValueChange={(value) => handleNested('featuredImage', 'hoverEffect', value)}
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

      {/* Pagination Settings */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Pagination Settings</h4>

        <div className="flex items-center space-x-2">
          <Switch
            id="pagination"
            checked={settings.archive.pagination.enabled}
            onCheckedChange={(checked) => handleNested('pagination', 'enabled', checked)}
          />
          <Label htmlFor="pagination">Enable Pagination</Label>
        </div>

        {settings.archive.pagination.enabled && (
          <>
            <div className="space-y-2">
              <Label>Pagination Type</Label>
              <Select
                value={settings.archive.pagination.type}
                onValueChange={(value) => handleNested('pagination', 'type', value)}
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
                onChange={(e) => handleNested('pagination', 'postsPerPage', parseInt(e.target.value) || 12)}
              />
            </div>
          </>
        )}
      </div>

      {/* Sorting Settings */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Sorting & Filters</h4>

        <div className="flex items-center space-x-2">
          <Switch
            id="sorting"
            checked={settings.archive.sorting.showSortOptions}
            onCheckedChange={(checked) => handleNested('sorting', 'showSortOptions', checked)}
          />
          <Label htmlFor="sorting">Show Sort Options</Label>
        </div>

        <div className="space-y-2">
          <Label>Default Order</Label>
          <Select
            value={settings.archive.sorting.defaultOrder}
            onValueChange={(value) => handleNested('sorting', 'defaultOrder', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest First)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="views">Most Views</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enable-search"
            checked={settings.archive.sorting.enableSearch}
            onCheckedChange={(checked) => handleNested('sorting', 'enableSearch', checked)}
          />
          <Label htmlFor="enable-search">Enable Search</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enable-filters"
            checked={settings.archive.sorting.enableFilters}
            onCheckedChange={(checked) => handleNested('sorting', 'enableFilters', checked)}
          />
          <Label htmlFor="enable-filters">Enable Filters</Label>
        </div>
      </div>
    </div>
  );
};
