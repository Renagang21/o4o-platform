import { FC, lazy, Suspense } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

// Lazy load block-specific settings components
const ImageBlockSettings = lazy(() => import('./ImageBlockSettings'));
const ButtonBlockSettings = lazy(() => import('./ButtonBlockSettings'));
const GalleryBlockSettings = lazy(() => import('./GalleryBlockSettings'));
const CoverBlockSettings = lazy(() => import('./CoverBlockSettings'));

interface BlockSettingsRendererProps {
  block: any;
  onBlockSettingsChange?: (settings: any) => void;
}

const BlockSettingsRenderer: FC<BlockSettingsRendererProps> = ({ 
  block, 
  onBlockSettingsChange 
}) => {
  if (!block) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">Select a block to see its settings</p>
      </div>
    );
  }

  // Extract block type (remove namespace if present)
  const blockType = block.type?.replace('o4o/', '').replace('core/', '');

  // Common settings for all blocks
  const renderCommonSettings = () => (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Block Info</h3>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium">{block.type}</p>
            <p className="text-xs text-gray-500">Block ID: {block.id}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Advanced</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">CSS Class</Label>
            <Input
              placeholder="custom-class"
              value={block.attributes?.className || ''}
              onChange={(e: any) => 
                onBlockSettingsChange?.({
                  attributes: { ...block.attributes, className: e.target.value }
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs">HTML Anchor</Label>
            <Input
              placeholder="anchor-id"
              value={block.attributes?.anchor || ''}
              onChange={(e: any) => 
                onBlockSettingsChange?.({
                  attributes: { ...block.attributes, anchor: e.target.value }
                })
              }
            />
          </div>
        </div>
      </div>
    </>
  );

  // Render block-specific settings based on type
  const renderBlockSpecificSettings = () => {
    switch (blockType) {
      case 'image':
        return (
          <Suspense fallback={<div>Loading settings...</div>}>
            <ImageBlockSettings 
              settings={block.attributes || {}}
              onChange={(settings) => onBlockSettingsChange?.({ attributes: settings })}
            />
          </Suspense>
        );

      case 'button':
        return (
          <Suspense fallback={<div>Loading settings...</div>}>
            <ButtonBlockSettings 
              settings={block.attributes || {}}
              onChange={(settings) => onBlockSettingsChange?.({ attributes: settings })}
            />
          </Suspense>
        );

      case 'gallery':
        return (
          <Suspense fallback={<div>Loading settings...</div>}>
            <GalleryBlockSettings 
              settings={block.attributes || {}}
              onChange={(settings) => onBlockSettingsChange?.({ attributes: settings })}
            />
          </Suspense>
        );

      case 'cover':
        return (
          <Suspense fallback={<div>Loading settings...</div>}>
            <CoverBlockSettings 
              settings={block.attributes || {}}
              onChange={(settings) => onBlockSettingsChange?.({ attributes: settings })}
            />
          </Suspense>
        );

      case 'heading':
        return (
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium mb-3">Typography</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Level</Label>
                <Select
                  value={block.attributes?.level || 'h2'}
                  onValueChange={(value: string) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, level: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h1">H1</SelectItem>
                    <SelectItem value="h2">H2</SelectItem>
                    <SelectItem value="h3">H3</SelectItem>
                    <SelectItem value="h4">H4</SelectItem>
                    <SelectItem value="h5">H5</SelectItem>
                    <SelectItem value="h6">H6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Alignment</Label>
                <div className="flex gap-1">
                  {['left', 'center', 'right', 'justify'].map((align) => (
                    <Button
                      key={align}
                      variant={block.attributes?.align === align ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => 
                        onBlockSettingsChange?.({
                          attributes: { ...block.attributes, align }
                        })
                      }
                      title={align}
                    >
                      {align === 'left' && <AlignLeft className="h-4 w-4" />}
                      {align === 'center' && <AlignCenter className="h-4 w-4" />}
                      {align === 'right' && <AlignRight className="h-4 w-4" />}
                      {align === 'justify' && <AlignJustify className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'paragraph':
        return (
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium mb-3">Typography</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Drop Cap</Label>
                <input
                  type="checkbox"
                  checked={block.attributes?.dropCap || false}
                  onChange={(e) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, dropCap: e.target.checked }
                    })
                  }
                  className="ml-2"
                />
              </div>
              <div>
                <Label className="text-xs">Alignment</Label>
                <div className="flex gap-1">
                  {['left', 'center', 'right', 'justify'].map((align) => (
                    <Button
                      key={align}
                      variant={block.attributes?.align === align ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => 
                        onBlockSettingsChange?.({
                          attributes: { ...block.attributes, align }
                        })
                      }
                      title={align}
                    >
                      {align === 'left' && <AlignLeft className="h-4 w-4" />}
                      {align === 'center' && <AlignCenter className="h-4 w-4" />}
                      {align === 'right' && <AlignRight className="h-4 w-4" />}
                      {align === 'justify' && <AlignJustify className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium mb-3">List Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">List Type</Label>
                <Select
                  value={block.attributes?.ordered ? 'ordered' : 'unordered'}
                  onValueChange={(value: string) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, ordered: value === 'ordered' }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unordered">Unordered (•)</SelectItem>
                    <SelectItem value="ordered">Ordered (1.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Start Value (for ordered lists)</Label>
                <Input
                  type="number"
                  min="1"
                  value={block.attributes?.start || 1}
                  onChange={(e: any) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, start: parseInt(e.target.value) || 1 }
                    })
                  }
                  disabled={!block.attributes?.ordered}
                />
              </div>
            </div>
          </div>
        );

      case 'quote':
        return (
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium mb-3">Quote Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Citation</Label>
                <Input
                  placeholder="Citation source"
                  value={block.attributes?.citation || ''}
                  onChange={(e: any) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, citation: e.target.value }
                    })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 'code':
        return (
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium mb-3">Code Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Language</Label>
                <Select
                  value={block.attributes?.language || 'javascript'}
                  onValueChange={(value: string) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, language: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="typescript">TypeScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="css">CSS</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="sql">SQL</SelectItem>
                    <SelectItem value="bash">Bash</SelectItem>
                    <SelectItem value="plaintext">Plain Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Show Line Numbers</Label>
                <input
                  type="checkbox"
                  checked={block.attributes?.showLineNumbers || false}
                  onChange={(e) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, showLineNumbers: e.target.checked }
                    })
                  }
                  className="ml-2"
                />
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium mb-3">Video Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Autoplay</Label>
                <input
                  type="checkbox"
                  checked={block.attributes?.autoplay || false}
                  onChange={(e) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, autoplay: e.target.checked }
                    })
                  }
                  className="ml-2"
                />
              </div>
              <div>
                <Label className="text-xs">Loop</Label>
                <input
                  type="checkbox"
                  checked={block.attributes?.loop || false}
                  onChange={(e) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, loop: e.target.checked }
                    })
                  }
                  className="ml-2"
                />
              </div>
              <div>
                <Label className="text-xs">Muted</Label>
                <input
                  type="checkbox"
                  checked={block.attributes?.muted || false}
                  onChange={(e) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, muted: e.target.checked }
                    })
                  }
                  className="ml-2"
                />
              </div>
              <div>
                <Label className="text-xs">Show Controls</Label>
                <input
                  type="checkbox"
                  checked={block.attributes?.controls !== false}
                  onChange={(e) => 
                    onBlockSettingsChange?.({
                      attributes: { ...block.attributes, controls: e.target.checked }
                    })
                  }
                  className="ml-2"
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="border-b pb-4">
            <h3 className="text-sm font-medium mb-3">Block Settings</h3>
            <div className="p-4 text-sm text-gray-600">
              No specific settings available for {blockType} block.
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {renderBlockSpecificSettings()}
      {renderCommonSettings()}
    </div>
  );
};

export default BlockSettingsRenderer;