/**
 * CoverSettings Component
 * Configuration panel for Cover Block settings
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Settings,
  Monitor,
  Smartphone,
  Tablet,
  Anchor,
  Tag,
  Layers,
  Maximize2,
  Move,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Mountain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { URLInput } from '@/components/common';
import {
  CoverLayoutSettings,
  TagName,
  AspectRatio,
  ASPECT_RATIO_OPTIONS,
  TAG_NAME_OPTIONS
} from './types';

interface CoverSettingsProps {
  layout: CoverLayoutSettings;
  onLayoutChange: (layout: CoverLayoutSettings) => void;
  tagName?: TagName;
  onTagNameChange?: (tagName: TagName) => void;
  className?: string;
  customClassName?: string;
  onCustomClassNameChange?: (className: string) => void;
  anchorId?: string;
  onAnchorIdChange?: (id: string) => void;
  useFeaturedImage?: boolean;
  onUseFeaturedImageChange?: (use: boolean) => void;
  dynamicBackground?: {
    field?: string;
    fallback?: string;
  };
  onDynamicBackgroundChange?: (config: { field?: string; fallback?: string }) => void;
  isSelected: boolean;
}

const CoverSettings: React.FC<CoverSettingsProps> = ({
  layout,
  onLayoutChange,
  tagName = 'div',
  onTagNameChange,
  className,
  customClassName = '',
  onCustomClassNameChange,
  anchorId = '',
  onAnchorIdChange,
  useFeaturedImage = false,
  onUseFeaturedImageChange,
  dynamicBackground,
  onDynamicBackgroundChange,
  isSelected
}) => {
  const [activeSection, setActiveSection] = useState<string>('layout');
  const [showSettings, setShowSettings] = useState(false);

  // Update layout property
  const updateLayout = (updates: Partial<CoverLayoutSettings>) => {
    onLayoutChange({ ...layout, ...updates });
  };

  // Settings sections
  const settingSections = [
    {
      id: 'layout',
      label: 'Layout & Dimensions',
      icon: Maximize2
    },
    {
      id: 'responsive',
      label: 'Responsive',
      icon: Monitor
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: Settings
    },
    {
      id: 'dynamic',
      label: 'Dynamic Content',
      icon: Layers
    }
  ];

  // Main settings trigger
  const SettingsTrigger = () => {
    if (!isSelected) return null;

    return (
      <div className="absolute bottom-4 left-4 z-30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 backdrop-blur-sm"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
    );
  };

  // Settings panel
  const SettingsPanel = () => {
    if (!showSettings) return null;

    return (
      <div className="absolute bottom-16 left-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 min-w-80 max-w-sm max-h-96 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Cover Block Settings</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 mt-3">
            {settingSections.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeSection === id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveSection(id)}
                className="h-8 px-2 text-xs"
                title={label}
              >
                <Icon className="h-3 w-3" />
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'layout' && <LayoutSettings />}
          {activeSection === 'responsive' && <ResponsiveSettings />}
          {activeSection === 'advanced' && <AdvancedSettings />}
          {activeSection === 'dynamic' && <DynamicSettings />}
        </div>
      </div>
    );
  };

  // Layout & Dimensions settings
  const LayoutSettings = () => (
    <div className="space-y-4">
      {/* Minimum Height */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Minimum Height</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={layout.minHeight}
            onChange={(e) => updateLayout({ minHeight: parseInt(e.target.value) || 400 })}
            className="flex-1"
            min="50"
            max="2000"
          />
          <span className="text-xs text-gray-500">px</span>
        </div>
        <input
          type="range"
          min="200"
          max="1000"
          value={layout.minHeight}
          onChange={(e) => updateLayout({ minHeight: parseInt(e.target.value) })}
          className="w-full mt-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Aspect Ratio */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Aspect Ratio</Label>
        <select
          value={layout.aspectRatio || 'auto'}
          onChange={(e) => updateLayout({ aspectRatio: e.target.value as AspectRatio })}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ASPECT_RATIO_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {layout.aspectRatio === 'custom' && (
          <div className="mt-2">
            <Input
              placeholder="16:9 or 1.777"
              value={layout.customAspectRatio || ''}
              onChange={(e) => updateLayout({ customAspectRatio: e.target.value })}
              className="text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter ratio as width:height (16:9) or decimal (1.777)
            </p>
          </div>
        )}
      </div>

      {/* Parallax Effect */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Parallax Effect</Label>
          <p className="text-xs text-gray-500">Fixed background attachment</p>
        </div>
        <Switch
          checked={layout.hasParallax}
          onCheckedChange={(checked) => updateLayout({ hasParallax: checked })}
        />
      </div>

      {/* Allow Resize */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Allow Resize</Label>
          <p className="text-xs text-gray-500">Enable manual height adjustment</p>
        </div>
        <Switch
          checked={layout.allowResize}
          onCheckedChange={(checked) => updateLayout({ allowResize: checked })}
        />
      </div>

      {/* Vertical Alignment */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Vertical Content Alignment</Label>
        <div className="flex gap-1">
          {[
            { value: 'top', label: 'Top' },
            { value: 'center', label: 'Center' },
            { value: 'bottom', label: 'Bottom' }
          ].map(({ value, label }) => (
            <Button
              key={value}
              variant={layout.verticalAlignment === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateLayout({ verticalAlignment: value as any })}
              className="flex-1 text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  // Responsive settings
  const ResponsiveSettings = () => (
    <div className="space-y-4">
      <div className="text-center py-8 text-gray-500">
        <Monitor className="h-12 w-12 mx-auto mb-2" />
        <p className="text-sm">Responsive settings</p>
        <p className="text-xs">Configure mobile and tablet breakpoints</p>
      </div>

      {/* Mobile Settings */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          <Label className="text-sm font-medium">Mobile (&lt; 768px)</Label>
        </div>

        <div>
          <Label className="text-xs text-gray-600">Min Height</Label>
          <Input
            type="number"
            placeholder={`${layout.minHeight}px (default)`}
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs text-gray-600">Hide on mobile</Label>
          <Switch />
        </div>
      </div>

      {/* Tablet Settings */}
      <div className="space-y-3 border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2">
          <Tablet className="h-4 w-4" />
          <Label className="text-sm font-medium">Tablet (768px - 1024px)</Label>
        </div>

        <div>
          <Label className="text-xs text-gray-600">Min Height</Label>
          <Input
            type="number"
            placeholder={`${layout.minHeight}px (default)`}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );

  // Advanced settings
  const AdvancedSettings = () => (
    <div className="space-y-4">
      {/* HTML Tag */}
      <div>
        <Label className="text-sm font-medium mb-2 block">HTML Tag</Label>
        <select
          value={tagName}
          onChange={(e) => onTagNameChange?.(e.target.value as TagName)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TAG_NAME_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Semantic HTML tag for the cover block
        </p>
      </div>

      {/* Anchor ID */}
      <div>
        <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
          <Anchor className="h-3 w-3" />
          Anchor ID
        </Label>
        <Input
          value={anchorId}
          onChange={(e) => onAnchorIdChange?.(e.target.value)}
          placeholder="my-cover-section"
          className="text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Used for direct linking (#my-cover-section)
        </p>
      </div>

      {/* Custom CSS Classes */}
      <div>
        <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
          <Tag className="h-3 w-3" />
          Additional CSS Classes
        </Label>
        <Input
          value={customClassName}
          onChange={(e) => onCustomClassNameChange?.(e.target.value)}
          placeholder="my-custom-class another-class"
          className="text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Space-separated CSS class names
        </p>
      </div>

      {/* Featured Image */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium flex items-center gap-1">
            <Mountain className="h-3 w-3" />
            Use Featured Image
          </Label>
          <p className="text-xs text-gray-500">Use post's featured image as background</p>
        </div>
        <Switch
          checked={useFeaturedImage}
          onCheckedChange={onUseFeaturedImageChange}
        />
      </div>

      {/* Reset Button */}
      <div className="border-t border-gray-200 pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            updateLayout({
              minHeight: 400,
              aspectRatio: 'auto',
              contentPosition: 'center-center',
              hasParallax: false,
              allowResize: true,
              verticalAlignment: 'center'
            });
            onTagNameChange?.('div');
            onCustomClassNameChange?.('');
            onAnchorIdChange?.('');
            onUseFeaturedImageChange?.(false);
          }}
          className="w-full text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );

  // Dynamic content settings
  const DynamicSettings = () => (
    <div className="space-y-4">
      {/* Featured Image Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Use Featured Image</Label>
          <p className="text-xs text-gray-500">Automatically use post's featured image</p>
        </div>
        <Switch
          checked={useFeaturedImage}
          onCheckedChange={onUseFeaturedImageChange}
        />
      </div>

      {/* ACF Field Binding */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">ACF Background Field</Label>

        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Image Field</Label>
          <select
            value={dynamicBackground?.field || ''}
            onChange={(e) => onDynamicBackgroundChange?.({
              ...dynamicBackground,
              field: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select ACF Image Field</option>
            <option value="hero_background">Hero Background</option>
            <option value="featured_image">Featured Image</option>
            <option value="cover_image">Cover Image</option>
            <option value="banner_image">Banner Image</option>
            <option value="background_image">Background Image</option>
            <option value="header_image">Header Image</option>
          </select>
        </div>

        <div>
          <Label className="text-xs text-gray-600 mb-1 block">Fallback Image URL</Label>
          <URLInput
            value={dynamicBackground?.fallback || ''}
            onChange={(e) => onDynamicBackgroundChange?.({
              ...dynamicBackground,
              fallback: e.target.value
            })}
            placeholder="Enter URL or /path for relative links"
            className="text-sm"
            variant="default"
            showIcon
          />
          <p className="text-xs text-gray-500 mt-1">
            Used when ACF field is empty
          </p>
        </div>

        {(dynamicBackground?.field || dynamicBackground?.fallback) && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs">
            <p className="font-medium text-blue-800 mb-1">Dynamic Background Active</p>
            <p className="text-blue-600">
              Background will be loaded from {dynamicBackground.field ? `ACF field "${dynamicBackground.field}"` : 'fallback URL'}
              {dynamicBackground.field && dynamicBackground.fallback && ' with fallback'}
            </p>
          </div>
        )}
      </div>

      {/* Preview Mode */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Preview Mode</Label>
            <p className="text-xs text-gray-500">Show dynamic content in editor</p>
          </div>
          <Switch defaultChecked />
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn('cover-settings', className)}>
      <SettingsTrigger />
      <SettingsPanel />
    </div>
  );
};

export default CoverSettings;