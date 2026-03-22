/**
 * Content Block Editors — Type-specific content editor forms
 *
 * WO-O4O-CONTENT-BLOCK-LIBRARY-SPLIT-V1
 * Extracted from ContentBlockLibrary.tsx renderContentEditor()
 *
 * 10 block type editors: text, image, video, html, clock, weather, rss, qr, corner-display, custom
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateContentBlockDto } from '@/lib/api/signageV2';

interface ContentBlockEditorsProps {
  blockForm: CreateContentBlockDto;
  setBlockForm: (form: CreateContentBlockDto) => void;
}

export function ContentBlockEditors({ blockForm, setBlockForm }: ContentBlockEditorsProps) {
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
}
