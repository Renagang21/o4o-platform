import { FC, useState, useEffect, useMemo } from 'react';
// WO-APPSTORE-UI-DEMOTION: Removed unused icons (Download, Power, PowerOff, Trash2, RefreshCw, RotateCcw, Link, Loader2)
import { Package, CheckCircle, Search, Filter, ChevronDown, Info, Globe, Shield, ShieldAlert, ShieldCheck, ShieldX, Layers, Grid3X3, Settings, Sparkles, Building, Heart, Truck, Users, ShoppingBag, Tv, GlobeIcon, AlertOctagon, Construction, Pause, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
// WO-APPSTORE-UI-DEMOTION: SecurityValidationResult removed - runtime control not supported
import { adminAppsApi, AppRegistryEntry, AppCatalogItem, ServiceGroup, ServiceGroupMeta, DisabledAppEntry, DisabledAppsSummary } from '@/api/admin-apps';
import ServiceTemplateSelector from '@/components/apps/ServiceTemplateSelector';

type Tab = 'market' | 'installed' | 'templates' | 'disabled';

// Service Group Icons mapping
const SERVICE_GROUP_ICONS: Record<ServiceGroup, React.ComponentType<{ className?: string }>> = {
  'platform-core': Settings,
  'cosmetics': Sparkles,
  'yaksa': Building,
  'tourist': GlobeIcon,
  'signage': Tv,
  'sellerops': ShoppingBag,
  'supplierops': Truck,
  'partnerops': Users,
  'global': Grid3X3,
};

// WO-APPSTORE-UI-DEMOTION: LifecycleStatus type removed - runtime control not supported

interface AppStorePageProps {
  defaultTab?: Tab;
}

/**
 * App Store Page (Demoted to Module Explorer)
 *
 * WO-APPSTORE-UI-DEMOTION: This UI is READ-ONLY.
 * - Browse available modules in the catalog
 * - View registered modules on this server
 * - NO runtime control (install/activate/deactivate/uninstall)
 * - Module composition is determined at server deployment time
 */
const AppStorePage: FC<AppStorePageProps> = ({ defaultTab = 'market' }) => {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [marketApps, setMarketApps] = useState<AppCatalogItem[]>([]);
  const [installedApps, setInstalledApps] = useState<AppRegistryEntry[]>([]);
  const [disabledApps, setDisabledApps] = useState<DisabledAppEntry[]>([]);
  const [disabledSummary, setDisabledSummary] = useState<DisabledAppsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  // WO-APPSTORE-UI-DEMOTION: actionLoading, lifecycleStatus removed - runtime control not supported
  const { toast } = useToast();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedServiceGroup, setSelectedServiceGroup] = useState<ServiceGroup | 'all'>('all');
  const [serviceGroupMeta, setServiceGroupMeta] = useState<ServiceGroupMeta[]>([]);
  const [showDependencies, setShowDependencies] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'remote'>('all');

  // WO-APPSTORE-UI-DEMOTION: Remote install state removed - runtime control not supported

  // Extract unique categories from apps
  const categories = useMemo(() => {
    const cats = new Set<string>();
    marketApps.forEach(app => {
      if (app.category) cats.add(app.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [marketApps]);

  // Filter market apps by search, category, service group, and source
  const filteredMarketApps = useMemo(() => {
    let filtered = marketApps;

    // Filter by service group (primary filter)
    if (selectedServiceGroup !== 'all') {
      filtered = filtered.filter(app => {
        // Apps with no serviceGroups are shown in 'global'
        if (!app.serviceGroups || app.serviceGroups.length === 0) {
          return selectedServiceGroup === 'global';
        }
        // Check if app belongs to selected service group or is global
        return app.serviceGroups.includes(selectedServiceGroup) || app.serviceGroups.includes('global');
      });
    }

    // Filter by category (deprecated, but keep for backward compatibility)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(app => app.category === selectedCategory);
    }

    // Filter by source
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(app => (app.source || 'local') === sourceFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(query) ||
        app.description?.toLowerCase().includes(query) ||
        app.appId.toLowerCase().includes(query) ||
        app.vendor?.toLowerCase().includes(query) ||
        app.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [marketApps, selectedCategory, selectedServiceGroup, sourceFilter, searchQuery]);

  // Filter installed apps by search
  const filteredInstalledApps = useMemo(() => {
    if (!searchQuery.trim()) return installedApps;

    const query = searchQuery.toLowerCase().trim();
    return installedApps.filter(app =>
      app.name.toLowerCase().includes(query) ||
      app.appId.toLowerCase().includes(query)
    );
  }, [installedApps, searchQuery]);

  // Fetch data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [market, installed] = await Promise.all([
        adminAppsApi.getMarketApps(),
        adminAppsApi.getInstalledApps(),
      ]);
      setMarketApps(market);
      setInstalledApps(installed);

      // Load service group metadata (best effort, don't fail if unavailable)
      try {
        const groupMeta = await adminAppsApi.getServiceGroupMeta();
        setServiceGroupMeta(groupMeta);
      } catch {
        // Use default empty array if API fails
        console.warn('Failed to load service group metadata, using defaults');
      }

      // Load disabled apps (best effort)
      try {
        const { apps: disabled, summary } = await adminAppsApi.getDisabledApps();
        setDisabledApps(disabled);
        setDisabledSummary(summary);
      } catch {
        console.warn('Failed to load disabled apps, using empty list');
      }
    } catch (error) {
      console.error('Failed to load apps:', error);
      toast({
        title: '로드 실패',
        description: '앱 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // WO-APPSTORE-UI-DEMOTION: Lifecycle handlers removed - runtime control not supported
  // Previous functions removed: handleInstall, handleActivate, handleDeactivate,
  // handleUninstall, handleUpdate, handleRollback, handleValidateRemote, handleInstallRemote

  // Get risk level badge
  const getRiskBadge = (riskLevel?: 'low' | 'medium' | 'high' | 'critical') => {
    switch (riskLevel) {
      case 'low':
        return <Badge className="bg-green-500"><ShieldCheck className="w-3 h-3 mr-1" />안전</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500"><Shield className="w-3 h-3 mr-1" />주의</Badge>;
      case 'high':
        return <Badge className="bg-orange-500"><ShieldAlert className="w-3 h-3 mr-1" />경고</Badge>;
      case 'critical':
        return <Badge className="bg-red-500"><ShieldX className="w-3 h-3 mr-1" />위험</Badge>;
      default:
        return null;
    }
  };

  // Check if app is installed
  const isInstalled = (appId: string): boolean => {
    return installedApps.some((app) => app.appId === appId);
  };

  // Get installation status
  const getInstallStatus = (appId: string): AppRegistryEntry | undefined => {
    return installedApps.find((app) => app.appId === appId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header - Demoted to Module Explorer (WO-APPSTORE-UI-DEMOTION) */}
      <div>
        <h1 className="text-3xl font-bold mb-2">시스템 모듈 현황</h1>
        <p className="text-gray-600">
          서버에 포함된 모듈을 확인합니다.
          <span className="text-amber-600 ml-1">
            런타임 제어는 지원되지 않으며, 모듈 구성은 서버 배포 시 결정됩니다.
          </span>
        </p>
      </div>

      {/* Tabs - WO-APPSTORE-UI-DEMOTION: Read-only module explorer */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <Layers className="inline-block w-4 h-4 mr-2" />
          서비스 템플릿
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'market'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <Package className="inline-block w-4 h-4 mr-2" />
          모듈 카탈로그
        </button>
        <button
          onClick={() => setActiveTab('installed')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'installed'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <CheckCircle className="inline-block w-4 h-4 mr-2" />
          등록된 모듈 ({installedApps.length})
        </button>
        <button
          onClick={() => setActiveTab('disabled')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'disabled'
              ? 'border-amber-500 text-amber-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <AlertOctagon className="inline-block w-4 h-4 mr-2" />
          미등록 모듈 ({disabledApps.length})
        </button>
      </div>

      {/* Service Group Tabs - Only show in market tab */}
      {activeTab === 'market' && serviceGroupMeta.length > 0 && (
        <div className="border rounded-lg bg-gray-50 p-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedServiceGroup('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedServiceGroup === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              전체
            </button>
            {serviceGroupMeta.map((group) => {
              const IconComponent = SERVICE_GROUP_ICONS[group.id] || Grid3X3;
              const appsCount = marketApps.filter(app =>
                app.serviceGroups?.includes(group.id) ||
                (group.id === 'global' && (!app.serviceGroups || app.serviceGroups.length === 0))
              ).length;
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedServiceGroup(group.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedServiceGroup === group.id
                      ? 'text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                  style={selectedServiceGroup === group.id ? { backgroundColor: group.color || '#3B82F6' } : {}}
                  title={group.description}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{group.nameKo}</span>
                  <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5 bg-gray-100 text-gray-600">
                    {appsCount}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filter Bar - Hide on templates tab */}
      {activeTab !== 'templates' && (
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="앱 검색 (이름, 설명, 태그, 벤더)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter (only show in market tab) */}
        {activeTab === 'market' && (
          <>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[150px]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? '모든 카테고리' : cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* Source Filter */}
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as 'all' | 'local' | 'remote')}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer min-w-[120px]"
              >
                <option value="all">모든 소스</option>
                <option value="local">로컬</option>
                <option value="remote">원격</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* WO-APPSTORE-UI-DEMOTION: Remote Install Button removed - runtime control not supported */}
          </>
        )}
      </div>
      )}

      {/* WO-APPSTORE-UI-DEMOTION: Remote Install Modal removed - runtime control not supported */}

      {/* Filter Results Info */}
      {activeTab !== 'templates' && (searchQuery || selectedCategory !== 'all' || selectedServiceGroup !== 'all') && (
        <div className="text-sm text-gray-500">
          {activeTab === 'market' ? (
            <>
              {filteredMarketApps.length}개 모듈 표시 중
              {searchQuery && <span> (검색: "{searchQuery}")</span>}
              {selectedServiceGroup !== 'all' && (
                <span> (서비스: {serviceGroupMeta.find(g => g.id === selectedServiceGroup)?.nameKo || selectedServiceGroup})</span>
              )}
              {selectedCategory !== 'all' && <span> (카테고리: {selectedCategory})</span>}
            </>
          ) : (
            <>
              {filteredInstalledApps.length}개 모듈 표시 중
              {searchQuery && <span> (검색: "{searchQuery}")</span>}
            </>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <ServiceTemplateSelector onInstallComplete={loadData} />
      )}

      {/* Market Tab */}
      {activeTab === 'market' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarketApps.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              {searchQuery || selectedCategory !== 'all' ? '검색 결과가 없습니다.' : '카탈로그에 모듈이 없습니다.'}
            </div>
          ) : filteredMarketApps.map((app) => {
            const installed = getInstallStatus(app.appId);
            // WO-APPSTORE-UI-DEMOTION: lifecycleStatus removed - runtime control not supported
            // Updated type badge colors to include 'feature' type
            const typeBadgeColor =
              app.type === 'core' ? 'bg-blue-500' :
              app.type === 'feature' ? 'bg-green-500' :
              app.type === 'extension' ? 'bg-purple-500' :
              'bg-gray-500';
            const typeLabel =
              app.type === 'core' ? '코어' :
              app.type === 'feature' ? '기능' :
              app.type === 'extension' ? '확장' :
              '독립';
            return (
              <Card key={app.appId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {app.name}
                      {app.type && (
                        <Badge variant="default" className={`text-xs ${typeBadgeColor}`}>
                          {typeLabel}
                        </Badge>
                      )}
                      {app.source === 'remote' && (
                        <Badge variant="outline" className="text-xs border-cyan-300 text-cyan-600">
                          <Globe className="w-3 h-3 mr-1" />
                          원격
                        </Badge>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {app.riskLevel && getRiskBadge(app.riskLevel)}
                      {/* Show service groups as badges */}
                      {app.serviceGroups && app.serviceGroups.length > 0 && (
                        <div className="flex gap-1">
                          {app.serviceGroups.slice(0, 2).map(sg => {
                            const meta = serviceGroupMeta.find(m => m.id === sg);
                            return (
                              <Badge
                                key={sg}
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: meta?.color || '#9CA3AF', color: meta?.color || '#6B7280' }}
                              >
                                {meta?.nameKo || sg}
                              </Badge>
                            );
                          })}
                          {app.serviceGroups.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{app.serviceGroups.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <div>버전: {app.version}</div>
                      {app.author && <div>개발자: {app.author}</div>}
                      {app.vendor && <div>벤더: {app.vendor}</div>}
                      {/* Dependencies info */}
                      {app.dependencies && Object.keys(app.dependencies).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => setShowDependencies(showDependencies === app.appId ? null : app.appId)}
                            className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                          >
                            <Info className="w-3 h-3 mr-1" />
                            의존성 ({Object.keys(app.dependencies).length})
                            <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showDependencies === app.appId ? 'rotate-180' : ''}`} />
                          </button>
                          {showDependencies === app.appId && (
                            <div className="mt-1 text-xs text-gray-500 pl-4">
                              {Object.entries(app.dependencies).map(([dep, ver]) => (
                                <div key={dep}>{dep}: {ver}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Tags */}
                      {app.tags && app.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {app.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {app.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{app.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* WO-APPSTORE-UI-DEMOTION: Read-only module status display */}
                    {installed ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {app.type === 'core'
                            ? '상태: Always Enabled (Core Module)'
                            : '상태: Registered Module'}
                        </div>
                        <p className="text-xs text-gray-500">
                          이 모듈은 서버에 포함되어 있습니다.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-500 text-sm">
                          <Package className="w-4 h-4 mr-1" />
                          {app.type === 'core'
                            ? '상태: Core Module (카탈로그)'
                            : '상태: Available Module'}
                        </div>
                        <p className="text-xs text-amber-600">
                          이 앱은 서버 배포 시 결정됩니다.
                          App Store에서는 런타임 제어를 지원하지 않습니다.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Installed Tab */}
      {activeTab === 'installed' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstalledApps.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 모듈이 없습니다.'}
            </div>
          ) : (
            filteredInstalledApps.map((app) => {
              // WO-APPSTORE-UI-DEMOTION: Removed lifecycle status tracking (runtime control not supported)
              return (
              <Card key={app.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{app.name}</span>
                    {/* WO-APPSTORE-UI-DEMOTION: Read-only module status badges */}
                    <div className="flex items-center space-x-2">
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        등록됨
                      </Badge>
                    </div>
                  </CardTitle>
                  <CardDescription>App ID: {app.appId}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <div>현재 버전: {app.version}</div>
                      {app.previousVersion && (
                        <div className="text-purple-600 text-xs">
                          이전 버전: {app.previousVersion}
                        </div>
                      )}
                      {app.hasUpdate && app.availableVersion && (
                        <div className="text-orange-600 font-medium">
                          최신 버전: {app.availableVersion}
                        </div>
                      )}
                      <div>
                        설치일:{' '}
                        {new Date(app.installedAt).toLocaleDateString('ko-KR')}
                      </div>

                      {/* Ownership data section */}
                      {(app.ownsTables && app.ownsTables.length > 0) ||
                       (app.ownsCPT && app.ownsCPT.length > 0) ||
                       (app.ownsACF && app.ownsACF.length > 0) ? (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="font-medium text-gray-700 mb-1">소유 데이터:</div>
                          {app.ownsTables && app.ownsTables.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium">테이블:</span>{' '}
                              {app.ownsTables.join(', ')}
                            </div>
                          )}
                          {app.ownsCPT && app.ownsCPT.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium">CPT:</span>{' '}
                              {app.ownsCPT.join(', ')}
                            </div>
                          )}
                          {app.ownsACF && app.ownsACF.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium">ACF:</span>{' '}
                              {app.ownsACF.join(', ')}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                    {/* WO-APPSTORE-UI-DEMOTION: Control buttons removed - read-only status display */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                        <p className="text-xs text-amber-700">
                          <Info className="w-3 h-3 inline mr-1" />
                          이 앱은 서버 배포 시 결정됩니다.
                          App Store에서는 런타임 제어를 지원하지 않습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </div>
      )}

      {/* Disabled Apps Tab */}
      {activeTab === 'disabled' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          {disabledSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-gray-600">Broken</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{disabledSummary.broken}</div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Construction className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm text-gray-600">Incomplete</span>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{disabledSummary.incomplete}</div>
                </CardContent>
              </Card>
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Pause className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-600">Paused</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{disabledSummary.paused}</div>
                </CardContent>
              </Card>
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Archive className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-600">Deprecated</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-600">{disabledSummary.deprecated}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Disabled Apps List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disabledApps.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                미등록 모듈이 없습니다.
              </div>
            ) : (
              disabledApps.map((app) => {
                const statusConfig = {
                  broken: { color: 'border-red-300 bg-red-50', badge: 'bg-red-500', icon: AlertOctagon, label: 'Broken' },
                  incomplete: { color: 'border-yellow-300 bg-yellow-50', badge: 'bg-yellow-500', icon: Construction, label: 'Incomplete' },
                  paused: { color: 'border-orange-300 bg-orange-50', badge: 'bg-orange-500', icon: Pause, label: 'Paused' },
                  deprecated: { color: 'border-gray-300 bg-gray-50', badge: 'bg-gray-500', icon: Archive, label: 'Deprecated' },
                }[app.disabled.status];

                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={app.appId} className={statusConfig.color}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <StatusIcon className="w-5 h-5" />
                          {app.name}
                        </span>
                        <Badge className={statusConfig.badge}>
                          {statusConfig.label}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {app.appId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">사유:</span>
                          <p className="text-gray-600 mt-1">{app.disabled.reason}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">다음 조치:</span>
                          <p className="text-gray-600 mt-1">{app.disabled.nextAction}</p>
                        </div>
                        <div className="text-xs text-gray-400 pt-2 border-t">
                          비활성화 일자: {app.disabled.disabledAt}
                          {app.disabled.trackingId && (
                            <span className="ml-2">| {app.disabled.trackingId}</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppStorePage;
