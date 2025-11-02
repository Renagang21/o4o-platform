/**
 * Buttons Panel Component
 * Customizer의 버튼 스타일 설정 패널
 */

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ButtonVariants, ButtonStyleSettings } from '../../types/customizer-types';
import {
  ButtonVariantSettings,
  ButtonSizingSettings,
  ButtonEffectsSettings,
  mergeButtonSettings,
  getButtonPreviewStyle,
  DeviceType,
  ButtonVariantType
} from './buttons';

interface ButtonsPanelProps {
  settings?: ButtonVariants;
  onChange: (settings: ButtonVariants) => void;
}

/**
 * ButtonsPanel Component
 *
 * Main panel for button customization. Provides tabs for different button variants
 * (primary, secondary, outline, text) and uses sub-components to handle specific
 * aspects of button styling (colors, sizing, effects).
 */
export const ButtonsPanel: React.FC<ButtonsPanelProps> = ({
  settings: propSettings,
  onChange
}) => {
  const [activeVariant, setActiveVariant] = useState<ButtonVariantType>('primary');
  const [device, setDevice] = useState<DeviceType>('desktop');

  // Merge user settings with defaults
  const settings = mergeButtonSettings(propSettings);
  const currentVariantSettings = settings[activeVariant] as ButtonStyleSettings;

  /**
   * Handle changes to variant-specific settings
   */
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

  /**
   * Handle changes to global button settings
   */
  const handleGlobalChange = (field: string, value: any) => {
    onChange({
      ...settings,
      global: {
        ...settings.global,
        [field]: value
      }
    });
  };

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
              style={getButtonPreviewStyle(settings.primary, device)}
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
        <Tabs value={activeVariant} onValueChange={(v) => setActiveVariant(v as ButtonVariantType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="primary">Primary</TabsTrigger>
            <TabsTrigger value="secondary">Secondary</TabsTrigger>
            <TabsTrigger value="outline">Outline</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>

          <TabsContent value={activeVariant} className="space-y-6 mt-6">
            {/* Colors & Borders - ButtonVariantSettings */}
            <ButtonVariantSettings
              settings={currentVariantSettings}
              onChange={handleVariantChange}
            />

            {/* Typography & Sizing - ButtonSizingSettings */}
            <ButtonSizingSettings
              settings={currentVariantSettings}
              device={device}
              onChange={handleVariantChange}
              onDeviceChange={setDevice}
            />

            {/* Hover Effects - ButtonEffectsSettings */}
            <ButtonEffectsSettings
              settings={currentVariantSettings}
              onChange={handleVariantChange}
            />
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