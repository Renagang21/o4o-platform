import React, { useState } from 'react';
import { Package, ToggleLeft, ToggleRight, Settings, Users, TrendingUp, AlertCircle, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface PlatformApp {
  id: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  status: 'active' | 'inactive' | 'maintenance' | 'development';
  implementationStatus: 'complete' | 'partial' | 'planned';
  category: 'core' | 'commerce' | 'content' | 'community' | 'marketing' | 'analytics';
  dependencies: string[];
  dependents: string[];
  permissions: string[];
  icon: string;
  color: string;
  lastUpdated: string;
  metrics: {
    activeUsers: number;
    dailyUsage: number;
    errorRate: number;
    uptime: number;
  };
  settings: {
    autoStart: boolean;
    requiresApproval: boolean;
    maintenanceMode: boolean;
    maxUsers?: number;
  };
}

interface AppSettings {
  appId: string;
  autoStart: boolean;
  requiresApproval: boolean;
  maintenanceMode: boolean;
  maxUsers?: number;
  customSettings: Record<string, any>;
}

const AppsManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<PlatformApp | null>(null);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<AppSettings>>({});
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch platform apps
  const { data: appsData, isLoading } = useQuery({
    queryKey: ['platform-apps'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/platform/apps');
      return response.data;
    }
  });
  const apps: PlatformApp[] = appsData?.data || [];

  // Fetch app metrics
  const { data: metricsData } = useQuery({
    queryKey: ['platform-metrics'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/platform/metrics');
      return response.data;
    }
  });
  const metrics = metricsData?.data || {};

  // Toggle app status
  const toggleAppMutation = useMutation({
    mutationFn: async ({ appId, status }: { appId: string; status: string }) => {
      const response = await authClient.api.patch(`/v1/platform/apps/${appId}/status`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`앱이 ${variables.status === 'active' ? '활성화' : '비활성화'}되었습니다`);
      queryClient.invalidateQueries({ queryKey: ['platform-apps'] });
    },
    onError: () => {
      toast.error('앱 상태 변경 중 오류가 발생했습니다');
    }
  });

  // Update app settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: AppSettings) => {
      const response = await authClient.api.put(`/v1/platform/apps/${settings.appId}/settings`, settings);
      return response.data;
    },
    onSuccess: () => {
      toast.success('앱 설정이 업데이트되었습니다');
      queryClient.invalidateQueries({ queryKey: ['platform-apps'] });
      setIsSettingsDialogOpen(false);
      setSelectedApp(null);
    },
    onError: () => {
      toast.error('설정 업데이트 중 오류가 발생했습니다');
    }
  });

  // Bulk operations
  // TODO: Implement bulk operations feature
  // const bulkOperationMutation = useMutation({
  //   mutationFn: async ({ appIds, operation }: { appIds: string[]; operation: string }) => {
  //     const response = await authClient.api.post('/v1/platform/apps/bulk', { appIds, operation });
  //     return response.data;
  //   },
  //   onSuccess: (_, variables) => {
  //     toast.success(`${variables.appIds.length}개 앱의 ${variables.operation} 작업이 완료되었습니다`);
  //     queryClient.invalidateQueries({ queryKey: ['platform-apps'] });
  //   }
  // });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">활성</Badge>;
      case 'inactive':
        return <Badge variant="secondary">비활성</Badge>;
      case 'maintenance':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">점검중</Badge>;
      case 'development':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">개발중</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getImplementationBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-blue-100 text-blue-800">완전 구현</Badge>;  
      case 'partial':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">부분 구현</Badge>;
      case 'planned':
        return <Badge variant="secondary">계획됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      core: 'bg-gray-100 text-gray-800',
      commerce: 'bg-green-100 text-green-800',
      content: 'bg-blue-100 text-blue-800',
      community: 'bg-purple-100 text-purple-800',
      marketing: 'bg-orange-100 text-orange-800',
      analytics: 'bg-pink-100 text-pink-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleToggleApp = (app: PlatformApp) => {
    // Check dependencies before deactivating
    if (app.status === 'active' && app.dependents.length > 0) {
      const activeDependents = apps.filter(a => 
        app.dependents.includes(a.id) && a.status === 'active'
      );
      
      if (activeDependents.length > 0) {
        toast.error(`다음 앱들이 이 앱에 의존하고 있습니다: ${activeDependents.map(a => a.displayName).join(', ')}`);
        return;
      }
    }

    const newStatus = app.status === 'active' ? 'inactive' : 'active';
    toggleAppMutation.mutate({ appId: app.id, status: newStatus });
  };

  const handleOpenSettings = (app: PlatformApp) => {
    setSelectedApp(app);
    setSettingsForm({
      appId: app.id,
      autoStart: app.settings.autoStart,
      requiresApproval: app.settings.requiresApproval,
      maintenanceMode: app.settings.maintenanceMode,
      maxUsers: app.settings.maxUsers
    });
    setIsSettingsDialogOpen(true);
  };

  const handleUpdateSettings = () => {
    if (!selectedApp || !settingsForm.appId) return;
    
    updateSettingsMutation.mutate(settingsForm as AppSettings);
  };

  const filteredApps = apps.filter(app => {
    if (statusFilter === 'all') return true;
    return app.status === statusFilter;
  });

  const activeApps = apps.filter(app => app.status === 'active').length;
  const totalApps = apps.length;
  const uptimeAvg = apps.reduce((acc, app) => acc + app.metrics.uptime, 0) / apps.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary">Apps 관리</h1>
          <p className="text-modern-text-secondary mt-1">플랫폼 앱 상태 및 설정 관리</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="maintenance">점검중</option>
            <option value="development">개발중</option>
          </select>
        </div>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <Package className="w-4 h-4" />
              활성 앱
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeApps}
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              총 {totalApps}개 중
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <Users className="w-4 h-4" />
              총 사용자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.totalUsers || 0}
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              오늘 활성: {metrics.activeToday || 0}명
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <Activity className="w-4 h-4" />
              평균 가동률
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              {uptimeAvg.toFixed(1)}%
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              지난 30일
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-modern-text-secondary flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              일일 사용량
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-modern-text-primary">
              {metrics.dailyRequests || 0}
            </div>
            <div className="text-xs text-modern-text-tertiary mt-1">
              API 요청 수
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="col-span-full text-center py-8 text-modern-text-secondary">
            조건에 맞는 앱이 없습니다.
          </div>
        ) : (
          filteredApps.map((app) => (
            <Card key={app.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: app.color }}
                    >
                      {app.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{app.displayName}</CardTitle>
                      <p className="text-sm text-modern-text-secondary">v{app.version}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleApp(app)}
                    disabled={toggleAppMutation.isPending}
                  >
                    {app.status === 'active' ? (
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-modern-text-secondary line-clamp-2">
                  {app.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {getStatusBadge(app.status)}
                  {getImplementationBadge(app.implementationStatus)}
                  <Badge className={getCategoryColor(app.category)}>
                    {app.category}
                  </Badge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-modern-text-primary">
                      {app.metrics.activeUsers}
                    </div>
                    <div className="text-xs text-modern-text-tertiary">활성 사용자</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-modern-text-primary">
                      {app.metrics.uptime}%
                    </div>
                    <div className="text-xs text-modern-text-tertiary">가동률</div>
                  </div>
                </div>

                {/* Dependencies */}
                {app.dependencies.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-modern-text-secondary mb-1">의존성:</div>
                    <div className="flex flex-wrap gap-1">
                      {app.dependencies.map(depId => {
                        const depApp = apps.find(a => a.id === depId);
                        return depApp ? (
                          <Badge key={depId} variant="outline" className="text-xs">
                            {depApp.displayName}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenSettings(app)}
                    className="flex-1"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    설정
                  </Button>
                  {app.status === 'active' && app.metrics.errorRate > 5 && (
                    <Button variant="outline" size="sm" className="text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>

              {/* Status Indicator */}
              <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                app.status === 'active' ? 'bg-green-500' : 
                app.status === 'maintenance' ? 'bg-orange-500' : 'bg-gray-400'
              }`} />
            </Card>
          ))
        )}
      </div>

      {/* App Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedApp?.displayName} 설정</DialogTitle>
            <DialogDescription>
              앱의 동작 방식을 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoStart">자동 시작</Label>
              <input
                type="checkbox"
                id="autoStart"
                checked={settingsForm.autoStart || false}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, autoStart: e.target.checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="requiresApproval">승인 필요</Label>
              <input
                type="checkbox"
                id="requiresApproval"
                checked={settingsForm.requiresApproval || false}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, requiresApproval: e.target.checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="maintenanceMode">점검 모드</Label>
              <input
                type="checkbox"
                id="maintenanceMode"
                checked={settingsForm.maintenanceMode || false}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
              />
            </div>

            <div>
              <Label htmlFor="maxUsers">최대 사용자 수</Label>
              <Input
                id="maxUsers"
                type="number"
                value={settingsForm.maxUsers || ''}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, maxUsers: parseInt(e.target.value) || undefined }))}
                placeholder="제한 없음"
              />
            </div>

            {selectedApp?.dependencies && selectedApp.dependencies.length > 0 && (
              <div className="p-3 bg-modern-bg-secondary rounded-lg">
                <div className="text-sm font-medium text-modern-text-secondary mb-2">의존성 앱</div>
                <div className="space-y-1">
                  {selectedApp?.dependencies?.map(depId => {
                    const depApp = apps.find(a => a.id === depId);
                    return depApp ? (
                      <div key={depId} className="flex items-center justify-between text-sm">
                        <span>{depApp.displayName}</span>
                        {getStatusBadge(depApp.status)}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsSettingsDialogOpen(false)}
            >
              취소
            </Button>
            <Button 
              onClick={handleUpdateSettings}
              disabled={updateSettingsMutation.isPending}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppsManager;