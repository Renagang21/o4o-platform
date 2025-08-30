/**
 * ColorPalettePicker - Color scheme selection component
 */

import React, { useState, useCallback } from 'react'
import { Check, Palette, RefreshCw } from 'lucide-react'
import { ColorScheme } from '@o4o/types'

interface ColorPalettePickerProps {
  colors: ColorScheme
  onUpdate: (colors: ColorScheme) => void
}

// Pre-defined color palettes based on Twenty Twenty-Four theme
const COLOR_PALETTES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Clean and professional',
    colors: {
      primary: '#3B82F6',
      secondary: '#64748B',
      accent: '#10B981',
      background: '#FFFFFF',
      foreground: '#1F2937',
      muted: '#F8FAFC',
      mutedForeground: '#64748B',
      border: '#E5E7EB',
      input: '#FFFFFF',
      ring: '#3B82F6'
    }
  },
  {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Modern dark theme',
    colors: {
      primary: '#60A5FA',
      secondary: '#94A3B8',
      accent: '#34D399',
      background: '#0F172A',
      foreground: '#F1F5F9',
      muted: '#1E293B',
      mutedForeground: '#94A3B8',
      border: '#334155',
      input: '#1E293B',
      ring: '#60A5FA'
    }
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Warm and inviting',
    colors: {
      primary: '#F59E0B',
      secondary: '#92400E',
      accent: '#EF4444',
      background: '#FFFBEB',
      foreground: '#78350F',
      muted: '#FEF3C7',
      mutedForeground: '#92400E',
      border: '#FDE68A',
      input: '#FFFFFF',
      ring: '#F59E0B'
    }
  },
  {
    id: 'cool',
    name: 'Cool',
    description: 'Cool and calming',
    colors: {
      primary: '#0EA5E9',
      secondary: '#0369A1',
      accent: '#8B5CF6',
      background: '#F0F9FF',
      foreground: '#0C4A6E',
      muted: '#E0F2FE',
      mutedForeground: '#0369A1',
      border: '#BAE6FD',
      input: '#FFFFFF',
      ring: '#0EA5E9'
    }
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Natural and organic',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#84CC16',
      background: '#F0FDF4',
      foreground: '#064E3B',
      muted: '#DCFCE7',
      mutedForeground: '#047857',
      border: '#BBF7D0',
      input: '#FFFFFF',
      ring: '#059669'
    }
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Sophisticated and refined',
    colors: {
      primary: '#7C3AED',
      secondary: '#5B21B6',
      accent: '#EC4899',
      background: '#FAFAFA',
      foreground: '#1A1A1A',
      muted: '#F5F5F5',
      mutedForeground: '#737373',
      border: '#E5E5E5',
      input: '#FFFFFF',
      ring: '#7C3AED'
    }
  }
]

// Color input component
const ColorInput: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
}> = ({ label, value, onChange, description }) => {
  return (
    <div className="color-input flex items-center justify-between">
      <div className="color-info">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div className="color-control flex items-center space-x-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="color-picker w-8 h-8 rounded border border-gray-300 cursor-pointer"
        />
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="color-text w-20 px-2 py-1 text-xs border border-gray-300 rounded font-mono"
          pattern="#[0-9A-Fa-f]{6}"
        />
      </div>
    </div>
  )
}

