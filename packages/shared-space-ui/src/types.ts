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
/*  FeaturedPost — ActivitySection (인기 글 Top 3)                      */
/* ------------------------------------------------------------------ */
export interface FeaturedPost {
  id: string;
  title: string;
  author: string;
  viewCount: number;
  category?: string;
  href: string;
}

/* ------------------------------------------------------------------ */
/*  RecentPost — ActivitySection (최근 글 5)                            */
/* ------------------------------------------------------------------ */
export interface RecentPost {
  id: string;
  title: string;
  date: string;
  href: string;
  category?: string;
  author?: string;
}

/* ------------------------------------------------------------------ */
/*  Component Props                                                    */
/* ------------------------------------------------------------------ */

export interface HeroSummarySectionProps {
  greeting: string;
  subtitle?: string;
  ctas: Array<{ label: string; href: string; icon?: ReactNode }>;
  accentColor?: string;
}

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

export interface ActivitySectionProps {
  title?: string;
  featuredPosts: FeaturedPost[];
  recentPosts: RecentPost[];
  loading?: boolean;
  emptyMessage?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  viewAllHref?: string;
  accentColor?: string;
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
