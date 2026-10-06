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
export const INQUIRY_URL = 'https://neture.co.kr/contact';
