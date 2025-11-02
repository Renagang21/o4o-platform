/**
 * Blog Content Settings Component
 * Handles title, excerpt, meta information, and read more button settings
 */

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorInput } from '../../common';
import { BlogSubComponentProps } from './types';
import { handleNestedArchiveChange, handleMetaItemChange, handleMetaColorChange } from './utils';

/**
 * BlogContentSettings Component
 * Renders content display settings including title, excerpt, meta items, and read more button
 */
export const BlogContentSettings: React.FC<BlogSubComponentProps> = ({
  settings,
  onChange
}) => {
  const handleNested = <T extends keyof typeof settings.archive>(
    section: T,
    field: keyof typeof settings.archive[T],
    value: any
  ) => {
    handleNestedArchiveChange(settings, section, field, value, onChange);
  };

  const handleMetaChange = (
    itemId: string,
    field: keyof typeof settings.archive.meta.items[0],
    value: any
  ) => {
    handleMetaItemChange(settings, itemId, field, value, onChange);
  };

  const renderColorInput = (
    label: string,
    value: string,
    field: 'text' | 'links' | 'icons'
  ) => (
    <ColorInput
      label={label}
      value={value}
      onChange={(value) => handleMetaColorChange(settings, field, value, onChange)}
    />
  );

  return (
    <div className="space-y-6">
      {/* Content Options */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="show-title"
            checked={settings.archive.content.showTitle}
            onCheckedChange={(checked) => handleNested('content', 'showTitle', checked)}
          />
          <Label htmlFor="show-title">Show Post Title</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-excerpt"
            checked={settings.archive.content.showExcerpt}
            onCheckedChange={(checked) => handleNested('content', 'showExcerpt', checked)}
          />
          <Label htmlFor="show-excerpt">Show Excerpt</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-readmore"
            checked={settings.archive.content.showReadMoreButton}
            onCheckedChange={(checked) => handleNested('content', 'showReadMoreButton', checked)}
          />
          <Label htmlFor="show-readmore">Show Read More Button</Label>
        </div>
      </div>

      {/* Excerpt Settings */}
      {settings.archive.content.showExcerpt && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium">Excerpt Settings</h4>

          <div className="space-y-2">
            <Label>Excerpt Source</Label>
            <Select
              value={settings.archive.content.excerptSource}
              onValueChange={(value) => handleNested('content', 'excerptSource', value)}
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
              onChange={(e) => handleNested('content', 'excerptLength', parseInt(e.target.value) || 25)}
            />
          </div>
        </div>
      )}

      {/* Read More Button */}
      {settings.archive.content.showReadMoreButton && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium">Read More Button</h4>

          <div className="space-y-2">
            <Label>Read More Text</Label>
            <Input
              value={settings.archive.content.readMoreText}
              onChange={(e) => handleNested('content', 'readMoreText', e.target.value)}
              placeholder="Read More"
            />
          </div>
        </div>
      )}

      {/* Meta Information Settings */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-medium">Meta Information</h4>

        {/* Meta Position */}
        <div className="space-y-2">
          <Label>Meta Position</Label>
          <Select
            value={settings.archive.meta.position}
            onValueChange={(value) => handleNested('meta', 'position', value)}
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
            onCheckedChange={(checked) => handleNested('meta', 'showIcons', checked)}
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
                  onCheckedChange={(checked) => handleMetaChange(item.id, 'enabled', checked)}
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
                  onChange={(e) => handleMetaChange(item.id, 'order', parseInt(e.target.value) || 1)}
                  className="w-16"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Meta Colors */}
        <div className="grid grid-cols-1 gap-4">
          {renderColorInput('Text Color', settings.archive.meta.colors.text, 'text')}
          {renderColorInput('Link Color', settings.archive.meta.colors.links, 'links')}
          {renderColorInput('Icon Color', settings.archive.meta.colors.icons, 'icons')}
        </div>
      </div>
    </div>
  );
};
