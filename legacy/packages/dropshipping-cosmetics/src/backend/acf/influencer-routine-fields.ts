import type { ACFGroupDefinition } from '@o4o/types';

/**
 * Influencer Routine ACF Field Group
 *
 * Defines fields for influencer-created skincare routines
 */
export const influencerRoutineFieldGroup: ACFGroupDefinition = {
  groupId: 'influencer_routine_metadata',
  label: 'Influencer Routine Information',
  appliesTo: 'cosmetics_influencer_routine',
  fields: [
    {
      key: 'partnerId',
      label: 'Partner ID',
      type: 'string',
      required: true,
      instructions: 'UUID of the partner/influencer who created this routine',
    },
    {
      key: 'title',
      label: 'Routine Title',
      type: 'string',
      required: true,
      instructions: '루틴 제목 (예: "아침 피부 진정 루틴")',
    },
    {
      key: 'description',
      label: 'Description',
      type: 'text',
      required: false,
      instructions: '인플루언서의 루틴 설명 및 사용 팁',
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
      instructions: '이 루틴에 적합한 피부타입을 선택하세요',
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
      instructions: '이 루틴이 해결하는 피부 고민',
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
      instructions: '루틴 사용 시간',
    },
    {
      key: 'routine',
      label: 'Routine Steps',
      type: 'array',
      required: true,
      subFields: [
        {
          key: 'step',
          label: 'Step Number',
          type: 'number',
          required: true,
        },
        {
          key: 'productId',
          label: 'Product ID',
          type: 'string',
          required: true,
        },
        {
          key: 'category',
          label: 'Category',
          type: 'string',
          required: true,
        },
        {
          key: 'description',
          label: 'Step Description',
          type: 'text',
          required: false,
        },
      ],
      instructions: '루틴 단계별 제품 구성',
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
      instructions: '루틴 태그',
    },
    {
      key: 'isPublished',
      label: 'Published',
      type: 'boolean',
      required: true,
      defaultValue: false,
      instructions: '공개 여부',
    },
    {
      key: 'viewCount',
      label: 'View Count',
      type: 'number',
      required: false,
      defaultValue: 0,
      instructions: '조회수',
    },
    {
      key: 'recommendCount',
      label: 'Recommend Count',
      type: 'number',
      required: false,
      defaultValue: 0,
      instructions: '추천수',
    },
  ],
};

export default influencerRoutineFieldGroup;
