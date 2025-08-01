import { FC, useState } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Move, 
  Copy, 
  Trash2,
  Type,
  Image,
  Layout,
  Columns,
  Grid,
  Heart,
  Star,
  FileText,
  Code,
  List,
  Quote,
  Table,
  Video,
  Music,
  Map,
  ShoppingCart,
  Users,
  Settings,
  X,
  Square,
  Play,
  Link
} from 'lucide-react';
import { clsx } from 'clsx';
import MediaLibraryModal from '@/components/media/MediaLibraryModal';
import ImageBlockSettings from '@/components/editor/ImageBlockSettings';
import GalleryBlockSettings from '@/components/editor/GalleryBlockSettings';
import CoverBlockSettings from '@/components/editor/CoverBlockSettings';
import ButtonBlockSettings from '@/components/editor/ButtonBlockSettings';

// Spectra block types
const SPECTRA_BLOCKS = [
  { id: 'uagb/advanced-heading', name: 'Advanced Heading', icon: Type, category: 'text' },
  { id: 'uagb/info-box', name: 'Info Box', icon: FileText, category: 'layout' },
  { id: 'uagb/testimonial', name: 'Testimonial', icon: Quote, category: 'text' },
  { id: 'uagb/team', name: 'Team', icon: Users, category: 'layout' },
  { id: 'uagb/social-share', name: 'Social Share', icon: Heart, category: 'social' },
  { id: 'uagb/google-map', name: 'Google Map', icon: Map, category: 'embed' },
  { id: 'uagb/icon-list', name: 'Icon List', icon: List, category: 'text' },
  { id: 'uagb/price-list', name: 'Price List', icon: ShoppingCart, category: 'layout' },
  { id: 'uagb/post-carousel', name: 'Post Carousel', icon: Grid, category: 'layout' },
  { id: 'uagb/table-of-contents', name: 'Table of Contents', icon: List, category: 'text' },
  { id: 'uagb/timeline', name: 'Timeline', icon: FileText, category: 'layout' },
  { id: 'uagb/blockquote', name: 'Blockquote', icon: Quote, category: 'text' },
  { id: 'uagb/call-to-action', name: 'Call To Action', icon: Star, category: 'layout' },
  { id: 'uagb/columns', name: 'Advanced Columns', icon: Columns, category: 'layout' },
  { id: 'uagb/section', name: 'Section', icon: Layout, category: 'layout' }
];

// O4O Custom blocks
const O4O_BLOCKS = [
  { id: 'o4o/cpt-acf-loop', name: 'CPT/ACF Loop', icon: List, category: 'o4o' },
];

// Core WordPress blocks
const CORE_BLOCKS = [
  { id: 'core/paragraph', name: 'Paragraph', icon: Type, category: 'text' },
  { id: 'core/heading', name: 'Heading', icon: Type, category: 'text' },
  { id: 'core/list', name: 'List', icon: List, category: 'text' },
  { id: 'core/quote', name: 'Quote', icon: Quote, category: 'text' },
  { id: 'core/code', name: 'Code', icon: Code, category: 'text' },
  { id: 'core/table', name: 'Table', icon: Table, category: 'text' },
  { id: 'core/image', name: 'Image', icon: Image, category: 'media' },
  { id: 'core/gallery', name: 'Gallery', icon: Grid, category: 'media' },
  { id: 'core/video', name: 'Video', icon: Video, category: 'media' },
  { id: 'core/audio', name: 'Audio', icon: Music, category: 'media' },
  { id: 'core/cover', name: 'Cover', icon: Image, category: 'media' },
  { id: 'core/columns', name: 'Columns', icon: Columns, category: 'design' },
  { id: 'core/group', name: 'Group', icon: Layout, category: 'design' },
  { id: 'core/button', name: 'Button', icon: Square, category: 'design' },
  { id: 'core/spacer', name: 'Spacer', icon: Layout, category: 'design' },
  { id: 'core/separator', name: 'Separator', icon: Layout, category: 'design' }
];

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

interface GutenbergEditorProps {
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
  content?: string; // HTML content or serialized blocks
  onContentChange?: (content: string) => void; // For integration with PostForm
}

