/**
 * ZoneToolbar - Editor Toolbar for Zone-based Content
 * Provides tools and controls for editing zone-based content
 */

import React from 'react'
import { LayoutType } from '@o4o/types'
import { 
  Monitor, 
  Tablet, 
  Smartphone, 
  Grid, 
  Columns, 
  Square,
  Eye,
  EyeOff,
  Save,
  Undo,
  Redo,
  Settings
} from 'lucide-react'

interface ZoneToolbarProps {
  viewMode: 'desktop' | 'tablet' | 'mobile'
  onViewModeChange: (mode: 'desktop' | 'tablet' | 'mobile') => void
  layout?: LayoutType
  onLayoutChange?: (layout: LayoutType) => void
  showConstraints?: boolean
  onToggleConstraints?: () => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  onSave?: () => void
  onSettings?: () => void
}

export const ZoneToolbar: React.FC<ZoneToolbarProps> = ({
  viewMode,
  onViewModeChange,
  layout = 'single-column',
  onLayoutChange,
  showConstraints = false,
  onToggleConstraints,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSave,
  onSettings
}) => {
  const viewModes = [
    { id: 'desktop', label: 'Desktop', icon: Monitor },
    { id: 'tablet', label: 'Tablet', icon: Tablet },
    { id: 'mobile', label: 'Mobile', icon: Smartphone }
  ] as const

  const layoutOptions = [
    { id: 'single-column', label: 'Single Column', icon: Square },
    { id: 'two-column', label: 'Two Column', icon: Columns },
    { id: 'three-column', label: 'Three Column', icon: Grid },
    { id: 'landing', label: 'Landing Page', icon: Grid }
  ] as const

  return (
    <div className="zone-toolbar flex items-center space-x-4 px-4 py-2 bg-white border-b border-gray-200">
      {/* View Mode Selector */}
      <div className="view-mode-selector flex items-center space-x-1 bg-gray-100 rounded p-1">
        {viewModes.map((mode) => {
          const Icon = mode.icon
          return (
            <button
              key={mode.id}
              onClick={() => onViewModeChange(mode.id)}
              className={`p-2 rounded transition-colors ${
                viewMode === mode.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title={mode.label}
              aria-label={`Switch to ${mode.label} view`}
            >
              <Icon className="w-4 h-4" />
            </button>
          )
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Layout Selector */}
      {onLayoutChange && (
        <>
          <div className="layout-selector flex items-center space-x-2">
            <label className="text-xs font-medium text-gray-700">Layout:</label>
            <select
              value={layout}
              onChange={(e) => onLayoutChange(e.target.value as LayoutType)}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {layoutOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300" />
        </>
      )}

      {/* Undo/Redo */}
      {(onUndo || onRedo) && (
        <>
          <div className="undo-redo flex items-center space-x-1">
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-2 rounded transition-colors ${
                  canUndo
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title="Undo"
                aria-label="Undo last action"
              >
                <Undo className="w-4 h-4" />
              </button>
            )}
            {onRedo && (
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className={`p-2 rounded transition-colors ${
                  canRedo
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
                title="Redo"
                aria-label="Redo last action"
              >
                <Redo className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-gray-300" />
        </>
      )}

      {/* Constraints Toggle */}
      {onToggleConstraints && (
        <button
          onClick={onToggleConstraints}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors ${
            showConstraints
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title={showConstraints ? 'Hide constraints' : 'Show constraints'}
        >
          {showConstraints ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          <span className="text-sm">Constraints</span>
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Side Actions */}
      <div className="toolbar-actions flex items-center space-x-2">
        {/* Settings */}
        {onSettings && (
          <button
            onClick={onSettings}
            className="p-2 text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Editor settings"
            aria-label="Open editor settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Save */}
        {onSave && (
          <button
            onClick={onSave}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            title="Save changes"
            aria-label="Save changes"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">Save</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default ZoneToolbar