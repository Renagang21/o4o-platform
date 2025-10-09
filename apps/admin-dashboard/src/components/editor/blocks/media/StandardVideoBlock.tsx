/**
 * Standard Video Block
 * 표준 템플릿 기반의 비디오 블록
 */

import { useState, useRef, useCallback } from 'react';
import {
  Video,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Link2,
  Settings,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { RichText } from '../../gutenberg/RichText';
import { cn } from '@/lib/utils';
import FileSelector, { FileItem } from '../shared/FileSelector';

interface VideoBlockProps extends StandardBlockProps {
  attributes?: {
    src?: string;
    poster?: string;
    caption?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    width?: number;
    height?: number;
    aspectRatio?: '16:9' | '4:3' | '1:1' | 'original';
    objectFit?: 'cover' | 'contain' | 'fill';
    borderRadius?: number;
    align?: 'left' | 'center' | 'right';
    volume?: number;
    playbackRate?: number;
  };
}

const videoConfig: StandardBlockConfig = {
  type: 'video',
  icon: Video,
  category: 'media',
  title: 'Video',
  description: 'Embed a video file or URL.',
  keywords: ['video', 'movie', 'media', 'mp4', 'youtube'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const ASPECT_RATIOS = [
  { value: '16:9', label: 'Widescreen (16:9)', ratio: 16/9 },
  { value: '4:3', label: 'Standard (4:3)', ratio: 4/3 },
  { value: '1:1', label: 'Square (1:1)', ratio: 1 },
  { value: 'original', label: 'Original', ratio: null }
];

const StandardVideoBlock: React.FC<VideoBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected } = props;
  const {
    src = '',
    poster = '',
    caption = '',
    autoplay = false,
    loop = false,
    muted = false,
    controls = true,
    width,
    height,
    aspectRatio = '16:9',
    objectFit = 'cover',
    borderRadius = 0,
    align = 'center',
    volume = 1,
    playbackRate = 1
  } = attributes;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [tempUrl, setTempUrl] = useState('');
  const [showMediaSelector, setShowMediaSelector] = useState(false);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(src, { ...attributes, [key]: value });
  }, [onChange, src, attributes]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setIsUploading(true);
      const objectUrl = URL.createObjectURL(file);
      
      // Create video element to get natural dimensions
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        onChange(objectUrl, {
          ...attributes,
          src: objectUrl,
          width: video.videoWidth,
          height: video.videoHeight
        });
        setIsUploading(false);
      };
      video.src = objectUrl;
    }
  };

  // Apply URL
  const applyUrl = () => {
    if (tempUrl) {
      onChange(tempUrl, { ...attributes, src: tempUrl });
      setTempUrl('');
      setShowUrlInput(false);
    }
  };

  // Handle media library selection
  const handleMediaSelect = useCallback((file: FileItem | FileItem[]) => {
    const selectedFile = Array.isArray(file) ? file[0] : file;
    if (selectedFile) {
      onChange('', {
        ...attributes,
        src: selectedFile.url,
        poster: selectedFile.thumbnail || '',
      });
      setShowMediaSelector(false);
    }
  }, [attributes, onChange]);

  // Get aspect ratio style
  const getAspectRatioStyle = () => {
    const ratioData = ASPECT_RATIOS.find(r => r.value === aspectRatio);
    if (ratioData?.ratio) {
      return { aspectRatio: ratioData.ratio };
    }
    return {};
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      {src ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMediaSelector(true)}
            className="h-9 px-2"
          >
            <FolderOpen className="h-4 w-4 mr-1" />
            <span className="text-xs">Replace</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateAttribute('controls', !controls)}
            className={cn("h-9 px-2", controls && "bg-blue-100")}
            title="Toggle controls"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMediaSelector(true)}
            className="h-9 px-2"
          >
            <FolderOpen className="h-4 w-4 mr-1" />
            <span className="text-xs">Media Library</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="h-9 px-2"
          >
            <Link2 className="h-4 w-4 mr-1" />
            <span className="text-xs">URL</span>
          </Button>
        </>
      )}
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-3 mt-3">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoplay" className="text-xs text-gray-600">Autoplay</Label>
              <Switch
                id="autoplay"
                checked={autoplay}
                onCheckedChange={(checked) => updateAttribute('autoplay', checked)}
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
              <Label htmlFor="muted" className="text-xs text-gray-600">Muted</Label>
              <Switch
                id="muted"
                checked={muted}
                onCheckedChange={(checked) => updateAttribute('muted', checked)}
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
          </div>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-3 mt-3">
          <div>
            <Label htmlFor="poster" className="text-xs text-gray-600">Poster Image URL</Label>
            <Input
              id="poster"
              placeholder="https://example.com/poster.jpg"
              value={poster}
              onChange={(e) => updateAttribute('poster', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="borderRadius" className="text-xs text-gray-600">Border Radius</Label>
            <Input
              id="borderRadius"
              type="number"
              min="0"
              max="50"
              value={borderRadius}
              onChange={(e) => updateAttribute('borderRadius', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Video placeholder
  const VideoPlaceholder = () => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
      <Video className="mx-auto h-16 w-16 text-gray-400 mb-4" />
      <div className="space-y-2">
        <h3 className="text-lg font-medium text-gray-900">Add a video</h3>
        <p className="text-sm text-gray-600">Select from media library or add from URL</p>
        <div className="flex gap-2 justify-center mt-4">
          <Button
            onClick={() => setShowMediaSelector(true)}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Media Library
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowUrlInput(!showUrlInput)}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Add URL
          </Button>
        </div>

        {showUrlInput && (
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="https://example.com/video.mp4"
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyUrl()}
              className="flex-1"
            />
            <Button size="sm" onClick={applyUrl}>
              Add
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Main video content
  const VideoContent = () => {
    if (!src) {
      return <VideoPlaceholder />;
    }

    return (
      <div className={cn(
        "relative",
        align === 'center' && 'text-center',
        align === 'right' && 'text-right'
      )}>
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoplay}
          loop={loop}
          muted={muted}
          controls={controls}
          className="max-w-full h-auto"
          style={{
            ...getAspectRatioStyle(),
            objectFit: objectFit,
            borderRadius: borderRadius ? `${borderRadius}px` : undefined,
            width: width && aspectRatio === 'original' ? `${width}px` : undefined,
            height: height && aspectRatio === 'original' ? `${height}px` : undefined
          }}
        />
        
        {(caption || isSelected) && (
          <div className="mt-2">
            <RichText
              tagName="figcaption"
              placeholder="Write caption..."
              value={caption}
              onChange={(value) => updateAttribute('caption', value)}
              className="text-sm text-gray-600 italic text-center outline-none"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={videoConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <div className="w-full">
        <VideoContent />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Media Library Selector */}
        {showMediaSelector && (
          <FileSelector
            isOpen={showMediaSelector}
            onClose={() => setShowMediaSelector(false)}
            onSelect={handleMediaSelect}
            multiple={false}
            acceptedTypes={['video']}
            acceptedMimeTypes={['video/mp4', 'video/webm', 'video/ogg']}
            title="Select Video"
          />
        )}
      </div>
    </StandardBlockTemplate>
  );
};

export default StandardVideoBlock;