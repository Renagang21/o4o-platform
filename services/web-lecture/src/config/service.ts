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
