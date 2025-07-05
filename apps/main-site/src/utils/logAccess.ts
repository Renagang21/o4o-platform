export async function logAccess(userId: string, page: string) {
  try {
    await fetch('/api/access-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, page, timestamp: Date.now() }),
    });
  } catch (e) {
    // 에러는 무시 (로그 기록 실패 시에도 UI 영향 없음)
  }
} 