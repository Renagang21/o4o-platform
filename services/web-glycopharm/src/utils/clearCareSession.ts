/**
 * clearCareSession — Care AI Chat sessionStorage 전체 초기화
 * WO-O4O-CARE-AI-SESSION-ISOLATION-V1
 *
 * 로그인/로그아웃 시 호출하여 이전 사용자의 AI Chat 상태를 제거한다.
 */
export function clearCareSession(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('care_ai_chat_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => sessionStorage.removeItem(k));
}
