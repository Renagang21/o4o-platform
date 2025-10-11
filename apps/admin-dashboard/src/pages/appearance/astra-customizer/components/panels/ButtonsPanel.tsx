/**
 * Buttons Panel Component
 * Customizer의 버튼 스타일 설정 패널
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ButtonVariants, ButtonStyleSettings } from '../../types/customizer-types';
import { Palette, Type, MousePointer, Layers } from 'lucide-react';

interface ButtonsPanelProps {
  settings?: ButtonVariants;
  onChange: (settings: ButtonVariants) => void;
}

const defaultButtonStyle: ButtonStyleSettings = {
  backgroundColor: '#0073e6',
  textColor: '#ffffff',
  borderWidth: 0,
  borderColor: '#0073e6',
  borderStyle: 'solid',
  borderRadius: 4,
  paddingVertical: 12,
  paddingHorizontal: 24,
  hoverBackgroundColor: '#005bb5',
  hoverTextColor: '#ffffff',
  hoverBorderColor: '#005bb5',
  hoverTransform: 'none',
  transitionDuration: 300,
  fontSize: { desktop: 16, tablet: 15, mobile: 14 },
  fontWeight: 500,
  textTransform: 'none',
  letterSpacing: 0,
  boxShadow: 'none',
  hoverBoxShadow: 'small'
};

const defaultSettings: ButtonVariants = {
  primary: defaultButtonStyle,
  secondary: {
    backgroundColor: '#6c757d',
    hoverBackgroundColor: '#5a6268'
  },
  outline: {
    backgroundColor: 'transparent',
    textColor: '#0073e6',
    borderWidth: 2,
    hoverBackgroundColor: '#0073e6',
    hoverTextColor: '#ffffff'
  },
  text: {
    backgroundColor: 'transparent',
    textColor: '#0073e6',
    borderWidth: 0,
    hoverBackgroundColor: 'rgba(0, 115, 230, 0.1)',
    boxShadow: 'none'
  },
  global: {
    minHeight: 40,
    displayType: 'inline-block',
    iconSpacing: 8
  }
};

export const ButtonsPanel: React.FC<ButtonsPanelProps> = ({
  settings: propSettings,
  onChange
}) => {
  const [activeVariant, setActiveVariant] = useState<'primary' | 'secondary' | 'outline' | 'text'>('primary');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  const settings = {
    ...defaultSettings,
    ...propSettings,
    primary: { ...defaultSettings.primary, ...propSettings?.primary },
    secondary: { ...defaultButtonStyle, ...defaultSettings.secondary, ...propSettings?.secondary },
    outline: { ...defaultButtonStyle, ...defaultSettings.outline, ...propSettings?.outline },
    text: { ...defaultButtonStyle, ...defaultSettings.text, ...propSettings?.text }
  };

  const currentVariantSettings = settings[activeVariant] as ButtonStyleSettings;

  const handleVariantChange = <K extends keyof ButtonStyleSettings>(
    field: K,
    value: ButtonStyleSettings[K]
  ) => {
    onChange({
      ...settings,
      [activeVariant]: {
        ...currentVariantSettings,
        [field]: value
      }
    });
  };

  const handleGlobalChange = (field: string, value: any) => {
    onChange({
      ...settings,
      global: {
        ...settings.global,
        [field]: value
      }
    });
  };

  const handleResponsiveChange = (field: 'fontSize', value: number) => {
    onChange({
      ...settings,
      [activeVariant]: {
        ...currentVariantSettings,
        [field]: {
          ...currentVariantSettings[field],
          [device]: value
        }
      }
    });
  };

  const renderColorInput = (
    label: string,
    value: string,
    field: keyof ButtonStyleSettings
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => handleVariantChange(field, e.target.value)}
          className="w-16 h-10 p-1 cursor-pointer"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => handleVariantChange(field, e.target.value)}
          placeholder="#000000"
          className="flex-1"
        />
      </div>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Button Styling</h3>
        
        {/* Button Preview */}
        <div className="mb-6 p-6 bg-gray-50 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-3">Preview</p>
          <div className="space-x-3">
            <button
              className="button-preview-primary"
              style={{
                backgroundColor: settings.primary.backgroundColor,
                color: settings.primary.textColor,
                borderWidth: `${settings.primary.borderWidth}px`,
                borderColor: settings.primary.borderColor,
                borderStyle: settings.primary.borderStyle,
                borderRadius: `${settings.primary.borderRadius}px`,
                padding: `${settings.primary.paddingVertical}px ${settings.primary.paddingHorizontal}px`,
                fontSize: `${settings.primary.fontSize[device]}px`,
                fontWeight: settings.primary.fontWeight,
                textTransform: settings.primary.textTransform,
                letterSpacing: `${settings.primary.letterSpacing}px`,
                transition: `all ${settings.primary.transitionDuration}ms ease`
              }}
            >
              Primary
            </button>
            
            {settings.secondary && (
              <button
                className="button-preview-secondary"
                style={{
                  backgroundColor: settings.secondary.backgroundColor,
                  color: settings.secondary.textColor || settings.primary.textColor,
                  borderRadius: `${settings.secondary.borderRadius || settings.primary.borderRadius}px`,
                  padding: `${settings.secondary.paddingVertical || settings.primary.paddingVertical}px ${settings.secondary.paddingHorizontal || settings.primary.paddingHorizontal}px`
                }}
              >
                Secondary
              </button>
            )}
            
            {settings.outline && (
              <button
                className="button-preview-outline"
                style={{
                  backgroundColor: settings.outline.backgroundColor,
                  color: settings.outline.textColor,
                  borderWidth: `${settings.outline.borderWidth}px`,
                  borderColor: settings.outline.borderColor || settings.outline.textColor,
                  borderStyle: 'solid',
                  borderRadius: `${settings.outline.borderRadius || settings.primary.borderRadius}px`,
                  padding: `${settings.outline.paddingVertical || settings.primary.paddingVertical}px ${settings.outline.paddingHorizontal || settings.primary.paddingHorizontal}px`
                }}
              >
                Outline
              </button>
            )}
          </div>
        </div>

        {/* Variant Tabs */}
        <Tabs value={activeVariant} onValueChange={(v) => setActiveVariant(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="primary">Primary</TabsTrigger>
            <TabsTrigger value="secondary">Secondary</TabsTrigger>
            <TabsTrigger value="outline">Outline</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>

          <TabsContent value={activeVariant} className="space-y-6 mt-6">
            {/* Colors Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Palette size={18} />
                Colors
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                {renderColorInput('Background Color', currentVariantSettings.backgroundColor, 'backgroundColor')}
                {renderColorInput('Text Color', currentVariantSettings.textColor, 'textColor')}
                {renderColorInput('Hover Background', currentVariantSettings.hoverBackgroundColor, 'hoverBackgroundColor')}
                {renderColorInput('Hover Text', currentVariantSettings.hoverTextColor, 'hoverTextColor')}
              </div>
            </div>

            {/* Border Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Layers size={18} />
                Border & Spacing
              </h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Border Width (px)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={currentVariantSettings.borderWidth}
                      onChange={(e) => handleVariantChange('borderWidth', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div>
                    <Label>Border Style</Label>
                    <Select
                      value={currentVariantSettings.borderStyle}
                      onValueChange={(value) => handleVariantChange('borderStyle', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="dashed">Dashed</SelectItem>
                        <SelectItem value="dotted">Dotted</SelectItem>
                        <SelectItem value="double">Double</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentVariantSettings.borderWidth > 0 && (
                  <div>
                    {renderColorInput('Border Color', currentVariantSettings.borderColor, 'borderColor')}
                  </div>
                )}

                <div>
                  <Label>
                    Border Radius
                    <span className="ml-2 text-sm text-gray-500">
                      {currentVariantSettings.borderRadius}px
                    </span>
                  </Label>
                  <Slider
                    value={[currentVariantSettings.borderRadius]}
                    onValueChange={([value]) => handleVariantChange('borderRadius', value)}
                    min={0}
                    max={50}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      Padding Vertical
                      <span className="ml-2 text-sm text-gray-500">
                        {currentVariantSettings.paddingVertical}px
                      </span>
                    </Label>
                    <Slider
                      value={[currentVariantSettings.paddingVertical]}
                      onValueChange={([value]) => handleVariantChange('paddingVertical', value)}
                      min={4}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label>
                      Padding Horizontal
                      <span className="ml-2 text-sm text-gray-500">
                        {currentVariantSettings.paddingHorizontal}px
                      </span>
                    </Label>
                    <Slider
                      value={[currentVariantSettings.paddingHorizontal]}
                      onValueChange={([value]) => handleVariantChange('paddingHorizontal', value)}
                      min={8}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Typography Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Type size={18} />
                Typography
              </h4>
              
              <div className="space-y-4">
                {/* Device Switcher */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded">
                  {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      className={`flex-1 px-3 py-1 text-sm rounded transition-colors ${
                        device === d ? 'bg-white shadow-sm' : 'hover:bg-gray-50'
                      }`}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>

                <div>
                  <Label>Font Size ({device})</Label>
                  <Input
                    type="number"
                    min="10"
                    max="30"
                    value={currentVariantSettings.fontSize[device]}
                    onChange={(e) => handleResponsiveChange('fontSize', parseInt(e.target.value) || 14)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Font Weight</Label>
                    <Select
                      value={currentVariantSettings.fontWeight.toString()}
                      onValueChange={(value) => handleVariantChange('fontWeight', parseInt(value) as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">Light (300)</SelectItem>
                        <SelectItem value="400">Normal (400)</SelectItem>
                        <SelectItem value="500">Medium (500)</SelectItem>
                        <SelectItem value="600">Semi Bold (600)</SelectItem>
                        <SelectItem value="700">Bold (700)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Text Transform</Label>
                    <Select
                      value={currentVariantSettings.textTransform}
                      onValueChange={(value) => handleVariantChange('textTransform', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="uppercase">UPPERCASE</SelectItem>
                        <SelectItem value="lowercase">lowercase</SelectItem>
                        <SelectItem value="capitalize">Capitalize</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>
                    Letter Spacing
                    <span className="ml-2 text-sm text-gray-500">
                      {currentVariantSettings.letterSpacing}px
                    </span>
                  </Label>
                  <Slider
                    value={[currentVariantSettings.letterSpacing]}
                    onValueChange={([value]) => handleVariantChange('letterSpacing', value)}
                    min={-2}
                    max={5}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Effects Section */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <MousePointer size={18} />
                Hover Effects
              </h4>
              
              <div className="space-y-4">
                <div>
                  <Label>Hover Transform</Label>
                  <Select
                    value={currentVariantSettings.hoverTransform || 'none'}
                    onValueChange={(value) => handleVariantChange('hoverTransform', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="scale">Scale Up</SelectItem>
                      <SelectItem value="translateY">Move Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    Transition Duration
                    <span className="ml-2 text-sm text-gray-500">
                      {currentVariantSettings.transitionDuration}ms
                    </span>
                  </Label>
                  <Slider
                    value={[currentVariantSettings.transitionDuration]}
                    onValueChange={([value]) => handleVariantChange('transitionDuration', value)}
                    min={0}
                    max={1000}
                    step={50}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Box Shadow</Label>
                    <Select
                      value={currentVariantSettings.boxShadow || 'none'}
                      onValueChange={(value) => handleVariantChange('boxShadow', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Hover Shadow</Label>
                    <Select
                      value={currentVariantSettings.hoverBoxShadow || 'none'}
                      onValueChange={(value) => handleVariantChange('hoverBoxShadow', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Global Settings */}
        <div className="mt-6 p-4 border rounded-lg space-y-4">
          <h4 className="font-medium">Global Button Settings</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Height (px)</Label>
              <Input
                type="number"
                min="30"
                max="80"
                value={settings.global?.minHeight || 40}
                onChange={(e) => handleGlobalChange('minHeight', parseInt(e.target.value) || 40)}
              />
            </div>

            <div>
              <Label>Display Type</Label>
              <Select
                value={settings.global?.displayType || 'inline-block'}
                onValueChange={(value) => handleGlobalChange('displayType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline-block">Inline Block</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="inline-flex">Inline Flex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 p-3 rounded text-sm text-blue-900">
        <strong>Note:</strong> These button styles will be applied to all buttons across your site. 
        You can create different button variants for various use cases.
      </div>
    </div>
  );
};

export default ButtonsPanel;