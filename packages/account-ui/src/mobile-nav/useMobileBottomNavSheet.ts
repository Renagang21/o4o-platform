/**
 * useMobileBottomNavSheet — 하단 nav 시트(알림/프로필) 개폐 상태 공통 정본
 *
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1
 *
 * 네 서비스가 각각 복제하고 있던 다음 동작을 하나로 모은다.
 *   - 한 번에 하나의 시트만 open
 *   - ESC 로 닫기
 *   - 열렸을 때 배경 스크롤 잠금(이전 overflow 복원)
 *   - 라우트 이동 시 자동 닫힘
 *
 * 알림만 쓰는 서비스(GlycoPharm / K-Cosmetics)는 'profile' 을 쓰지 않을 뿐,
 * 동작은 동일하다. router 에 의존하지 않도록 pathname 을 인자로 받는다.
 */

import { useCallback, useEffect, useState } from 'react';

export type MobileBottomNavSheetKind = 'none' | 'profile' | 'notif';

export interface UseMobileBottomNavSheetResult {
  openSheet: MobileBottomNavSheetKind;
  isOpen: boolean;
  open: (kind: Exclude<MobileBottomNavSheetKind, 'none'>) => void;
  close: () => void;
  /** 같은 시트면 닫고, 아니면 연다. */
  toggle: (kind: Exclude<MobileBottomNavSheetKind, 'none'>) => void;
}

export function useMobileBottomNavSheet(pathname: string): UseMobileBottomNavSheetResult {
  const [openSheet, setOpenSheet] = useState<MobileBottomNavSheetKind>('none');

  const close = useCallback(() => setOpenSheet('none'), []);
  const open = useCallback(
    (kind: Exclude<MobileBottomNavSheetKind, 'none'>) => setOpenSheet(kind),
    [],
  );
  const toggle = useCallback(
    (kind: Exclude<MobileBottomNavSheetKind, 'none'>) =>
      setOpenSheet((prev) => (prev === kind ? 'none' : kind)),
    [],
  );

  // ESC 로 닫기 + 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    if (openSheet === 'none') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSheet('none');
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openSheet]);

  // 라우트 이동 시 시트 자동 닫힘
  useEffect(() => {
    setOpenSheet('none');
  }, [pathname]);

  return { openSheet, isOpen: openSheet !== 'none', open, close, toggle };
}
