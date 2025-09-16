/**
 * Default Settings Values
 * API 실패 시 사용할 fallback 데이터 정의
 */

export interface WritingSettingsData {
  defaultPostCategory: string;
  defaultPostFormat: string;
  enableMarkdown: boolean;
  enableRichEditor: boolean;
  autoSaveDraft: boolean;
  autoSaveInterval: number;
  revisionsToKeep: number;
  enableComments: boolean;
  requireCommentApproval: boolean;
  enablePingbacks: boolean;
  defaultCommentStatus: string;
  emailNewPost: boolean;
  allowEmojis: boolean;
}

export interface ReadingSettingsData {
  homepageType: 'latest_posts' | 'static_page';
  homepageId?: string;
  postsPerPage: number;
  showSummary: 'full' | 'excerpt';
  excerptLength: number;
}

export interface DiscussionSettingsData {
  enableComments: boolean;
  requireNameEmail: boolean;
  requireRegistration: boolean;
  closeCommentsAfterDays: number;
  enableThreadedComments: boolean;
  threadDepth: number;
  commentsPerPage: number;
  defaultCommentOrder: string;
  requireModeration: boolean;
  moderationKeywords: string[];
  blacklistKeywords: string[];
  enableGravatar: boolean;
  defaultAvatar: string;
  maxLinks: number;
  holdForModeration: boolean;
}

export interface OAuthSettingsData {
  google: {
    provider: 'google';
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    scope: string[];
  };
  kakao: {
    provider: 'kakao';
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    scope: string[];
  };
  naver: {
    provider: 'naver';
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
    scope: string[];
  };
}

// 기본값 객체들
export const DEFAULT_WRITING_SETTINGS: WritingSettingsData = {
  defaultPostCategory: 'uncategorized',
  defaultPostFormat: 'standard',
  enableMarkdown: true,
  enableRichEditor: true,
  autoSaveDraft: true,
  autoSaveInterval: 60,
  revisionsToKeep: 10,
  enableComments: true,
  requireCommentApproval: false,
  enablePingbacks: true,
  defaultCommentStatus: 'open',
  emailNewPost: false,
  allowEmojis: true
};

export const DEFAULT_READING_SETTINGS: ReadingSettingsData = {
  homepageType: 'latest_posts',
  homepageId: undefined,
  postsPerPage: 10,
  showSummary: 'excerpt',
  excerptLength: 200
};

export const DEFAULT_DISCUSSION_SETTINGS: DiscussionSettingsData = {
  enableComments: true,
  requireNameEmail: true,
  requireRegistration: false,
  closeCommentsAfterDays: 0,
  enableThreadedComments: true,
  threadDepth: 5,
  commentsPerPage: 50,
  defaultCommentOrder: 'oldest',
  requireModeration: false,
  moderationKeywords: [],
  blacklistKeywords: [],
  enableGravatar: true,
  defaultAvatar: 'mystery',
  maxLinks: 2,
  holdForModeration: false
};

export const DEFAULT_OAUTH_SETTINGS: OAuthSettingsData = {
  google: {
    provider: 'google',
    enabled: false,
    clientId: '',
    clientSecret: '',
    callbackUrl: '',
    scope: []
  },
  kakao: {
    provider: 'kakao',
    enabled: false,
    clientId: '',
    clientSecret: '',
    callbackUrl: '',
    scope: []
  },
  naver: {
    provider: 'naver',
    enabled: false,
    clientId: '',
    clientSecret: '',
    callbackUrl: '',
    scope: []
  }
};

// localStorage 키 상수
export const STORAGE_KEYS = {
  WRITING_SETTINGS: 'o4o-settings-writing',
  READING_SETTINGS: 'o4o-settings-reading', 
  DISCUSSION_SETTINGS: 'o4o-settings-discussion',
  OAUTH_SETTINGS: 'o4o-settings-oauth'
} as const;

// 설정 저장 헬퍼 함수
export const saveSettingsToStorage = <T>(key: string, settings: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (error) {
    console.warn('Settings localStorage 저장 실패:', error);
  }
};

// 설정 로드 헬퍼 함수
export const loadSettingsFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Settings localStorage 로드 실패:', error);
    return defaultValue;
  }
};