// Utility functions for block serialization
const parseContentToBlocks = (content: string): Block[] => {
  if (!content || !content.trim()) {
    return [];
  }

  // Check if content contains WordPress block comments
  const blockRegex = /<!-- wp:([a-z0-9-]+\/[a-z0-9-]+)(\s+({[^}]*}))?\s*-->([\s\S]*?)<!-- \/wp:\1 -->/g;
  const matches = [...content.matchAll(blockRegex)];
  
  if (matches.length > 0) {
    // Parse WordPress block format
    return matches.map((match, index) => {
      const blockType = match[1];
      const attributesJson = match[3];
      const blockContent = match[4].trim();
      
      let attributes = {};
      if (attributesJson) {
        try {
          attributes = JSON.parse(attributesJson);
        } catch (e) {
          console.error('Failed to parse block attributes:', e);
        }
      }
      
      // Parse content based on block type
      let parsedContent: any = {};
      
      switch (blockType) {
        case 'core/paragraph':
          const pMatch = blockContent.match(/<p>(.*?)<\/p>/s);
          parsedContent = { text: pMatch ? pMatch[1] : blockContent };
          break;
          
        case 'core/heading':
          const hMatch = blockContent.match(/<h(\d)>(.*?)<\/h\d>/s);
          if (hMatch) {
            parsedContent = { text: hMatch[2], level: parseInt(hMatch[1]) };
          }
          break;
          
        case 'core/list':
          const listItems = [...blockContent.matchAll(/<li>(.*?)<\/li>/gs)];
          parsedContent = { items: listItems.map(item => item[1]) };
          break;
          
        case 'core/quote':
          const quoteMatch = blockContent.match(/<blockquote[^>]*><p>(.*?)<\/p>(?:<cite>(.*?)<\/cite>)?<\/blockquote>/s);
          if (quoteMatch) {
            parsedContent = { text: quoteMatch[1], citation: quoteMatch[2] };
          }
          break;
          
        case 'core/image':
          const imgMatch = blockContent.match(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/);
          const captionMatch = blockContent.match(/<figcaption>(.*?)<\/figcaption>/);
          if (imgMatch) {
            parsedContent = { 
              url: imgMatch[1], 
              alt: imgMatch[2],
              caption: captionMatch ? captionMatch[1] : undefined
            };
          }
          break;
          
        case 'o4o/cpt-acf-loop':
          const dataMatch = blockContent.match(/data-block='([^']+)'/);
          if (dataMatch) {
            try {
              parsedContent = JSON.parse(dataMatch[1]);
            } catch (e) {
              console.error('Failed to parse custom block data:', e);
            }
          }
          break;
          
        default:
          // Try to extract data-block attribute for custom blocks
          const customDataMatch = blockContent.match(/data-block='([^']+)'/);
          if (customDataMatch) {
            try {
              parsedContent = JSON.parse(customDataMatch[1]);
            } catch (e) {
              parsedContent = { raw: blockContent };
            }
          } else {
            parsedContent = { raw: blockContent };
          }
      }
      
      return {
        id: `block-${Date.now()}-${index}`,
        type: blockType,
        content: parsedContent,
        attributes: attributes
      };
    });
  }
  
  // Fallback: treat as plain HTML/text
  return [{
    id: `block-${Date.now()}`,
    type: 'core/paragraph',
    content: { text: content.replace(/<[^>]*>/g, '') }, // Strip HTML tags
    attributes: {}
  }];
};

