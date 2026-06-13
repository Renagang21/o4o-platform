/**
 * ForumPostContent — forum 게시글 본문 렌더 공통 부품 (presentational)
 *
 * WO-O4O-FORUM-DETAIL-PRIMITIVES-EXTRACTION-V1
 *
 * 4서비스 forum detail 의 "content → html 변환 + ContentRenderer 렌더" 를 단일 부품으로 수렴한다.
 * - `content`(Block[] | string) 를 주면 canonical `forumContentToHtml` 로 변환한다(KPA/KCos 채택).
 * - `html`(사전 변환 문자열) 을 주면 그대로 렌더한다(GP plain-text / Neture legacy-escape 등 서비스 고유 변환 보존).
 * - 최종 렌더는 기존과 동일하게 `ContentRenderer`(@o4o/content-editor). className/style 은 그대로 통과.
 *
 * API client / router / 서비스별 helper / forum-core 미 import (순수 표현 컴포넌트).
 */

import type { CSSProperties } from 'react';
import { ContentRenderer } from '@o4o/content-editor';
import { forumContentToHtml } from './forumContentToHtml';

export interface ForumPostContentProps {
  /** Block[] | string — 지정 시 canonical forumContentToHtml 로 변환 */
  content?: unknown;
  /** 사전 변환된 html — 지정 시 content 보다 우선(서비스 고유 변환 보존용) */
  html?: string;
  className?: string;
  style?: CSSProperties;
}

export function ForumPostContent({ content, html, className, style }: ForumPostContentProps) {
  const resolvedHtml = html ?? forumContentToHtml(content);
  return <ContentRenderer html={resolvedHtml} className={className} style={style} />;
}
