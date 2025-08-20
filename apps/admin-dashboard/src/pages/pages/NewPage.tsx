import { FC, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  Quote,
  Image,
  Video,
  FileText,
  Heading1,
  Plus,
  Move,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings,
  Eye,
  Save,
  X,
  Undo,
  Redo,
  Columns,
  Layout,
  Grid,
  Box,
  Zap,
  Type,
  BookOpen,
  Map,
  Navigation,
  Code,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

// Block types for pages
type BlockType = 'paragraph' | 'heading' | 'image' | 'quote' | 'list' | 'code' | 'divider' | 'table' | 'columns' | 'hero' | 'features' | 'cta' | 'testimonial' | 'faq' | 'gallery' | 'spacer';

interface Block {
  id: string;
  type: BlockType;
  content: any;
  attributes?: any;
}

const NewPage: FC = () => {
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Page data
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: '1',
      type: 'paragraph',
      content: '',
      attributes: { align: 'left' }
    }
  ]);
  
  // Editor state
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockInserter, setShowBlockInserter] = useState(false);
  const [inserterPosition, setInserterPosition] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'page' | 'block'>('page');
  
  // Page settings
  const [status, setStatus] = useState<'draft' | 'published' | 'private' | 'scheduled'>('draft');
  const [template, setTemplate] = useState<string>('default');
  const [parentPage, setParentPage] = useState<string>('');
  const [menuOrder, setMenuOrder] = useState(0);
  const [showInMenu, setShowInMenu] = useState(true);
  const [isHomepage, setIsHomepage] = useState(false);
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 16));
  const [featuredImage, setFeaturedImage] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  
  // Undo/Redo history
  const [history, setHistory] = useState<Block[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Block types configuration - More options for pages
  const blockCategories = [
    {
      category: '텍스트',
      blocks: [
        { type: 'paragraph', icon: Type, label: '단락', description: '텍스트 단락을 추가합니다' },
        { type: 'heading', icon: Heading1, label: '제목', description: '제목을 추가합니다' },
        { type: 'list', icon: List, label: '목록', description: '순서 있는/없는 목록을 만듭니다' },
        { type: 'quote', icon: Quote, label: '인용', description: '인용문을 추가합니다' },
        { type: 'code', icon: Code, label: '코드', description: '코드 블록을 추가합니다' }
      ]
    },
    {
      category: '미디어',
      blocks: [
        { type: 'image', icon: Image, label: '이미지', description: '이미지를 업로드하거나 선택합니다' },
        { type: 'gallery', icon: Grid, label: '갤러리', description: '이미지 갤러리를 만듭니다' },
        { type: 'video', icon: Video, label: '비디오', description: '비디오를 임베드합니다' }
      ]
    },
    {
      category: '레이아웃',
      blocks: [
        { type: 'columns', icon: Columns, label: '컬럼', description: '여러 컬럼 레이아웃을 만듭니다' },
        { type: 'spacer', icon: Layout, label: '공백', description: '블록 사이에 공백을 추가합니다' },
        { type: 'divider', icon: FileText, label: '구분선', description: '구분선을 추가합니다' }
      ]
    },
    {
      category: '섹션',
      blocks: [
        { type: 'hero', icon: Zap, label: '히어로', description: '페이지 상단 히어로 섹션' },
        { type: 'features', icon: Box, label: '기능', description: '기능 소개 섹션' },
        { type: 'cta', icon: Navigation, label: 'CTA', description: 'Call-to-Action 섹션' },
        { type: 'testimonial', icon: Users, label: '후기', description: '고객 후기 섹션' },
        { type: 'faq', icon: BookOpen, label: 'FAQ', description: '자주 묻는 질문 섹션' }
      ]
    }
  ];

  // Page templates
  const pageTemplates = [
    { id: 'default', name: '기본 템플릿', icon: FileText },
    { id: 'landing', name: '랜딩 페이지', icon: Zap },
    { id: 'about', name: '소개 페이지', icon: Users },
    { id: 'contact', name: '연락처 페이지', icon: Map },
    { id: 'services', name: '서비스 페이지', icon: Box },
    { id: 'portfolio', name: '포트폴리오', icon: Grid },
    { id: 'blog', name: '블로그 레이아웃', icon: BookOpen }
  ];

  // Generate slug from title
  useEffect(() => {
    if (title && !slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [title, slug]);

  // Add new block
  const addBlock = (type: BlockType, position?: number) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: getDefaultContent(type),
      attributes: getDefaultAttributes(type)
    };

    const newBlocks = [...blocks];
    if (position !== undefined) {
      newBlocks.splice(position, 0, newBlock);
    } else {
      newBlocks.push(newBlock);
    }
    
    setBlocks(newBlocks);
    setShowBlockInserter(false);
    setInserterPosition(null);
    setSelectedBlockId(newBlock.id);
    
    // Add to history
    addToHistory(newBlocks);
  };

  const getDefaultContent = (type: BlockType) => {
    switch (type) {
      case 'list':
        return [''];
      case 'hero':
        return {
          title: '멋진 제목을 입력하세요',
          subtitle: '부제목을 입력하세요',
          buttonText: '시작하기',
          buttonUrl: '#',
          backgroundImage: ''
        };
      case 'features':
        return [
          { icon: '🚀', title: '빠른 속도', description: '놀라운 성능을 경험하세요' },
          { icon: '🎨', title: '아름다운 디자인', description: '눈길을 사로잡는 디자인' },
          { icon: '🔒', title: '안전한 보안', description: '데이터를 안전하게 보호합니다' }
        ];
      case 'cta':
        return {
          title: '지금 시작하세요',
          description: '오늘 가입하고 특별 혜택을 받으세요',
          buttonText: '무료로 시작하기',
          buttonUrl: '#'
        };
      case 'testimonial':
        return {
          quote: '정말 훌륭한 서비스입니다!',
          author: '김철수',
          role: 'CEO, 회사명'
        };
      case 'faq':
        return [
          { question: '자주 묻는 질문 1', answer: '답변 내용을 입력하세요' },
          { question: '자주 묻는 질문 2', answer: '답변 내용을 입력하세요' }
        ];
      case 'gallery':
        return { images: [] };
      default:
        return '';
    }
  };

  const getDefaultAttributes = (type: BlockType) => {
    switch (type) {
      case 'heading':
        return { level: 2, align: 'left' };
      case 'paragraph':
        return { align: 'left', fontSize: 'normal' };
      case 'list':
        return { ordered: false };
      case 'image':
        return { align: 'center', size: 'large' };
      case 'columns':
        return { columns: 2, gap: 'medium' };
      case 'spacer':
        return { height: 50 };
      case 'hero':
        return { height: 'large', overlay: true, overlayColor: 'dark' };
      case 'features':
        return { columns: 3, style: 'boxed' };
      default:
        return {};
    }
  };

  // Update block content
  const updateBlock = (blockId: string, content: any, attributes?: any) => {
    const newBlocks = blocks.map(block => 
      block.id === blockId 
        ? { ...block, content, ...(attributes && { attributes }) }
        : block
    );
    setBlocks(newBlocks);
    addToHistory(newBlocks);
  };

  // Delete block
  const deleteBlock = (blockId: string) => {
    if (blocks.length === 1) {
      toast.error('최소 하나의 블록이 필요합니다');
      return;
    }
    
    const newBlocks = blocks.filter(block => block.id !== blockId);
    setBlocks(newBlocks);
    setSelectedBlockId(null);
    addToHistory(newBlocks);
  };

  // Move block
  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(block => block.id === blockId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    
    setBlocks(newBlocks);
    addToHistory(newBlocks);
  };

  // Duplicate block
  const duplicateBlock = (blockId: string) => {
    const blockToDuplicate = blocks.find(block => block.id === blockId);
    if (!blockToDuplicate) return;

    const newBlock = {
      ...blockToDuplicate,
      id: Date.now().toString()
    };

    const index = blocks.findIndex(block => block.id === blockId);
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    
    setBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
    addToHistory(newBlocks);
  };

  // History management
  const addToHistory = (newBlocks: Block[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBlocks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setBlocks(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setBlocks(history[historyIndex + 1]);
    }
  };

  // Save page
  const savePage = async (publish = false) => {
    try {
      // TODO: Implement API call to save page
      // const pageData = {
      //   title,
      //   slug,
      //   content: JSON.stringify(blocks),
      //   status: publish ? 'published' : 'draft',
      //   template,
      //   parentPage,
      //   menuOrder,
      //   showInMenu,
      //   isHomepage,
      //   publishDate,
      //   featuredImage,
      //   metaTitle: metaTitle || title,
      //   metaDescription,
      //   metaKeywords
      // };
      
      toast.success(publish ? '페이지가 게시되었습니다!' : '초안이 저장되었습니다!');
      
      if (publish) {
        navigate('/pages');
      }
    } catch (error) {
      toast.error('저장 중 오류가 발생했습니다');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            savePage(false);
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [blocks, title, slug]);

  // Render block content
  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <div 
            className={`outline-none text-base leading-7 ${
              block.attributes?.align ? `text-${block.attributes.align}` : ''
            }`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent)}
            dangerouslySetInnerHTML={{ __html: block.content || '<br>' }}
          />
        );
      
      case 'heading':
        const HeadingTag = `h${block.attributes?.level || 2}` as keyof JSX.IntrinsicElements;
        const headingClasses: Record<number, string> = {
          1: 'text-4xl font-bold',
          2: 'text-3xl font-bold',
          3: 'text-2xl font-semibold',
          4: 'text-xl font-semibold',
          5: 'text-lg font-medium',
          6: 'text-base font-medium'
        };
        
        return (
          <HeadingTag
            className={`outline-none ${headingClasses[block.attributes?.level || 2]} ${
              block.attributes?.align ? `text-${block.attributes.align}` : ''
            }`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent)}
            dangerouslySetInnerHTML={{ __html: block.content || '<br>' }}
          />
        );
      
      case 'hero':
        return (
          <div className={`relative bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl overflow-hidden ${
            block.attributes?.height === 'large' ? 'py-32' : 'py-20'
          }`}>
            {block.content.backgroundImage && (
              <img 
                src={block.content.backgroundImage} 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}
            <div className="relative z-10 max-w-4xl mx-auto text-center px-8">
              <h1 
                className="text-5xl font-bold mb-4 outline-none"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateBlock(block.id, { ...block.content, title: e.currentTarget.textContent })}
                dangerouslySetInnerHTML={{ __html: block.content.title }}
              />
              <p 
                className="text-xl mb-8 outline-none"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateBlock(block.id, { ...block.content, subtitle: e.currentTarget.textContent })}
                dangerouslySetInnerHTML={{ __html: block.content.subtitle }}
              />
              <button className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                {block.content.buttonText}
              </button>
            </div>
          </div>
        );
      
      case 'features':
        return (
          <div className={`grid grid-cols-1 md:grid-cols-${block.attributes?.columns || 3} gap-8`}>
            {(block.content as any[]).map((feature, index) => (
              <div key={index} className={`text-center ${
                block.attributes?.style === 'boxed' ? 'p-6 bg-white rounded-lg shadow-sm border border-gray-200' : ''
              }`}>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 
                  className="text-xl font-semibold mb-2 outline-none"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newFeatures = [...block.content];
                    newFeatures[index].title = e.currentTarget.textContent;
                    updateBlock(block.id, newFeatures);
                  }}
                  dangerouslySetInnerHTML={{ __html: feature.title }}
                />
                <p 
                  className="text-gray-600 outline-none"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newFeatures = [...block.content];
                    newFeatures[index].description = e.currentTarget.textContent;
                    updateBlock(block.id, newFeatures);
                  }}
                  dangerouslySetInnerHTML={{ __html: feature.description }}
                />
              </div>
            ))}
          </div>
        );
      
      case 'cta':
        return (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-12 text-center">
            <h2 
              className="text-3xl font-bold mb-4 outline-none"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block.id, { ...block.content, title: e.currentTarget.textContent })}
              dangerouslySetInnerHTML={{ __html: block.content.title }}
            />
            <p 
              className="text-lg text-gray-600 mb-8 outline-none"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block.id, { ...block.content, description: e.currentTarget.textContent })}
              dangerouslySetInnerHTML={{ __html: block.content.description }}
            />
            <button className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              {block.content.buttonText}
            </button>
          </div>
        );
      
      case 'spacer':
        return (
          <div 
            style={{ height: `${block.attributes?.height || 50}px` }}
            className="relative group"
          >
            <div className="absolute inset-0 border-2 border-dashed border-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      
      case 'divider':
        return <hr className="border-gray-300 my-8" />;
      
      default:
        return renderBlock({ ...block, type: 'paragraph' });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/pages')}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">새 페이지 추가</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            title="실행 취소 (Ctrl+Z)"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            title="다시 실행 (Ctrl+Shift+Z)"
          >
            <Redo className="w-5 h-5" />
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-2" />
          
          <button
            onClick={() => savePage(false)}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <Save className="w-4 h-4 inline mr-2" />
            초안 저장
          </button>
          
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            <Eye className="w-4 h-4 inline mr-2" />
            미리보기
          </button>
          
          <button
            onClick={() => savePage(true)}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            게시
          </button>
          
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 text-gray-600 hover:text-gray-900"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className={`flex-1 mt-14 transition-all duration-300 ${showSidebar ? 'mr-80' : ''}`}>
        <div className="max-w-5xl mx-auto p-8">
          {/* Title & Slug */}
          <div className="mb-8 bg-white rounded-lg p-6 shadow-sm">
            <input
              type="text"
              placeholder="페이지 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-4xl font-bold border-0 outline-none mb-4 bg-transparent placeholder-gray-400"
            />
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">주소:</span>
              <span className="text-gray-400">{window.location.origin}/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 text-blue-600 border-0 outline-none bg-transparent"
                placeholder="page-url"
              />
            </div>
          </div>
          
          {/* Blocks */}
          <div className="space-y-2" ref={editorRef}>
            {blocks.map((block, index) => (
              <div
                key={block.id}
                className={`group relative ${
                  selectedBlockId === block.id ? 'ring-2 ring-blue-500 rounded' : ''
                }`}
                onClick={() => setSelectedBlockId(block.id)}
              >
                {/* Block Toolbar */}
                {selectedBlockId === block.id && (
                  <div className="absolute -left-12 top-0 flex flex-col gap-1">
                    <button
                      onClick={() => moveBlock(block.id, 'up')}
                      className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      title="위로 이동"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveBlock(block.id, 'down')}
                      className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      title="아래로 이동"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50 cursor-move"
                      title="드래그하여 이동"
                    >
                      <Move className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Block Actions */}
                {selectedBlockId === block.id && (
                  <div className="absolute -right-12 top-0 flex flex-col gap-1">
                    <button
                      onClick={() => duplicateBlock(block.id)}
                      className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      title="복제"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-red-600"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Block Content */}
                <div className="p-4 bg-white rounded">
                  {renderBlock(block)}
                </div>
                
                {/* Add Block Button */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setInserterPosition(index + 1);
                      setShowBlockInserter(true);
                    }}
                    className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Block Inserter */}
          {showBlockInserter && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">블록 추가</h3>
                  <button
                    onClick={() => {
                      setShowBlockInserter(false);
                      setInserterPosition(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                  {blockCategories.map((category) => (
                    <div key={category.category} className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">{category.category}</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {category.blocks.map((blockType) => (
                          <button
                            key={blockType.type}
                            onClick={() => addBlock(blockType.type as BlockType, inserterPosition || undefined)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-colors"
                          >
                            <blockType.icon className="w-6 h-6 mb-2 text-gray-600" />
                            <div className="font-medium text-sm">{blockType.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{blockType.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed right-0 top-14 bottom-0 w-80 bg-white border-l border-gray-200 overflow-y-auto">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSidebarTab('page')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                sidebarTab === 'page'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              페이지
            </button>
            <button
              onClick={() => setSidebarTab('block')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                sidebarTab === 'block'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              disabled={!selectedBlockId}
            >
              블록
            </button>
          </div>
          
          {/* Sidebar Content */}
          <div className="p-4 space-y-6">
            {sidebarTab === 'page' ? (
              <>
                {/* Page Template */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">페이지 템플릿</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {pageTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setTemplate(tpl.id)}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          template === tpl.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <tpl.icon className="w-5 h-5 mb-1 text-gray-600" />
                        <div className="text-xs font-medium">{tpl.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Page Attributes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">페이지 속성</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">상위 페이지</label>
                      <select
                        value={parentPage}
                        onChange={(e) => setParentPage(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">없음 (최상위)</option>
                        <option value="about">회사 소개</option>
                        <option value="services">서비스</option>
                        <option value="portfolio">포트폴리오</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">순서</label>
                      <input
                        type="number"
                        value={menuOrder}
                        onChange={(e) => setMenuOrder(parseInt(e.target.value))}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showInMenu}
                        onChange={(e) => setShowInMenu(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">메뉴에 표시</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isHomepage}
                        onChange={(e) => setIsHomepage(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">홈페이지로 설정</span>
                    </label>
                  </div>
                </div>
                
                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">상태</h4>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="draft">초안</option>
                    <option value="published">게시됨</option>
                    <option value="private">비공개</option>
                    <option value="scheduled">예약</option>
                  </select>
                  
                  {status === 'scheduled' && (
                    <input
                      type="datetime-local"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  )}
                </div>
                
                {/* Featured Image */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">대표 이미지</h4>
                  {featuredImage ? (
                    <div className="relative">
                      <img
                        src={featuredImage}
                        alt="Featured"
                        className="w-full h-32 object-cover rounded-md"
                      />
                      <button
                        onClick={() => setFeaturedImage('')}
                        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button className="w-full py-8 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400">
                      대표 이미지 설정
                    </button>
                  )}
                </div>
                
                {/* SEO */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">SEO 설정</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">메타 제목</label>
                      <input
                        type="text"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder={title || '페이지 제목'}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">메타 설명</label>
                      <textarea
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        rows={3}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">키워드</label>
                      <input
                        type="text"
                        value={metaKeywords}
                        onChange={(e) => setMetaKeywords(e.target.value)}
                        placeholder="키워드1, 키워드2, ..."
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Block Settings */}
                {selectedBlockId && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">블록 설정</h4>
                    {(() => {
                      const selectedBlock = blocks.find(b => b.id === selectedBlockId);
                      if (!selectedBlock) return null;
                      
                      // Similar block settings as in NewPost component
                      // Add specific settings for page blocks like hero, features, etc.
                      
                      return (
                        <p className="text-sm text-gray-500">
                          {selectedBlock.type} 블록이 선택되었습니다
                        </p>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NewPage;