const serializeBlocksToContent = (blocks: Block[]): string => {
  // Convert blocks to WordPress block format
  return blocks.map(block => {
    const blockName = block.type;
    const attributes = block.attributes || {};
    const content = block.content;
    
    // Generate WordPress block comment format
    let blockHtml = `<!-- wp:${blockName}`;
    
    // Add attributes if any
    if (Object.keys(attributes).length > 0) {
      blockHtml += ` ${JSON.stringify(attributes)}`;
    }
    blockHtml += ' -->\n';
    
    // Add block content based on type
    switch (block.type) {
      case 'core/paragraph':
        blockHtml += `<p>${content.text || ''}</p>`;
        break;
      case 'core/heading':
        const level = content.level || 2;
        blockHtml += `<h${level}>${content.text || ''}</h${level}>`;
        break;
      case 'core/list':
        blockHtml += `<ul>${(content.items || []).map((item: string) => `<li>${item}</li>`).join('\n')}</ul>`;
        break;
      case 'core/quote':
        blockHtml += `<blockquote class="wp-block-quote"><p>${content.text || ''}</p>`;
        if (content.citation) {
          blockHtml += `<cite>${content.citation}</cite>`;
        }
        blockHtml += '</blockquote>';
        break;
      case 'core/image':
        blockHtml += `<figure class="wp-block-image"><img src="${content.url || ''}" alt="${content.alt || ''}"/>`;
        if (content.caption) {
          blockHtml += `<figcaption>${content.caption}</figcaption>`;
        }
        blockHtml += '</figure>';
        break;
      case 'o4o/cpt-acf-loop':
        // For custom blocks, store the full block data as JSON
        blockHtml += `<div class="wp-block-o4o-cpt-acf-loop" data-block='${JSON.stringify(content)}'></div>`;
        break;
      default:
        // For other blocks, store as div with data
        blockHtml += `<div class="wp-block-${blockName.replace('/', '-')}" data-block='${JSON.stringify(content)}'></div>`;
    }
    
    blockHtml += `\n<!-- /wp:${blockName} -->\n`;
    
    return blockHtml;
  }).join('\n');
};

