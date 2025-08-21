import { FC } from 'react';
import { AlertCircle, Loader2, Cloud, CloudOff } from 'lucide-react';
// date-fns removed
import { clsx } from 'clsx';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  savedInLocalStorage: boolean;
  className?: string;
}

const AutoSaveIndicator: FC<AutoSaveIndicatorProps> = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  savedInLocalStorage,
  className
}) => {
  const getStatusIcon = () => {
    if (isSaving) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (hasUnsavedChanges && savedInLocalStorage) {
      return <CloudOff className="w-4 h-4" />;
    }
    if (lastSaved) {
      return <Cloud className="w-4 h-4" />;
    }
    return <AlertCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isSaving) {
      return '저장 중...';
    }
    if (lastSaved) {
      return '저장됨';
    }
    if (hasUnsavedChanges && savedInLocalStorage) {
      return '로컬에 임시 저장됨';
    }
    if (hasUnsavedChanges) {
      return '저장되지 않은 변경사항';
    }
    return '대기 중';
  };

  const getStatusColor = () => {
    if (isSaving) {
      return 'text-blue-600';
    }
    if (lastSaved && !hasUnsavedChanges) {
      return 'text-green-600';
    }
    if (hasUnsavedChanges) {
      return 'text-yellow-600';
    }
    return 'text-gray-500';
  };

  return (
    <div className={clsx(
      'flex items-center gap-2 text-sm',
      getStatusColor(),
      className
    )}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
};

export default AutoSaveIndicator;