/**
 * StoreLibraryContentRow — 콘텐츠 목록 행 (+ 제작 시작)
 * WO-O4O-MY-STORE-LIBRARY-RESOURCES-CONTENTS-KCOS-GP-COMMONIZATION-V1
 */

import { formatLibraryDate } from './libraryHelpers';
import {
  libraryAccentBadgeStyle,
  libraryContentMetaStyle,
  libraryContentRowStyle,
  libraryMetaDateStyle,
  libraryStyles,
} from './libraryStyles';
import type { StoreLibraryContentItem } from './types';

export interface StoreLibraryContentRowProps {
  item: StoreLibraryContentItem;
  actionLabel?: string;
  onStartProduction: () => void;
}

export function StoreLibraryContentRow({
  item,
  actionLabel = '제작 시작',
  onStartProduction,
}: StoreLibraryContentRowProps) {
  return (
    <div style={libraryContentRowStyle}>
      <div style={libraryStyles.rowMain}>
        <div style={libraryStyles.rowTitle}>{item.title}</div>
        <div style={libraryContentMetaStyle}>
          <span style={libraryAccentBadgeStyle}>{item.sourceService ?? '—'}</span>
          <span style={libraryMetaDateStyle}>{formatLibraryDate(item.createdAt)}</span>
        </div>
      </div>

      <button onClick={onStartProduction} style={libraryStyles.startBtn}>
        {actionLabel}
      </button>
    </div>
  );
}
