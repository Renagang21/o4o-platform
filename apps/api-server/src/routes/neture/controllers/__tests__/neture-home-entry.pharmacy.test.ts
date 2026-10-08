import { createNetureHomeEntryController } from '../neture-home-entry.controller.js';
import { getServiceMembershipStatusFromDb } from '../../../../utils/service-membership.js';
import { findStoreOrganizationCandidates } from '../../../../utils/store-organization.resolver.js';

jest.mock('../../../../utils/service-membership.js', () => ({ getServiceMembershipStatusFromDb: jest.fn() }));
jest.mock('../../../../utils/store-organization.resolver.js', () => ({ findStoreOrganizationCandidates: jest.fn() }));
jest.mock('../../../../utils/store-owner.utils.js', () => ({
  listStoreCapableServices: () => [
    { serviceKey: 'kpa-society', rolePrefix: 'kpa', storeOwnerRole: 'kpa:store_owner' },
    { serviceKey: 'pharmacy-hub', rolePrefix: 'pharmacy-hub', storeOwnerRole: 'pharmacy-hub:store_owner' },
  ],
}));
jest.mock('../../../../modules/neture/services/neture-service-state.service.js', () => ({
  resolveNetureServiceStates: jest.fn(async () => ({ supplier: { status: 'none', source: 'none' } })),
}));

const membership = jest.mocked(getServiceMembershipStatusFromDb);
const candidates = jest.mocked(findStoreOrganizationCandidates);
const ORG = '00000000-0000-4000-8000-000000000001';

async function entry(options: { legacyRole?: boolean } = {}) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('FROM role_assignments')) return options.legacyRole ? [{ present: 1 }] : [];
    if (sql.includes('FROM organizations')) return [{ id: ORG, name: '합성 체험 약국' }];
    return [];
  });
  const router = createNetureHomeEntryController({ query } as any, (_req, _res, next) => next());
  const route = (router as any).stack.find((layer: any) => layer.route?.path === '/entry').route;
  const handler = route.stack[route.stack.length - 1].handle;
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  handler({ user: { id: 'synthetic-demo', roles: ['neture:store_owner'] } }, res, next);
  await new Promise(resolve => setImmediate(resolve));
  expect(next).not.toHaveBeenCalled();
  return { body: res.json.mock.calls[0]?.[0], query };
}

beforeEach(() => {
  jest.clearAllMocks();
  membership.mockResolvedValue(null);
  candidates.mockResolvedValue([]);
});

describe('대표 홈의 약국 진입은 KPA 개인 회원 가입과 분리한다', () => {
  it('승인 원장 후보가 있으면 KPA 가입·역할 없이도 본인의 약국을 반환한다', async () => {
    candidates.mockImplementation(async (_ds, _user, prefix) => prefix === 'kpa'
      ? [{ organizationId: ORG, memberRole: 'owner' }]
      : []);
    const { body, query } = await entry();
    expect(body.data.stores).toEqual([{
      serviceKey: 'kpa-society', organizationId: ORG, name: '합성 체험 약국', memberRole: 'owner',
    }]);
    expect(candidates).toHaveBeenCalledWith(expect.anything(), 'synthetic-demo', 'kpa');
    expect(membership).not.toHaveBeenCalledWith(expect.anything(), 'synthetic-demo', 'kpa-society');
    expect(query.mock.calls.some(([sql]) => sql.includes('FROM role_assignments'))).toBe(false);
  });

  it('KPA 가입·옛 역할이 있어도 승인된 조직 후보가 없으면 약국을 반환하지 않는다', async () => {
    membership.mockResolvedValue('active');
    const { body } = await entry({ legacyRole: true });
    expect(body.data.stores).toEqual([]);
  });

  it('다른 서비스는 active 가입과 서비스 역할을 계속 요구한다', async () => {
    candidates.mockImplementation(async (_ds, _user, prefix) => prefix === 'pharmacy-hub'
      ? [{ organizationId: ORG, memberRole: 'owner' }]
      : []);
    expect((await entry({ legacyRole: true })).body.data.stores).toEqual([]);
    expect(candidates).not.toHaveBeenCalledWith(expect.anything(), 'synthetic-demo', 'pharmacy-hub');
    membership.mockResolvedValue('active');
    expect((await entry()).body.data.stores).toEqual([]);
    expect((await entry({ legacyRole: true })).body.data.stores).toHaveLength(1);
  });
});
