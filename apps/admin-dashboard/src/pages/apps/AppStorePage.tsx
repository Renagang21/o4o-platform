import { FC, useState, useEffect } from 'react';
import { Package, Download, Power, PowerOff, Trash2, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminAppsApi, AppRegistryEntry, AppCatalogItem } from '@/api/admin-apps';

type Tab = 'market' | 'installed';

/**
 * App Store Page
 *
 * Allows admins to:
 * - Browse available apps in the catalog
 * - Install/uninstall apps
 * - Activate/deactivate installed apps
 */
const AppStorePage: FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('market');
  const [marketApps, setMarketApps] = useState<AppCatalogItem[]>([]);
  const [installedApps, setInstalledApps] = useState<AppRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      alert('앱 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (appId: string) => {
    setActionLoading(appId);
    try {
      await adminAppsApi.installApp(appId);
      await loadData();
      alert(`${appId} 앱이 설치되었습니다.`);
    } catch (error) {
      console.error('Failed to install app:', error);
      alert('앱 설치에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (appId: string) => {
    setActionLoading(appId);
    try {
      await adminAppsApi.activateApp(appId);
      await loadData();
      alert(`${appId} 앱이 활성화되었습니다.`);
    } catch (error) {
      console.error('Failed to activate app:', error);
      alert('앱 활성화에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (appId: string) => {
    setActionLoading(appId);
    try {
      await adminAppsApi.deactivateApp(appId);
      await loadData();
      alert(`${appId} 앱이 비활성화되었습니다.`);
    } catch (error) {
      console.error('Failed to deactivate app:', error);
      alert('앱 비활성화에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (appId: string) => {
    if (!confirm(`${appId} 앱을 삭제하시겠습니까?`)) {
      return;
    }

    setActionLoading(appId);
    try {
      await adminAppsApi.uninstallApp(appId);
      await loadData();
      alert(`${appId} 앱이 삭제되었습니다.`);
    } catch (error: any) {
      console.error('Failed to uninstall app:', error);

      // Handle dependency errors
      if (error.response?.data?.error === 'DEPENDENTS_EXIST') {
        const dependents = error.response.data.dependents || [];
        alert(
          `${appId} 앱을 삭제할 수 없습니다.\n\n` +
          `다음 앱들이 이 앱에 의존하고 있습니다:\n` +
          `${dependents.map((d: string) => `  • ${d}`).join('\n')}\n\n` +
          `의존 앱들을 먼저 삭제해주세요.`
        );
      } else {
        alert('앱 삭제에 실패했습니다.');
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
      alert(`${appId} 앱이 업데이트되었습니다.`);
    } catch (error) {
      console.error('Failed to update app:', error);
      alert('앱 업데이트에 실패했습니다.');
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
                        <Download className="w-4 h-4 mr-2" />
                        {actionLoading === app.appId ? '설치 중...' : '설치'}
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
                    </div>
                    {app.hasUpdate && (
                      <Button
                        onClick={() => handleUpdate(app.appId)}
                        disabled={actionLoading === app.appId}
                        variant="default"
                        className="w-full bg-orange-500 hover:bg-orange-600"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {actionLoading === app.appId ? '업데이트 중...' : '업데이트'}
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
                      <Button
                        onClick={() => handleUninstall(app.appId)}
                        disabled={actionLoading === app.appId}
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
