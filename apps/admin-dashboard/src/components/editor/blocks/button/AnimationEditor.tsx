/**
 * AnimationEditor Component
 * 호버 애니메이션 효과 편집기 - CSS Transform & Transition
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Zap,
  Play,
  RotateCw,
  Move,
  MousePointer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Maximize,
  Minimize
} from 'lucide-react';

interface AnimationSettings {
  enabled: boolean;
  type: 'scale' | 'translate' | 'rotate' | 'glow' | 'bounce' | 'pulse' | 'shake' | 'flip';
  duration: number; // ms
  intensity: number; // 1-10
  timingFunction: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay: number; // ms
}

interface AnimationEditorProps {
  currentAnimation?: AnimationSettings;
  onAnimationChange: (animation: AnimationSettings) => void;
}

// 8가지 애니메이션 프리셋
const ANIMATION_PRESETS: AnimationSettings[] = [
  {
    enabled: true,
    type: 'scale',
    duration: 200,
    intensity: 5,
    timingFunction: 'ease-out',
    delay: 0
  },
  {
    enabled: true,
    type: 'translate',
    duration: 300,
    intensity: 3,
    timingFunction: 'ease',
    delay: 0
  },
  {
    enabled: true,
    type: 'rotate',
    duration: 250,
    intensity: 2,
    timingFunction: 'ease-in-out',
    delay: 0
  },
  {
    enabled: true,
    type: 'glow',
    duration: 300,
    intensity: 6,
    timingFunction: 'ease',
    delay: 0
  },
  {
    enabled: true,
    type: 'bounce',
    duration: 400,
    intensity: 4,
    timingFunction: 'ease-out',
    delay: 0
  },
  {
    enabled: true,
    type: 'pulse',
    duration: 600,
    intensity: 7,
    timingFunction: 'ease-in-out',
    delay: 0
  },
  {
    enabled: true,
    type: 'shake',
    duration: 500,
    intensity: 3,
    timingFunction: 'ease-in-out',
    delay: 0
  },
  {
    enabled: true,
    type: 'flip',
    duration: 400,
    intensity: 5,
    timingFunction: 'ease',
    delay: 0
  }
];

const ANIMATION_TYPES = [
  { value: 'scale', label: 'Scale', icon: Maximize, description: 'Grows on hover' },
  { value: 'translate', label: 'Lift', icon: ArrowUp, description: 'Moves up slightly' },
  { value: 'rotate', label: 'Rotate', icon: RotateCw, description: 'Rotates slightly' },
  { value: 'glow', label: 'Glow', icon: Zap, description: 'Adds glow effect' },
  { value: 'bounce', label: 'Bounce', icon: ArrowDown, description: 'Bouncy effect' },
  { value: 'pulse', label: 'Pulse', icon: Play, description: 'Pulsing scale' },
  { value: 'shake', label: 'Shake', icon: Move, description: 'Subtle shake' },
  { value: 'flip', label: 'Flip', icon: RefreshCw, description: 'Flip transform' }
] as const;

const TIMING_FUNCTIONS = [
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' }
] as const;

export const AnimationEditor: React.FC<AnimationEditorProps> = ({
  currentAnimation,
  onAnimationChange,
}) => {
  const [showPresets, setShowPresets] = useState(true);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  // Default animation
  const defaultAnimation: AnimationSettings = {
    enabled: false,
    type: 'scale',
    duration: 200,
    intensity: 5,
    timingFunction: 'ease-out',
    delay: 0
  };

  const animation = currentAnimation || defaultAnimation;

  // Generate CSS for animation
  const generateAnimationCSS = (animSettings: AnimationSettings): React.CSSProperties => {
    if (!animSettings.enabled) return {};

    const { type, duration, intensity, timingFunction, delay } = animSettings;

    const baseStyles: React.CSSProperties = {
      transition: `all ${duration}ms ${timingFunction} ${delay}ms`,
      cursor: 'pointer'
    };

    // Different animation types
    const hoverTransforms: { [key: string]: string } = {
      scale: `scale(${1 + (intensity * 0.02)})`,
      translate: `translateY(-${intensity}px)`,
      rotate: `rotate(${intensity * 2}deg)`,
      glow: 'scale(1.02)',
      bounce: 'scale(1.05)',
      pulse: `scale(${1 + (intensity * 0.01)})`,
      shake: `translateX(${intensity}px)`,
      flip: `rotateY(${intensity * 10}deg)`
    };

    if (isPreviewActive) {
      switch (type) {
        case 'scale':
          return { ...baseStyles, transform: hoverTransforms.scale };
        case 'translate':
          return { ...baseStyles, transform: hoverTransforms.translate };
        case 'rotate':
          return { ...baseStyles, transform: hoverTransforms.rotate };
        case 'glow':
          return {
            ...baseStyles,
            transform: hoverTransforms.glow,
            boxShadow: `0 0 ${intensity * 3}px rgba(255, 255, 255, 0.8)`
          };
        case 'bounce':
          return { ...baseStyles, transform: hoverTransforms.bounce };
        case 'pulse':
          return { ...baseStyles, transform: hoverTransforms.pulse };
        case 'shake':
          return { ...baseStyles, transform: hoverTransforms.shake };
        case 'flip':
          return { ...baseStyles, transform: hoverTransforms.flip };
        default:
          return baseStyles;
      }
    }

    return baseStyles;
  };

  // Generate CSS string for output
  const generateCSSString = (animSettings: AnimationSettings): string => {
    if (!animSettings.enabled) return '';

    const { type, duration, intensity, timingFunction, delay } = animSettings;

    const transition = `transition: all ${duration}ms ${timingFunction} ${delay}ms;`;

    let hoverEffect = '';
    switch (type) {
      case 'scale':
        hoverEffect = `transform: scale(${1 + (intensity * 0.02)});`;
        break;
      case 'translate':
        hoverEffect = `transform: translateY(-${intensity}px);`;
        break;
      case 'rotate':
        hoverEffect = `transform: rotate(${intensity * 2}deg);`;
        break;
      case 'glow':
        hoverEffect = `transform: scale(1.02); box-shadow: 0 0 ${intensity * 3}px rgba(255, 255, 255, 0.8);`;
        break;
      case 'bounce':
        hoverEffect = `transform: scale(1.05);`;
        break;
      case 'pulse':
        hoverEffect = `transform: scale(${1 + (intensity * 0.01)});`;
        break;
      case 'shake':
        hoverEffect = `transform: translateX(${intensity}px);`;
        break;
      case 'flip':
        hoverEffect = `transform: rotateY(${intensity * 10}deg);`;
        break;
    }

    return `${transition} :hover { ${hoverEffect} }`;
  };

  // Update animation
  const updateAnimation = (updates: Partial<AnimationSettings>) => {
    const newAnimation = { ...animation, ...updates };
    onAnimationChange(newAnimation);
  };

  // Toggle animation
  const toggleAnimation = () => {
    updateAnimation({ enabled: !animation.enabled });
  };

  // Preview animation
  const previewAnimation = () => {
    setIsPreviewActive(true);
    setTimeout(() => setIsPreviewActive(false), animation.duration + 100);
  };

  const currentAnimationType = ANIMATION_TYPES.find(type => type.value === animation.type);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <Label className="text-sm font-medium">Hover Animation</Label>
        </div>
        <Button
          variant={animation.enabled ? "default" : "outline"}
          size="sm"
          onClick={toggleAnimation}
          className="h-8 px-3 text-xs"
        >
          {animation.enabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {animation.enabled && (
        <>
          {/* Animation Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-700">Preview</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={previewAnimation}
                className="h-6 px-2 text-xs"
              >
                <Play className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </div>
            <div className="p-4 bg-white rounded border">
              <div className="flex justify-center">
                <div
                  className="px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium cursor-pointer"
                  style={generateAnimationCSS(animation)}
                  onMouseEnter={() => setIsPreviewActive(true)}
                  onMouseLeave={() => setIsPreviewActive(false)}
                >
                  Hover Me
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-mono break-all">
              {generateCSSString(animation)}
            </p>
          </div>

          {/* Current Animation Info */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center gap-2">
              {currentAnimationType && <currentAnimationType.icon size={16} />}
              <div>
                <span className="text-sm font-medium">{currentAnimationType?.label}</span>
                <p className="text-xs text-gray-500">{currentAnimationType?.description}</p>
              </div>
            </div>
            <MousePointer className="h-4 w-4 text-gray-400" />
          </div>

          {/* Animation Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Animation Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {ANIMATION_TYPES.map((typeOption) => (
                <Button
                  key={typeOption.value}
                  variant={animation.type === typeOption.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateAnimation({ type: typeOption.value as any })}
                  className="h-12 flex flex-col items-center justify-center p-2 text-xs"
                  title={typeOption.description}
                >
                  <typeOption.icon className="h-3 w-3 mb-1" />
                  {typeOption.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Animation Settings */}
          <div className="space-y-3">
            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">
                Duration: {animation.duration}ms
              </Label>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={animation.duration}
                onChange={(e) => updateAnimation({ duration: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>100ms</span>
                <span>1000ms</span>
              </div>
            </div>

            {/* Intensity */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">
                Intensity: {animation.intensity}/10
              </Label>
              <input
                type="range"
                min="1"
                max="10"
                value={animation.intensity}
                onChange={(e) => updateAnimation({ intensity: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtle</span>
                <span>Strong</span>
              </div>
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">
                Delay: {animation.delay}ms
              </Label>
              <input
                type="range"
                min="0"
                max="500"
                step="50"
                value={animation.delay}
                onChange={(e) => updateAnimation({ delay: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            {/* Timing Function */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Timing Function</Label>
              <div className="grid grid-cols-3 gap-1">
                {TIMING_FUNCTIONS.map((timingOption) => (
                  <Button
                    key={timingOption.value}
                    variant={animation.timingFunction === timingOption.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateAnimation({ timingFunction: timingOption.value as any })}
                    className="text-xs h-8"
                  >
                    {timingOption.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-700">Animation Presets</Label>
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
                {ANIMATION_PRESETS.map((preset, index) => {
                  const presetType = ANIMATION_TYPES.find(type => type.value === preset.type);
                  return (
                    <button
                      key={index}
                      className="h-12 w-full bg-white rounded border hover:ring-2 hover:ring-blue-300 transition-all flex flex-col items-center justify-center p-2"
                      onClick={() => onAnimationChange(preset)}
                      title={`${presetType?.label} - ${preset.duration}ms`}
                    >
                      {presetType && <presetType.icon className="h-3 w-3 mb-1" />}
                      <span className="text-xs">{presetType?.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
            <p><strong>Tip:</strong> Subtle animations enhance user experience</p>
            <p><strong>Duration:</strong> 200-400ms feels natural</p>
            <p><strong>Intensity:</strong> Keep it moderate for accessibility</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AnimationEditor;