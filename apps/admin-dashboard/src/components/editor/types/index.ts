// 블록 타입 정의
export interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: {
    align?: 'left' | 'center' | 'right' | 'wide' | 'full';
    className?: string;
    anchor?: string;
    textColor?: string;
    backgroundColor?: string;
    fontSize?: string;
    padding?: string;
    margin?: string;
    style?: React.CSSProperties;
  };
}

// 테마 설정 타입
export interface ThemeConfig {
  name: string;
  version?: string;
  
  // 색상 설정
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    palette?: string[];
  };
  
  // 타이포그래피 설정
  typography?: {
    fontFamily?: {
      body?: string;
      heading?: string;
      code?: string;
    };
    fontSize?: {
      base?: string;
      scale?: number;
    };
    lineHeight?: {
      body?: number;
      heading?: number;
    };
  };
  
  // 레이아웃 설정
  layout?: {
    contentWidth?: string;
    wideWidth?: string;
    fullWidth?: string;
  };
  
  // 허용된 블록
  blocks?: {
    allowedBlocks?: string[];
    blockedBlocks?: string[];
  };
  
  // 간격 설정
  spacing?: {
    unit?: string;
    scale?: number[];
  };
}

// 블록 컴포넌트 Props
export interface BlockComponentProps {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
  isEditing: boolean;
  theme: ThemeConfig | null;
}

// 편집기 상태
export interface EditorState {
  blocks: Block[];
  selectedBlockId: string | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
}

// 블록 변환 규칙
export interface BlockTransform {
  from: string;
  to: string;
  transform: (block: Block) => Block;
}