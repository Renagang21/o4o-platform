/**
 * Standard Embed Block
 * 일반 iframe URL 임베드 블록
 */

import { useCallback, useState } from 'react';
import { 
  Globe,
  Link,
  Shield,
  Settings,
  Maximize,
  Code,
  AlertTriangle,
  Lock,
  Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface EmbedBlockProps extends StandardBlockProps {
  attributes?: {
    url?: string;
    embedCode?: string;
    embedType?: 'url' | 'code';
    width?: number | string;
    height?: number | string;
    aspectRatio?: 'none' | '16:9' | '4:3' | '1:1' | '9:16';
    alignment?: 'left' | 'center' | 'right' | 'wide' | 'full';
    title?: string;
    caption?: string;
    allowFullscreen?: boolean;
    sandbox?: boolean;
    sandboxOptions?: {
      allowScripts?: boolean;
      allowSameOrigin?: boolean;
      allowForms?: boolean;
      allowPopups?: boolean;
      allowModals?: boolean;
      allowDownloads?: boolean;
    };
    loading?: 'eager' | 'lazy';
    referrerPolicy?: string;
  };
}

const embedConfig: StandardBlockConfig = {
  type: 'embed',
  icon: Globe,
  category: 'embed',
  title: 'Embed',
  description: 'Embed external content via URL or HTML.',
  keywords: ['embed', 'iframe', 'html', 'external', 'widget'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const ASPECT_RATIOS = [
  { value: 'none', label: 'None (Custom)', paddingBottom: null },
  { value: '16:9', label: 'Widescreen (16:9)', paddingBottom: '56.25%' },
  { value: '4:3', label: 'Standard (4:3)', paddingBottom: '75%' },
  { value: '1:1', label: 'Square (1:1)', paddingBottom: '100%' },
  { value: '9:16', label: 'Vertical (9:16)', paddingBottom: '177.78%' }
];

const REFERRER_POLICIES = [
  { value: 'no-referrer', label: 'No Referrer' },
  { value: 'no-referrer-when-downgrade', label: 'No Referrer When Downgrade' },
  { value: 'origin', label: 'Origin' },
  { value: 'origin-when-cross-origin', label: 'Origin When Cross Origin' },
  { value: 'same-origin', label: 'Same Origin' },
  { value: 'strict-origin', label: 'Strict Origin' },
  { value: 'strict-origin-when-cross-origin', label: 'Strict Origin When Cross Origin' },
  { value: 'unsafe-url', label: 'Unsafe URL' }
];

const StandardEmbedBlock: React.FC<EmbedBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected } = props;
  const {
    url = '',
    embedCode = '',
    embedType = 'url',
    width = '100%',
    height = 400,
    aspectRatio = 'none',
    alignment = 'center',
    title = '',
    caption = '',
    allowFullscreen = true,
    sandbox = true,
    sandboxOptions = {
      allowScripts: true,
      allowSameOrigin: false,
      allowForms: false,
      allowPopups: false,
      allowModals: false,
      allowDownloads: false
    },
    loading = 'lazy',
    referrerPolicy = 'strict-origin-when-cross-origin'
  } = attributes;

  const [urlInput, setUrlInput] = useState(url);
  const [codeInput, setCodeInput] = useState(embedCode);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(null, { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Update sandbox option
  const updateSandboxOption = useCallback((option: string, value: boolean) => {
    updateAttribute('sandboxOptions', { ...sandboxOptions, [option]: value });
  }, [sandboxOptions, updateAttribute]);

  // Validate URL
  const validateUrl = (inputUrl: string): boolean => {
    try {
      const urlObj = new URL(inputUrl);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  };

  // Extract iframe src from embed code
  const extractSrcFromCode = (code: string): string | null => {
    const srcMatch = code.match(/src=["']([^"']+)["']/);
    return srcMatch ? srcMatch[1] : null;
  };

  // Handle URL submission
  const handleUrlSubmit = () => {
    if (validateUrl(urlInput)) {
      updateAttribute('url', urlInput);
      updateAttribute('embedType', 'url');
      toast.success('URL added successfully');
    } else {
      toast.error('Please enter a valid URL');
    }
  };

  // Handle embed code submission
  const handleCodeSubmit = () => {
    const src = extractSrcFromCode(codeInput);
    if (src || codeInput.includes('<iframe')) {
      updateAttribute('embedCode', codeInput);
      updateAttribute('embedType', 'code');
      if (src) updateAttribute('url', src);
      toast.success('Embed code added');
      setShowSecurityWarning(true);
    } else {
      toast.error('Invalid embed code');
    }
  };

  // Get sandbox attribute string
  const getSandboxAttribute = (): string => {
    if (!sandbox) return '';
    
    const permissions = [];
    if (sandboxOptions.allowScripts) permissions.push('allow-scripts');
    if (sandboxOptions.allowSameOrigin) permissions.push('allow-same-origin');
    if (sandboxOptions.allowForms) permissions.push('allow-forms');
    if (sandboxOptions.allowPopups) permissions.push('allow-popups');
    if (sandboxOptions.allowModals) permissions.push('allow-modals');
    if (sandboxOptions.allowDownloads) permissions.push('allow-downloads');
    
    return permissions.join(' ');
  };

  // Get container styles
  const getContainerStyles = () => {
    const styles: any = {
      width: '100%'
    };

    if (alignment === 'center') {
      styles.margin = '0 auto';
      styles.maxWidth = typeof width === 'number' ? `${width}px` : width;
    } else if (alignment === 'right') {
      styles.marginLeft = 'auto';
      styles.maxWidth = typeof width === 'number' ? `${width}px` : width;
    } else if (alignment === 'left') {
      styles.maxWidth = typeof width === 'number' ? `${width}px` : width;
    } else if (alignment === 'wide') {
      styles.maxWidth = '100%';
    } else if (alignment === 'full') {
      styles.width = '100vw';
      styles.position = 'relative';
      styles.left = '50%';
      styles.right = '50%';
      styles.marginLeft = '-50vw';
      styles.marginRight = '-50vw';
    }

    return styles;
  };

  // Get iframe styles
  const getIframeStyles = () => {
    const ratio = ASPECT_RATIOS.find(r => r.value === aspectRatio);
    
    if (ratio?.paddingBottom) {
      return {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      };
    }

    return {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height
    };
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Select value={embedType} onValueChange={(value) => updateAttribute('embedType', value)}>
        <SelectTrigger className="h-9 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="url">URL</SelectItem>
          <SelectItem value="code">HTML Code</SelectItem>
        </SelectContent>
      </Select>

      <Select value={aspectRatio} onValueChange={(value) => updateAttribute('aspectRatio', value)}>
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASPECT_RATIOS.map((ratio) => (
            <SelectItem key={ratio.value} value={ratio.value}>
              {ratio.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('sandbox', !sandbox)}
        className={cn("h-9 px-2", sandbox && "bg-green-100")}
        title={sandbox ? "Sandbox enabled" : "Sandbox disabled"}
      >
        {sandbox ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('allowFullscreen', !allowFullscreen)}
        className={cn("h-9 px-2", allowFullscreen && "bg-blue-100")}
        title="Toggle fullscreen"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Embed Source</Label>
        <div className="mt-2 space-y-3">
          <Select value={embedType} onValueChange={(value) => updateAttribute('embedType', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="code">HTML Code</SelectItem>
            </SelectContent>
          </Select>

          {embedType === 'url' ? (
            <div className="space-y-2">
              <Label htmlFor="url" className="text-xs text-gray-600">Embed URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  placeholder="https://example.com/embed"
                />
                <Button size="sm" onClick={handleUrlSubmit}>
                  <Link className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="embedCode" className="text-xs text-gray-600">HTML Embed Code</Label>
              <Textarea
                id="embedCode"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="<iframe src='...'></iframe>"
                rows={4}
              />
              <Button size="sm" onClick={handleCodeSubmit} className="w-full">
                <Code className="h-4 w-4 mr-2" />
                Add Embed Code
              </Button>
            </div>
          )}
        </div>
      </div>

      {(url || embedCode) && (
        <>
          <div>
            <Label className="text-sm font-medium">Dimensions</Label>
            <div className="mt-2 space-y-3">
              <div>
                <Label htmlFor="aspectRatio" className="text-xs text-gray-600">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={(value) => updateAttribute('aspectRatio', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {aspectRatio === 'none' && (
                <>
                  <div>
                    <Label htmlFor="width" className="text-xs text-gray-600">Width</Label>
                    <Input
                      id="width"
                      value={width}
                      onChange={(e) => updateAttribute('width', e.target.value)}
                      placeholder="100% or 600px"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="height" className="text-xs text-gray-600">Height (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={typeof height === 'number' ? height : 400}
                      onChange={(e) => updateAttribute('height', parseInt(e.target.value) || 400)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="alignment" className="text-xs text-gray-600">Alignment</Label>
                <Select value={alignment} onValueChange={(value) => updateAttribute('alignment', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="wide">Wide</SelectItem>
                    <SelectItem value="full">Full Width</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Metadata</Label>
            <div className="mt-2 space-y-3">
              <div>
                <Label htmlFor="title" className="text-xs text-gray-600">Title (for accessibility)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => updateAttribute('title', e.target.value)}
                  placeholder="Embedded content title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="caption" className="text-xs text-gray-600">Caption</Label>
                <Input
                  id="caption"
                  value={caption}
                  onChange={(e) => updateAttribute('caption', e.target.value)}
                  placeholder="Add a caption..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Settings
            </Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sandbox" className="text-xs text-gray-600">Enable Sandbox</Label>
                <Switch
                  id="sandbox"
                  checked={sandbox}
                  onCheckedChange={(checked) => updateAttribute('sandbox', checked)}
                />
              </div>

              {sandbox && (
                <div className="pl-4 space-y-2 border-l-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowScripts" className="text-xs text-gray-600">Allow Scripts</Label>
                    <Switch
                      id="allowScripts"
                      checked={sandboxOptions.allowScripts}
                      onCheckedChange={(checked) => updateSandboxOption('allowScripts', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowSameOrigin" className="text-xs text-gray-600">Allow Same Origin</Label>
                    <Switch
                      id="allowSameOrigin"
                      checked={sandboxOptions.allowSameOrigin}
                      onCheckedChange={(checked) => updateSandboxOption('allowSameOrigin', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowForms" className="text-xs text-gray-600">Allow Forms</Label>
                    <Switch
                      id="allowForms"
                      checked={sandboxOptions.allowForms}
                      onCheckedChange={(checked) => updateSandboxOption('allowForms', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowPopups" className="text-xs text-gray-600">Allow Popups</Label>
                    <Switch
                      id="allowPopups"
                      checked={sandboxOptions.allowPopups}
                      onCheckedChange={(checked) => updateSandboxOption('allowPopups', checked)}
                    />
                  </div>
                </div>
              )}

              {!sandbox && (
                <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <p className="text-xs text-yellow-800">
                    Disabling sandbox may expose your site to security risks
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="allowFullscreen" className="text-xs text-gray-600">Allow Fullscreen</Label>
                <Switch
                  id="allowFullscreen"
                  checked={allowFullscreen}
                  onCheckedChange={(checked) => updateAttribute('allowFullscreen', checked)}
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Advanced</Label>
            <div className="mt-2 space-y-3">
              <div>
                <Label htmlFor="loading" className="text-xs text-gray-600">Loading</Label>
                <Select value={loading} onValueChange={(value) => updateAttribute('loading', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eager">Eager</SelectItem>
                    <SelectItem value="lazy">Lazy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="referrerPolicy" className="text-xs text-gray-600">Referrer Policy</Label>
                <Select value={referrerPolicy} onValueChange={(value) => updateAttribute('referrerPolicy', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERRER_POLICIES.map((policy) => (
                      <SelectItem key={policy.value} value={policy.value}>
                        {policy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Embed content
  const EmbedContent = () => {
    if (!url && !embedCode) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Globe className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Embed External Content</h3>
          <p className="text-sm text-gray-500 mb-4 text-center">
            Add a URL or HTML code to embed external content
          </p>
          <div className="flex flex-col gap-3 w-full max-w-md">
            <div className="flex items-center gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="https://example.com/embed"
                className="flex-1"
              />
              <Button onClick={handleUrlSubmit} disabled={!urlInput}>
                Add URL
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => updateAttribute('embedType', 'code')}
              className="w-full"
            >
              <Code className="h-4 w-4 mr-2" />
              Use HTML Code Instead
            </Button>
          </div>
        </div>
      );
    }

    const ratio = ASPECT_RATIOS.find(r => r.value === aspectRatio);

    return (
      <div style={getContainerStyles()}>
        <div 
          className="embed-container relative w-full"
          style={ratio?.paddingBottom ? { paddingBottom: ratio.paddingBottom } : undefined}
        >
          {embedType === 'code' && embedCode ? (
            <div 
              dangerouslySetInnerHTML={{ __html: embedCode }}
              className="embed-html-content"
            />
          ) : (
            <iframe
              src={url}
              title={title || 'Embedded content'}
              style={getIframeStyles()}
              sandbox={sandbox ? getSandboxAttribute() : undefined}
              allow={allowFullscreen ? 'fullscreen' : undefined}
              allowFullScreen={allowFullscreen}
              loading={loading}
              referrerPolicy={referrerPolicy as any}
              className="border-0 rounded-lg"
            />
          )}
        </div>
        {caption && (
          <p className="mt-2 text-sm text-gray-600 text-center">{caption}</p>
        )}
      </div>
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={embedConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <EmbedContent />
    </StandardBlockTemplate>
  );
};

export default StandardEmbedBlock;