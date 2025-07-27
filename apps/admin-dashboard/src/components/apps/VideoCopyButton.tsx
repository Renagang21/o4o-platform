import { useState, useEffect } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyVideoToMyList, checkVideoInMyList } from '@/api/apps/video-copy';
import { useAuth } from '@o4o/auth-context';
import toast from 'react-hot-toast';

interface VideoCopyButtonProps {
  postId: string;
  postType?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  onCopySuccess?: (newPostId: string) => void;
}

export const VideoCopyButton: FC<VideoCopyButtonProps> = ({
  postId,
  postType = 'signage_video',
  size = 'default',
  variant = 'outline',
  className = '',
  onCopySuccess,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // 초기 로드시 이미 복사된 비디오인지 확인
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const exists = await checkVideoInMyList(postId);
        setIsCopied(exists);
      } catch (error) {
        console.error('Failed to check video status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [postId, user]);

  const handleCopy = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    if (isCopied) {
      toast('이미 내 목록에 있는 비디오입니다.', {
        icon: '📋',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await copyVideoToMyList({ postId, postType });

      if (result.success) {
        setIsCopied(true);
        toast.success('비디오가 내 목록에 추가되었습니다!');
        
        if (result.newPostId && onCopySuccess) {
          onCopySuccess(result.newPostId);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('비디오 복사 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <Button
        size={size}
        variant={variant}
        className={className}
        disabled
      >
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={isCopied ? 'default' : variant}
      className={className}
      onClick={handleCopy}
      disabled={isLoading || isCopied}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isCopied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          내 목록에 있음
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 mr-2" />
          내 목록에 추가
        </>
      )}
    </Button>
  );
};

// Shortcode용 래퍼 컴포넌트
export const VideoCopyButtonShortcode: FC<{ 
  postId: string;
  size?: string;
}> = ({ postId, size = 'default' }) => {
  const sizeMap: Record<string, 'sm' | 'default' | 'lg'> = {
    small: 'sm',
    medium: 'default',
    large: 'lg',
  };

  return (
    <VideoCopyButton
      postId={postId}
      size={sizeMap[size] || 'default'}
    />
  );
};