/**
 * Sample Organizations Data
 * WO-KPA-OPERATION-TEST-ENV-V1: 운영 테스트 환경용 최소 데이터
 *
 * 구조:
 * - 지부 1개 (샘플지부)
 * - 분회 1개 (샘플분회) - 추가 분회는 테스트 시 직접 생성
 * - 각 조직별 위원회 3개 (학술, 정보통신, 총무)
 *
 * 주의: 자동 생성 로직 없음 - 모든 추가 데이터는 관리자 액션 기반
 */

import { Organization, OrganizationMember, CommitteeType, COMMITTEE_TYPE_LABELS } from '../types/organization';

// 위원회 유형
const COMMITTEE_TYPES: CommitteeType[] = ['academic', 'it', 'general'];

// 샘플 위원회 생성
const SAMPLE_COMMITTEE_PARENT_ID = 'committee-root';
function generateCommittees(): Organization[] {
  return COMMITTEE_TYPES.map((committeeType) => ({
    id: `committee-root-${committeeType}`,
    name: `샘플 ${COMMITTEE_TYPE_LABELS[committeeType]}`,
    type: 'committee' as const,
    parentId: SAMPLE_COMMITTEE_PARENT_ID,
    committeeType,
    memberCount: 3,
  }));
}

export const SAMPLE_COMMITTEES: Organization[] = generateCommittees();

// 약국 (WO-PHARMACY-CONTEXT-MVP-V1)
export const SAMPLE_PHARMACIES: Organization[] = [
  { id: 'pharmacy-1', name: '샘플약국', type: 'pharmacy', memberCount: 0 },
  { id: 'pharmacy-2', name: '건강약국', type: 'pharmacy', memberCount: 0 },
];

// 전체 조직 목록 (위원회 + 약국)
export const ALL_ORGANIZATIONS: Organization[] = [
  ...SAMPLE_COMMITTEES,
  ...SAMPLE_PHARMACIES,
];

// 위원회 멤버 샘플 데이터 생성
function generateCommitteeMembers(): OrganizationMember[] {
  const members: OrganizationMember[] = [];
  let memberIndex = 1;

  SAMPLE_COMMITTEES.forEach((committee) => {
    // Chair (위원장)
    members.push({
      id: `member-${memberIndex++}`,
      organizationId: committee.id,
      userId: `user-chair-${committee.id}`,
      name: `${committee.name.split(' ')[0]} 위원장`,
      email: `chair-${committee.id}@test.kpa.or.kr`,
      role: 'chair',
      permissions: {
        canWriteNotice: true,
        canCreateMeeting: true,
        canUploadDocument: true,
        canChangeSettings: true,
      },
    });

    // Officers (위원 2명)
    for (let i = 1; i <= 2; i++) {
      members.push({
        id: `member-${memberIndex++}`,
        organizationId: committee.id,
        userId: `user-officer-${committee.id}-${i}`,
        name: `${committee.name.split(' ')[0]} 위원${i}`,
        email: `officer${i}-${committee.id}@test.kpa.or.kr`,
        role: 'officer',
        permissions: {
          canWriteNotice: true,
          canCreateMeeting: false,
          canUploadDocument: true,
          canChangeSettings: false,
        },
      });
    }
  });

  return members;
}

export const SAMPLE_COMMITTEE_MEMBERS: OrganizationMember[] = generateCommitteeMembers();

/**
 * 특정 조직의 하위 조직 조회
 */
export function getChildOrganizations(parentId: string): Organization[] {
  return ALL_ORGANIZATIONS.filter((org) => org.parentId === parentId);
}

/**
 * 특정 조직의 멤버 조회
 */
export function getOrganizationMembers(organizationId: string): OrganizationMember[] {
  return SAMPLE_COMMITTEE_MEMBERS.filter((m) => m.organizationId === organizationId);
}

/**
 * 사용자가 속한 조직 목록 조회 (샘플: 모든 조직 접근 가능)
 */
export function getUserOrganizations(_userId: string): Organization[] {
  // 샘플에서는 모든 조직 반환 (실제는 API에서 사용자별 필터링)
  return ALL_ORGANIZATIONS;
}

/**
 * 조직 ID로 조직 조회
 */
export function getOrganizationById(id: string): Organization | undefined {
  return ALL_ORGANIZATIONS.find((org) => org.id === id);
}

/**
 * 상위 조직 체인 조회 (위원회 → 분회 → 지부)
 */
export function getOrganizationChain(organizationId: string): Organization[] {
  const chain: Organization[] = [];
  let current = getOrganizationById(organizationId);

  while (current) {
    chain.unshift(current);
    current = current.parentId ? getOrganizationById(current.parentId) : undefined;
  }

  return chain;
}
