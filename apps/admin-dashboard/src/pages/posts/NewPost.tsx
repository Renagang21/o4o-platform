import { FC, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListOrdered,
  Quote,
  Image,
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
  Table,
  Columns,
  Code2,
  Type,
  Globe,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';
import toast from 'react-hot-toast';

// Block types
type BlockType = 'paragraph' | 'heading' | 'image' | 'quote' | 'list' | 'code' | 'divider' | 'table' | 'columns' | 'embed';

interface Block {
  id: string;
  type: BlockType;
  content: any;
  attributes?: any;
}


const NewPost: FC = () => {
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Post data
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
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
  const [sidebarTab, setSidebarTab] = useState<'document' | 'block'>('document');
  
  // Document settings
  const [visibility, setVisibility] = useState<'public' | 'private' | 'password'>('public');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 16));
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  
  // Undo/Redo history
  const [history, setHistory] = useState<Block[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Block types configuration
  const blockTypes = [
    { type: 'paragraph', icon: Type, label: '단락', description: '텍스트 단락을 추가합니다' },
    { type: 'heading', icon: Heading1, label: '제목', description: '제목을 추가합니다' },
    { type: 'image', icon: Image, label: '이미지', description: '이미지를 업로드하거나 선택합니다' },
    { type: 'list', icon: List, label: '목록', description: '순서 있는/없는 목록을 만듭니다' },
    { type: 'quote', icon: Quote, label: '인용', description: '인용문을 추가합니다' },
    { type: 'code', icon: Code2, label: '코드', description: '코드 블록을 추가합니다' },
    { type: 'table', icon: Table, label: '테이블', description: '표를 추가합니다' },
    { type: 'columns', icon: Columns, label: '컬럼', description: '여러 컬럼 레이아웃을 만듭니다' },
    { type: 'divider', icon: FileText, label: '구분선', description: '구분선을 추가합니다' },
    { type: 'embed', icon: Globe, label: '임베드', description: 'YouTube, Twitter 등을 임베드합니다' }
  ];

  // Add new block
  const addBlock = (type: BlockType, position?: number) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type,
      content: type === 'list' ? [''] : '',
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

  const getDefaultAttributes = (type: BlockType) => {
    switch (type) {
      case 'heading':
        return { level: 2, align: 'left' };
      case 'paragraph':
        return { align: 'left', dropCap: false };
      case 'list':
        return { ordered: false };
      case 'image':
        return { align: 'center', size: 'large' };
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

  // Save post
  const savePost = async (publish = false) => {
    try {
      // TODO: Implement API call to save post
      // const postData = {
      //   title,
      //   excerpt,
      //   content: JSON.stringify(blocks),
      //   status: publish ? 'publish' : 'draft',
      //   visibility,
      //   publishDate,
      //   category,
      //   tags,
      //   featuredImage,
      //   allowComments
      // };
      
      toast.success(publish ? '게시물이 발행되었습니다!' : '초안이 저장되었습니다!');
      
      if (publish) {
        navigate('/posts');
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
            savePost(false);
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
  }, [blocks, title, excerpt]);

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
      
      case 'list':
        return (
          <div className="space-y-1">
            {(block.content as string[]).map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="mt-1">
                  {block.attributes?.ordered ? `${index + 1}.` : '•'}
                </span>
                <div
                  className="flex-1 outline-none"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newItems = [...(block.content as string[])];
                    newItems[index] = e.currentTarget.textContent || '';
                    updateBlock(block.id, newItems);
                  }}
                  dangerouslySetInnerHTML={{ __html: item || '<br>' }}
                />
              </div>
            ))}
            <button
              onClick={() => {
                const newItems = [...(block.content as string[]), ''];
                updateBlock(block.id, newItems);
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + 항목 추가
            </button>
          </div>
        );
      
      case 'quote':
        return (
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700">
            <div
              className="outline-none"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent)}
              dangerouslySetInnerHTML={{ __html: block.content || '<br>' }}
            />
          </blockquote>
        );
      
      case 'code':
        return (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code
              className="outline-none font-mono text-sm"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent)}
              dangerouslySetInnerHTML={{ __html: block.content || '' }}
            />
          </pre>
        );
      
      case 'divider':
        return <hr className="border-gray-300 my-4" />;
      
      case 'image':
        return (
          <div className={`my-4 ${block.attributes?.align === 'center' ? 'text-center' : ''}`}>
            {block.content?.url ? (
              <figure>
                <img 
                  src={block.content.url} 
                  alt={block.content.alt}
                  className={`max-w-full h-auto ${
                    block.attributes?.align === 'center' ? 'mx-auto' : ''
                  }`}
                />
                {block.content.caption && (
                  <figcaption className="text-sm text-gray-600 mt-2">
                    {block.content.caption}
                  </figcaption>
                )}
              </figure>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">이미지를 업로드하거나 URL을 입력하세요</p>
                <button className="mt-2 text-blue-600 hover:text-blue-700">
                  미디어 라이브러리
                </button>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/posts')}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600">새 글 추가</span>
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
            onClick={() => savePost(false)}
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
            onClick={() => savePost(true)}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            발행
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
        <div className="max-w-4xl mx-auto p-8">
          {/* Title */}
          <input
            type="text"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold border-0 outline-none mb-4 bg-transparent placeholder-gray-400"
          />
          
          {/* Excerpt */}
          <textarea
            placeholder="요약 (선택사항)"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="w-full text-lg text-gray-600 border-0 outline-none mb-8 bg-transparent placeholder-gray-400 resize-none"
            rows={2}
          />
          
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
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
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
                
                <div className="p-4 grid grid-cols-3 gap-3 overflow-y-auto">
                  {blockTypes.map((blockType) => (
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
              onClick={() => setSidebarTab('document')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                sidebarTab === 'document'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              문서
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
            {sidebarTab === 'document' ? (
              <>
                {/* Status & Visibility */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">상태 및 공개</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">공개 상태</label>
                      <select
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value as any)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="public">공개</option>
                        <option value="private">비공개</option>
                        <option value="password">비밀번호 보호</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm text-gray-600">발행</label>
                      <input
                        type="datetime-local"
                        value={publishDate}
                        onChange={(e) => setPublishDate(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Categories */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">카테고리</h4>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">카테고리 선택</option>
                    <option value="tech">기술</option>
                    <option value="design">디자인</option>
                    <option value="business">비즈니스</option>
                    <option value="lifestyle">라이프스타일</option>
                  </select>
                </div>
                
                {/* Tags */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">태그</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-sm rounded-full flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => setTags(tags.filter((_, i) => i !== index))}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="태그 추가..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        setTags([...tags, e.currentTarget.value]);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
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
                
                {/* Discussion */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">토론</h4>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allowComments}
                      onChange={(e) => setAllowComments(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">댓글 허용</span>
                  </label>
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
                      
                      switch (selectedBlock.type) {
                        case 'heading':
                          return (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm text-gray-600">레벨</label>
                                <select
                                  value={selectedBlock.attributes?.level || 2}
                                  onChange={(e) => {
                                    updateBlock(
                                      selectedBlockId,
                                      selectedBlock.content,
                                      { ...selectedBlock.attributes, level: parseInt(e.target.value) }
                                    );
                                  }}
                                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                >
                                  <option value={1}>제목 1</option>
                                  <option value={2}>제목 2</option>
                                  <option value={3}>제목 3</option>
                                  <option value={4}>제목 4</option>
                                  <option value={5}>제목 5</option>
                                  <option value={6}>제목 6</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-sm text-gray-600">정렬</label>
                                <div className="mt-1 flex gap-1">
                                  <button
                                    onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, align: 'left' })}
                                    className={`p-2 border rounded ${selectedBlock.attributes?.align === 'left' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                  >
                                    <AlignLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, align: 'center' })}
                                    className={`p-2 border rounded ${selectedBlock.attributes?.align === 'center' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                  >
                                    <AlignCenter className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, align: 'right' })}
                                    className={`p-2 border rounded ${selectedBlock.attributes?.align === 'right' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                  >
                                    <AlignRight className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        
                        case 'paragraph':
                          return (
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm text-gray-600">정렬</label>
                                <div className="mt-1 flex gap-1">
                                  <button
                                    onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, align: 'left' })}
                                    className={`p-2 border rounded ${selectedBlock.attributes?.align === 'left' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                  >
                                    <AlignLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, align: 'center' })}
                                    className={`p-2 border rounded ${selectedBlock.attributes?.align === 'center' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                  >
                                    <AlignCenter className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, align: 'right' })}
                                    className={`p-2 border rounded ${selectedBlock.attributes?.align === 'right' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                  >
                                    <AlignRight className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, align: 'justify' })}
                                    className={`p-2 border rounded ${selectedBlock.attributes?.align === 'justify' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                  >
                                    <AlignJustify className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedBlock.attributes?.dropCap || false}
                                  onChange={(e) => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, dropCap: e.target.checked })}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">첫 글자 크게</span>
                              </label>
                            </div>
                          );
                        
                        case 'list':
                          return (
                            <div>
                              <label className="text-sm text-gray-600">목록 유형</label>
                              <div className="mt-1 flex gap-2">
                                <button
                                  onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, ordered: false })}
                                  className={`flex-1 p-2 border rounded ${!selectedBlock.attributes?.ordered ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                >
                                  <List className="w-4 h-4 mx-auto" />
                                </button>
                                <button
                                  onClick={() => updateBlock(selectedBlockId, selectedBlock.content, { ...selectedBlock.attributes, ordered: true })}
                                  className={`flex-1 p-2 border rounded ${selectedBlock.attributes?.ordered ? 'bg-blue-50 border-blue-500' : 'border-gray-300'}`}
                                >
                                  <ListOrdered className="w-4 h-4 mx-auto" />
                                </button>
                              </div>
                            </div>
                          );
                        
                        default:
                          return <p className="text-sm text-gray-500">이 블록 유형에 대한 설정이 없습니다.</p>;
                      }
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

export default NewPost;