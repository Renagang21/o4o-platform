/**
 * ZoneInspector - Zone and Block Properties Inspector Panel
 * Displays and allows editing of zone and block properties
 */

import React from 'react'
import { Zone, ZoneBlock, ZoneConfig } from '@o4o/types'
import { X, Settings, Type, Image, Layout, Code } from 'lucide-react'

interface ZoneInspectorProps {
  zone?: Zone
  selectedBlock?: ZoneBlock
  zoneConfig?: ZoneConfig
  onBlockUpdate?: (updates: Partial<ZoneBlock>) => void
  onClose?: () => void
}

export const ZoneInspector: React.FC<ZoneInspectorProps> = ({
  zone,
  selectedBlock,
  zoneConfig,
  onBlockUpdate,
  onClose
}) => {
  const handleAttributeChange = (key: string, value: any) => {
    if (!selectedBlock || !onBlockUpdate) return
    
    onBlockUpdate({
      attributes: {
        ...selectedBlock.attributes,
        [key]: value
      }
    })
  }

  const handleContentChange = (content: string) => {
    if (!selectedBlock || !onBlockUpdate) return
    
    onBlockUpdate({ content })
  }

  const getBlockIcon = (type: string) => {
    switch (type) {
      case 'text':
      case 'heading':
        return <Type className="w-4 h-4" />
      case 'image':
      case 'gallery':
        return <Image className="w-4 h-4" />
      case 'layout':
      case 'columns':
        return <Layout className="w-4 h-4" />
      case 'code':
      case 'html':
        return <Code className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  return (
    <div className="zone-inspector h-full flex flex-col bg-white">
      {/* Header */}
      <div className="inspector-header flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          {selectedBlock ? 'Block Properties' : 'Zone Properties'}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="inspector-content flex-1 overflow-y-auto">
        {selectedBlock ? (
          <div className="p-4 space-y-4">
            {/* Block Type */}
            <div className="block-type">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Block Type
              </label>
              <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                {getBlockIcon(selectedBlock.type)}
                <span className="text-sm font-medium capitalize">
                  {selectedBlock.type.replace(/-/g, ' ')}
                </span>
              </div>
            </div>

            {/* Block ID */}
            <div className="block-id">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Block ID
              </label>
              <input
                type="text"
                value={selectedBlock.id}
                readOnly
                className="w-full px-2 py-1 text-sm bg-gray-50 border border-gray-200 rounded"
              />
            </div>

            {/* Block Content */}
            {selectedBlock.content !== undefined && (
              <div className="block-content">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  value={selectedBlock.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-y"
                  rows={4}
                  placeholder="Enter block content..."
                />
              </div>
            )}

            {/* Block Attributes */}
            {selectedBlock.attributes && Object.keys(selectedBlock.attributes).length > 0 && (
              <div className="block-attributes">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Attributes
                </label>
                <div className="space-y-2">
                  {Object.entries(selectedBlock.attributes).map(([key, value]) => (
                    <div key={key} className="attribute-field">
                      <label className="block text-xs text-gray-600 mb-1 capitalize">
                        {key.replace(/_/g, ' ')}
                      </label>
                      {typeof value === 'boolean' ? (
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleAttributeChange(key, e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{value ? 'Enabled' : 'Disabled'}</span>
                        </label>
                      ) : typeof value === 'number' ? (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => handleAttributeChange(key, parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value as string}
                          onChange={(e) => handleAttributeChange(key, e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block Order */}
            {selectedBlock.order !== undefined && (
              <div className="block-order">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={selectedBlock.order}
                  onChange={(e) => onBlockUpdate?.({ order: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                  min="0"
                />
              </div>
            )}
          </div>
        ) : zone ? (
          <div className="p-4 space-y-4">
            {/* Zone Info */}
            <div className="zone-info">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Zone Name
              </label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">{zone.name}</span>
              </div>
            </div>

            {/* Zone Type */}
            <div className="zone-type">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Zone Type
              </label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="text-sm capitalize">{zone.type}</span>
              </div>
            </div>

            {/* Zone Description */}
            {zone.description && (
              <div className="zone-description">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                  {zone.description}
                </p>
              </div>
            )}

            {/* Zone Constraints */}
            {zone.constraints && (
              <div className="zone-constraints">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Constraints
                </label>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Editable:</span>
                    <span className="font-medium">{zone.editable ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Blocks:</span>
                    <span className="font-medium">
                      {zone.constraints.maxBlocks || 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Blocks:</span>
                    <span className="font-medium">{zone.constraints.minBlocks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required:</span>
                    <span className="font-medium">
                      {zone.constraints.required ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Zone Block Count */}
            <div className="zone-blocks">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Current Blocks
              </label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">{zone.blocks.length} blocks</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">Select a block or zone to view properties</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {selectedBlock && onBlockUpdate && (
        <div className="inspector-footer px-4 py-3 border-t border-gray-200">
          <button
            onClick={() => onBlockUpdate({ attributes: {} })}
            className="w-full px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Reset Attributes
          </button>
        </div>
      )}
    </div>
  )
}

export default ZoneInspector