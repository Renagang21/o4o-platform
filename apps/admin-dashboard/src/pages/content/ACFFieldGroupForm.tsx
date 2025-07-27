import React from 'react';
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
import type { ACFFieldGroup, ACFField, ACFLocationGroup, CustomField } from '@o4o/types'
import toast from 'react-hot-toast'
import FieldTypeSelector from '@/components/acf/FieldTypeSelector'
import FieldEditor from '@/components/acf/FieldEditor'
import RepeaterFieldEditor from '@/components/acf/RepeaterFieldEditor'

const ACFFieldGroupForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditMode = !!id

  const [formData, setFormData] = useState<Partial<ACFFieldGroup>>({
    name: '',
    key: '',
    description: '',
    position: 'normal',
    style: 'default',
    labelPlacement: 'top',
    instructionPlacement: 'label',
    active: true,
    showInRest: true,
    fields: [],
    location: [{
      rules: [{
        param: 'post_type',
        operator: '==',
        value: 'post'
      }],
      operator: 'AND'
    }],
  })

  const [expandedFields, setExpandedFields] = useState<string[]>([])
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<ACFField | null>(null)
  const [selectedFieldType, setSelectedFieldType] = useState<string>('text')

  // Fetch field group data (edit mode)
  const { data: fieldGroup, isLoading } = useQuery({
    queryKey: ['acf-field-group', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/acf/field-groups/${id}`)
      return response.data
    },
    enabled: isEditMode
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ACFFieldGroup>) => {
      const response = await authClient.api.post('/acf/field-groups', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('필드 그룹이 생성되었습니다')
      queryClient.invalidateQueries({ queryKey: ['acf-field-groups'] })
      navigate('/content/acf')
    },
    onError: () => {
      toast.error('생성에 실패했습니다')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<ACFFieldGroup>) => {
      const response = await authClient.api.put(`/acf/field-groups/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('필드 그룹이 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['acf-field-groups'] })
      queryClient.invalidateQueries({ queryKey: ['acf-field-group', id] })
    },
    onError: () => {
      toast.error('수정에 실패했습니다')
    }
  })

  // Load field group data in edit mode
  useEffect(() => {
    if (fieldGroup) {
      setFormData(fieldGroup)
      // Expand all fields by default
      setExpandedFields(fieldGroup.fields.map((f: ACFField) => f.id))
    }
  }, [fieldGroup])

  // Generate key from name
  const generateKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  // Toggle field expansion
  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  // Add/Edit field
  const handleAddField = () => {
    setEditingField(null)
    setSelectedFieldType('text')
    setIsFieldDialogOpen(true)
  }

  const handleEditField = (field: ACFField) => {
    setEditingField(field)
    setSelectedFieldType(field.type)
    setIsFieldDialogOpen(true)
  }

  const handleSaveField = (field: CustomField) => {
    const newField: ACFField = {
      ...field,
      id: editingField?.id || `field-${Date.now()}`,
    }

    if (editingField) {
      setFormData({
        ...formData,
        fields: formData.fields?.map(f => f.id === editingField.id ? newField : f) || []
      })
    } else {
      setFormData({
        ...formData,
        fields: [...(formData.fields || []), newField]
      })
    }

    setIsFieldDialogOpen(false)
  }

  const handleDeleteField = (fieldId: string) => {
    if (confirm('정말 이 필드를 삭제하시겠습니까?')) {
      setFormData({
        ...formData,
        fields: formData.fields?.filter(f => f.id !== fieldId) || []
      })
    }
  }

  // Location rules
  const handleAddLocationRule = () => {
    const newLocation: ACFLocationGroup = {
      rules: [{
        param: 'post_type',
        operator: '==',
        value: ''
      }],
      operator: 'AND'
    }
    setFormData({
      ...formData,
      location: [...(formData.location || []), newLocation]
    })
  }

  // Save form
  const handleSubmit = () => {
    if (isEditMode) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  if (isEditMode && isLoading) {
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
          variant="ghost"
          size="sm"
          onClick={() => navigate('/content/acf')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ACF 목록
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? '필드 그룹 수정' : '새 필드 그룹'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                필드 그룹의 기본 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">필드 그룹 이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: any) => setFormData({
                    ...formData,
                    name: e.target.value,
                    key: generateKey(e.target.value)
                  })}
                  placeholder="예: 제품 정보"
                  required
                />
              </div>

              <div>
                <Label htmlFor="key">필드 그룹 키</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e: any) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="예: product_info"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="이 필드 그룹에 대한 설명"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>필드</CardTitle>
              <CardDescription>
                이 그룹에 포함될 필드들을 추가하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formData.fields?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">아직 필드가 없습니다</p>
                  <Button onClick={handleAddField}>
                    <Plus className="w-4 h-4 mr-2" />
                    첫 필드 추가
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.fields?.map((field) => (
                    <Card key={field.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleFieldExpanded(field.id)}
                            className="flex items-center gap-2 text-left flex-1"
                          >
                            {expandedFields.includes(field.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{field.label}</span>
                                <Badge variant="outline" className="text-xs">
                                  {field.type}
                                </Badge>
                                {field.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    필수
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {field.key}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditField(field)}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteField(field.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {expandedFields.includes(field.id) && (
                        <CardContent className="pt-0">
                          <div className="text-sm text-gray-600 space-y-1">
                            {field.description && (
                              <p>{field.description}</p>
                            )}
                            {field.placeholder && (
                              <p>플레이스홀더: {field.placeholder}</p>
                            )}
                            {field.defaultValue && (
                              <p>기본값: {field.defaultValue}</p>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleAddField}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    필드 추가
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>위치 규칙</CardTitle>
              <CardDescription>
                이 필드 그룹이 표시될 위치를 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.location?.map((locationGroup, groupIndex) => (
                  <div key={groupIndex} className="p-4 border rounded-lg">
                    {locationGroup.rules.map((rule, ruleIndex) => (
                      <div key={ruleIndex} className="flex gap-2 mb-2">
                        <Select
                          value={rule.param}
                          onValueChange={(value) => {
                            const newLocation = [...(formData.location || [])]
                            newLocation[groupIndex].rules[ruleIndex].param = value as any
                            setFormData({ ...formData, location: newLocation })
                          }}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="post_type">게시물 유형</SelectItem>
                            <SelectItem value="page_template">페이지 템플릿</SelectItem>
                            <SelectItem value="post_status">게시물 상태</SelectItem>
                            <SelectItem value="post_category">카테고리</SelectItem>
                            <SelectItem value="taxonomy">분류</SelectItem>
                            <SelectItem value="user_role">사용자 역할</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={rule.operator}
                          onValueChange={(value) => {
                            const newLocation = [...(formData.location || [])]
                            newLocation[groupIndex].rules[ruleIndex].operator = value as any
                            setFormData({ ...formData, location: newLocation })
                          }}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="==">같음</SelectItem>
                            <SelectItem value="!=">같지 않음</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          value={rule.value}
                          onChange={(e: any) => {
                            const newLocation = [...(formData.location || [])]
                            newLocation[groupIndex].rules[ruleIndex].value = e.target.value
                            setFormData({ ...formData, location: newLocation })
                          }}
                          placeholder="값"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLocationRule}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  규칙 추가
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="active">활성화</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showInRest">REST API 표시</Label>
                <Switch
                  id="showInRest"
                  checked={formData.showInRest}
                  onCheckedChange={(checked) => setFormData({ ...formData, showInRest: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>표시 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="position">위치</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData({ ...formData, position: value as any })}
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

              <div>
                <Label htmlFor="style">스타일</Label>
                <Select
                  value={formData.style}
                  onValueChange={(value) => setFormData({ ...formData, style: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">기본</SelectItem>
                    <SelectItem value="seamless">심리스</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="labelPlacement">레이블 위치</Label>
                <Select
                  value={formData.labelPlacement}
                  onValueChange={(value) => setFormData({ ...formData, labelPlacement: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">상단</SelectItem>
                    <SelectItem value="left">왼쪽</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>작업</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={!formData.name || !formData.key || createMutation.isPending || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? '필드 그룹 수정' : '필드 그룹 생성'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Field Dialog */}
      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField ? '필드 수정' : '새 필드'}
            </DialogTitle>
            <DialogDescription>
              필드 유형을 선택하고 설정을 구성하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
            <div>
              <h3 className="text-sm font-medium mb-3">필드 유형</h3>
              <FieldTypeSelector
                selectedType={selectedFieldType}
                onSelect={setSelectedFieldType}
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-3">필드 설정</h3>
              {selectedFieldType === 'repeater' ? (
                <RepeaterFieldEditor
                  field={editingField as any || {
                    id: '',
                    name: '',
                    key: '',
                    type: 'repeater',
                    label: '',
                    required: false,
                    subFields: []
                  }}
                  onChange={() => {
                    // Handle repeater field change
                  }}
                />
              ) : (
                <FieldEditor
                  field={editingField || {
                    id: '',
                    name: '',
                    key: '',
                    type: selectedFieldType as CustomField['type'],
                    label: '',
                    required: false,
                  }}
                  onChange={() => {
                    // Handle field change
                  }}
                />
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFieldDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={() => {
              const field: CustomField = {
                id: editingField?.id || '',
                name: editingField?.name || '',
                key: editingField?.key || '',
                type: selectedFieldType as CustomField['type'],
                label: editingField?.label || '',
                required: false,
              }
              handleSaveField(field)
            }}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ACFFieldGroupForm