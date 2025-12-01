/**
 * ButtonInspectorControls
 *
 * Gutenberg-style inspector controls for button block
 * Displays in the right sidebar when button is selected
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AnimationEditor } from './AnimationEditor';

interface Panel {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Panel: React.FC<Panel> = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b border-gray-200">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors">
        <h3 className="font-medium text-sm">{title}</h3>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 h-9 cursor-pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
          placeholder="#000000"
        />
      </div>
    </div>
  );
};

interface AnimationSettings {
  enabled: boolean;
  type: 'scale' | 'translate' | 'rotate' | 'glow' | 'bounce' | 'pulse' | 'shake' | 'flip';
  duration: number;
  intensity: number;
  timingFunction: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  delay: number;
}

interface ButtonInspectorControlsProps {
  attributes: {
    text?: string;
    url?: string;
    linkTarget?: '_self' | '_blank';
    rel?: string;
    style?: 'fill' | 'outline';
    align?: 'left' | 'center' | 'right';
    width?: number;
    textColor?: string;
    backgroundColor?: string;
    gradient?: string;
    fontSize?: number;
    fontWeight?: number;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    animation?: AnimationSettings;
  };
  updateAttribute: (key: string, value: any) => void;
}

export const ButtonInspectorControls: React.FC<ButtonInspectorControlsProps> = ({
  attributes,
  updateAttribute
}) => {
  const {
    url = '#',
    linkTarget = '_self',
    rel = '',
    width = 0,
    textColor = '#ffffff',
    backgroundColor = '#007cba',
    fontSize = 16,
    fontWeight = 400,
    borderRadius = 4,
    borderWidth = 2,
    borderColor = '#007cba',
    paddingTop = 12,
    paddingRight = 24,
    paddingBottom = 12,
    paddingLeft = 24,
  } = attributes;

  const [linkPadding, setLinkPadding] = useState(false);

  return (
    <div className="w-full">
      {/* Link Settings */}
      <Panel title="Link" defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              type="url"
              value={url}
              onChange={(e) => updateAttribute('url', e.target.value)}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Open in new tab</Label>
            <Switch
              checked={linkTarget === '_blank'}
              onCheckedChange={(checked) => updateAttribute('linkTarget', checked ? '_blank' : '_self')}
            />
          </div>

          <div>
            <Label className="text-xs">Link rel</Label>
            <Input
              type="text"
              value={rel}
              onChange={(e) => updateAttribute('rel', e.target.value)}
              placeholder="nofollow"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Relationship between current and linked URL (e.g., nofollow, sponsored)
            </p>
          </div>
        </div>
      </Panel>

      {/* Color Settings */}
      <Panel title="Color" defaultOpen={true}>
        <div className="space-y-4">
          <ColorPicker
            label="Text color"
            value={textColor}
            onChange={(value) => updateAttribute('textColor', value)}
          />

          <ColorPicker
            label="Background color"
            value={backgroundColor}
            onChange={(value) => updateAttribute('backgroundColor', value)}
          />
        </div>
      </Panel>

      {/* Typography */}
      <Panel title="Typography" defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Font size</Label>
            <div className="flex items-center gap-3 mt-1">
              <Slider
                value={[fontSize]}
                onValueChange={([value]) => updateAttribute('fontSize', value)}
                min={10}
                max={48}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-12 text-right">{fontSize}px</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Font weight</Label>
            <Select
              value={String(fontWeight)}
              onValueChange={(value) => updateAttribute('fontWeight', Number(value))}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">Light (300)</SelectItem>
                <SelectItem value="400">Normal (400)</SelectItem>
                <SelectItem value="500">Medium (500)</SelectItem>
                <SelectItem value="600">Semi Bold (600)</SelectItem>
                <SelectItem value="700">Bold (700)</SelectItem>
                <SelectItem value="800">Extra Bold (800)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>

      {/* Dimensions */}
      <Panel title="Dimensions" defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Width (%)</Label>
            <div className="flex items-center gap-3 mt-1">
              <Slider
                value={[width]}
                onValueChange={([value]) => updateAttribute('width', value)}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-16 text-right">
                {width > 0 ? `${width}%` : 'Auto'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set to 0 for auto width
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Link padding values</Label>
            <Switch
              checked={linkPadding}
              onCheckedChange={setLinkPadding}
            />
          </div>

          {linkPadding && (
            <div className="space-y-3 pl-2 border-l-2 border-gray-200">
              <div>
                <Label className="text-xs">Padding top</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[paddingTop]}
                    onValueChange={([value]) => updateAttribute('paddingTop', value)}
                    min={0}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12 text-right">{paddingTop}px</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Padding right</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[paddingRight]}
                    onValueChange={([value]) => updateAttribute('paddingRight', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12 text-right">{paddingRight}px</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Padding bottom</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[paddingBottom]}
                    onValueChange={([value]) => updateAttribute('paddingBottom', value)}
                    min={0}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12 text-right">{paddingBottom}px</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Padding left</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Slider
                    value={[paddingLeft]}
                    onValueChange={([value]) => updateAttribute('paddingLeft', value)}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12 text-right">{paddingLeft}px</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Border */}
      <Panel title="Border" defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Border radius</Label>
            <div className="flex items-center gap-3 mt-1">
              <Slider
                value={[borderRadius]}
                onValueChange={([value]) => updateAttribute('borderRadius', value)}
                min={0}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-12 text-right">{borderRadius}px</span>
            </div>
          </div>

          <div>
            <Label className="text-xs">Border width</Label>
            <div className="flex items-center gap-3 mt-1">
              <Slider
                value={[borderWidth]}
                onValueChange={([value]) => updateAttribute('borderWidth', value)}
                min={0}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-gray-600 w-12 text-right">{borderWidth}px</span>
            </div>
          </div>

          <ColorPicker
            label="Border color"
            value={borderColor}
            onChange={(value) => updateAttribute('borderColor', value)}
          />
        </div>
      </Panel>

      {/* Animation */}
      <Panel title="Hover Animation" defaultOpen={false}>
        <AnimationEditor
          currentAnimation={attributes.animation}
          onAnimationChange={(animation) => updateAttribute('animation', animation)}
        />
      </Panel>

      {/* Advanced */}
      <Panel title="Advanced" defaultOpen={false}>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Additional HTML attributes and CSS classes can be added here.
          </p>
        </div>
      </Panel>
    </div>
  );
};

export default ButtonInspectorControls;
