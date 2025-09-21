/**
 * ShadowEditor Component
 * 그림자 효과 편집기 - Box Shadow 커스터마이징
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon
} from 'lucide-react';

interface ShadowSettings {
  enabled: boolean;
  horizontal: number; // X offset
  vertical: number;   // Y offset
  blur: number;       // Blur radius
  spread: number;     // Spread radius
  color: string;      // Shadow color
  opacity: number;    // 0-100
  inset: boolean;     // Inner shadow
}

interface ShadowEditorProps {
  currentShadow?: ShadowSettings;
  onShadowChange: (shadow: ShadowSettings) => void;
}

// 8가지 그림자 프리셋
const SHADOW_PRESETS: ShadowSettings[] = [
  {
    enabled: true,
    horizontal: 0,
    vertical: 2,
    blur: 4,
    spread: 0,
    color: '#000000',
    opacity: 25,
    inset: false
  },
  {
    enabled: true,
    horizontal: 0,
    vertical: 4,
    blur: 8,
    spread: 0,
    color: '#000000',
    opacity: 15,
    inset: false
  },
  {
    enabled: true,
    horizontal: 0,
    vertical: 8,
    blur: 16,
    spread: 0,
    color: '#000000',
    opacity: 10,
    inset: false
  },
  {
    enabled: true,
    horizontal: 2,
    vertical: 2,
    blur: 8,
    spread: 0,
    color: '#000000',
    opacity: 20,
    inset: false
  },
  {
    enabled: true,
    horizontal: 0,
    vertical: 0,
    blur: 0,
    spread: 1,
    color: '#007cba',
    opacity: 50,
    inset: false
  },
  {
    enabled: true,
    horizontal: 0,
    vertical: 0,
    blur: 10,
    spread: 0,
    color: '#007cba',
    opacity: 30,
    inset: false
  },
  {
    enabled: true,
    horizontal: 2,
    vertical: 2,
    blur: 4,
    spread: 0,
    color: '#000000',
    opacity: 15,
    inset: true
  },
  {
    enabled: true,
    horizontal: 0,
    vertical: -2,
    blur: 8,
    spread: -2,
    color: '#ffffff',
    opacity: 80,
    inset: false
  }
];

export const ShadowEditor: React.FC<ShadowEditorProps> = ({
  currentShadow,
  onShadowChange,
}) => {
  const [showPresets, setShowPresets] = useState(true);
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Default shadow
  const defaultShadow: ShadowSettings = {
    enabled: false,
    horizontal: 0,
    vertical: 2,
    blur: 4,
    spread: 0,
    color: '#000000',
    opacity: 25,
    inset: false
  };

  const shadow = currentShadow || defaultShadow;

  // Generate CSS box-shadow string
  const generateShadowCSS = (shadowSettings: ShadowSettings): string => {
    if (!shadowSettings.enabled) return 'none';

    const { horizontal, vertical, blur, spread, color, opacity, inset } = shadowSettings;

    // Convert color to rgba with opacity
    const hexToRgba = (hex: string, alpha: number): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
    };

    const shadowColor = hexToRgba(color, opacity);
    const insetKeyword = inset ? 'inset ' : '';

    return `${insetKeyword}${horizontal}px ${vertical}px ${blur}px ${spread}px ${shadowColor}`;
  };

  // Update shadow
  const updateShadow = (updates: Partial<ShadowSettings>) => {
    const newShadow = { ...shadow, ...updates };
    onShadowChange(newShadow);
  };

  // Toggle shadow
  const toggleShadow = () => {
    updateShadow({ enabled: !shadow.enabled });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <Label className="text-sm font-medium">Box Shadow</Label>
        </div>
        <Button
          variant={shadow.enabled ? "default" : "outline"}
          size="sm"
          onClick={toggleShadow}
          className="h-8 px-3 text-xs"
        >
          {shadow.enabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {shadow.enabled && (
        <>
          {/* Shadow Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Preview</Label>
            <div className="p-4 bg-white rounded border">
              <div
                className="h-12 w-24 bg-blue-500 rounded mx-auto"
                style={{ boxShadow: generateShadowCSS(shadow) }}
              />
            </div>
            <p className="text-xs text-gray-500 font-mono break-all">
              box-shadow: {generateShadowCSS(shadow)}
            </p>
          </div>

          {/* Quick Controls */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Quick Settings</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={shadow.inset ? "outline" : "default"}
                size="sm"
                onClick={() => updateShadow({ inset: false })}
                className="text-xs"
              >
                <Sun className="h-3 w-3 mr-1" />
                Outer
              </Button>
              <Button
                variant={shadow.inset ? "default" : "outline"}
                size="sm"
                onClick={() => updateShadow({ inset: true })}
                className="text-xs"
              >
                <Moon className="h-3 w-3 mr-1" />
                Inner
              </Button>
            </div>
          </div>

          {/* Position & Size Controls */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-gray-700">Position & Size</Label>

            {/* Horizontal */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Horizontal: {shadow.horizontal}px</span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                value={shadow.horizontal}
                onChange={(e) => updateShadow({ horizontal: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Vertical */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Vertical: {shadow.vertical}px</span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                value={shadow.vertical}
                onChange={(e) => updateShadow({ vertical: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Blur */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Blur: {shadow.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={shadow.blur}
                onChange={(e) => updateShadow({ blur: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Spread */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Spread: {shadow.spread}px</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                value={shadow.spread}
                onChange={(e) => updateShadow({ spread: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          {/* Color & Opacity */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Color & Opacity</Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={shadow.color}
                onChange={(e) => updateShadow({ color: e.target.value })}
                className="w-12 h-8 rounded border cursor-pointer"
              />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Opacity: {shadow.opacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={shadow.opacity}
                  onChange={(e) => updateShadow({ opacity: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-700">Presets</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPresets(!showPresets)}
                className="h-6 w-6 p-0"
              >
                {showPresets ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>

            {showPresets && (
              <div className="grid grid-cols-4 gap-2">
                {SHADOW_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    className="h-12 w-full bg-white rounded border hover:ring-2 hover:ring-blue-300 transition-all relative overflow-hidden"
                    onClick={() => onShadowChange(preset)}
                    title={`Shadow Preset ${index + 1}`}
                  >
                    <div
                      className="absolute inset-2 bg-blue-400 rounded"
                      style={{ boxShadow: generateShadowCSS(preset) }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-700">Advanced</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomEditor(!showCustomEditor)}
                className="h-6 w-6 p-0"
              >
                {showCustomEditor ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>

            {showCustomEditor && (
              <div className="space-y-3 p-3 bg-white rounded border">
                {/* Manual Input */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X Offset</Label>
                    <Input
                      type="number"
                      value={shadow.horizontal}
                      onChange={(e) => updateShadow({ horizontal: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Y Offset</Label>
                    <Input
                      type="number"
                      value={shadow.vertical}
                      onChange={(e) => updateShadow({ vertical: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Blur</Label>
                    <Input
                      type="number"
                      value={shadow.blur}
                      onChange={(e) => updateShadow({ blur: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Spread</Label>
                    <Input
                      type="number"
                      value={shadow.spread}
                      onChange={(e) => updateShadow({ spread: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShadowChange(defaultShadow)}
                  className="w-full text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset Shadow
                </Button>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
            <p><strong>Tip:</strong> Subtle shadows enhance button depth</p>
            <p><strong>Outer:</strong> Creates drop shadow effect</p>
            <p><strong>Inner:</strong> Creates pressed/inset effect</p>
          </div>
        </>
      )}
    </div>
  );
};

export default ShadowEditor;