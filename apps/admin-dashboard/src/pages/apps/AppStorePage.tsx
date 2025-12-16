import { FC, useState, useEffect, useMemo } from 'react';
import { Package, Download, Power, PowerOff, Trash2, CheckCircle, RefreshCw, AlertTriangle, Loader2, Search, Filter, ChevronDown, Info, RotateCcw, Globe, Link, Shield, ShieldAlert, ShieldCheck, ShieldX, Layers, Grid3X3, Settings, Sparkles, Building, Heart, Truck, Users, ShoppingBag, Tv, GlobeIcon, AlertOctagon, Construction, Pause, Archive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { adminAppsApi, AppRegistryEntry, AppCatalogItem, SecurityValidationResult, ServiceGroup, ServiceGroupMeta, DisabledAppEntry, DisabledAppsSummary } from '@/api/admin-apps';
import ServiceTemplateSelector from '@/components/apps/ServiceTemplateSelector';

type Tab = 'market' | 'installed' | 'templates' | 'disabled';

// Service Group Icons mapping
const SERVICE_GROUP_ICONS: Record<ServiceGroup, React.ComponentType<{ className?: string }>> = {
  'platform-core': Settings,
  'cosmetics': Sparkles,
  'yaksa': Building,
  'diabetes-care-pharmacy': Heart,
  'tourist': GlobeIcon,
  'signage': Tv,
  'sellerops': ShoppingBag,
  'supplierops': Truck,
  'partnerops': Users,
  'global': Grid3X3,
};

// Lifecycle action status for UI feedback
type LifecycleStatus = 'idle' | 'installing' | 'activating' | 'deactivating' | 'uninstalling' | 'updating' | 'rolling_back';

interface AppStorePageProps {
  defaultTab?: Tab;
}

/**
 * App Store Page
 *
 * Allows admins to:
 * - Browse available apps in the catalog
 * - Install/uninstall apps
 * - Activate/deactivate installed apps
 */
const AppStorePage: FC<AppStorePageProps> = ({ defaultTab = 'market' }) => {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [marketApps, setMarketApps] = useState<AppCatalogItem[]>([]);
  const [installedApps, setInstalledApps] = useState<AppRegistryEntry[]>([]);
  const [disabledApps, setDisabledApps] = useState<DisabledAppEntry[]>([]);
  const [disabledSummary, setDisabledSummary] = useState<DisabledAppsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lifecycleStatus, setLifecycleStatus] = useState<Record<string, LifecycleStatus>>({});
  const { toast } = useToast();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedServiceGroup, setSelectedServiceGroup] = useState<ServiceGroup | 'all'>('all');
  const [serviceGroupMeta, setServiceGroupMeta] = useState<ServiceGroupMeta[]>([]);
  const [showDependencies, setShowDependencies] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'remote'>('all');

  // Remote app install state
  const [showRemoteInstall, setShowRemoteInstall] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteValidating, setRemoteValidating] = useState(false);
  const [remoteValidation, setRemoteValidation] = useState<{
    manifest: AppCatalogItem;
    validation: SecurityValidationResult;
  } | null>(null);

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

  const handleInstall = async (appId: string) => {
    setActionLoading(appId);
    setLifecycleStatus(prev => ({ ...prev, [appId]: 'installing' }));
    try {
      await adminAppsApi.installApp(appId);
      await loadData();
      toast({
        title: '설치 완료',
        description: `${appId} 앱이 설치되었습니다.`,
      });
    } catch (error: any) {
      console.error('Failed to install app:', error);

      // Extract error details from response
      const errorCode = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';

      // Handle ownership validation errors
      if (errorCode === 'OWNERSHIP_VIOLATION') {
        const violations = error.response.data.violations || [];
        toast({
          title: '소유권 충돌',
          description: `${appId} 설치 실패: ${violations.map((v: any) => v.reason).join(', ')}`,
          variant: 'destructive',
        });
      } else if (errorCode === 'DEPENDENCY_ERROR') {
        toast({
          title: '의존성 오류',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '설치 실패',
          description: `${appId}: ${errorMessage}`,
          variant: 'destructive',
        });
      }
    } finally {
      setActionLoading(null);
      setLifecycleStatus(prev => ({ ...prev, [appId]: 'idle' }));
    }
  };

  const handleActivate = async (appId: string) => {
    setActionLoading(appId);
    setLifecycleStatus(prev => ({ ...prev, [appId]: 'activating' }));
    try {
      await adminAppsApi.activateApp(appId);
      await loadData();
      toast({
        title: '활성화 완료',
        description: `${appId} 앱이 활성화되었습니다.`,
      });
    } catch (error: any) {
      console.error('Failed to activate app:', error);
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';
      toast({
        title: '활성화 실패',
        description: `${appId}: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setLifecycleStatus(prev => ({ ...prev, [appId]: 'idle' }));
    }
  };

  const handleDeactivate = async (appId: string) => {
    setActionLoading(appId);
    setLifecycleStatus(prev => ({ ...prev, [appId]: 'deactivating' }));
    try {
      await adminAppsApi.deactivateApp(appId);
      await loadData();
      toast({
        title: '비활성화 완료',
        description: `${appId} 앱이 비활성화되었습니다.`,
      });
    } catch (error: any) {
      console.error('Failed to deactivate app:', error);
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';
      toast({
        title: '비활성화 실패',
        description: `${appId}: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setLifecycleStatus(prev => ({ ...prev, [appId]: 'idle' }));
    }
  };

  const handleUninstall = async (appId: string, purge: boolean = false) => {
    // Find app to get ownership information
    const app = installedApps.find(a => a.appId === appId);
    const ownsTables = app?.ownsTables || [];
    const ownsCPT = app?.ownsCPT || [];
    const ownsACF = app?.ownsACF || [];
    const hasOwnedData = ownsTables.length > 0 || ownsCPT.length > 0 || ownsACF.length > 0;

    // Confirm with appropriate message based on purge option
    let confirmMessage = '';
    if (purge) {
      confirmMessage = `${appId} 앱과 데이터를 완전히 삭제하시겠습니까?\n\n⚠️ 경고: 이 작업은 되돌릴 수 없습니다.\n`;
      if (hasOwnedData) {
        confirmMessage += `\n삭제될 데이터:\n`;
        if (ownsTables.length > 0) {
          confirmMessage += `\n테이블 (${ownsTables.length}개):\n${ownsTables.map(t => `  • ${t}`).join('\n')}`;
        }
        if (ownsCPT.length > 0) {
          confirmMessage += `\n\nCPT (${ownsCPT.length}개):\n${ownsCPT.map(c => `  • ${c}`).join('\n')}`;
        }
        if (ownsACF.length > 0) {
          confirmMessage += `\n\nACF 그룹 (${ownsACF.length}개):\n${ownsACF.map(a => `  • ${a}`).join('\n')}`;
        }
      } else {
        confirmMessage += `\n이 앱은 소유한 데이터가 없습니다.`;
      }
    } else {
      confirmMessage = `${appId} 앱을 삭제하시겠습니까?\n\n(데이터는 유지됩니다)`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setActionLoading(appId);
    setLifecycleStatus(prev => ({ ...prev, [appId]: 'uninstalling' }));
    try {
      await adminAppsApi.uninstallApp(appId, purge);
      await loadData();
      toast({
        title: '삭제 완료',
        description: purge
          ? `${appId} 앱과 데이터가 완전히 삭제되었습니다.`
          : `${appId} 앱이 삭제되었습니다. (데이터는 유지됨)`,
      });
    } catch (error: any) {
      console.error('Failed to uninstall app:', error);

      const errorCode = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';

      // Handle dependency errors
      if (errorCode === 'DEPENDENTS_EXIST') {
        const dependents = error.response.data.dependents || [];
        toast({
          title: '의존성 오류',
          description: `${appId}에 의존하는 앱: ${dependents.join(', ')}. 먼저 삭제하세요.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: '삭제 실패',
          description: `${appId}: ${errorMessage}`,
          variant: 'destructive',
        });
      }
    } finally {
      setActionLoading(null);
      setLifecycleStatus(prev => ({ ...prev, [appId]: 'idle' }));
    }
  };

  const handleUpdate = async (appId: string) => {
    setActionLoading(appId);
    setLifecycleStatus(prev => ({ ...prev, [appId]: 'updating' }));
    try {
      await adminAppsApi.updateApp(appId);
      await loadData();
      toast({
        title: '업데이트 완료',
        description: `${appId} 앱이 업데이트되었습니다.`,
      });
    } catch (error: any) {
      console.error('Failed to update app:', error);
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';
      toast({
        title: '업데이트 실패',
        description: `${appId}: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setLifecycleStatus(prev => ({ ...prev, [appId]: 'idle' }));
    }
  };

  const handleRollback = async (appId: string, previousVersion: string) => {
    if (!confirm(`${appId} 앱을 이전 버전(${previousVersion})으로 롤백하시겠습니까?`)) {
      return;
    }

    setActionLoading(appId);
    setLifecycleStatus(prev => ({ ...prev, [appId]: 'rolling_back' }));
    try {
      const result = await adminAppsApi.rollbackApp(appId);
      await loadData();
      toast({
        title: '롤백 완료',
        description: `${appId} 앱이 버전 ${result.revertedTo}로 롤백되었습니다.`,
      });
    } catch (error: any) {
      console.error('Failed to rollback app:', error);
      const errorCode = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';

      if (errorCode === 'NO_ROLLBACK_AVAILABLE') {
        toast({
          title: '롤백 불가',
          description: '이전 버전 정보가 없습니다.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '롤백 실패',
          description: `${appId}: ${errorMessage}`,
          variant: 'destructive',
        });
      }
    } finally {
      setActionLoading(null);
      setLifecycleStatus(prev => ({ ...prev, [appId]: 'idle' }));
    }
  };

  // Validate remote manifest
  const handleValidateRemote = async () => {
    if (!remoteUrl.trim()) return;

    setRemoteValidating(true);
    setRemoteValidation(null);

    try {
      const result = await adminAppsApi.validateRemoteManifest(remoteUrl.trim());
      setRemoteValidation(result);
    } catch (error: any) {
      console.error('Failed to validate remote manifest:', error);
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';
      toast({
        title: '검증 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setRemoteValidating(false);
    }
  };

  // Install remote app
  const handleInstallRemote = async () => {
    if (!remoteValidation) return;

    setActionLoading('remote');
    try {
      await adminAppsApi.installRemoteApp({
        manifestUrl: remoteUrl.trim(),
        expectedHash: remoteValidation.manifest.hash,
      });
      await loadData();
      setShowRemoteInstall(false);
      setRemoteUrl('');
      setRemoteValidation(null);
      toast({
        title: '설치 완료',
        description: `${remoteValidation.manifest.name} 앱이 설치되었습니다.`,
      });
    } catch (error: any) {
      console.error('Failed to install remote app:', error);
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';
      toast({
        title: '설치 실패',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">앱 장터</h1>
        <p className="text-gray-600">플랫폼에 설치할 앱을 관리합니다.</p>
      </div>

      {/* Tabs */}
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
          앱 마켓
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
          설치된 앱 ({installedApps.length})
        </button>
        <button
          onClick={() => setActiveTab('disabled')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'disabled'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          <AlertOctagon className="inline-block w-4 h-4 mr-2" />
          비활성 앱 ({disabledApps.length})
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

            {/* Remote Install Button */}
            <Button
              variant="outline"
              onClick={() => setShowRemoteInstall(true)}
              className="whitespace-nowrap"
            >
              <Link className="w-4 h-4 mr-2" />
              URL로 설치
            </Button>
          </>
        )}
      </div>
      )}

      {/* Remote Install Modal */}
      {showRemoteInstall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 space-y-4">
            <h3 className="text-lg font-bold">원격 앱 설치</h3>
            <p className="text-sm text-gray-600">
              앱 매니페스트 URL을 입력하여 원격 앱을 설치합니다.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">매니페스트 URL</label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/app/manifest.json"
                  value={remoteUrl}
                  onChange={(e) => setRemoteUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleValidateRemote}
                  disabled={remoteValidating || !remoteUrl.trim()}
                >
                  {remoteValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    '검증'
                  )}
                </Button>
              </div>
            </div>

            {/* Validation Result */}
            {remoteValidation && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{remoteValidation.manifest.name}</span>
                  {getRiskBadge(remoteValidation.validation.riskLevel)}
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>버전: {remoteValidation.manifest.version}</div>
                  {remoteValidation.manifest.vendor && (
                    <div>벤더: {remoteValidation.manifest.vendor}</div>
                  )}
                  {remoteValidation.manifest.description && (
                    <div>{remoteValidation.manifest.description}</div>
                  )}
                </div>

                {/* Warnings */}
                {remoteValidation.validation.warnings.length > 0 && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                    <div className="font-medium mb-1">경고:</div>
                    {remoteValidation.validation.warnings.map((w, i) => (
                      <div key={i}>• {w.message}</div>
                    ))}
                  </div>
                )}

                {/* Errors */}
                {remoteValidation.validation.errors.length > 0 && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    <div className="font-medium mb-1">오류:</div>
                    {remoteValidation.validation.errors.map((e, i) => (
                      <div key={i}>• {e.message}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRemoteInstall(false);
                  setRemoteUrl('');
                  setRemoteValidation(null);
                }}
              >
                취소
              </Button>
              <Button
                onClick={handleInstallRemote}
                disabled={
                  !remoteValidation ||
                  !remoteValidation.validation.valid ||
                  actionLoading === 'remote'
                }
              >
                {actionLoading === 'remote' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    설치 중...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    설치
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Results Info */}
      {activeTab !== 'templates' && (searchQuery || selectedCategory !== 'all' || selectedServiceGroup !== 'all') && (
        <div className="text-sm text-gray-500">
          {activeTab === 'market' ? (
            <>
              {filteredMarketApps.length}개 앱 표시 중
              {searchQuery && <span> (검색: "{searchQuery}")</span>}
              {selectedServiceGroup !== 'all' && (
                <span> (서비스: {serviceGroupMeta.find(g => g.id === selectedServiceGroup)?.nameKo || selectedServiceGroup})</span>
              )}
              {selectedCategory !== 'all' && <span> (카테고리: {selectedCategory})</span>}
            </>
          ) : (
            <>
              {filteredInstalledApps.length}개 앱 표시 중
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
              {searchQuery || selectedCategory !== 'all' ? '검색 결과가 없습니다.' : '사용 가능한 앱이 없습니다.'}
            </div>
          ) : filteredMarketApps.map((app) => {
            const installed = getInstallStatus(app.appId);
            const status = lifecycleStatus[app.appId] || 'idle';
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
              <Card key={app.appId} className={status !== 'idle' ? 'ring-2 ring-blue-300' : ''}>
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
                    {installed ? (
                      <div className="space-y-2">
                        <div className="flex items-center text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          설치됨 ({installed.status})
                        </div>
                        {installed.hasUpdate && (
                          <div className="flex items-center space-x-2">
                            <Badge variant="default" className="bg-orange-500">
                              업데이트 가능: {installed.availableVersion}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleInstall(app.appId)}
                        disabled={actionLoading === app.appId}
                        className="w-full"
                      >
                        {actionLoading === app.appId ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            설치 중...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            설치
                          </>
                        )}
                      </Button>
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
              {searchQuery ? '검색 결과가 없습니다.' : '설치된 앱이 없습니다.'}
            </div>
          ) : (
            filteredInstalledApps.map((app) => {
              const status = lifecycleStatus[app.appId] || 'idle';
              const statusLabel: Record<LifecycleStatus, string> = {
                idle: '',
                installing: '설치 중...',
                activating: '활성화 중...',
                deactivating: '비활성화 중...',
                uninstalling: '삭제 중...',
                updating: '업데이트 중...',
                rolling_back: '롤백 중...',
              };
              const canRollback = !!app.previousVersion;
              return (
              <Card key={app.id} className={status !== 'idle' ? 'ring-2 ring-blue-300' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{app.name}</span>
                    <div className="flex items-center space-x-2">
                      {status !== 'idle' && (
                        <Badge variant="default" className="bg-blue-500 animate-pulse">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          {statusLabel[status]}
                        </Badge>
                      )}
                      {app.hasUpdate && status === 'idle' && (
                        <Badge variant="default" className="bg-orange-500">
                          업데이트 가능
                        </Badge>
                      )}
                      {canRollback && status === 'idle' && (
                        <Badge variant="outline" className="text-purple-600 border-purple-300">
                          롤백 가능
                        </Badge>
                      )}
                      {status === 'idle' && (
                        <Badge
                          variant={
                            app.status === 'active'
                              ? 'default'
                              : app.status === 'inactive'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {app.status === 'active'
                            ? '활성'
                            : app.status === 'inactive'
                            ? '비활성'
                            : '설치됨'}
                        </Badge>
                      )}
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
                    {/* Update and Rollback buttons */}
                    <div className="flex space-x-2">
                      {app.hasUpdate && (
                        <Button
                          onClick={() => handleUpdate(app.appId)}
                          disabled={actionLoading === app.appId}
                          variant="default"
                          className="flex-1 bg-orange-500 hover:bg-orange-600"
                        >
                          {status === 'updating' ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              업데이트 중...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              업데이트
                            </>
                          )}
                        </Button>
                      )}
                      {canRollback && (
                        <Button
                          onClick={() => handleRollback(app.appId, app.previousVersion!)}
                          disabled={actionLoading === app.appId}
                          variant="outline"
                          className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50"
                        >
                          {status === 'rolling_back' ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              롤백 중...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              롤백 ({app.previousVersion})
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {app.status === 'active' ? (
                        <Button
                          onClick={() => handleDeactivate(app.appId)}
                          disabled={actionLoading === app.appId}
                          variant="outline"
                          className="flex-1"
                        >
                          <PowerOff className="w-4 h-4 mr-2" />
                          비활성화
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleActivate(app.appId)}
                          disabled={actionLoading === app.appId}
                          variant="default"
                          className="flex-1"
                        >
                          <Power className="w-4 h-4 mr-2" />
                          활성화
                        </Button>
                      )}
                      <div className="relative group">
                        <Button
                          onClick={() => handleUninstall(app.appId, false)}
                          disabled={actionLoading === app.appId}
                          variant="destructive"
                          title="앱 삭제 (데이터 유지)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {/* Dropdown menu for purge option */}
                        <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block bg-white border border-gray-200 rounded shadow-lg z-10 min-w-[180px]">
                          <button
                            onClick={() => handleUninstall(app.appId, false)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            데이터 유지 삭제
                          </button>
                          <button
                            onClick={() => handleUninstall(app.appId, true)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center border-t"
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            완전 삭제 (데이터 포함)
                          </button>
                        </div>
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
                비활성화된 앱이 없습니다.
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
