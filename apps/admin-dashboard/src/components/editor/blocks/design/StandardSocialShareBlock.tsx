/**
 * Standard Social Share Block
 * 소셜 미디어 공유 버튼 블록
 */

import { useCallback, useState } from 'react';
import { 
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Link2,
  Check,
  Mail,
  Linkedin,
  Send,
  Layout
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

interface SocialShareBlockProps extends StandardBlockProps {
  attributes?: {
    platforms?: {
      facebook?: boolean;
      twitter?: boolean;
      kakao?: boolean;
      linkedin?: boolean;
      telegram?: boolean;
      email?: boolean;
      copyLink?: boolean;
    };
    shareType?: 'page' | 'custom';
    customUrl?: string;
    customTitle?: string;
    customDescription?: string;
    customHashtags?: string;
    buttonStyle?: 'icon' | 'text' | 'both';
    buttonSize?: 'small' | 'medium' | 'large';
    buttonShape?: 'square' | 'rounded' | 'circle';
    buttonColor?: 'brand' | 'mono' | 'custom';
    customButtonColor?: string;
    customTextColor?: string;
    layout?: 'horizontal' | 'vertical' | 'grid';
    alignment?: 'left' | 'center' | 'right';
    gap?: number;
    showShareCount?: boolean;
    showLabels?: boolean;
    labelPosition?: 'below' | 'right';
  };
}

const socialShareConfig: StandardBlockConfig = {
  type: 'social-share',
  icon: Share2,
  category: 'design',
  title: 'Social Share',
  description: 'Add social media share buttons.',
  keywords: ['share', 'social', 'facebook', 'twitter', 'kakao', 'linkedin'],
  supports: {
    align: true,
    color: true,
    spacing: true,
    border: false,
    customClassName: true
  }
};

const BUTTON_STYLES = [
  { value: 'icon', label: 'Icon Only' },
  { value: 'text', label: 'Text Only' },
  { value: 'both', label: 'Icon + Text' }
];

const BUTTON_SIZES = [
  { value: 'small', label: 'Small', size: 32 },
  { value: 'medium', label: 'Medium', size: 40 },
  { value: 'large', label: 'Large', size: 48 }
];

const BUTTON_SHAPES = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' }
];

