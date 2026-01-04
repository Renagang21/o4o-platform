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

// 지부 (1개만 존재)
export const SAMPLE_BRANCH: Organization = {
  id: 'branch-1',
  name: '샘플지부',
  type: 'branch',
  memberCount: 0, // 초기값 0, 실제 운영 시 회원 추가
};

// 분회 목록 (1개만 사전 생성)
export const SAMPLE_DIVISIONS: Organization[] = [
  { id: 'div-sample', name: '샘플분회', type: 'division', parentId: 'branch-1', memberCount: 0 },
];

// 위원회 유형
const COMMITTEE_TYPES: CommitteeType[] = ['academic', 'it', 'general'];

// 위원회 생성 함수
function generateCommittees(): Organization[] {
  const committees: Organization[] = [];

  SAMPLE_DIVISIONS.forEach((division) => {
    COMMITTEE_TYPES.forEach((committeeType) => {
      const divisionShortName = division.name.replace('분회', '');
      committees.push({
        id: `committee-${division.id}-${committeeType}`,
        name: `${divisionShortName}분회 ${COMMITTEE_TYPE_LABELS[committeeType]}`,
        type: 'committee',
        parentId: division.id,
        committeeType,
        memberCount: 3,
      });
    });
  });

  return committees;
}

export const SAMPLE_COMMITTEES: Organization[] = generateCommittees();

// 전체 조직 목록 (지부 + 분회 + 위원회)
export const ALL_ORGANIZATIONS: Organization[] = [
  SAMPLE_BRANCH,
  ...SAMPLE_DIVISIONS,
  ...SAMPLE_COMMITTEES,
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
