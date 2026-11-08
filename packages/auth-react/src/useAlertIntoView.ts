import { useEffect, useRef } from 'react';

/**
 * WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T1: 오류 문구가 바뀌면 그 요소를 화면 안으로 스크롤한다.
 * 로그인 모달은 스크롤되므로 하단 문구가 보이지 않으면 사용자는 "깜빡이고 안 넘어간다"고만 느낀다.
 * jsdom 등 `scrollIntoView` 가 없는 환경에서는 아무것도 하지 않는다.
 */
export function useAlertIntoView<T extends HTMLElement>(message: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!message || !node || typeof node.scrollIntoView !== 'function') return;
    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [message]);
  return ref;
}
