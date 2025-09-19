/**
 * Standard Facebook Block
 * Facebook 포스트/비디오 임베드 블록
 */

import { useCallback, useState, useEffect } from 'react';
import { 
  Facebook,
  Link,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

interface FacebookBlockProps extends StandardBlockProps {
  attributes?: {
    url?: string;
    embedType?: 'post' | 'video' | 'page' | 'comment';
    width?: number;
    height?: number;
    showText?: boolean;
    showCaptions?: boolean;
    smallHeader?: boolean;
    hideCover?: boolean;
    showFacepile?: boolean;
    appId?: string;
    language?: string;
    theme?: 'light' | 'dark';
    lazy?: boolean;
    alignment?: 'left' | 'center' | 'right';
    caption?: string;
  };
}

const facebookConfig: StandardBlockConfig = {
  type: 'facebook',
  icon: Facebook,
  category: 'embed',
  title: 'Facebook',
  description: 'Embed a Facebook post, video, or page.',
  keywords: ['facebook', 'social', 'post', 'video', 'embed'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: false,
    customClassName: true
  }
};

const EMBED_TYPES = [
  { value: 'post', label: 'Post', description: 'Facebook post or photo' },
  { value: 'video', label: 'Video', description: 'Facebook video' },
  { value: 'page', label: 'Page', description: 'Facebook page plugin' },
  { value: 'comment', label: 'Comment', description: 'Facebook comment embed' }
];

const LANGUAGES = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'ko_KR', label: '한국어' },
  { value: 'ja_JP', label: '日本語' },
  { value: 'zh_CN', label: '简体中文' },
  { value: 'zh_TW', label: '繁體中文' },
  { value: 'es_ES', label: 'Español' },
  { value: 'fr_FR', label: 'Français' },
  { value: 'de_DE', label: 'Deutsch' }
];

