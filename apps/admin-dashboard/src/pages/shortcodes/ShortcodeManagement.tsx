import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Code, Search, Copy, Eye, Plus,
  Package, Hash, FileText, CheckCircle, XCircle,
  Sparkles, BookOpen, BarChart3, FolderTree, Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// Types
interface ShortcodeAttribute {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'url';
  required: boolean;
  default?: any;
  description: string;
  options?: string[];
}

interface ShortcodeExample {
  title: string;
  code: string;
  description?: string;
  preview?: string;
}

interface Shortcode {
  id: string;
  appId: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  icon?: string;
  attributes?: ShortcodeAttribute[];
  examples?: ShortcodeExample[];
  defaultContent?: string;
  selfClosing: boolean;
  status: 'active' | 'inactive' | 'deprecated';
  version?: string;
  documentation?: string;
  tags?: string[];
  usageCount: number;
  isVisible: boolean;
}

interface App {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  icon?: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  content: <FileText className="w-4 h-4" />,
  media: <Package className="w-4 h-4" />,
  social: <Hash className="w-4 h-4" />,
  ecommerce: <Package className="w-4 h-4" />,
  form: <FileText className="w-4 h-4" />,
  layout: <Package className="w-4 h-4" />,
  widget: <Sparkles className="w-4 h-4" />,
  utility: <Code className="w-4 h-4" />
};

const categoryLabels: Record<string, string> = {
  content: '콘텐츠',
  media: '미디어',
  social: '소셜',
  ecommerce: '전자상거래',
  form: '폼',
  layout: '레이아웃',
  widget: '위젯',
  utility: '유틸리티'
};

