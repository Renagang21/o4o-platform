/**
 * Dropshipping Cosmetics Extension Manifest
 *
 * This extension adds cosmetics-specific metadata and features to the Dropshipping Core app.
 * It extends the core dropshipping functionality with cosmetics-focused features like:
 * - Skin type matching
 * - Ingredient information
 * - Routine recommendations
 * - Product certifications
 */

import type { AppManifest } from '@o4o/types';

export const cosmeticsExtensionManifest: AppManifest = {
  appId: 'dropshipping-cosmetics',
  name: 'Dropshipping Cosmetics Extension',
  version: '1.0.0',
  type: 'extension',
  description: 'Cosmetics-specific features for dropshipping platform',

  // Extension configuration
  extendsApp: 'dropshipping-core',

  // Dependencies
  dependencies: {
    'dropshipping-core': '^1.0.0',
  },

  // Extend existing CPTs with cosmetics metadata
  extendsCPT: ['ds_product'],

  // Custom Post Types owned by this extension
  cpt: [
    {
      name: 'cosmetics_influencer_routine',
      storage: 'entity',
      primaryKey: 'id',
      label: 'Influencer Routine',
      supports: ['title', 'metadata'],
    },
  ],

  // ACF field groups for cosmetics metadata
  acf: [
    {
      groupId: 'cosmetics_metadata',
      label: 'Cosmetics Information',
      appliesTo: 'ds_product',
      fields: [
        {
          key: 'skinType',
          label: 'Skin Type',
          type: 'multiselect',
          required: false,
          choices: {
            dry: '건성',
            oily: '지성',
            combination: '복합성',
            sensitive: '민감성',
            normal: '중성',
          },
          instructions: '이 제품에 적합한 피부타입을 선택하세요 (복수 선택 가능)',
        },
        {
          key: 'concerns',
          label: 'Skin Concerns',
          type: 'multiselect',
          required: false,
          choices: {
            acne: '여드름',
            whitening: '미백',
            wrinkle: '주름개선',
            pore: '모공',
            soothing: '진정',
            moisturizing: '보습',
            elasticity: '탄력',
            trouble: '트러블케어',
          },
          instructions: '이 제품이 해결하는 피부 고민을 선택하세요',
        },
        {
          key: 'ingredients',
          label: 'Key Ingredients',
          type: 'array',
          required: false,
          subFields: [
            {
              key: 'name',
              label: 'Ingredient Name',
              type: 'text',
              required: true,
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              required: false,
            },
            {
              key: 'percentage',
              label: 'Percentage',
              type: 'number',
              required: false,
            },
          ],
          instructions: '주요 성분과 효능을 입력하세요',
        },
        {
          key: 'certifications',
          label: 'Certifications',
          type: 'multiselect',
          required: false,
          choices: {
            vegan: '비건',
            hypoallergenic: '저자극',
            organic: '유기농',
            ewgGreen: 'EWG그린',
            crueltyfree: '동물실험반대',
            dermatologicallyTested: '피부과테스트완료',
          },
          instructions: '제품 인증을 선택하세요',
        },
        {
          key: 'productCategory',
          label: 'Product Category',
          type: 'select',
          required: true,
          choices: {
            skincare: '스킨케어',
            cleansing: '클렌징',
            makeup: '메이크업',
            suncare: '선케어',
            mask: '마스크팩',
            bodycare: '바디케어',
            haircare: '헤어케어',
          },
          instructions: '제품 카테고리를 선택하세요',
        },
        {
          key: 'routineInfo',
          label: 'Routine Information',
          type: 'object',
          required: false,
          subFields: [
            {
              key: 'timeOfUse',
              label: 'Time of Use',
              type: 'multiselect',
              required: false,
              choices: {
                morning: '아침',
                evening: '저녁',
                weekly: '주간케어',
              },
            },
            {
              key: 'step',
              label: 'Routine Step',
              type: 'select',
              required: false,
              choices: {
                cleansing: '클렌징',
                toner: '토너',
                essence: '에센스',
                serum: '세럼',
                cream: '크림',
                sunscreen: '선크림',
                mask: '마스크',
              },
            },
            {
              key: 'orderInRoutine',
              label: 'Order in Routine',
              type: 'number',
              required: false,
            },
          ],
          instructions: '루틴에서의 사용 정보를 입력하세요',
        },
        {
          key: 'contraindications',
          label: 'Contraindications',
          type: 'text',
          required: false,
          instructions: '사용 시 주의사항이나 금지 조합을 입력하세요 (예: 레티놀 제품과 동시 사용 금지)',
        },
        {
          key: 'texture',
          label: 'Texture',
          type: 'select',
          required: false,
          choices: {
            gel: '젤',
            cream: '크림',
            lotion: '로션',
            serum: '세럼',
            oil: '오일',
            foam: '폼',
            water: '수분',
            balm: '밤',
          },
        },
        {
          key: 'volume',
          label: 'Volume/Size',
          type: 'text',
          required: false,
          instructions: '용량을 입력하세요 (예: 150ml, 50g)',
        },
        {
          key: 'expiryPeriod',
          label: 'Expiry Period After Opening',
          type: 'text',
          required: false,
          instructions: '개봉 후 사용 기한 (예: 12개월)',
        },
      ],
    },

    // Influencer Routine metadata
    {
      groupId: 'influencer_routine_metadata',
      label: 'Influencer Routine Information',
      appliesTo: 'cosmetics_influencer_routine',
      fields: [
        {
          key: 'partnerId',
          label: 'Partner ID',
          type: 'string',
          required: true,
        },
        {
          key: 'title',
          label: 'Routine Title',
          type: 'string',
          required: true,
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          required: false,
        },
        {
          key: 'skinType',
          label: 'Skin Type',
          type: 'multiselect',
          required: true,
          choices: {
            dry: '건성',
            oily: '지성',
            combination: '복합성',
            sensitive: '민감성',
            normal: '정상',
          },
        },
        {
          key: 'concerns',
          label: 'Skin Concerns',
          type: 'multiselect',
          required: true,
          choices: {
            acne: '여드름',
            whitening: '미백',
            wrinkle: '주름',
            pore: '모공',
            soothing: '진정',
            moisturizing: '보습',
            elasticity: '탄력',
            trouble: '트러블',
          },
        },
        {
          key: 'timeOfUse',
          label: 'Time of Use',
          type: 'select',
          required: true,
          choices: {
            morning: '아침',
            evening: '저녁',
            both: '아침/저녁 모두',
          },
        },
        {
          key: 'routine',
          label: 'Routine Steps',
          type: 'array',
          required: true,
        },
        {
          key: 'tags',
          label: 'Tags',
          type: 'multiselect',
          required: false,
          choices: {
            beginner: '초보자 추천',
            sensitive: '민감성',
            budget: '가성비',
            premium: '프리미엄',
            simple: '간단한 루틴',
            complete: '완전한 루틴',
          },
        },
        {
          key: 'isPublished',
          label: 'Published',
          type: 'boolean',
          required: true,
          defaultValue: false,
        },
        {
          key: 'viewCount',
          label: 'View Count',
          type: 'number',
          required: false,
          defaultValue: 0,
        },
        {
          key: 'recommendCount',
          label: 'Recommend Count',
          type: 'number',
          required: false,
          defaultValue: 0,
        },
      ],
    },
  ],

  // Routes - extending core routes
  routes: [
    '/api/v1/cosmetics',
    '/api/v1/cosmetics/*',
    '/api/v1/partner/routines',
    '/api/v1/partner/routines/*',
  ],

  // Permissions (extending core permissions)
  permissions: [
    'cosmetics:view',
    'cosmetics:edit',
    'cosmetics:manage_filters',
    'cosmetics:recommend_routine',
  ],

  // Shortcodes
  shortcodes: [
    {
      name: 'cosmetics-product',
      component: './frontend/shortcodes/cosmetics-product.js',
      description: 'Display product detail with cosmetics metadata',
      usage: '[cosmetics-product id="PRODUCT_ID"]',
      attributes: {
        id: {
          type: 'string',
          required: true,
          description: 'Product ID to display',
        },
        apiBaseUrl: {
          type: 'string',
          required: false,
          description: 'API base URL (defaults to /api/v1)',
        },
      },
    },
  ],

  // Admin menu extension (adds submenu under Dropshipping)
  menu: {
    parent: 'dropshipping',
    items: [
      {
        id: 'cosmetics-filters',
        label: 'Cosmetics Filters',
        path: '/admin/cosmetics/filters',
        permission: 'cosmetics:manage_filters',
        icon: 'Filter',
      },
      {
        id: 'cosmetics-routines',
        label: 'Routine Templates',
        path: '/admin/cosmetics/routines',
        permission: 'cosmetics:recommend_routine',
        icon: 'Layers',
      },
    ],
  },

  // Lifecycle hooks
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },
};

export default cosmeticsExtensionManifest;
