/**
 * Preset Templates for Pharmacy Signage
 *
 * Phase 3: Pre-defined playlist templates that pharmacies can clone and customize.
 * These are static JSON definitions - no Core entity changes needed.
 */

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'health' | 'promo';
  icon: string;
  defaultDuration: number; // seconds per item
  loop: boolean;
  items: PresetTemplateItem[];
  tags: string[];
}

export interface PresetTemplateItem {
  contentType: 'placeholder' | 'category';
  category?: string;
  placeholderName: string;
  duration: number;
  order: number;
}

/**
 * Default Preset Templates
 */
export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'basic-announcement',
    name: '기본 안내형',
    description: '영업시간, 기본 안내 등 필수 정보 중심의 기본 템플릿',
    category: 'basic',
    icon: 'Info',
    defaultDuration: 15,
    loop: true,
    items: [
      {
        contentType: 'placeholder',
        placeholderName: '영업시간 안내',
        duration: 15,
        order: 1,
      },
      {
        contentType: 'placeholder',
        placeholderName: '약국 소개',
        duration: 20,
        order: 2,
      },
      {
        contentType: 'category',
        category: 'announcement',
        placeholderName: '공지사항',
        duration: 15,
        order: 3,
      },
      {
        contentType: 'placeholder',
        placeholderName: '연락처/위치',
        duration: 10,
        order: 4,
      },
    ],
    tags: ['기본', '안내', '영업시간'],
  },
  {
    id: 'health-info-focused',
    name: '건강정보 중심',
    description: '건강 팁, 계절 건강 정보, 질환 예방 정보 위주 템플릿',
    category: 'health',
    icon: 'Heart',
    defaultDuration: 20,
    loop: true,
    items: [
      {
        contentType: 'category',
        category: 'health-info',
        placeholderName: '오늘의 건강 팁',
        duration: 25,
        order: 1,
      },
      {
        contentType: 'category',
        category: 'health-info',
        placeholderName: '계절 건강 정보',
        duration: 30,
        order: 2,
      },
      {
        contentType: 'placeholder',
        placeholderName: '질환 예방 안내',
        duration: 25,
        order: 3,
      },
      {
        contentType: 'placeholder',
        placeholderName: '약 복용 안내',
        duration: 20,
        order: 4,
      },
      {
        contentType: 'placeholder',
        placeholderName: '영업시간 안내',
        duration: 10,
        order: 5,
      },
    ],
    tags: ['건강', '정보', '예방', '팁'],
  },
  {
    id: 'product-promo',
    name: '제품 홍보 중심',
    description: '신제품, 프로모션, 추천 제품 위주 템플릿',
    category: 'promo',
    icon: 'ShoppingBag',
    defaultDuration: 15,
    loop: true,
    items: [
      {
        contentType: 'category',
        category: 'product-promo',
        placeholderName: '이달의 추천 제품',
        duration: 20,
        order: 1,
      },
      {
        contentType: 'category',
        category: 'product-promo',
        placeholderName: '신제품 안내',
        duration: 20,
        order: 2,
      },
      {
        contentType: 'placeholder',
        placeholderName: '프로모션/할인',
        duration: 15,
        order: 3,
      },
      {
        contentType: 'category',
        category: 'health-info',
        placeholderName: '건강 정보',
        duration: 20,
        order: 4,
      },
      {
        contentType: 'placeholder',
        placeholderName: '영업시간 안내',
        duration: 10,
        order: 5,
      },
    ],
    tags: ['제품', '홍보', '프로모션', '신제품'],
  },
];

/**
 * Get template by ID
 */
export function getPresetTemplate(id: string): PresetTemplate | undefined {
  return PRESET_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getPresetTemplatesByCategory(category: PresetTemplate['category']): PresetTemplate[] {
  return PRESET_TEMPLATES.filter((t) => t.category === category);
}
