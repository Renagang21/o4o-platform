/**
 * Migration: SeedKpaSignageContent
 *
 * WO-KPA-SOCIETY-SIGNAGE-SEED-V2
 *
 * Seeds digital signage content for KPA-a (community service) alpha testing.
 *
 * Phase 0: Add missing entity columns (source, scope, parentMediaId/parentPlaylistId)
 *          that exist in entities but were not in CreateSignageCoreEntities migration.
 *
 * Phase 1: KPA-a Operator (HQ) content — 8 single videos + 6 playlists (3 items each)
 * Phase 2: KPA-a Pharmacist (Store) content — 6 single videos + 4 playlists (3 items each)
 *
 * Total: 44 media + 10 playlists + 30 playlist items
 *
 * YouTube URL based. Idempotent via ON CONFLICT DO NOTHING.
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// ============================================================================
// Constants
// ============================================================================

const SERVICE_KEY = 'kpa-society';

const ORG_IDS = {
  ASSOCIATION: 'a0000000-0a00-4000-a000-000000000001',   // 대한약사회
  JONGNO_GROUP: 'a0000000-0a00-4000-a000-000000000003',  // 종로구약사회
};

// Operator = yaksa31 (대한약사회, 근무약사 → KPA-a 운영자)
// Pharmacist = yaksa01 (종로구약사회, 개국약사 → KPA-a 이용 약사)
const OPERATOR_EMAIL = 'yaksa31@o4o.com';
const PHARMACIST_EMAIL = 'yaksa01@o4o.com';

// ============================================================================
// UUID Scheme (hex-safe: d, a, 0, 1, 2 only)
// ============================================================================
// Media:         d0000000-0a00-4000-d000-000000000{001..044}
// Playlists:     d1000000-0a00-4000-d100-000000000{001..010}
// Playlist items: d2000000-0a00-4000-d200-000000000{001..030}

function mediaId(n: number): string {
  return `d0000000-0a00-4000-d000-${n.toString().padStart(12, '0')}`;
}
function playlistId(n: number): string {
  return `d1000000-0a00-4000-d100-${n.toString().padStart(12, '0')}`;
}
function playlistItemId(n: number): string {
  return `d2000000-0a00-4000-d200-${n.toString().padStart(12, '0')}`;
}

// ============================================================================
// Media Data
// ============================================================================

interface MediaSeed {
  id: string;
  name: string;
  description: string;
  sourceUrl: string;
  embedId: string;
  duration: number;  // seconds
  category: string;
  source: 'hq' | 'store';
  scope: 'global' | 'store';
  organizationId: string | null;
  tags: string[];
}

// --- HQ Operator: 8 standalone videos ---
const hqStandaloneMedia: MediaSeed[] = [
  {
    id: mediaId(1), name: '약국 디지털 사이니지 소개',
    description: '약국에서 디지털 사이니지를 활용하는 방법을 소개합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def01', embedId: 'abc123def01',
    duration: 420, category: '사이니지 교육', source: 'hq', scope: 'global',
    organizationId: ORG_IDS.ASSOCIATION, tags: ['사이니지', '교육', '약국'],
  },
  {
    id: mediaId(2), name: '의약품 안전 사용 가이드',
    description: '의약품의 올바른 보관 및 사용법에 대한 가이드입니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def02', embedId: 'abc123def02',
    duration: 540, category: '의약품 정보', source: 'hq', scope: 'global',
    organizationId: ORG_IDS.ASSOCIATION, tags: ['의약품', '안전', '가이드'],
  },
  {
    id: mediaId(3), name: '2026년 봄철 건강관리 팁',
    description: '환절기에 주의해야 할 건강관리 수칙을 안내합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def03', embedId: 'abc123def03',
    duration: 360, category: '건강정보', source: 'hq', scope: 'global',
    organizationId: ORG_IDS.ASSOCIATION, tags: ['건강', '계절', '봄'],
  },
  {
    id: mediaId(4), name: '처방전 읽는 법 완전 가이드',
    description: '환자 상담 시 처방전 해독 방법을 설명합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def04', embedId: 'abc123def04',
    duration: 600, category: '약사 교육', source: 'hq', scope: 'global',
    organizationId: ORG_IDS.ASSOCIATION, tags: ['처방전', '상담', '교육'],
  },
  {
    id: mediaId(5), name: 'OTC 의약품 선택 가이드',
    description: '일반의약품 추천 시 고려해야 할 사항을 정리했습니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def05', embedId: 'abc123def05',
    duration: 480, category: '의약품 정보', source: 'hq', scope: 'global',
    organizationId: ORG_IDS.ASSOCIATION, tags: ['OTC', '의약품', '추천'],
  },
  {
    id: mediaId(6), name: '약국 경영 현대화 전략',
    description: '디지털 전환 시대의 약국 경영 노하우를 공유합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def06', embedId: 'abc123def06',
    duration: 720, category: '약국 경영', source: 'hq', scope: 'global',
    organizationId: ORG_IDS.ASSOCIATION, tags: ['경영', '디지털', '전환'],
  },
  {
    id: mediaId(7), name: '건강기능식품 상담 가이드',
    description: '건강기능식품 복용 상담 시 핵심 포인트를 안내합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def07', embedId: 'abc123def07',
    duration: 510, category: '건강정보', source: 'hq', scope: 'global',
    organizationId: ORG_IDS.ASSOCIATION, tags: ['건강기능식품', '상담'],
  },
  {
    id: mediaId(8), name: '2026년 1분기 신규 의약품 업데이트',
    description: '최근 허가된 신규 의약품 목록과 특성을 소개합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def08', embedId: 'abc123def08',
    duration: 660, category: '의약품 정보', source: 'hq', scope: 'global',
    organizationId: ORG_IDS.ASSOCIATION, tags: ['신규', '의약품', '업데이트'],
  },
];

// --- HQ Operator: 6 playlists × 3 videos each (media IDs 9..26) ---
const hqPlaylistMedia: MediaSeed[] = [
  // Playlist 1: 약국 운영 매뉴얼 시리즈
  { id: mediaId(9), name: '약국 운영 매뉴얼 1편 - 재고관리', description: '효율적인 재고관리 시스템 구축 방법',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def09', embedId: 'abc123def09', duration: 480,
    category: '약국 경영', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['운영', '재고'] },
  { id: mediaId(10), name: '약국 운영 매뉴얼 2편 - 고객관리', description: '단골 고객 관리 시스템',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def10', embedId: 'abc123def10', duration: 450,
    category: '약국 경영', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['운영', '고객'] },
  { id: mediaId(11), name: '약국 운영 매뉴얼 3편 - 인력관리', description: '약국 인력 채용 및 교육',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def11', embedId: 'abc123def11', duration: 510,
    category: '약국 경영', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['운영', '인력'] },

  // Playlist 2: 환자 상담 기법 시리즈
  { id: mediaId(12), name: '환자 상담 기법 1 - 복약지도 기본', description: '효과적인 복약지도 대화 기법',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def12', embedId: 'abc123def12', duration: 540,
    category: '약사 교육', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['상담', '복약지도'] },
  { id: mediaId(13), name: '환자 상담 기법 2 - 어르신 상담', description: '고령 환자 눈높이 상담법',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def13', embedId: 'abc123def13', duration: 490,
    category: '약사 교육', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['상담', '어르신'] },
  { id: mediaId(14), name: '환자 상담 기법 3 - 소아 복약지도', description: '소아 환자 보호자 상담 요령',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def14', embedId: 'abc123def14', duration: 460,
    category: '약사 교육', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['상담', '소아'] },

  // Playlist 3: 의약품 정보 시리즈
  { id: mediaId(15), name: '의약품 정보 1 - 항생제 바로알기', description: '항생제 종류와 올바른 사용법',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def15', embedId: 'abc123def15', duration: 600,
    category: '의약품 정보', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['항생제', '의약품'] },
  { id: mediaId(16), name: '의약품 정보 2 - 진통제 비교분석', description: '아세트아미노펜 vs 이부프로펜 차이점',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def16', embedId: 'abc123def16', duration: 520,
    category: '의약품 정보', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['진통제', '비교'] },
  { id: mediaId(17), name: '의약품 정보 3 - 당뇨약 최신 동향', description: '최신 당뇨 치료제 트렌드',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def17', embedId: 'abc123def17', duration: 580,
    category: '의약품 정보', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['당뇨', '치료제'] },

  // Playlist 4: 건강 교육 시리즈
  { id: mediaId(18), name: '건강 교육 1 - 수면과 건강', description: '숙면을 위한 생활 습관 개선',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def18', embedId: 'abc123def18', duration: 380,
    category: '건강정보', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['수면', '건강'] },
  { id: mediaId(19), name: '건강 교육 2 - 면역력 강화', description: '면역력 향상을 위한 영양소 가이드',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def19', embedId: 'abc123def19', duration: 420,
    category: '건강정보', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['면역', '영양'] },
  { id: mediaId(20), name: '건강 교육 3 - 눈 건강 관리', description: '디지털 시대 눈 건강 보호법',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def20', embedId: 'abc123def20', duration: 350,
    category: '건강정보', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['눈', '건강'] },

  // Playlist 5: 약사회 소식 모음
  { id: mediaId(21), name: '약사회 소식 - 2026년 정기총회 하이라이트', description: '대한약사회 정기총회 주요 안건',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def21', embedId: 'abc123def21', duration: 900,
    category: '약사회 소식', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['약사회', '총회'] },
  { id: mediaId(22), name: '약사회 소식 - 약사 보수교육 안내', description: '2026년 보수교육 일정 및 방법',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def22', embedId: 'abc123def22', duration: 300,
    category: '약사회 소식', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['보수교육', '안내'] },
  { id: mediaId(23), name: '약사회 소식 - 약국 디지털 전환 프로젝트', description: 'O4O 플랫폼 약국 서비스 소개',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def23', embedId: 'abc123def23', duration: 480,
    category: '약사회 소식', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['디지털', 'O4O'] },

  // Playlist 6: 디지털 사이니지 활용법
  { id: mediaId(24), name: '사이니지 활용 1 - 기본 설정', description: '사이니지 초기 설정 및 콘텐츠 등록',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def24', embedId: 'abc123def24', duration: 420,
    category: '사이니지 교육', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['사이니지', '설정'] },
  { id: mediaId(25), name: '사이니지 활용 2 - 스케줄 관리', description: '시간대별 콘텐츠 스케줄 설정',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def25', embedId: 'abc123def25', duration: 380,
    category: '사이니지 교육', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['사이니지', '스케줄'] },
  { id: mediaId(26), name: '사이니지 활용 3 - 템플릿 커스터마이징', description: '매장에 맞는 템플릿 수정법',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def26', embedId: 'abc123def26', duration: 450,
    category: '사이니지 교육', source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION, tags: ['사이니지', '템플릿'] },
];

// --- Pharmacist (Store): 6 standalone videos ---
const storeStandaloneMedia: MediaSeed[] = [
  {
    id: mediaId(27), name: '종로중앙약국 소개',
    description: '종로구 종로중앙약국을 소개합니다. 야간 운영, 처방 조제, 건강 상담.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def27', embedId: 'abc123def27',
    duration: 180, category: '약국 소개', source: 'store', scope: 'store',
    organizationId: ORG_IDS.JONGNO_GROUP, tags: ['약국', '소개', '종로'],
  },
  {
    id: mediaId(28), name: '감기 예방 수칙 안내',
    description: '환절기 감기 예방을 위한 생활 수칙을 안내합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def28', embedId: 'abc123def28',
    duration: 240, category: '건강정보', source: 'store', scope: 'store',
    organizationId: ORG_IDS.JONGNO_GROUP, tags: ['감기', '예방'],
  },
  {
    id: mediaId(29), name: '당뇨 관리 생활 안내',
    description: '당뇨 환자를 위한 일상 생활 관리 팁입니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def29', embedId: 'abc123def29',
    duration: 300, category: '건강정보', source: 'store', scope: 'store',
    organizationId: ORG_IDS.JONGNO_GROUP, tags: ['당뇨', '관리'],
  },
  {
    id: mediaId(30), name: '2월 약국 이벤트 안내',
    description: '종로중앙약국 2월 건강검진 이벤트를 안내합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def30', embedId: 'abc123def30',
    duration: 120, category: '이벤트', source: 'store', scope: 'store',
    organizationId: ORG_IDS.JONGNO_GROUP, tags: ['이벤트', '2월'],
  },
  {
    id: mediaId(31), name: '혈압 관리 가이드',
    description: '고혈압 환자를 위한 자가 혈압 관리 방법입니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def31', embedId: 'abc123def31',
    duration: 270, category: '건강정보', source: 'store', scope: 'store',
    organizationId: ORG_IDS.JONGNO_GROUP, tags: ['혈압', '고혈압'],
  },
  {
    id: mediaId(32), name: '봄철 영양제 추천 안내',
    description: '봄 환절기에 도움되는 영양제를 추천합니다.',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def32', embedId: 'abc123def32',
    duration: 210, category: '건강정보', source: 'store', scope: 'store',
    organizationId: ORG_IDS.JONGNO_GROUP, tags: ['영양제', '추천'],
  },
];

// --- Pharmacist (Store): 4 playlists × 3 videos each (media IDs 33..44) ---
const storePlaylistMedia: MediaSeed[] = [
  // Playlist 7: 일반의약품 소개 시리즈
  { id: mediaId(33), name: '일반의약품 1 - 감기약 비교', description: '종합감기약 성분 비교 분석',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def33', embedId: 'abc123def33', duration: 300,
    category: '의약품 정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['감기약', 'OTC'] },
  { id: mediaId(34), name: '일반의약품 2 - 소화제 선택', description: '증상별 소화제 추천',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def34', embedId: 'abc123def34', duration: 280,
    category: '의약품 정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['소화제', 'OTC'] },
  { id: mediaId(35), name: '일반의약품 3 - 외용제 사용법', description: '파스, 연고 등 외용제 올바른 사용',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def35', embedId: 'abc123def35', duration: 260,
    category: '의약품 정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['외용제', '사용법'] },

  // Playlist 8: 건강 생활 팁 모음
  { id: mediaId(36), name: '건강 팁 1 - 올바른 손씻기', description: '감염 예방을 위한 손씻기 6단계',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def36', embedId: 'abc123def36', duration: 180,
    category: '건강정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['손씻기', '예방'] },
  { id: mediaId(37), name: '건강 팁 2 - 올바른 약 복용법', description: '약 복용 시 주의사항 총정리',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def37', embedId: 'abc123def37', duration: 240,
    category: '건강정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['복용법', '주의사항'] },
  { id: mediaId(38), name: '건강 팁 3 - 수분 섭취의 중요성', description: '하루 적정 수분 섭취량과 방법',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def38', embedId: 'abc123def38', duration: 200,
    category: '건강정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['수분', '건강'] },

  // Playlist 9: 계절 건강관리 시리즈
  { id: mediaId(39), name: '계절 건강 1 - 봄 알레르기 관리', description: '꽃가루 알레르기 예방과 대처',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def39', embedId: 'abc123def39', duration: 320,
    category: '건강정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['알레르기', '봄'] },
  { id: mediaId(40), name: '계절 건강 2 - 여름 식중독 예방', description: '여름철 식중독 예방 수칙',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def40', embedId: 'abc123def40', duration: 280,
    category: '건강정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['식중독', '여름'] },
  { id: mediaId(41), name: '계절 건강 3 - 겨울 피부 관리', description: '건조한 겨울 피부 보습 관리',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def41', embedId: 'abc123def41', duration: 250,
    category: '건강정보', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['피부', '겨울'] },

  // Playlist 10: 약국 서비스 안내
  { id: mediaId(42), name: '서비스 안내 1 - 처방전 접수', description: '종로중앙약국 처방전 접수 안내',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def42', embedId: 'abc123def42', duration: 150,
    category: '약국 소개', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['처방전', '접수'] },
  { id: mediaId(43), name: '서비스 안내 2 - 건강상담 예약', description: '건강상담 예약 방법 안내',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def43', embedId: 'abc123def43', duration: 120,
    category: '약국 소개', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['상담', '예약'] },
  { id: mediaId(44), name: '서비스 안내 3 - 배달 서비스', description: '의약품 배달 서비스 이용 안내',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123def44', embedId: 'abc123def44', duration: 130,
    category: '약국 소개', source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP, tags: ['배달', '서비스'] },
];

const allMedia = [...hqStandaloneMedia, ...hqPlaylistMedia, ...storeStandaloneMedia, ...storePlaylistMedia];

// ============================================================================
// Playlist Data
// ============================================================================

interface PlaylistSeed {
  id: string;
  name: string;
  description: string;
  source: 'hq' | 'store';
  scope: 'global' | 'store';
  organizationId: string | null;
  mediaIds: string[];  // references to media
}

const playlists: PlaylistSeed[] = [
  // HQ playlists (1..6)
  {
    id: playlistId(1), name: '약국 운영 매뉴얼 시리즈',
    description: '약국 운영에 필요한 핵심 매뉴얼 3편 모음',
    source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION,
    mediaIds: [mediaId(9), mediaId(10), mediaId(11)],
  },
  {
    id: playlistId(2), name: '환자 상담 기법 시리즈',
    description: '다양한 환자 유형별 상담 기법 모음',
    source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION,
    mediaIds: [mediaId(12), mediaId(13), mediaId(14)],
  },
  {
    id: playlistId(3), name: '의약품 핵심 정보 시리즈',
    description: '약사가 알아야 할 주요 의약품 정보',
    source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION,
    mediaIds: [mediaId(15), mediaId(16), mediaId(17)],
  },
  {
    id: playlistId(4), name: '건강 교육 시리즈',
    description: '대국민 건강 교육 영상 모음',
    source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION,
    mediaIds: [mediaId(18), mediaId(19), mediaId(20)],
  },
  {
    id: playlistId(5), name: '약사회 소식 모음',
    description: '대한약사회 주요 소식과 안내',
    source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION,
    mediaIds: [mediaId(21), mediaId(22), mediaId(23)],
  },
  {
    id: playlistId(6), name: '디지털 사이니지 활용법',
    description: '약국 사이니지 설정 및 활용 가이드',
    source: 'hq', scope: 'global', organizationId: ORG_IDS.ASSOCIATION,
    mediaIds: [mediaId(24), mediaId(25), mediaId(26)],
  },
  // Store playlists (7..10)
  {
    id: playlistId(7), name: '일반의약품 소개 시리즈',
    description: '자주 찾는 일반의약품 설명 모음',
    source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP,
    mediaIds: [mediaId(33), mediaId(34), mediaId(35)],
  },
  {
    id: playlistId(8), name: '건강 생활 팁 모음',
    description: '일상에서 실천할 수 있는 건강 팁',
    source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP,
    mediaIds: [mediaId(36), mediaId(37), mediaId(38)],
  },
  {
    id: playlistId(9), name: '계절 건강관리 시리즈',
    description: '계절별 건강 관리 안내 영상',
    source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP,
    mediaIds: [mediaId(39), mediaId(40), mediaId(41)],
  },
  {
    id: playlistId(10), name: '약국 서비스 안내',
    description: '종로중앙약국 주요 서비스 소개',
    source: 'store', scope: 'store', organizationId: ORG_IDS.JONGNO_GROUP,
    mediaIds: [mediaId(42), mediaId(43), mediaId(44)],
  },
];

// ============================================================================
// Migration
// ============================================================================

export class SeedKpaSignageContent20260207400000 implements MigrationInterface {
  name = 'SeedKpaSignageContent20260207400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================================================================
    // Phase 0: Add missing columns (source, scope, parent*Id)
    // These exist in entities but were not in CreateSignageCoreEntities
    // ==================================================================

    // signage_media: add source, scope, parentMediaId
    const mediaCols = await this.getColumnNames(queryRunner, 'signage_media');
    if (!mediaCols.includes('source')) {
      await queryRunner.query(`ALTER TABLE "signage_media" ADD COLUMN "source" varchar(20) DEFAULT 'store'`);
    }
    if (!mediaCols.includes('scope')) {
      await queryRunner.query(`ALTER TABLE "signage_media" ADD COLUMN "scope" varchar(20) DEFAULT 'store'`);
    }
    if (!mediaCols.includes('parentMediaId')) {
      await queryRunner.query(`ALTER TABLE "signage_media" ADD COLUMN "parentMediaId" uuid NULL`);
    }

    // signage_playlists: add source, scope, parentPlaylistId
    const playlistCols = await this.getColumnNames(queryRunner, 'signage_playlists');
    if (!playlistCols.includes('source')) {
      await queryRunner.query(`ALTER TABLE "signage_playlists" ADD COLUMN "source" varchar(20) DEFAULT 'store'`);
    }
    if (!playlistCols.includes('scope')) {
      await queryRunner.query(`ALTER TABLE "signage_playlists" ADD COLUMN "scope" varchar(20) DEFAULT 'store'`);
    }
    if (!playlistCols.includes('parentPlaylistId')) {
      await queryRunner.query(`ALTER TABLE "signage_playlists" ADD COLUMN "parentPlaylistId" uuid NULL`);
    }

    // Create indexes for new columns
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_signage_media_source" ON "signage_media" ("source")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_signage_media_scope" ON "signage_media" ("scope")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_signage_media_parentMediaId" ON "signage_media" ("parentMediaId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_signage_playlists_source" ON "signage_playlists" ("source")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_signage_playlists_scope" ON "signage_playlists" ("scope")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_signage_playlists_parentPlaylistId" ON "signage_playlists" ("parentPlaylistId")`);

    // ==================================================================
    // Phase 1 & 2: Seed content
    // ==================================================================

    // Look up user IDs
    const operatorRow = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`, [OPERATOR_EMAIL]
    );
    const pharmacistRow = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`, [PHARMACIST_EMAIL]
    );

    if (!operatorRow.length || !pharmacistRow.length) {
      console.log('[SeedKpaSignageContent] Skipping: test users not found. Run SeedKpaTestAccounts first.');
      return;
    }

    const operatorUserId = operatorRow[0].id;
    const pharmacistUserId = pharmacistRow[0].id;

    // --- Insert all media ---
    let mediaInserted = 0;
    for (const m of allMedia) {
      const userId = m.source === 'hq' ? operatorUserId : pharmacistUserId;
      const tagsLiteral = `{${m.tags.join(',')}}`;

      const result = await queryRunner.query(`
        INSERT INTO "signage_media" (
          "id", "serviceKey", "organizationId",
          "name", "description", "mediaType", "sourceType",
          "sourceUrl", "embedId", "thumbnailUrl",
          "duration", "category", "status", "tags",
          "source", "scope",
          "createdByUserId", "metadata",
          "createdAt", "updatedAt", "version"
        ) VALUES (
          $1, $2, $3,
          $4, $5, 'video', 'youtube',
          $6, $7, $8,
          $9, $10, 'active', $11::text[],
          $12, $13,
          $14, '{}',
          NOW(), NOW(), 1
        )
        ON CONFLICT (id) DO NOTHING
      `, [
        m.id, SERVICE_KEY, m.organizationId,
        m.name, m.description,
        m.sourceUrl, m.embedId,
        `https://img.youtube.com/vi/${m.embedId}/hqdefault.jpg`,
        m.duration, m.category, tagsLiteral,
        m.source, m.scope,
        userId,
      ]);

      if (result?.[1] > 0 || (Array.isArray(result) && result.length === 0)) {
        mediaInserted++;
      }
    }

    // --- Insert all playlists ---
    let playlistsInserted = 0;
    for (const p of playlists) {
      const userId = p.source === 'hq' ? operatorUserId : pharmacistUserId;
      const totalDuration = p.mediaIds.reduce((sum, mid) => {
        const media = allMedia.find(m => m.id === mid);
        return sum + (media?.duration ?? 0);
      }, 0);

      await queryRunner.query(`
        INSERT INTO "signage_playlists" (
          "id", "serviceKey", "organizationId",
          "name", "description", "status",
          "loopEnabled", "defaultItemDuration", "transitionType", "transitionDuration",
          "totalDuration", "itemCount",
          "source", "scope",
          "isPublic", "likeCount", "downloadCount",
          "createdByUserId", "metadata",
          "createdAt", "updatedAt", "version"
        ) VALUES (
          $1, $2, $3,
          $4, $5, 'active',
          true, 10, 'fade', 500,
          $6, $7,
          $8, $9,
          false, 0, 0,
          $10, '{}',
          NOW(), NOW(), 1
        )
        ON CONFLICT (id) DO NOTHING
      `, [
        p.id, SERVICE_KEY, p.organizationId,
        p.name, p.description,
        totalDuration, p.mediaIds.length,
        p.source, p.scope,
        userId,
      ]);
      playlistsInserted++;
    }

    // --- Insert playlist items ---
    let itemsInserted = 0;
    let itemIdx = 1;
    for (const p of playlists) {
      const sourceType = p.source === 'hq' ? 'hq' : 'store';

      for (let i = 0; i < p.mediaIds.length; i++) {
        const mid = p.mediaIds[i];
        const media = allMedia.find(m => m.id === mid);

        await queryRunner.query(`
          INSERT INTO "signage_playlist_items" (
            "id", "playlistId", "mediaId",
            "sortOrder", "duration", "transitionType",
            "isActive", "isForced", "sourceType",
            "metadata", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3,
            $4, $5, 'fade',
            true, $6, $7,
            '{}', NOW(), NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `, [
          playlistItemId(itemIdx), p.id, mid,
          i + 1, media?.duration ?? 300,
          sourceType === 'hq',  // isForced for HQ content
          sourceType,
        ]);
        itemIdx++;
        itemsInserted++;
      }
    }

    console.log(`[SeedKpaSignageContent] Done: ${allMedia.length} media, ${playlists.length} playlists, ${itemsInserted} items`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete seed data in reverse order
    const mediaIds = allMedia.map(m => `'${m.id}'`).join(',');
    const plIds = playlists.map(p => `'${p.id}'`).join(',');

    // 1. Delete playlist items (by playlist ID)
    await queryRunner.query(`DELETE FROM "signage_playlist_items" WHERE "playlistId" IN (${plIds})`);

    // 2. Delete playlists
    await queryRunner.query(`DELETE FROM "signage_playlists" WHERE "id" IN (${plIds})`);

    // 3. Delete media
    await queryRunner.query(`DELETE FROM "signage_media" WHERE "id" IN (${mediaIds})`);

    // Note: columns added in Phase 0 are NOT removed (other data may depend on them)
    console.log('[SeedKpaSignageContent] Down: seed data removed (columns preserved)');
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private async getColumnNames(queryRunner: QueryRunner, tableName: string): Promise<string[]> {
    const rows = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1
    `, [tableName]);
    return rows.map((r: any) => r.column_name);
  }
}
