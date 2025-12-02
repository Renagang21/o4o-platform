import type { ACFGroupDefinition } from '@o4o/types';

/**
 * Cosmetics ACF Field Group
 *
 * Defines metadata fields for cosmetics products.
 * These fields extend the core dropshipping product with cosmetics-specific information.
 */
export const cosmeticsFieldGroup: ACFGroupDefinition = {
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
        normal: '중성'
      },
      instructions: '이 제품에 적합한 피부타입을 선택하세요 (복수 선택 가능)'
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
        trouble: '트러블케어'
      },
      instructions: '이 제품이 해결하는 피부 고민을 선택하세요'
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
          required: true
        },
        {
          key: 'description',
          label: 'Description',
          type: 'text',
          required: false
        },
        {
          key: 'percentage',
          label: 'Percentage',
          type: 'number',
          required: false
        }
      ],
      instructions: '주요 성분과 효능을 입력하세요'
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
        dermatologicallyTested: '피부과테스트완료'
      },
      instructions: '제품 인증을 선택하세요'
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
        haircare: '헤어케어'
      },
      instructions: '제품 카테고리를 선택하세요'
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
            weekly: '주간케어'
          }
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
            mask: '마스크'
          }
        },
        {
          key: 'orderInRoutine',
          label: 'Order in Routine',
          type: 'number',
          required: false
        }
      ],
      instructions: '루틴에서의 사용 정보를 입력하세요'
    },
    {
      key: 'contraindications',
      label: 'Contraindications',
      type: 'text',
      required: false,
      instructions: '사용 시 주의사항이나 금지 조합을 입력하세요 (예: 레티놀 제품과 동시 사용 금지)'
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
        balm: '밤'
      }
    },
    {
      key: 'volume',
      label: 'Volume/Size',
      type: 'text',
      required: false,
      instructions: '용량을 입력하세요 (예: 150ml, 50g)'
    },
    {
      key: 'expiryPeriod',
      label: 'Expiry Period After Opening',
      type: 'text',
      required: false,
      instructions: '개봉 후 사용 기한 (예: 12개월)'
    }
  ]
};

export default cosmeticsFieldGroup;
