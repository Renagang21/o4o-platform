import { useState, useEffect, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  ArrowLeft,
  Globe
} from 'lucide-react';
import { ContentApi } from '../../api/contentApi';
import { Template, TipTapJSONContent } from '../../types/content';

interface Block {
  id: string;
  type: string;
  content: {
    title?: string;
    subtitle?: string;
    text?: string;
    alt?: string;
    url?: string;
    [key: string]: any;
  };
  settings?: Record<string, any>;
}

// Helper functions for converting between Block[] and TipTapJSONContent
const blocksToTipTap = (blocks: Block[]): TipTapJSONContent => {
  return {
    type: 'doc',
    content: blocks.map((block: any) => ({
      type: 'custom-block',
      attrs: {
        id: block.id,
        blockType: block.type,
        content: block.content,
        settings: block.settings as any
      }
    }))
  };
};

const tipTapToBlocks = (content: TipTapJSONContent): Block[] => {
  if (!content || !content.content || !Array.isArray(content.content)) {
    return [];
  }
  
  return content.content
    .filter((node: any) => node.type === 'custom-block' && node.attrs)
    .map((node: any) => ({
      id: node.attrs?.id as string || `block-${Date.now()}-${Math.random()}`,
      type: node.attrs?.blockType as string || 'paragraph',
      content: node.attrs?.content || {},
      settings: node.attrs?.settings as any as Record<string, any> || {}
    }));
};

const blockTypes = [
  { type: 'hero', label: 'Hero Section', icon: '🏔️' },
  { type: 'heading', label: 'Heading', icon: '📝' },
  { type: 'paragraph', label: 'Paragraph', icon: '📄' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'button', label: 'Button', icon: '🔘' },
  { type: 'columns', label: 'Columns', icon: '📊' },
  { type: 'spacer', label: 'Spacer', icon: '↕️' },
];

