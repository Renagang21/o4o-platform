import { FC, useState } from 'react';
import { 
  Package,
  Upload,
  Search,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// 플러그인(앱) 타입 정의
interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  authorUri?: string;
  pluginUri?: string;
  license?: string;
  category: string;
  tags: string[];
  icon?: string;
  status: 'active' | 'inactive' | 'update-available' | 'error';
  isCore: boolean;
  dependencies?: string[];
  requiredVersion?: string;
  testedUpTo?: string;
  rating?: number;
  activeInstalls?: number;
  lastUpdated?: string;
  updateVersion?: string;
  changelog?: string;
  permissions?: string[];
}

// WordPress 스타일 플러그인 목록
const pluginsList: Plugin[] = [
  {
    id: 'ecommerce',
    name: 'O4O eCommerce',
    description: '완벽한 온라인 쇼핑몰 솔루션. 상품 관리, 재고 추적, 주문 처리, 다양한 결제 게이트웨이를 지원합니다.',
    version: '2.0.0',
    author: 'O4O Team',
    authorUri: 'https://o4o.com',
    pluginUri: 'https://o4o.com/plugins/ecommerce',
    license: 'GPL v2 or later',
    category: 'Sales',
    tags: ['ecommerce', 'shop', 'payment', 'products'],
    status: 'active',
    isCore: true,
    testedUpTo: '6.0.0',
    rating: 4.8,
    activeInstalls: 5000000,
    lastUpdated: '2024-01-15',
    permissions: ['manage_products', 'manage_orders', 'manage_payments']
  },
  {
    id: 'affiliate',
    name: 'Affiliate Marketing Pro',
    description: '강력한 제휴 마케팅 시스템. 추천 링크 생성, 수수료 추적, 파트너 대시보드, 상세한 실적 분석을 제공합니다.',
    version: '1.5.0',
    author: 'O4O Team',
    category: 'Marketing',
    tags: ['affiliate', 'marketing', 'referral', 'commission'],
    status: 'inactive',
    isCore: false,
    dependencies: ['ecommerce'],
    rating: 4.5,
    activeInstalls: 1200000,
    lastUpdated: '2024-01-10',
    permissions: ['manage_affiliates', 'view_reports']
  },
  {
    id: 'crowdfunding',
    name: 'CrowdFunding Platform',
    description: '프로젝트 펀딩 및 후원 관리. 목표 설정, 리워드 시스템, 후원자 관리, 실시간 펀딩 추적.',
    version: '1.2.0',
    author: 'O4O Team',
    category: 'Finance',
    tags: ['crowdfunding', 'donation', 'fundraising'],
    status: 'active',
    isCore: false,
    dependencies: ['ecommerce'],
    updateVersion: '1.3.0',
    rating: 4.6,
    activeInstalls: 800000,
    lastUpdated: '2024-01-08',
    permissions: ['manage_campaigns', 'manage_backers']
  },
  {
    id: 'forum',
    name: 'Community Forums',
    description: '완벽한 커뮤니티 포럼 솔루션. 게시판, 사용자 등급, 포인트 시스템, 실시간 알림.',
    version: '1.8.0',
    author: 'O4O Team',
    category: 'Community',
    tags: ['forum', 'community', 'discussion', 'bbpress'],
    status: 'active',
    isCore: false,
    rating: 4.7,
    activeInstalls: 2000000,
    lastUpdated: '2024-01-12',
    permissions: ['moderate_forums', 'manage_topics']
  },
  {
    id: 'signage',
    name: 'Digital Signage Manager',
    description: '디지털 디스플레이 콘텐츠 관리. 스케줄링, 멀티미디어 지원, 원격 제어.',
    version: '1.0.0',
    author: 'O4O Team',
    category: 'Media',
    tags: ['signage', 'display', 'digital', 'screen'],
    status: 'inactive',
    isCore: false,
    rating: 4.3,
    activeInstalls: 150000,
    lastUpdated: '2024-01-05',
    permissions: ['manage_displays', 'upload_media']
  },
  {
    id: 'dropshipping',
    name: 'Dropshipping Integration',
    description: '드롭쉬핑 자동화. 공급업체 연동, 자동 주문 처리, 재고 동기화.',
    version: '1.1.0',
    author: 'O4O Team',
    category: 'Sales',
    tags: ['dropshipping', 'supplier', 'automation'],
    status: 'inactive',
    isCore: false,
    dependencies: ['ecommerce'],
    rating: 4.4,
    activeInstalls: 500000,
    lastUpdated: '2024-01-03',
    permissions: ['manage_suppliers', 'sync_inventory']
  },
  {
    id: 'analytics',
    name: 'Advanced Analytics',
    description: '고급 분석 및 리포팅. 실시간 통계, 사용자 행동 분석, 전환율 추적.',
    version: '2.5.0',
    author: 'O4O Team',
    category: 'Analytics',
    tags: ['analytics', 'statistics', 'reports', 'tracking'],
    status: 'active',
    isCore: false,
    rating: 4.9,
    activeInstalls: 3000000,
    lastUpdated: '2024-01-14',
    permissions: ['view_analytics', 'export_reports']
  },
  {
    id: 'seo',
    name: 'SEO Optimizer',
    description: '검색엔진 최적화. 메타 태그 관리, 사이트맵 생성, 스키마 마크업.',
    version: '3.0.0',
    author: 'O4O Team',
    category: 'SEO',
    tags: ['seo', 'search', 'optimization', 'sitemap'],
    status: 'active',
    isCore: false,
    rating: 4.8,
    activeInstalls: 4000000,
    lastUpdated: '2024-01-13',
    permissions: ['manage_seo', 'edit_meta']
  }
];

