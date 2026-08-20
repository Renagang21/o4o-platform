/**
 * formatRelative — 알림 발생 시각의 상대 표기 (공통)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1
 *
 * NotificationBell(데스크톱) / NotificationSheet(모바일) 이 같은 문자열을 쓰도록
 * 단일 함수로 통일한다. 이전에는 account-ui · KPA MobileBottomNav ·
 * Neture NetureBottomNav 3곳에 같은 구현이 복제돼 있었다.
 *
 * 서비스 분기 없음 — 입력은 ISO 문자열 하나뿐이다.
 */

export function formatRelativeTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR');
}
