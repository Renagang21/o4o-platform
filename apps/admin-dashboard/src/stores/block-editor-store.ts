import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { 
  BlockType, 
  EditorState, 
  EditorAction, 
  EditorSnapshot 
} from '@/types/block-editor';
import { blockRegistry } from '@/lib/block-registry';

interface BlockEditorStore extends EditorState {
  // 액션들
  addBlock: (type: string, position?: number, attributes?: Record<string, any>) => void;
  updateBlock: (id: string, attributes: Partial<BlockType['attributes']>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, newPosition: number) => void;
  selectBlock: (id: string | null) => void;
  duplicateBlock: (id: string) => void;
  
  // 히스토리 관리
  undo: () => void;
  redo: () => void;
  saveSnapshot: (description: string) => void;
  
  // 유틸리티
  getSelectedBlock: () => BlockType | null;
  getBlockPosition: (id: string) => number;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // 상태 관리
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 데이터 관리
  loadBlocks: (blocks: BlockType[]) => void;
  getEditorData: () => { blocks: BlockType[] };
  reset: () => void;
}

const MAX_HISTORY_SIZE = 50;

const initialState: EditorState = {
  blocks: [],
  selectedBlockId: null,
  isDragging: false,
  history: [],
  historyIndex: -1,
  isLoading: false,
  error: null
};

export const useBlockEditorStore = create<BlockEditorStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // 블록 추가
      addBlock: (type: string, position?: number, attributes = {}) => {
        const newBlock = blockRegistry.createBlock(type, attributes);
        if (!newBlock) return;

        set((state) => {
          const pos = position !== undefined ? position : state.blocks.length;
          state.blocks.splice(pos, 0, newBlock);
          state.selectedBlockId = newBlock.id;
        });

        get().saveSnapshot(`Added ${type} block`);
      },

      // 블록 업데이트
      updateBlock: (id: string, attributes: Partial<BlockType['attributes']>) => {
        set((state) => {
          const blockIndex = state.blocks.findIndex(block => block.id === id);
          if (blockIndex !== -1) {
            state.blocks[blockIndex].attributes = {
              ...state.blocks[blockIndex].attributes,
              ...attributes
            };
            state.blocks[blockIndex].metadata.modified = new Date();
            state.blocks[blockIndex].metadata.version += 1;
          }
        });
      },

      // 블록 삭제
      deleteBlock: (id: string) => {
        set((state) => {
          const blockIndex = state.blocks.findIndex(block => block.id === id);
          if (blockIndex !== -1) {
            state.blocks.splice(blockIndex, 1);
            if (state.selectedBlockId === id) {
              state.selectedBlockId = null;
            }
          }
        });

        get().saveSnapshot('Deleted block');
      },

      // 블록 이동
      moveBlock: (id: string, newPosition: number) => {
        set((state) => {
          const currentIndex = state.blocks.findIndex(block => block.id === id);
          if (currentIndex !== -1) {
            const [block] = state.blocks.splice(currentIndex, 1);
            state.blocks.splice(newPosition, 0, block);
          }
        });

        get().saveSnapshot('Moved block');
      },

      // 블록 선택
      selectBlock: (id: string | null) => {
        set((state) => {
          state.selectedBlockId = id;
        });
      },

      // 블록 복제
      duplicateBlock: (id: string) => {
        const block = get().blocks.find(b => b.id === id);
        if (!block) return;

        const duplicatedBlock = blockRegistry.cloneBlock(block);
        const position = get().getBlockPosition(id) + 1;

        set((state) => {
          state.blocks.splice(position, 0, duplicatedBlock);
          state.selectedBlockId = duplicatedBlock.id;
        });

        get().saveSnapshot('Duplicated block');
      },

      // 되돌리기
      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const snapshot = history[historyIndex - 1];
          set((state) => {
            state.blocks = snapshot.blocks;
            state.historyIndex = historyIndex - 1;
            state.selectedBlockId = null;
          });
        }
      },

      // 다시 실행
      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const snapshot = history[historyIndex + 1];
          set((state) => {
            state.blocks = snapshot.blocks;
            state.historyIndex = historyIndex + 1;
            state.selectedBlockId = null;
          });
        }
      },

      // 스냅샷 저장
      saveSnapshot: (description: string) => {
        const { blocks, history, historyIndex } = get();
        
        set((state) => {
          const snapshot: EditorSnapshot = {
            blocks: JSON.parse(JSON.stringify(blocks)), // 깊은 복사
            timestamp: new Date(),
            description
          };

          // 현재 인덱스 이후의 히스토리 제거 (새로운 변경사항이 있을 경우)
          state.history = state.history.slice(0, historyIndex + 1);
          state.history.push(snapshot);

          // 히스토리 크기 제한
          if (state.history.length > MAX_HISTORY_SIZE) {
            state.history.shift();
          } else {
            state.historyIndex = state.history.length - 1;
          }
        });
      },

      // 선택된 블록 가져오기
      getSelectedBlock: () => {
        const { blocks, selectedBlockId } = get();
        return blocks.find(block => block.id === selectedBlockId) || null;
      },

      // 블록 위치 가져오기
      getBlockPosition: (id: string) => {
        return get().blocks.findIndex(block => block.id === id);
      },

      // 되돌리기 가능 여부
      canUndo: () => {
        return get().historyIndex > 0;
      },

      // 다시 실행 가능 여부
      canRedo: () => {
        const { history, historyIndex } = get();
        return historyIndex < history.length - 1;
      },

      // 로딩 상태 설정
      setLoading: (isLoading: boolean) => {
        set((state) => {
          state.isLoading = isLoading;
        });
      },

      // 에러 상태 설정
      setError: (error: string | null) => {
        set((state) => {
          state.error = error;
        });
      },

      // 블록 로드
      loadBlocks: (blocks: BlockType[]) => {
        set((state) => {
          state.blocks = blocks;
          state.selectedBlockId = null;
          state.history = [];
          state.historyIndex = -1;
        });

        get().saveSnapshot('Loaded blocks');
      },

      // 에디터 데이터 가져오기
      getEditorData: () => {
        return { blocks: get().blocks };
      },

      // 상태 초기화
      reset: () => {
        set(() => ({ ...initialState }));
      }
    })),
    {
      name: 'block-editor-store'
    }
  )
);