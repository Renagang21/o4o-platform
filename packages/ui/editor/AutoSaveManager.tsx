import React, { useEffect, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { Save, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface AutoSaveManagerProps {
  editor: Editor;
  contentId: string;
  autoSaveInterval?: number; // 자동 저장 간격 (ms)
  onSave?: (content: any) => Promise<boolean>;
  enabled?: boolean;
}

interface AutoSaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

export const AutoSaveManager: React.FC<AutoSaveManagerProps> = ({
  editor,
  contentId,
  autoSaveInterval = 30000, // 30초 기본값
  onSave,
  enabled = true
}) => {
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    status: 'idle',
    lastSaved: null,
    hasUnsavedChanges: false
  });

  const [settings, setSettings] = useState({
    autoSaveEnabled: enabled,
    interval: autoSaveInterval / 1000 // 초 단위로 표시
  });

  // 로컬 스토리지에서 자동 저장된 내용 불러오기
  const loadAutoSavedContent = useCallback(() => {
    const saved = localStorage.getItem(`autosave_${contentId}`);
    if (saved) {
      try {
        const { content, timestamp } = JSON.parse(saved);
        const savedDate = new Date(timestamp);
        const timeDiff = Date.now() - savedDate.getTime();
        
        // 1시간 이내 자동 저장된 내용이 있으면 복원 여부 확인
        if (timeDiff < 3600000) {
          const restore = window.confirm(
            `${savedDate.toLocaleString()}에 자동 저장된 내용이 있습니다. 복원하시겠습니까?`
          );
          if (restore) {
            editor.commands.setContent(content);
            setAutoSaveState(prev => ({
              ...prev,
              lastSaved: savedDate
            }));
          }
        }
      } catch (error) {
        console.error('자동 저장된 내용 로드 실패:', error);
      }
    }
  }, [contentId, editor]);

  // 자동 저장 실행
  const performAutoSave = useCallback(async () => {
    if (!settings.autoSaveEnabled || !autoSaveState.hasUnsavedChanges) return;

    setAutoSaveState(prev => ({ ...prev, status: 'saving' }));

    try {
      const content = editor.getJSON();
      
      // 로컬 스토리지에 저장
      localStorage.setItem(`autosave_${contentId}`, JSON.stringify({
        content,
        timestamp: Date.now()
      }));

      // 외부 저장 함수가 있으면 실행
      let saveSuccess = true;
      if (onSave) {
        saveSuccess = await onSave(content);
      }

      if (saveSuccess) {
        setAutoSaveState({
          status: 'saved',
          lastSaved: new Date(),
          hasUnsavedChanges: false
        });

        // 2초 후 상태를 idle로 변경
        setTimeout(() => {
          setAutoSaveState(prev => ({ ...prev, status: 'idle' }));
        }, 2000);
      } else {
        throw new Error('저장 실패');
      }
    } catch (error) {
      console.error('자동 저장 실패:', error);
      setAutoSaveState(prev => ({
        ...prev,
        status: 'error'
      }));

      // 5초 후 상태를 idle로 변경
      setTimeout(() => {
        setAutoSaveState(prev => ({ ...prev, status: 'idle' }));
      }, 5000);
    }
  }, [editor, contentId, onSave, settings.autoSaveEnabled, autoSaveState.hasUnsavedChanges]);

  // 에디터 내용 변경 감지
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setAutoSaveState(prev => ({
        ...prev,
        hasUnsavedChanges: true
      }));
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // 자동 저장 타이머
  useEffect(() => {
    if (!settings.autoSaveEnabled) return;

    const interval = setInterval(performAutoSave, settings.interval * 1000);

    return () => clearInterval(interval);
  }, [performAutoSave, settings.autoSaveEnabled, settings.interval]);

  // 페이지 언로드 시 자동 저장
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSaveState.hasUnsavedChanges) {
        performAutoSave();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [autoSaveState.hasUnsavedChanges, performAutoSave]);

  // 컴포넌트 마운트 시 자동 저장된 내용 로드
  useEffect(() => {
    loadAutoSavedContent();
  }, [loadAutoSavedContent]);

  // 수동 저장
  const handleManualSave = () => {
    performAutoSave();
  };

  // 설정 변경
  const updateSettings = (newSettings: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // 상태 아이콘 및 메시지
  const getStatusDisplay = () => {
    switch (autoSaveState.status) {
      case 'saving':
        return {
          icon: <Clock className="w-4 h-4 animate-spin" />,
          message: '저장 중...',
          className: 'text-blue-500'
        };
      case 'saved':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          message: '저장됨',
          className: 'text-green-500'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          message: '저장 실패',
          className: 'text-red-500'
        };
      default:
        return {
          icon: <Save className="w-4 h-4" />,
          message: autoSaveState.hasUnsavedChanges ? '변경사항 있음' : '최신 상태',
          className: autoSaveState.hasUnsavedChanges ? 'text-yellow-500' : 'text-gray-500'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 border-b">
      {/* 자동 저장 상태 */}
      <div className={`flex items-center gap-2 ${statusDisplay.className}`}>
        {statusDisplay.icon}
        <span className="text-sm font-medium">{statusDisplay.message}</span>
      </div>

      {/* 마지막 저장 시간 */}
      {autoSaveState.lastSaved && (
        <div className="text-xs text-gray-500">
          마지막 저장: {autoSaveState.lastSaved.toLocaleTimeString()}
        </div>
      )}

      {/* 수동 저장 버튼 */}
      <button
        onClick={handleManualSave}
        disabled={autoSaveState.status === 'saving'}
        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        저장
      </button>

      {/* 자동 저장 설정 */}
      <div className="flex items-center gap-2 ml-auto">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.autoSaveEnabled}
            onChange={(e) => updateSettings({ autoSaveEnabled: e.target.checked })}
            className="rounded"
          />
          자동 저장
        </label>
        
        {settings.autoSaveEnabled && (
          <select
            value={settings.interval}
            onChange={(e) => updateSettings({ interval: Number(e.target.value) })}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={10}>10초</option>
            <option value={30}>30초</option>
            <option value={60}>1분</option>
            <option value={120}>2분</option>
            <option value={300}>5분</option>
          </select>
        )}
      </div>
    </div>
  );
};
