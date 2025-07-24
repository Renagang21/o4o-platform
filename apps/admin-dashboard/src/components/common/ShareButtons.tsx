import React, { useState, useEffect } from 'react';
import { Share2, Link2, MessageSquare, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

// Kakao SDK 타입 선언
declare global {
  interface Window {
    Kakao: any;
  }
}

interface ShareButtonsProps {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  referralCode?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showLabels?: boolean;
  className?: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({
  url,
  title = 'O4O Platform',
  description = '함께 성장하는 B2B 플랫폼',
  imageUrl,
  referralCode,
  size = 'default',
  variant = 'outline',
  showLabels = false,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  // 추천 코드가 있으면 URL에 추가
  const shareUrl = referralCode 
    ? `${url}${url.includes('?') ? '&' : '?'}ref=${referralCode}`
    : url;

  // Kakao SDK 초기화
  useEffect(() => {
    const initKakao = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        // 실제 앱에서는 환경변수로 관리
        window.Kakao.init(process.env.REACT_APP_KAKAO_JS_KEY || 'YOUR_KAKAO_JS_KEY');
        setKakaoReady(true);
      }
    };

    // Kakao SDK 스크립트 로드
    if (!window.Kakao) {
      const script = document.createElement('script');
      script.src = 'https://developers.kakao.com/sdk/js/kakao.min.js';
      script.async = true;
      script.onload = initKakao;
      document.head.appendChild(script);
    } else {
      initKakao();
    }
  }, []);

  // 카카오톡 공유
  const shareToKakao = () => {
    if (!kakaoReady || !window.Kakao) {
      toast.error('카카오톡 공유 기능을 준비중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      window.Kakao.Link.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: description,
          imageUrl: imageUrl || 'https://o4o-platform.com/images/og-image.jpg',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '자세히 보기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } catch (error) {
      console.error('Kakao share error:', error);
      toast.error('카카오톡 공유 중 오류가 발생했습니다.');
    }
  };

  // 페이스북 공유
  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  // 네이버 밴드 공유
  const shareToBand = () => {
    const bandUrl = `https://band.us/plugin/share?body=${encodeURIComponent(
      `${title}\n${description}\n${shareUrl}`
    )}&route=${encodeURIComponent(shareUrl)}`;
    window.open(bandUrl, '_blank', 'width=600,height=600');
  };

  // URL 복사
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('링크가 복사되었습니다!');
      
      // 3초 후 복사 상태 초기화
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('링크가 복사되었습니다!');
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast.error('링크 복사에 실패했습니다.');
      }
      
      document.body.removeChild(textArea);
    }
  };

  // Web Share API 사용 (모바일)
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: shareUrl,
        });
      } catch (error: any) {
        // 사용자가 공유를 취소한 경우는 에러 표시하지 않음
        if (error.name !== 'AbortError') {
          console.error('Native share error:', error);
          toast.error('공유하기에 실패했습니다.');
        }
      }
    }
  };

  const buttonClass = `${className} ${showLabels ? '' : 'p-2'}`;

  return (
    <div className="flex items-center gap-2">
      {/* 네이티브 공유 (모바일) */}
      {typeof navigator !== 'undefined' && navigator.share && (
        <Button
          size={size}
          variant={variant}
          onClick={nativeShare}
          className={buttonClass}
          title="공유하기"
        >
          <Share2 className="w-4 h-4" />
          {showLabels && <span className="ml-2">공유하기</span>}
        </Button>
      )}

      {/* 카카오톡 */}
      <Button
        size={size}
        variant={variant}
        onClick={shareToKakao}
        className={`${buttonClass} hover:bg-[#FEE500] hover:text-[#000000]`}
        title="카카오톡으로 공유"
      >
        <MessageSquare className="w-4 h-4" />
        {showLabels && <span className="ml-2">카카오톡</span>}
      </Button>

      {/* 페이스북 */}
      <Button
        size={size}
        variant={variant}
        onClick={shareToFacebook}
        className={`${buttonClass} hover:bg-[#1877F2] hover:text-white`}
        title="페이스북으로 공유"
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        {showLabels && <span className="ml-2">페이스북</span>}
      </Button>

      {/* 네이버 밴드 */}
      <Button
        size={size}
        variant={variant}
        onClick={shareToBand}
        className={`${buttonClass} hover:bg-[#5AC451] hover:text-white`}
        title="네이버 밴드로 공유"
      >
        <Users className="w-4 h-4" />
        {showLabels && <span className="ml-2">밴드</span>}
      </Button>

      {/* URL 복사 */}
      <Button
        size={size}
        variant={variant}
        onClick={copyToClipboard}
        className={buttonClass}
        title={copied ? '복사되었습니다!' : '링크 복사'}
      >
        {copied ? (
          <Check className="w-4 h-4 text-modern-success" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
        {showLabels && <span className="ml-2">{copied ? '복사됨!' : '링크 복사'}</span>}
      </Button>
    </div>
  );
};

// 추천 링크 공유를 위한 특화 컴포넌트
export const ReferralShareButtons: React.FC<{
  productId?: string;
  referralCode: string;
  productName?: string;
  productImage?: string;
  size?: 'sm' | 'default' | 'lg';
  showLabels?: boolean;
}> = ({
  productId,
  referralCode,
  productName = 'O4O Platform 상품',
  productImage,
  size = 'default',
  showLabels = false,
}) => {
  // 추천 링크 생성
  const baseUrl = window.location.origin;
  const productUrl = productId 
    ? `${baseUrl}/products/${productId}`
    : baseUrl;

  return (
    <ShareButtons
      url={productUrl}
      title={`${productName} - 특별 혜택!`}
      description={`${referralCode} 추천 코드로 특별한 혜택을 받으세요!`}
      imageUrl={productImage}
      referralCode={referralCode}
      size={size}
      showLabels={showLabels}
    />
  );
};