const StandardFacebookBlock: React.FC<FacebookBlockProps> = (props) => {
  const { onChange, attributes = {} } = props;
  const {
    url = '',
    embedType = 'post',
    width = 500,
    height = 0,
    showText = true,
    showCaptions = true,
    smallHeader = false,
    hideCover = false,
    showFacepile = true,
    appId = '',
    language = 'en_US',
    theme = 'light',
    lazy = true,
    alignment = 'center',
    caption = ''
  } = attributes;

  const [urlInput, setUrlInput] = useState(url);
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(null, { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Load Facebook SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.FB && url) {
      const script = document.createElement('script');
      script.src = `https://connect.facebook.net/${language}/sdk.js#xfbml=1&version=v18.0${appId ? `&appId=${appId}` : ''}`;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        setSdkLoaded(true);
        if (window.FB) {
          window.FB.XFBML.parse();
        }
      };
      document.body.appendChild(script);
    } else if (window.FB && url) {
      window.FB.XFBML.parse();
    }
  }, [url, language, appId]);

  // Validate Facebook URL
  const validateFacebookUrl = (inputUrl: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?facebook\.com\/.*/,
      /^https?:\/\/fb\.watch\/.*/,
      /^https?:\/\/(www\.)?fb\.com\/.*/
    ];

    return patterns.some(pattern => pattern.test(inputUrl));
  };

  // Detect embed type from URL
  const detectEmbedType = (inputUrl: string): string => {
    if (inputUrl.includes('/videos/') || inputUrl.includes('fb.watch')) {
      return 'video';
    } else if (inputUrl.includes('/posts/') || inputUrl.includes('/photos/') || inputUrl.includes('/permalink/')) {
      return 'post';
    } else if (inputUrl.match(/facebook\.com\/[^\/]+\/?$/)) {
      return 'page';
    }
    return 'post';
  };

  // Handle URL input
  const handleUrlSubmit = () => {
    if (validateFacebookUrl(urlInput)) {
      const detectedType = detectEmbedType(urlInput);
      updateAttribute('url', urlInput);
      updateAttribute('embedType', detectedType);
      setIsValidUrl(true);
      toast.success(`Facebook ${detectedType} URL added`);
    } else {
      setIsValidUrl(false);
      toast.error('Invalid Facebook URL');
    }
  };

  // Get container styles
  const getContainerStyles = () => {
    const styles: any = {
      width: '100%',
      maxWidth: width ? `${width}px` : '100%'
    };

    if (alignment === 'center') {
      styles.margin = '0 auto';
    } else if (alignment === 'right') {
      styles.marginLeft = 'auto';
    }

    return styles;
  };

  // Get embed attributes
  const getEmbedAttributes = () => {
    const attrs: any = {
      'data-href': url,
      'data-width': width || 'auto',
      'data-show-text': showText,
      'data-lazy': lazy
    };

    if (embedType === 'video') {
      attrs['data-show-captions'] = showCaptions;
      attrs['data-autoplay'] = false;
    } else if (embedType === 'page') {
      attrs['data-small-header'] = smallHeader;
      attrs['data-hide-cover'] = hideCover;
      attrs['data-show-facepile'] = showFacepile;
      if (height) attrs['data-height'] = height;
    }

    return attrs;
  };

  // Get embed class name
  const getEmbedClassName = () => {
    const classMap = {
      post: 'fb-post',
      video: 'fb-video',
      page: 'fb-page',
      comment: 'fb-comment-embed'
    };
    return classMap[embedType] || 'fb-post';
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Select value={embedType} onValueChange={(value) => updateAttribute('embedType', value)}>
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EMBED_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={alignment} onValueChange={(value) => updateAttribute('alignment', value)}>
        <SelectTrigger className="h-9 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="center">Center</SelectItem>
          <SelectItem value="right">Right</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('theme', theme === 'light' ? 'dark' : 'light')}
        className="h-9 px-2"
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        <Palette className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Facebook URL</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://facebook.com/..."
              className={cn(!isValidUrl && "border-red-500")}
            />
            <Button
              size="sm"
              onClick={handleUrlSubmit}
              disabled={!urlInput}
            >
              <Link className="h-4 w-4" />
            </Button>
          </div>
          {!isValidUrl && (
            <p className="text-xs text-red-500">Please enter a valid Facebook URL</p>
          )}
        </div>
      </div>

      {url && (
        <>
          <div>
            <Label className="text-sm font-medium">Embed Type</Label>
            <Select value={embedType} onValueChange={(value) => updateAttribute('embedType', value)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMBED_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Display Settings</Label>
            <div className="mt-2 space-y-3">
              <div>
                <Label htmlFor="width" className="text-xs text-gray-600">Width (px)</Label>
                <Input
                  id="width"
                  type="number"
                  min="180"
                  max="750"
                  value={width}
                  onChange={(e) => updateAttribute('width', parseInt(e.target.value) || 500)}
                  className="mt-1"
                />
              </div>

              {embedType === 'page' && (
                <div>
                  <Label htmlFor="height" className="text-xs text-gray-600">Height (px, 0 = auto)</Label>
                  <Input
                    id="height"
                    type="number"
                    min="0"
                    value={height}
                    onChange={(e) => updateAttribute('height', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
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
                  </SelectContent>
                </Select>
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
            <Label className="text-sm font-medium">Content Options</Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="showText" className="text-xs text-gray-600">Show Text</Label>
                <Switch
                  id="showText"
                  checked={showText}
                  onCheckedChange={(checked) => updateAttribute('showText', checked)}
                />
              </div>

              {embedType === 'video' && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="showCaptions" className="text-xs text-gray-600">Show Captions</Label>
                  <Switch
                    id="showCaptions"
                    checked={showCaptions}
                    onCheckedChange={(checked) => updateAttribute('showCaptions', checked)}
                  />
                </div>
              )}

              {embedType === 'page' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="smallHeader" className="text-xs text-gray-600">Small Header</Label>
                    <Switch
                      id="smallHeader"
                      checked={smallHeader}
                      onCheckedChange={(checked) => updateAttribute('smallHeader', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="hideCover" className="text-xs text-gray-600">Hide Cover Photo</Label>
                    <Switch
                      id="hideCover"
                      checked={hideCover}
                      onCheckedChange={(checked) => updateAttribute('hideCover', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showFacepile" className="text-xs text-gray-600">Show Friend Faces</Label>
                    <Switch
                      id="showFacepile"
                      checked={showFacepile}
                      onCheckedChange={(checked) => updateAttribute('showFacepile', checked)}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="lazy" className="text-xs text-gray-600">Lazy Load</Label>
                <Switch
                  id="lazy"
                  checked={lazy}
                  onCheckedChange={(checked) => updateAttribute('lazy', checked)}
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Appearance</Label>
            <div className="mt-2 space-y-3">
              <div>
                <Label htmlFor="theme" className="text-xs text-gray-600">Theme</Label>
                <Select value={theme} onValueChange={(value) => updateAttribute('theme', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language" className="text-xs text-gray-600">Language</Label>
                <Select value={language} onValueChange={(value) => updateAttribute('language', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Advanced</Label>
            <div className="mt-2">
              <Label htmlFor="appId" className="text-xs text-gray-600">Facebook App ID (optional)</Label>
              <Input
                id="appId"
                value={appId}
                onChange={(e) => updateAttribute('appId', e.target.value)}
                placeholder="Your Facebook App ID"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for some embed features
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Facebook content
  const FacebookContent = () => {
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Facebook className="w-16 h-16 text-[#1877F2] mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Add Facebook Content</h3>
          <p className="text-sm text-gray-500 mb-4 text-center">
            Paste a Facebook URL to embed a post, video, or page
          </p>
          <div className="flex items-center gap-2 w-full max-w-md">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://facebook.com/..."
              className="flex-1"
            />
            <Button onClick={handleUrlSubmit} disabled={!urlInput}>
              Add Content
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div style={getContainerStyles()}>
        <div className={cn("facebook-embed-wrapper", theme === 'dark' && "bg-gray-900 p-4 rounded-lg")}>
          <div 
            className={getEmbedClassName()}
            {...getEmbedAttributes()}
          >
            {/* Facebook SDK will replace this with actual embed */}
            <blockquote cite={url} className="fb-xfbml-parse-ignore">
              <a href={url}>Loading Facebook {embedType}...</a>
            </blockquote>
          </div>
        </div>
        {caption && (
          <p className="mt-2 text-sm text-gray-600 text-center">{caption}</p>
        )}
      </div>
    );
  };

  // Add global Facebook SDK type
  useEffect(() => {
    if (!window.FB) {
      (window as any).FB = null;
    }
  }, []);

  return (
    <StandardBlockTemplate
      {...props}
      config={facebookConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <FacebookContent />
    </StandardBlockTemplate>
  );
};

// Extend window type for Facebook SDK
declare global {
  interface Window {
    FB: any;
  }
}

export default StandardFacebookBlock;