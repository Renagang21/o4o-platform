import { useState, useEffect, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  Plus,
  Trash2,
  GripVertical,
  Settings,
  ChevronDown,
  ChevronRight,
  Type,
  Hash,
  Calendar,
  Image,
  FileText,
  Link,
  Mail,
  Palette,
  ToggleLeft,
  List,
  Radio,
  Copy,
  Database
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { CustomField, CustomFieldGroup } from '@o4o/types'
import toast from 'react-hot-toast'

// Field type options with icons
const fieldTypes = [
  { value: 'text', label: '텍스트', icon: Type },
  { value: 'textarea', label: '텍스트 영역', icon: FileText },
  { value: 'number', label: '숫자', icon: Hash },
  { value: 'select', label: '선택', icon: List },
  { value: 'checkbox', label: '체크박스', icon: ToggleLeft },
  { value: 'radio', label: '라디오', icon: Radio },
  { value: 'date', label: '날짜', icon: Calendar },
  { value: 'image', label: '이미지', icon: Image },
  { value: 'file', label: '파일', icon: FileText },
  { value: 'wysiwyg', label: '에디터', icon: FileText },
  { value: 'color', label: '색상', icon: Palette },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'email', label: '이메일', icon: Mail },
  { value: 'repeater', label: '반복 필드', icon: Copy },
  { value: 'relationship', label: '관계', icon: Database },
]

interface FieldFormData extends Omit<CustomField, 'id'> {
  tempId?: string
}

