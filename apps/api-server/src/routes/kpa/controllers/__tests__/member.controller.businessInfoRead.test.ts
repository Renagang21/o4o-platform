/**
 * WO-O4O-KPA-BUSINESSINFO-KEY-READ-ALIGNMENT-V1
 *
 * KPA 운영자 회원 목록(GET /kpa/members) DTO 와 회원 프로필 조회(MypageService.getProfile)가
 * **동일한 read 정렬 규칙**으로 주소·약국 전화를 노출하는지 고정한다 (WO 검증 항목 6).
 *
 * 목록 · 상세 · 수정 초기값은 프런트가 같은 `business_info` DTO 를 소비하므로
 * 이 응답 하나가 세 화면의 결과를 동시에 결정한다.
 * 모든 값은 개인정보가 아닌 합성 문자열이다.
 */

jest.mock('../../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { assignRole: jest.fn(), removeRole: jest.fn(), getRoleNames: jest.fn() },
}));
jest.mock('../../../../services/email.service.js', () => ({
  emailService: { isServiceAvailable: () => false },
}));
jest.mock('../../../../services/NotificationService.js', () => ({
  notificationService: { createNotification: jest.fn() },
}));
jest.mock('../../../../modules/organization/services/organization-ops.service.js', () => ({
  organizationOpsService: { ensureOrganization: jest.fn(), addMember: jest.fn() },
}));
jest.mock('@o4o/platform-core/store-identity', () => ({
  StoreSlugService: jest.fn().mockImplementation(() => ({})),
}), { virtual: true });

import { createMemberController } from '../member.controller.js';
import { MypageService } from '../../services/mypage.service.js';
import { resolveKpaBusinessContact } from '../../shared/businessInfoRead.js';

const USER_ID = '22222222-3333-4444-8555-666666666666';

/** GET /kpa/members 를 한 회원의 businessInfo 로 실행하고 business_info DTO 를 돌려준다. */
async function listDtoFor(businessInfo: any): Promise<any> {
  const dataSource: any = {
    getRepository: () => ({ findOne: async () => null, find: async () => [], save: async (v: any) => v, create: (v: any) => v }),
    query: async (sql: string) => {
      if (/COUNT\(\*\)/i.test(sql)) return [{ total: 1 }];
      return [{
        sm_id: 'sm-1',
        km_id: 'km-1',
        user_id: USER_ID,
        service_key: 'kpa-society',
        status: 'active',
        user_business_info: businessInfo,
      }];
    },
  };
  const router: any = createMemberController(
    dataSource,
    ((_r: any, _s: any, next: any) => next()) as any,
    (() => (_r: any, _s: any, next: any) => next()) as any,
  );
  const layer = router.stack.find((l: any) => l.route?.path === '/' && l.route?.methods?.get);
  const stack = layer.route.stack;
  const handler = stack[stack.length - 1].handle;

  const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
  await handler({ query: {}, user: { id: 'op-1' } } as any, res);

  const payload = res.json.mock.calls[0][0];
  return payload.data[0].business_info;
}

/** MypageService.getProfile 을 한 회원의 businessInfo 로 실행한다. */
async function profileFor(businessInfo: any): Promise<any> {
  const dataSource: any = {
    getRepository: (name: string) => ({
      findOne: async () =>
        name === 'User' ? { id: USER_ID, roles: [], businessInfo } : null,
      find: async () => [],
    }),
  };
  return new MypageService(dataSource).getProfile(USER_ID);
}