const PLATFORM_INFO = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    shareUrl: (url: string) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  },
  twitter: {
    name: 'Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    shareUrl: (url: string, hashtags?: string) => 
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}${hashtags ? `&hashtags=${encodeURIComponent(hashtags)}` : ''}`
  },
  kakao: {
    name: 'KakaoTalk',
    icon: MessageCircle,
    color: '#FEE500',
    shareUrl: (url: string) => {
      // KakaoTalk requires SDK initialization
      // This is a placeholder - actual implementation would use Kakao SDK
      return `https://story.kakao.com/share?url=${encodeURIComponent(url)}`;
    }
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    shareUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  },
  telegram: {
    name: 'Telegram',
    icon: Send,
    color: '#26A5E4',
    shareUrl: (url: string, title: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  email: {
    name: 'Email',
    icon: Mail,
    color: '#6B7280',
    shareUrl: (url: string, title: string, description?: string) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description || title + '\n\n' + url)}`
  }
};

const StandardSocialShareBlock: React.FC<SocialShareBlockProps> = (props) => {
  const { onChange, attributes = {} } = props;
  const {
    platforms = {
      facebook: true,
      twitter: true,
      kakao: true,
      linkedin: false,
      telegram: false,
      email: false,
      copyLink: true
    },
    shareType = 'page',
    customUrl = '',
    customTitle = '',
    customDescription = '',
    customHashtags = '',
    buttonStyle = 'icon',
    buttonSize = 'medium',
    buttonShape = 'rounded',
    buttonColor = 'brand',
    customButtonColor = '#000000',
    customTextColor = '#ffffff',
    layout = 'horizontal',
    alignment = 'center',
    gap = 10,
    showLabels = false,
    labelPosition = 'below'
  } = attributes;

  const [copiedLink, setCopiedLink] = useState(false);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(null, { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Toggle platform
  const togglePlatform = useCallback((platform: string) => {
    updateAttribute('platforms', { ...platforms, [platform]: !platforms[platform as keyof typeof platforms] });
  }, [platforms, updateAttribute]);

  // Get share URL for current context
  const getShareUrl = () => {
    if (shareType === 'custom' && customUrl) {
      return customUrl;
    }
    // In production, this would use window.location.href
    return typeof window !== 'undefined' ? window.location.href : 'https://example.com';
  };

  // Get share title
  const getShareTitle = () => {
    if (shareType === 'custom' && customTitle) {
      return customTitle;
    }
    // In production, this would use document.title
    return typeof document !== 'undefined' ? document.title : 'Share this page';
  };

  // Handle share click
  const handleShare = (platform: string) => {
    const url = getShareUrl();
    const title = getShareTitle();
    
    if (platform === 'copyLink') {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopiedLink(false), 2000);
      });
      return;
    }

    const platformInfo = PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO];
    if (platformInfo) {
      const shareUrl = platformInfo.shareUrl(url, title, customHashtags);
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  // Get button size
  const getButtonSize = () => {
    const sizeMap = {
      small: 'h-8 w-8 text-sm',
      medium: 'h-10 w-10 text-base',
      large: 'h-12 w-12 text-lg'
    };
    return sizeMap[buttonSize];
  };

  // Get button radius
  const getButtonRadius = () => {
    const radiusMap = {
      square: 'rounded-none',
      rounded: 'rounded-lg',
      circle: 'rounded-full'
    };
    return radiusMap[buttonShape];
  };

  // Get button color
  const getButtonColor = (platform: string) => {
    if (buttonColor === 'mono') {
      return { backgroundColor: '#374151', color: '#ffffff' };
    }
    if (buttonColor === 'custom') {
      return { backgroundColor: customButtonColor, color: customTextColor };
    }
    const platformInfo = PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO];
    return { 
      backgroundColor: platformInfo?.color || '#374151', 
      color: platform === 'kakao' ? '#000000' : '#ffffff' 
    };
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Select value={buttonStyle} onValueChange={(value) => updateAttribute('buttonStyle', value)}>
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BUTTON_STYLES.map((style) => (
            <SelectItem key={style.value} value={style.value}>
              {style.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={buttonSize} onValueChange={(value) => updateAttribute('buttonSize', value)}>
        <SelectTrigger className="h-9 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BUTTON_SIZES.map((size) => (
            <SelectItem key={size.value} value={size.value}>
              {size.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('layout', layout === 'horizontal' ? 'vertical' : 'horizontal')}
        className={cn("h-9 px-2", layout === 'horizontal' && "bg-blue-100")}
        title="Toggle layout"
      >
        <Layout className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Platforms</Label>
        <div className="mt-2 space-y-2">
          {Object.entries(PLATFORM_INFO).map(([key, info]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <info.icon className="w-4 h-4" style={{ color: info.color }} />
                <Label htmlFor={key} className="text-xs text-gray-600">{info.name}</Label>
              </div>
              <Switch
                id={key}
                checked={platforms[key as keyof typeof platforms] || false}
                onCheckedChange={() => togglePlatform(key)}
              />
            </div>
          ))}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-gray-600" />
              <Label htmlFor="copyLink" className="text-xs text-gray-600">Copy Link</Label>
            </div>
            <Switch
              id="copyLink"
              checked={platforms.copyLink || false}
              onCheckedChange={() => togglePlatform('copyLink')}
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Share Content</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="shareType" className="text-xs text-gray-600">Share Type</Label>
            <Select value={shareType} onValueChange={(value) => updateAttribute('shareType', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="page">Current Page</SelectItem>
                <SelectItem value="custom">Custom Content</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shareType === 'custom' && (
            <>
              <div>
                <Label htmlFor="customUrl" className="text-xs text-gray-600">Custom URL</Label>
                <Input
                  id="customUrl"
                  type="url"
                  value={customUrl}
                  onChange={(e) => updateAttribute('customUrl', e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customTitle" className="text-xs text-gray-600">Title</Label>
                <Input
                  id="customTitle"
                  value={customTitle}
                  onChange={(e) => updateAttribute('customTitle', e.target.value)}
                  placeholder="Share title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customDescription" className="text-xs text-gray-600">Description</Label>
                <Textarea
                  id="customDescription"
                  value={customDescription}
                  onChange={(e) => updateAttribute('customDescription', e.target.value)}
                  placeholder="Share description"
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="customHashtags" className="text-xs text-gray-600">Hashtags (comma separated)</Label>
                <Input
                  id="customHashtags"
                  value={customHashtags}
                  onChange={(e) => updateAttribute('customHashtags', e.target.value)}
                  placeholder="tag1,tag2,tag3"
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Button Style</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="buttonStyle" className="text-xs text-gray-600">Display</Label>
            <Select value={buttonStyle} onValueChange={(value) => updateAttribute('buttonStyle', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="buttonSize" className="text-xs text-gray-600">Size</Label>
            <Select value={buttonSize} onValueChange={(value) => updateAttribute('buttonSize', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="buttonShape" className="text-xs text-gray-600">Shape</Label>
            <Select value={buttonShape} onValueChange={(value) => updateAttribute('buttonShape', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUTTON_SHAPES.map((shape) => (
                  <SelectItem key={shape.value} value={shape.value}>
                    {shape.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="buttonColor" className="text-xs text-gray-600">Color Scheme</Label>
            <Select value={buttonColor} onValueChange={(value) => updateAttribute('buttonColor', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brand">Brand Colors</SelectItem>
                <SelectItem value="mono">Monochrome</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {buttonColor === 'custom' && (
            <>
              <div>
                <Label htmlFor="customButtonColor" className="text-xs text-gray-600">Button Color</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="customButtonColor"
                    type="color"
                    value={customButtonColor}
                    onChange={(e) => updateAttribute('customButtonColor', e.target.value)}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    value={customButtonColor}
                    onChange={(e) => updateAttribute('customButtonColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customTextColor" className="text-xs text-gray-600">Text Color</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="customTextColor"
                    type="color"
                    value={customTextColor}
                    onChange={(e) => updateAttribute('customTextColor', e.target.value)}
                    className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <Input
                    value={customTextColor}
                    onChange={(e) => updateAttribute('customTextColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Layout</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="layout" className="text-xs text-gray-600">Direction</Label>
            <Select value={layout} onValueChange={(value) => updateAttribute('layout', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
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
            <Label htmlFor="gap" className="text-xs text-gray-600">Gap (px)</Label>
            <Input
              id="gap"
              type="number"
              min="0"
              max="50"
              value={gap}
              onChange={(e) => updateAttribute('gap', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Labels</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="showLabels" className="text-xs text-gray-600">Show Labels</Label>
            <Switch
              id="showLabels"
              checked={showLabels}
              onCheckedChange={(checked) => updateAttribute('showLabels', checked)}
            />
          </div>

          {showLabels && (
            <div>
              <Label htmlFor="labelPosition" className="text-xs text-gray-600">Label Position</Label>
              <Select value={labelPosition} onValueChange={(value) => updateAttribute('labelPosition', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below">Below</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Social share content
  const SocialShareContent = () => {
    const containerStyles = {
      display: layout === 'grid' ? 'grid' : 'flex',
      flexDirection: layout === 'vertical' ? 'column' as const : 'row' as const,
      gridTemplateColumns: layout === 'grid' ? 'repeat(auto-fit, minmax(60px, 1fr))' : undefined,
      gap: `${gap}px`,
      justifyContent: alignment,
      alignItems: showLabels && labelPosition === 'right' ? 'flex-start' : 'center',
      flexWrap: 'wrap' as const
    };

    return (
      <div className="social-share-block" style={containerStyles}>
        {Object.entries(platforms).map(([platform, enabled]) => {
          if (!enabled) return null;

          if (platform === 'copyLink') {
            return (
              <button
                key={platform}
                onClick={() => handleShare(platform)}
                className={cn(
                  "flex items-center justify-center transition-all hover:opacity-80",
                  getButtonSize(),
                  getButtonRadius(),
                  showLabels && labelPosition === 'below' && "flex-col gap-1",
                  showLabels && labelPosition === 'right' && "gap-2"
                )}
                style={getButtonColor('copyLink')}
                title="Copy link"
              >
                {buttonStyle !== 'text' && (
                  copiedLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />
                )}
                {buttonStyle !== 'icon' && <span className="text-xs">Copy Link</span>}
                {showLabels && buttonStyle === 'icon' && (
                  <span className="text-xs">Copy Link</span>
                )}
              </button>
            );
          }

          const platformInfo = PLATFORM_INFO[platform as keyof typeof PLATFORM_INFO];
          if (!platformInfo) return null;

          const Icon = platformInfo.icon;

          return (
            <button
              key={platform}
              onClick={() => handleShare(platform)}
              className={cn(
                "flex items-center justify-center transition-all hover:opacity-80",
                getButtonSize(),
                getButtonRadius(),
                showLabels && labelPosition === 'below' && "flex-col gap-1",
                showLabels && labelPosition === 'right' && "gap-2"
              )}
              style={getButtonColor(platform)}
              title={`Share on ${platformInfo.name}`}
            >
              {buttonStyle !== 'text' && <Icon className="w-4 h-4" />}
              {buttonStyle !== 'icon' && <span className="text-xs">{platformInfo.name}</span>}
              {showLabels && buttonStyle === 'icon' && (
                <span className="text-xs">{platformInfo.name}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={socialShareConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <SocialShareContent />
    </StandardBlockTemplate>
  );
};

export default StandardSocialShareBlock;