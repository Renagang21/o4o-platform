import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import WordPressEditorWrapper from '@/components/editor/WordPressEditorWrapper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';


export default function TemplatePartEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    area: 'general' as 'header' | 'footer' | 'sidebar' | 'general',
    content: [],
    settings: {
      containerWidth: 'wide' as 'full' | 'wide' | 'narrow',
      backgroundColor: '',
      textColor: '',
      padding: {
        top: '',
        bottom: '',
        left: '',
        right: ''
      },
      customCss: ''
    },
    isActive: true,
    isDefault: false,
    priority: 0,
    conditions: {
      pages: [] as string[],
      postTypes: [] as string[],
      categories: [] as string[],
      userRoles: [] as string[]
    }
  });

  const [blocks, setBlocks] = useState<any[]>([]);

  // Fetch template part if editing
  const { data: templatePart, isLoading } = useQuery<any>({
    queryKey: ['template-part', id],
    queryFn: async () => {
      if (!isEditMode) return null;
      const response = await authClient.api.get(`/template-parts/${id}`);
      return response.data;
    },
    enabled: !!isEditMode
  });

  // Load template part data
  useEffect(() => {
    if (templatePart) {
      setFormData({
        name: templatePart.name,
        slug: templatePart.slug,
        description: templatePart.description || '',
        area: templatePart.area,
        content: templatePart.content,
        settings: {
          ...formData.settings,
          ...templatePart.settings
        },
        isActive: templatePart.isActive,
        isDefault: templatePart.isDefault,
        priority: templatePart.priority || 0,
        conditions: templatePart.conditions || formData.conditions
      });

      // Convert content to WordPress blocks
      // Since content is already in block format, we can use it directly
      setBlocks(templatePart.content);
    }
  }, [templatePart]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authClient.api.post('/template-parts', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('템플릿 파트가 생성되었습니다');
      queryClient.invalidateQueries({ queryKey: ['template-parts'] });
      navigate('/appearance/template-parts');
    },
    onError: () => {
      toast.error('템플릿 파트 생성에 실패했습니다');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await authClient.api.put(`/template-parts/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('템플릿 파트가 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['template-parts'] });
      queryClient.invalidateQueries({ queryKey: ['template-part', id] });
    },
    onError: () => {
      toast.error('템플릿 파트 수정에 실패했습니다');
    }
  });

  // Handle block editor changes
  const handleBlocksChange = (_content: string, blocks: any[]) => {
    setBlocks(blocks);
  };

  // Handle form submission
  const handleSubmit = () => {
    // Convert blocks to our format
    const contentBlocks = blocks.map(block => ({
      id: block.clientId,
      type: block.name,
      data: block.attributes,
      innerBlocks: block.innerBlocks ? convertInnerBlocks(block.innerBlocks) : undefined
    }));

    const submitData = {
      ...formData,
      content: contentBlocks
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Convert inner blocks recursively
  const convertInnerBlocks = (innerBlocks: any[]): any[] => {
    return innerBlocks.map(block => ({
      id: block.clientId,
      type: block.name,
      data: block.attributes,
      innerBlocks: block.innerBlocks ? convertInnerBlocks(block.innerBlocks) : undefined
    }));
  };

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/appearance/template-parts')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          템플릿 파트 목록
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? '템플릿 파트 수정' : '새 템플릿 파트'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <div className="wp-card">
            <div className="wp-card-body space-y-4">
              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (!isEditMode && !formData.slug) {
                      setFormData(prev => ({
                        ...prev,
                        slug: generateSlug(e.target.value)
                      }));
                    }
                  }}
                  placeholder="템플릿 파트 이름"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="slug">슬러그</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="template-part-slug"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">설명 (선택사항)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="이 템플릿 파트에 대한 설명"
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Block Editor */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h2 className="text-lg font-medium">콘텐츠 편집</h2>
            </div>
            <div className="wp-card-body">
              <WordPressEditorWrapper
                initialContent=""
                onChange={handleBlocksChange}
                showReusableBlocks={true}
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="wp-card">
            <div className="wp-card-body">
              <Tabs defaultValue="styles">
                <TabsList>
                  <TabsTrigger value="styles">스타일</TabsTrigger>
                  <TabsTrigger value="conditions">조건</TabsTrigger>
                  <TabsTrigger value="advanced">고급</TabsTrigger>
                </TabsList>

                <TabsContent value="styles" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="containerWidth">컨테이너 너비</Label>
                    <Select
                      value={formData.settings.containerWidth}
                      onValueChange={(value: any) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, containerWidth: value }
                      })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">전체 너비</SelectItem>
                        <SelectItem value="wide">넓은 너비 (max-w-7xl)</SelectItem>
                        <SelectItem value="narrow">좁은 너비 (max-w-4xl)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="backgroundColor">배경색</Label>
                      <Input
                        id="backgroundColor"
                        type="color"
                        value={formData.settings.backgroundColor || '#ffffff'}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, backgroundColor: e.target.value }
                        })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="textColor">텍스트 색상</Label>
                      <Input
                        id="textColor"
                        type="color"
                        value={formData.settings.textColor || '#000000'}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, textColor: e.target.value }
                        })}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>패딩</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <Input
                        placeholder="상단"
                        value={formData.settings.padding?.top || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            padding: { ...formData.settings.padding, top: e.target.value }
                          }
                        })}
                      />
                      <Input
                        placeholder="우측"
                        value={formData.settings.padding?.right || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            padding: { ...formData.settings.padding, right: e.target.value }
                          }
                        })}
                      />
                      <Input
                        placeholder="하단"
                        value={formData.settings.padding?.bottom || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            padding: { ...formData.settings.padding, bottom: e.target.value }
                          }
                        })}
                      />
                      <Input
                        placeholder="좌측"
                        value={formData.settings.padding?.left || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings,
                            padding: { ...formData.settings.padding, left: e.target.value }
                          }
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="customCss">사용자 정의 CSS</Label>
                    <Textarea
                      id="customCss"
                      value={formData.settings.customCss || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, customCss: e.target.value }
                      })}
                      placeholder=".template-part-header { /* CSS */ }"
                      className="mt-2 font-mono text-sm"
                      rows={5}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="conditions" className="space-y-4 mt-4">
                  <p className="text-sm text-gray-600">
                    특정 페이지나 조건에서만 이 템플릿 파트가 표시되도록 설정할 수 있습니다.
                  </p>
                  {/* TODO: Implement condition settings */}
                  <div className="text-center py-8 text-gray-500">
                    조건부 표시 설정은 추후 업데이트될 예정입니다.
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="priority">우선순위</Label>
                    <Input
                      id="priority"
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        priority: parseInt(e.target.value) || 0 
                      })}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      같은 영역에 여러 템플릿 파트가 있을 때 표시 순서를 결정합니다. (낮은 숫자가 먼저 표시)
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish settings */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="font-medium">게시</h3>
            </div>
            <div className="wp-card-body space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">영역:</span>
                <Select
                  value={formData.area}
                  onValueChange={(value: any) => setFormData({ ...formData, area: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header">헤더</SelectItem>
                    <SelectItem value="footer">푸터</SelectItem>
                    <SelectItem value="sidebar">사이드바</SelectItem>
                    <SelectItem value="general">일반</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive" className="text-sm">활성화</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isDefault" className="text-sm">기본 템플릿</Label>
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
              </div>

              <div className="pt-4 border-t">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? '업데이트' : '게시'}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="font-medium">미리보기</h3>
            </div>
            <div className="wp-card-body">
              <p className="text-sm text-gray-600">
                저장 후 사이트에서 실제로 어떻게 보이는지 확인할 수 있습니다.
              </p>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => window.open('/', '_blank')}
              >
                <Eye className="w-4 h-4 mr-2" />
                사이트에서 보기
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}