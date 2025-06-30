import React, { useState } from 'react'
import { Settings, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQProps {
  data: {
    title: string
    items: FAQItem[]
    allowMultiple: boolean
    style?: 'default' | 'bordered' | 'minimal'
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const FAQ: React.FC<FAQProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]))
  const [editingItem, setEditingItem] = useState<number | null>(null)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const updateItem = (index: number, key: string, value: any) => {
    const newItems = [...data.items]
    newItems[index] = { ...newItems[index], [key]: value }
    updateData('items', newItems)
  }

  const addItem = () => {
    const newItems = [...data.items, {
      question: '새로운 질문을 입력하세요',
      answer: '답변을 입력하세요'
    }]
    updateData('items', newItems)
  }

  const removeItem = (index: number) => {
    const newItems = data.items.filter((_, i) => i !== index)
    updateData('items', newItems)
    
    // Update open items
    const newOpenItems = new Set<number>()
    openItems.forEach(openIndex => {
      if (openIndex < index) {
        newOpenItems.add(openIndex)
      } else if (openIndex > index) {
        newOpenItems.add(openIndex - 1)
      }
    })
    setOpenItems(newOpenItems)
  }

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems)
    
    if (data.allowMultiple) {
      // Allow multiple items to be open
      if (newOpenItems.has(index)) {
        newOpenItems.delete(index)
      } else {
        newOpenItems.add(index)
      }
    } else {
      // Only allow one item to be open (accordion)
      if (newOpenItems.has(index)) {
        newOpenItems.clear()
      } else {
        newOpenItems.clear()
        newOpenItems.add(index)
      }
    }
    
    setOpenItems(newOpenItems)
  }

  const getItemStyles = () => {
    switch (data.style) {
      case 'bordered':
        return {
          container: 'border border-gray-200 rounded-lg',
          item: 'border-b border-gray-200 last:border-b-0'
        }
      case 'minimal':
        return {
          container: '',
          item: 'border-b border-gray-100 last:border-b-0 py-2'
        }
      default:
        return {
          container: 'bg-gray-50 rounded-lg',
          item: 'border-b border-gray-200 last:border-b-0'
        }
    }
  }

  const styles = getItemStyles()

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

      <div className="max-w-3xl mx-auto p-8">
        {/* Title */}
        <h2 
          className="text-2xl font-bold text-gray-900 mb-8 text-center"
          contentEditable={isSelected}
          suppressContentEditableWarning
          onBlur={(e) => updateData('title', e.currentTarget.textContent)}
        >
          {data.title}
        </h2>

        {/* FAQ Items */}
        <div className={styles.container}>
          {data.items.map((item, index) => (
            <div key={index} className={`relative group ${styles.item}`}>
              {/* Delete Button */}
              {isSelected && data.items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

              {/* Question */}
              <button
                onClick={() => toggleItem(index)}
                className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              >
                <div className="flex items-center justify-between">
                  <h3 
                    className="text-lg font-medium text-gray-900 pr-8"
                    contentEditable={editingItem === index}
                    suppressContentEditableWarning
                    onBlur={(e) => updateItem(index, 'question', e.currentTarget.textContent)}
                    onClick={(e) => {
                      if (isSelected) {
                        e.stopPropagation()
                        setEditingItem(editingItem === index ? null : index)
                      }
                    }}
                  >
                    {item.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openItems.has(index) ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </div>
              </button>

              {/* Answer */}
              {openItems.has(index) && (
                <div className="px-4 pb-4">
                  <div 
                    className="text-gray-600 leading-relaxed"
                    contentEditable={editingItem === index}
                    suppressContentEditableWarning
                    onBlur={(e) => updateItem(index, 'answer', e.currentTarget.textContent)}
                    onClick={(e) => {
                      if (isSelected) {
                        e.stopPropagation()
                        setEditingItem(editingItem === index ? null : index)
                      }
                    }}
                  >
                    {item.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Item Button */}
        {isSelected && (
          <div className="text-center mt-6">
            <button
              onClick={addItem}
              className="wp-button-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              질문 추가
            </button>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-64">
          <h3 className="font-medium text-gray-900 mb-4">FAQ 설정</h3>
          
          <div className="space-y-4">
            {/* Style */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">스타일</label>
              <select
                value={data.style || 'default'}
                onChange={(e) => updateData('style', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="default">기본</option>
                <option value="bordered">테두리</option>
                <option value="minimal">미니멀</option>
              </select>
            </div>

            {/* Allow Multiple */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.allowMultiple}
                  onChange={(e) => updateData('allowMultiple', e.target.checked)}
                  className="rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-700">다중 열기 허용</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                체크하지 않으면 아코디언 방식으로 동작합니다
              </p>
            </div>

            {/* Quick Actions */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">빠른 동작</label>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const newOpenItems = new Set<number>()
                    data.items.forEach((_, index) => newOpenItems.add(index))
                    setOpenItems(newOpenItems)
                  }}
                  className="w-full text-left text-sm text-blue-600 hover:text-blue-700"
                >
                  모두 열기
                </button>
                <button
                  onClick={() => setOpenItems(new Set())}
                  className="w-full text-left text-sm text-blue-600 hover:text-blue-700"
                >
                  모두 닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FAQ