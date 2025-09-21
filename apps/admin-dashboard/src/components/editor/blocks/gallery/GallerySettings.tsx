/**
 * Gallery Settings Component
 * 갤러리 블록 설정 패널
 */

import React, { useState } from 'react';
import {
  Grid3X3,
  Columns,
  Sliders,
  Settings,
  Image as ImageIcon,
  Type,
  Palette,
  Zap,
  Eye,
  Link,
  Crop,
  RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import {
  GallerySettingsProps,
  GalleryImage,
  LAYOUT_CONFIGS,
  ASPECT_RATIOS,
  HOVER_EFFECTS,
  IMAGE_FILTERS
} from './types';

const GallerySettings: React.FC<GallerySettingsProps> = ({
  attributes,
  onChange,
  selectedImage,
  onImageUpdate,
  className
}) => {
  const [activeTab, setActiveTab] = useState('layout');

  const {
    layout = 'grid',
    columns = 3,
    gap = 16,
    aspectRatio = 'auto',
    imageCrop = false,
    showCaptions = true,
    captionPosition = 'below',
    enableLightbox = true,
    lightboxAnimation = 'fade',
    borderRadius = 0,
    borderWidth = 0,
    borderColor = '#e5e7eb',
    padding = 0,
    randomOrder = false,
    hoverEffect = 'none',
    imageFilter = 'none',
    responsiveColumns = { mobile: 1, tablet: 2, desktop: 3 }
  } = attributes;

  const updateAttribute = (key: string, value: any) => {
    onChange({ [key]: value });
  };

  const updateImageAttribute = (imageId: string, key: string, value: any) => {
    if (onImageUpdate) {
      onImageUpdate(imageId, { [key]: value });
    }
  };

  const layoutConfig = LAYOUT_CONFIGS[layout];

  return (
    <div className={cn('gallery-settings space-y-6', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="style" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Style
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Layout Settings */}
        <TabsContent value="layout" className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Layout Type
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(LAYOUT_CONFIGS).map(([key, config]) => (
                <Button
                  key={key}
                  variant={layout === key ? 'default' : 'outline'}
                  className="h-auto p-3 flex flex-col items-center gap-2"
                  onClick={() => updateAttribute('layout', key)}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {key === 'grid' && <Grid3X3 className="w-4 h-4" />}
                    {key === 'masonry' && <Columns className="w-4 h-4" />}
                    {key === 'slider' && <Sliders className="w-4 h-4" />}
                  </div>
                  <div className="text-xs text-center">
                    <div className="font-medium">{config.label}</div>
                    <div className="text-muted-foreground">{config.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Columns */}
          {layoutConfig.supportsColumns && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Columns ({columns})
              </Label>
              <Slider
                min={layoutConfig.minColumns}
                max={layoutConfig.maxColumns}
                step={1}
                value={[columns]}
                onValueChange={([value]) => updateAttribute('columns', value)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{layoutConfig.minColumns}</span>
                <span>{layoutConfig.maxColumns}</span>
              </div>
            </div>
          )}

          {/* Gap */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Gap ({gap}px)
            </Label>
            <Slider
              min={0}
              max={50}
              step={2}
              value={[gap]}
              onValueChange={([value]) => updateAttribute('gap', value)}
              className="w-full"
            />
          </div>

          {/* Aspect Ratio */}
          {layoutConfig.supportsAspectRatio && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={(value) => updateAttribute('aspectRatio', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIOS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Responsive Columns */}
          <Accordion type="single" collapsible>
            <AccordionItem value="responsive">
              <AccordionTrigger className="text-sm">Responsive Settings</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Mobile</Label>
                    <Input
                      type="number"
                      min="1"
                      max="3"
                      value={responsiveColumns.mobile}
                      onChange={(e) => updateAttribute('responsiveColumns', {
                        ...responsiveColumns,
                        mobile: parseInt(e.target.value) || 1
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tablet</Label>
                    <Input
                      type="number"
                      min="1"
                      max="4"
                      value={responsiveColumns.tablet}
                      onChange={(e) => updateAttribute('responsiveColumns', {
                        ...responsiveColumns,
                        tablet: parseInt(e.target.value) || 2
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Desktop</Label>
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      value={responsiveColumns.desktop}
                      onChange={(e) => updateAttribute('responsiveColumns', {
                        ...responsiveColumns,
                        desktop: parseInt(e.target.value) || 3
                      })}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Image Settings */}
        <TabsContent value="images" className="space-y-6">
          {/* Image Crop */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Crop className="w-4 h-4" />
              Crop Images
            </Label>
            <Switch
              checked={imageCrop}
              onCheckedChange={(checked) => updateAttribute('imageCrop', checked)}
            />
          </div>

          {/* Captions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Type className="w-4 h-4" />
                Show Captions
              </Label>
              <Switch
                checked={showCaptions}
                onCheckedChange={(checked) => updateAttribute('showCaptions', checked)}
              />
            </div>

            {showCaptions && (
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Caption Position</Label>
                <Select value={captionPosition} onValueChange={(value) => updateAttribute('captionPosition', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="below">Below Image</SelectItem>
                    <SelectItem value="overlay">Overlay</SelectItem>
                    <SelectItem value="hover">On Hover</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Lightbox */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Enable Lightbox
              </Label>
              <Switch
                checked={enableLightbox}
                onCheckedChange={(checked) => updateAttribute('enableLightbox', checked)}
              />
            </div>

            {enableLightbox && (
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">Animation</Label>
                <Select value={lightboxAnimation} onValueChange={(value) => updateAttribute('lightboxAnimation', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Link Settings */}
          <div>
            <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Link className="w-4 h-4" />
              Link Images To
            </Label>
            <Select value={attributes.linkTo || 'none'} onValueChange={(value) => updateAttribute('linkTo', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="media">Media File</SelectItem>
                <SelectItem value="attachment">Attachment Page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Image Settings */}
          {selectedImage && (
            <Accordion type="single" collapsible>
              <AccordionItem value="selected-image">
                <AccordionTrigger className="text-sm">Selected Image Settings</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Alt Text</Label>
                    <Input
                      value={selectedImage.alt}
                      onChange={(e) => updateImageAttribute(selectedImage.id, 'alt', e.target.value)}
                      placeholder="Describe this image..."
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Caption</Label>
                    <Textarea
                      value={selectedImage.caption || ''}
                      onChange={(e) => updateImageAttribute(selectedImage.id, 'caption', e.target.value)}
                      placeholder="Add a caption..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground mb-1 block">Title</Label>
                    <Input
                      value={selectedImage.title}
                      onChange={(e) => updateImageAttribute(selectedImage.id, 'title', e.target.value)}
                      placeholder="Image title..."
                    />
                  </div>

                  {/* Image Filters */}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Filters</Label>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Brightness (%)</Label>
                        <Slider
                          min={0}
                          max={200}
                          step={10}
                          value={[selectedImage.filters?.brightness || 100]}
                          onValueChange={([value]) => updateImageAttribute(selectedImage.id, 'filters', {
                            ...selectedImage.filters,
                            brightness: value
                          })}
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Contrast (%)</Label>
                        <Slider
                          min={0}
                          max={200}
                          step={10}
                          value={[selectedImage.filters?.contrast || 100]}
                          onValueChange={([value]) => updateImageAttribute(selectedImage.id, 'filters', {
                            ...selectedImage.filters,
                            contrast: value
                          })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Grayscale</Label>
                        <Switch
                          checked={selectedImage.filters?.grayscale || false}
                          onCheckedChange={(checked) => updateImageAttribute(selectedImage.id, 'filters', {
                            ...selectedImage.filters,
                            grayscale: checked
                          })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Sepia</Label>
                        <Switch
                          checked={selectedImage.filters?.sepia || false}
                          onCheckedChange={(checked) => updateImageAttribute(selectedImage.id, 'filters', {
                            ...selectedImage.filters,
                            sepia: checked
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                      <RotateCw className="w-4 h-4" />
                      Rotation
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateImageAttribute(selectedImage.id, 'rotation', ((selectedImage.rotation || 0) - 90) % 360)}
                      >
                        -90°
                      </Button>
                      <div className="flex-1 text-center text-sm">
                        {selectedImage.rotation || 0}°
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateImageAttribute(selectedImage.id, 'rotation', ((selectedImage.rotation || 0) + 90) % 360)}
                      >
                        +90°
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </TabsContent>

        {/* Style Settings */}
        <TabsContent value="style" className="space-y-6">
          {/* Hover Effect */}
          <div>
            <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Hover Effect
            </Label>
            <Select value={hoverEffect} onValueChange={(value) => updateAttribute('hoverEffect', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOVER_EFFECTS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Filter */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Global Image Filter</Label>
            <Select value={imageFilter} onValueChange={(value) => updateAttribute('imageFilter', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_FILTERS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Border Radius */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Border Radius ({borderRadius}px)
            </Label>
            <Slider
              min={0}
              max={30}
              step={2}
              value={[borderRadius]}
              onValueChange={([value]) => updateAttribute('borderRadius', value)}
              className="w-full"
            />
          </div>

          {/* Border */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Border</Label>
              <Switch
                checked={borderWidth > 0}
                onCheckedChange={(checked) => updateAttribute('borderWidth', checked ? 1 : 0)}
              />
            </div>

            {borderWidth > 0 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Width ({borderWidth}px)</Label>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[borderWidth]}
                    onValueChange={([value]) => updateAttribute('borderWidth', value)}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => updateAttribute('borderColor', e.target.value)}
                      className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <Input
                      value={borderColor}
                      onChange={(e) => updateAttribute('borderColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Padding */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Padding ({padding}px)
            </Label>
            <Slider
              min={0}
              max={50}
              step={2}
              value={[padding]}
              onValueChange={([value]) => updateAttribute('padding', value)}
              className="w-full"
            />
          </div>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          {/* Random Order */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Random Order</Label>
            <Switch
              checked={randomOrder}
              onCheckedChange={(checked) => updateAttribute('randomOrder', checked)}
            />
          </div>

          {/* CSS Class */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Custom CSS Class</Label>
            <Input
              value={attributes.className || ''}
              onChange={(e) => updateAttribute('className', e.target.value)}
              placeholder="custom-gallery-class"
            />
          </div>

          {/* Anchor */}
          <div>
            <Label className="text-sm font-medium mb-2 block">HTML Anchor</Label>
            <Input
              value={attributes.anchor || ''}
              onChange={(e) => updateAttribute('anchor', e.target.value)}
              placeholder="gallery-anchor"
            />
          </div>

          {/* Alignment */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Alignment</Label>
            <Select value={attributes.align || 'center'} onValueChange={(value) => updateAttribute('align', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
                <SelectItem value="wide">Wide</SelectItem>
                <SelectItem value="full">Full Width</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GallerySettings;