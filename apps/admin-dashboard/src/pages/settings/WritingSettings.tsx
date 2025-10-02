/**
 * Writing Settings Page
 * WordPress-style writing configuration
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
import { 
  Save, 
  Info, 
  AlertCircle,
  FileText,
  Edit,
  MessageSquare,
  Mail,
  Globe,
  RefreshCw,
  Hash
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WritingSettings {
  // Default Post Settings
  defaultCategory: string;
  defaultPostFormat: string;
  
  // Editor Settings
  useBlockEditor: boolean;
  enableMarkdown: boolean;
  enableRichTextPaste: boolean;
  convertEmoticonsToEmoji: boolean;
  
  // Publishing Settings
  defaultCommentStatus: 'open' | 'closed';
  defaultPingStatus: 'open' | 'closed';
  requireNameEmail: boolean;
  requireModeration: boolean;
  requireManualApproval: boolean;
  
  // Update Services
  updateServices: string;
  pingServices: string[];
  
  // Auto-save Settings
  autoSaveInterval: number;
  revisionsToKeep: number;
  
  // Email Settings
  emailNotifyPost: boolean;
  emailNotifyComment: boolean;
  emailNotifyModeration: boolean;
}

const WritingSettings: React.FC = () => {
  const { authClient } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WritingSettings>({
    defaultCategory: '1',
    defaultPostFormat: 'standard',
    useBlockEditor: true,
    enableMarkdown: false,
    enableRichTextPaste: true,
    convertEmoticonsToEmoji: true,
    defaultCommentStatus: 'open',
    defaultPingStatus: 'open',
    requireNameEmail: true,
    requireModeration: false,
    requireManualApproval: false,
    updateServices: '',
    pingServices: [],
    autoSaveInterval: 60,
    revisionsToKeep: 10,
    emailNotifyPost: false,
    emailNotifyComment: true,
    emailNotifyModeration: true
  });

  // Categories will be fetched from API
  const categories = [
    { id: '1', name: 'Uncategorized' }
  ];

  // Post formats
  const postFormats = [
    { value: 'standard', label: 'Standard' },
    { value: 'aside', label: 'Aside' },
    { value: 'gallery', label: 'Gallery' },
    { value: 'link', label: 'Link' },
    { value: 'image', label: 'Image' },
    { value: 'quote', label: 'Quote' },
    { value: 'status', label: 'Status' },
    { value: 'video', label: 'Video' },
    { value: 'audio', label: 'Audio' },
    { value: 'chat', label: 'Chat' }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/settings/writing');
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
      await authClient.api.put('/settings/writing', settings);
      toast.success('Writing settings saved successfully');
    } catch (error: any) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof WritingSettings>(
    key: K,
    value: WritingSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
        <h1 className="text-3xl font-bold tracking-tight">Writing Settings</h1>
        <p className="text-gray-600 mt-2">Configure default settings for writing and publishing content</p>
      </div>

      <div className="space-y-6">
        {/* Default Post Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Default Post Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="defaultCategory">Default Post Category</Label>
                <Select
                  value={settings.defaultCategory}
                  onValueChange={(value) => updateSetting('defaultCategory', value)}
                >
                  <SelectTrigger id="defaultCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Posts will be assigned to this category by default</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="defaultPostFormat">Default Post Format</Label>
                <Select
                  value={settings.defaultPostFormat}
                  onValueChange={(value) => updateSetting('defaultPostFormat', value)}
                >
                  <SelectTrigger id="defaultPostFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {postFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editor Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editor Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Use Block Editor (Gutenberg)</Label>
                  <p className="text-sm text-gray-500">Enable the modern block-based editor</p>
                </div>
                <Switch
                  checked={settings.useBlockEditor}
                  onCheckedChange={(checked) => updateSetting('useBlockEditor', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Markdown</Label>
                  <p className="text-sm text-gray-500">Allow writing posts using Markdown syntax</p>
                </div>
                <Switch
                  checked={settings.enableMarkdown}
                  onCheckedChange={(checked) => updateSetting('enableMarkdown', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Rich Text Paste</Label>
                  <p className="text-sm text-gray-500">Preserve formatting when pasting from other applications</p>
                </div>
                <Switch
                  checked={settings.enableRichTextPaste}
                  onCheckedChange={(checked) => updateSetting('enableRichTextPaste', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Convert Emoticons to Emoji</Label>
                  <p className="text-sm text-gray-500">Convert text emoticons like :-) to 😊</p>
                </div>
                <Switch
                  checked={settings.convertEmoticonsToEmoji}
                  onCheckedChange={(checked) => updateSetting('convertEmoticonsToEmoji', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discussion Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Default Discussion Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="defaultCommentStatus">Default Comment Status</Label>
                <Select
                  value={settings.defaultCommentStatus}
                  onValueChange={(value: 'open' | 'closed') => updateSetting('defaultCommentStatus', value)}
                >
                  <SelectTrigger id="defaultCommentStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Allow comments</SelectItem>
                    <SelectItem value="closed">Comments closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="defaultPingStatus">Default Pingback/Trackback Status</Label>
                <Select
                  value={settings.defaultPingStatus}
                  onValueChange={(value: 'open' | 'closed') => updateSetting('defaultPingStatus', value)}
                >
                  <SelectTrigger id="defaultPingStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Allow pingbacks and trackbacks</SelectItem>
                    <SelectItem value="closed">Disable pingbacks and trackbacks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Comment author must fill out name and email</Label>
                    <p className="text-sm text-gray-500">Anonymous comments will not be allowed</p>
                  </div>
                  <Switch
                    checked={settings.requireNameEmail}
                    onCheckedChange={(checked) => updateSetting('requireNameEmail', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Hold comments for moderation</Label>
                    <p className="text-sm text-gray-500">Comments must be approved before appearing</p>
                  </div>
                  <Switch
                    checked={settings.requireModeration}
                    onCheckedChange={(checked) => updateSetting('requireModeration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Comment must be manually approved</Label>
                    <p className="text-sm text-gray-500">Even from previously approved authors</p>
                  </div>
                  <Switch
                    checked={settings.requireManualApproval}
                    onCheckedChange={(checked) => updateSetting('requireManualApproval', checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-save and Revisions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Auto-save and Revisions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="autoSaveInterval">Auto-save Interval (seconds)</Label>
                <Input
                  id="autoSaveInterval"
                  name="autoSaveInterval"
                  type="number"
                  min="30"
                  max="300"
                  value={settings.autoSaveInterval}
                  onChange={(e) => updateSetting('autoSaveInterval', parseInt(e.target.value) || 60)}
                />
                <p className="text-sm text-gray-500">How often to save drafts automatically (30-300 seconds)</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="revisionsToKeep">Revisions to Keep</Label>
                <Input
                  id="revisionsToKeep"
                  name="revisionsToKeep"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.revisionsToKeep}
                  onChange={(e) => updateSetting('revisionsToKeep', parseInt(e.target.value) || 10)}
                />
                <p className="text-sm text-gray-500">Maximum number of revisions to store (0 = disable revisions)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email me when a post is published</Label>
                  <p className="text-sm text-gray-500">Receive notifications for new posts</p>
                </div>
                <Switch
                  checked={settings.emailNotifyPost}
                  onCheckedChange={(checked) => updateSetting('emailNotifyPost', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email me when someone comments</Label>
                  <p className="text-sm text-gray-500">Get notified about new comments</p>
                </div>
                <Switch
                  checked={settings.emailNotifyComment}
                  onCheckedChange={(checked) => updateSetting('emailNotifyComment', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email me when a comment is held for moderation</Label>
                  <p className="text-sm text-gray-500">Notify about comments awaiting approval</p>
                </div>
                <Switch
                  checked={settings.emailNotifyModeration}
                  onCheckedChange={(checked) => updateSetting('emailNotifyModeration', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Update Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Update Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="updateServices">Ping Services</Label>
              <Textarea
                id="updateServices"
                name="updateServices"
                placeholder="Enter ping service URLs, one per line..."
                value={settings.updateServices}
                onChange={(e) => updateSetting('updateServices', e.target.value)}
                rows={5}
                className="font-mono text-sm"
              />
              <p className="text-sm text-gray-500">
                When you publish a new post, these services will be notified automatically.
                Separate multiple URLs with line breaks.
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Common Ping Services</AlertTitle>
              <AlertDescription className="mt-2 text-sm">
                <div className="font-mono text-xs space-y-1">
                  <div>http://rpc.pingomatic.com/</div>
                  <div>http://ping.bloggers.jp/rpc/</div>
                  <div>http://blogsearch.google.com/ping/RPC2</div>
                </div>
              </AlertDescription>
            </Alert>
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

export default WritingSettings;