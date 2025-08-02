import { ChangeEvent, FC, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ArrowLeft,
  Save,
  Plus,
  Settings,
  Eye,
  Copy,
  Code,
  Mail,
  FileText,
  Hash,
  Calendar,
  Image,
  Type,
  ToggleLeft,
  List,
  Radio,
  Upload,
  Star,
  Palette,
  Link,
  Phone,
  Lock,
  Minus,
  AlignLeft,
  Calculator,
  MapPin,
  User,
  CreditCard,
  Layers,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Form, FormField, FormFieldType } from '@o4o/types';
import toast from 'react-hot-toast';
import { SortableFieldCard } from '@/components/forms/SortableFieldCard';
import { FieldPropertiesPanel } from '@/components/forms/FieldPropertiesPanel';
import { FormSettingsTab } from '@/components/forms/FormSettingsTab';
import { FormNotificationsTab } from '@/components/forms/FormNotificationsTab';
import { FormConfirmationsTab } from '@/components/forms/FormConfirmationsTab';

// Field type configurations
// Trash2 is used in SortableFieldCard component
const fieldTypeConfig: Record<FormFieldType, { label: string; icon: any; category: string }> = {
  // Basic Fields
  'text': { label: '텍스트', icon: Type, category: 'basic' },
  'textarea': { label: '텍스트 영역', icon: AlignLeft, category: 'basic' },
  'number': { label: '숫자', icon: Hash, category: 'basic' },
  'email': { label: '이메일', icon: Mail, category: 'basic' },
  'url': { label: 'URL', icon: Link, category: 'basic' },
  'tel': { label: '전화번호', icon: Phone, category: 'basic' },
  'date': { label: '날짜', icon: Calendar, category: 'basic' },
  'datetime': { label: '날짜/시간', icon: Calendar, category: 'basic' },
  'time': { label: '시간', icon: Calendar, category: 'basic' },
  
  // Choice Fields
  'select': { label: '드롭다운', icon: List, category: 'choice' },
  'radio': { label: '라디오', icon: Radio, category: 'choice' },
  'checkbox': { label: '체크박스', icon: ToggleLeft, category: 'choice' },
  
  // Advanced Fields
  'file': { label: '파일 업로드', icon: Upload, category: 'advanced' },
  'image': { label: '이미지', icon: Image, category: 'advanced' },
  'signature': { label: '서명', icon: FileText, category: 'advanced' },
  'rating': { label: '평점', icon: Star, category: 'advanced' },
  'range': { label: '범위', icon: Minus, category: 'advanced' },
  'color': { label: '색상', icon: Palette, category: 'advanced' },
  'password': { label: '비밀번호', icon: Lock, category: 'advanced' },
  
  // Layout Fields
  'hidden': { label: '숨김 필드', icon: Eye, category: 'layout' },
  'html': { label: 'HTML', icon: Code, category: 'layout' },
  'divider': { label: '구분선', icon: Minus, category: 'layout' },
  'heading': { label: '제목', icon: Type, category: 'layout' },
  'paragraph': { label: '단락', icon: AlignLeft, category: 'layout' },
  'page-break': { label: '페이지 구분', icon: Layers, category: 'layout' },
  
  // Special Fields
  'repeater': { label: '반복 필드', icon: Copy, category: 'special' },
  'calculation': { label: '계산 필드', icon: Calculator, category: 'special' },
  'lookup': { label: '조회 필드', icon: Search, category: 'special' },
  'address': { label: '주소', icon: MapPin, category: 'special' },
  'name': { label: '이름', icon: User, category: 'special' },
  'payment': { label: '결제', icon: CreditCard, category: 'special' },
};

