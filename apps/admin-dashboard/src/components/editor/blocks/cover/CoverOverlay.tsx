/**
 * CoverOverlay Component
 * Advanced overlay engine with color, gradient, duotone filters, and blend modes
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Palette,
  Layers,
  Eye,
  EyeOff,
  Sliders,
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  CoverOverlaySettings,
  DuotoneFilter,
  GradientValue,
  BlendMode,
  COMMON_GRADIENTS,
  COMMON_DUOTONES,
  BLEND_MODE_OPTIONS
} from './types';

interface CoverOverlayProps {
  overlay: CoverOverlaySettings;
  onOverlayChange: (overlay: CoverOverlaySettings) => void;
  isSelected: boolean;
  backgroundType: 'image' | 'video' | 'color' | 'gradient';
  className?: string;
}

const CoverOverlay: React.FC<CoverOverlayProps> = ({
  overlay,
  onOverlayChange,
  isSelected,
  backgroundType,
  className
}) => {
  const [showOverlayControls, setShowOverlayControls] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [showDuotonePicker, setShowDuotonePicker] = useState(false);
  const [overlayType, setOverlayType] = useState<'color' | 'gradient'>('color');

  // Update overlay properties
  const updateOverlay = (updates: Partial<CoverOverlaySettings>) => {
    onOverlayChange({ ...overlay, ...updates });
  };

  // Generate duotone filter CSS
  const generateDuotoneFilter = (duotone: DuotoneFilter): string => {
    const [shadow, highlight] = duotone.colors;

    // Convert hex colors to RGB values
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const shadowRgb = hexToRgb(shadow);
    const highlightRgb = hexToRgb(highlight);

    return `
      <filter id="duotone-${duotone.slug}">
        <feColorMatrix type="matrix" values="
          0.299 0.587 0.114 0 0
          0.299 0.587 0.114 0 0
          0.299 0.587 0.114 0 0
          0 0 0 1 0
        "/>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="${shadowRgb.r/255} ${highlightRgb.r/255}"/>
          <feFuncG type="table" tableValues="${shadowRgb.g/255} ${highlightRgb.g/255}"/>
          <feFuncB type="table" tableValues="${shadowRgb.b/255} ${highlightRgb.b/255}"/>
        </feComponentTransfer>
      </filter>
    `;
  };

  // Get overlay styles
  const getOverlayStyles = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      inset: 0,
      zIndex: 10,
      pointerEvents: 'none'
    };

    // Apply opacity
    if (overlay.opacity === 0) {
      return { ...baseStyle, display: 'none' };
    }

    const opacity = overlay.opacity / 100;

    // Apply background
    let background = '';
    if (overlay.color) {
      background = overlay.color;
    } else if (overlay.gradient) {
      background = typeof overlay.gradient === 'string'
        ? overlay.gradient
        : overlay.gradient.gradient;
    }

    const style: React.CSSProperties = {
      ...baseStyle,
      background,
      opacity,
      mixBlendMode: overlay.blendMode || 'normal'
    };

    // Apply duotone filter
    if (overlay.duotone && (backgroundType === 'image' || backgroundType === 'video')) {
      style.filter = `url(#duotone-${overlay.duotone.slug})`;
    }

    return style;
  };

  // Overlay controls
  const OverlayControls = () => {
    if (!isSelected) return null;

    return (
      <div className="absolute top-20 left-4 z-30">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOverlayControls(!showOverlayControls)}
            className="flex items-center gap-2 h-10 px-3 rounded-lg"
          >
            <Layers className="h-4 w-4" />
            Overlay
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              showOverlayControls && "rotate-180"
            )} />
          </Button>

          {showOverlayControls && (
            <div className="p-4 border-t border-gray-200 min-w-80">
              {/* Opacity Control */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Opacity</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">{overlay.opacity}%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateOverlay({ opacity: overlay.opacity > 0 ? 0 : 50 })}
                        className="h-6 w-6 p-0"
                      >
                        {overlay.opacity > 0 ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={overlay.opacity}
                    onChange={(e) => updateOverlay({ opacity: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Overlay Type Toggle */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Overlay Type</Label>
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                    <Button
                      variant={overlayType === 'color' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setOverlayType('color');
                        updateOverlay({ gradient: undefined });
                      }}
                      className="flex-1 h-8 text-xs"
                    >
                      <Palette className="h-3 w-3 mr-1" />
                      Color
                    </Button>
                    <Button
                      variant={overlayType === 'gradient' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setOverlayType('gradient');
                        updateOverlay({ color: undefined });
                      }}
                      className="flex-1 h-8 text-xs"
                    >
                      <Layers className="h-3 w-3 mr-1" />
                      Gradient
                    </Button>
                  </div>
                </div>

                {/* Color/Gradient Selection */}
                <div className="space-y-2">
                  {overlayType === 'color' ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-full h-10 border border-gray-300 rounded cursor-pointer flex items-center px-3"
                          onClick={() => setShowColorPicker(!showColorPicker)}
                        >
                          <div
                            className="w-6 h-6 rounded border border-gray-300 mr-2"
                            style={{ backgroundColor: overlay.color || '#000000' }}
                          />
                          <span className="text-sm">{overlay.color || '#000000'}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateOverlay({ color: '#000000' })}
                          className="h-10 px-3"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-full h-10 border border-gray-300 rounded cursor-pointer flex items-center px-3"
                          onClick={() => setShowGradientPicker(!showGradientPicker)}
                          style={{
                            background: overlay.gradient
                              ? typeof overlay.gradient === 'string'
                                ? overlay.gradient
                                : overlay.gradient.gradient
                              : 'linear-gradient(135deg, #000000 0%, #ffffff 100%)'
                          }}
                        >
                          <span className="text-sm text-white drop-shadow">
                            {overlay.gradient
                              ? typeof overlay.gradient === 'object' && overlay.gradient.name
                                ? overlay.gradient.name
                                : 'Custom Gradient'
                              : 'Select Gradient'
                            }
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateOverlay({
                            gradient: 'linear-gradient(135deg, #000000 0%, #ffffff 100%)'
                          })}
                          className="h-10 px-3"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Blend Mode */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Blend Mode</Label>
                  <select
                    value={overlay.blendMode || 'normal'}
                    onChange={(e) => updateOverlay({ blendMode: e.target.value as BlendMode })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {BLEND_MODE_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duotone Filter (for images/videos) */}
                {(backgroundType === 'image' || backgroundType === 'video') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Duotone Filter</Label>
                      {overlay.duotone && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateOverlay({ duotone: undefined })}
                          className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div
                      className="w-full p-3 border border-gray-300 rounded cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                      onClick={() => setShowDuotonePicker(!showDuotonePicker)}
                    >
                      {overlay.duotone ? (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div
                              className="w-4 h-4 rounded border border-gray-300"
                              style={{ backgroundColor: overlay.duotone.colors[0] }}
                            />
                            <div
                              className="w-4 h-4 rounded border border-gray-300"
                              style={{ backgroundColor: overlay.duotone.colors[1] }}
                            />
                          </div>
                          <span className="text-sm">{overlay.duotone.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">No duotone filter</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Reset All */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateOverlay({
                    color: undefined,
                    gradient: undefined,
                    opacity: 0,
                    blendMode: 'normal',
                    duotone: undefined
                  })}
                  className="w-full h-8 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Overlay
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Color picker popup
  const ColorPickerPopup = () => {
    if (!showColorPicker) return null;

    return (
      <div className="absolute top-full left-0 mt-2 z-40 bg-white rounded-lg shadow-lg p-4 min-w-64">
        <h3 className="text-sm font-medium mb-3">Overlay Color</h3>

        <div className="space-y-3">
          <div>
            <input
              type="color"
              value={overlay.color || '#000000'}
              onChange={(e) => updateOverlay({ color: e.target.value })}
              className="w-full h-10 border border-gray-300 rounded cursor-pointer"
            />
          </div>

          <div>
            <input
              type="text"
              value={overlay.color || '#000000'}
              onChange={(e) => updateOverlay({ color: e.target.value })}
              placeholder="#000000"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color presets */}
          <div>
            <p className="text-xs text-gray-600 mb-2">Color Presets</p>
            <div className="grid grid-cols-6 gap-2">
              {[
                '#000000', '#ffffff', '#1f2937', '#374151',
                '#ef4444', '#f97316', '#eab308', '#22c55e',
                '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => updateOverlay({ color })}
                  className={cn(
                    "w-8 h-8 rounded border-2 transition-transform hover:scale-110",
                    overlay.color === color ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColorPicker(false)}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Gradient picker popup
  const GradientPickerPopup = () => {
    if (!showGradientPicker) return null;

    return (
      <div className="absolute top-full left-0 mt-2 z-40 bg-white rounded-lg shadow-lg p-4 min-w-80">
        <h3 className="text-sm font-medium mb-3">Overlay Gradient</h3>

        <div className="space-y-4">
          {/* Custom gradient input */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">Custom CSS Gradient</label>
            <textarea
              value={typeof overlay.gradient === 'string' ? overlay.gradient : overlay.gradient?.gradient || ''}
              onChange={(e) => updateOverlay({ gradient: e.target.value })}
              placeholder="linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0.5) 100%)"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
            />
          </div>

          {/* Gradient presets */}
          <div>
            <p className="text-xs text-gray-600 mb-2">Gradient Presets</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {COMMON_GRADIENTS.map((gradientPreset) => (
                <button
                  key={gradientPreset.slug}
                  onClick={() => updateOverlay({ gradient: gradientPreset })}
                  className={cn(
                    "relative h-12 rounded border-2 transition-transform hover:scale-105 overflow-hidden",
                    (typeof overlay.gradient === 'object' && overlay.gradient?.slug === gradientPreset.slug) ||
                    (typeof overlay.gradient === 'string' && overlay.gradient === gradientPreset.gradient)
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-300"
                  )}
                  style={{ background: gradientPreset.gradient }}
                  title={gradientPreset.name}
                >
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGradientPicker(false)}
            className="w-full"
          >
            Done
          </Button>
        </div>
      </div>
    );
  };

  // Duotone picker popup
  const DuotonePickerPopup = () => {
    if (!showDuotonePicker) return null;

    return (
      <div className="absolute top-full left-0 mt-2 z-40 bg-white rounded-lg shadow-lg p-4 min-w-80">
        <h3 className="text-sm font-medium mb-3">Duotone Filter</h3>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {COMMON_DUOTONES.map((duotone) => (
              <button
                key={duotone.slug}
                onClick={() => updateOverlay({ duotone })}
                className={cn(
                  "flex items-center gap-3 p-3 rounded border-2 transition-all hover:bg-gray-50",
                  overlay.duotone?.slug === duotone.slug
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200"
                )}
              >
                <div className="flex gap-1">
                  <div
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: duotone.colors[0] }}
                  />
                  <div
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: duotone.colors[1] }}
                  />
                </div>
                <span className="text-sm font-medium">{duotone.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateOverlay({ duotone: undefined })}
              className="flex-1"
            >
              Remove
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDuotonePicker(false)}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // SVG filters for duotone
  const DuotoneFilters = () => {
    if (!overlay.duotone) return null;

    return (
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <g dangerouslySetInnerHTML={{ __html: generateDuotoneFilter(overlay.duotone) }} />
        </defs>
      </svg>
    );
  };

  return (
    <div className={cn('cover-overlay relative', className)}>
      {/* Overlay layer */}
      <div style={getOverlayStyles()} />

      {/* SVG filters */}
      <DuotoneFilters />

      {/* Controls */}
      <div className="relative">
        <OverlayControls />
        <ColorPickerPopup />
        <GradientPickerPopup />
        <DuotonePickerPopup />
      </div>
    </div>
  );
};

export default CoverOverlay;