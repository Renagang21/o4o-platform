/**
 * ZoneConstraintIndicator - Visual indicator for zone constraints
 * Shows block limits, validation status, and constraint info
 */

import React from 'react'
import { Zone, ZoneConfig } from '@o4o/types'
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Lock, 
  Users, 
  Layers,
  Hash,
  Eye,
  EyeOff
} from 'lucide-react'

interface ZoneConstraintIndicatorProps {
  zone: Zone
  zoneId: string
  zoneConfig?: ZoneConfig
  compact?: boolean
  className?: string
}

export const ZoneConstraintIndicator: React.FC<ZoneConstraintIndicatorProps> = ({
  zone,
  zoneId,
  zoneConfig,
  compact = false,
  className = ''
}) => {
  const constraints = zone.constraints
  const rules = zoneConfig?.blockConstraintRules

  // Calculate constraint status
  const getConstraintStatus = () => {
    const issues = []
    
    // Check required zone
    if (constraints.required && zone.blocks.length === 0) {
      issues.push('Required zone is empty')
    }
    
    // Check min blocks
    if (constraints.minBlocks > 0 && zone.blocks.length < constraints.minBlocks) {
      issues.push(`Needs ${constraints.minBlocks - zone.blocks.length} more blocks`)
    }
    
    // Check max blocks
    if (constraints.maxBlocks && zone.blocks.length > constraints.maxBlocks) {
      issues.push(`${zone.blocks.length - constraints.maxBlocks} blocks over limit`)
    }
    
    // Check block types
    const invalidBlocks = zone.blocks.filter(block => 
      constraints.allowedBlocks.length > 0 && 
      !constraints.allowedBlocks.includes(block.type)
    )
    
    if (invalidBlocks.length > 0) {
      issues.push(`${invalidBlocks.length} invalid block types`)
    }
    
    return {
      hasIssues: issues.length > 0,
      issues,
      status: issues.length > 0 ? 'error' : 'valid' as 'error' | 'warning' | 'valid'
    }
  }

  const constraintStatus = getConstraintStatus()

  // Get block usage percentage
  const getUsagePercentage = () => {
    if (!constraints.maxBlocks) return null
    return Math.min((zone.blocks.length / constraints.maxBlocks) * 100, 100)
  }

  const usagePercentage = getUsagePercentage()

  if (compact) {
    return (
      <div className={`zone-constraint-indicator-compact flex items-center space-x-2 ${className}`}>
        {/* Status Icon */}
        <div className="flex items-center">
          {constraintStatus.status === 'error' && (
            <AlertTriangle size={16} className="text-red-500" />
          )}
          {constraintStatus.status === 'warning' && (
            <AlertTriangle size={16} className="text-yellow-500" />
          )}
          {constraintStatus.status === 'valid' && (
            <CheckCircle size={16} className="text-green-500" />
          )}
        </div>

        {/* Block Count */}
        <span className="text-sm text-gray-600">
          {zone.blocks.length}
          {constraints.maxBlocks && `/${constraints.maxBlocks}`}
        </span>

        {/* Usage Bar */}
        {usagePercentage !== null && (
          <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                usagePercentage >= 100 ? 'bg-red-500' :
                usagePercentage >= 80 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`zone-constraint-indicator bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <Info size={14} className="mr-2 text-gray-500" />
          Zone Constraints
        </h3>
        
        {/* Status Badge */}
        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          constraintStatus.status === 'error' ? 'bg-red-100 text-red-800' :
          constraintStatus.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {constraintStatus.status === 'error' && <AlertTriangle size={10} className="mr-1" />}
          {constraintStatus.status === 'warning' && <AlertTriangle size={10} className="mr-1" />}
          {constraintStatus.status === 'valid' && <CheckCircle size={10} className="mr-1" />}
          {constraintStatus.status === 'error' ? 'Issues' :
           constraintStatus.status === 'warning' ? 'Warnings' : 'Valid'}
        </div>
      </div>

      {/* Constraint Details */}
      <div className="space-y-3">
        {/* Block Count Constraint */}
        <div className="constraint-item">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 flex items-center">
              <Hash size={12} className="mr-1" />
              Block Count
            </span>
            <span className="text-xs text-gray-600">
              {zone.blocks.length}
              {constraints.maxBlocks ? `/${constraints.maxBlocks}` : ''}
            </span>
          </div>
          
          {/* Progress Bar */}
          {constraints.maxBlocks && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usagePercentage! >= 100 ? 'bg-red-500' :
                  usagePercentage! >= 80 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          )}
          
          {/* Min/Max Info */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Min: {constraints.minBlocks}</span>
            <span>Max: {constraints.maxBlocks || '∞'}</span>
          </div>
        </div>

        {/* Zone Properties */}
        <div className="constraint-item">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center">
              {constraints.required ? (
                <span className="inline-flex items-center text-red-600">
                  <AlertTriangle size={10} className="mr-1" />
                  Required
                </span>
              ) : (
                <span className="text-gray-500">Optional</span>
              )}
            </div>
            
            <div className="flex items-center">
              {zone.editable ? (
                <span className="inline-flex items-center text-green-600">
                  <Eye size={10} className="mr-1" />
                  Editable
                </span>
              ) : (
                <span className="inline-flex items-center text-gray-500">
                  <Lock size={10} className="mr-1" />
                  Read-only
                </span>
              )}
            </div>
            
            <div className="flex items-center">
              {constraints.allowNesting ? (
                <span className="inline-flex items-center text-blue-600">
                  <Layers size={10} className="mr-1" />
                  Nesting: {constraints.maxNestingLevel}
                </span>
              ) : (
                <span className="inline-flex items-center text-gray-500">
                  <Layers size={10} className="mr-1" />
                  No nesting
                </span>
              )}
            </div>
            
            <div className="flex items-center">
              {constraints.singleton ? (
                <span className="inline-flex items-center text-purple-600">
                  <Users size={10} className="mr-1" />
                  Singleton
                </span>
              ) : (
                <span className="text-gray-500">Multiple</span>
              )}
            </div>
          </div>
        </div>

        {/* Allowed Block Types */}
        {constraints.allowedBlocks.length > 0 && (
          <div className="constraint-item">
            <div className="text-xs font-medium text-gray-700 mb-2">Allowed Blocks:</div>
            <div className="flex flex-wrap gap-1">
              {constraints.allowedBlocks.slice(0, 6).map(blockType => (
                <span
                  key={blockType}
                  className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                >
                  {blockType.replace('core/', '')}
                </span>
              ))}
              {constraints.allowedBlocks.length > 6 && (
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                  +{constraints.allowedBlocks.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Constraint Issues */}
        {constraintStatus.hasIssues && (
          <div className="constraint-issues">
            <div className="text-xs font-medium text-red-700 mb-1">Issues:</div>
            <ul className="space-y-1">
              {constraintStatus.issues.map((issue, index) => (
                <li key={index} className="text-xs text-red-600 flex items-start">
                  <AlertTriangle size={10} className="mr-1 mt-0.5 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Global Block Rules */}
        {rules && Object.keys(rules).length > 0 && (
          <div className="constraint-item border-t border-gray-100 pt-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Global Rules:</div>
            <div className="space-y-1">
              {Object.entries(rules).map(([blockType, rule]) => {
                if (rule.allowedZones && !rule.allowedZones.includes(zoneId)) {
                  return null
                }
                
                return (
                  <div key={blockType} className="text-xs text-gray-600">
                    <span className="font-medium">{blockType.replace('core/', '')}</span>
                    {rule.maxInstances && ` (max: ${rule.maxInstances})`}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ZoneConstraintIndicator