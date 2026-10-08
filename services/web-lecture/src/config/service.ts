export const SERVICE_KEY = 'lecture' as const;
export const BRAND = {
  name: 'O4O 강의',
  nameEn: 'O4O Lecture',
  domain: 'study.neture.co.kr',
  tagline: '강의·학습·평가·수료를 한곳에서',
} as const;
export const ROLES = {
  admin: 'lecture:admin',
  operator: 'lecture:operator',
  instructor: 'lecture:instructor',
} as const;
/** 강의 서비스 이용 신청 · 문의 (강의 서비스 자체 가입 경로는 아직 열려 있지 않다 — joinEnabled:false) */
export const INQUIRY_URL = 'https://study.neture.co.kr/contact';
/** 로그인 · membership 없이 열리는 route (App.tsx 공개 route 와 같게 유지) — 미가입 안내에서 원래 화면으로 돌려보낼지 판정 */
const PUBLIC_PATHS: readonly string[] = ['/', '/terms', '/privacy', '/contact'];
const PUBLIC_PATH_PREFIXES: readonly string[] = ['/courses', '/certificates/verify/', '/certificate/verify/'];
export function isPublicLecturePath(path: string): boolean {
  const pathname = path.split(/[?#]/)[0];
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((p) => (p.endsWith('/') ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)));
}

/** study.neture.co.kr 공개 홈 Hero — WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 확정 문구 */
export const STUDY_HERO = {
  title: ['필요한 지식을', '실무와 연결합니다'],
  description: ['O4O 서비스와 현장 업무에 필요한', '강의와 학습 콘텐츠를 만나보세요.'],
  accent: '#0d9488',
} as const;
