/**
 * CPT Field Manager Component
 * Based on CustomFields.tsx pattern for ACF field management
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  ChevronUp,
  ChevronDown,
  Copy,
  Settings,
  Grid3X3,
  Type,
  Hash,
  Calendar,
  Link,
  Image,
  FileText,
  ToggleLeft,
  List,
  Database
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { acfGroupApi } from '@/features/cpt-acf/services/acf.api';
import { cptApi } from '@/features/cpt-acf/services/cpt.api';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { 
  FieldGroup, 
  Field, 
  FieldType, 
  CreateFieldGroupDto,
  UpdateFieldGroupDto 
} from '@/features/cpt-acf/types/acf.types';
import { CustomPostType } from '@/features/cpt-acf/types/cpt.types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface CPTFieldManagerProps {
  cptTypes: CustomPostType[];
  selectedType?: string | null;
  onTypeSelect?: (slug: string) => void;
}

// Field type configurations
const fieldTypes: Array<{ value: FieldType; label: string; icon: React.ElementType }> = [
  { value: 'text', label: '텍스트', icon: Type },
  { value: 'textarea', label: '텍스트 영역', icon: FileText },
  { value: 'number', label: '숫자', icon: Hash },
  { value: 'select', label: '선택', icon: List },
  { value: 'checkbox', label: '체크박스', icon: ToggleLeft },
  { value: 'radio', label: '라디오', icon: ToggleLeft },
  { value: 'date', label: '날짜', icon: Calendar },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'image', label: '이미지', icon: Image },
  { value: 'wysiwyg', label: '에디터', icon: FileText },
  { value: 'repeater', label: '반복 필드', icon: Grid3X3 },
  { value: 'relationship', label: '관계', icon: Database }
];

const CPTFieldManager: React.FC<CPTFieldManagerProps> = ({
  cptTypes,
  selectedType,
  onTypeSelect
}) => {
  const queryClient = useQueryClient();
  const { addNotice } = useAdminNotices();
  
  // State
  const [selectedGroup, setSelectedGroup] = useState<FieldGroup | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [isCreatingField, setIsCreatingField] = useState(false);
  
  // Form state for new/edit group
  const [groupForm, setGroupForm] = useState<Partial<CreateFieldGroupDto>>({
    title: '',
    description: '',
    postTypes: selectedType ? [selectedType] : [],
    position: 'normal',
    style: 'default',
    isActive: true,
    fields: []
  });
  
  // Form state for new/edit field
  const [fieldForm, setFieldForm] = useState<Partial<Field>>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    defaultValue: '',
    placeholder: '',
    description: '',
    options: {}
  });

  // Fetch field groups
  const { data: fieldGroups, isLoading } = useQuery({
    queryKey: ['field-groups', selectedType],
    queryFn: async () => {
      if (selectedType) {
        const response = await acfGroupApi.getByPostType(selectedType);
        return response.data;
      } else {
        const response = await acfGroupApi.getAll(true);
        return response.data;
      }
    }
  });

  // Create field group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateFieldGroupDto) => {
      return await acfGroupApi.create(data);
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: '필드 그룹이 생성되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['field-groups'] });
      setIsCreatingGroup(false);
      setGroupForm({
        title: '',
        description: '',
        postTypes: selectedType ? [selectedType] : [],
        position: 'normal',
        style: 'default',
        isActive: true,
        fields: []
      });
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `생성 실패: ${error.message}`
      });
    }
  });

  // Update field group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFieldGroupDto }) => {
      return await acfGroupApi.update(id, data);
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: '필드 그룹이 업데이트되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['field-groups'] });
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `업데이트 실패: ${error.message}`
      });
    }
  });

  // Delete field group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return await acfGroupApi.delete(id);
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: '필드 그룹이 삭제되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['field-groups'] });
      setSelectedGroup(null);
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `삭제 실패: ${error.message}`
      });
    }
  });

  // Handle field creation/update
  const handleSaveField = () => {
    if (!selectedGroup) return;

    const newField: Field = {
      ...fieldForm as Field,
      id: editingField?.id || `field_${Date.now()}`,
      order: editingField?.order || selectedGroup.fields.length
    };

    const updatedFields = editingField
      ? selectedGroup.fields.map(f => f.id === editingField.id ? newField : f)
      : [...selectedGroup.fields, newField];

    updateGroupMutation.mutate({
      id: selectedGroup.id,
      data: {
        ...selectedGroup,
        fields: updatedFields
      }
    });

    setEditingField(null);
    setIsCreatingField(false);
    setFieldForm({
      name: '',
      label: '',
      type: 'text',
      required: false,
      defaultValue: '',
      placeholder: '',
      description: '',
      options: {}
    });
  };

  // Handle field deletion
  const handleDeleteField = (fieldId: string) => {
    if (!selectedGroup) return;

    const updatedFields = selectedGroup.fields.filter(f => f.id !== fieldId);
    
    updateGroupMutation.mutate({
      id: selectedGroup.id,
      data: {
        ...selectedGroup,
        fields: updatedFields
      }
    });
  };

  // Handle field reordering
  const handleFieldReorder = (activeId: string, overId: string) => {
    if (!selectedGroup) return;

    const oldIndex = selectedGroup.fields.findIndex(f => f.id === activeId);
    const newIndex = selectedGroup.fields.findIndex(f => f.id === overId);

    const reorderedFields = arrayMove(selectedGroup.fields, oldIndex, newIndex)
      .map((field, index) => ({ ...field, order: index }));

    updateGroupMutation.mutate({
      id: selectedGroup.id,
      data: {
        ...selectedGroup,
        fields: reorderedFields
      }
    });
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Field Groups List */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>필드 그룹</CardTitle>
            <CardDescription>ACF 필드 그룹 관리</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* CPT Filter */}
            <Select
              value={selectedType || 'all'}
              onValueChange={(value) => onTypeSelect?.(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="콘텐츠 타입 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 타입</SelectItem>
                {cptTypes.map(cpt => (
                  <SelectItem key={cpt.slug} value={cpt.slug}>
                    {cpt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              className="w-full justify-start"
              variant={isCreatingGroup ? 'default' : 'outline'}
              onClick={() => {
                setIsCreatingGroup(true);
                setSelectedGroup(null);
                setGroupForm({
                  title: '',
                  description: '',
                  postTypes: selectedType ? [selectedType] : [],
                  position: 'normal',
                  style: 'default',
                  isActive: true,
                  fields: []
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              새 필드 그룹
            </Button>

            <div className="space-y-1 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                fieldGroups?.map(group => (
                  <Button
                    key={group.id}
                    variant={selectedGroup?.id === group.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedGroup(group);
                      setIsCreatingGroup(false);
                    }}
                  >
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    {group.title}
                    <Badge variant="outline" className="ml-auto">
                      {group.fields.length}
                    </Badge>
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Field Group Editor */}
      <div className="lg:col-span-2 space-y-6">
        {isCreatingGroup ? (
          // New Group Form
          <Card>
            <CardHeader>
              <CardTitle>새 필드 그룹 생성</CardTitle>
              <CardDescription>필드 그룹 정보를 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="groupTitle">그룹 제목</Label>
                <Input
                  id="groupTitle"
                  value={groupForm.title || ''}
                  onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
                  placeholder="예: 상품 정보"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="groupDescription">설명</Label>
                <Textarea
                  id="groupDescription"
                  value={groupForm.description || ''}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="이 필드 그룹에 대한 설명"
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label>적용할 콘텐츠 타입</Label>
                <div className="grid grid-cols-2 gap-2">
                  {cptTypes.map(cpt => (
                    <div key={cpt.slug} className="flex items-center space-x-2">
                      <Switch
                        id={`cpt-${cpt.slug}`}
                        checked={groupForm.postTypes?.includes(cpt.slug) || false}
                        onCheckedChange={(checked) => {
                          const postTypes = groupForm.postTypes || [];
                          setGroupForm({
                            ...groupForm,
                            postTypes: checked
                              ? [...postTypes, cpt.slug]
                              : postTypes.filter(t => t !== cpt.slug)
                          });
                        }}
                      />
                      <Label htmlFor={`cpt-${cpt.slug}`}>{cpt.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreatingGroup(false);
                    setGroupForm({});
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={() => createGroupMutation.mutate(groupForm as CreateFieldGroupDto)}
                  disabled={!groupForm.title || createGroupMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  생성
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : selectedGroup ? (
          // Edit Group & Fields
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedGroup.title}</CardTitle>
                  <CardDescription>{selectedGroup.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingField(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    필드 추가
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('이 필드 그룹을 삭제하시겠습니까?')) {
                        deleteGroupMutation.mutate(selectedGroup.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="fields">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="fields">필드 ({selectedGroup.fields.length})</TabsTrigger>
                  <TabsTrigger value="settings">설정</TabsTrigger>
                </TabsList>

                {/* Fields Tab */}
                <TabsContent value="fields" className="space-y-4">
                  {isCreatingField || editingField ? (
                    // Field Form
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {editingField ? '필드 편집' : '새 필드 추가'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="fieldName">필드 이름 (ID)</Label>
                            <Input
                              id="fieldName"
                              value={fieldForm.name || ''}
                              onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                              placeholder="field_name"
                              disabled={!!editingField}
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="fieldLabel">레이블</Label>
                            <Input
                              id="fieldLabel"
                              value={fieldForm.label || ''}
                              onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                              placeholder="필드 레이블"
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="fieldType">필드 타입</Label>
                          <Select
                            value={fieldForm.type || 'text'}
                            onValueChange={(value) => setFieldForm({ ...fieldForm, type: value as FieldType })}
                          >
                            <SelectTrigger id="fieldType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="fieldDescription">설명</Label>
                          <Textarea
                            id="fieldDescription"
                            value={fieldForm.description || ''}
                            onChange={(e) => setFieldForm({ ...fieldForm, description: e.target.value })}
                            placeholder="필드 설명 (도움말)"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="fieldPlaceholder">플레이스홀더</Label>
                            <Input
                              id="fieldPlaceholder"
                              value={fieldForm.placeholder || ''}
                              onChange={(e) => setFieldForm({ ...fieldForm, placeholder: e.target.value })}
                              placeholder="입력 힌트"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="fieldDefault">기본값</Label>
                            <Input
                              id="fieldDefault"
                              value={fieldForm.defaultValue || ''}
                              onChange={(e) => setFieldForm({ ...fieldForm, defaultValue: e.target.value })}
                              placeholder="기본값"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="fieldRequired"
                            checked={fieldForm.required || false}
                            onCheckedChange={(checked) => setFieldForm({ ...fieldForm, required: checked })}
                          />
                          <Label htmlFor="fieldRequired">필수 필드</Label>
                        </div>

                        {/* Type-specific options */}
                        {(fieldForm.type === 'select' || fieldForm.type === 'radio' || fieldForm.type === 'checkbox') && (
                          <div className="grid gap-2">
                            <Label>옵션 (한 줄에 하나씩)</Label>
                            <Textarea
                              value={fieldForm.options?.choices?.join('\n') || ''}
                              onChange={(e) => setFieldForm({
                                ...fieldForm,
                                options: {
                                  ...fieldForm.options,
                                  choices: e.target.value.split('\n').filter(Boolean)
                                }
                              })}
                              placeholder="옵션1&#10;옵션2&#10;옵션3"
                              rows={4}
                            />
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsCreatingField(false);
                              setEditingField(null);
                              setFieldForm({});
                            }}
                          >
                            취소
                          </Button>
                          <Button
                            onClick={handleSaveField}
                            disabled={!fieldForm.name || !fieldForm.label}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            저장
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    // Fields List
                    <div className="space-y-2">
                      {selectedGroup.fields.length === 0 ? (
                        <Card>
                          <CardContent className="flex flex-col items-center justify-center h-32 text-center">
                            <Settings className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">
                              아직 필드가 없습니다
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => {
                            const { active, over } = event;
                            if (active.id !== over?.id && over?.id) {
                              handleFieldReorder(active.id as string, over.id as string);
                            }
                          }}
                        >
                          <SortableContext
                            items={selectedGroup.fields.map(f => f.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {selectedGroup.fields
                              .sort((a, b) => a.order - b.order)
                              .map(field => {
                                const fieldTypeConfig = fieldTypes.find(t => t.value === field.type);
                                const FieldIcon = fieldTypeConfig?.icon || Type;
                                
                                return (
                                  <Card key={field.id}>
                                    <CardContent className="flex items-center justify-between py-3">
                                      <div className="flex items-center gap-3">
                                        <FieldIcon className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                          <div className="font-medium">{field.label}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {field.name} · {fieldTypeConfig?.label}
                                            {field.required && (
                                              <Badge variant="secondary" className="ml-2">필수</Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setEditingField(field);
                                            setFieldForm(field);
                                          }}
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDeleteField(field.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                  <div className="grid gap-2">
                    <Label>적용된 콘텐츠 타입</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroup.postTypes.map(postType => {
                        const cpt = cptTypes.find(t => t.slug === postType);
                        return (
                          <Badge key={postType} variant="secondary">
                            {cpt?.label || postType}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>위치</Label>
                      <Select
                        value={selectedGroup.position}
                        onValueChange={(value) => {
                          updateGroupMutation.mutate({
                            id: selectedGroup.id,
                            data: { ...selectedGroup, position: value as any }
                          });
                        }}
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

                    <div className="grid gap-2">
                      <Label>스타일</Label>
                      <Select
                        value={selectedGroup.style}
                        onValueChange={(value) => {
                          updateGroupMutation.mutate({
                            id: selectedGroup.id,
                            data: { ...selectedGroup, style: value as any }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">기본</SelectItem>
                          <SelectItem value="seamless">심플</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="groupActive"
                      checked={selectedGroup.isActive}
                      onCheckedChange={(checked) => {
                        updateGroupMutation.mutate({
                          id: selectedGroup.id,
                          data: { ...selectedGroup, isActive: checked }
                        });
                      }}
                    />
                    <Label htmlFor="groupActive">활성화</Label>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          // Empty State
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-96 text-center">
              <Grid3X3 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">필드 그룹 선택</h3>
              <p className="text-muted-foreground mb-4">
                왼쪽 목록에서 필드 그룹을 선택하거나<br />
                새 필드 그룹을 생성하세요
              </p>
              <Button
                onClick={() => {
                  setIsCreatingGroup(true);
                  setGroupForm({
                    title: '',
                    description: '',
                    postTypes: selectedType ? [selectedType] : [],
                    position: 'normal',
                    style: 'default',
                    isActive: true,
                    fields: []
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                새 필드 그룹 생성
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CPTFieldManager;