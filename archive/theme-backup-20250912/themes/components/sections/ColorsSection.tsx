/**
 * ColorsSection - Color customization with color picker
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Palette, RefreshCw } from 'lucide-react';

interface ColorSettings {
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  accentColor: string;
  headerBackgroundColor: string;
  headerTextColor: string;
  darkMode: boolean;
}

interface ColorsSectionProps {
  settings: ColorSettings;
  onChange: (updates: Partial<ColorSettings>) => void;
}

interface ColorPreset {
  name: string;
  colors: Partial<ColorSettings>;
}

const colorPresets: ColorPreset[] = [
  {
    name: 'Default',
    colors: {
      backgroundColor: '#ffffff',
      textColor: '#333333',
      linkColor: '#0073aa',
      accentColor: '#0073aa',
      headerBackgroundColor: '#23282d',
      headerTextColor: '#ffffff'
    }
  },
  {
    name: 'Modern',
    colors: {
      backgroundColor: '#f8f9fa',
      textColor: '#212529',
      linkColor: '#007bff',
      accentColor: '#007bff',
      headerBackgroundColor: '#343a40',
      headerTextColor: '#ffffff'
    }
  },
  {
    name: 'Warm',
    colors: {
      backgroundColor: '#fef5e7',
      textColor: '#5d4037',
      linkColor: '#ff6f00',
      accentColor: '#ff9800',
      headerBackgroundColor: '#6d4c41',
      headerTextColor: '#ffffff'
    }
  },
  {
    name: 'Cool',
    colors: {
      backgroundColor: '#e3f2fd',
      textColor: '#263238',
      linkColor: '#1976d2',
      accentColor: '#2196f3',
      headerBackgroundColor: '#37474f',
      headerTextColor: '#ffffff'
    }
  },
  {
    name: 'Dark',
    colors: {
      backgroundColor: '#1a1a1a',
      textColor: '#e0e0e0',
      linkColor: '#64b5f6',
      accentColor: '#42a5f5',
      headerBackgroundColor: '#000000',
      headerTextColor: '#ffffff'
    }
  }
];

export const ColorsSection: React.FC<ColorsSectionProps> = ({
  settings,
  onChange
}) => {
  const [showPresets, setShowPresets] = useState(false);

  const handleColorChange = (key: keyof ColorSettings, value: string) => {
    onChange({ [key]: value });
  };

  const applyPreset = (preset: ColorPreset) => {
    onChange(preset.colors);
    setShowPresets(false);
  };

  const resetColors = () => {
    applyPreset(colorPresets[0]); // Apply default preset
  };

  const ColorInput = ({ 
    id, 
    label, 
    value, 
    onChange 
  }: { 
    id: keyof ColorSettings; 
    label: string; 
    value: string; 
    onChange: (value: string) => void;
  }) => (
    <div className="color-input-group">
      <Label htmlFor={id}>{label}</Label>
      <div className="color-input-wrapper">
        <input
          type="color"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-picker"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-text-input"
          placeholder="#000000"
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </div>
  );

  return (
    <div className="wp-section-content">
      {/* Dark Mode Toggle */}
      <div className="form-group">
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode" className="flex-1">
            Dark Mode
            <p className="text-xs text-gray-500 font-normal mt-1">
              Enable dark mode for your website
            </p>
          </Label>
          <Switch
            id="dark-mode"
            checked={settings.darkMode}
            onCheckedChange={(checked) => onChange({ darkMode: checked })}
          />
        </div>
      </div>

      {/* Color Presets */}
      <div className="form-group">
        <div className="flex items-center justify-between mb-3">
          <Label>Color Schemes</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPresets(!showPresets)}
          >
            <Palette className="w-4 h-4 mr-2" />
            Presets
          </Button>
        </div>
        
        {showPresets && (
          <div className="color-presets">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="preset-button"
              >
                <div className="preset-colors">
                  <span 
                    className="preset-color"
                    style={{ backgroundColor: preset.colors.backgroundColor }}
                  />
                  <span 
                    className="preset-color"
                    style={{ backgroundColor: preset.colors.textColor }}
                  />
                  <span 
                    className="preset-color"
                    style={{ backgroundColor: preset.colors.linkColor }}
                  />
                  <span 
                    className="preset-color"
                    style={{ backgroundColor: preset.colors.headerBackgroundColor }}
                  />
                </div>
                <span className="preset-name">{preset.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Base Colors */}
      <div className="form-group">
        <h3 className="section-subtitle">Base Colors</h3>
        
        <ColorInput
          id="backgroundColor"
          label="Background Color"
          value={settings.backgroundColor}
          onChange={(value) => handleColorChange('backgroundColor', value)}
        />
        
        <ColorInput
          id="textColor"
          label="Text Color"
          value={settings.textColor}
          onChange={(value) => handleColorChange('textColor', value)}
        />
        
        <ColorInput
          id="linkColor"
          label="Link Color"
          value={settings.linkColor}
          onChange={(value) => handleColorChange('linkColor', value)}
        />
        
        <ColorInput
          id="accentColor"
          label="Accent Color"
          value={settings.accentColor}
          onChange={(value) => handleColorChange('accentColor', value)}
        />
      </div>

      {/* Header Colors */}
      <div className="form-group">
        <h3 className="section-subtitle">Header Colors</h3>
        
        <ColorInput
          id="headerBackgroundColor"
          label="Header Background"
          value={settings.headerBackgroundColor}
          onChange={(value) => handleColorChange('headerBackgroundColor', value)}
        />
        
        <ColorInput
          id="headerTextColor"
          label="Header Text"
          value={settings.headerTextColor}
          onChange={(value) => handleColorChange('headerTextColor', value)}
        />
      </div>

      {/* Reset Button */}
      <div className="form-group">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetColors}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Default Colors
        </Button>
      </div>
    </div>
  );
};

export default ColorsSection;