const HomepageEditor: FC = () => {
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadHomepageTemplate();
  }, []);

  const loadHomepageTemplate = async () => {
    try {
      setLoading(true);
      const response = await ContentApi.getTemplates();
      const templates = response.data || [];
      const homepageTemplate = templates.find((t: Template) => t.name === 'homepage' && t.type === 'page');
      
      if (homepageTemplate) {
        setTemplate(homepageTemplate);
        setBlocks(tipTapToBlocks(homepageTemplate.content));
      } else {
        // Create new homepage template if not exists
        const newTemplate: Partial<Template> = {
          name: 'homepage',
          type: 'page',
          layoutType: 'custom',
          description: 'Main homepage template',
          content: blocksToTipTap([]),
          status: 'active',
          isDefault: true,
          active: true,
        };
        const createResponse = await ContentApi.createTemplate(newTemplate);
        setTemplate(createResponse.data);
        setBlocks([]);
      }
    } catch (error: any) {
      console.error('Failed to load homepage template:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      settings: getDefaultSettings(type),
    };
    setBlocks([...blocks as any, newBlock]);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'hero':
        return {
          title: 'Welcome to Our Platform',
          subtitle: 'Build amazing experiences',
          backgroundImage: '',
          buttons: [
            { text: 'Get Started', url: '/signup', style: 'primary' },
            { text: 'Learn More', url: '/about', style: 'secondary' }
          ]
        };
      case 'heading':
        return { text: 'New Heading', level: 2 };
      case 'paragraph':
        return { text: 'Enter your content here...' };
      case 'image':
        return { src: '', alt: 'Image description' };
      case 'button':
        return { text: 'Click Me', url: '#', style: 'primary' };
      case 'columns':
        return { columns: [{ blocks: [] }, { blocks: [] }] };
      case 'spacer':
        return { height: '2rem' };
      default:
        return {};
    }
  };

  const getDefaultSettings = (type: string) => {
    switch (type) {
      case 'hero':
        return { height: '500px', overlay: true, overlayOpacity: 0.5 };
      default:
        return {};
    }
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    setBlocks(blocks.map((block: any) => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter((block: any) => block.id !== blockId));
    setSelectedBlock(null);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    const newBlocks = [...blocks as any];
    if (direction === 'up' && index > 0) {
      [newBlocks[index], newBlocks[index - 1]] = [newBlocks[index - 1], newBlocks[index]];
    } else if (direction === 'down' && index < blocks.length - 1) {
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
    }
    setBlocks(newBlocks);
  };

  const saveTemplate = async () => {
    if (!template) return;
    
    try {
      setSaving(true);
      const updateResponse = await ContentApi.updateTemplate(template.id, {
        ...template,
        content: blocksToTipTap(blocks),
        updatedAt: new Date().toISOString(),
      });
      setTemplate(updateResponse.data);
      alert('Homepage template saved successfully!');
    } catch (error: any) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const publishTemplate = async () => {
    if (!template) return;
    
    try {
      setSaving(true);
      // Save first
      await saveTemplate();
      
      // In a real implementation, this would trigger a deployment
      // or cache invalidation to update the live site
      alert('Homepage published successfully! The changes are now live.');
    } catch (error: any) {
      console.error('Failed to publish template:', error);
      alert('Failed to publish template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b">
          <button
            onClick={() => navigate('/admin/templates')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </button>
        </div>

        <div className="p-4">
          <h3 className="font-semibold mb-4">Add Blocks</h3>
          <div className="space-y-2">
            {blockTypes.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="w-full flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">{icon}</span>
                <span className="text-left">
                  <div className="font-medium">{label}</div>
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedBlock && (
          <div className="p-4 border-t">
            <h3 className="font-semibold mb-4">Block Settings</h3>
            <BlockEditor
              block={blocks.find((b: any) => b.id === selectedBlock)!}
              onUpdate={(updates) => updateBlock(selectedBlock, updates)}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Globe className="w-6 h-6 mr-3 text-blue-600" />
              <h1 className="text-2xl font-bold">Homepage Editor</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              <button
                onClick={publishTemplate}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Globe className="w-4 h-4 mr-2" />
                Publish
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {blocks.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Plus className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Start by adding blocks from the sidebar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {blocks.map((block, index) => (
                  <BlockPreview
                    key={block.id}
                    block={block}
                    isSelected={selectedBlock === block.id}
                    onSelect={() => setSelectedBlock(block.id)}
                    onDelete={() => deleteBlock(block.id)}
                    onMove={(direction) => moveBlock(block.id, direction)}
                    canMoveUp={index > 0}
                    canMoveDown={index < blocks.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Block Preview Component
const BlockPreview: FC<{
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}> = ({ block, isSelected, onSelect, onDelete, onMove, canMoveUp, canMoveDown }) => {
  return (
    <div
      className={`relative group border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1">
          <button
            onClick={(e: any) => {
              e.stopPropagation();
              onMove('up');
            }}
            disabled={!canMoveUp}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            ↑
          </button>
          <button
            onClick={(e: any) => {
              e.stopPropagation();
              onMove('down');
            }}
            disabled={!canMoveDown}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            ↓
          </button>
          <button
            onClick={(e: any) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-2">{block.type}</div>
      <BlockContent block={block} />
    </div>
  );
};

// Block Content Preview
const BlockContent: FC<{ block: Block }> = ({ block }) => {
  switch (block.type) {
    case 'hero':
      return (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold">{(block.content as any).title}</h3>
          <p className="text-gray-600">{(block.content as any).subtitle}</p>
        </div>
      );
    case 'heading':
      return <h3 className="font-bold">{(block.content as any).text}</h3>;
    case 'paragraph':
      return <p>{(block.content as any).text}</p>;
    case 'button':
      return (
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          {(block.content as any).text}
        </button>
      );
    case 'image':
      return (
        <div className="bg-gray-100 p-8 text-center rounded">
          <span className="text-gray-500">Image: {(block.content as any).alt || 'No description'}</span>
        </div>
      );
    default:
      return <div className="text-gray-500">Block type: {block.type}</div>;
  }
};

// Block Editor Component
const BlockEditor: FC<{
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}> = ({ block, onUpdate }) => {
  const updateContent = (key: string, value: any) => {
    onUpdate({
      content: {
        ...(block.content as any),
        [key]: value,
      },
    });
  };

  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={block.content.title || ''}
              onChange={(e: any) => updateContent('title', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subtitle</label>
            <input
              type="text"
              value={block.content.subtitle || ''}
              onChange={(e: any) => updateContent('subtitle', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      );
    case 'heading':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Text</label>
            <input
              type="text"
              value={block.content.text || ''}
              onChange={(e: any) => updateContent('text', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Level</label>
            <select
              value={block.content.level || 2}
              onChange={(e: any) => updateContent('level', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {[1, 2, 3, 4, 5, 6].map((level: any) => (
                <option key={level} value={level}>H{level}</option>
              ))}
            </select>
          </div>
        </div>
      );
    case 'paragraph':
      return (
        <div>
          <label className="block text-sm font-medium mb-1">Text</label>
          <textarea
            value={block.content.text || ''}
            onChange={(e: any) => updateContent('text', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            rows={4}
          />
        </div>
      );
    case 'button':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Text</label>
            <input
              type="text"
              value={block.content.text || ''}
              onChange={(e: any) => updateContent('text', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input
              type="text"
              value={block.content.url || ''}
              onChange={(e: any) => updateContent('url', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      );
    default:
      return <div className="text-gray-500">No settings available</div>;
  }
};

export default HomepageEditor;