export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  requireAuth: boolean = false,
  requireAdminAuth: boolean = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (requireAuth) {
    const token = localStorage.getItem('jwt');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  if (requireAdminAuth) {
    const adminToken = localStorage.getItem('admin_jwt');
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    // 인증 실패: 로그인 페이지로 이동
    window.location.href = '/admin/login';
    throw new Error('인증이 필요합니다');
  }
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || 'API 요청 실패');
  }
  return res.json();
} 