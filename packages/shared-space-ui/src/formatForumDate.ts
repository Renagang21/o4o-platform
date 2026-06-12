/**
 * formatForumDate — 포럼 목록 상대 시간 표시 유틸 (공통)
 *
 * WO-O4O-FORUM-LIST-SHARED-PRIMITIVES-V1
 *
 * 4서비스(KPA / GlycoPharm / K-Cosmetics / Neture) 포럼 목록 페이지가 각자 동일하게
 * 재정의하던 `formatDate` 를 단일 유틸로 통일한다. 동작은 기존과 동일:
 *   - 7일 초과: `toLocaleDateString('ko-KR')` (절대 날짜)
 *   - 1~7일: `N일 전`
 *   - 1~23시간: `N시간 전`
 *   - 1~59분: `N분 전`
 *   - 그 외: `방금 전`
 */
export function formatForumDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}시간 전`;
  const minutes = Math.floor(diff / (1000 * 60));
  return minutes > 0 ? `${minutes}분 전` : '방금 전';
}

export default formatForumDate;
