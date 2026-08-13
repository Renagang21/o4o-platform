/**
 * 내 자료함 공통 helper — WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 *
 * 두 화면·두 서비스에 복사돼 있던 변환/판정 함수. 신규 알고리즘 도입 없음.
 */

import { FileDown, FileText } from 'lucide-react';
import type { ComponentType } from 'react';
import type { StoreLibraryContentItem, StoreLibraryResourceItem } from './types';

/** 목록 날짜 표기 — 값이 없으면 '—' */
export function formatLibraryDate(value?: string | null): string {
  return value ? new Date(value).toLocaleDateString('ko-KR') : '—';
}

/** 자료 아이콘 — mimeType / 확장자 기준 */
export function getLibraryItemIcon(
  mimeType?: string | null,
  fileName?: string | null,
): ComponentType<{ size?: number; style?: React.CSSProperties }> {
  const mime = mimeType?.toLowerCase() ?? '';
  const name = fileName?.toLowerCase() ?? '';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return FileDown;
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return FileText;
  return FileText;
}

/** 목록에는 활성 자료만 노출한다(기존 동작 유지) */
export function filterActiveResources(
  items: StoreLibraryResourceItem[],
): StoreLibraryResourceItem[] {
  return items.filter((it) => it.isActive !== false);
}

/** 콘텐츠 snapshot 의 설명 필드(contentJson.description) 추출 */
export function readContentDescription(item: StoreLibraryContentItem): string | null {
  const desc = (item.contentJson as Record<string, unknown> | null | undefined)?.description;
  return (desc as string | null | undefined) ?? null;
}
