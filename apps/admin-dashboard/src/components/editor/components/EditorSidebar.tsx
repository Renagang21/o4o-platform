import { FC, useState } from 'react';
import { 
  FileText, 
  Settings2, 
  ChevronDown,
  Palette,
  Type,
  Box,
  Smartphone
} from 'lucide-react';
import { ResponsiveControls } from './ResponsiveControls';
import { useResponsive } from '../hooks/useResponsive';
import type { Block, ThemeConfig } from '../types';

interface EditorSidebarProps {
  selectedBlock: Block | undefined;
  onUpdateBlock: (id: string, updates: Partial<Block>) => void;
  theme: ThemeConfig | null;
}

export const EditorSidebar: FC<EditorSidebarProps> = ({
  selectedBlock,
  onUpdateBlock,
  theme
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'block'>('document');
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set(['status']));

  const togglePanel = (panelId: string) => {
    const newPanels = new Set(openPanels);
    if (newPanels.has(panelId)) {
      newPanels.delete(panelId);
    } else {
      newPanels.add(panelId);
    }
    setOpenPanels(newPanels);
  };

  return (
    <div className="editor-sidebar w-72 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* 탭 전환 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('document')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'document' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          문서
        </button>
        <button
          onClick={() => setActiveTab('block')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'block' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Settings2 className="w-4 h-4 inline mr-2" />
          블록
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'document' ? (
          <DocumentSettings theme={theme} />
        ) : (
          <BlockSettings 
            block={selectedBlock}
            onUpdate={selectedBlock ? (updates) => onUpdateBlock(selectedBlock.id, updates) : () => {}}
            theme={theme}
            openPanels={openPanels}
            togglePanel={togglePanel}
          />
        )}
      </div>
    </div>
  );
};

// 문서 설정 컴포넌트
const DocumentSettings: FC<{ theme: ThemeConfig | null }> = () => {
  return (
    <div className="p-4 space-y-4">
      {/* 상태 & 공개 설정 */}
      <PanelSection title="상태 & 공개 설정" defaultOpen>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">공개 상태</label>
            <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>공개</option>
              <option>비공개</option>
              <option>비밀번호 보호</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">발행일</label>
            <input 
              type="datetime-local" 
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </PanelSection>

      {/* 카테고리 */}
      <PanelSection title="카테고리">
        <div className="space-y-2">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm">일반</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm">뉴스</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            <span className="text-sm">공지사항</span>
          </label>
        </div>
      </PanelSection>

      {/* 태그 */}
      <PanelSection title="태그">
        <input 
          type="text" 
          placeholder="태그 추가..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </PanelSection>

      {/* 대표 이미지 */}
      <PanelSection title="대표 이미지">
        <button className="w-full py-8 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
          이미지 설정
        </button>
      </PanelSection>
    </div>
  );
};

// 블록 설정 컴포넌트
const BlockSettings: FC<{
  block: Block | undefined;
  onUpdate: (updates: Partial<Block>) => void;
  theme: ThemeConfig | null;
  openPanels: Set<string>;
  togglePanel: (panelId: string) => void;
}> = ({ block, onUpdate, theme, openPanels, togglePanel }) => {
  // 반응형 훅 사용
  const {
    currentBreakpoint,
    setBlockResponsive,
    blockConfigs
  } = useResponsive();
  if (!block) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">블록을 선택하여 설정을 편집하세요</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* 블록 타입 표시 */}
      <div className="pb-2 border-b border-gray-200">
        <p className="text-xs text-gray-500">선택된 블록</p>
        <p className="text-sm font-medium capitalize">{block.type} 블록</p>
      </div>

      {/* 타이포그래피 설정 */}
      {['paragraph', 'heading', 'list'].includes(block.type) && (
        <PanelSection 
          title="타이포그래피" 
          icon={<Type className="w-4 h-4" />}
          isOpen={openPanels.has('typography')}
          onToggle={() => togglePanel('typography')}
        >
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">크기</label>
              <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option>기본</option>
                <option>작게</option>
                <option>크게</option>
                <option>매우 크게</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">정렬</label>
              <div className="mt-1 flex gap-1">
                <button className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md hover:bg-gray-50">왼쪽</button>
                <button className="flex-1 px-3 py-2 border-t border-b border-gray-300 hover:bg-gray-50">가운데</button>
                <button className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md hover:bg-gray-50">오른쪽</button>
              </div>
            </div>
          </div>
        </PanelSection>
      )}

      {/* 색상 설정 */}
      <PanelSection 
        title="색상" 
        icon={<Palette className="w-4 h-4" />}
        isOpen={openPanels.has('color')}
        onToggle={() => togglePanel('color')}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">텍스트 색상</label>
            <div className="grid grid-cols-6 gap-2">
              {theme?.colors?.palette?.map((color, index) => (
                <button
                  key={index}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: color }}
                  onClick={() => onUpdate({ 
                    attributes: { 
                      ...block.attributes, 
                      textColor: color 
                    } 
                  })}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">배경 색상</label>
            <div className="grid grid-cols-6 gap-2">
              {theme?.colors?.palette?.map((color, index) => (
                <button
                  key={index}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: color }}
                  onClick={() => onUpdate({ 
                    attributes: { 
                      ...block.attributes, 
                      backgroundColor: color 
                    } 
                  })}
                />
              ))}
            </div>
          </div>
        </div>
      </PanelSection>

      {/* 간격 설정 */}
      <PanelSection 
        title="간격" 
        icon={<Box className="w-4 h-4" />}
        isOpen={openPanels.has('spacing')}
        onToggle={() => togglePanel('spacing')}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">패딩</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              className="mt-1 w-full"
              onChange={(e) => onUpdate({ 
                attributes: { 
                  ...block.attributes, 
                  padding: e.target.value 
                } 
              })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">마진</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              className="mt-1 w-full"
              onChange={(e) => onUpdate({ 
                attributes: { 
                  ...block.attributes, 
                  margin: e.target.value 
                } 
              })}
            />
          </div>
        </div>
      </PanelSection>

      {/* 반응형 설정 */}
      <PanelSection
        title="반응형"
        icon={<Smartphone className="w-4 h-4" />}
        isOpen={openPanels.has('responsive')}
        onToggle={() => togglePanel('responsive')}
      >
        <ResponsiveControls
          blockId={block.id}
          currentBreakpoint={currentBreakpoint}
          onBreakpointChange={() => {
            // 브레이크포인트 변경 처리
          }}
          onVisibilityChange={(bp, visibility) => {
            setBlockResponsive(block.id, bp, { breakpoint: bp, visibility });
          }}
          onStyleChange={(bp, styles) => {
            setBlockResponsive(block.id, bp, { 
              breakpoint: bp, 
              customStyles: styles 
            });
          }}
          blockConfigs={blockConfigs}
        />
      </PanelSection>

      {/* 고급 설정 */}
      <PanelSection 
        title="고급" 
        icon={<Settings2 className="w-4 h-4" />}
        isOpen={openPanels.has('advanced')}
        onToggle={() => togglePanel('advanced')}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">HTML 앵커</label>
            <input 
              type="text" 
              placeholder="ID"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={block.attributes?.anchor || ''}
              onChange={(e) => onUpdate({ 
                attributes: { 
                  ...block.attributes, 
                  anchor: e.target.value 
                } 
              })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">CSS 클래스</label>
            <input 
              type="text" 
              placeholder="추가 CSS 클래스"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={block.attributes?.className || ''}
              onChange={(e) => onUpdate({ 
                attributes: { 
                  ...block.attributes, 
                  className: e.target.value 
                } 
              })}
            />
          </div>
        </div>
      </PanelSection>
    </div>
  );
};

// 패널 섹션 컴포넌트
const PanelSection: FC<{
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}> = ({ title, icon, children, defaultOpen = false, isOpen, onToggle }) => {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const open = isOpen !== undefined ? isOpen : localOpen;
  const toggle = onToggle || (() => setLocalOpen(!localOpen));

  return (
    <div className="border border-gray-200 rounded-md">
      <button
        onClick={toggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon}
          {title}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};