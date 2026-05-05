/**
 * Guide Contents Module — Types
 *
 * WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1
 *
 * 운영자가 GuideBlock 안내 문구를 폼으로 수정하는 페이지의 공통 타입.
 */

import type { GuideBlockVariant } from '@o4o/shared-space-ui';

export interface GuideSection {
  key: string;
  label: string;
}

export interface GuideContentsConfig {
  pageKey: string;
  sections: GuideSection[];
  /** 선택 — 미지정 시 기본 4종(info/warning/success/neutral) 사용 */
  variantOptions?: { value: GuideBlockVariant; label: string }[];
}

export interface GuideContentsClient {
  fetchGuidePageContent(serviceKey: string, pageKey: string): Promise<Record<string, string>>;
  clearGuidePageCache(serviceKey: string, pageKey: string): void;
  saveGuideContent(
    serviceKey: string,
    pageKey: string,
    sectionKey: string,
    content: string,
  ): Promise<void>;
}

export interface GuideContentsManagerProps {
  serviceKey: string;
  config: GuideContentsConfig;
  client: GuideContentsClient;
}
