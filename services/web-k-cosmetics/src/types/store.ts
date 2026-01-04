/**
 * Store Types - K-Cosmetics
 * WO-KCOS-HOME-UI-V1
 */

/**
 * 매장 서비스 태그
 */
export type ServiceTag =
  | 'english_ok'
  | 'group_friendly'
  | 'try_on'
  | 'guide_partner'
  | 'japanese_ok'
  | 'chinese_ok';

/**
 * 매장 정보
 */
export interface Store {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  location: string;
  locationEn?: string;
  address: string;
  addressEn?: string;
  logoUrl?: string;
  imageUrl?: string;
  isVerified: boolean;
  serviceTags: ServiceTag[];
  description?: string;
  descriptionEn?: string;
  operatingHours?: string;
  phone?: string;
  website?: string;
  brands?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 서비스 태그 라벨 (한국어)
 */
export const SERVICE_TAG_LABELS_KO: Record<ServiceTag, string> = {
  english_ok: '영어 가능',
  group_friendly: '단체 환영',
  try_on: '체험 가능',
  guide_partner: '가이드 파트너',
  japanese_ok: '일본어 가능',
  chinese_ok: '중국어 가능',
};

/**
 * 서비스 태그 라벨 (영어)
 */
export const SERVICE_TAG_LABELS_EN: Record<ServiceTag, string> = {
  english_ok: 'English OK',
  group_friendly: 'Group Friendly',
  try_on: 'Try-on Available',
  guide_partner: 'Guide Partner',
  japanese_ok: 'Japanese OK',
  chinese_ok: 'Chinese OK',
};