const FormBuilder: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [activeTab, setActiveTab] = useState('build');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Form>>({
    name: '',
    title: '',
    description: '',
    fields: [],
    settings: {
      submitButtonText: '제출',
      submitButtonProcessingText: '처리중...',
      allowSave: false,
      requireLogin: false,
      limitSubmissions: false,
      honeypot: true,
      ajax: true,
      multiPage: false,
      progressBar: false,
      saveProgress: false,
      autoSave: false,
    },
    notifications: [],
    confirmations: [{
      id: 'default',
      name: '기본 확인',
      type: 'message',
      message: '양식이 성공적으로 제출되었습니다. 감사합니다!'
    }],
    status: 'draft'
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch form data if editing
  const { data: existingForm, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/forms/${id}`);
      return response.data;
    },
    enabled: isEditMode
  });

  useEffect(() => {
    if (existingForm) {
      setFormData(existingForm);
    }
  }, [existingForm]);

  // Save form mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Form>) => {
      if (isEditMode) {
        const response = await authClient.api.put(`/forms/${id}`, data);
        return response.data;
      } else {
        const response = await authClient.api.post('/forms', data);
        return response.data;
      }
    },
    onSuccess: (data) => {
      toast.success(isEditMode ? '양식이 업데이트되었습니다' : '양식이 생성되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      if (!isEditMode && data.form?.id) {
        navigate(`/forms/edit/${data.form.id}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '저장에 실패했습니다');
    }
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFormData(prev => {
        const oldIndex = prev.fields!.findIndex(field => field.id === active.id);
        const newIndex = prev.fields!.findIndex(field => field.id === over?.id);
        
        return {
          ...prev,
          fields: arrayMove(prev.fields!, oldIndex, newIndex)
        };
      });
    }
  };

  // Add new field
  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      name: `field_${formData.fields!.length + 1}`,
      label: fieldTypeConfig[type].label,
      required: false,
      width: 'full'
    };

    setFormData(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }));
    
    setSelectedField(newField.id);
    setShowFieldDialog(false);
  };

  // Update field
  const updateField = (fieldId: string, updates: any) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields?.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      ) || []
    }));
  };

  // Delete field
  const deleteField = (fieldId: string) => {
    if (confirm('정말 이 필드를 삭제하시겠습니까?')) {
      setFormData(prev => ({
        ...prev,
        fields: prev.fields?.filter(field => field.id !== fieldId) || []
      }));
      if (selectedField === fieldId) {
        setSelectedField(null);
      }
    }
  };

  // Duplicate field
  const duplicateField = (fieldId: string) => {
    const fieldToDuplicate = formData.fields?.find(f => f.id === fieldId);
    if (fieldToDuplicate) {
      const newField = {
        ...fieldToDuplicate,
        id: `field_${Date.now()}`,
        name: `${fieldToDuplicate.name}_copy`
      };
      
      const fieldIndex = formData.fields!.indexOf(fieldToDuplicate);
      const newFields = [...formData.fields!];
      newFields.splice(fieldIndex + 1, 0, newField);
      
      setFormData(prev => ({
        ...prev,
        fields: newFields
      }));
    }
  };

  // Save form
  const handleSave = () => {
    if (!formData.name || !formData.title) {
      toast.error('양식 이름과 제목은 필수입니다');
      return;
    }

    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant={"ghost" as const}
            size={"sm" as const}
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            양식 목록
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? '양식 수정' : '새 양식 만들기'}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant={"outline" as const}
            onClick={() => setShowPreview(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            미리보기
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Form Builder */}
        <div className="col-span-8">
          <Card>
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="build">빌드</TabsTrigger>
                  <TabsTrigger value="settings">설정</TabsTrigger>
                  <TabsTrigger value="notifications">알림</TabsTrigger>
                  <TabsTrigger value="confirmations">확인</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="build">
                {/* Form Info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="formName">양식 이름</Label>
                    <Input
                      id="formName"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="contact_form"
                      className="font-mono"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="formTitle">양식 제목</Label>
                    <Input
                      id="formTitle"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="문의하기"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="formDescription">설명 (선택)</Label>
                    <Textarea
                      id="formDescription"
                      value={formData.description}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="양식에 대한 설명을 입력하세요"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Fields */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">양식 필드</h3>
                    <Button
                      size={"sm" as const}
                      onClick={() => setShowFieldDialog(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      필드 추가
                    </Button>
                  </div>

                  {formData.fields?.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-gray-500 mb-4">아직 필드가 없습니다</p>
                      <Button
                        variant={"outline" as const}
                        onClick={() => setShowFieldDialog(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        첫 필드 추가하기
                      </Button>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={formData.fields?.map(f => f.id) || []}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {formData.fields?.map((field) => (
                            <SortableFieldCard
                              key={field.id}
                              field={field}
                              isSelected={selectedField === field.id}
                              onSelect={() => setSelectedField(field.id)}
                              onUpdate={(updates) => updateField(field.id, updates)}
                              onDelete={() => deleteField(field.id)}
                              onDuplicate={() => duplicateField(field.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <FormSettingsTab
                  settings={formData.settings!}
                  onChange={(settings) => setFormData(prev => ({ ...prev, settings }))}
                />
              </TabsContent>

              <TabsContent value="notifications">
                <FormNotificationsTab
                  notifications={formData.notifications!}
                  fields={formData.fields!}
                  onChange={(notifications) => setFormData(prev => ({ ...prev, notifications }))}
                />
              </TabsContent>

              <TabsContent value="confirmations">
                <FormConfirmationsTab
                  confirmations={formData.confirmations!}
                  fields={formData.fields!}
                  onChange={(confirmations) => setFormData(prev => ({ ...prev, confirmations }))}
                />
              </TabsContent>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Field Properties */}
        <div className="col-span-4">
          {selectedField && formData.fields?.find(f => f.id === selectedField) ? (
            <FieldPropertiesPanel
              field={formData.fields.find(f => f.id === selectedField)!}
              onUpdate={(field) => updateField(selectedField, field)}
              onClose={() => setSelectedField(null)}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>필드 속성</CardTitle>
                <CardDescription>
                  필드를 선택하여 속성을 편집하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>선택된 필드가 없습니다</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>필드 추가</DialogTitle>
            <DialogDescription>
              양식에 추가할 필드 유형을 선택하세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {Object.entries(
              Object.entries(fieldTypeConfig).reduce((acc, [type, config]) => {
                if (!acc[config.category]) acc[config.category] = [];
                acc[config.category].push({ type, ...config });
                return acc;
              }, {} as Record<string, any[]>)
            ).map(([category, fields]) => (
              <div key={category}>
                <h4 className="font-medium mb-3 capitalize">{category} Fields</h4>
                <div className="grid grid-cols-3 gap-3">
                  {fields.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => addField(type as FormFieldType)}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <Icon className="w-5 h-5 text-gray-500" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {showPreview && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>양식 미리보기</DialogTitle>
              <DialogDescription>
                실제 양식이 어떻게 보이는지 확인하세요
              </DialogDescription>
            </DialogHeader>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{formData.title}</h2>
              {formData.description && (
                <p className="text-gray-600 mb-6">{formData.description}</p>
              )}
              <div className="space-y-4">
                {formData.fields?.map(field => (
                  <div key={field.id}>
                    <Label>{field.label}</Label>
                    <Input placeholder={field.placeholder} disabled />
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Sub-components would be defined here...
// FormSettingsTab, FormNotificationsTab, FormConfirmationsTab, FormPreviewDialog

export default FormBuilder;