/**
 * ZoneSelector - Zone selection sidebar component
 * Displays available zones and their status
 */

import React from 'react'
import { 
  Zone, 
  LayoutConfig, 
  ZoneValidationResult,
  ZoneType 
} from '@o4o/types'
import { 
  Layout, 
  Header,
  Sidebar, 
  FooterIcon, 
  Star,
  AlertTriangle,
  CheckCircle,
  Lock,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react'

interface ZoneSelectorProps {
  zones: Record<string, Zone>
  selectedZoneId: string
  onZoneSelect: (zoneId: string) => void
  layoutConfig?: LayoutConfig
  validationResult?: ZoneValidationResult
  className?: string
}

// Zone type icons mapping
const ZONE_ICONS: Record<ZoneType, React.ComponentType<any>> = {
  header: Header,
  footer: FooterIcon,
  main: Layout,
  sidebar: Sidebar,
  hero: Star,
  custom: Settings
}

// Zone type colors
const ZONE_COLORS: Record<ZoneType, string> = {
  header: 'text-blue-600 bg-blue-50',
  footer: 'text-green-600 bg-green-50',
  main: 'text-purple-600 bg-purple-50',
  sidebar: 'text-orange-600 bg-orange-50',
  hero: 'text-indigo-600 bg-indigo-50',
  custom: 'text-gray-600 bg-gray-50'
}

export const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  zones,
  selectedZoneId,
  onZoneSelect,
  layoutConfig,
  validationResult,
  className = ''
}) => {
  // Get zone validation errors
  const getZoneErrors = (zoneId: string) => {
    return validationResult?.errors?.filter(error => error.zoneId === zoneId) || []
  }

  // Get zone status
  const getZoneStatus = (zone: Zone, zoneId: string) => {
    const errors = getZoneErrors(zoneId)
    if (errors.length > 0) return 'error'
    
    if (zone.constraints.required && zone.blocks.length === 0) return 'warning'
    
    return 'valid'
  }

  // Check if zone is visible in current layout
  const isZoneVisible = (zoneId: string) => {
    if (!layoutConfig) return true
    
    // Check if zone is included in current layout
    const currentLayout = layoutConfig.layouts[Object.keys(layoutConfig.layouts)[0]]
    return Object.keys(currentLayout?.zones || {}).includes(zoneId)
  }

  // Sort zones by display order
  const sortedZones = Object.entries(zones).sort(([aId, a], [bId, b]) => {
    const order = ['header', 'hero', 'main', 'sidebar', 'footer']
    const aIndex = order.indexOf(a.type)
    const bIndex = order.indexOf(b.type)
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex
    }
    
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    
    return aId.localeCompare(bId)
  })

  return (
    <div className={`zone-selector bg-white ${className}`}>
      {/* Header */}
      <div className="zone-selector-header p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Page Zones</h3>
        <p className="text-xs text-gray-500">
          Select a zone to edit its content
        </p>
      </div>

      {/* Zone List */}
      <div className="zone-list">
        {sortedZones.map(([zoneId, zone]) => {
          const IconComponent = ZONE_ICONS[zone.type] || Layout
          const colorClass = ZONE_COLORS[zone.type] || ZONE_COLORS.custom
          const status = getZoneStatus(zone, zoneId)
          const errors = getZoneErrors(zoneId)
          const isSelected = selectedZoneId === zoneId
          const isVisible = isZoneVisible(zoneId)
          
          return (
            <div
              key={zoneId}
              className={`zone-item cursor-pointer border-b border-gray-100 transition-colors ${
                isSelected 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onZoneSelect(zoneId)}
            >
              <div className="zone-item-content p-3">
                {/* Zone Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-1">
                    <div className={`zone-icon p-1.5 rounded ${colorClass}`}>
                      <IconComponent size={14} />
                    </div>
                    
                    <div className="zone-info flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {zone.name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate">
                        {zone.blocks.length} block{zone.blocks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Zone Status */}
                  <div className="flex items-center space-x-1">
                    {!isVisible && (
                      <EyeOff size={12} className="text-gray-400" title="Hidden in current layout" />
                    )}
                    
                    {!zone.editable && (
                      <Lock size={12} className="text-gray-400" title="Read-only zone" />
                    )}
                    
                    {status === 'error' && (
                      <AlertTriangle size={12} className="text-red-500" title="Has validation errors" />
                    )}
                    
                    {status === 'warning' && (
                      <AlertTriangle size={12} className="text-yellow-500" title="Has warnings" />
                    )}
                    
                    {status === 'valid' && zone.blocks.length > 0 && (
                      <CheckCircle size={12} className="text-green-500" title="Valid zone" />
                    )}
                  </div>
                </div>

                {/* Zone Description */}
                {zone.description && (
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                    {zone.description}
                  </p>
                )}

                {/* Zone Constraints Info */}
                <div className="zone-constraints text-xs">
                  <div className="flex items-center justify-between text-gray-500">
                    <span>
                      {zone.constraints.required && (
                        <span className="text-red-500">Required</span>
                      )}
                      {!zone.constraints.required && (
                        <span>Optional</span>
                      )}
                    </span>
                    
                    <span>
                      {zone.constraints.maxBlocks 
                        ? `Max: ${zone.constraints.maxBlocks}`
                        : 'Unlimited'
                      }
                    </span>
                  </div>
                  
                  {/* Progress bar for block limits */}
                  {zone.constraints.maxBlocks && (
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                          className={`h-1 rounded-full transition-all ${
                            zone.blocks.length >= zone.constraints.maxBlocks
                              ? 'bg-red-500'
                              : zone.blocks.length >= zone.constraints.maxBlocks * 0.8
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((zone.blocks.length / zone.constraints.maxBlocks) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Error Messages */}
                {errors.length > 0 && (
                  <div className="zone-errors mt-2 p-2 bg-red-50 rounded text-xs">
                    {errors.map((error, index) => (
                      <div key={index} className="text-red-700 flex items-start">
                        <AlertTriangle size={10} className="mr-1 mt-0.5 flex-shrink-0" />
                        <span>{error.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Block Type Constraints */}
                {isSelected && zone.constraints.allowedBlocks.length > 0 && (
                  <div className="allowed-blocks mt-2 p-2 bg-gray-50 rounded">
                    <p className="text-xs font-medium text-gray-700 mb-1">Allowed blocks:</p>
                    <div className="flex flex-wrap gap-1">
                      {zone.constraints.allowedBlocks.slice(0, 3).map(blockType => (
                        <span
                          key={blockType}
                          className="inline-block px-1.5 py-0.5 bg-white rounded text-xs text-gray-600 border"
                        >
                          {blockType.replace('core/', '')}
                        </span>
                      ))}
                      {zone.constraints.allowedBlocks.length > 3 && (
                        <span className="inline-block px-1.5 py-0.5 text-xs text-gray-500">
                          +{zone.constraints.allowedBlocks.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Zone Stats Footer */}
      <div className="zone-selector-footer p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {Object.values(zones).reduce((sum, zone) => sum + zone.blocks.length, 0)}
            </div>
            <div className="text-gray-500">Total Blocks</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {Object.values(zones).filter(zone => zone.constraints.required).length}
            </div>
            <div className="text-gray-500">Required Zones</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ZoneSelector