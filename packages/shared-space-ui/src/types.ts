import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  NoticeItem — NewsNoticesSection                                    */
/* ------------------------------------------------------------------ */
export interface NoticeItem {
  id: string;
  title: string;
  date: string;
  href?: string;
  isPinned?: boolean;
  category?: string;
}

/* ------------------------------------------------------------------ */
/*  Component Props                                                    */
/* ------------------------------------------------------------------ */


export interface NewsNoticesSectionProps {
  title?: string;
  tabs?: Array<{ key: string; label: string }>;
  activeTab?: string;
  onTabChange?: (key: string) => void;
  items: NoticeItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  externalCta?: {
    icon?: ReactNode;
    message: string;
    href: string;
    linkLabel: string;
  };
  viewAllHref?: string;
  accentColor?: string;
  accentBg?: string;
}

export interface AppEntrySectionProps {
  title?: string;
  subtitle?: string;
  cards: Array<{
    title: string;
    description: string;
    href: string;
    icon?: ReactNode;
  }>;
  accentColor?: string;
  /** WO-KPA-COMMUNITY-ACCESS-GATE-V1: 카드 클릭 인터셉터. e.preventDefault() 호출 시 이동 차단. */
  onCardClick?: (href: string, e: React.MouseEvent) => void;
}

export interface CtaGuidanceSectionProps {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  icon?: ReactNode;
  accentColor?: string;
  accentBg?: string;
  external?: boolean;
}

/* ------------------------------------------------------------------ */
/*  SignageMediaItem — SignagePreviewSection                           */
/* ------------------------------------------------------------------ */
export interface SignageMediaItem {
  id: string;
  title: string;
  mediaType?: string;
  uploaderName?: string | null;
  createdAt?: string;
  href?: string;
}

/* ------------------------------------------------------------------ */
/*  SignagePlaylistItem — SignagePreviewSection                        */
/* ------------------------------------------------------------------ */
export interface SignagePlaylistItem {
  id: string;
  name: string;
  itemCount?: number;
  createdAt?: string;
  href?: string;
}

/* ------------------------------------------------------------------ */
/*  ContentHighlightItem — ContentHighlightSection                    */
/* ------------------------------------------------------------------ */
export interface ContentHighlightItem {
  id: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string | null;
  badge?: string;
  meta?: string;
  href?: string;
}

/* ------------------------------------------------------------------ */
/*  ContentHighlightSectionProps                                       */
/* ------------------------------------------------------------------ */
export interface ContentHighlightSectionProps {
  title?: string;
  subtitle?: string;
  primaryGroupTitle: string;
  secondaryGroupTitle?: string;
  primaryItems: ContentHighlightItem[];
  secondaryItems?: ContentHighlightItem[];
  viewAllHref?: string;
  viewAllLabel?: string;
  emptyMessage?: string;
  loading?: boolean;
  accentColor?: string;
}

/* ------------------------------------------------------------------ */
/*  SignagePreviewSectionProps                                         */
/* ------------------------------------------------------------------ */
export interface O4OHelpUsageItem {
  title: string;
  description: string;
  href: string;
}

export interface O4OHelpServiceItem {
  serviceKey?: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
}

export interface O4OHelpSectionProps {
  usageTitle?: string;
  usageItems?: O4OHelpUsageItem[];
  servicesTitle?: string;
  serviceItems?: O4OHelpServiceItem[];
  /** 현재 서비스 키. 일치하는 카드는 목록에서 제외된다. */
  currentServiceKey?: string;
  /** 사용 방법(Block 1) 렌더 여부. 기본 true. 두 블록을 분리 배치하는 서비스용. */
  showUsage?: boolean;
  /** 다른 서비스(Block 2) 렌더 여부. 기본 true. 두 블록을 분리 배치하는 서비스용. */
  showServices?: boolean;
}

/* ------------------------------------------------------------------ */
export interface SignagePreviewSectionProps {
  title?: string;
  mediaLabel?: string;
  playlistLabel?: string;
  mediaItems: SignageMediaItem[];
  playlistItems: SignagePlaylistItem[];
  loading?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  accentColor?: string;
}

/* ------------------------------------------------------------------ */
/*  LessonSnapshotContent                                             */
/*                                                                    */
/*  WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1                            */
/*  WO-O4O-LESSON-CARD-PREVIEW-COMPONENT-V1: shared 위치로 승격        */
/*                                                                    */
/*  매장 자료함에 가져온 LMS 강의 항목의 contentJson 구조.             */
/*  Reference Metadata 원칙 — lesson body / videoUrl / quiz는 포함되지 */
/*  않으며, 컴포넌트는 받지도 표시하지도 않는다.                        */
/* ------------------------------------------------------------------ */
export interface LessonSnapshotContent {
  courseId: string;
  title: string;
  thumbnail: string | null;
  summary: string;
  lessonCount: number;
  instructorName: string | null;
  contentKind: 'lecture' | 'content_resource';
  visibility: 'public' | 'members';
  publicUrl: string;
  sourceService: string;
  capturedAt: string;
}
