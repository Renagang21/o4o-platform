/**
 * GradientEditor Component
 * 그라디언트 배경 편집기 - 선형/원형 그라디언트 지원
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Palette,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  RotateCw
} from 'lucide-react';

interface GradientStop {
  color: string;
  position: number; // 0-100
}

interface GradientSettings {
  type: 'linear' | 'radial';
  angle: number; // 0-360 for linear
  stops: GradientStop[];
  shape?: 'circle' | 'ellipse'; // for radial
  position?: string; // for radial position
}

interface GradientEditorProps {
  currentGradient?: GradientSettings;
  isEnabled: boolean;
  onGradientChange: (gradient: GradientSettings | null) => void;
  onToggleGradient: (enabled: boolean) => void;
}

// 10가지 기본 그라디언트 프리셋
const GRADIENT_PRESETS: GradientSettings[] = [
  {
    type: 'linear',
    angle: 45,
    stops: [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ]
  },
  {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#f093fb', position: 0 },
      { color: '#f5576c', position: 100 }
    ]
  },
  {
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#4facfe', position: 0 },
      { color: '#00f2fe', position: 100 }
    ]
  },
  {
    type: 'linear',
    angle: 45,
    stops: [
      { color: '#43e97b', position: 0 },
      { color: '#38f9d7', position: 100 }
    ]
  },
  {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#fa709a', position: 0 },
      { color: '#fee140', position: 100 }
    ]
  },
  {
    type: 'radial',
    angle: 0,
    shape: 'circle',
    position: 'center',
    stops: [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ]
  },
  {
    type: 'linear',
    angle: 45,
    stops: [
      { color: '#ff9a9e', position: 0 },
      { color: '#fecfef', position: 50 },
      { color: '#fecfef', position: 100 }
    ]
  },
  {
    type: 'linear',
    angle: 90,
    stops: [
      { color: '#a8edea', position: 0 },
      { color: '#fed6e3', position: 100 }
    ]
  },
  {
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#d299c2', position: 0 },
      { color: '#fef9d7', position: 100 }
    ]
  },
  {
    type: 'radial',
    angle: 0,
    shape: 'ellipse',
    position: 'center',
    stops: [
      { color: '#89f7fe', position: 0 },
      { color: '#66a6ff', position: 100 }
    ]
  }
];

export const GradientEditor: React.FC<GradientEditorProps> = ({
  currentGradient,
  isEnabled,
  onGradientChange,
  onToggleGradient,
}) => {
  const [showPresets, setShowPresets] = useState(true);
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Default gradient
  const defaultGradient: GradientSettings = {
    type: 'linear',
    angle: 45,
    stops: [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ]
  };

  const gradient = currentGradient || defaultGradient;

  // Generate CSS gradient string
  const generateGradientCSS = (grad: GradientSettings): string => {
    const stopsString = grad.stops
      .sort((a, b) => a.position - b.position)
      .map(stop => `${stop.color} ${stop.position}%`)
      .join(', ');

    if (grad.type === 'linear') {
      return `linear-gradient(${grad.angle}deg, ${stopsString})`;
    } else {
      const shape = grad.shape || 'circle';
      const position = grad.position || 'center';
      return `radial-gradient(${shape} at ${position}, ${stopsString})`;
    }
  };

  // Update gradient attribute
  const updateGradient = (updates: Partial<GradientSettings>) => {
    const newGradient = { ...gradient, ...updates };
    onGradientChange(newGradient);
  };

  // Add color stop
  const addColorStop = () => {
    const newPosition = gradient.stops.length > 0
      ? Math.min(100, Math.max(...gradient.stops.map(s => s.position)) + 25)
      : 50;

    const newStop: GradientStop = {
      color: '#000000',
      position: newPosition
    };

    updateGradient({
      stops: [...gradient.stops, newStop].sort((a, b) => a.position - b.position)
    });
  };

  // Remove color stop
  const removeColorStop = (index: number) => {
    if (gradient.stops.length <= 2) return; // Keep at least 2 stops

    const newStops = gradient.stops.filter((_, i) => i !== index);
    updateGradient({ stops: newStops });
  };

  // Update color stop
  const updateColorStop = (index: number, updates: Partial<GradientStop>) => {
    const newStops = gradient.stops.map((stop, i) =>
      i === index ? { ...stop, ...updates } : stop
    );
    updateGradient({ stops: newStops.sort((a, b) => a.position - b.position) });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          <Label className="text-sm font-medium">Gradient Background</Label>
        </div>
        <Button
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleGradient(!isEnabled)}
          className="h-8 px-3 text-xs"
        >
          {isEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {isEnabled && (
        <>
          {/* Current Gradient Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Preview</Label>
            <div
              className="h-12 w-full rounded border"
              style={{ background: generateGradientCSS(gradient) }}
            />
            <p className="text-xs text-gray-500 font-mono break-all">
              {generateGradientCSS(gradient)}
            </p>
          </div>

          {/* Gradient Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Type</Label>
            <div className="flex gap-2">
              <Button
                variant={gradient.type === 'linear' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateGradient({ type: 'linear' })}
                className="flex-1 text-xs"
              >
                Linear
              </Button>
              <Button
                variant={gradient.type === 'radial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateGradient({ type: 'radial' })}
                className="flex-1 text-xs"
              >
                Radial
              </Button>
            </div>
          </div>

          {/* Direction/Angle Control */}
          {gradient.type === 'linear' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">
                Angle: {gradient.angle}°
              </Label>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={gradient.angle}
                  onChange={(e) => updateGradient({ angle: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateGradient({ angle: (gradient.angle + 45) % 360 })}
                  className="h-8 w-8 p-0"
                >
                  <RotateCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Radial Settings */}
          {gradient.type === 'radial' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Shape & Position</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={gradient.shape === 'circle' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateGradient({ shape: 'circle' })}
                  className="text-xs"
                >
                  Circle
                </Button>
                <Button
                  variant={gradient.shape === 'ellipse' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateGradient({ shape: 'ellipse' })}
                  className="text-xs"
                >
                  Ellipse
                </Button>
              </div>
            </div>
          )}

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
              <div className="grid grid-cols-5 gap-2">
                {GRADIENT_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    className="h-8 w-full rounded border hover:ring-2 hover:ring-blue-300 transition-all"
                    style={{ background: generateGradientCSS(preset) }}
                    onClick={() => onGradientChange(preset)}
                    title={`Preset ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Custom Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-700">Custom Editor</Label>
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
                {/* Color Stops */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Color Stops</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addColorStop}
                      disabled={gradient.stops.length >= 4}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {gradient.stops.map((stop, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={stop.color}
                        onChange={(e) => updateColorStop(index, { color: e.target.value })}
                        className="w-8 h-6 rounded border cursor-pointer"
                      />
                      <Input
                        type="range"
                        min="0"
                        max="100"
                        value={stop.position}
                        onChange={(e) => updateColorStop(index, { position: parseInt(e.target.value) })}
                        className="flex-1 h-6"
                      />
                      <span className="text-xs w-8 text-center">
                        {stop.position}%
                      </span>
                      {gradient.stops.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeColorStop(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGradientChange(defaultGradient)}
                  className="w-full text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset to Default
                </Button>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
            <p><strong>Tip:</strong> Gradients enhance button visual appeal</p>
            <p><strong>Linear:</strong> Directional color flow</p>
            <p><strong>Radial:</strong> Circular color spread</p>
          </div>
        </>
      )}
    </div>
  );
};

export default GradientEditor;