/**
 * Standard YouTube Block
 * YouTube 비디오 임베드 블록
 */

import { useCallback, useState, useEffect } from 'react';
import { 
  Youtube,
  Play,
  Settings,
  Volume2,
  VolumeX,
  Clock,
  Maximize,
  Link
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

interface YouTubeBlockProps extends StandardBlockProps {
  attributes?: {
    url?: string;
    videoId?: string;
    title?: string;
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    controls?: boolean;
    startTime?: number;
    endTime?: number;
    aspectRatio?: '16:9' | '4:3' | '1:1' | '9:16';
    maxWidth?: number;
    alignment?: 'left' | 'center' | 'right' | 'wide' | 'full';
    caption?: string;
    showInfo?: boolean;
    showRelated?: boolean;
    modestBranding?: boolean;
    privacyMode?: boolean;
  };
}

const youtubeConfig: StandardBlockConfig = {
  type: 'youtube',
  icon: Youtube,
  category: 'embed',
  title: 'YouTube',
  description: 'Embed a YouTube video.',
  keywords: ['youtube', 'video', 'embed', 'media'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: false,
    customClassName: true
  }
};

const ASPECT_RATIOS = [
  { value: '16:9', label: 'Widescreen (16:9)', paddingBottom: '56.25%' },
  { value: '4:3', label: 'Standard (4:3)', paddingBottom: '75%' },
  { value: '1:1', label: 'Square (1:1)', paddingBottom: '100%' },
  { value: '9:16', label: 'Vertical (9:16)', paddingBottom: '177.78%' }
];

const ALIGNMENTS = [
  { value: 'left', label: 'Left', maxWidth: '50%' },
  { value: 'center', label: 'Center', maxWidth: '100%' },
  { value: 'right', label: 'Right', maxWidth: '50%' },
  { value: 'wide', label: 'Wide', maxWidth: '100%' },
  { value: 'full', label: 'Full Width', maxWidth: '100vw' }
];

const StandardYouTubeBlock: React.FC<YouTubeBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected } = props;
  const {
    url = '',
    videoId = '',
    title = '',
    autoplay = false,
    muted = false,
    loop = false,
    controls = true,
    startTime = 0,
    endTime = 0,
    aspectRatio = '16:9',
    maxWidth = 0,
    alignment = 'center',
    caption = '',
    showInfo = true,
    showRelated = false,
    modestBranding = true,
    privacyMode = true
  } = attributes;

  const [urlInput, setUrlInput] = useState(url);
  const [isValidUrl, setIsValidUrl] = useState(true);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(null, { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Extract YouTube video ID from URL
  const extractVideoId = (inputUrl: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = inputUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  // Handle URL input
  const handleUrlSubmit = () => {
    const extractedId = extractVideoId(urlInput);
    if (extractedId) {
      updateAttribute('videoId', extractedId);
      updateAttribute('url', urlInput);
      setIsValidUrl(true);
      
      // Fetch video title if possible
      fetchVideoTitle(extractedId);
    } else {
      setIsValidUrl(false);
      toast.error('Invalid YouTube URL');
    }
  };

  // Fetch video title (would require API key in production)
  const fetchVideoTitle = async (id: string) => {
    // In production, this would call YouTube API
    // For now, we'll just set a placeholder
    updateAttribute('title', `YouTube Video ${id}`);
  };

  // Generate embed URL
  const getEmbedUrl = () => {
    if (!videoId) return '';

    const params = new URLSearchParams();
    
    if (autoplay) params.append('autoplay', '1');
    if (muted) params.append('mute', '1');
    if (loop) params.append('loop', '1');
    if (!controls) params.append('controls', '0');
    if (startTime > 0) params.append('start', startTime.toString());
    if (endTime > 0) params.append('end', endTime.toString());
    if (!showInfo) params.append('showinfo', '0');
    if (!showRelated) params.append('rel', '0');
    if (modestBranding) params.append('modestbranding', '1');
    if (loop && videoId) params.append('playlist', videoId);

    const domain = privacyMode ? 'youtube-nocookie.com' : 'youtube.com';
    const queryString = params.toString();
    
    return `https://www.${domain}/embed/${videoId}${queryString ? `?${queryString}` : ''}`;
  };

  // Get container styles
  const getContainerStyles = () => {
    const alignmentConfig = ALIGNMENTS.find(a => a.value === alignment);
    const styles: any = {
      maxWidth: maxWidth ? `${maxWidth}px` : alignmentConfig?.maxWidth || '100%',
      width: '100%'
    };

    if (alignment === 'center') {
      styles.margin = '0 auto';
    } else if (alignment === 'right') {
      styles.marginLeft = 'auto';
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

  // Get aspect ratio padding
  const getAspectRatioPadding = () => {
    const ratio = ASPECT_RATIOS.find(r => r.value === aspectRatio);
    return ratio?.paddingBottom || '56.25%';
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
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
          {ALIGNMENTS.map((align) => (
            <SelectItem key={align.value} value={align.value}>
              {align.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('autoplay', !autoplay)}
        className={cn("h-9 px-2", autoplay && "bg-blue-100")}
        title="Autoplay"
      >
        <Play className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('muted', !muted)}
        className={cn("h-9 px-2", muted && "bg-blue-100")}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">YouTube URL</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://youtube.com/watch?v=..."
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
            <p className="text-xs text-red-500">Please enter a valid YouTube URL</p>
          )}
          {videoId && (
            <p className="text-xs text-gray-500">Video ID: {videoId}</p>
          )}
        </div>
      </div>

      {videoId && (
        <>
          <div>
            <Label className="text-sm font-medium">Playback Settings</Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoplay" className="text-xs text-gray-600">Autoplay</Label>
                <Switch
                  id="autoplay"
                  checked={autoplay}
                  onCheckedChange={(checked) => updateAttribute('autoplay', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="muted" className="text-xs text-gray-600">Muted</Label>
                <Switch
                  id="muted"
                  checked={muted}
                  onCheckedChange={(checked) => updateAttribute('muted', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="loop" className="text-xs text-gray-600">Loop</Label>
                <Switch
                  id="loop"
                  checked={loop}
                  onCheckedChange={(checked) => updateAttribute('loop', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="controls" className="text-xs text-gray-600">Show Controls</Label>
                <Switch
                  id="controls"
                  checked={controls}
                  onCheckedChange={(checked) => updateAttribute('controls', checked)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="startTime" className="text-xs text-gray-600">Start Time (sec)</Label>
                  <Input
                    id="startTime"
                    type="number"
                    min="0"
                    value={startTime}
                    onChange={(e) => updateAttribute('startTime', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endTime" className="text-xs text-gray-600">End Time (sec)</Label>
                  <Input
                    id="endTime"
                    type="number"
                    min="0"
                    value={endTime}
                    onChange={(e) => updateAttribute('endTime', parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Display Settings</Label>
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

              <div>
                <Label htmlFor="alignment" className="text-xs text-gray-600">Alignment</Label>
                <Select value={alignment} onValueChange={(value) => updateAttribute('alignment', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIGNMENTS.map((align) => (
                      <SelectItem key={align.value} value={align.value}>
                        {align.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="maxWidth" className="text-xs text-gray-600">Max Width (px, 0 = auto)</Label>
                <Input
                  id="maxWidth"
                  type="number"
                  min="0"
                  value={maxWidth}
                  onChange={(e) => updateAttribute('maxWidth', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="caption" className="text-xs text-gray-600">Caption</Label>
                <Input
                  id="caption"
                  value={caption}
                  onChange={(e) => updateAttribute('caption', e.target.value)}
                  placeholder="Video caption..."
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">YouTube Settings</Label>
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="showInfo" className="text-xs text-gray-600">Show Video Info</Label>
                <Switch
                  id="showInfo"
                  checked={showInfo}
                  onCheckedChange={(checked) => updateAttribute('showInfo', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="showRelated" className="text-xs text-gray-600">Show Related Videos</Label>
                <Switch
                  id="showRelated"
                  checked={showRelated}
                  onCheckedChange={(checked) => updateAttribute('showRelated', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="modestBranding" className="text-xs text-gray-600">Modest Branding</Label>
                <Switch
                  id="modestBranding"
                  checked={modestBranding}
                  onCheckedChange={(checked) => updateAttribute('modestBranding', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="privacyMode" className="text-xs text-gray-600">Privacy Enhanced Mode</Label>
                <Switch
                  id="privacyMode"
                  checked={privacyMode}
                  onCheckedChange={(checked) => updateAttribute('privacyMode', checked)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // YouTube content
  const YouTubeContent = () => {
    if (!videoId) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Youtube className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Add a YouTube Video</h3>
          <p className="text-sm text-gray-500 mb-4 text-center">
            Paste a YouTube URL in the sidebar to embed a video
          </p>
          <div className="flex items-center gap-2 w-full max-w-md">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1"
            />
            <Button onClick={handleUrlSubmit} disabled={!urlInput}>
              Add Video
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div style={getContainerStyles()}>
        <div 
          className="youtube-embed-container relative w-full overflow-hidden bg-black rounded-lg"
          style={{ paddingBottom: getAspectRatioPadding() }}
        >
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={getEmbedUrl()}
            title={title || 'YouTube video player'}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
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
      config={youtubeConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <YouTubeContent />
    </StandardBlockTemplate>
  );
};

export default StandardYouTubeBlock;