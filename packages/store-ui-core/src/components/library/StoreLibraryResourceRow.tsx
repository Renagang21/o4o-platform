/**
 * StoreLibraryResourceRow — 자료 목록 행
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 */

import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { formatLibraryDate, getLibraryItemIcon } from './libraryHelpers';
import {
  libraryMetaDateStyle,
  libraryNeutralBadgeStyle,
  libraryStyles,
} from './libraryStyles';
import type { StoreLibraryResourceItem } from './types';

export interface StoreLibraryResourceRowProps {
  item: StoreLibraryResourceItem;
  iconColor?: string;
  /**
   * 원본 열기 아이콘 판정 — GlycoPharm 은 링크형 자료에 LinkIcon 을 쓴다.
   * 서비스 기존 동작을 하나로 강제하지 않기 위해 주입한다(미지정 시 ExternalLink 고정).
   */
  useLinkIcon?: (item: StoreLibraryResourceItem) => boolean;
}

export function StoreLibraryResourceRow({
  item,
  iconColor = '#3b82f6',
  useLinkIcon,
}: StoreLibraryResourceRowProps) {
  const Icon = getLibraryItemIcon(item.mimeType, item.fileName);
  const href = item.fileUrl ?? undefined;
  const linkIcon = useLinkIcon?.(item) ?? false;

  return (
    <div style={libraryStyles.row}>
      <Icon size={16} style={{ color: iconColor, flexShrink: 0 }} />
      <div style={libraryStyles.rowMain}>
        <div style={libraryStyles.rowTitle}>{item.title}</div>
        <div style={libraryStyles.rowMeta}>
          {item.category && <span style={libraryNeutralBadgeStyle}>{item.category}</span>}
          {item.description && <span style={libraryStyles.descText}>{item.description}</span>}
          <span style={libraryMetaDateStyle}>{formatLibraryDate(item.updatedAt)}</span>
        </div>
      </div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={libraryStyles.actionBtn}
          title="원본 열기"
        >
          {linkIcon ? <LinkIcon size={14} /> : <ExternalLink size={14} />}
        </a>
      )}
    </div>
  );
}
