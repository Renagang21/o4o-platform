import React, { useState, useEffect } from 'react'
import { 
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Move,
  Settings,
  Eye,
  EyeOff,
  Copy,
  Type,
  Hash,
  Check,
  List,
  Calendar,
  Image,
  Link,
  Mail,
  Upload,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react'
import { FieldGroup, CustomField, CustomFieldType } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import { useParams, useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import toast from 'react-hot-toast'

const AddNew: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [fieldGroup, setFieldGroup] = useState<Partial<FieldGroup>>({
    title: '',
    description: '',
    fields: [],
    location: [],
    rules: {
      param: 'post_type',
      operator: '==',
      value: 'post'
    },
    options: {
      position: 'normal',
      style: 'default',
      labelPlacement: 'top',
      instructionPlacement: 'label',
      hideOnScreen: [],
      description: ''
    },
    active: true,
    order: 0
  })

  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [selectedFieldType, setSelectedFieldType] = useState<CustomFieldType>('text')

  useEffect(() => {
    if (isEdit && id) {
      loadFieldGroup()
    }
  }, [isEdit, id])

  const loadFieldGroup = async () => {
    try {
      setLoading(true)
      const response = await ContentApi.getFieldGroup(id!)
      setFieldGroup(response.data)
    } catch (error) {
      console.error('Failed to load field group:', error)
      toast.error('필드 그룹을 불러오는데 실패했습니다.')
      navigate('/custom-fields')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!fieldGroup.title?.trim()) {
      toast.error('필드 그룹 제목을 입력해주세요.')
      return
    }

    if (!fieldGroup.location || fieldGroup.location.length === 0) {
      toast.error('필드 그룹의 위치를 선택해주세요.')
      return
    }

    try {
      setSaving(true)
      
      if (isEdit && id) {
        await ContentApi.updateFieldGroup(id, fieldGroup)
        toast.success('필드 그룹이 업데이트되었습니다.')
      } else {
        await ContentApi.createFieldGroup(fieldGroup)
        toast.success('필드 그룹이 생성되었습니다.')
        navigate('/custom-fields')
      }
    } catch (error) {
      console.error('Failed to save field group:', error)
      toast.error('필드 그룹 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const addField = () => {
    const newField: Partial<CustomField> = {
      id: `field_${Date.now()}`,
      name: `field_${fieldGroup.fields?.length || 0 + 1}`,
      label: '새 필드',
      type: selectedFieldType,
      required: false,
      order: fieldGroup.fields?.length || 0,
      groupId: fieldGroup.id || ''
    }

    setFieldGroup(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField as CustomField]
    }))

    setExpandedFields(prev => new Set([...prev, newField.id!]))
  }

  const updateField = (fieldId: string, updates: Partial<CustomField>) => {
    setFieldGroup(prev => ({
      ...prev,
      fields: prev.fields?.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }))
  }

  const removeField = (fieldId: string) => {
    if (!confirm('이 필드를 삭제하시겠습니까?')) return

    setFieldGroup(prev => ({
      ...prev,
      fields: prev.fields?.filter(field => field.id !== fieldId)
    }))

    setExpandedFields(prev => {
      const newSet = new Set(prev)
      newSet.delete(fieldId)
      return newSet
    })
  }

  const duplicateField = (fieldId: string) => {
    const original = fieldGroup.fields?.find(f => f.id === fieldId)
    if (!original) return

    const duplicated: CustomField = {
      ...original,
      id: `field_${Date.now()}`,
      name: `${original.name}_copy`,
      label: `${original.label} (복사본)`,
      order: fieldGroup.fields?.length || 0
    }

    setFieldGroup(prev => ({
      ...prev,
      fields: [...(prev.fields || []), duplicated]
    }))
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(fieldGroup.fields || [])
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order numbers
    const reorderedFields = items.map((field, index) => ({
      ...field,
      order: index
    }))

    setFieldGroup(prev => ({
      ...prev,
      fields: reorderedFields
    }))
  }

  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldId)) {
        newSet.delete(fieldId)
      } else {
        newSet.add(fieldId)
      }
      return newSet
    })
  }

  const getFieldTypeIcon = (type: CustomFieldType) => {
    const icons = {
      text: Type,
      textarea: Type,
      number: Hash,
      email: Mail,
      url: Link,
      select: List,
      checkbox: Check,
      radio: Check,
      date: Calendar,
      datetime_local: Calendar,
      time: Calendar,
      image: Image,
      file: Upload,
      toggle: ToggleLeft,
      range: Hash,
      color: Hash,
      password: Hash
    }
    return icons[type] || Type
  }

  const fieldTypes = [
    { value: 'text', label: '텍스트', icon: Type },
    { value: 'textarea', label: '텍스트 영역', icon: Type },
    { value: 'number', label: '숫자', icon: Hash },
    { value: 'email', label: '이메일', icon: Mail },
    { value: 'url', label: 'URL', icon: Link },
    { value: 'select', label: '선택', icon: List },
    { value: 'checkbox', label: '체크박스', icon: Check },
    { value: 'radio', label: '라디오', icon: Check },
    { value: 'date', label: '날짜', icon: Calendar },
    { value: 'image', label: '이미지', icon: Image },
    { value: 'file', label: '파일', icon: Upload },
    { value: 'toggle', label: '토글', icon: ToggleLeft }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/custom-fields')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? '필드 그룹 편집' : '새 필드 그룹'}
            </h1>
            <p className="text-gray-600 mt-1">커스텀 필드 그룹을 설정합니다.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="wp-button-primary"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 설정</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  그룹 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fieldGroup.title || ''}
                  onChange={(e) => setFieldGroup(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="필드 그룹 제목을 입력하세요"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
                <textarea
                  value={fieldGroup.description || ''}
                  onChange={(e) => setFieldGroup(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="필드 그룹 설명을 입력하세요"
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={fieldGroup.active || false}
                  onChange={(e) => setFieldGroup(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded border-gray-300 mr-3"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  활성화
                </label>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">필드</h2>
              <div className="flex items-center gap-3">
                <select
                  value={selectedFieldType}
                  onChange={(e) => setSelectedFieldType(e.target.value as CustomFieldType)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {fieldTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addField}
                  className="wp-button-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  필드 추가
                </button>
              </div>
            </div>

            {fieldGroup.fields && fieldGroup.fields.length > 0 ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="fields">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {fieldGroup.fields.map((field, index) => (
                        <Draggable key={field.id} draggableId={field.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="border border-gray-200 rounded-lg"
                            >
                              {/* Field Header */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps}>
                                    <Move className="w-4 h-4 text-gray-400 cursor-move" />
                                  </div>
                                  
                                  {(() => {
                                    const IconComponent = getFieldTypeIcon(field.type)
                                    return <IconComponent className="w-4 h-4 text-gray-500" />
                                  })()}
                                  
                                  <span className="font-medium text-gray-900">
                                    {field.label}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    ({field.name})
                                  </span>
                                  {field.required && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      필수
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => duplicateField(field.id)}
                                    className="p-1 text-gray-500 hover:text-gray-700"
                                    title="복제"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => toggleFieldExpanded(field.id)}
                                    className="p-1 text-gray-500 hover:text-gray-700"
                                  >
                                    {expandedFields.has(field.id) ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => removeField(field.id)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Field Content */}
                              {expandedFields.has(field.id) && (
                                <div className="p-4 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        필드 라벨
                                      </label>
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        필드 이름
                                      </label>
                                      <input
                                        type="text"
                                        value={field.name}
                                        onChange={(e) => updateField(field.id, { name: e.target.value })}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                      설명
                                    </label>
                                    <input
                                      type="text"
                                      value={field.description || ''}
                                      onChange={(e) => updateField(field.id, { description: e.target.value })}
                                      placeholder="필드 설명을 입력하세요"
                                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        필드 유형
                                      </label>
                                      <select
                                        value={field.type}
                                        onChange={(e) => updateField(field.id, { type: e.target.value as CustomFieldType })}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      >
                                        {fieldTypes.map((type) => (
                                          <option key={type.value} value={type.value}>
                                            {type.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        플레이스홀더
                                      </label>
                                      <input
                                        type="text"
                                        value={field.placeholder || ''}
                                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                        placeholder="플레이스홀더 텍스트"
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-6">
                                    <div className="flex items-center">
                                      <input
                                        type="checkbox"
                                        id={`required_${field.id}`}
                                        checked={field.required}
                                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                        className="rounded border-gray-300 mr-2"
                                      />
                                      <label htmlFor={`required_${field.id}`} className="text-sm font-medium text-gray-700">
                                        필수 필드
                                      </label>
                                    </div>

                                    {(['select', 'checkbox', 'radio'].includes(field.type)) && (
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                                          id={`multiple_${field.id}`}
                                          checked={field.multiple || false}
                                          onChange={(e) => updateField(field.id, { multiple: e.target.checked })}
                                          className="rounded border-gray-300 mr-2"
                                        />
                                        <label htmlFor={`multiple_${field.id}`} className="text-sm font-medium text-gray-700">
                                          다중 선택
                                        </label>
                                      </div>
                                    )}
                                  </div>

                                  {/* Options for select, radio, checkbox */}
                                  {(['select', 'checkbox', 'radio'].includes(field.type)) && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        선택 옵션
                                      </label>
                                      <div className="space-y-2">
                                        {(field.options || []).map((option, optionIndex) => (
                                          <div key={optionIndex} className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              value={option.label}
                                              onChange={(e) => {
                                                const newOptions = [...(field.options || [])]
                                                newOptions[optionIndex] = { ...option, label: e.target.value }
                                                updateField(field.id, { options: newOptions })
                                              }}
                                              placeholder="옵션 라벨"
                                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            <input
                                              type="text"
                                              value={option.value}
                                              onChange={(e) => {
                                                const newOptions = [...(field.options || [])]
                                                newOptions[optionIndex] = { ...option, value: e.target.value }
                                                updateField(field.id, { options: newOptions })
                                              }}
                                              placeholder="옵션 값"
                                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            <button
                                              onClick={() => {
                                                const newOptions = field.options?.filter((_, i) => i !== optionIndex) || []
                                                updateField(field.id, { options: newOptions })
                                              }}
                                              className="p-2 text-red-500 hover:text-red-700"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => {
                                            const newOptions = [...(field.options || []), { label: '', value: '' }]
                                            updateField(field.id, { options: newOptions })
                                          }}
                                          className="text-sm text-blue-600 hover:text-blue-700"
                                        >
                                          + 옵션 추가
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">필드가 없습니다</h3>
                <p className="text-gray-500 mb-6">새 필드를 추가하여 시작하세요.</p>
                <button
                  onClick={addField}
                  className="wp-button-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  첫 번째 필드 추가
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Location Rules */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">위치 규칙</h3>
            <p className="text-sm text-gray-600 mb-4">
              이 필드 그룹이 표시될 위치를 선택하세요.
            </p>
            
            <div className="space-y-3">
              {[
                { value: 'post_type_post', label: '포스트' },
                { value: 'post_type_page', label: '페이지' },
                { value: 'post_type_product', label: '상품' },
                { value: 'user', label: '사용자' },
                { value: 'taxonomy_category', label: '카테고리' },
                { value: 'taxonomy_tag', label: '태그' },
                { value: 'options', label: '옵션 페이지' },
                { value: 'attachment', label: '미디어' }
              ].map((location) => (
                <div key={location.value} className="flex items-center">
                  <input
                    type="checkbox"
                    id={location.value}
                    checked={fieldGroup.location?.includes(location.value) || false}
                    onChange={(e) => {
                      const current = fieldGroup.location || []
                      if (e.target.checked) {
                        setFieldGroup(prev => ({
                          ...prev,
                          location: [...current, location.value]
                        }))
                      } else {
                        setFieldGroup(prev => ({
                          ...prev,
                          location: current.filter(l => l !== location.value)
                        }))
                      }
                    }}
                    className="rounded border-gray-300 mr-3"
                  />
                  <label htmlFor={location.value} className="text-sm font-medium text-gray-700">
                    {location.label}
                  </label>
                </div>
              ))}
            </div>

            {(!fieldGroup.location || fieldGroup.location.length === 0) && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" />
                  <span className="text-sm text-yellow-700">
                    최소 하나의 위치를 선택해야 합니다.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">표시 설정</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  위치
                </label>
                <select
                  value={fieldGroup.options?.position || 'normal'}
                  onChange={(e) => setFieldGroup(prev => ({
                    ...prev,
                    options: { ...prev.options, position: e.target.value }
                  }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="high">높음 (제목 아래)</option>
                  <option value="core">코어 (기본 필드 영역)</option>
                  <option value="normal">보통 (에디터 아래)</option>
                  <option value="side">사이드바</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  스타일
                </label>
                <select
                  value={fieldGroup.options?.style || 'default'}
                  onChange={(e) => setFieldGroup(prev => ({
                    ...prev,
                    options: { ...prev.options, style: e.target.value }
                  }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="default">기본</option>
                  <option value="seamless">심리스 (테두리 없음)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  라벨 배치
                </label>
                <select
                  value={fieldGroup.options?.labelPlacement || 'top'}
                  onChange={(e) => setFieldGroup(prev => ({
                    ...prev,
                    options: { ...prev.options, labelPlacement: e.target.value }
                  }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="top">위</option>
                  <option value="left">왼쪽</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddNew