/**
 * Operator Community Home Module — Types
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1
 *
 * KPA / GlycoPharm / Neture 의 "커뮤니티 Home 편집" 운영자 콘솔
 * (community_ads · community_sponsors · community_quick_links CRUD) 공통 View.
 *
 * 서비스 차이는 client adapter + config(accent/label/tab 구성) + optional slot 으로만 주입한다.
 * 공통 View 는 fetch/axios 를 직접 호출하지 않고, 서비스 조건문(if service === ...)을 갖지 않는다.
 */

import type { ReactNode } from 'react';

export type CommunityHomeTabKey = 'hero' | 'page' | 'sponsors' | 'quickLinks';

export interface CommunityAdData {
  id: string;
  type?: string;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface CommunitySponsorData {
  id: string;
  name: string;
  logoUrl: string;
  linkUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface CommunityQuickLinkData {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  description?: string | null;
  openInNewTab: boolean;
  displayOrder: number;
  isActive: boolean;
}

export type CommunityAdInput = {
  type: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  startDate?: string;
  endDate?: string;
  displayOrder: number;
  isActive: boolean;
}

export type CommunitySponsorInput = {
  name: string;
  logoUrl: string;
  linkUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export type CommunityQuickLinkInput = {
  title: string;
  imageUrl: string;
  linkUrl: string;
  description?: string;
  openInNewTab: boolean;
  displayOrder: number;
  isActive: boolean;
}

/**
 * 서비스별 community manage API adapter.
 * KPA `communityManageApi` · GlycoPharm `communityManageApi` · Neture `communityAdminApi` 가
 * 이미 동일한 method 이름/shape 을 갖는다 — wrapper 에서 그대로 주입한다.
 * 응답 unwrap 은 공통 View 가 `data.ads | ads` 양쪽을 모두 허용한다.
 */
export interface CommunityHomeClient {
  listAds(type: 'hero' | 'page'): Promise<any>;
  createAd(data: CommunityAdInput): Promise<any>;
  updateAd(id: string, data: CommunityAdInput): Promise<any>;
  deleteAd(id: string): Promise<any>;

  listSponsors(): Promise<any>;
  createSponsor(data: CommunitySponsorInput): Promise<any>;
  updateSponsor(id: string, data: CommunitySponsorInput): Promise<any>;
  deleteSponsor(id: string): Promise<any>;

  /** quickLinks 탭을 사용하는 서비스만 구현 (enableQuickLinks 와 함께) */
  listQuickLinks?(): Promise<any>;
  createQuickLink?(data: CommunityQuickLinkInput): Promise<any>;
  updateQuickLink?(id: string, data: CommunityQuickLinkInput): Promise<any>;
  deleteQuickLink?(id: string): Promise<any>;
}

export type CommunityHomeAccent = 'blue' | 'emerald';

/** 이미지 입력 slot — 미디어 라이브러리 picker 를 가진 서비스만 주입 (미주입 시 URL 입력) */
export interface CommunityHomeImageFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** banner=광고 이미지 · brand=스폰서 로고 · icon=하단 링크 아이콘 */
  purpose: 'banner' | 'brand' | 'icon';
}

export interface CommunityHomeConsoleProps {
  client: CommunityHomeClient;
  /** DataTable tableId prefix (서비스별 고유) */
  tableIdPrefix: string;
  title?: string;
  subtitle?: string;
  accent?: CommunityHomeAccent;
  /** 하단 링크(quickLinks) 탭 노출 여부 — client 의 quickLink method 필요. 기본 false */
  enableQuickLinks?: boolean;
  /** 목록 상단 안내 배너 (서비스 고유 공지) */
  notice?: ReactNode;
  /** 이미지 입력 slot (미주입 시 URL 직접 입력 fallback) */
  renderImageField?: (props: CommunityHomeImageFieldProps) => ReactNode;
}
