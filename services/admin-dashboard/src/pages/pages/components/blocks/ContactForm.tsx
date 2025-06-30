import React, { useState } from 'react'
import { Settings, Plus, Trash2, Mail, Phone, User, MessageSquare } from 'lucide-react'

interface FormField {
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio'
  name: string
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
}

interface ContactFormProps {
  data: {
    title: string
    description: string
    fields: FormField[]
    submitText: string
    successMessage?: string
    layout?: 'single' | 'two-column'
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const ContactForm: React.FC<ContactFormProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [editingField, setEditingField] = useState<number | null>(null)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...data.fields]
    newFields[index] = { ...newFields[index], [key]: value }
    updateData('fields', newFields)
  }

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      type,
      name: `field_${Date.now()}`,
      label: '새 필드',
      required: false
    }
    
    if (type === 'select' || type === 'radio') {
      newField.options = ['옵션 1', '옵션 2']
    }
    
    const newFields = [...data.fields, newField]
    updateData('fields', newFields)
  }

  const removeField = (index: number) => {
    const newFields = data.fields.filter((_, i) => i !== index)
    updateData('fields', newFields)
  }

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'tel': return <Phone className="w-4 h-4" />
      case 'textarea': return <MessageSquare className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const renderField = (field: FormField, index: number) => {
    const isEditing = editingField === index

    return (
      <div key={index} className="relative group">
        {/* Field Controls */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={() => setEditingField(isEditing ? null : index)}
              className="bg-blue-500 text-white rounded-full p-1 text-xs"
            >
              <Settings className="w-3 h-3" />
            </button>
            <button
              onClick={() => removeField(index)}
              className="bg-red-500 text-white rounded-full p-1 text-xs"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Field Label */}
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <span 
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => updateField(index, 'label', e.currentTarget.textContent)}
          >
            {field.label}
          </span>
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {/* Field Input */}
        {field.type === 'textarea' ? (
          <textarea
            placeholder={field.placeholder || '내용을 입력하세요'}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            rows={4}
          />
        ) : field.type === 'select' ? (
          <select className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
            <option value="">선택하세요</option>
            {field.options?.map((option, optionIndex) => (
              <option key={optionIndex} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : field.type === 'checkbox' ? (
          <div className="space-y-2">
            {field.options?.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        ) : field.type === 'radio' ? (
          <div className="space-y-2">
            {field.options?.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center">
                <input
                  type="radio"
                  name={field.name}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type={field.type}
            placeholder={field.placeholder || field.label}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )}

        {/* Field Settings */}
        {isEditing && (
          <div className="mt-2 p-3 bg-gray-50 rounded border space-y-2">
            <div>
              <label className="text-xs text-gray-600">필드명</label>
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(index, 'name', e.target.value)}
                className="w-full text-xs rounded border-gray-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">플레이스홀더</label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField(index, 'placeholder', e.target.value)}
                className="w-full text-xs rounded border-gray-300"
              />
            </div>
            <label className="flex items-center text-xs">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(index, 'required', e.target.checked)}
                className="rounded mr-1"
              />
              필수 항목
            </label>
            
            {/* Options for select/radio/checkbox */}
            {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
              <div>
                <label className="text-xs text-gray-600">옵션 (줄바꿈으로 구분)</label>
                <textarea
                  value={field.options?.join('\n') || ''}
                  onChange={(e) => updateField(index, 'options', e.target.value.split('\n').filter(Boolean))}
                  className="w-full text-xs rounded border-gray-300"
                  rows={3}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
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

      <div className="max-w-2xl mx-auto p-8">
        {/* Form Header */}
        <div className="text-center mb-8">
          <h2 
            className="text-2xl font-bold text-gray-900 mb-4"
            contentEditable={isSelected}
            suppressContentEditableWarning
            onBlur={(e) => updateData('title', e.currentTarget.textContent)}
          >
            {data.title}
          </h2>
          <p 
            className="text-gray-600"
            contentEditable={isSelected}
            suppressContentEditableWarning
            onBlur={(e) => updateData('description', e.currentTarget.textContent)}
          >
            {data.description}
          </p>
        </div>

        {/* Form Fields */}
        <form className="space-y-6">
          <div className={data.layout === 'two-column' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-6'}>
            {data.fields.map((field, index) => 
              renderField(field, index)
            )}
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              contentEditable={isSelected}
              suppressContentEditableWarning
              onBlur={(e) => updateData('submitText', e.currentTarget.textContent)}
            >
              {data.submitText}
            </button>
          </div>
        </form>

        {/* Add Field Buttons */}
        {isSelected && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">필드 추가</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { type: 'text', label: '텍스트' },
                { type: 'email', label: '이메일' },
                { type: 'tel', label: '전화번호' },
                { type: 'textarea', label: '여러줄 텍스트' },
                { type: 'select', label: '선택' },
                { type: 'radio', label: '라디오' },
                { type: 'checkbox', label: '체크박스' }
              ].map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => addField(type as FormField['type'])}
                  className="flex items-center gap-2 p-2 text-xs bg-white border border-gray-200 rounded hover:border-blue-300 transition-colors"
                >
                  {getFieldIcon(type)}
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-64">
          <h3 className="font-medium text-gray-900 mb-4">문의 양식 설정</h3>
          
          <div className="space-y-4">
            {/* Layout */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">레이아웃</label>
              <select
                value={data.layout || 'single'}
                onChange={(e) => updateData('layout', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="single">단일 열</option>
                <option value="two-column">2열</option>
              </select>
            </div>

            {/* Success Message */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">성공 메시지</label>
              <textarea
                value={data.successMessage || ''}
                onChange={(e) => updateData('successMessage', e.target.value)}
                placeholder="메시지가 전송되었습니다."
                className="w-full text-sm rounded border-gray-300"
                rows={3}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContactForm