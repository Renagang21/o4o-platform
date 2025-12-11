/**
 * Service Overview Dashboard
 * Phase 9 Task 3.2 - Multi-Service Monitoring & Validation Dashboard
 *
 * Displays comprehensive overview of all services (tenants) in the platform:
 * - Service Overview Panel (tenant cards)
 * - Apps Matrix Panel
 * - Theme Panel
 * - Cross-Service Validation Warnings Panel
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Server,
  Package,
  Palette,
  AlertTriangle,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Activity,
  Layers,
  Eye,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { authClient } from '@o4o/auth-client';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

// Types
interface TenantInfo {
  tenantId: string;
  domain: string;
  name: string;
  serviceGroup: string;
  template: string;
  installedApps: number;
  installedAppsList: string[];
  theme: string | null;
  navigationItems: number;
  viewsRegistered: number;
  status: 'healthy' | 'warning' | 'critical';
  siteStatus: string;
  createdAt: string;
  updatedAt: string;
}

interface AppsMatrix {
  tenants: Array<{
    tenantId: string;
    serviceGroup: string;
    apps: Record<string, boolean>;
  }>;
  allApps: string[];
  coreApps: string[];
  extensionApps: string[];
}

interface ThemeStatus {
  tenantId: string;
  serviceGroup: string;
  themeId: string | null;
  themePreset: string | null;
  hasOverrides: boolean;
  cssVariablesGenerated: boolean;
  status: 'ok' | 'warning' | 'error';
  issues: string[];
}

interface ValidationWarning {
  tenantId: string;
  serviceGroup: string;
  issueType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: Record<string, any>;
  detectedAt: string;
}

interface SystemSummary {
  totalTenants: number;
  healthyTenants: number;
  warningTenants: number;
  criticalTenants: number;
  totalAppsInstalled: number;
  uniqueApps: number;
  averageAppsPerTenant: number;
  serviceGroups: Record<string, number>;
  healthScore: number;
  isolationScore: number;
  navigationMatchScore: number;
  viewResolutionAccuracy: number;
  lastValidationAt: string | null;
  warnings: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  // Phase 9 Task 4 - Quality Score
  qualityScore: number;
  qualityIssues: {
    critical: number;
    warnings: number;
    passed: number;
  };
  perTenantScore: Record<string, number>;
}

interface ValidationResult {
  success: boolean;
  timestamp: string;
  duration: number;
  tenantsValidated: number;
  warnings: ValidationWarning[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
  };
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'healthy':
    case 'ok':
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          정상
        </Badge>
      );
    case 'warning':
      return (
        <Badge variant="default" className="bg-yellow-500">
          <AlertCircle className="w-3 h-3 mr-1" />
          주의
        </Badge>
      );
    case 'critical':
    case 'error':
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          위험
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

// Severity badge component
const SeverityBadge = ({ severity }: { severity: string }) => {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'high':
      return <Badge className="bg-orange-500">High</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-500">Medium</Badge>;
    case 'low':
      return <Badge variant="secondary">Low</Badge>;
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
};

export default function ServiceOverview() {
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch system summary
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['service-monitor', 'summary'],
    queryFn: async () => {
      const response = await authClient.api.get<{ success: boolean; data: SystemSummary }>('/v1/service/monitor/summary');
      return response.data.data;
    },
    refetchInterval: 60000
  });

  // Fetch tenants
  const { data: tenantsData, isLoading: loadingTenants } = useQuery({
    queryKey: ['service-monitor', 'tenants'],
    queryFn: async () => {
      const response = await authClient.api.get<{ success: boolean; data: { tenants: TenantInfo[] } }>('/v1/service/monitor/tenants');
      return response.data.data.tenants;
    }
  });

  // Fetch apps matrix
  const { data: appsMatrix, isLoading: loadingApps } = useQuery({
    queryKey: ['service-monitor', 'apps'],
    queryFn: async () => {
      const response = await authClient.api.get<{ success: boolean; data: AppsMatrix }>('/v1/service/monitor/apps');
      return response.data.data;
    }
  });

  // Fetch theme status
  const { data: themesData, isLoading: loadingThemes } = useQuery({
    queryKey: ['service-monitor', 'themes'],
    queryFn: async () => {
      const response = await authClient.api.get<{ success: boolean; data: { themes: ThemeStatus[] } }>('/v1/service/monitor/themes');
      return response.data.data.themes;
    }
  });

  // Fetch warnings
  const { data: warningsData, isLoading: loadingWarnings } = useQuery({
    queryKey: ['service-monitor', 'warnings'],
    queryFn: async () => {
      const response = await authClient.api.get<{ success: boolean; data: { warnings: ValidationWarning[] } }>('/v1/service/monitor/warnings');
      return response.data.data.warnings;
    }
  });

  // Run validation mutation
  const validateMutation = useMutation({
    mutationFn: async () => {
      const response = await authClient.api.post<{ success: boolean; data: ValidationResult }>('/v1/service/monitor/validate');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-monitor'] });
    }
  });

  // Export report
  const handleExportReport = async (format: 'json' | 'csv') => {
    try {
      const response = await authClient.api.get(`/v1/service/monitor/report?format=${format}`, {
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service-validation-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `service-validation-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  // Group tenants by service group
  const tenantsByGroup = tenantsData?.reduce((acc, tenant) => {
    const group = tenant.serviceGroup;
    if (!acc[group]) acc[group] = [];
    acc[group].push(tenant);
    return acc;
  }, {} as Record<string, TenantInfo[]>) || {};

  const isLoading = loadingSummary || loadingTenants || loadingApps || loadingThemes || loadingWarnings;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Service Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Multi-Service Monitoring & Validation Dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => validateMutation.mutate()}
            disabled={validateMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${validateMutation.isPending ? 'animate-spin' : ''}`} />
            Run Validation
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportReport('json')}>
            <Download className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportReport('csv')}>
            <FileText className="w-4 h-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Services</CardTitle>
              <Server className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTenants}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="text-green-500">{summary.healthyTenants} healthy</span>
                <span className="text-yellow-500">{summary.warningTenants} warning</span>
                <span className="text-red-500">{summary.criticalTenants} critical</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.healthScore}%</div>
              <Progress value={summary.healthScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Apps Installed</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalAppsInstalled}</div>
              <p className="text-xs text-muted-foreground">
                {summary.uniqueApps} unique apps | avg {summary.averageAppsPerTenant}/tenant
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.warnings.total}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="text-red-500">{summary.warnings.critical} critical</span>
                <span className="text-orange-500">{summary.warnings.high} high</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quality Score Card - Phase 9 Task 4 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overall Quality Score</CardTitle>
              <Gauge className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - (summary.qualityScore || 0) / 100)}`}
                      className={
                        (summary.qualityScore || 0) >= 80 ? 'text-green-500' :
                        (summary.qualityScore || 0) >= 60 ? 'text-yellow-500' :
                        'text-red-500'
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{summary.qualityScore || 0}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle className="w-3 h-3" />
                      Critical Issues
                    </span>
                    <span className="font-medium">{summary.qualityIssues?.critical || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-yellow-500">
                      <AlertCircle className="w-3 h-3" />
                      Warnings
                    </span>
                    <span className="font-medium">{summary.qualityIssues?.warnings || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="w-3 h-3" />
                      Passed Checks
                    </span>
                    <span className="font-medium">{summary.qualityIssues?.passed || 0}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Quality formula: 100 - (critical×20) - (warnings×5) - (missing apps×10)
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Per-Tenant Quality Breakdown</CardTitle>
              <CardDescription>Quality scores by service tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {summary.perTenantScore && Object.entries(summary.perTenantScore)
                  .sort(([, a], [, b]) => b - a)
                  .map(([tenantId, score]) => (
                    <div key={tenantId} className="flex items-center gap-2">
                      <span className="text-sm w-32 truncate" title={tenantId}>{tenantId}</span>
                      <Progress value={score} className="flex-1" />
                      <span className={`text-sm font-medium w-12 text-right ${
                        score >= 80 ? 'text-green-500' :
                        score >= 60 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {score}
                      </span>
                      {score >= 80 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : score >= 60 ? (
                        <Minus className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  ))}
                {(!summary.perTenantScore || Object.keys(summary.perTenantScore).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tenant quality data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Isolation Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={summary.isolationScore} className="flex-1" />
                <span className="text-lg font-bold">{summary.isolationScore}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cross-tenant data isolation quality
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Navigation Match</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={summary.navigationMatchScore} className="flex-1" />
                <span className="text-lg font-bold">{summary.navigationMatchScore}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Navigation configuration accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">View Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={summary.viewResolutionAccuracy} className="flex-1" />
                <span className="text-lg font-bold">{summary.viewResolutionAccuracy}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                View template resolution accuracy
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Services Overview
          </TabsTrigger>
          <TabsTrigger value="apps" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Apps Matrix
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="warnings" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings
            {warningsData && warningsData.length > 0 && (
              <Badge variant="destructive" className="ml-1">{warningsData.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Services Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {Object.entries(tenantsByGroup).map(([group, tenants]) => (
            <Collapsible
              key={group}
              open={expandedGroups.includes(group)}
              onOpenChange={() => toggleGroup(group)}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {expandedGroups.includes(group) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <CardTitle className="text-lg">{group}</CardTitle>
                      <Badge variant="outline">{tenants.length} tenants</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-500">
                        {tenants.filter(t => t.status === 'healthy').length} healthy
                      </span>
                      <span className="text-sm text-yellow-500">
                        {tenants.filter(t => t.status === 'warning').length} warning
                      </span>
                      <span className="text-sm text-red-500">
                        {tenants.filter(t => t.status === 'critical').length} critical
                      </span>
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tenants.map(tenant => (
                        <Card key={tenant.tenantId} className="border">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{tenant.name}</CardTitle>
                              <StatusBadge status={tenant.status} />
                            </div>
                            <CardDescription>{tenant.domain}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Template:</span>
                              <span>{tenant.template}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Apps:</span>
                              <span>{tenant.installedApps}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Theme:</span>
                              <span>{tenant.theme || 'None'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Site Status:</span>
                              <Badge variant="outline">{tenant.siteStatus}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}

          {Object.keys(tenantsByGroup).length === 0 && !isLoading && (
            <Alert>
              <AlertTitle>No Services Found</AlertTitle>
              <AlertDescription>
                No services have been provisioned yet. Use the Service Builder to create new services.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Apps Matrix Tab */}
        <TabsContent value="apps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apps Installation Matrix</CardTitle>
              <CardDescription>
                Overview of apps installed per tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appsMatrix && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Tenant</TableHead>
                        <TableHead className="sticky left-[100px] bg-background">Group</TableHead>
                        {appsMatrix.allApps.map(app => (
                          <TableHead key={app} className="text-center min-w-[100px]">
                            <span className={appsMatrix.coreApps.includes(app) ? 'font-bold' : ''}>
                              {app}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appsMatrix.tenants.map(tenant => (
                        <TableRow key={tenant.tenantId}>
                          <TableCell className="sticky left-0 bg-background font-medium">
                            {tenant.tenantId}
                          </TableCell>
                          <TableCell className="sticky left-[100px] bg-background">
                            <Badge variant="outline">{tenant.serviceGroup}</Badge>
                          </TableCell>
                          {appsMatrix.allApps.map(app => (
                            <TableCell key={app} className="text-center">
                              {tenant.apps[app] ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!appsMatrix && !loadingApps && (
                <Alert>
                  <AlertTitle>No Apps Data</AlertTitle>
                  <AlertDescription>
                    Apps matrix data is not available.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Themes Tab */}
        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Status</CardTitle>
              <CardDescription>
                Theme configuration for each tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Service Group</TableHead>
                    <TableHead>Theme ID</TableHead>
                    <TableHead>Preset</TableHead>
                    <TableHead>Overrides</TableHead>
                    <TableHead>CSS Vars</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {themesData?.map(theme => (
                    <TableRow key={theme.tenantId}>
                      <TableCell className="font-medium">{theme.tenantId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{theme.serviceGroup}</Badge>
                      </TableCell>
                      <TableCell>{theme.themeId || '-'}</TableCell>
                      <TableCell>{theme.themePreset || '-'}</TableCell>
                      <TableCell>
                        {theme.hasOverrides ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {theme.cssVariablesGenerated ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={theme.status} />
                      </TableCell>
                      <TableCell>
                        {theme.issues.length > 0 ? (
                          <span className="text-sm text-red-500">{theme.issues.join(', ')}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {(!themesData || themesData.length === 0) && !loadingThemes && (
                <Alert className="mt-4">
                  <AlertTitle>No Theme Data</AlertTitle>
                  <AlertDescription>
                    Theme status data is not available.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warnings Tab */}
        <TabsContent value="warnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Cross-Service Validation Warnings
              </CardTitle>
              <CardDescription>
                Issues detected during service validation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {warningsData && warningsData.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Service Group</TableHead>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Detected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warningsData.map((warning, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <SeverityBadge severity={warning.severity} />
                        </TableCell>
                        <TableCell className="font-medium">{warning.tenantId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{warning.serviceGroup}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{warning.issueType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {warning.description}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(warning.detectedAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <AlertTitle>No Warnings</AlertTitle>
                  <AlertDescription>
                    All services are operating normally. No validation warnings detected.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Validation History */}
          {summary?.lastValidationAt && (
            <Card>
              <CardHeader>
                <CardTitle>Last Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Last validation completed at: {format(new Date(summary.lastValidationAt), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
