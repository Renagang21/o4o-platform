import { useCallback } from 'react';
import type { Block } from '../types';

export const useBlocks = (
  _blocks: Block[],
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>
) => {
  // 블록 ID 생성
  const generateBlockId = () => {
    return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 블록 추가
  const addBlock = useCallback((type: string, afterId?: string) => {
    const newBlock: Block = {
      id: generateBlockId(),
      type,
      content: type === 'heading' ? { text: '', level: 2 } : { text: '' },
      attributes: {}
    };

    setBlocks(prev => {
      if (!afterId) {
        return [...prev, newBlock];
      }
      
      const index = prev.findIndex(b => b.id === afterId);
      if (index === -1) {
        return [...prev, newBlock];
      }
      
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });

    return newBlock.id;
  }, [setBlocks]);

  // 블록 업데이트
  const updateBlock = useCallback((id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(block => 
      block.id === id 
        ? { ...block, ...updates }
        : block
    ));
  }, [setBlocks]);

  // 블록 삭제
  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(block => block.id !== id));
  }, [setBlocks]);

  // 블록 이동
  const moveBlock = useCallback((id: string, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      return newBlocks;
    });
  }, [setBlocks]);

  // 블록 복제
  const duplicateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === id);
      if (index === -1) return prev;
      
      const blockToDuplicate = prev[index];
      const duplicatedBlock: Block = {
        ...blockToDuplicate,
        id: generateBlockId(),
        content: { ...blockToDuplicate.content }
      };
      
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, duplicatedBlock);
      return newBlocks;
    });
  }, [setBlocks]);

  // 블록 변환
  const transformBlock = useCallback((id: string, newType: string) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== id) return block;
      
      // 콘텐츠 변환 로직
      let newContent = block.content;
      
      // 단락 -> 제목
      if (block.type === 'paragraph' && newType === 'heading') {
        newContent = { text: block.content.text || '', level: 2 };
      }
      // 제목 -> 단락
      else if (block.type === 'heading' && newType === 'paragraph') {
        newContent = { text: block.content.text || '' };
      }
      // 단락/제목 -> 리스트
      else if ((block.type === 'paragraph' || block.type === 'heading') && newType === 'list') {
        newContent = { 
          items: [block.content.text || ''],
          ordered: false 
        };
      }
      // 리스트 -> 단락
      else if (block.type === 'list' && newType === 'paragraph') {
        newContent = { 
          text: block.content.items?.join('\n') || '' 
        };
      }
      
      return {
        ...block,
        type: newType,
        content: newContent
      };
    }));
  }, [setBlocks]);

  return {
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    duplicateBlock,
    transformBlock
  };
};