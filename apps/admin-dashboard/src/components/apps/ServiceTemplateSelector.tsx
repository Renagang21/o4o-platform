/**
 * Service Template Selector Component
 * Phase 7 — Service Templates & App Installer Automation
 *
 * Allows users to browse, preview, and install service templates
 */

import { FC, useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Package,
  Download,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Loader2,
  Filter,
  Tag,
  Clock,
  User,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  adminAppsApi,
  ServiceTemplate,
  ServiceGroup,
  TemplateCategory,
  InstallationPreview,
} from '@/api/admin-apps';

// Service Group display labels
const SERVICE_GROUP_LABELS: Record<ServiceGroup, string> = {
  cosmetics: '화장품 판매',
  yaksa: '약사회',
  tourist: '관광',
  sellerops: '셀러 운영',
  supplierops: '공급사 운영',
  partnerops: '파트너 운영',
  signage: '디지털 사이니지',
  'platform-core': '플랫폼 코어',
  global: '전역',
};

// Category display labels
const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  commerce: '커머스',
  organization: '조직',
  community: '커뮤니티',
  education: '교육',
  health: '헬스케어',
  retail: '리테일',
};

// Service Group icons/colors
const SERVICE_GROUP_COLORS: Record<ServiceGroup, string> = {
  cosmetics: 'bg-pink-500',
  yaksa: 'bg-green-500',
  tourist: 'bg-amber-500',
  sellerops: 'bg-red-500',
  supplierops: 'bg-teal-500',
  partnerops: 'bg-indigo-500',
  signage: 'bg-violet-500',
  'platform-core': 'bg-gray-600',
  global: 'bg-gray-500',
};

interface ServiceTemplateSelectorProps {
  onInstallComplete?: () => void;
}

const ServiceTemplateSelector: FC<ServiceTemplateSelectorProps> = ({ onInstallComplete }) => {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [preview, setPreview] = useState<InstallationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [installExtensions, setInstallExtensions] = useState(false);
  const { toast } = useToast();

  // Filters
  const [serviceGroupFilter, setServiceGroupFilter] = useState<ServiceGroup | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await adminAppsApi.getTemplates({ activeOnly: true });
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast({
        title: '템플릿 로드 실패',
        description: '서비스 템플릿을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (serviceGroupFilter !== 'all') {
      filtered = filtered.filter(t => t.serviceGroup === serviceGroupFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    return filtered;
  }, [templates, serviceGroupFilter, categoryFilter]);

  // Get unique service groups and categories for filters
  const availableServiceGroups = useMemo(() => {
    const groups = new Set(templates.map(t => t.serviceGroup));
    return Array.from(groups);
  }, [templates]);

  const availableCategories = useMemo(() => {
    const cats = new Set(templates.filter(t => t.category).map(t => t.category!));
    return Array.from(cats);
  }, [templates]);

  // Load preview when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      loadPreview(selectedTemplate);
    } else {
      setPreview(null);
    }
  }, [selectedTemplate, installExtensions]);

  const loadPreview = async (templateId: string) => {
    setPreviewLoading(true);
    try {
      const data = await adminAppsApi.getInstallationPreview(templateId, {
        installExtensions,
      });
      setPreview(data);
    } catch (error) {
      console.error('Failed to load preview:', error);
      toast({
        title: '미리보기 실패',
        description: '설치 미리보기를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleInstall = async (templateId: string) => {
    setInstalling(templateId);
    try {
      const result = await adminAppsApi.installTemplate(templateId, {
        installExtensions,
      });

      if (result.success) {
        toast({
          title: '설치 완료',
          description: `${result.installed.length}개 앱이 설치되었습니다.`,
        });
        setSelectedTemplate(null);
        onInstallComplete?.();
      } else {
        toast({
          title: '일부 설치 실패',
          description: `설치됨: ${result.installed.length}, 실패: ${result.failed.length}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Failed to install template:', error);
      const errorMessage = error.response?.data?.error || error.message || '알 수 없는 오류';
      toast({
        title: '설치 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setInstalling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5" />
            서비스 템플릿
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            서비스 유형에 맞는 앱 번들을 한 번에 설치합니다.
          </p>
        </div>
        <Badge variant="outline">{templates.length}개 템플릿</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Service Group Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={serviceGroupFilter}
            onChange={(e) => setServiceGroupFilter(e.target.value as ServiceGroup | 'all')}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="all">모든 서비스</option>
            {availableServiceGroups.map((group) => (
              <option key={group} value={group}>
                {SERVICE_GROUP_LABELS[group]}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as TemplateCategory | 'all')}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[130px]"
          >
            <option value="all">모든 카테고리</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            조건에 맞는 템플릿이 없습니다.
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedTemplate(
                selectedTemplate === template.id ? null : template.id
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${SERVICE_GROUP_COLORS[template.serviceGroup]}`} />
                    {template.label}
                  </span>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      selectedTemplate === template.id ? 'rotate-90' : ''
                    }`}
                  />
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {SERVICE_GROUP_LABELS[template.serviceGroup]}
                    </Badge>
                    {template.category && (
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_LABELS[template.category]}
                      </Badge>
                    )}
                  </div>

                  {/* App counts */}
                  <div className="text-sm text-gray-600 flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      핵심 앱 {template.coreApps.length}개
                    </span>
                    {template.extensionApps && template.extensionApps.length > 0 && (
                      <span className="flex items-center gap-1 text-purple-600">
                        +확장 {template.extensionApps.length}개
                      </span>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="text-xs text-gray-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      v{template.version}
                    </span>
                    {template.author && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {template.author}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Panel */}
      {selectedTemplate && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">설치 미리보기</CardTitle>
              <CardDescription>
                이 템플릿을 설치하면 다음 앱들이 설치됩니다.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTemplate(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : preview ? (
              <div className="space-y-4">
                {/* Options */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="installExtensions"
                    checked={installExtensions}
                    onChange={(e) => setInstallExtensions(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="installExtensions" className="text-sm text-gray-600">
                    확장 앱도 함께 설치
                  </label>
                </div>

                {/* Issues */}
                {preview.issues.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      문제 발견
                    </div>
                    <ul className="text-sm text-red-600 space-y-1">
                      {preview.issues.map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Apps to install */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-500" />
                    설치될 앱 ({preview.appsToInstall.length}개)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {preview.dependencyOrder.map((appId) => (
                      <Badge
                        key={appId}
                        variant={preview.alreadyInstalled.includes(appId) ? 'secondary' : 'default'}
                        className={preview.alreadyInstalled.includes(appId) ? 'bg-gray-200' : 'bg-blue-500'}
                      >
                        {appId}
                        {preview.alreadyInstalled.includes(appId) && (
                          <CheckCircle className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Already installed */}
                {preview.alreadyInstalled.length > 0 && (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    이미 설치됨: {preview.alreadyInstalled.length}개 (건너뜀)
                  </div>
                )}

                {/* Install button */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => handleInstall(selectedTemplate)}
                    disabled={installing === selectedTemplate || preview.issues.length > 0}
                    className="w-full"
                  >
                    {installing === selectedTemplate ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        설치 중...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        템플릿 설치
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                미리보기를 불러오는 중 오류가 발생했습니다.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ServiceTemplateSelector;
