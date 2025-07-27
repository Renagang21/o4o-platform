import { FC } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface NoticeBannerProps {
  onClose: () => void;
}

const NoticeBanner: FC<NoticeBannerProps> = ({ onClose }) => {
  return (
    <div 
      className="bg-secondary rounded-xl p-4 mb-6"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-base font-medium text-text-main">
            새로운 정책 안내
          </h3>
          <div className="mt-2 text-sm text-text-secondary">
            <p>
              제휴사 수익 정책이 변경되었습니다. 자세한 내용은{' '}
              <a 
                href="/policy" 
                className="font-medium text-primary hover:text-primary-dark underline"
                aria-label="정책 변경 내용 자세히 보기"
              >
                정책 변경 안내
              </a>
              를 확인해주세요.
            </p>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            type="button"
            className="inline-flex text-text-secondary hover:text-text-main focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg transition-colors duration-200"
            onClick={onClose}
            aria-label="알림 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeBanner; 