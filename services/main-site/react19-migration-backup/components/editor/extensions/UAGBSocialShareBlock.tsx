// UAGB Social Share Block - Spectra 스타일
// 한국형 소셜 공유 버튼 (카카오톡, 네이버 블로그, 페이스북 등)

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId
} from './tiptap-block';
import UAGBSocialShareView from './UAGBSocialShareView';

// 소셜 플랫폼 정의
export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  shareUrl: string;
  enabled: boolean;
  customText?: string;
}

// 공유 카운트 설정
export interface ShareCountSettings {
  enabled: boolean;
  showTotal: boolean;
  refreshInterval: number; // 초
  animateNumbers: boolean;
}

// UAGB Social Share 속성 정의
export interface UAGBSocialShareAttributes extends UAGBCommonAttributes {
  // 기본 설정
  title: string;
  showTitle: boolean;
  
  // 공유 대상 URL 설정
  shareUrl: string;               // 공유할 URL (비어있으면 현재 페이지)
  shareTitle: string;             // 공유 제목
  shareDescription: string;       // 공유 설명
  shareImage: string;             // 공유 이미지 URL
  
  // 플랫폼 설정
  platforms: SocialPlatform[];
  
  // 레이아웃 설정
  layout: 'horizontal' | 'vertical' | 'grid' | 'floating';
  alignment: 'left' | 'center' | 'right';
  buttonSize: 'small' | 'medium' | 'large';
  buttonStyle: 'filled' | 'outlined' | 'minimal' | 'rounded' | 'square';
  
  // 표시 옵션
  showLabels: boolean;
  showCounts: boolean;
  shareCountSettings: ShareCountSettings;
  
  // 상호작용
  hoverEffect: boolean;
  clickAnimation: boolean;
  openInNewWindow: boolean;
  
  // 고급 기능
  enableTracking: boolean;        // 클릭 추적
  trackingEvent: string;          // GA 이벤트명
  customCSS: string;
  
  // 한국 특화 설정
  kakaoAppKey: string;            // 카카오톡 공유용 앱키
  naverClientId: string;          // 네이버 클라이언트 ID
  enableKakaoTalk: boolean;       // 카카오톡 공유 활성화
  enableKakaoStory: boolean;      // 카카오스토리 공유 활성화
  enableNaverBlog: boolean;       // 네이버 블로그 공유 활성화
  enableNaverCafe: boolean;       // 네이버 카페 공유 활성화
  enableBand: boolean;            // 밴드 공유 활성화
  
  // 스타일링
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  spacing: number;
  
  // 반응형
  spacingTablet: number;
  spacingMobile: number;
  buttonSizeTablet: 'small' | 'medium' | 'large';
  buttonSizeMobile: 'small' | 'medium' | 'large';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbSocialShare: {
      setUAGBSocialShare: (attrs: Partial<UAGBSocialShareAttributes>) => ReturnType;
      updateUAGBSocialShare: (attrs: Partial<UAGBSocialShareAttributes>) => ReturnType;
    };
  }
}