export default function ShortcodeManagement() {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedShortcode, setSelectedShortcode] = useState<Shortcode | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Determine current view based on route
  const currentView = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/by-app')) return 'by-app';
    if (path.includes('/by-category')) return 'by-category';
    if (path.includes('/stats')) return 'stats';
    if (path.includes('/settings')) return 'settings';
    return 'all';
  }, [location.pathname]);

  // Page titles and descriptions based on view
  const pageInfo = useMemo(() => {
    switch (currentView) {
      case 'by-app':
        return {
          title: '앱별 Shortcode 관리',
          description: '각 앱에서 제공하는 Shortcode들을 앱별로 분류하여 관리합니다.',
          icon: <Package className="w-6 h-6" />
        };
      case 'by-category':
        return {
          title: '카테고리별 Shortcode 관리',
          description: 'Shortcode들을 기능별 카테고리로 분류하여 관리합니다.',
          icon: <FolderTree className="w-6 h-6" />
        };
      case 'stats':
        return {
          title: 'Shortcode 사용 통계',
          description: 'Shortcode 사용량과 성능 지표를 확인합니다.',
          icon: <BarChart3 className="w-6 h-6" />
        };
      case 'settings':
        return {
          title: 'Shortcode 설정',
          description: 'Shortcode 시스템의 전역 설정을 관리합니다.',
          icon: <Settings className="w-6 h-6" />
        };
      default:
        return {
          title: 'Shortcode 통합 관리',
          description: '모든 앱의 Shortcode를 통합적으로 관리하고 사용할 수 있습니다.',
          icon: <Code className="w-6 h-6" />
        };
    }
  }, [currentView]);

  // Fetch shortcodes
  const { data: shortcodes = [], isLoading } = useQuery({
    queryKey: ['shortcodes', selectedCategory, selectedApp, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedApp !== 'all') params.append('appId', selectedApp);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await apiClient.get(`/api/v1/shortcodes?${params}`);
      return response.data.data || [];
    }
  });

  // Fetch apps
  const { data: apps = [] } = useQuery({
    queryKey: ['apps'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/apps/plugins');
      return response.data.data || [];
    }
  });

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string = 'Shortcode') => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label}가 클립보드에 복사되었습니다.`);
    });
  };

  // Filter shortcodes
  const filteredShortcodes = shortcodes.filter((sc: Shortcode) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        sc.name.toLowerCase().includes(search) ||
        sc.displayName.toLowerCase().includes(search) ||
        sc.description?.toLowerCase().includes(search) ||
        sc.tags?.some(tag => tag.toLowerCase().includes(search))
      );
    }
    return true;
  });

  // Group shortcodes by app
  const groupedShortcodes = filteredShortcodes.reduce((acc: Record<string, Shortcode[]>, sc: Shortcode) => {
    const appName = apps.find((app: App) => app.id === sc.appId)?.name || sc.appId;
    if (!acc[appName]) acc[appName] = [];
    acc[appName].push(sc);
    return acc;
  }, {});

  const renderShortcodeCard = (shortcode: Shortcode) => {
    const app = apps.find((a: App) => a.id === shortcode.appId);
    const isAppActive = app?.status === 'active';
    const isActive = shortcode.status === 'active' && isAppActive;

    return (
      <Card 
        key={shortcode.id} 
        className={`transition-all hover:shadow-lg ${!isActive ? 'opacity-60' : ''}`}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {categoryIcons[shortcode.category] || <Code className="w-4 h-4" />}
              <CardTitle className="text-lg">{shortcode.displayName}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {shortcode.status === 'deprecated' && (
                <Badge variant="destructive" className="text-xs">
                  Deprecated
                </Badge>
              )}
              {!isAppActive && (
                <Badge variant="secondary" className="text-xs">
                  앱 비활성화
                </Badge>
              )}
              {isActive ? (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  활성
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <XCircle className="w-3 h-3 mr-1" />
                  비활성
                </Badge>
              )}
            </div>
          </div>
          <CardDescription className="mt-2">
            {shortcode.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {/* Shortcode 표시 */}
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono text-sm flex items-center justify-between">
              <span className="text-blue-600 dark:text-blue-400">
                [{shortcode.name}]
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(`[${shortcode.name}]`)}
                title="복사"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            {/* 속성 표시 */}
            {shortcode.attributes && shortcode.attributes.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">속성:</p>
                <div className="flex flex-wrap gap-1">
                  {shortcode.attributes.slice(0, 3).map((attr) => (
                    <Badge key={attr.name} variant="outline" className="text-xs">
                      {attr.name}{attr.required && '*'}
                    </Badge>
                  ))}
                  {shortcode.attributes.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{shortcode.attributes.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* 태그 */}
            {shortcode.tags && shortcode.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {shortcode.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 사용 횟수 */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>사용 횟수: {shortcode.usageCount}회</span>
              {shortcode.version && <span>v{shortcode.version}</span>}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedShortcode(shortcode);
                setShowDetails(true);
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              상세보기
            </Button>
            {shortcode.examples && shortcode.examples.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedShortcode(shortcode);
                  setShowPreview(true);
                }}
              >
                <BookOpen className="w-4 h-4 mr-1" />
                예제
              </Button>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            {categoryLabels[shortcode.category] || shortcode.category}
          </Badge>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {pageInfo.icon}
            <h1 className="text-3xl font-bold">{pageInfo.title}</h1>
          </div>
          <p className="text-gray-600">
            {pageInfo.description}
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          커스텀 Shortcode 추가
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Shortcode 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 카테고리</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedApp} onValueChange={setSelectedApp}>
              <SelectTrigger>
                <SelectValue placeholder="앱 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 앱</SelectItem>
                {apps.map((app: App) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shortcodes List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grid">그리드 보기</TabsTrigger>
            <TabsTrigger value="grouped">앱별 그룹</TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredShortcodes.map((shortcode: Shortcode) => renderShortcodeCard(shortcode))}
            </div>
            {filteredShortcodes.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">검색 결과가 없습니다</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="grouped">
            <div className="space-y-6">
              {Object.entries(groupedShortcodes).map(([appName, shortcodes]) => (
                <div key={appName}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {appName}
                    <Badge variant="secondary">{(shortcodes as Shortcode[]).length}</Badge>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(shortcodes as Shortcode[]).map((shortcode) => renderShortcodeCard(shortcode))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedShortcode && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  {selectedShortcode.displayName}
                </DialogTitle>
                <DialogDescription>
                  {selectedShortcode.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {/* Basic Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold">기본 정보</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Shortcode:</span>
                      <code className="text-sm font-mono">[{selectedShortcode.name}]</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">카테고리:</span>
                      <span className="text-sm">{categoryLabels[selectedShortcode.category]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Self-closing:</span>
                      <span className="text-sm">{selectedShortcode.selfClosing ? 'Yes' : 'No'}</span>
                    </div>
                    {selectedShortcode.version && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">버전:</span>
                        <span className="text-sm">v{selectedShortcode.version}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attributes */}
                {selectedShortcode.attributes && selectedShortcode.attributes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">속성</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="text-left p-3">이름</th>
                            <th className="text-left p-3">타입</th>
                            <th className="text-left p-3">필수</th>
                            <th className="text-left p-3">기본값</th>
                            <th className="text-left p-3">설명</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedShortcode.attributes.map((attr, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="p-3 font-mono">{attr.name}</td>
                              <td className="p-3">{attr.type}</td>
                              <td className="p-3">
                                {attr.required ? (
                                  <Badge variant="destructive" className="text-xs">필수</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">선택</Badge>
                                )}
                              </td>
                              <td className="p-3 font-mono text-xs">
                                {attr.default || '-'}
                              </td>
                              <td className="p-3 text-xs">{attr.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Documentation */}
                {selectedShortcode.documentation && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">문서</h4>
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: selectedShortcode.documentation }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedShortcode && selectedShortcode.examples && (
            <>
              <DialogHeader>
                <DialogTitle>예제 및 미리보기</DialogTitle>
                <DialogDescription>
                  {selectedShortcode.displayName}의 사용 예제입니다
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {selectedShortcode.examples?.map((example, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="font-semibold">{example.title}</h4>
                    {example.description && (
                      <p className="text-sm text-gray-600">{example.description}</p>
                    )}
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-400">CODE</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(example.code, '예제 코드')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <pre className="text-sm overflow-x-auto">
                        <code>{example.code}</code>
                      </pre>
                    </div>
                    {example.preview && (
                      <div className="border rounded-lg p-4">
                        <span className="text-xs text-gray-500">PREVIEW</span>
                        <div className="mt-2" dangerouslySetInnerHTML={{ __html: example.preview }} />
                      </div>
                    )}
                    {idx < (selectedShortcode.examples?.length || 0) - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}