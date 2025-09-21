/**
 * IconInserter Component
 * 아이콘 삽입 및 커스터마이징 - Lucide Icons 활용
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Star,
  Heart,
  Home,
  User,
  Settings,
  Search,
  Mail,
  Phone,
  Download,
  Upload,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Check,
  Info,
  AlertCircle,
  ShoppingCart,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Camera,
  Image,
  Video,
  Music,
  FileText,
  Folder,
  Save,
  Edit,
  Trash2,
  Share,
  Copy,
  Link,
  ExternalLink,
  Menu,
  MoreHorizontal,
  Bell,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Shield,
  Award,
  Target,
  Bookmark,
  Flag,
  Gift,
  Smile,
  ThumbsUp,
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';

interface IconSettings {
  enabled: boolean;
  iconName: string;
  position: 'left' | 'right';
  size: number;
  gap: number;
  color?: string; // inherit if undefined
}

interface IconInserterProps {
  currentIcon?: IconSettings;
  buttonText: string;
  onIconChange: (icon: IconSettings) => void;
}

// 60개의 자주 사용되는 아이콘들
const ICON_LIBRARY = [
  { name: 'star', icon: Star, category: 'general' },
  { name: 'heart', icon: Heart, category: 'general' },
  { name: 'home', icon: Home, category: 'general' },
  { name: 'user', icon: User, category: 'general' },
  { name: 'settings', icon: Settings, category: 'general' },
  { name: 'search', icon: Search, category: 'general' },
  { name: 'mail', icon: Mail, category: 'communication' },
  { name: 'phone', icon: Phone, category: 'communication' },
  { name: 'download', icon: Download, category: 'action' },
  { name: 'upload', icon: Upload, category: 'action' },
  { name: 'play', icon: Play, category: 'media' },
  { name: 'pause', icon: Pause, category: 'media' },
  { name: 'chevron-right', icon: ChevronRight, category: 'navigation' },
  { name: 'chevron-left', icon: ChevronLeft, category: 'navigation' },
  { name: 'arrow-right', icon: ArrowRight, category: 'navigation' },
  { name: 'arrow-left', icon: ArrowLeft, category: 'navigation' },
  { name: 'plus', icon: Plus, category: 'action' },
  { name: 'x', icon: X, category: 'action' },
  { name: 'check', icon: Check, category: 'status' },
  { name: 'info', icon: Info, category: 'status' },
  { name: 'alert-circle', icon: AlertCircle, category: 'status' },
  { name: 'shopping-cart', icon: ShoppingCart, category: 'ecommerce' },
  { name: 'credit-card', icon: CreditCard, category: 'ecommerce' },
  { name: 'eye', icon: Eye, category: 'interface' },
  { name: 'eye-off', icon: EyeOff, category: 'interface' },
  { name: 'lock', icon: Lock, category: 'security' },
  { name: 'unlock', icon: Unlock, category: 'security' },
  { name: 'calendar', icon: Calendar, category: 'time' },
  { name: 'clock', icon: Clock, category: 'time' },
  { name: 'map-pin', icon: MapPin, category: 'location' },
  { name: 'globe', icon: Globe, category: 'location' },
  { name: 'camera', icon: Camera, category: 'media' },
  { name: 'image', icon: Image, category: 'media' },
  { name: 'video', icon: Video, category: 'media' },
  { name: 'music', icon: Music, category: 'media' },
  { name: 'file-text', icon: FileText, category: 'file' },
  { name: 'folder', icon: Folder, category: 'file' },
  { name: 'save', icon: Save, category: 'action' },
  { name: 'edit', icon: Edit, category: 'action' },
  { name: 'trash-2', icon: Trash2, category: 'action' },
  { name: 'share', icon: Share, category: 'action' },
  { name: 'copy', icon: Copy, category: 'action' },
  { name: 'link', icon: Link, category: 'action' },
  { name: 'external-link', icon: ExternalLink, category: 'action' },
  { name: 'menu', icon: Menu, category: 'interface' },
  { name: 'more-horizontal', icon: MoreHorizontal, category: 'interface' },
  { name: 'bell', icon: Bell, category: 'communication' },
  { name: 'chevron-down', icon: ChevronDown, category: 'navigation' },
  { name: 'chevron-up', icon: ChevronUp, category: 'navigation' },
  { name: 'refresh-cw', icon: RefreshCw, category: 'action' },
  { name: 'zap', icon: Zap, category: 'general' },
  { name: 'shield', icon: Shield, category: 'security' },
  { name: 'award', icon: Award, category: 'general' },
  { name: 'target', icon: Target, category: 'general' },
  { name: 'bookmark', icon: Bookmark, category: 'general' },
  { name: 'flag', icon: Flag, category: 'general' },
  { name: 'gift', icon: Gift, category: 'general' },
  { name: 'smile', icon: Smile, category: 'social' },
  { name: 'thumbs-up', icon: ThumbsUp, category: 'social' },
  { name: 'message-circle', icon: MessageCircle, category: 'communication' },
  { name: 'send', icon: Send, category: 'communication' },
  { name: 'mic', icon: Mic, category: 'media' },
  { name: 'mic-off', icon: MicOff, category: 'media' },
  { name: 'volume-2', icon: Volume2, category: 'media' },
  { name: 'volume-x', icon: VolumeX, category: 'media' }
];

const ICON_CATEGORIES = [
  'all',
  'general',
  'action',
  'navigation',
  'communication',
  'media',
  'interface',
  'ecommerce',
  'security',
  'time',
  'location',
  'file',
  'social',
  'status'
] as const;

export const IconInserter: React.FC<IconInserterProps> = ({
  currentIcon,
  buttonText,
  onIconChange,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Default icon settings
  const defaultIcon: IconSettings = {
    enabled: false,
    iconName: 'star',
    position: 'left',
    size: 16,
    gap: 8
  };

  const icon = currentIcon || defaultIcon;

  // Filter icons
  const filteredIcons = ICON_LIBRARY.filter(iconItem => {
    const matchesCategory = selectedCategory === 'all' || iconItem.category === selectedCategory;
    const matchesSearch = iconItem.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const iconItem = ICON_LIBRARY.find(item => item.name === iconName);
    return iconItem ? iconItem.icon : Star;
  };

  // Update icon
  const updateIcon = (updates: Partial<IconSettings>) => {
    const newIcon = { ...icon, ...updates };
    onIconChange(newIcon);
  };

  // Toggle icon
  const toggleIcon = () => {
    updateIcon({ enabled: !icon.enabled });
  };

  // Select icon
  const selectIcon = (iconName: string) => {
    updateIcon({ iconName, enabled: true });
    setShowIconPicker(false);
  };

  const IconComponent = getIconComponent(icon.iconName);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4" />
          <Label className="text-sm font-medium">Button Icon</Label>
        </div>
        <Button
          variant={icon.enabled ? "default" : "outline"}
          size="sm"
          onClick={toggleIcon}
          className="h-8 px-3 text-xs"
        >
          {icon.enabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>

      {icon.enabled && (
        <>
          {/* Current Icon Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-700">Preview</Label>
            <div className="p-4 bg-white rounded border">
              <div className="flex items-center justify-center">
                <div
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded"
                  style={{ gap: `${icon.gap}px` }}
                >
                  {icon.position === 'left' && (
                    <IconComponent
                      size={icon.size}
                      style={{ color: icon.color || 'inherit' }}
                    />
                  )}
                  <span>{buttonText || 'Button Text'}</span>
                  {icon.position === 'right' && (
                    <IconComponent
                      size={icon.size}
                      style={{ color: icon.color || 'inherit' }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Current Icon Info */}
          <div className="flex items-center justify-between p-3 bg-white rounded border">
            <div className="flex items-center gap-2">
              <IconComponent size={16} />
              <span className="text-sm font-medium">{icon.iconName}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="text-xs"
            >
              Change Icon
            </Button>
          </div>

          {/* Icon Settings */}
          <div className="space-y-3">
            {/* Position */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Position</Label>
              <div className="flex gap-2">
                <Button
                  variant={icon.position === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateIcon({ position: 'left' })}
                  className="flex-1 text-xs"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Left
                </Button>
                <Button
                  variant={icon.position === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateIcon({ position: 'right' })}
                  className="flex-1 text-xs"
                >
                  Right
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">
                Size: {icon.size}px
              </Label>
              <input
                type="range"
                min="12"
                max="32"
                value={icon.size}
                onChange={(e) => updateIcon({ size: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>12px</span>
                <span>32px</span>
              </div>
            </div>

            {/* Gap */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">
                Gap: {icon.gap}px
              </Label>
              <input
                type="range"
                min="4"
                max="20"
                value={icon.gap}
                onChange={(e) => updateIcon({ gap: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>4px</span>
                <span>20px</span>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={icon.color || '#ffffff'}
                  onChange={(e) => updateIcon({ color: e.target.value })}
                  className="w-12 h-8 rounded border cursor-pointer"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateIcon({ color: undefined })}
                  className="text-xs"
                >
                  Inherit
                </Button>
              </div>
            </div>
          </div>

          {/* Icon Picker */}
          {showIconPicker && (
            <div className="space-y-3 p-3 bg-white rounded border">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">Search Icons</Label>
                <Input
                  type="text"
                  placeholder="Search icons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">Categories</Label>
                <div className="flex flex-wrap gap-1">
                  {ICON_CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="h-6 px-2 text-xs capitalize"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Icon Grid */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-700">
                  Icons ({filteredIcons.length})
                </Label>
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
                  {filteredIcons.map((iconItem) => {
                    const IconComp = iconItem.icon;
                    return (
                      <button
                        key={iconItem.name}
                        className={`
                          h-10 w-10 flex items-center justify-center rounded border hover:bg-gray-100 transition-colors
                          ${icon.iconName === iconItem.name ? 'bg-blue-100 border-blue-500' : ''}
                        `}
                        onClick={() => selectIcon(iconItem.name)}
                        title={iconItem.name}
                      >
                        <IconComp size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Close Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIconPicker(false)}
                className="w-full text-xs"
              >
                Close Icon Picker
              </Button>
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
            <p><strong>Tip:</strong> Icons enhance button meaning and UX</p>
            <p><strong>Position:</strong> Left for actions, right for navigation</p>
            <p><strong>Size:</strong> Keep consistent with text size</p>
          </div>
        </>
      )}
    </div>
  );
};

export default IconInserter;