export const UAGBSocialShareBlock = Node.create({
  name: 'uagb/social-share',
  
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      // 블록 식별
      block_id: {
        default: () => generateBlockId(),
        parseHTML: element => element.getAttribute('data-block-id'),
        renderHTML: attributes => ({ 'data-block-id': attributes.block_id }),
      },
      classMigrate: {
        default: false,
      },
      
      // 기본 설정
      title: { default: 'Share this:' },
      showTitle: { default: true },
      
      // 공유 대상 설정
      shareUrl: { default: '' },
      shareTitle: { default: '' },
      shareDescription: { default: '' },
      shareImage: { default: '' },
      
      // 플랫폼 설정
      platforms: {
        default: [
          {
            id: 'kakao_talk',
            name: '카카오톡',
            icon: '💬',
            color: '#fee500',
            shareUrl: '',
            enabled: true
          },
          {
            id: 'facebook',
            name: 'Facebook',
            icon: '📘',
            color: '#1877f2',
            shareUrl: 'https://www.facebook.com/sharer/sharer.php?u={url}',
            enabled: true
          },
          {
            id: 'twitter',
            name: 'Twitter',
            icon: '🐦',
            color: '#1da1f2',
            shareUrl: 'https://twitter.com/intent/tweet?text={title}&url={url}',
            enabled: true
          },
          {
            id: 'naver_blog',
            name: '네이버 블로그',
            icon: '📰',
            color: '#03c75a',
            shareUrl: 'https://share.naver.com/web/shareView?url={url}&title={title}',
            enabled: true
          },
          {
            id: 'band',
            name: 'BAND',
            icon: '🎵',
            color: '#00c73c',
            shareUrl: 'https://www.band.us/plugin/share?body={title}&route={url}',
            enabled: true
          },
          {
            id: 'copy_link',
            name: 'Copy Link',
            icon: '🔗',
            color: '#6b7280',
            shareUrl: '',
            enabled: true
          }
        ]
      },
      
      // 레이아웃 설정
      layout: { default: 'horizontal' },
      alignment: { default: 'left' },
      buttonSize: { default: 'medium' },
      buttonStyle: { default: 'filled' },
      
      // 표시 옵션
      showLabels: { default: true },
      showCounts: { default: false },
      shareCountSettings: {
        default: {
          enabled: false,
          showTotal: true,
          refreshInterval: 300,
          animateNumbers: true
        }
      },
      
      // 상호작용
      hoverEffect: { default: true },
      clickAnimation: { default: true },
      openInNewWindow: { default: true },
      
      // 고급 기능
      enableTracking: { default: false },
      trackingEvent: { default: 'social_share' },
      customCSS: { default: '' },
      
      // 한국 특화 설정
      kakaoAppKey: { default: '' },
      naverClientId: { default: '' },
      enableKakaoTalk: { default: true },
      enableKakaoStory: { default: false },
      enableNaverBlog: { default: true },
      enableNaverCafe: { default: false },
      enableBand: { default: true },
      
      // 스타일링
      backgroundColor: { default: 'transparent' },
      borderColor: { default: '#e5e7eb' },
      borderWidth: { default: 0 },
      borderRadius: { default: 8 },
      padding: { default: 16 },
      spacing: { default: 12 },
      
      // 반응형
      spacingTablet: { default: 10 },
      spacingMobile: { default: 8 },
      buttonSizeTablet: { default: 'medium' },
      buttonSizeMobile: { default: 'small' },
      
      // Common UAGB attributes
      blockTopMargin: { default: 0 },
      blockRightMargin: { default: 0 },
      blockBottomMargin: { default: 20 },
      blockLeftMargin: { default: 0 },
      blockTopMarginTablet: { default: 0 },
      blockRightMarginTablet: { default: 0 },
      blockBottomMarginTablet: { default: 20 },
      blockLeftMarginTablet: { default: 0 },
      blockTopMarginMobile: { default: 0 },
      blockRightMarginMobile: { default: 0 },
      blockBottomMarginMobile: { default: 20 },
      blockLeftMarginMobile: { default: 0 },
      
      blockTopPadding: { default: 10 },
      blockRightPadding: { default: 10 },
      blockBottomPadding: { default: 10 },
      blockLeftPadding: { default: 10 },
      blockTopPaddingTablet: { default: 10 },
      blockRightPaddingTablet: { default: 10 },
      blockBottomPaddingTablet: { default: 10 },
      blockLeftPaddingTablet: { default: 10 },
      blockTopPaddingMobile: { default: 8 },
      blockRightPaddingMobile: { default: 8 },
      blockBottomPaddingMobile: { default: 8 },
      blockLeftPaddingMobile: { default: 8 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="uagb/social-share"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/social-share',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-social-share`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBSocialShareView);
  },

  addCommands() {
    return {
      setUAGBSocialShare:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBSocialShare:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

// 🔧 소셜 공유 유틸리티 함수들

/**
 * URL 파라미터 인코딩
 */
export const encodeShareParams = (text: string): string => {
  return encodeURIComponent(text);
};

/**
 * 공유 URL 생성
 */
export const generateShareUrl = (
  platform: SocialPlatform,
  url: string,
  title: string,
  description: string,
  image: string
): string => {
  const params = {
    url: encodeShareParams(url),
    title: encodeShareParams(title),
    description: encodeShareParams(description),
    image: encodeShareParams(image)
  };
  
  return platform.shareUrl
    .replace('{url}', params.url)
    .replace('{title}', params.title)
    .replace('{description}', params.description)
    .replace('{image}', params.image);
};

/**
 * 카카오톡 공유 (Kakao SDK 사용)
 */
export const shareToKakaoTalk = (
  appKey: string,
  url: string,
  title: string,
  description: string,
  image: string
) => {
  if (!window.Kakao) {
    console.error('Kakao SDK not loaded');
    return;
  }
  
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(appKey);
  }
  
  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: title,
      description: description,
      imageUrl: image,
      link: {
        mobileWebUrl: url,
        webUrl: url,
      },
    },
    buttons: [
      {
        title: '웹으로 보기',
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
    ],
  });
};

/**
 * 링크 복사
 */
export const copyToClipboard = (text: string): boolean => {
  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

/**
 * 공유 카운트 조회 (Mock - 실제로는 각 플랫폼 API 필요)
 */
export const getShareCounts = async (url: string): Promise<Record<string, number>> => {
  // 실제 구현에서는 각 플랫폼의 API를 호출해야 함
  // Facebook Graph API, Twitter API 등
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        facebook: Math.floor(Math.random() * 1000),
        twitter: Math.floor(Math.random() * 500),
        kakao_talk: Math.floor(Math.random() * 2000),
        naver_blog: Math.floor(Math.random() * 300),
        band: Math.floor(Math.random() * 150),
        total: Math.floor(Math.random() * 4000)
      });
    }, 1000);
  });
};

/**
 * 한국형 플랫폼 감지
 */
export const isKoreanPlatform = (platformId: string): boolean => {
  return ['kakao_talk', 'kakao_story', 'naver_blog', 'naver_cafe', 'band'].includes(platformId);
};

/**
 * 플랫폼별 아이콘 매핑
 */
export const getPlatformIcon = (platformId: string): string => {
  const iconMap: Record<string, string> = {
    kakao_talk: '💬',
    kakao_story: '📖',
    facebook: '📘',
    twitter: '🐦',
    instagram: '📷',
    linkedin: '💼',
    naver_blog: '📰',
    naver_cafe: '☕',
    band: '🎵',
    pinterest: '📌',
    reddit: '🤖',
    telegram: '✈️',
    whatsapp: '📱',
    copy_link: '🔗',
    email: '📧'
  };
  
  return iconMap[platformId] || '🔗';
};

export default UAGBSocialShareBlock;