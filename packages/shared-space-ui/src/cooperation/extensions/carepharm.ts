import type { CooperationExtension } from '../core';
import { CAREPHARM_MATERIAL_OUTLINES, CAREPHARM_MATERIAL_TAGS } from '../carepharmMaterials';

export const carepharmExtension: CooperationExtension = {
  model: { key: 'carepharm', name: '만성질환관리', origin: 'https://carepharm.neture.co.kr', sessionServiceKey: 'neture', handoffTargetKey: 'carepharm', participationPath: '/my/participation', communityPath: '/communities/business%3Acarepharm/forum', storePath: '/store/pharmacy/carepharm' },
  siteName: 'CarePharm',
  membershipSubject: 'pharmacy-organization',
  materials: {
    label: 'CarePharm 회원자료 작성 도움',
    title: '회원 약국이 바로 활용할 수 있는 자료',
    description: '주제·사용 순서·출처·기준일을 함께 안내하세요. 게시한 원본을 회원 약국이 독립 사본으로 가져가 활용합니다.',
    memberDescription: '주제별 자료 묶음과 약국 운영 실무자료를 찾아보세요. 내 매장에서 사본을 가져와 우리 약국에 맞게 활용할 수 있습니다.',
    tags: CAREPHARM_MATERIAL_TAGS,
    outlines: CAREPHARM_MATERIAL_OUTLINES,
  },
};
