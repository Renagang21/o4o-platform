import { FC, useState, useEffect } from 'react';
import { Package, Download, Power, PowerOff, Trash2, CheckCircle, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { adminAppsApi, AppRegistryEntry, AppCatalogItem } from '@/api/admin-apps';

type Tab = 'market' | 'installed';

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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

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
    }
  };

  const handleActivate = async (appId: string) => {
    setActionLoading(appId);
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
    }
  };

  const handleDeactivate = async (appId: string) => {
    setActionLoading(appId);
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
    }
  };

  const handleUpdate = async (appId: string) => {
    setActionLoading(appId);
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
      </div>

      {/* Market Tab */}
      {activeTab === 'market' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketApps.map((app) => {
            const installed = getInstallStatus(app.appId);
            return (
              <Card key={app.appId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{app.name}</span>
                    {app.category && (
                      <Badge variant="outline">{app.category}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <div>버전: {app.version}</div>
                      {app.author && <div>개발자: {app.author}</div>}
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
          {installedApps.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              설치된 앱이 없습니다.
            </div>
          ) : (
            installedApps.map((app) => (
              <Card key={app.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{app.name}</span>
                    <div className="flex items-center space-x-2">
                      {app.hasUpdate && (
                        <Badge variant="default" className="bg-orange-500">
                          업데이트 가능
                        </Badge>
                      )}
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
                    </div>
                  </CardTitle>
                  <CardDescription>App ID: {app.appId}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      <div>현재 버전: {app.version}</div>
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
                    {app.hasUpdate && (
                      <Button
                        onClick={() => handleUpdate(app.appId)}
                        disabled={actionLoading === app.appId}
                        variant="default"
                        className="w-full bg-orange-500 hover:bg-orange-600"
                      >
                        {actionLoading === app.appId ? (
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
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AppStorePage;