const CASES: Array<{ label: string; biz: any; address: string | null; phone: string | null }> = [
  {
    label: '1) canonical 키만',
    biz: { address: 'CANON', address2: 'C2', zipCode: '11111', metadata: { pharmacy_phone: '02-000-0001' } },
    address: 'CANON',
    phone: '02-000-0001',
  },
  {
    label: '2) legacy 키만',
    biz: { businessAddress: 'LEGACY', businessAddressDetail: 'L2', pharmacyPhone: '02-000-0002' },
    address: 'LEGACY',
    phone: '02-000-0002',
  },
  {
    label: '3) 양쪽 모두 → canonical 우선',
    biz: {
      address: 'CANON', businessAddress: 'LEGACY',
      metadata: { pharmacy_phone: '02-000-0001' }, pharmacyPhone: '02-000-0002',
    },
    address: 'CANON',
    phone: '02-000-0001',
  },
  {
    label: '4) canonical 빈 문자열 → legacy 유지',
    biz: { address: '', businessAddress: 'LEGACY', metadata: { pharmacy_phone: '' }, pharmacyPhone: '02-000-0002' },
    address: 'LEGACY',
    phone: '02-000-0002',
  },
  {
    label: '5) 둘 다 없음',
    biz: { businessNumber: '000-00-00000' },
    address: null,
    phone: null,
  },
];

describe('GET /kpa/members — business_info 주소·약국 전화 read 정렬', () => {
  it.each(CASES)('$label', async ({ biz, address, phone }) => {
    const dto = await listDtoFor(biz);
    expect(dto.address).toBe(address);
    expect(dto.pharmacy_phone).toBe(phone);
  });

  it('legacy businessAddress 만 있어도 목록이 빈 주소를 보이지 않는다 (D-3 회귀)', async () => {
    const dto = await listDtoFor({ businessAddress: 'LEGACY', businessAddressDetail: 'L2' });
    expect(dto.address).toBe('LEGACY');
    expect(dto.address2).toBe('L2');
  });

  it('공통 운영자 콘솔이 쓴 pharmacyPhone 이 목록에서 사라지지 않는다 (D-4 회귀)', async () => {
    const dto = await listDtoFor({ pharmacyPhone: '02-000-0002' });
    expect(dto.pharmacy_phone).toBe('02-000-0002');
  });

  it('범위 밖 필드와 storeAddress projection 은 기존 계약 그대로다', async () => {
    const dto = await listDtoFor({
      businessNumber: '000-00-00000',
      businessName: 'STORE',
      storeAddress: { zipCode: '33333', baseAddress: 'STRUCT', detailAddress: 'S2' },
    });
    expect(dto.businessNumber).toBe('000-00-00000');
    expect(dto.businessName).toBe('STORE');
    expect(dto.storeAddress).toEqual({ zipCode: '33333', baseAddress: 'STRUCT', detailAddress: 'S2' });
  });
});

describe('MypageService.getProfile — businessContact', () => {
  it.each(CASES)('$label', async ({ biz, address, phone }) => {
    const profile = await profileFor(biz);
    expect(profile.businessContact.address).toBe(address);
    expect(profile.businessContact.pharmacyPhone).toBe(phone);
  });

  it('raw businessInfo 는 손대지 않고 그대로 내려간다 (기존 계약 불변)', async () => {
    const biz = { businessAddress: 'LEGACY', pharmacyPhone: '02-000-0002' };
    const profile = await profileFor(biz);
    expect(profile.businessInfo).toEqual(biz);
  });

  it('businessInfo 가 없으면 businessContact 는 전부 null 이다', async () => {
    const profile = await profileFor(null);
    expect(profile.businessContact).toEqual({
      zipCode: null, address: null, address2: null, pharmacyPhone: null,
    });
  });
});

describe('목록 DTO 와 프로필 조회의 결과 일치 (WO 검증 6)', () => {
  it.each(CASES)('$label — 두 경로가 같은 값을 낸다', async ({ biz }) => {
    const dto = await listDtoFor(biz);
    const profile = await profileFor(biz);
    const expected = resolveKpaBusinessContact(biz);

    expect({
      zipCode: dto.zipCode, address: dto.address, address2: dto.address2, pharmacyPhone: dto.pharmacy_phone,
    }).toEqual(expected);
    expect(profile.businessContact).toEqual(expected);
  });
});
