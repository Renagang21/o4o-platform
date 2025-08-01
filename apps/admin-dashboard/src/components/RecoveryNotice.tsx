import { FC } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface RecoveryNoticeProps {
  timestamp: Date;
  onRecover: () => void;
  onDiscard: () => void;
}

const RecoveryNotice: FC<RecoveryNoticeProps> = ({
  timestamp,
  onRecover,
  onDiscard
}) => {
  return (
    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-yellow-900">
            저장되지 않은 변경사항이 있습니다
          </h4>
          <p className="text-sm text-yellow-700 mt-1">
            {format(timestamp, 'yyyy년 MM월 dd일 HH:mm')}에 작성한 내용이 임시 저장되어 있습니다.
            복구하시겠습니까?
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              variant="default"
              onClick={onRecover}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              복구하기
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDiscard}
            >
              삭제하기
            </Button>
          </div>
        </div>
        <button
          onClick={onDiscard}
          className="text-yellow-600 hover:text-yellow-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RecoveryNotice;