const GutenbergEditor: FC<GutenbergEditorProps> = ({ 
  initialBlocks = [], 
  onChange,
  content,
  onContentChange
}) => {
  // Initialize blocks from content if provided
  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (content) {
      return parseContentToBlocks(content);
    }
    return initialBlocks;
  });
  const [showBlockInserter, setShowBlockInserter] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibraryCallback, setMediaLibraryCallback] = useState<((media: any) => void) | null>(null);
  const [showBlockSettings, setShowBlockSettings] = useState(false);

  const allBlocks = [...CORE_BLOCKS, ...SPECTRA_BLOCKS, ...O4O_BLOCKS];
  const categories = ['all', 'text', 'media', 'design', 'layout', 'social', 'embed', 'o4o'];

  const filteredBlocks = activeCategory === 'all' 
    ? allBlocks 
    : allBlocks.filter(block => block.category === activeCategory);

  const updateBlocks = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    onChange?.(newBlocks);
    onContentChange?.(serializeBlocksToContent(newBlocks));
  };

  const addBlock = (blockType: string) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type: blockType,
      content: getDefaultContent(blockType),
      attributes: {}
    };
    
    const newBlocks = [...blocks, newBlock];
    updateBlocks(newBlocks);
    setShowBlockInserter(false);
  };

  const getDefaultContent = (blockType: string) => {
    switch (blockType) {
      case 'core/paragraph':
        return { text: 'Start writing or type / to choose a block' };
      case 'core/heading':
        return { text: 'Heading', level: 2 };
      case 'uagb/advanced-heading':
        return { text: 'Advanced Heading', level: 2, alignment: 'center' };
      case 'core/image':
        return { url: '', alt: '', caption: '', alignment: 'center', size: 'large' };
      case 'core/gallery':
        return { images: [], columns: 3, imageCrop: true, linkTo: 'none' };
      case 'core/video':
        return { url: '', autoplay: false, loop: false, muted: false, controls: true };
      case 'core/cover':
        return { 
          url: '', 
          overlayColor: 'rgba(0, 0, 0, 0.5)', 
          minHeight: 300, 
          contentAlign: 'center',
          title: 'Cover Title',
          text: 'Cover subtitle text'
        };
      case 'core/columns':
        return { 
          columns: [
            { id: `col-${Date.now()}-1`, content: [], width: 50 },
            { id: `col-${Date.now()}-2`, content: [], width: 50 }
          ]
        };
      case 'core/button':
        return { 
          text: 'Click me', 
          url: '#', 
          target: '_self',
          style: 'fill',
          backgroundColor: '#007cba',
          textColor: '#ffffff',
          borderRadius: 4
        };
      case 'core/spacer':
        return { height: 100 };
      case 'core/separator':
        return { style: 'default', color: '#cccccc' };
      case 'core/code':
        return { content: '// Your code here', language: 'javascript' };
      case 'core/table':
        return { 
          head: [['Column 1', 'Column 2', 'Column 3']],
          body: [
            ['Row 1 Cell 1', 'Row 1 Cell 2', 'Row 1 Cell 3'],
            ['Row 2 Cell 1', 'Row 2 Cell 2', 'Row 2 Cell 3']
          ],
          foot: []
        };
      case 'core/group':
        return { blocks: [], backgroundColor: '', padding: 20 };
      default:
        return {};
    }
  };

  const deleteBlock = (blockId: string) => {
    const newBlocks = blocks.filter(block => block.id !== blockId);
    updateBlocks(newBlocks);
  };

  const duplicateBlock = (blockId: string) => {
    const blockIndex = blocks.findIndex(block => block.id === blockId);
    if (blockIndex !== -1) {
      const blockToDuplicate = blocks[blockIndex];
      const newBlock = {
        ...blockToDuplicate,
        id: `block-${Date.now()}`
      };
      const newBlocks = [
        ...blocks.slice(0, blockIndex + 1),
        newBlock,
        ...blocks.slice(blockIndex + 1)
      ];
      updateBlocks(newBlocks);
    }
  };

  const renderBlock = (block: Block) => {
    const Icon = allBlocks.find(b => b.id === block.type)?.icon || FileText;
    
    return (
      <div
        key={block.id}
        className={clsx(
          'group relative border-2 rounded-lg p-4 mb-4 transition-all',
          selectedBlockId === block.id
            ? 'border-modern-primary bg-modern-primary-alpha'
            : 'border-transparent hover:border-modern-border-primary'
        )}
        onClick={() => setSelectedBlockId(block.id)}
      >
        {/* Block Toolbar */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 bg-modern-bg-card border border-modern-border-primary rounded-lg shadow-modern-shadow p-1">
            <button className="p-1 hover:bg-modern-bg-hover rounded">
              <Move className="w-4 h-4 text-modern-text-secondary" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                duplicateBlock(block.id);
              }}
              className="p-1 hover:bg-modern-bg-hover rounded"
            >
              <Copy className="w-4 h-4 text-modern-text-secondary" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                deleteBlock(block.id);
              }}
              className="p-1 hover:bg-modern-bg-hover rounded"
            >
              <Trash2 className="w-4 h-4 text-modern-error" />
            </button>
            <button className="p-1 hover:bg-modern-bg-hover rounded">
              <MoreVertical className="w-4 h-4 text-modern-text-secondary" />
            </button>
          </div>
        </div>

        {/* Block Content */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-modern-bg-tertiary rounded flex items-center justify-center">
            <Icon className="w-4 h-4 text-modern-text-secondary" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-modern-text-tertiary mb-1">
              {allBlocks.find(b => b.id === block.type)?.name}
            </div>
            {block.type.includes('heading') && (
              <h2 className="text-2xl font-bold text-modern-text-primary">
                {block.content.text}
              </h2>
            )}
            {block.type.includes('paragraph') && (
              <p className="text-modern-text-primary">
                {block.content.text}
              </p>
            )}
            {block.type === 'core/image' && (
              <div className="space-y-2">
                {block.content.url ? (
                  <div className={clsx(
                    'relative',
                    block.content.alignment === 'left' && 'mr-auto',
                    block.content.alignment === 'center' && 'mx-auto',
                    block.content.alignment === 'right' && 'ml-auto',
                    block.content.size === 'thumbnail' && 'max-w-[150px]',
                    block.content.size === 'medium' && 'max-w-[300px]',
                    block.content.size === 'large' && 'max-w-[1024px]',
                    block.content.size === 'full' && 'max-w-full'
                  )}>
                    <img
                      src={block.content.url}
                      alt={block.content.alt || ''}
                      className="w-full h-auto rounded"
                    />
                    {block.content.caption && (
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        {block.content.caption}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaLibraryCallback(() => (media: any) => {
                        const updatedBlock = {
                          ...block,
                          content: {
                            ...block.content,
                            url: media.url,
                            alt: media.alt || media.filename,
                            width: media.width,
                            height: media.height
                          }
                        };
                        const newBlocks = blocks.map(b => 
                          b.id === block.id ? updatedBlock : b
                        );
                        updateBlocks(newBlocks);
                        setShowMediaLibrary(false);
                      });
                      setShowMediaLibrary(true);
                    }}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-modern-primary hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-center">
                      <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <span className="text-sm text-gray-600">미디어 선택</span>
                    </div>
                  </button>
                )}
                {selectedBlockId === block.id && block.content.url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBlockSettings(true);
                    }}
                    className="absolute top-2 right-2 p-1 bg-white rounded shadow hover:bg-gray-100"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {block.type === 'core/gallery' && (
              <div className="space-y-2">
                {block.content.images && block.content.images.length > 0 ? (
                  <div className={clsx(
                    'grid gap-2',
                    block.content.columns === 1 && 'grid-cols-1',
                    block.content.columns === 2 && 'grid-cols-2',
                    block.content.columns === 3 && 'grid-cols-3',
                    block.content.columns === 4 && 'grid-cols-4',
                    block.content.columns === 5 && 'grid-cols-5',
                    block.content.columns === 6 && 'grid-cols-6'
                  )}>
                    {block.content.images.map((image: any, index: number) => (
                      <div key={index} className="relative aspect-square">
                        <img
                          src={image.url || image.thumbnailUrl}
                          alt={image.alt || ''}
                          className={clsx(
                            'w-full h-full rounded',
                            block.content.imageCrop ? 'object-cover' : 'object-contain'
                          )}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaLibraryCallback(() => (media: any) => {
                        const updatedBlock = {
                          ...block,
                          content: {
                            ...block.content,
                            images: [...(block.content.images || []), {
                              id: media.id,
                              url: media.url,
                              thumbnailUrl: media.thumbnailUrl,
                              alt: media.alt || media.filename
                            }]
                          }
                        };
                        const newBlocks = blocks.map(b => 
                          b.id === block.id ? updatedBlock : b
                        );
                        updateBlocks(newBlocks);
                      });
                      setShowMediaLibrary(true);
                    }}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-modern-primary hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-center">
                      <Grid className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <span className="text-sm text-gray-600">갤러리 이미지 추가</span>
                    </div>
                  </button>
                )}
                {selectedBlockId === block.id && block.content.images?.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMediaLibraryCallback(() => (media: any) => {
                          const updatedBlock = {
                            ...block,
                            content: {
                              ...block.content,
                              images: [...block.content.images, {
                                id: media.id,
                                url: media.url,
                                thumbnailUrl: media.thumbnailUrl,
                                alt: media.alt || media.filename
                              }]
                            }
                          };
                          const newBlocks = blocks.map(b => 
                            b.id === block.id ? updatedBlock : b
                          );
                          updateBlocks(newBlocks);
                        });
                        setShowMediaLibrary(true);
                      }}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                    >
                      이미지 추가
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBlockSettings(true);
                      }}
                      className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Cover Block */}
            {block.type === 'core/cover' && (
              <div 
                className="relative rounded-lg overflow-hidden"
                style={{ minHeight: block.content.minHeight || 300 }}
              >
                {block.content.url ? (
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${block.content.url})` }}
                  >
                    <div 
                      className="absolute inset-0"
                      style={{ backgroundColor: block.content.overlayColor }}
                    />
                  </div>
                ) : (
                  <div 
                    className="absolute inset-0"
                    style={{ backgroundColor: block.content.overlayColor || '#000' }}
                  />
                )}
                <div className={clsx(
                  'relative z-10 h-full flex flex-col justify-center p-8 text-white',
                  block.content.contentAlign === 'left' && 'items-start text-left',
                  block.content.contentAlign === 'center' && 'items-center text-center',
                  block.content.contentAlign === 'right' && 'items-end text-right'
                )}>
                  <h2 className="text-3xl font-bold mb-2">{block.content.title}</h2>
                  <p className="text-lg">{block.content.text}</p>
                </div>
                {!block.content.url && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaLibraryCallback(() => (media: any) => {
                        const updatedBlock = {
                          ...block,
                          content: { ...block.content, url: media.url }
                        };
                        const newBlocks = blocks.map(b => 
                          b.id === block.id ? updatedBlock : b
                        );
                        updateBlocks(newBlocks);
                        setShowMediaLibrary(false);
                      });
                      setShowMediaLibrary(true);
                    }}
                    className="absolute top-4 right-4 p-2 bg-white rounded shadow hover:bg-gray-100"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                )}
                {selectedBlockId === block.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBlockSettings(true);
                    }}
                    className="absolute top-4 left-4 p-1 bg-white rounded shadow hover:bg-gray-100"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Button Block */}
            {block.type === 'core/button' && (
              <div className="flex items-center gap-2">
                <a
                  href={block.content.url}
                  target={block.content.target}
                  className={clsx(
                    'inline-flex items-center px-4 py-2 rounded transition-colors',
                    block.content.style === 'fill' && 'text-white',
                    block.content.style === 'outline' && 'border-2'
                  )}
                  style={{
                    backgroundColor: block.content.style === 'fill' ? block.content.backgroundColor : 'transparent',
                    color: block.content.style === 'fill' ? block.content.textColor : block.content.backgroundColor,
                    borderColor: block.content.style === 'outline' ? block.content.backgroundColor : 'transparent',
                    borderRadius: `${block.content.borderRadius}px`
                  }}
                >
                  {block.content.text}
                </a>
                <Link className="w-4 h-4 text-gray-400" />
              </div>
            )}

            {/* Spacer Block */}
            {block.type === 'core/spacer' && (
              <div 
                className="relative border-2 border-dashed border-gray-300 rounded"
                style={{ height: block.content.height }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <span className="text-sm">{block.content.height}px</span>
                </div>
              </div>
            )}

            {/* Separator Block */}
            {block.type === 'core/separator' && (
              <div className="py-4">
                <hr 
                  className={clsx(
                    block.content.style === 'wide' && 'w-full',
                    block.content.style === 'default' && 'w-24 mx-auto',
                    block.content.style === 'dots' && 'border-dotted'
                  )}
                  style={{ borderColor: block.content.color }}
                />
              </div>
            )}

            {/* Code Block */}
            {block.type === 'core/code' && (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code className={`language-${block.content.language}`}>
                  {block.content.content}
                </code>
              </pre>
            )}

            {/* Table Block */}
            {block.type === 'core/table' && (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  {block.content.head.length > 0 && (
                    <thead>
                      {block.content.head.map((row: string[], rowIndex: number) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <th key={cellIndex} className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold">
                              {cell}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                  )}
                  <tbody>
                    {block.content.body.map((row: string[], rowIndex: number) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Video Block */}
            {block.type === 'core/video' && (
              <div className="space-y-2">
                {block.content.url ? (
                  <video
                    src={block.content.url}
                    controls={block.content.controls}
                    autoPlay={block.content.autoplay}
                    loop={block.content.loop}
                    muted={block.content.muted}
                    className="w-full rounded"
                  />
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaLibraryCallback(() => (media: any) => {
                        const updatedBlock = {
                          ...block,
                          content: { ...block.content, url: media.url }
                        };
                        const newBlocks = blocks.map(b => 
                          b.id === block.id ? updatedBlock : b
                        );
                        updateBlocks(newBlocks);
                        setShowMediaLibrary(false);
                      });
                      setShowMediaLibrary(true);
                    }}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-modern-primary hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-center">
                      <Play className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <span className="text-sm text-gray-600">비디오 선택</span>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Columns Block */}
            {block.type === 'core/columns' && (
              <div className="grid gap-4" style={{
                gridTemplateColumns: block.content.columns.map((col: any) => `${col.width}%`).join(' ')
              }}>
                {block.content.columns.map((column: any, index: number) => (
                  <div key={column.id} className="border-2 border-dashed border-gray-300 rounded p-4 min-h-[100px]">
                    <div className="text-sm text-gray-500 mb-2">Column {index + 1}</div>
                    {/* In a real implementation, columns would contain nested blocks */}
                  </div>
                ))}
              </div>
            )}

            {/* Group Block */}
            {block.type === 'core/group' && (
              <div 
                className="border-2 border-dashed border-gray-300 rounded min-h-[100px]"
                style={{
                  backgroundColor: block.content.backgroundColor,
                  padding: `${block.content.padding}px`
                }}
              >
                <div className="text-sm text-gray-500">Group Block</div>
                {/* In a real implementation, groups would contain nested blocks */}
              </div>
            )}

            {/* Add more block type renderers as needed */}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="gutenberg-editor bg-modern-bg-card rounded-lg">
      {/* Editor Toolbar */}
      <div className="border-b border-modern-border-primary p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-modern-text-primary">Block Editor</h3>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm border border-modern-border-primary rounded hover:bg-modern-bg-hover">
              Preview
            </button>
            <button className="px-3 py-1.5 text-sm bg-modern-primary text-white rounded hover:bg-modern-primary-hover">
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="p-8 min-h-[400px]">
        {blocks.map(renderBlock)}
        
        {/* Add Block Button */}
        <div className="relative">
          <button
            onClick={() => setShowBlockInserter(!showBlockInserter)}
            className={clsx(
              'w-full py-4 border-2 border-dashed rounded-lg transition-all',
              'hover:border-modern-primary hover:bg-modern-primary-alpha',
              'flex items-center justify-center gap-2',
              showBlockInserter 
                ? 'border-modern-primary bg-modern-primary-alpha' 
                : 'border-modern-border-secondary'
            )}
          >
            <Plus className="w-5 h-5 text-modern-text-secondary" />
            <span className="text-modern-text-secondary">Add block</span>
          </button>

          {/* Block Inserter Panel */}
          {showBlockInserter && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-modern-bg-card border border-modern-border-primary rounded-lg shadow-modern-shadow-xl z-50">
              <div className="p-4">
                {/* Category Tabs */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-modern-border-primary">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={clsx(
                        'px-3 py-1.5 text-sm rounded transition-colors capitalize',
                        activeCategory === category
                          ? 'bg-modern-primary text-white'
                          : 'text-modern-text-secondary hover:bg-modern-bg-hover'
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Block Grid */}
                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                  {filteredBlocks.map(block => {
                    const Icon = block.icon;
                    return (
                      <button
                        key={block.id}
                        onClick={() => addBlock(block.id)}
                        className="flex flex-col items-center gap-2 p-4 border border-modern-border-primary rounded-lg hover:border-modern-primary hover:bg-modern-bg-hover transition-all"
                      >
                        <Icon className="w-6 h-6 text-modern-text-secondary" />
                        <span className="text-xs text-modern-text-secondary text-center">
                          {block.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 미디어 라이브러리 모달 */}
      <MediaLibraryModal
        isOpen={showMediaLibrary}
        onClose={() => {
          setShowMediaLibrary(false);
          setMediaLibraryCallback(null);
        }}
        onSelect={(media) => {
          if (mediaLibraryCallback) {
            mediaLibraryCallback(media);
          }
        }}
        allowMultiple={blocks.find(b => b.id === selectedBlockId)?.type === 'core/gallery'}
      />

      {/* 블록 설정 패널 */}
      {showBlockSettings && selectedBlockId && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-40">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">블록 설정</h3>
            <button
              onClick={() => setShowBlockSettings(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto h-full">
            {blocks.find(b => b.id === selectedBlockId)?.type === 'core/image' && (
              <ImageBlockSettings
                settings={blocks.find(b => b.id === selectedBlockId)?.content || {}}
                onChange={(newSettings) => {
                  const newBlocks = blocks.map(block => 
                    block.id === selectedBlockId 
                      ? { ...block, content: { ...block.content, ...newSettings } }
                      : block
                  );
                  updateBlocks(newBlocks);
                }}
              />
            )}
            {blocks.find(b => b.id === selectedBlockId)?.type === 'core/gallery' && (
              <GalleryBlockSettings
                settings={blocks.find(b => b.id === selectedBlockId)?.content || {}}
                onChange={(newSettings) => {
                  const newBlocks = blocks.map(block => 
                    block.id === selectedBlockId 
                      ? { ...block, content: { ...block.content, ...newSettings } }
                      : block
                  );
                  updateBlocks(newBlocks);
                }}
              />
            )}
            {blocks.find(b => b.id === selectedBlockId)?.type === 'core/cover' && (
              <CoverBlockSettings
                settings={blocks.find(b => b.id === selectedBlockId)?.content || {}}
                onChange={(newSettings) => {
                  const newBlocks = blocks.map(block => 
                    block.id === selectedBlockId 
                      ? { ...block, content: { ...block.content, ...newSettings } }
                      : block
                  );
                  updateBlocks(newBlocks);
                }}
              />
            )}
            {blocks.find(b => b.id === selectedBlockId)?.type === 'core/button' && (
              <ButtonBlockSettings
                settings={blocks.find(b => b.id === selectedBlockId)?.content || {}}
                onChange={(newSettings) => {
                  const newBlocks = blocks.map(block => 
                    block.id === selectedBlockId 
                      ? { ...block, content: { ...block.content, ...newSettings } }
                      : block
                  );
                  updateBlocks(newBlocks);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GutenbergEditor;