/**
 * Content Block Library
 *
 * Sprint 2-5: Admin Dashboard - Content Block management
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  contentBlockApi,
  SignageContentBlock,
  ContentBlockType,
  CreateContentBlockDto,
  ContentBlockSettings,
} from '@/lib/api/signageV2';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  RefreshCw,
  Image,
  Film,
  Type,
  Code,
  Clock,
  Cloud,
  Rss,
  QrCode,
  Box,
  Grid,
  List,
  Settings,
  Eye,
  ShoppingBag,
} from 'lucide-react';

// Block type configurations
const BLOCK_TYPE_CONFIGS: Record<ContentBlockType, { label: string; icon: typeof Type; color: string; description: string }> = {
  text: { label: 'Text', icon: Type, color: 'bg-blue-500', description: 'Static or dynamic text content' },
  image: { label: 'Image', icon: Image, color: 'bg-green-500', description: 'Display images from URL or upload' },
  video: { label: 'Video', icon: Film, color: 'bg-purple-500', description: 'Embed video content' },
  html: { label: 'HTML', icon: Code, color: 'bg-orange-500', description: 'Custom HTML/CSS content' },
  clock: { label: 'Clock', icon: Clock, color: 'bg-cyan-500', description: 'Display current time' },
  weather: { label: 'Weather', icon: Cloud, color: 'bg-yellow-500', description: 'Weather widget' },
  rss: { label: 'RSS Feed', icon: Rss, color: 'bg-red-500', description: 'RSS/Atom feed reader' },
  qr: { label: 'QR Code', icon: QrCode, color: 'bg-indigo-500', description: 'Generate QR codes' },
  'corner-display': { label: '제품 표시', icon: ShoppingBag, color: 'bg-emerald-500', description: '선택한 코너의 제품을 자동으로 표시합니다' },
  custom: { label: 'Custom', icon: Box, color: 'bg-gray-500', description: 'Custom block type' },
};

export default function ContentBlockLibrary() {
  const [blocks, setBlocks] = useState<SignageContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ContentBlockType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dialog states
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingBlock, setEditingBlock] = useState<SignageContentBlock | null>(null);
  const [previewBlock, setPreviewBlock] = useState<SignageContentBlock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SignageContentBlock | null>(null);

  // Form state
  const [blockForm, setBlockForm] = useState<CreateContentBlockDto>({
    name: '',
    blockType: 'text',
    content: {},
    settings: {},
  });

  // Load blocks
  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    setLoading(true);
    try {
      const result = await contentBlockApi.list(undefined, { limit: 100 });
      if (result.success && result.data) {
        setBlocks(result.data.items || []);
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered blocks
  const filteredBlocks = blocks.filter((block) => {
    const matchesSearch =
      block.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || block.blockType === filterType;
    return matchesSearch && matchesType;
  });

  // Reset form
  const resetForm = () => {
    setBlockForm({
      name: '',
      blockType: 'text',
      content: {},
      settings: {},
    });
    setEditingBlock(null);
  };

  // Open create/edit dialog
  const openBlockDialog = (block?: SignageContentBlock) => {
    if (block) {
      setEditingBlock(block);
      setBlockForm({
        name: block.name,
        blockType: block.blockType,
        content: block.content,
        settings: block.settings || {},
      });
    } else {
      resetForm();
    }
    setShowBlockDialog(true);
  };

  // Handle create/update
  const handleSaveBlock = async () => {
    try {
      if (editingBlock) {
        const result = await contentBlockApi.update(editingBlock.id, blockForm);
        if (result.success && result.data) {
          setBlocks(blocks.map((b) => (b.id === editingBlock.id ? result.data! : b)));
        }
      } else {
        const result = await contentBlockApi.create(blockForm);
        if (result.success && result.data) {
          setBlocks([result.data, ...blocks]);
        }
      }
      setShowBlockDialog(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save block:', error);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (block: SignageContentBlock) => {
    try {
      const result = await contentBlockApi.create({
        name: `${block.name} (Copy)`,
        blockType: block.blockType,
        content: block.content,
        settings: block.settings,
      });
      if (result.success && result.data) {
        setBlocks([result.data, ...blocks]);
      }
    } catch (error) {
      console.error('Failed to duplicate block:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await contentBlockApi.delete(deleteTarget.id);
      if (result.success) {
        setBlocks(blocks.filter((b) => b.id !== deleteTarget.id));
      }
    } catch (error) {
      console.error('Failed to delete block:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Get block type content editor
  const renderContentEditor = () => {
    switch (blockForm.blockType) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label>Text Content</Label>
              <Textarea
                value={(blockForm.content.text as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, text: e.target.value },
                  })
                }
                rows={4}
                placeholder="Enter your text content..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Font Size</Label>
                <Input
                  type="number"
                  value={blockForm.settings?.fontSize || 16}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      settings: { ...blockForm.settings, fontSize: parseInt(e.target.value) || 16 },
                    })
                  }
                />
              </div>
              <div>
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={blockForm.settings?.textColor || '#ffffff'}
                    onChange={(e) =>
                      setBlockForm({
                        ...blockForm,
                        settings: { ...blockForm.settings, textColor: e.target.value },
                      })
                    }
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={blockForm.settings?.textColor || '#ffffff'}
                    onChange={(e) =>
                      setBlockForm({
                        ...blockForm,
                        settings: { ...blockForm.settings, textColor: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Alignment</Label>
              <Select
                value={blockForm.settings?.alignment || 'left'}
                onValueChange={(value) =>
                  setBlockForm({
                    ...blockForm,
                    settings: { ...blockForm.settings, alignment: value as 'left' | 'center' | 'right' },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label>Image URL</Label>
              <Input
                value={(blockForm.content.url as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, url: e.target.value },
                  })
                }
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label>Alt Text</Label>
              <Input
                value={(blockForm.content.alt as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, alt: e.target.value },
                  })
                }
                placeholder="Image description"
              />
            </div>
            <div>
              <Label>Object Fit</Label>
              <Select
                value={(blockForm.content.objectFit as string) || 'cover'}
                onValueChange={(value) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, objectFit: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover</SelectItem>
                  <SelectItem value="contain">Contain</SelectItem>
                  <SelectItem value="fill">Fill</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div>
              <Label>Video URL</Label>
              <Input
                value={(blockForm.content.url as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, url: e.target.value },
                  })
                }
                placeholder="https://example.com/video.mp4"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(blockForm.content.autoplay as boolean) ?? true}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, autoplay: e.target.checked },
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Autoplay</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(blockForm.content.loop as boolean) ?? true}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, loop: e.target.checked },
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Loop</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(blockForm.content.muted as boolean) ?? true}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, muted: e.target.checked },
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Muted</span>
              </label>
            </div>
          </div>
        );

      case 'html':
        return (
          <div className="space-y-4">
            <div>
              <Label>HTML Content</Label>
              <Textarea
                value={(blockForm.content.html as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, html: e.target.value },
                  })
                }
                rows={8}
                placeholder="<div>Your HTML content...</div>"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>CSS Styles</Label>
              <Textarea
                value={(blockForm.content.css as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, css: e.target.value },
                  })
                }
                rows={4}
                placeholder=".custom-class { color: white; }"
                className="font-mono text-sm"
              />
            </div>
          </div>
        );

      case 'clock':
        return (
          <div className="space-y-4">
            <div>
              <Label>Time Format</Label>
              <Select
                value={(blockForm.content.format as string) || '24h'}
                onValueChange={(value) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, format: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(blockForm.content.showSeconds as boolean) ?? true}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, showSeconds: e.target.checked },
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Show Seconds</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(blockForm.content.showDate as boolean) ?? false}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, showDate: e.target.checked },
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Show Date</span>
              </label>
            </div>
            <div>
              <Label>Timezone</Label>
              <Input
                value={(blockForm.content.timezone as string) || 'Asia/Seoul'}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, timezone: e.target.value },
                  })
                }
                placeholder="Asia/Seoul"
              />
            </div>
          </div>
        );

      case 'weather':
        return (
          <div className="space-y-4">
            <div>
              <Label>City</Label>
              <Input
                value={(blockForm.content.city as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, city: e.target.value },
                  })
                }
                placeholder="Seoul"
              />
            </div>
            <div>
              <Label>Units</Label>
              <Select
                value={(blockForm.content.units as string) || 'metric'}
                onValueChange={(value) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, units: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Celsius</SelectItem>
                  <SelectItem value="imperial">Fahrenheit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>API Key (Optional)</Label>
              <Input
                type="password"
                value={(blockForm.content.apiKey as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, apiKey: e.target.value },
                  })
                }
                placeholder="Your weather API key"
              />
            </div>
          </div>
        );

      case 'rss':
        return (
          <div className="space-y-4">
            <div>
              <Label>Feed URL</Label>
              <Input
                value={(blockForm.content.feedUrl as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, feedUrl: e.target.value },
                  })
                }
                placeholder="https://example.com/feed.xml"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Items</Label>
                <Input
                  type="number"
                  value={(blockForm.content.maxItems as number) || 5}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, maxItems: parseInt(e.target.value) || 5 },
                    })
                  }
                />
              </div>
              <div>
                <Label>Refresh Interval (sec)</Label>
                <Input
                  type="number"
                  value={(blockForm.content.refreshInterval as number) || 300}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, refreshInterval: parseInt(e.target.value) || 300 },
                    })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 'qr':
        return (
          <div className="space-y-4">
            <div>
              <Label>QR Content</Label>
              <Input
                value={(blockForm.content.data as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, data: e.target.value },
                  })
                }
                placeholder="https://example.com or any text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Size</Label>
                <Input
                  type="number"
                  value={(blockForm.content.size as number) || 200}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, size: parseInt(e.target.value) || 200 },
                    })
                  }
                />
              </div>
              <div>
                <Label>Error Correction</Label>
                <Select
                  value={(blockForm.content.errorCorrection as string) || 'M'}
                  onValueChange={(value) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, errorCorrection: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Low (7%)</SelectItem>
                    <SelectItem value="M">Medium (15%)</SelectItem>
                    <SelectItem value="Q">Quartile (25%)</SelectItem>
                    <SelectItem value="H">High (30%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 'corner-display':
        return (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800">
                이 블록은 TV/사이니지에서 자동으로 제품을 표시합니다. 터치 인터랙션은 지원하지 않습니다.
              </p>
            </div>
            <div>
              <Label>코너 키 (필수)</Label>
              <Input
                value={(blockForm.content.cornerKey as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, cornerKey: e.target.value },
                  })
                }
                placeholder="예: premium_zone, new_arrivals"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Phase 1 Listings에 등록된 코너 키를 입력하세요.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>새로고침 주기 (초)</Label>
                <Input
                  type="number"
                  min={10}
                  value={((blockForm.content.refreshIntervalMs as number) || 60000) / 1000}
                  onChange={(e) =>
                    setBlockForm({
                      ...blockForm,
                      content: {
                        ...blockForm.content,
                        refreshIntervalMs: Math.max(10, parseInt(e.target.value) || 60) * 1000
                      },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  최소 10초
                </p>
              </div>
              <div>
                <Label>디바이스 타입</Label>
                <Select
                  value={(blockForm.content.deviceType as string) || 'signage'}
                  onValueChange={(value) =>
                    setBlockForm({
                      ...blockForm,
                      content: { ...blockForm.content, deviceType: value },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="signage">사이니지 (기본)</SelectItem>
                    <SelectItem value="tablet">태블릿</SelectItem>
                    <SelectItem value="kiosk">키오스크</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>표시 제목 (선택)</Label>
              <Input
                value={(blockForm.content.title as string) || ''}
                onChange={(e) =>
                  setBlockForm({
                    ...blockForm,
                    content: { ...blockForm.content, title: e.target.value },
                  })
                }
                placeholder="예: 신상품, 추천 상품"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <Label>Custom JSON Content</Label>
              <Textarea
                value={JSON.stringify(blockForm.content, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setBlockForm({ ...blockForm, content: parsed });
                  } catch {
                    // Invalid JSON, keep as is
                  }
                }}
                rows={8}
                className="font-mono text-sm"
                placeholder='{ "key": "value" }'
              />
            </div>
          </div>
        );
    }
  };

  // Render block preview
  const renderBlockPreview = (block: SignageContentBlock) => {
    const config = BLOCK_TYPE_CONFIGS[block.blockType];
    const Icon = config.icon;

    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Blocks</h1>
          <p className="text-muted-foreground">
            Reusable content components for templates
          </p>
        </div>
        <Button onClick={() => openBlockDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Block
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(value) => setFilterType(value as ContentBlockType | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(BLOCK_TYPE_CONFIGS).map(([type, config]) => (
              <SelectItem key={type} value={type}>
                <div className="flex items-center gap-2">
                  <config.icon className="h-4 w-4" />
                  {config.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={loadBlocks}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Block Type Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(BLOCK_TYPE_CONFIGS).map(([type, config]) => {
          const count = blocks.filter((b) => b.blockType === type).length;
          return (
            <Badge
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterType(filterType === type ? 'all' : (type as ContentBlockType))}
            >
              <config.icon className="h-3 w-3 mr-1" />
              {config.label} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Blocks */}
      {filteredBlocks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No content blocks found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all'
                ? 'Try different filters'
                : 'Create your first content block to get started'}
            </p>
            {!searchQuery && filterType === 'all' && (
              <Button onClick={() => openBlockDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Block
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBlocks.map((block) => {
            const config = BLOCK_TYPE_CONFIGS[block.blockType];
            const Icon = config.icon;

            return (
              <Card key={block.id} className="group">
                <CardContent className="p-0">
                  {/* Preview */}
                  <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                    {renderBlockPreview(block)}
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openBlockDialog(block)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setPreviewBlock(block);
                                setShowPreviewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(block)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(block)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {/* Type badge */}
                    <div className="absolute bottom-2 left-2">
                      <Badge className={`${config.color} text-white border-0`}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{block.name}</h3>
                      {block.isSystem && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {config.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBlocks.map((block) => {
            const config = BLOCK_TYPE_CONFIGS[block.blockType];
            const Icon = config.icon;

            return (
              <Card key={block.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-lg ${config.color} flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{block.name}</h3>
                      {block.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.label} - {config.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openBlockDialog(block)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setPreviewBlock(block);
                          setShowPreviewDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(block)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteTarget(block)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Block Editor Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBlock ? 'Edit Content Block' : 'Create Content Block'}</DialogTitle>
            <DialogDescription>
              Configure your content block settings and content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={blockForm.name}
                  onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                  placeholder="My Content Block"
                />
              </div>
              <div>
                <Label>Block Type</Label>
                <Select
                  value={blockForm.blockType}
                  onValueChange={(value: ContentBlockType) =>
                    !editingBlock && setBlockForm({ ...blockForm, blockType: value, content: {} })
                  }
                >
                  <SelectTrigger className={editingBlock ? 'opacity-60 cursor-not-allowed' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BLOCK_TYPE_CONFIGS).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type-specific Content */}
            <div>
              <Label className="text-base font-medium">Content Settings</Label>
              <div className="mt-3 p-4 border rounded-lg bg-muted/30">
                {renderContentEditor()}
              </div>
            </div>

            {/* Style Settings */}
            <div>
              <Label className="text-base font-medium">Style Settings</Label>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={blockForm.settings?.backgroundColor || '#transparent'}
                      onChange={(e) =>
                        setBlockForm({
                          ...blockForm,
                          settings: { ...blockForm.settings, backgroundColor: e.target.value },
                        })
                      }
                      className="w-12 h-9 p-1"
                    />
                    <Input
                      value={blockForm.settings?.backgroundColor || ''}
                      onChange={(e) =>
                        setBlockForm({
                          ...blockForm,
                          settings: { ...blockForm.settings, backgroundColor: e.target.value },
                        })
                      }
                      placeholder="transparent"
                    />
                  </div>
                </div>
                <div>
                  <Label>Padding (px)</Label>
                  <Input
                    type="number"
                    value={blockForm.settings?.padding || 0}
                    onChange={(e) =>
                      setBlockForm({
                        ...blockForm,
                        settings: { ...blockForm.settings, padding: parseInt(e.target.value) || 0 },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Border Radius (px)</Label>
                  <Input
                    type="number"
                    value={blockForm.settings?.borderRadius || 0}
                    onChange={(e) =>
                      setBlockForm({
                        ...blockForm,
                        settings: { ...blockForm.settings, borderRadius: parseInt(e.target.value) || 0 },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBlock} disabled={!blockForm.name}>
              {editingBlock ? 'Update Block' : 'Create Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Block Preview: {previewBlock?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {previewBlock && (
                <div className="text-white text-center">
                  <p className="text-lg">{previewBlock.name}</p>
                  <p className="text-sm text-white/70 mt-2">
                    Type: {BLOCK_TYPE_CONFIGS[previewBlock.blockType].label}
                  </p>
                  <pre className="mt-4 text-xs text-left bg-white/10 p-4 rounded max-h-40 overflow-auto">
                    {JSON.stringify(previewBlock.content, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Block</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
