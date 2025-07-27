import { useState, FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  MoreVertical,
  FileText,
  Settings,
  Image as ImageIcon,
  Layout as LayoutIcon,
  Undo,
  Redo,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import GutenbergEditor from '@/components/editor/GutenbergEditor';
import GutenbergSidebar from '@/components/editor/GutenbergSidebar';
import MediaLibrary from '@/components/media/MediaLibrary';
import ContentTemplates from '@/components/editor/ContentTemplates';
import { 
  CTABlock, 
  PricingTableBlock, 
  TestimonialBlock, 
  StarRatingBlock,
  InfoBoxBlock 
} from '@/components/editor/blocks/SpectraBlocks';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

// Enhanced block component with Spectra blocks
const EnhancedBlockItem: React.FC<{
  block: any;
  isEditing: boolean;
  onUpdate: (content: any) => void;
}> = ({ block, isEditing, onUpdate }) => {
  // Render Spectra blocks
  switch (block.type) {
    case 'cta':
      return <CTABlock content={block.content} onUpdate={onUpdate} isEditing={isEditing} />;
    case 'pricing':
      return <PricingTableBlock content={block.content} onUpdate={onUpdate} isEditing={isEditing} />;
    case 'testimonial':
      return <TestimonialBlock content={block.content} onUpdate={onUpdate} isEditing={isEditing} />;
    case 'rating':
      return <StarRatingBlock content={block.content} onUpdate={onUpdate} isEditing={isEditing} />;
    case 'infobox':
      return <InfoBoxBlock content={block.content} onUpdate={onUpdate} isEditing={isEditing} />;
    default:
      return null;
  }
};

const GutenbergPage: React.FC = () => {
  const navigate = useNavigate();
  const [postTitle, setPostTitle] = useState('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'document' | 'block'>('document');
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Post settings
  const [postSettings, setPostSettings] = useState({
    status: 'draft' as 'draft' | 'publish' | 'pending' | 'private',
    visibility: 'public' as 'public' | 'private' | 'password',
    publishDate: new Date().toISOString().slice(0, 16),
    author: 'Admin User',
    featuredImage: undefined as string | undefined,
    excerpt: '',
    slug: '',
    categories: [] as string[],
    tags: [] as string[],
    template: 'default',
    commentStatus: true,
    pingStatus: true,
    sticky: false,
    format: 'standard' as 'standard' | 'aside' | 'chat' | 'gallery' | 'link' | 'image' | 'quote' | 'status' | 'video' | 'audio'
  });

  // Handle save
  const handleSave = async (publish = false) => {
    setIsSaving(true);
    
    // Simulate save
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
      if (publish) {
        setPostSettings(prev => ({ ...prev, status: 'publish' }));
      }
    }, 1000);
  };

  // Handle template selection
  const handleSelectTemplate = (template: any) => {
    setBlocks(template.blocks);
    setShowTemplates(false);
  };

  // Handle pattern selection
  const handleSelectPattern = (pattern: any) => {
    setBlocks(prev => [...prev, ...pattern.blocks]);
    setShowTemplates(false);
  };

  // Handle media selection
  const handleMediaSelect = (media: any[]) => {
    if (media.length > 0 && selectedBlock) {
      const updatedBlock = {
        ...selectedBlock,
        content: {
          ...selectedBlock.content,
          url: media[0].url,
          alt: media[0].alt
        }
      };
      
      setBlocks(blocks.map(block => 
        block.id === selectedBlock.id ? updatedBlock : block
      ));
    }
    setShowMediaLibrary(false);
  };

  // Custom block renderer
  const renderBlock = (block: any) => {
    const isSpectraBlock = ['cta', 'pricing', 'testimonial', 'rating', 'infobox'].includes(block.type);
    
    if (isSpectraBlock) {
      return (
        <div
          key={block.id}
          className={cn(
            'mb-4 transition-all',
            selectedBlock?.id === block.id && 'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
          )}
          onClick={() => {
            setSelectedBlock(block);
            setActiveTab('block');
          }}
        >
          <EnhancedBlockItem
            block={block}
            isEditing={true}
            onUpdate={(content) => {
              setBlocks(blocks.map(b => 
                b.id === block.id ? { ...b, content } : b
              ));
            }}
          />
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            <Input
              placeholder="Add title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="text-2xl font-bold border-0 focus-visible:ring-0 p-0"
            />
          </div>
          
          <Badge variant={postSettings.status === 'publish' ? 'default' : 'secondary'}>
            {postSettings.status}
          </Badge>
          
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(true)}
          >
            <LayoutIcon className="h-4 w-4 mr-2" />
            Templates
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMediaLibrary(true)}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Media
          </Button>
          
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Redo className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            variant="default"
            onClick={() => handleSave(true)}
            disabled={isSaving}
          >
            {postSettings.status === 'publish' ? 'Update' : 'Publish'}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Copy all blocks</DropdownMenuItem>
              <DropdownMenuItem>Export as HTML</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Keyboard shortcuts</DropdownMenuItem>
              <DropdownMenuItem>Help</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <GutenbergEditor
            initialBlocks={blocks}
            onChange={setBlocks}
          />
          
          {/* Render custom Spectra blocks */}
          <div className="max-w-4xl mx-auto px-12 pb-8">
            {blocks.map((block) => renderBlock(block))}
          </div>
        </div>
        
        {/* Sidebar */}
        {sidebarOpen && (
          <GutenbergSidebar
            activeTab={activeTab}
            postSettings={postSettings}
            blockSettings={selectedBlock}
            onPostSettingsChange={(settings) => 
              setPostSettings(prev => ({ ...prev, ...settings }))
            }
            onBlockSettingsChange={(settings) => {
              if (selectedBlock) {
                const updated = { ...selectedBlock, ...settings };
                setBlocks(blocks.map(block => 
                  block.id === selectedBlock.id ? updated : block
                ));
                setSelectedBlock(updated);
              }
            }}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>
      
      {/* Media Library Dialog */}
      <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
          <MediaLibrary
            mode="picker"
            multiple={false}
            accept="image/*"
            onSelect={handleMediaSelect}
            onClose={() => setShowMediaLibrary(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-6xl h-[80vh] p-0">
          <ContentTemplates
            onSelectTemplate={handleSelectTemplate}
            onSelectPattern={handleSelectPattern}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GutenbergPage;