const CustomFieldBuilder: FC = () => {
  const navigate = useNavigate()
  const { cptId } = useParams()
  const queryClient = useQueryClient()

  const [fieldGroups, setFieldGroups] = useState([])
  const [editingGroup, setEditingGroup] = useState<CustomFieldGroup | null>(null)
  const [editingField, setEditingField] = useState<FieldFormData | null>(null)
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState([])

  // Field group form
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    key: '',
    description: '',
    position: 'normal' as 'normal' | 'side' | 'advanced',
    order: 0,
  })

  // Field form
  const [fieldFormData, setFieldFormData] = useState({
    name: '',
    key: '',
    type: 'text',
    label: '',
    description: '',
    required: false,
  })

  // Fetch CPT data
  const { data: cpt, isLoading } = useQuery({
    queryKey: ['custom-post-type', cptId],
    queryFn: async () => {
      const response = await authClient.api.get(`/custom-post-types/${cptId}`)
      return response.data
    }
  })

  // Save field groups mutation
  const saveMutation = useMutation({
    mutationFn: async (groups: CustomFieldGroup[]) => {
      const response = await authClient.api.put(`/custom-post-types/${cptId}/field-groups`, { fieldGroups: groups })
      return response.data
    },
    onSuccess: () => {
      toast.success('커스텀 필드가 저장되었습니다')
      queryClient.invalidateQueries({ queryKey: ['custom-post-type', cptId] })
    },
    onError: () => {
      toast.error('저장에 실패했습니다')
    }
  })

  // Load field groups
  useEffect(() => {
    if (cpt?.fieldGroups) {
      setFieldGroups(cpt.fieldGroups)
      // Expand all groups by default
      setExpandedGroups(cpt.fieldGroups.map((g: CustomFieldGroup) => g.id))
    }
  }, [cpt])

  // Generate key from name
  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  // Toggle group expansion
  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  // Add/Edit field group
  const handleAddGroup = () => {
    setEditingGroup(null)
    setGroupFormData({
      name: '',
      key: '',
      description: '',
      position: 'normal',
      order: fieldGroups.length,
    })
    setIsGroupDialogOpen(true)
  }

  const handleEditGroup = (group: CustomFieldGroup) => {
    setEditingGroup(group)
    setGroupFormData({
      name: group.name,
      key: group.key,
      description: group.description || '',
      position: group.position,
      order: group.order,
    })
    setIsGroupDialogOpen(true)
  }

  const handleSaveGroup = () => {
    const newGroup: CustomFieldGroup = {
      id: editingGroup?.id || `group-${Date.now()}`,
      ...groupFormData,
      fields: editingGroup?.fields || [],
      rules: editingGroup?.rules || {},
    }

    if (editingGroup) {
      setFieldGroups(fieldGroups.map(g => g.id === editingGroup.id ? newGroup : g))
    } else {
      setFieldGroups([...fieldGroups, newGroup])
    }

    setIsGroupDialogOpen(false)
  }

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('정말 이 필드 그룹을 삭제하시겠습니까?')) {
      setFieldGroups(fieldGroups.filter(g => g.id !== groupId))
    }
  }

  // Add/Edit field
  const handleAddField = () => {
    setEditingField(null)
    setFieldFormData({
      name: '',
      key: '',
      type: 'text',
      label: '',
      description: '',
      required: false,
    })
    setIsFieldDialogOpen(true)
  }

  const handleEditField = (field: CustomField, groupId: string) => {
    setEditingField({ ...field, tempId: groupId })
    setFieldFormData({
      ...field,
    })
    setIsFieldDialogOpen(true)
  }

  const handleSaveField = () => {
    const groupId = editingField?.tempId || fieldGroups[0]?.id
    if (!groupId) return

    const newField: CustomField = {
      id: (editingField as CustomField)?.id || `field-${Date.now()}`,
      ...fieldFormData,
    }

    setFieldGroups(fieldGroups.map(group => {
      if (group.id === groupId) {
        if ((editingField as CustomField)?.id) {
          // Edit existing field
          return {
            ...group,
            fields: group.fields.map(f => f.id === (editingField as CustomField).id ? newField : f)
          }
        } else {
          // Add new field
          return {
            ...group,
            fields: [...group.fields, newField]
          }
        }
      }
      return group
    }))

    setIsFieldDialogOpen(false)
  }

  const handleDeleteField = (fieldId: string, groupId: string) => {
    setFieldGroups(fieldGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          fields: group.fields.filter(f => f.id !== fieldId)
        }
      }
      return group
    }))
  }

  // Save all changes
  const handleSaveAll = () => {
    saveMutation.mutate(fieldGroups)
  }

  // Get field type icon
  const getFieldIcon = (type: string) => {
    const fieldType = fieldTypes.find(ft => ft.value === type)
    const Icon = fieldType?.icon || Type
    return <Icon className="w-4 h-4" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => navigate('/content/cpt')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          CPT 목록
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {cpt?.name} - 커스텀 필드
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field Groups */}
        <div className="lg:col-span-2 space-y-4">
          {fieldGroups.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-4">필드 그룹이 없습니다</p>
                <Button onClick={handleAddGroup}>
                  <Plus className="w-4 h-4 mr-2" />
                  첫 필드 그룹 만들기
                </Button>
              </CardContent>
            </Card>
          ) : (
            fieldGroups.map(group => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <button
                        onClick={() => toggleGroupExpanded(group.id)}
                        className="flex items-center gap-2 text-left w-full"
                      >
                        {expandedGroups.includes(group.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                      </button>
                      {group.description && (
                        <p className="text-sm text-gray-500 mt-1 ml-6">{group.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={"outline" as const}>{group.position}</Badge>
                      <Button
                        variant={"ghost" as const}
                        size={"sm" as const}
                        onClick={() => handleEditGroup(group)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={"ghost" as const}
                        size={"sm" as const}
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedGroups.includes(group.id) && (
                  <CardContent>
                    <div className="space-y-2">
                      {group.fields.map((field: any) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                        >
                          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                          <div className="flex-1 flex items-center gap-3">
                            {getFieldIcon(field.type)}
                            <div className="flex-1">
                              <div className="font-medium">{field.label}</div>
                              <div className="text-sm text-gray-500">
                                {field.key} · {fieldTypes.find(ft => ft.value === field.type)?.label}
                                {field.required && ' · 필수'}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant={"ghost" as const}
                            size={"sm" as const}
                            onClick={() => handleEditField(field, group.id)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={"ghost" as const}
                            size={"sm" as const}
                            onClick={() => handleDeleteField(field.id, group.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant={"outline" as const}
                        size={"sm" as const}
                        className="w-full mt-2"
                        onClick={() => handleAddField()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        필드 추가
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>작업</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSaveAll}
                className="w-full"
                disabled={saveMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                변경사항 저장
              </Button>
              <Button
                variant={"outline" as const}
                className="w-full"
                onClick={handleAddGroup}
              >
                <Plus className="w-4 h-4 mr-2" />
                새 필드 그룹
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>필드 유형</CardTitle>
              <CardDescription>
                사용 가능한 필드 유형들
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {fieldTypes.slice(0, 8).map(type => {
                  const Icon = type.icon
                  return (
                    <div key={type.value} className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span>{type.label}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Field Group Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? '필드 그룹 수정' : '새 필드 그룹'}
            </DialogTitle>
            <DialogDescription>
              관련된 필드들을 그룹으로 묶어 관리하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupName">그룹 이름</Label>
              <Input
                id="groupName"
                value={groupFormData.name}
                onChange={(e: any) => setGroupFormData({
                  ...groupFormData,
                  name: e.target.value,
                  key: generateKey(e.target.value)
                })}
                placeholder="예: 제품 정보"
              />
            </div>
            <div>
              <Label htmlFor="groupKey">그룹 키</Label>
              <Input
                id="groupKey"
                value={groupFormData.key}
                onChange={(e: any) => setGroupFormData({ ...groupFormData, key: e.target.value })}
                placeholder="예: product_info"
              />
            </div>
            <div>
              <Label htmlFor="groupDescription">설명 (선택)</Label>
              <Textarea
                id="groupDescription"
                value={groupFormData.description}
                onChange={(e: any) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                placeholder="이 필드 그룹에 대한 설명"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="groupPosition">위치</Label>
              <Select
                value={groupFormData.position}
                onValueChange={(value: string) => setGroupFormData({ ...groupFormData, position: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">일반</SelectItem>
                  <SelectItem value="side">사이드바</SelectItem>
                  <SelectItem value="advanced">고급</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant={"outline" as const} onClick={() => setIsGroupDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveGroup}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Dialog */}
      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingField ? '필드 수정' : '새 필드'}
            </DialogTitle>
            <DialogDescription>
              커스텀 필드를 생성하거나 수정합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[500px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fieldName">필드 이름</Label>
                <Input
                  id="fieldName"
                  value={fieldFormData.name}
                  onChange={(e: any) => setFieldFormData({
                    ...fieldFormData,
                    name: e.target.value,
                    key: generateKey(e.target.value),
                    label: e.target.value
                  })}
                  placeholder="예: 가격"
                />
              </div>
              <div>
                <Label htmlFor="fieldKey">필드 키</Label>
                <Input
                  id="fieldKey"
                  value={fieldFormData.key}
                  onChange={(e: any) => setFieldFormData({ ...fieldFormData, key: e.target.value })}
                  placeholder="예: price"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fieldType">필드 유형</Label>
              <Select
                value={fieldFormData.type}
                onValueChange={(value: string) => setFieldFormData({ ...fieldFormData, type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map(type => {
                    const Icon = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fieldLabel">레이블</Label>
              <Input
                id="fieldLabel"
                value={fieldFormData.label}
                onChange={(e: any) => setFieldFormData({ ...fieldFormData, label: e.target.value })}
                placeholder="편집 화면에 표시될 레이블"
              />
            </div>

            <div>
              <Label htmlFor="fieldDescription">설명 (선택)</Label>
              <Textarea
                id="fieldDescription"
                value={fieldFormData.description}
                onChange={(e: any) => setFieldFormData({ ...fieldFormData, description: e.target.value })}
                placeholder="필드 사용 방법에 대한 설명"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="fieldPlaceholder">플레이스홀더 (선택)</Label>
              <Input
                id="fieldPlaceholder"
                value={fieldFormData.placeholder}
                onChange={(e: any) => setFieldFormData({ ...fieldFormData, placeholder: e.target.value })}
                placeholder="입력 필드에 표시될 힌트 텍스트"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="fieldRequired"
                checked={fieldFormData.required}
                onCheckedChange={(checked: boolean) => setFieldFormData({ ...fieldFormData, required: checked })}
              />
              <Label htmlFor="fieldRequired">필수 필드</Label>
            </div>

            {/* Type-specific options */}
            {fieldFormData.type === 'number' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fieldMin">최소값</Label>
                  <Input
                    id="fieldMin"
                    type="number"
                    value={fieldFormData.min}
                    onChange={(e: any) => setFieldFormData({ ...fieldFormData, min: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="fieldMax">최대값</Label>
                  <Input
                    id="fieldMax"
                    type="number"
                    value={fieldFormData.max}
                    onChange={(e: any) => setFieldFormData({ ...fieldFormData, max: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            )}

            {(fieldFormData.type === 'text' || fieldFormData.type === 'textarea') && (
              <div>
                <Label htmlFor="fieldMaxLength">최대 길이</Label>
                <Input
                  id="fieldMaxLength"
                  type="number"
                  value={fieldFormData.maxLength}
                  onChange={(e: any) => setFieldFormData({ ...fieldFormData, maxLength: parseInt(e.target.value) })}
                />
              </div>
            )}

            {(fieldFormData.type === 'select' || fieldFormData.type === 'checkbox' || fieldFormData.type === 'radio') && (
              <div>
                <Label>옵션</Label>
                <div className="space-y-2 mt-2">
                  {(fieldFormData.options || []).map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="레이블"
                        value={option.label}
                        onChange={(e: any) => {
                          const newOptions = [...(fieldFormData.options || [])]
                          newOptions[index] = { ...option, label: e.target.value }
                          setFieldFormData({ ...fieldFormData, options: newOptions })
                        }}
                      />
                      <Input
                        placeholder="값"
                        value={option.value}
                        onChange={(e: any) => {
                          const newOptions = [...(fieldFormData.options || [])]
                          newOptions[index] = { ...option, value: e.target.value }
                          setFieldFormData({ ...fieldFormData, options: newOptions })
                        }}
                      />
                      <Button
                        variant={"ghost" as const}
                        size={"sm" as const}
                        onClick={() => {
                          const newOptions = fieldFormData.options?.filter((_, i: any) => i !== index)
                          setFieldFormData({ ...fieldFormData, options: newOptions })
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant={"outline" as const}
                    size={"sm" as const}
                    onClick={() => {
                      const newOptions = [...(fieldFormData.options || []), { label: '', value: '' }]
                      setFieldFormData({ ...fieldFormData, options: newOptions })
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    옵션 추가
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant={"outline" as const} onClick={() => setIsFieldDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveField}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CustomFieldBuilder