/**
 * SocialIconsBlock Component
 * 소셜 미디어 아이콘 블록 - 6개 주요 플랫폼 지원
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Settings,
  Layout,
  Palette,
  Link2,
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PLATFORM_INFO, { PlatformType } from './social/PlatformIcons';
import { LayoutSelector } from './social/LayoutSelector';
import { StyleSelector } from './social/StyleSelector';
import { ColorModeSelector } from './social/ColorModeSelector';
import './social/social-icons.css';

interface SocialLink {
  platform: PlatformType;
  url: string;
  enabled: boolean;
}

interface SocialIconsBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    links?: SocialLink[];
    layout?: 'horizontal' | 'vertical' | 'grid';
    style?: 'filled' | 'outlined' | 'rounded';
    colorMode?: 'brand' | 'monochrome' | 'custom';
    customColor?: string;
    size?: number;
    spacing?: number;
    alignment?: 'left' | 'center' | 'right';
    showLabels?: boolean;
    labelPosition?: 'below' | 'beside';
    openInNewTab?: boolean;
    showTooltips?: boolean;
    animationEnabled?: boolean;
    animationType?: 'scale' | 'rotate' | 'bounce';
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
}

const SocialIconsBlock: React.FC<SocialIconsBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
}) => {
  const [showLayoutSettings, setShowLayoutSettings] = useState(false);
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  const [showColorSettings, setShowColorSettings] = useState(false);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Parse attributes with defaults
  const {
    links = [],
    layout = 'horizontal',
    style = 'filled',
    colorMode = 'brand',
    customColor = '#000000',
    size = 32,
    spacing = 12,
    alignment = 'center',
    showLabels = false,
    labelPosition = 'below',
    openInNewTab = true,
    showTooltips = true,
    animationEnabled = true,
    animationType = 'scale'
  } = attributes;

  // Initialize with default platforms if empty
  useEffect(() => {
    if (links.length === 0) {
      const defaultLinks: SocialLink[] = [
        { platform: 'facebook', url: '', enabled: true },
        { platform: 'youtube', url: '', enabled: true },
        { platform: 'instagram', url: '', enabled: true },
        { platform: 'tiktok', url: '', enabled: true },
        { platform: 'naver', url: '', enabled: true },
        { platform: 'kakao', url: '', enabled: true }
      ];
      updateAttributes({ links: defaultLinks });
    }
  }, []);

  // Update attributes helper
  const updateAttributes = (updates: Partial<typeof attributes>) => {
    onChange(content, { ...attributes, ...updates });
  };

  // Add new platform
  const addPlatform = (platform: PlatformType) => {
    const newLink: SocialLink = { platform, url: '', enabled: true };
    const updatedLinks = [...links, newLink];
    updateAttributes({ links: updatedLinks });
  };

  // Remove platform
  const removePlatform = (index: number) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    updateAttributes({ links: updatedLinks });
  };

  // Update link
  const updateLink = (index: number, updates: Partial<SocialLink>) => {
    const updatedLinks = [...links];
    updatedLinks[index] = { ...updatedLinks[index], ...updates };
    updateAttributes({ links: updatedLinks });
  };

  // Toggle platform visibility
  const togglePlatform = (index: number) => {
    updateLink(index, { enabled: !links[index].enabled });
  };

  // Validate URL
  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Empty URLs are ok
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Get icon style
  const getIconStyle = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      width: `${size}px`,
      height: `${size}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      cursor: 'pointer'
    };

    if (style === 'filled') {
      baseStyles.borderRadius = '4px';
    } else if (style === 'outlined') {
      baseStyles.border = '2px solid';
      baseStyles.borderRadius = '4px';
      baseStyles.background = 'transparent';
    } else if (style === 'rounded') {
      baseStyles.borderRadius = '50%';
    }

    return baseStyles;
  };

  // Get icon color
  const getIconColor = (platform: PlatformType, isHovered: boolean = false) => {
    if (colorMode === 'brand') {
      const platformInfo = PLATFORM_INFO[platform];
      return isHovered ? platformInfo.hoverColor : platformInfo.color;
    } else if (colorMode === 'monochrome') {
      return isHovered ? '#666666' : '#999999';
    } else {
      return customColor;
    }
  };

  // Get layout classes
  const getLayoutClasses = () => {
    const baseClasses = ['social-icons-container'];

    if (layout === 'horizontal') {
      baseClasses.push('flex flex-wrap items-center');
    } else if (layout === 'vertical') {
      baseClasses.push('flex flex-col');
    } else if (layout === 'grid') {
      baseClasses.push('grid grid-cols-3');
    }

    if (alignment === 'left') {
      baseClasses.push('justify-start');
    } else if (alignment === 'center') {
      baseClasses.push('justify-center');
    } else if (alignment === 'right') {
      baseClasses.push('justify-end');
    }

    return cn(...baseClasses);
  };

  // Available platforms for adding
  const availablePlatforms = Object.keys(PLATFORM_INFO).filter(
    platform => !links.some(link => link.platform === platform)
  ) as PlatformType[];

  return (
    <>
      {/* Block Content */}
      <EnhancedBlockWrapper
        id={id}
        type="social-icons"
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAddBlock={onAddBlock}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        isDragging={isDragging}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onCopy={onCopy}
        onPaste={onPaste}
        onChangeType={onChangeType}
        currentType="core/social-icons"
        customToolbarContent={
          isSelected ? (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Layout Selector */}
              <div className="flex gap-1">
                {(['horizontal', 'vertical', 'grid'] as const).map((layoutOption) => (
                  <Button
                    key={layoutOption}
                    variant={layout === layoutOption ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateAttributes({ layout: layoutOption })}
                    className="h-7 px-3 text-xs capitalize"
                  >
                    {layoutOption}
                  </Button>
                ))}
              </div>

              <div className="w-px h-4 bg-gray-300" />

              {/* Settings Buttons */}
              <Button
                variant={showLayoutSettings ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowLayoutSettings(!showLayoutSettings)}
              >
                <Layout className="h-3 w-3 mr-1" />
                Layout
              </Button>

              <Button
                variant={showStyleSettings ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowStyleSettings(!showStyleSettings)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Style
              </Button>

              <Button
                variant={showColorSettings ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowColorSettings(!showColorSettings)}
              >
                <Palette className="h-3 w-3 mr-1" />
                Colors
              </Button>

              <Button
                variant={showLinkEditor ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowLinkEditor(!showLinkEditor)}
              >
                <Link2 className="h-3 w-3 mr-1" />
                Links
              </Button>
            </div>
          ) : null
        }
      >
        {/* Social Icons Display */}
        <div
          className={getLayoutClasses()}
          style={{ gap: `${spacing}px` }}
        >
          {links.map((link, index) => {
            if (!link.enabled) return null;

            const platformInfo = PLATFORM_INFO[link.platform];
            const IconComponent = platformInfo.icon;
            const [isHovered, setIsHovered] = useState(false);

            return (
              <div
                key={index}
                className={cn(
                  'social-icon-wrapper',
                  animationEnabled && `animation-${animationType}`
                )}
              >
                <a
                  href={link.url || '#'}
                  target={openInNewTab ? '_blank' : '_self'}
                  rel={openInNewTab ? 'noopener noreferrer' : undefined}
                  title={showTooltips ? platformInfo.name : undefined}
                  className="social-icon-link"
                  onClick={(e) => {
                    if (!link.url || !validateUrl(link.url)) {
                      e.preventDefault();
                    }
                  }}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <div
                    style={{
                      ...getIconStyle(),
                      backgroundColor: style === 'filled' || style === 'rounded' ?
                        getIconColor(link.platform, isHovered) :
                        'transparent',
                      borderColor: style === 'outlined' ?
                        getIconColor(link.platform, isHovered) :
                        undefined
                    }}
                    className="social-icon"
                  >
                    <IconComponent
                      size={size * 0.6}
                      color={style === 'outlined' ?
                        getIconColor(link.platform, isHovered) :
                        (link.platform === 'kakao' && colorMode === 'brand' ?
                          (platformInfo as any).textColor || '#3C1E1E' :
                          '#ffffff')
                      }
                    />
                  </div>
                  {showLabels && (
                    <span
                      className={cn(
                        'social-icon-label text-xs mt-1',
                        labelPosition === 'below' ? 'block text-center' : 'inline ml-2'
                      )}
                    >
                      {platformInfo.name}
                    </span>
                  )}
                </a>
              </div>
            );
          })}
        </div>

        {/* Link Editor Panel */}
        {isSelected && showLinkEditor && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Social Media Links</Label>

              {/* Existing Links */}
              {links.map((link, index) => {
                const platformInfo = PLATFORM_INFO[link.platform];
                const IconComponent = platformInfo.icon;

                return (
                  <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                    <IconComponent size={20} color={platformInfo.color} />
                    <span className="text-sm font-medium w-20">{platformInfo.name}</span>
                    <Input
                      type="url"
                      placeholder={`Enter ${platformInfo.name} URL`}
                      value={link.url}
                      onChange={(e) => updateLink(index, { url: e.target.value })}
                      className="flex-1 h-8 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePlatform(index)}
                      className="h-8 w-8 p-0"
                    >
                      {link.enabled ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlatform(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}

              {/* Add New Platform */}
              {availablePlatforms.length > 0 && (
                <div className="pt-2 border-t">
                  <Label className="text-xs text-gray-600">Add Platform</Label>
                  <div className="flex gap-2 mt-2">
                    {availablePlatforms.map((platform) => {
                      const platformInfo = PLATFORM_INFO[platform];
                      const IconComponent = platformInfo.icon;

                      return (
                        <Button
                          key={platform}
                          variant="outline"
                          size="sm"
                          onClick={() => addPlatform(platform)}
                          className="h-10 px-3"
                          title={`Add ${platformInfo.name}`}
                        >
                          <IconComponent size={16} color={platformInfo.color} />
                          <Plus className="h-3 w-3 ml-1" />
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Layout Settings Panel */}
        {isSelected && showLayoutSettings && (
          <div className="mt-4">
            <LayoutSelector
              layout={layout}
              alignment={alignment}
              spacing={spacing}
              showLabels={showLabels}
              labelPosition={labelPosition}
              onLayoutChange={(newLayout) => updateAttributes({ layout: newLayout })}
              onAlignmentChange={(newAlignment) => updateAttributes({ alignment: newAlignment })}
              onSpacingChange={(newSpacing) => updateAttributes({ spacing: newSpacing })}
              onShowLabelsChange={(show) => updateAttributes({ showLabels: show })}
              onLabelPositionChange={(position) => updateAttributes({ labelPosition: position })}
            />
          </div>
        )}

        {/* Style Settings Panel */}
        {isSelected && showStyleSettings && (
          <div className="mt-4">
            <StyleSelector
              style={style}
              size={size}
              animationEnabled={animationEnabled}
              animationType={animationType}
              showTooltips={showTooltips}
              openInNewTab={openInNewTab}
              onStyleChange={(newStyle) => updateAttributes({ style: newStyle })}
              onSizeChange={(newSize) => updateAttributes({ size: newSize })}
              onAnimationEnabledChange={(enabled) => updateAttributes({ animationEnabled: enabled })}
              onAnimationTypeChange={(type) => updateAttributes({ animationType: type })}
              onShowTooltipsChange={(show) => updateAttributes({ showTooltips: show })}
              onOpenInNewTabChange={(open) => updateAttributes({ openInNewTab: open })}
            />
          </div>
        )}

        {/* Color Settings Panel */}
        {isSelected && showColorSettings && (
          <div className="mt-4">
            <ColorModeSelector
              colorMode={colorMode}
              customColor={customColor}
              onColorModeChange={(mode) => updateAttributes({ colorMode: mode })}
              onCustomColorChange={(color) => updateAttributes({ customColor: color })}
            />
          </div>
        )}
      </EnhancedBlockWrapper>
    </>
  );
};

export default SocialIconsBlock;