const AppManager: FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('installed');
  const queryClient = useQueryClient();

  // 플러그인 목록 조회
  const { data: plugins = pluginsList, isLoading, refetch } = useQuery({
    queryKey: ['plugins'],
    queryFn: async () => {
      try {
        const response = await authClient.api.get('/apps/plugins');
        return response.data.data || pluginsList;
      } catch {
        return pluginsList;
      }
    }
  });

  // 플러그인 활성화/비활성화
  const togglePlugin = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return authClient.api.put(`/apps/plugins/${id}/toggle`, { isActive });
    },
    onSuccess: (_, variables) => {
      const action = variables.isActive ? '활성화' : '비활성화';
      toast.success(`플러그인이 ${action}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: () => {
      toast.error('플러그인 상태 변경에 실패했습니다.');
    }
  });

  // 플러그인 삭제
  const deletePlugin = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/apps/plugins/${id}`);
    },
    onSuccess: () => {
      toast.success('플러그인이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: () => {
      toast.error('플러그인 삭제에 실패했습니다.');
    }
  });

  // 필터링된 플러그인
  const filteredPlugins = plugins.filter((plugin: Plugin) => {
    const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          plugin.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
    const matchesTab = activeTab === 'installed' || 
                       (activeTab === 'active' && plugin.status === 'active') ||
                       (activeTab === 'inactive' && plugin.status === 'inactive') ||
                       (activeTab === 'update' && plugin.status === 'update-available');
    return matchesSearch && matchesCategory && matchesTab;
  });

  // 카테고리 목록
  const categories = Array.from(new Set(plugins.map((p: Plugin) => p.category))) as string[];

  // 일괄 작업 처리
  const handleBulkAction = () => {
    if (!bulkAction || selectedPlugins.length === 0) {
      toast.error('작업과 플러그인을 선택해주세요.');
      return;
    }

    switch (bulkAction) {
      case 'activate':
        selectedPlugins.forEach(id => {
          togglePlugin.mutate({ id, isActive: true });
        });
        break;
      case 'deactivate':
        selectedPlugins.forEach(id => {
          togglePlugin.mutate({ id, isActive: false });
        });
        break;
      case 'delete':
        if (confirm('선택한 플러그인을 삭제하시겠습니까?')) {
          selectedPlugins.forEach(id => {
            deletePlugin.mutate(id);
          });
        }
        break;
    }
    setSelectedPlugins([]);
    setBulkAction('');
  };

  // 플러그인 선택 토글
  const togglePluginSelection = (id: string) => {
    setSelectedPlugins(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // 전체 선택
  const toggleSelectAll = () => {
    if (selectedPlugins.length === filteredPlugins.length) {
      setSelectedPlugins([]);
    } else {
      setSelectedPlugins(filteredPlugins.map((p: Plugin) => p.id));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* WordPress 스타일 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">플러그인</h1>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            새 플러그인 추가
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="installed">
            전체 ({plugins.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            활성화 ({plugins.filter((p: Plugin) => p.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="inactive">
            비활성화 ({plugins.filter((p: Plugin) => p.status === 'inactive').length})
          </TabsTrigger>
          <TabsTrigger value="update">
            업데이트 가능 ({plugins.filter((p: Plugin) => p.status === 'update-available').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {/* 검색 및 필터 */}
          <div className="bg-white border rounded-lg p-4 mb-4">
            <div className="flex items-center gap-4">
              {/* 일괄 작업 */}
              <div className="flex items-center gap-2">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="일괄 작업" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activate">활성화</SelectItem>
                    <SelectItem value="deactivate">비활성화</SelectItem>
                    <SelectItem value="delete">삭제</SelectItem>
                    <SelectItem value="update">업데이트</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkAction}
                  disabled={!bulkAction || selectedPlugins.length === 0}
                >
                  적용
                </Button>
              </div>

              {/* 카테고리 필터 */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="모든 카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 카테고리</SelectItem>
                  {categories.map((cat: string) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 검색 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="플러그인 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* 플러그인 테이블 */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-12 p-3">
                    <Checkbox
                      checked={selectedPlugins.length === filteredPlugins.length && filteredPlugins.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-3 font-medium text-gray-900">플러그인</th>
                  <th className="text-left p-3 font-medium text-gray-900">설명</th>
                  <th className="text-center p-3 font-medium text-gray-900">상태</th>
                  <th className="text-center p-3 font-medium text-gray-900">자동 업데이트</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-gray-500">
                      플러그인을 불러오는 중...
                    </td>
                  </tr>
                ) : filteredPlugins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-gray-500">
                      플러그인이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredPlugins.map((plugin: Plugin) => (
                    <tr key={plugin.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedPlugins.includes(plugin.id)}
                          onCheckedChange={() => togglePluginSelection(plugin.id)}
                          disabled={plugin.isCore}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {plugin.name}
                              {plugin.isCore && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  핵심
                                </Badge>
                              )}
                              {plugin.updateVersion && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {plugin.updateVersion} 업데이트 가능
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>버전 {plugin.version}</span>
                              <span>제작: {plugin.author}</span>
                              {plugin.pluginUri && (
                                <a href={plugin.pluginUri} target="_blank" rel="noopener noreferrer" 
                                   className="text-blue-600 hover:underline flex items-center gap-1">
                                  세부 정보 보기
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              {plugin.status === 'active' ? (
                                <>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto text-red-600"
                                    onClick={() => togglePlugin.mutate({ id: plugin.id, isActive: false })}
                                    disabled={plugin.isCore}
                                  >
                                    비활성화
                                  </Button>
                                  {plugin.permissions?.includes('manage_settings') && (
                                    <>
                                      <span className="text-gray-400">|</span>
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0 h-auto"
                                        onClick={() => window.location.href = `/apps/${plugin.id}/settings`}
                                      >
                                        설정
                                      </Button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto text-blue-600"
                                  onClick={() => togglePlugin.mutate({ id: plugin.id, isActive: true })}
                                >
                                  활성화
                                </Button>
                              )}
                              {!plugin.isCore && (
                                <>
                                  <span className="text-gray-400">|</span>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 h-auto text-red-600"
                                    onClick={() => {
                                      if (confirm(`"${plugin.name}" 플러그인을 삭제하시겠습니까?`)) {
                                        deletePlugin.mutate(plugin.id);
                                      }
                                    }}
                                  >
                                    삭제
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-600">
                          {plugin.description}
                        </div>
                        {plugin.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {plugin.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {plugin.status === 'active' ? (
                          <Badge className="bg-green-100 text-green-800">활성</Badge>
                        ) : plugin.status === 'inactive' ? (
                          <Badge variant="secondary">비활성</Badge>
                        ) : plugin.status === 'update-available' ? (
                          <Badge className="bg-orange-100 text-orange-800">업데이트</Badge>
                        ) : (
                          <Badge variant="destructive">오류</Badge>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Switch
                          checked={false}
                          disabled={plugin.isCore}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* 플러그인 업로드 다이얼로그 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>플러그인 추가</DialogTitle>
            <DialogDescription>
              .zip 형식의 플러그인 파일을 업로드하거나 플러그인 검색을 통해 설치할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                플러그인 .zip 파일을 선택하세요
              </p>
              <Button variant="outline">
                파일 선택
              </Button>
            </div>
            <div className="text-center text-sm text-gray-500">
              또는
            </div>
            <Button className="w-full" variant="outline">
              플러그인 디렉토리에서 검색
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              취소
            </Button>
            <Button>
              지금 설치
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 플러그인 통계 */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 플러그인</p>
                <p className="text-2xl font-bold">{plugins.length}</p>
              </div>
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">활성 플러그인</p>
                <p className="text-2xl font-bold text-green-600">
                  {plugins.filter((p: Plugin) => p.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">업데이트 가능</p>
                <p className="text-2xl font-bold text-orange-600">
                  {plugins.filter((p: Plugin) => p.updateVersion).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">자동 업데이트</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <RefreshCw className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppManager;