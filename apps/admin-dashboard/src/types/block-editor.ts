// 블록 에디터 타입 정의
export interface BlockType {
  id: string;
  type: 'paragraph' | 'heading' | 'image' | 'list';
  content: any;
  attributes: Record<string, any>;
  metadata: {
    created: Date;
    modified: Date;
    version: number;
  };
}

// 에디터 상태 관리 구조
export interface EditorState {
  blocks: BlockType[];
  selectedBlockId: string | null;
  isDragging: boolean;
  history: EditorSnapshot[];
  historyIndex: number;
  isLoading: boolean;
  error: string | null;
}

// 에디터 스냅샷 (Undo/Redo용)
export interface EditorSnapshot {
  blocks: BlockType[];
  timestamp: Date;
  description: string;
}

// 블록 정의 인터페이스
export interface BlockDefinition {
  name: string;
  title: string;
  icon: React.ComponentType;
  category: 'text' | 'media' | 'design' | 'widgets';
  attributes: Record<string, AttributeDefinition>;
  component: React.ComponentType<BlockProps>;
  inspector: React.ComponentType<BlockInspectorProps>;
  defaultAttributes: Record<string, any>;
}

// 속성 정의
export interface AttributeDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default: any;
  required?: boolean;
  validation?: (value: any) => boolean;
}

// 블록 컴포넌트 Props
export interface BlockProps {
  block: BlockType;
  isSelected: boolean;
  isEditing: boolean;
  onChange: (attributes: Partial<BlockType['attributes']>) => void;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

// 블록 인스펙터 Props
export interface BlockInspectorProps {
  block: BlockType;
  onChange: (attributes: Partial<BlockType['attributes']>) => void;
}

// 단락 블록 속성
export interface ParagraphBlockAttributes {
  content: string;
  align: 'left' | 'center' | 'right' | 'justify';
  fontSize: 'small' | 'normal' | 'large';
  textColor: string;
  backgroundColor: string;
}

// 제목 블록 속성
export interface HeadingBlockAttributes {
  content: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  align: 'left' | 'center' | 'right';
  textColor: string;
  anchor: string;
}

// 이미지 블록 속성
export interface ImageBlockAttributes {
  src: string;
  alt: string;
  caption: string;
  align: 'left' | 'center' | 'right' | 'wide' | 'full';
  width: number;
  height: number;
  linkUrl: string;
  linkTarget: '_blank' | '_self';
}

// 목록 블록 속성
export interface ListBlockAttributes {
  ordered: boolean;
  items: Array<{
    content: string;
    level: number;
  }>;
  reversed: boolean;
  start: number;
}

// 에디터 액션 타입
export type EditorAction = 
  | { type: 'ADD_BLOCK'; payload: { block: BlockType; position?: number } }
  | { type: 'UPDATE_BLOCK'; payload: { id: string; attributes: Partial<BlockType['attributes']> } }
  | { type: 'DELETE_BLOCK'; payload: { id: string } }
  | { type: 'MOVE_BLOCK'; payload: { id: string; newPosition: number } }
  | { type: 'SELECT_BLOCK'; payload: { id: string | null } }
  | { type: 'DUPLICATE_BLOCK'; payload: { id: string } }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean } }
  | { type: 'SET_ERROR'; payload: { error: string | null } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_SNAPSHOT'; payload: { description: string } };

// 인서터 컨텍스트
export interface InserterContext {
  availableBlocks: BlockDefinition[];
  searchTerm: string;
  selectedCategory: string | null;
  isOpen: boolean;
}

// 저장/로드 인터페이스
export interface EditorSaveData {
  blocks: BlockType[];
  meta: {
    version: string;
    created: Date;
    modified: Date;
    author: string;
  };
}