import React from 'react'
import { LucideIcon, ArrowUp, ArrowDown, Activity } from 'lucide-react'

interface PointsWidgetProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray'
  className?: string
  subtitle?: string
  loading?: boolean
}

const PointsWidget: React.FC<PointsWidgetProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = 'blue',
  className = '',
  subtitle,
  loading = false
}) => {
  const getColorClasses = () => {
    const colors = {
      blue: {
        bg: 'border-l-blue-500',
        icon: 'text-blue-500',
        value: 'text-gray-900'
      },
      green: {
        bg: 'border-l-green-500',
        icon: 'text-green-500',
        value: 'text-gray-900'
      },
      purple: {
        bg: 'border-l-purple-500',
        icon: 'text-purple-500',
        value: 'text-gray-900'
      },
      orange: {
        bg: 'border-l-orange-500',
        icon: 'text-orange-500',
        value: 'text-gray-900'
      },
      red: {
        bg: 'border-l-red-500',
        icon: 'text-red-500',
        value: 'text-gray-900'
      },
      gray: {
        bg: 'border-l-gray-500',
        icon: 'text-gray-500',
        value: 'text-gray-900'
      }
    }
    return colors[color]
  }

  const getTrendIcon = () => {
    if (change === undefined) return null
    if (change > 0) return <ArrowUp className="w-3 h-3 text-green-500" />
    if (change < 0) return <ArrowDown className="w-3 h-3 text-red-500" />
    return <Activity className="w-3 h-3 text-gray-500" />
  }

  const getTrendColor = () => {
    if (change === undefined) return 'text-gray-500'
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatChange = () => {
    if (change === undefined) return ''
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  const colorClasses = getColorClasses()

  if (loading) {
    return (
      <div className={`wp-card border-l-4 ${colorClasses.bg} ${className}`}>
        <div className="wp-card-body">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>
            <div className="ml-4">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`wp-card border-l-4 ${colorClasses.bg} ${className}`}>
      <div className="wp-card-body">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses.value} mb-1`}>
              {value}
            </p>
            
            {(change !== undefined || subtitle) && (
              <div className="flex items-center gap-2">
                {change !== undefined && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon()}
                    <span className={`text-xs font-medium ${getTrendColor()}`}>
                      {formatChange()}
                    </span>
                  </div>
                )}
                {subtitle && (
                  <span className="text-xs text-gray-500">
                    {change !== undefined && '•'} {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="ml-4">
            <Icon className={`w-8 h-8 ${colorClasses.icon}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PointsWidget