// Palette preview component
const PalettePreview: React.FC<{
  palette: typeof COLOR_PALETTES[0]
  isSelected: boolean
  onSelect: () => void
}> = ({ palette, isSelected, onSelect }) => {
  return (
    <button
      className={`palette-preview relative w-full p-4 rounded-lg border-2 transition-all hover:scale-105 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Color swatches */}
      <div className="color-swatches flex mb-3 -space-x-1">
        {Object.entries(palette.colors).slice(0, 6).map(([key, color]) => (
          <div
            key={key}
            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: color }}
            title={`${key}: ${color}`}
          />
        ))}
      </div>

      {/* Palette info */}
      <div className="palette-info text-left">
        <h4 className="text-sm font-medium text-gray-900 mb-1">
          {palette.name}
        </h4>
        <p className="text-xs text-gray-600">
          {palette.description}
        </p>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={12} className="text-white" />
        </div>
      )}
    </button>
  )
}

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({
  colors,
  onUpdate
}) => {
  const [customMode, setCustomMode] = useState(false)

  // Find current palette or detect custom
  const currentPalette = COLOR_PALETTES.find(palette => 
    JSON.stringify(palette.colors) === JSON.stringify(colors)
  )

  const isCustom = !currentPalette

  // Handle palette selection
  const handlePaletteSelect = useCallback((palette: typeof COLOR_PALETTES[0]) => {
    onUpdate(palette.colors)
    setCustomMode(false)
  }, [onUpdate])

  // Handle individual color change
  const handleColorChange = useCallback((colorKey: keyof ColorScheme, value: string) => {
    // Validate hex color format
    if (!/^#[0-9A-F]{6}$/i.test(value)) return

    onUpdate({
      ...colors,
      [colorKey]: value
    })
  }, [colors, onUpdate])

  // Reset to default palette
  const handleReset = useCallback(() => {
    handlePaletteSelect(COLOR_PALETTES[0])
  }, [handlePaletteSelect])

  return (
    <div className="color-palette-picker space-y-6">
      {/* Header */}
      <div className="picker-header">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-medium text-gray-900">Color Scheme</h3>
          <button
            onClick={() => setCustomMode(!customMode)}
            className={`custom-toggle px-3 py-1 text-xs rounded-md transition-colors ${
              customMode || isCustom
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom Colors
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Choose a color scheme or customize individual colors
        </p>
      </div>

      {!customMode && !isCustom ? (
        /* Palette Selection Mode */
        <div className="palette-selection">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLOR_PALETTES.map(palette => (
              <PalettePreview
                key={palette.id}
                palette={palette}
                isSelected={currentPalette?.id === palette.id}
                onSelect={() => handlePaletteSelect(palette)}
              />
            ))}
          </div>

          {isCustom && (
            <div className="custom-notice mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-700">
                <Palette size={16} className="inline mr-2" />
                You're using custom colors. Select a preset above or switch to custom mode to edit.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Custom Color Mode */
        <div className="custom-colors">
          <div className="space-y-4">
            <ColorInput
              label="Primary"
              value={colors.primary}
              onChange={(value) => handleColorChange('primary', value)}
              description="Main brand color, buttons, links"
            />
            <ColorInput
              label="Secondary"
              value={colors.secondary}
              onChange={(value) => handleColorChange('secondary', value)}
              description="Secondary elements and accents"
            />
            <ColorInput
              label="Accent"
              value={colors.accent}
              onChange={(value) => handleColorChange('accent', value)}
              description="Highlights and call-to-action"
            />
            <ColorInput
              label="Background"
              value={colors.background}
              onChange={(value) => handleColorChange('background', value)}
              description="Main background color"
            />
            <ColorInput
              label="Foreground"
              value={colors.foreground}
              onChange={(value) => handleColorChange('foreground', value)}
              description="Primary text color"
            />
            <ColorInput
              label="Muted"
              value={colors.muted}
              onChange={(value) => handleColorChange('muted', value)}
              description="Subtle backgrounds"
            />
            <ColorInput
              label="Border"
              value={colors.border}
              onChange={(value) => handleColorChange('border', value)}
              description="Element borders and dividers"
            />
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="reset-colors mt-6 flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RefreshCw size={16} className="mr-2" />
            Reset to Default
          </button>
        </div>
      )}

      {/* Live Preview */}
      <div className="color-preview bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4">Preview</h4>
        
        <div className="preview-content space-y-4" style={{
          backgroundColor: colors.background,
          color: colors.foreground
        }}>
          {/* Header example */}
          <div className="flex items-center justify-between pb-3" style={{
            borderBottom: `1px solid ${colors.border}`
          }}>
            <h3 className="text-lg font-semibold">Your Site</h3>
            <button 
              className="px-4 py-2 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: colors.primary }}
            >
              Sign Up
            </button>
          </div>

          {/* Content example */}
          <div className="space-y-3">
            <h4 className="font-medium">Welcome to your site</h4>
            <p style={{ color: colors.mutedForeground }}>
              This is how your content will look with the selected color scheme.
            </p>
            <button 
              className="inline-flex items-center px-3 py-2 rounded text-sm"
              style={{ 
                backgroundColor: colors.muted,
                color: colors.foreground,
                border: `1px solid ${colors.border}`
              }}
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ColorPalettePicker