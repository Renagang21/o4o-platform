import React, { useState } from 'react'
import { Settings, Plus, Trash2, Grid3X3, Star, Heart, Check, Zap, Shield, Award, Target, Lightbulb, Users, Globe, Package, Smartphone } from 'lucide-react'

interface Feature {
  title: string
  description: string
  icon: string
}

interface FeatureGridProps {
  data: {
    columns: number
    features: Feature[]
    alignment?: 'left' | 'center' | 'right'
    iconSize?: 'small' | 'medium' | 'large'
    iconStyle?: 'filled' | 'outline'
    spacing?: 'tight' | 'normal' | 'loose'
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const iconMap: Record<string, React.ComponentType<any>> = {
  star: Star,
  heart: Heart,
  check: Check,
  zap: Zap,
  shield: Shield,
  award: Award,
  target: Target,
  lightbulb: Lightbulb,
  users: Users,
  globe: Globe,
  package: Package,
  smartphone: Smartphone
}

const FeatureGrid: React.FC<FeatureGridProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [editingFeature, setEditingFeature] = useState<number | null>(null)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const updateFeature = (index: number, key: string, value: any) => {
    const newFeatures = [...data.features]
    newFeatures[index] = { ...newFeatures[index], [key]: value }
    updateData('features', newFeatures)
  }

  const addFeature = () => {
    const newFeatures = [...data.features, {
      title: '새 기능',
      description: '기능에 대한 설명을 입력하세요',
      icon: 'star'
    }]
    updateData('features', newFeatures)
  }

  const removeFeature = (index: number) => {
    const newFeatures = data.features.filter((_, i) => i !== index)
    updateData('features', newFeatures)
  }

  const getGridClass = () => {
    return `grid gap-${data.spacing === 'tight' ? '4' : data.spacing === 'loose' ? '8' : '6'} ${
      data.columns === 2 ? 'md:grid-cols-2' :
      data.columns === 3 ? 'md:grid-cols-3' :
      data.columns === 4 ? 'md:grid-cols-4' :
      'md:grid-cols-3'
    }`
  }

  const getAlignmentClass = () => {
    switch (data.alignment) {
      case 'left': return 'text-left'
      case 'right': return 'text-right'
      default: return 'text-center'
    }
  }

  const getIconSize = () => {
    switch (data.iconSize) {
      case 'small': return 'w-8 h-8'
      case 'large': return 'w-16 h-16'
      default: return 'w-12 h-12'
    }
  }

  const renderIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Star
    const iconClass = `${getIconSize()} ${
      data.iconStyle === 'filled' ? 'text-blue-600' : 'text-blue-600'
    }`

    if (data.iconStyle === 'filled') {
      return (
        <div className={`inline-flex items-center justify-center ${getIconSize()} bg-blue-100 rounded-lg p-3`}>
          <IconComponent className="w-full h-full text-blue-600" />
        </div>
      )
    }

    return <IconComponent className={iconClass} />
  }

  return (
    <div className={`relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Settings Button */}
      {isSelected && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      {/* Features Grid */}
      <div className={`p-8 ${getGridClass()}`}>
        {data.features.map((feature, index) => (
          <div 
            key={index}
            className={`relative group ${getAlignmentClass()}`}
            onClick={() => setEditingFeature(editingFeature === index ? null : index)}
          >
            {/* Feature Content */}
            <div className={`${data.alignment === 'center' ? 'flex flex-col items-center' : ''}`}>
              <div className="mb-4">
                {renderIcon(feature.icon)}
              </div>
              
              <h3 
                className="text-xl font-semibold text-gray-900 mb-2"
                contentEditable={editingFeature === index}
                suppressContentEditableWarning
                onBlur={(e) => updateFeature(index, 'title', e.currentTarget.textContent)}
              >
                {feature.title}
              </h3>
              
              <p 
                className="text-gray-600"
                contentEditable={editingFeature === index}
                suppressContentEditableWarning
                onBlur={(e) => updateFeature(index, 'description', e.currentTarget.textContent)}
              >
                {feature.description}
              </p>
            </div>

            {/* Delete Button */}
            {isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeFeature(index)
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}

            {/* Icon Selector */}
            {editingFeature === index && (
              <div className="absolute top-0 left-0 bg-white rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 z-20">
                {Object.keys(iconMap).map(iconName => {
                  const IconComponent = iconMap[iconName]
                  return (
                    <button
                      key={iconName}
                      onClick={(e) => {
                        e.stopPropagation()
                        updateFeature(index, 'icon', iconName)
                        setEditingFeature(null)
                      }}
                      className={`p-2 rounded hover:bg-gray-100 ${
                        feature.icon === iconName ? 'bg-blue-100' : ''
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Add Feature Button */}
        {isSelected && (
          <button
            onClick={addFeature}
            className="flex items-center justify-center h-full min-h-[150px] border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            <div className="text-center">
              <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-500">기능 추가</span>
            </div>
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-64">
          <h3 className="font-medium text-gray-900 mb-4">기능 그리드 설정</h3>
          
          <div className="space-y-4">
            {/* Columns */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">열 개수</label>
              <select
                value={data.columns}
                onChange={(e) => updateData('columns', parseInt(e.target.value))}
                className="w-full rounded border-gray-300"
              >
                <option value={2}>2열</option>
                <option value={3}>3열</option>
                <option value={4}>4열</option>
              </select>
            </div>

            {/* Alignment */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">정렬</label>
              <select
                value={data.alignment || 'center'}
                onChange={(e) => updateData('alignment', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="left">왼쪽</option>
                <option value="center">가운데</option>
                <option value="right">오른쪽</option>
              </select>
            </div>

            {/* Icon Size */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">아이콘 크기</label>
              <select
                value={data.iconSize || 'medium'}
                onChange={(e) => updateData('iconSize', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="small">작게</option>
                <option value="medium">보통</option>
                <option value="large">크게</option>
              </select>
            </div>

            {/* Icon Style */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">아이콘 스타일</label>
              <select
                value={data.iconStyle || 'outline'}
                onChange={(e) => updateData('iconStyle', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="outline">윤곽선</option>
                <option value="filled">채움</option>
              </select>
            </div>

            {/* Spacing */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">간격</label>
              <select
                value={data.spacing || 'normal'}
                onChange={(e) => updateData('spacing', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="tight">좁게</option>
                <option value="normal">보통</option>
                <option value="loose">넓게</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeatureGrid