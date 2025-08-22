import { useState, useCallback, useRef } from 'react';
import type { Block } from '../types';

interface HistoryState {
  blocks: Block[];
  timestamp: number;
}

export const useEditorHistory = (_currentBlocks: Block[]) => {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const lastSavedRef = useRef<string>('');

  // 상태 저장
  const saveState = useCallback((blocks: Block[]) => {
    const serialized = JSON.stringify(blocks);
    
    // 동일한 상태는 저장하지 않음
    if (serialized === lastSavedRef.current) {
      return;
    }
    
    lastSavedRef.current = serialized;
    
    setHistory(prev => {
      // 현재 인덱스 이후의 히스토리 제거 (새로운 분기 생성)
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // 새 상태 추가
      newHistory.push({
        blocks: JSON.parse(serialized),
        timestamp: Date.now()
      });
      
      // 최대 50개 상태만 유지
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => Math.min(prev + 1, 49));
  }, [currentIndex]);

  // 실행 취소
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1].blocks;
    }
    return null;
  }, [currentIndex, history]);

  // 다시 실행
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1].blocks;
    }
    return null;
  }, [currentIndex, history]);

  // 실행 취소 가능 여부
  const canUndo = currentIndex > 0;
  
  // 다시 실행 가능 여부
  const canRedo = currentIndex < history.length - 1;

  // 히스토리 초기화
  const clearHistory = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    lastSavedRef.current = '';
  }, []);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    saveState,
    clearHistory,
    historyLength: history.length,
    currentIndex
  };
};