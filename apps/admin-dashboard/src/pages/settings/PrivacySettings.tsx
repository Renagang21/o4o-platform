/**
 * Privacy Settings Page
 * WordPress-style privacy and GDPR compliance settings
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@o4o/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Shield,
  Lock,
  Eye,
  FileText,
  Download,
  Trash2,
  UserX,
  Cookie,
  Globe,
  Info,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PrivacySettings {
  // Privacy Policy
  privacyPolicyPage: string;
  privacyPolicyUrl: string;
  generateDefaultPolicy: boolean;
  
  // Data Retention
  retentionPeriod: {
    comments: number;
    users: number;
    logs: number;
    orders: number;
  };
  
  // GDPR Compliance
  gdpr: {
    enabled: boolean;
    consentBanner: boolean;
    consentText: string;
    dataProcessingAgreement: boolean;
    rightToErasure: boolean;
    rightToPortability: boolean;
    rightToAccess: boolean;
    dataBreachNotification: boolean;
  };
  
  // Cookie Settings
  cookies: {
    essential: boolean;
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
    thirdParty: boolean;
    cookieBannerText: string;
    cookiePolicyUrl: string;
  };
  
  // Data Export/Erasure
  dataHandling: {
    exportFormats: string[];
    autoDeleteInactive: boolean;
    inactivePeriod: number;
    anonymizeData: boolean;
    exportIncludeMedia: boolean;
  };
  
  // Third-party Services
  thirdPartyServices: {
    googleAnalytics: { enabled: boolean; anonymizeIp: boolean; id: string };
    facebook: { enabled: boolean; pixelId: string };
    mailchimp: { enabled: boolean; apiKey: string };
  };
}

const PrivacySettings: React.FC = () => {
  const { authClient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    privacyPolicyPage: '',
    privacyPolicyUrl: '/privacy-policy',
    generateDefaultPolicy: false,
    retentionPeriod: {
      comments: 365,
      users: 730,
      logs: 90,
      orders: 2555
    },
    gdpr: {
      enabled: true,
      consentBanner: true,
      consentText: 'We use cookies to improve your experience. By using our site, you agree to our privacy policy.',
      dataProcessingAgreement: true,
      rightToErasure: true,
      rightToPortability: true,
      rightToAccess: true,
      dataBreachNotification: true
    },
    cookies: {
      essential: true,
      functional: true,
      analytics: false,
      marketing: false,
      thirdParty: false,
      cookieBannerText: 'This website uses cookies to ensure you get the best experience.',
      cookiePolicyUrl: '/cookie-policy'
    },
    dataHandling: {
      exportFormats: ['json', 'csv'],
      autoDeleteInactive: false,
      inactivePeriod: 365,
      anonymizeData: true,
      exportIncludeMedia: false
    },
    thirdPartyServices: {
      googleAnalytics: { enabled: false, anonymizeIp: true, id: '' },
      facebook: { enabled: false, pixelId: '' },
      mailchimp: { enabled: false, apiKey: '' }
    }
  });

  // Pages for privacy policy selection (will be fetched from API)
  const pages = [
    { id: '0', title: '-- Select --' }
  ];

  const exportFormats = [
    { value: 'json', label: 'JSON' },
    { value: 'csv', label: 'CSV' },
    { value: 'xml', label: 'XML' },
    { value: 'pdf', label: 'PDF' }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/settings/privacy');
      if (response.data?.data) {
        setSettings(response.data.data);
      }
    } catch (error: any) {
      // Using default settings on error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authClient.api.put('/settings/privacy', settings);
      toast.success('Privacy settings saved successfully');
    } catch (error: any) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const generatePrivacyPolicy = () => {
    toast.success('Privacy policy template generated');
    // Would trigger actual generation logic
  };

  const exportUserData = () => {
    toast.success('User data export initiated');
    // Would trigger actual export
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Settings</h1>
        <p className="text-gray-600 mt-2">Manage privacy policy, GDPR compliance, and data protection settings</p>
      </div>

      {/* GDPR Status Banner */}
      <Alert className={`mb-6 ${settings.gdpr.enabled ? 'border-green-500' : 'border-yellow-500'}`}>
        <Shield className="h-4 w-4" />
        <AlertTitle>GDPR Compliance Status</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {settings.gdpr.enabled ? (
                <p className="text-sm">GDPR compliance features are enabled.</p>
              ) : (
                <p className="text-sm">GDPR compliance features are disabled. Enable them to comply with EU regulations.</p>
              )}
            </div>
            <Badge variant={settings.gdpr.enabled ? 'default' : 'secondary'}>
              {settings.gdpr.enabled ? 'Compliant' : 'Not Compliant'}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {/* Privacy Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="privacyPolicyPage">Privacy Policy Page</Label>
                <Select
                  value={settings.privacyPolicyPage}
                  onValueChange={(value) => updateSetting('privacyPolicyPage', value)}
                >
                  <SelectTrigger id="privacyPolicyPage">
                    <SelectValue placeholder="Select a page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Select which page contains your privacy policy</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="privacyPolicyUrl">Privacy Policy URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="privacyPolicyUrl"
                    value={settings.privacyPolicyUrl}
                    onChange={(e) => updateSetting('privacyPolicyUrl', e.target.value)}
                    placeholder="/privacy-policy"
                  />
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Generate Default Privacy Policy</Label>
                  <p className="text-sm text-gray-500">Create a basic privacy policy template</p>
                </div>
                <Button onClick={generatePrivacyPolicy} variant="outline">
                  Generate Template
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GDPR Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              GDPR Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="space-y-0.5">
                <Label>Enable GDPR Compliance Features</Label>
                <p className="text-sm text-gray-600">Activate all GDPR-related functionality</p>
              </div>
              <Switch
                checked={settings.gdpr.enabled}
                onCheckedChange={(checked) => updateSetting('gdpr.enabled', checked)}
              />
            </div>

            {settings.gdpr.enabled && (
              <>
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Consent Banner</Label>
                      <p className="text-sm text-gray-500">Display cookie consent banner to visitors</p>
                    </div>
                    <Switch
                      checked={settings.gdpr.consentBanner}
                      onCheckedChange={(checked) => updateSetting('gdpr.consentBanner', checked)}
                    />
                  </div>

                  {settings.gdpr.consentBanner && (
                    <div className="grid gap-2 ml-6">
                      <Label htmlFor="consentText">Consent Banner Text</Label>
                      <Textarea
                        id="consentText"
                        value={settings.gdpr.consentText}
                        onChange={(e) => updateSetting('gdpr.consentText', e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">User Rights</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Right to Erasure</Label>
                        <p className="text-sm text-gray-500">Allow users to request data deletion</p>
                      </div>
                      <Switch
                        checked={settings.gdpr.rightToErasure}
                        onCheckedChange={(checked) => updateSetting('gdpr.rightToErasure', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Right to Data Portability</Label>
                        <p className="text-sm text-gray-500">Allow users to export their data</p>
                      </div>
                      <Switch
                        checked={settings.gdpr.rightToPortability}
                        onCheckedChange={(checked) => updateSetting('gdpr.rightToPortability', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Right to Access</Label>
                        <p className="text-sm text-gray-500">Allow users to view their stored data</p>
                      </div>
                      <Switch
                        checked={settings.gdpr.rightToAccess}
                        onCheckedChange={(checked) => updateSetting('gdpr.rightToAccess', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Data Breach Notification</Label>
                        <p className="text-sm text-gray-500">Enable breach notification system</p>
                      </div>
                      <Switch
                        checked={settings.gdpr.dataBreachNotification}
                        onCheckedChange={(checked) => updateSetting('gdpr.dataBreachNotification', checked)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cookie Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookie Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Essential Cookies</Label>
                    <p className="text-sm text-gray-500">Required for basic site functionality</p>
                  </div>
                  <Badge variant="default">Always On</Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Functional Cookies</Label>
                    <p className="text-sm text-gray-500">Remember user preferences and settings</p>
                  </div>
                  <Switch
                    checked={settings.cookies.functional}
                    onCheckedChange={(checked) => updateSetting('cookies.functional', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics Cookies</Label>
                    <p className="text-sm text-gray-500">Track site usage and performance</p>
                  </div>
                  <Switch
                    checked={settings.cookies.analytics}
                    onCheckedChange={(checked) => updateSetting('cookies.analytics', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Cookies</Label>
                    <p className="text-sm text-gray-500">Used for targeted advertising</p>
                  </div>
                  <Switch
                    checked={settings.cookies.marketing}
                    onCheckedChange={(checked) => updateSetting('cookies.marketing', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Third-party Cookies</Label>
                    <p className="text-sm text-gray-500">Allow cookies from external services</p>
                  </div>
                  <Switch
                    checked={settings.cookies.thirdParty}
                    onCheckedChange={(checked) => updateSetting('cookies.thirdParty', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="cookieBannerText">Cookie Banner Text</Label>
                <Textarea
                  id="cookieBannerText"
                  value={settings.cookies.cookieBannerText}
                  onChange={(e) => updateSetting('cookies.cookieBannerText', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Data Retention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Set how long different types of data should be retained before automatic deletion.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="retentionComments">Comments (days)</Label>
                  <Input
                    id="retentionComments"
                    type="number"
                    min="30"
                    value={settings.retentionPeriod.comments}
                    onChange={(e) => updateSetting('retentionPeriod.comments', parseInt(e.target.value) || 365)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="retentionUsers">User Data (days)</Label>
                  <Input
                    id="retentionUsers"
                    type="number"
                    min="30"
                    value={settings.retentionPeriod.users}
                    onChange={(e) => updateSetting('retentionPeriod.users', parseInt(e.target.value) || 730)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="retentionLogs">System Logs (days)</Label>
                  <Input
                    id="retentionLogs"
                    type="number"
                    min="7"
                    value={settings.retentionPeriod.logs}
                    onChange={(e) => updateSetting('retentionPeriod.logs', parseInt(e.target.value) || 90)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="retentionOrders">Order History (days)</Label>
                  <Input
                    id="retentionOrders"
                    type="number"
                    min="365"
                    value={settings.retentionPeriod.orders}
                    onChange={(e) => updateSetting('retentionPeriod.orders', parseInt(e.target.value) || 2555)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-delete Inactive Users</Label>
                    <p className="text-sm text-gray-500">Remove users who haven't logged in</p>
                  </div>
                  <Switch
                    checked={settings.dataHandling.autoDeleteInactive}
                    onCheckedChange={(checked) => updateSetting('dataHandling.autoDeleteInactive', checked)}
                  />
                </div>

                {settings.dataHandling.autoDeleteInactive && (
                  <div className="grid gap-2 ml-6">
                    <Label htmlFor="inactivePeriod">Inactive Period (days)</Label>
                    <Input
                      id="inactivePeriod"
                      type="number"
                      min="90"
                      value={settings.dataHandling.inactivePeriod}
                      onChange={(e) => updateSetting('dataHandling.inactivePeriod', parseInt(e.target.value) || 365)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Anonymize Data Instead of Deleting</Label>
                    <p className="text-sm text-gray-500">Keep data but remove personal information</p>
                  </div>
                  <Switch
                    checked={settings.dataHandling.anonymizeData}
                    onCheckedChange={(checked) => updateSetting('dataHandling.anonymizeData', checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Export Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Export Formats</Label>
                <div className="flex flex-wrap gap-2">
                  {exportFormats.map((format) => (
                    <Badge
                      key={format.value}
                      variant={settings.dataHandling.exportFormats.includes(format.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => {
                        const formats = settings.dataHandling.exportFormats;
                        if (formats.includes(format.value)) {
                          updateSetting('dataHandling.exportFormats', 
                            formats.filter(f => f !== format.value)
                          );
                        } else {
                          updateSetting('dataHandling.exportFormats', 
                            [...formats, format.value]
                          );
                        }
                      }}
                    >
                      {format.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-gray-500">Available formats for user data export</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Media Files in Export</Label>
                  <p className="text-sm text-gray-500">Add uploaded images and files to data export</p>
                </div>
                <Switch
                  checked={settings.dataHandling.exportIncludeMedia}
                  onCheckedChange={(checked) => updateSetting('dataHandling.exportIncludeMedia', checked)}
                />
              </div>

              <Separator />

              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Export All User Data</Label>
                  <p className="text-sm text-gray-500">Generate a complete data export for GDPR compliance</p>
                </div>
                <Button onClick={exportUserData} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third-party Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Third-party Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                Third-party services may collect user data. Ensure compliance with their privacy policies.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {/* Google Analytics */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Google Analytics</Label>
                    {settings.thirdPartyServices.googleAnalytics.enabled && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                  <Switch
                    checked={settings.thirdPartyServices.googleAnalytics.enabled}
                    onCheckedChange={(checked) => updateSetting('thirdPartyServices.googleAnalytics.enabled', checked)}
                  />
                </div>
                
                {settings.thirdPartyServices.googleAnalytics.enabled && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="gaId">Tracking ID</Label>
                      <Input
                        id="gaId"
                        placeholder="G-XXXXXXXXXX"
                        value={settings.thirdPartyServices.googleAnalytics.id}
                        onChange={(e) => updateSetting('thirdPartyServices.googleAnalytics.id', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Anonymize IP Addresses</Label>
                      <Switch
                        checked={settings.thirdPartyServices.googleAnalytics.anonymizeIp}
                        onCheckedChange={(checked) => updateSetting('thirdPartyServices.googleAnalytics.anonymizeIp', checked)}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Facebook Pixel */}
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Facebook Pixel</Label>
                    {settings.thirdPartyServices.facebook.enabled && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                  <Switch
                    checked={settings.thirdPartyServices.facebook.enabled}
                    onCheckedChange={(checked) => updateSetting('thirdPartyServices.facebook.enabled', checked)}
                  />
                </div>
                
                {settings.thirdPartyServices.facebook.enabled && (
                  <div className="grid gap-2">
                    <Label htmlFor="fbPixel">Pixel ID</Label>
                    <Input
                      id="fbPixel"
                      placeholder="Enter Facebook Pixel ID"
                      value={settings.thirdPartyServices.facebook.pixelId}
                      onChange={(e) => updateSetting('thirdPartyServices.facebook.pixelId', e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end sticky bottom-4">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="shadow-lg"
          >
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;