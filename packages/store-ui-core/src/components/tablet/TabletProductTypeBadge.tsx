/**
 * TabletProductTypeBadge — 공급/자체 구분 배지 (풀·진열 양쪽에서 재사용)
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 */

export interface TabletProductTypeBadgeProps {
  type: 'supplier' | 'local';
  /** 진열 목록 쪽은 flex-shrink-0 가 붙어 있었다 — 기존 마크업 보존용 */
  noShrink?: boolean;
}

export function TabletProductTypeBadge({ type, noShrink }: TabletProductTypeBadgeProps) {
  const tone = type === 'supplier' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600';
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${noShrink ? 'flex-shrink-0 ' : ''}${tone}`}
    >
      {type === 'supplier' ? '공급' : '자체'}
    </span>
  );
}
