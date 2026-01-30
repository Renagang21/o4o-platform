/**
 * Automation Settings Page
 *
 * Configure campaign automation rules
 * Phase R11: Marketing Automation System
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Settings,
  Play,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { AGTable, type AGTableColumn } from '@/components/ag/AGTable';
import {
  automationApi,
  type AutomationSettings as AutomationSettingsType,
  type AutomationLogEntry,
} from '@/lib/api/lmsMarketing';

export default function AutomationSettings() {
  const [settings, setSettings] = useState<AutomationSettingsType | null>(null);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        automationApi.getSettings(),
        automationApi.getLogs({ limit: 50 }),
      ]);

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data);
      }
    } catch (err) {
      setError('Failed to load automation data');
      console.error('Automation fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSettingChange = async (key: keyof AutomationSettingsType, value: boolean | number) => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await automationApi.updateSettings({ [key]: value });
      if (response.success && response.data) {
        setSettings(response.data);
        setSuccess('Settings updated');
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(response.error || 'Failed to update settings');
      }
    } catch (err) {
      setError('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunAutomation = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const response = await automationApi.runAutomation();
      if (response.success && response.data) {
        setSuccess(
          `Automation completed: ${response.data.totalProcessed} processed, ` +
          `${response.data.totalSuccessful} successful, ${response.data.totalFailed} failed`
        );
        // Refresh logs
        const logsRes = await automationApi.getLogs({ limit: 50 });
        if (logsRes.success && logsRes.data) {
          setLogs(logsRes.data);
        }
      } else {
        setError(response.error || 'Failed to run automation');
      }
    } catch (err) {
      setError('Failed to run automation');
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      const response = await automationApi.clearLogs();
      if (response.success) {
        setLogs([]);
        setSuccess('Logs cleared');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      setError('Failed to clear logs');
    }
  };

  const logColumns: AGTableColumn<AutomationLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      render: (log) => (
        <span className="text-sm text-muted-foreground">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'ruleType',
      header: 'Rule',
      render: (log) => (
        <Badge variant="outline" className="text-xs">
          {log.ruleType.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'campaign',
      header: 'Campaign',
      render: (log) => (
        <div>
          <span className="font-medium">{log.campaignTitle}</span>
          <Badge className="ml-2" variant="secondary">
            {log.campaignType}
          </Badge>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => <span>{log.action}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (log) => (
        <div className="flex items-center gap-1">
          {log.success ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Success</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600">Failed</span>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Campaign Automation
          </h1>
          <p className="text-muted-foreground">
            Configure automatic campaign management rules
          </p>
        </div>
        <Button onClick={handleRunAutomation} disabled={isRunning}>
          {isRunning ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Run Now
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Rules
          </CardTitle>
          <CardDescription>
            Enable or disable automatic campaign management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Publish */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <Label className="text-base font-medium">Auto-Publish Scheduled</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically publish campaigns when their start date arrives
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.autoPublishScheduled ?? true}
              onCheckedChange={(checked) => handleSettingChange('autoPublishScheduled', checked)}
              disabled={isSaving}
            />
          </div>

          {/* Auto End */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-orange-500" />
              <div>
                <Label className="text-base font-medium">Auto-End Expired</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically end campaigns when their end date passes
                </p>
              </div>
            </div>
            <Switch
              checked={settings?.autoEndExpired ?? true}
              onCheckedChange={(checked) => handleSettingChange('autoEndExpired', checked)}
              disabled={isSaving}
            />
          </div>

          {/* Auto Pause Low Engagement */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <Label className="text-base font-medium">Auto-Pause Low Engagement</Label>
                <p className="text-sm text-muted-foreground">
                  Pause campaigns with engagement below threshold
                </p>
                {settings?.autoPauseLowEngagement && (
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-sm">Threshold:</Label>
                    <Input
                      type="number"
                      className="w-20 h-8"
                      value={settings.lowEngagementThreshold}
                      onChange={(e) =>
                        handleSettingChange('lowEngagementThreshold', parseInt(e.target.value) || 5)
                      }
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}
              </div>
            </div>
            <Switch
              checked={settings?.autoPauseLowEngagement ?? false}
              onCheckedChange={(checked) => handleSettingChange('autoPauseLowEngagement', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automation Logs</CardTitle>
              <CardDescription>
                Recent automation activities
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearLogs}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No automation logs yet</p>
              <p className="text-sm">Run automation to see activity here</p>
            </div>
          ) : (
            <AGTable data={logs} columns={logColumns} rowKey="timestamp" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
