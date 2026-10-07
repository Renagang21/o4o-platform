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

/** study.neture.co.kr 공개 홈 Hero — WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 확정 문구 */
export const STUDY_HERO = {
  title: ['필요한 지식을', '실무와 연결합니다'],
  description: ['O4O 서비스와 현장 업무에 필요한', '강의와 학습 콘텐츠를 만나보세요.'],
  accent: '#0d9488',
} as const;
