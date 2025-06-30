import React, { useState } from 'react'
import { Settings, Type, Layout, ArrowLeftRight } from 'lucide-react'
import TipTapBlock from '../TipTapBlock'

interface TwoColumnProps {
  data: {
    leftContent: any
    rightContent: any
    leftWidth: number
    gap: 'small' | 'medium' | 'large'
    verticalAlign: 'top' | 'center' | 'bottom'
    reverse?: boolean
    leftBackground?: string
    rightBackground?: string
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const TwoColumn: React.FC<TwoColumnProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const updateLeftContent = (content: any) => {
    updateData('leftContent', content)
  }

  const updateRightContent = (content: any) => {
    updateData('rightContent', content)
  }

  const getGapClass = () => {
    switch (data.gap) {
      case 'small': return 'gap-4'
      case 'large': return 'gap-12'
      default: return 'gap-8'
    }
  }

  const getVerticalAlignClass = () => {
    switch (data.verticalAlign) {
      case 'center': return 'items-center'
      case 'bottom': return 'items-end'
      default: return 'items-start'
    }
  }

  const getColumnOrder = () => {
    if (data.reverse) {
      return {
        left: 'order-2',
        right: 'order-1'
      }
    }
    return {
      left: 'order-1',
      right: 'order-2'
    }
  }

  const leftWidth = data.leftWidth || 50
  const rightWidth = 100 - leftWidth

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

      {/* Two Column Layout */}
      <div className={`p-8 grid md:grid-cols-12 ${getGapClass()} ${getVerticalAlignClass()}`}>
        {/* Left Column */}
        <div 
          className={`col-span-12 md:col-span-${Math.round(leftWidth * 12 / 100)} ${getColumnOrder().left}`}
          style={{ backgroundColor: data.leftBackground }}
        >
          <div className={data.leftBackground ? 'p-4 rounded' : ''}>
            <TipTapBlock
              data={{ content: data.leftContent }}
              onChange={(newData) => updateLeftContent(newData.content)}
              blockType="paragraph"
              isSelected={false}
            />
          </div>
        </div>

        {/* Right Column */}
        <div 
          className={`col-span-12 md:col-span-${Math.round(rightWidth * 12 / 100)} ${getColumnOrder().right}`}
          style={{ backgroundColor: data.rightBackground }}
        >
          <div className={data.rightBackground ? 'p-4 rounded' : ''}>
            <TipTapBlock
              data={{ content: data.rightContent }}
              onChange={(newData) => updateRightContent(newData.content)}
              blockType="paragraph"
              isSelected={false}
            />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-72">
          <h3 className="font-medium text-gray-900 mb-4">2단 레이아웃 설정</h3>
          
          <div className="space-y-4">
            {/* Width Distribution */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                비율 (왼쪽: {leftWidth}% / 오른쪽: {rightWidth}%)
              </label>
              <input
                type="range"
                min="20"
                max="80"
                value={leftWidth}
                onChange={(e) => updateData('leftWidth', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>20%</span>
                <span>50%</span>
                <span>80%</span>
              </div>
            </div>

            {/* Quick Ratios */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">빠른 설정</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateData('leftWidth', 33)}
                  className={`p-2 text-xs rounded border ${
                    Math.abs(leftWidth - 33) < 5 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  1:2
                </button>
                <button
                  onClick={() => updateData('leftWidth', 50)}
                  className={`p-2 text-xs rounded border ${
                    Math.abs(leftWidth - 50) < 5 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  1:1
                </button>
                <button
                  onClick={() => updateData('leftWidth', 67)}
                  className={`p-2 text-xs rounded border ${
                    Math.abs(leftWidth - 67) < 5 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  2:1
                </button>
              </div>
            </div>

            {/* Gap */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">간격</label>
              <select
                value={data.gap || 'medium'}
                onChange={(e) => updateData('gap', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="small">작게</option>
                <option value="medium">보통</option>
                <option value="large">크게</option>
              </select>
            </div>

            {/* Vertical Alignment */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">세로 정렬</label>
              <select
                value={data.verticalAlign || 'top'}
                onChange={(e) => updateData('verticalAlign', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="top">상단</option>
                <option value="center">가운데</option>
                <option value="bottom">하단</option>
              </select>
            </div>

            {/* Reverse Order */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.reverse || false}
                  onChange={(e) => updateData('reverse', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">순서 바꾸기</span>
              </label>
            </div>

            {/* Background Colors */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">배경색</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">왼쪽</label>
                  <input
                    type="color"
                    value={data.leftBackground || '#ffffff'}
                    onChange={(e) => updateData('leftBackground', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                  <button
                    onClick={() => updateData('leftBackground', '')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    투명
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-600">오른쪽</label>
                  <input
                    type="color"
                    value={data.rightBackground || '#ffffff'}
                    onChange={(e) => updateData('rightBackground', e.target.value)}
                    className="w-full h-8 rounded cursor-pointer"
                  />
                  <button
                    onClick={() => updateData('rightBackground', '')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    투명
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TwoColumn