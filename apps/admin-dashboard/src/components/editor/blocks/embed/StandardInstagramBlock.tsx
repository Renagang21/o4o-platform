/**
 * Standard Instagram Block
 * Instagram 포스트/릴스 임베드 블록
 */

import { useCallback, useState, useEffect } from 'react';
import { 
  Instagram,
  Link,
  Heart,
  MessageCircle,
  Bookmark,
  Camera,
  Film,
  Grid3x3
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

interface InstagramBlockProps extends StandardBlockProps {
  attributes?: {
    url?: string;
    postId?: string;
    embedType?: 'post' | 'reel' | 'igtv';
    maxWidth?: number;
    hideCaptions?: boolean;
    hideComments?: boolean;
    hideStats?: boolean;
    alignment?: 'left' | 'center' | 'right';
    aspectRatio?: 'square' | 'portrait' | 'original';
    caption?: string;
    lazyLoad?: boolean;
  };
}

const instagramConfig: StandardBlockConfig = {
  type: 'instagram',
  icon: Instagram,
  category: 'embed',
  title: 'Instagram',
  description: 'Embed an Instagram post, reel, or IGTV.',
  keywords: ['instagram', 'social', 'post', 'reel', 'photo', 'embed'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: false,
    customClassName: true
  }
};

const EMBED_TYPES = [
  { value: 'post', label: 'Post', icon: Camera },
  { value: 'reel', label: 'Reel', icon: Film },
  { value: 'igtv', label: 'IGTV', icon: Grid3x3 }
];

const ASPECT_RATIOS = [
  { value: 'square', label: 'Square (1:1)', ratio: 1 },
  { value: 'portrait', label: 'Portrait (4:5)', ratio: 1.25 },
  { value: 'original', label: 'Original', ratio: null }
];

const StandardInstagramBlock: React.FC<InstagramBlockProps> = (props) => {
  const { onChange, attributes = {} } = props;
  const {
    url = '',
    postId = '',
    embedType = 'post',
    maxWidth = 540,
    hideCaptions = false,
    hideComments = false,
    hideStats = false,
    alignment = 'center',
    aspectRatio = 'original',
    caption = '',
    lazyLoad = true
  } = attributes;

  const [urlInput, setUrlInput] = useState(url);
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [embedLoaded, setEmbedLoaded] = useState(false);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(null, { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Load Instagram embed script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.instgrm && url) {
      const script = document.createElement('script');
      script.src = '//www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => {
        setEmbedLoaded(true);
        if (window.instgrm) {
          window.instgrm.Embeds.process();
        }
      };
      document.body.appendChild(script);
    } else if (window.instgrm && url) {
      window.instgrm.Embeds.process();
    }
  }, [url]);

  // Extract Instagram post ID from URL
  const extractPostId = (inputUrl: string): string | null => {
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
      /instagr\.am\/p\/([A-Za-z0-9_-]+)/
    ];

    for (const pattern of patterns) {
      const match = inputUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // Detect embed type from URL
  const detectEmbedType = (inputUrl: string): string => {
    if (inputUrl.includes('/reel/')) {
      return 'reel';
    } else if (inputUrl.includes('/tv/')) {
      return 'igtv';
    }
    return 'post';
  };

  // Validate Instagram URL
  const validateInstagramUrl = (inputUrl: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/,
      /^https?:\/\/instagr\.am\/p\/[A-Za-z0-9_-]+/
    ];

    return patterns.some(pattern => pattern.test(inputUrl));
  };

  // Handle URL input
  const handleUrlSubmit = () => {
    if (validateInstagramUrl(urlInput)) {
      const extractedId = extractPostId(urlInput);
      const detectedType = detectEmbedType(urlInput);
      
      if (extractedId) {
        updateAttribute('url', urlInput);
        updateAttribute('postId', extractedId);
        updateAttribute('embedType', detectedType);
        setIsValidUrl(true);
        toast.success(`Instagram ${detectedType} added`);
        
        // Trigger re-process of embeds
        setTimeout(() => {
          if (window.instgrm) {
            window.instgrm.Embeds.process();
          }
        }, 100);
      }
    } else {
      setIsValidUrl(false);
      toast.error('Invalid Instagram URL');
    }
  };

  // Get container styles
  const getContainerStyles = () => {
    const styles: any = {
      width: '100%',
      maxWidth: maxWidth ? `${maxWidth}px` : '100%',
      position: 'relative'
    };

    if (alignment === 'center') {
      styles.margin = '0 auto';
    } else if (alignment === 'right') {
      styles.marginLeft = 'auto';
    }

    return styles;
  };

  // Get embed URL
  const getEmbedUrl = () => {
    if (!postId) return '';
    
    const typeMap = {
      post: 'p',
      reel: 'reel',
      igtv: 'tv'
    };
    
    const type = typeMap[embedType] || 'p';
    return `https://www.instagram.com/${type}/${postId}/embed${hideCaptions ? '/captioned' : ''}`;
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Select value={embedType} onValueChange={(value) => updateAttribute('embedType', value)}>
        <SelectTrigger className="h-9 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EMBED_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{type.label}</span>
                </div>
              </SelectItem>
            );
          })}
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
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Instagram URL</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://instagram.com/p/..."
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
            <p className="text-xs text-red-500">Please enter a valid Instagram URL</p>
          )}
          {postId && (
            <p className="text-xs text-gray-500">Post ID: {postId}</p>
          )}
        </div>
      </div>

      {url && (
        <>
          <div>
            <Label className="text-sm font-medium">Content Type</Label>
            <div className="mt-2">
              <Select value={embedType} onValueChange={(value) => updateAttribute('embedType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMBED_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Display Settings</Label>
            <div className="mt-2 space-y-3">
              <div>
                <Label htmlFor="maxWidth" className="text-xs text-gray-600">Max Width (px)</Label>
                <Input
                  id="maxWidth"
                  type="number"
                  min="320"
                  max="658"
                  value={maxWidth}
                  onChange={(e) => updateAttribute('maxWidth', parseInt(e.target.value) || 540)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Instagram embeds: 320px min, 658px max
                </p>
              </div>

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
                <Label htmlFor="hideCaptions" className="text-xs text-gray-600">Hide Captions</Label>
                <Switch
                  id="hideCaptions"
                  checked={hideCaptions}
                  onCheckedChange={(checked) => updateAttribute('hideCaptions', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="hideComments" className="text-xs text-gray-600">Hide Comments</Label>
                <Switch
                  id="hideComments"
                  checked={hideComments}
                  onCheckedChange={(checked) => updateAttribute('hideComments', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="hideStats" className="text-xs text-gray-600">Hide Stats</Label>
                <Switch
                  id="hideStats"
                  checked={hideStats}
                  onCheckedChange={(checked) => updateAttribute('hideStats', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="lazyLoad" className="text-xs text-gray-600">Lazy Load</Label>
                <Switch
                  id="lazyLoad"
                  checked={lazyLoad}
                  onCheckedChange={(checked) => updateAttribute('lazyLoad', checked)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Instagram content
  const InstagramContent = () => {
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
            <Instagram className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Add Instagram Content</h3>
          <p className="text-sm text-gray-500 mb-4 text-center">
            Paste an Instagram URL to embed a post, reel, or IGTV
          </p>
          <div className="flex items-center gap-2 w-full max-w-md">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://instagram.com/p/..."
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
        <div className="instagram-embed-wrapper">
          <blockquote 
            className="instagram-media"
            data-instgrm-captioned={!hideCaptions}
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            style={{
              background: '#FFF',
              border: '0',
              borderRadius: '3px',
              boxShadow: '0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)',
              margin: '1px',
              padding: '0',
              width: '100%'
            }}
          >
            <div style={{ padding: '16px' }}>
              <a 
                href={url}
                style={{
                  background: '#FFFFFF',
                  lineHeight: '0',
                  padding: '0',
                  textAlign: 'center',
                  textDecoration: 'none',
                  width: '100%'
                }}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-2 animate-pulse" />
                    <div className="h-2 bg-gray-200 rounded w-32 animate-pulse" />
                  </div>
                </div>
                <div className="aspect-square bg-gray-100 rounded-lg animate-pulse mb-4" />
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded animate-pulse" />
                  <div className="h-2 bg-gray-200 rounded w-3/4 animate-pulse" />
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  View this {embedType} on Instagram
                </p>
              </a>
            </div>
          </blockquote>
        </div>
        {caption && (
          <p className="mt-2 text-sm text-gray-600 text-center">{caption}</p>
        )}
      </div>
    );
  };

  // Add global Instagram SDK type
  useEffect(() => {
    if (!window.instgrm) {
      (window as any).instgrm = null;
    }
  }, []);

  return (
    <StandardBlockTemplate
      {...props}
      config={instagramConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <InstagramContent />
    </StandardBlockTemplate>
  );
};

// Extend window type for Instagram SDK
declare global {
  interface Window {
    instgrm: any;
  }
}

export default StandardInstagramBlock;