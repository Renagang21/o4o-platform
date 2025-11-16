/**
 * CPT Builder Component
 * Based on existing CPTForm.tsx but enhanced for the dedicated dashboard
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Plus, 
  Trash2, 
  Settings,
  Database,
  Globe,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cptApi } from '@/features/cpt-acf/services/cpt.api';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { CustomPostType, CreateCPTDto, UpdateCPTDto } from '@/features/cpt-acf/types/cpt.types';

interface CPTBuilderProps {
  cptTypes: CustomPostType[];
  selectedType?: CustomPostType;
  onUpdate?: () => void;
  onClose?: () => void;
}

const CPTBuilder: React.FC<CPTBuilderProps> = ({ 
  cptTypes, 
  selectedType,
  onUpdate,
  onClose
}) => {
  const queryClient = useQueryClient();
  const { addNotice } = useAdminNotices();
  const [selectedCPT, setSelectedCPT] = useState<CustomPostType | null>(selectedType || null);
  const [isCreating, setIsCreating] = useState(!selectedType);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CreateCPTDto>>({
    slug: selectedType?.slug || '',
    label: selectedType?.label || '',
    singularLabel: selectedType?.singularLabel || '',
    description: selectedType?.description || '',
    icon: selectedType?.icon || 'file-text',
    isActive: selectedType?.isActive ?? true,
    public: selectedType?.public ?? true,
    showInMenu: selectedType?.showInMenu ?? true,
    menuPosition: selectedType?.menuPosition || 25,
    hasArchive: selectedType?.hasArchive ?? true,
    supports: (selectedType?.supports || ['title', 'editor', 'thumbnail']) as any,
    rewrite: selectedType?.rewrite || { slug: '', withFront: true },
    capabilities: selectedType?.capabilities || {},
    taxonomies: selectedType?.taxonomies || [],
    // Phase 1: Preset IDs
    defaultViewPresetId: selectedType?.defaultViewPresetId || undefined,
    defaultTemplatePresetId: selectedType?.defaultTemplatePresetId || undefined
  });

  // Available supports features
  const supportFeatures = [
    { id: 'title', label: '제목', icon: FileText },
    { id: 'editor', label: '편집기', icon: FileText },
    { id: 'thumbnail', label: '대표 이미지', icon: Eye },
    { id: 'excerpt', label: '요약', icon: FileText },
    { id: 'comments', label: '댓글', icon: FileText },
    { id: 'revisions', label: '리비전', icon: Database },
    { id: 'page-attributes', label: '페이지 속성', icon: Settings }
  ];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateCPTDto) => {
      return await cptApi.createType(data);
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: '새 콘텐츠 타입이 생성되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['cpt-types'] });
      onUpdate?.();
      setIsCreating(false);
      setFormData({});
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `생성 실패: ${error.message}`
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: UpdateCPTDto }) => {
      return await cptApi.updateType(slug, data);
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: '콘텐츠 타입이 업데이트되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['cpt-types'] });
      onUpdate?.();
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `업데이트 실패: ${error.message}`
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (slug: string) => {
      return await cptApi.deleteType(slug);
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: '콘텐츠 타입이 삭제되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['cpt-types'] });
      setSelectedCPT(null);
      onUpdate?.();
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `삭제 실패: ${error.message}`
      });
    }
  });

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle supports toggle
  const handleSupportsToggle = (feature: string) => {
    const currentSupports = formData.supports || [];
    const newSupports = currentSupports.includes(feature)
      ? currentSupports.filter(s => s !== feature)
      : [...currentSupports, feature];
    
    handleInputChange('supports', newSupports);
  };

  // Handle save
  const handleSave = async () => {
    if (isCreating) {
      await createMutation.mutate(formData as CreateCPTDto);
    } else if (selectedCPT) {
      await updateMutation.mutate({
        slug: selectedCPT.slug,
        data: formData as UpdateCPTDto
      });
    }
  };

  // Load CPT data for editing
  const loadCPT = (cpt: CustomPostType) => {
    setSelectedCPT(cpt);
    setIsCreating(false);
    setFormData({
      slug: cpt.slug,
      label: cpt.label,
      singularLabel: cpt.singularLabel,
      description: cpt.description,
      icon: cpt.icon,
      isActive: cpt.isActive,
      public: cpt.public,
      showInMenu: cpt.showInMenu,
      menuPosition: cpt.menuPosition,
      hasArchive: cpt.hasArchive,
      supports: cpt.supports as any,
      rewrite: cpt.rewrite,
      capabilities: cpt.capabilities,
      taxonomies: cpt.taxonomies,
      // Phase 1: Preset IDs
      defaultViewPresetId: cpt.defaultViewPresetId,
      defaultTemplatePresetId: cpt.defaultTemplatePresetId
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* CPT List Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>콘텐츠 타입 목록</CardTitle>
            <CardDescription>등록된 모든 CPT를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full justify-start"
              variant={isCreating ? 'default' : 'outline'}
              onClick={() => {
                setIsCreating(true);
                setSelectedCPT(null);
                setFormData({
                  slug: '',
                  label: '',
                  singularLabel: '',
                  description: '',
                  icon: 'file-text',
                  isActive: true,
                  public: true,
                  showInMenu: true,
                  menuPosition: 25,
                  hasArchive: true,
                  supports: ['title', 'editor', 'thumbnail'],
                  rewrite: { slug: '', withFront: true },
                  capabilities: {},
                  taxonomies: []
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              새 타입 추가
            </Button>
            
            <div className="space-y-1">
              {cptTypes.map(cpt => (
                <Button
                  key={cpt.slug}
                  variant={selectedCPT?.slug === cpt.slug ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => loadCPT(cpt)}
                >
                  <Database className="h-4 w-4 mr-2" />
                  {cpt.label}
                  {!cpt.isActive && <EyeOff className="h-3 w-3 ml-auto" />}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CPT Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating ? '새 콘텐츠 타입 생성' : `${formData.label} 편집`}
            </CardTitle>
            <CardDescription>
              콘텐츠 타입의 기본 설정을 구성합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">기본 정보</TabsTrigger>
                <TabsTrigger value="display">표시 설정</TabsTrigger>
                <TabsTrigger value="advanced">고급 설정</TabsTrigger>
              </TabsList>

              {/* Basic Information */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="slug">슬러그 (Slug)</Label>
                    <Input
                      id="slug"
                      value={formData.slug || ''}
                      onChange={(e) => handleInputChange('slug', e.target.value)}
                      placeholder="예: product, portfolio"
                      disabled={!isCreating}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL과 데이터베이스에서 사용되는 고유 식별자
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="label">레이블 (복수형)</Label>
                    <Input
                      id="label"
                      value={formData.label || ''}
                      onChange={(e) => handleInputChange('label', e.target.value)}
                      placeholder="예: 상품들"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="singularLabel">레이블 (단수형)</Label>
                    <Input
                      id="singularLabel"
                      value={formData.singularLabel || ''}
                      onChange={(e) => handleInputChange('singularLabel', e.target.value)}
                      placeholder="예: 상품"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">설명</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="이 콘텐츠 타입에 대한 설명을 입력하세요"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive || false}
                      onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                    />
                    <Label htmlFor="isActive">활성화</Label>
                  </div>
                </div>
              </TabsContent>

              {/* Display Settings */}
              <TabsContent value="display" className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="public"
                      checked={formData.public || false}
                      onCheckedChange={(checked) => handleInputChange('public', checked)}
                    />
                    <Label htmlFor="public">공개 (Public)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="showInMenu"
                      checked={formData.showInMenu || false}
                      onCheckedChange={(checked) => handleInputChange('showInMenu', checked)}
                    />
                    <Label htmlFor="showInMenu">메뉴에 표시</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="hasArchive"
                      checked={formData.hasArchive || false}
                      onCheckedChange={(checked) => handleInputChange('hasArchive', checked)}
                    />
                    <Label htmlFor="hasArchive">
                      아카이브 페이지 (인덱스)
                      <span className="text-xs text-muted-foreground block">
                        콘텐츠 목록을 보여주는 인덱스 페이지를 생성합니다
                      </span>
                    </Label>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="menuPosition">메뉴 위치</Label>
                    <Input
                      id="menuPosition"
                      type="number"
                      value={formData.menuPosition || 25}
                      onChange={(e) => handleInputChange('menuPosition', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>지원 기능</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {supportFeatures.map(feature => (
                        <div key={feature.id} className="flex items-center space-x-2">
                          <Switch
                            id={`support-${feature.id}`}
                            checked={formData.supports?.includes(feature.id) || false}
                            onCheckedChange={() => handleSupportsToggle(feature.id)}
                          />
                          <Label htmlFor={`support-${feature.id}`} className="text-sm">
                            {feature.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Settings */}
              <TabsContent value="advanced" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rewriteSlug">Rewrite Slug</Label>
                    <Input
                      id="rewriteSlug"
                      value={formData.rewrite?.slug || ''}
                      onChange={(e) => handleInputChange('rewrite', {
                        ...formData.rewrite,
                        slug: e.target.value
                      })}
                      placeholder="URL 재작성 슬러그"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="withFront"
                      checked={formData.rewrite?.withFront || false}
                      onCheckedChange={(checked) => handleInputChange('rewrite', {
                        ...formData.rewrite,
                        withFront: checked
                      })}
                    />
                    <Label htmlFor="withFront">Front 접두사 사용</Label>
                  </div>

                  {/* Phase 1: Preset Selection */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-3">Preset 설정 (Phase 1)</h4>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="defaultViewPresetId">
                          기본 Archive ViewPreset ID
                        </Label>
                        <Input
                          id="defaultViewPresetId"
                          value={formData.defaultViewPresetId || ''}
                          onChange={(e) => handleInputChange('defaultViewPresetId', e.target.value || undefined)}
                          placeholder="ViewPreset UUID (선택사항)"
                        />
                        <p className="text-xs text-muted-foreground">
                          이 CPT의 Archive(목록) 페이지에서 사용할 기본 ViewPreset ID
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="defaultTemplatePresetId">
                          기본 Single TemplatePreset ID
                        </Label>
                        <Input
                          id="defaultTemplatePresetId"
                          value={formData.defaultTemplatePresetId || ''}
                          onChange={(e) => handleInputChange('defaultTemplatePresetId', e.target.value || undefined)}
                          placeholder="TemplatePreset UUID (선택사항)"
                        />
                        <p className="text-xs text-muted-foreground">
                          이 CPT의 Single(상세) 페이지에서 사용할 기본 TemplatePreset ID
                        </p>
                      </div>

                      <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                        💡 TODO(Phase2): 드롭다운으로 Preset 목록 선택 기능 추가 예정
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-between mt-6">
              <div>
                {selectedCPT && !isCreating && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm('이 콘텐츠 타입을 삭제하시겠습니까?')) {
                        deleteMutation.mutate(selectedCPT.slug);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCPT(null);
                    setIsCreating(false);
                    onClose?.();
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isCreating ? '생성' : '저장'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CPTBuilder;