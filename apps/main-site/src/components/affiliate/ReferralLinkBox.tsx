import { useState, FC } from 'react';
import { Copy, Share2, Mail, MessageCircle, Facebook, Twitter, Check } from 'lucide-react';

const ReferralLinkBox: FC = () => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const referralLink = `${import.meta.env.VITE_PUBLIC_URL || 'https://o4o.com'}/ref/partner123`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      setCopyError('클립보드 복사에 실패했습니다. 다시 시도해주세요.');
      console.error('클립보드 복사 실패:', err);
    }
  };

  const shareLinks = {
    email: `mailto:?subject=O4O 제휴 프로그램 참여하기&body=제휴 프로그램에 참여하세요: ${referralLink}`,
    kakao: `https://sharer.kakao.com/talk/friends/picker/link?app_key=${import.meta.env.VITE_KAKAO_APP_KEY || 'YOUR_KAKAO_APP_KEY'}&link=${encodeURIComponent(referralLink)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=O4O 제휴 프로그램에 참여하세요!`
  };

  return (
    <div className="bg-white rounded-xl shadow-sm" role="region" aria-label="리퍼럴 링크 관리">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-text-main">
          내 리퍼럴 링크
        </h2>
      </div>

      <div className="p-6">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            aria-label="리퍼럴 링크"
            className="flex-1 px-4 py-2 text-base text-text-main border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <button
            onClick={handleCopy}
            aria-label={copied ? "링크가 복사되었습니다" : "링크 복사하기"}
            className="inline-flex items-center px-4 py-2 text-sm font-medium tracking-wide text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>복사됨</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>복사</span>
              </>
            )}
          </button>
        </div>

        {copyError && (
          <p className="mt-2 text-sm text-danger" role="alert">
            {copyError}
          </p>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-text-main mb-3" id="social-share-title">
            소셜 미디어 공유
          </h3>
          <div 
            className="flex space-x-3"
            role="group"
            aria-labelledby="social-share-title"
          >
            <a
              href={shareLinks.email}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="이메일로 공유하기"
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200"
            >
              <Mail className="w-5 h-5" aria-hidden="true" />
            </a>
            <a
              href={shareLinks.kakao}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="카카오톡으로 공유하기"
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200"
            >
              <MessageCircle className="w-5 h-5" aria-hidden="true" />
            </a>
            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="페이스북으로 공유하기"
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200"
            >
              <Facebook className="w-5 h-5" aria-hidden="true" />
            </a>
            <a
              href={shareLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="트위터로 공유하기"
              className="p-2 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200"
            >
              <Twitter className="w-5 h-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralLinkBox; 