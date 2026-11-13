import { ConsultationTabletService, consultationTabletsSchema } from '../services/consultation-tablets.js';
import { resolveStoreAccessLevel } from '../../../services/store/store-membership.service.js';
import { getNetureMainMembershipStatus } from '../../neture/services/neture-main-membership.js';
jest.mock('../../../services/store/store-membership.service.js', () => ({ resolveStoreAccessLevel: jest.fn() }));
jest.mock('../../neture/services/neture-main-membership.js', () => ({ getNetureMainMembershipStatus: jest.fn() }));
const tablets = [
  { id: 'pharmacist-1', role: 'pharmacist', name: '조제실 앞 약사' },
  { id: 'staff-1', role: 'staff', name: '입구 근무자' },
  { id: 'staff-2', role: 'staff', name: '진열대 근무자' },
];
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(resolveStoreAccessLevel).mockResolvedValue({ level: 'owner', organizationId: 'store', memberRole: 'owner' } as never);
  jest.mocked(getNetureMainMembershipStatus).mockResolvedValue('active' as never);
});

it('accepts several tablets per role and rejects duplicates, unknown roles and extra fields', () => {
  expect(consultationTabletsSchema.safeParse(tablets).success).toBe(true);
  expect(consultationTabletsSchema.safeParse([tablets[0], tablets[0]]).success).toBe(false);
  expect(consultationTabletsSchema.safeParse([{ ...tablets[0], role: 'admin' }]).success).toBe(false);
  expect(consultationTabletsSchema.safeParse([{ ...tablets[0], professional: true }]).success).toBe(false);
  expect(consultationTabletsSchema.safeParse([{ ...tablets[0], name: '<b>x</b>' }]).success).toBe(false);
  expect(consultationTabletsSchema.safeParse(Array.from({ length: 31 }, (_, i) => ({ id: `t-${i}`, role: 'staff', name: `t${i}` }))).success).toBe(false);
});

it('lets the current owner save the list inside an owner-checked metadata update', async () => {
  const db = { query: jest.fn().mockResolvedValueOnce([{ id: 'store' }]).mockResolvedValueOnce([{ tablets }]) };
  expect(await new ConsultationTabletService(db as never).save('owner', 'store', { tablets })).toEqual({ organizationId: 'store', tablets, canEdit: true });
  expect(db.query.mock.calls[0][1]).toEqual(['store', 'owner', JSON.stringify(tablets)]);
  expect(db.query.mock.calls[0][0]).toContain("om.role='owner'");
  expect(db.query.mock.calls[0][0]).toContain('{consultationTablets}');
});

it.each(['member', 'none', 'other-store', 'manager', 'expired'])('denies %s before any write', async kind => {
  const db = { query: jest.fn() };
  if (kind === 'expired') jest.mocked(getNetureMainMembershipStatus).mockResolvedValue('inactive' as never);
  else jest.mocked(resolveStoreAccessLevel).mockResolvedValue({ level: kind === 'member' ? 'member' : kind === 'none' ? 'none' : 'owner', organizationId: kind === 'other-store' ? 'other' : 'store', memberRole: kind === 'manager' ? 'manager' : 'owner' } as never);
  await expect(new ConsultationTabletService(db as never).save('actor', 'store', { tablets })).rejects.toMatchObject({ httpStatus: 403 });
  expect(db.query).not.toHaveBeenCalled();
});

it('rejects an invalid list before checking access or writing', async () => {
  const db = { query: jest.fn() };
  await expect(new ConsultationTabletService(db as never).save('owner', 'store', { tablets: [{ id: 'x', role: 'consumer', name: 'kiosk' }] })).rejects.toMatchObject({ httpStatus: 400 });
  expect(db.query).not.toHaveBeenCalled();
});

it('lets members read without editing, returns an empty list by default and refuses malformed stored data', async () => {
  jest.mocked(resolveStoreAccessLevel).mockResolvedValue({ level: 'member', organizationId: 'store', memberRole: 'staff' } as never);
  const empty = { query: jest.fn().mockResolvedValue([{ tablets: null }]) };
  expect(await new ConsultationTabletService(empty as never).read('staff', 'store')).toEqual({ organizationId: 'store', tablets: [], canEdit: false });
  const malformed = { query: jest.fn().mockResolvedValue([{ tablets: [{ id: 'x', role: 'admin', name: 'x' }] }]) };
  await expect(new ConsultationTabletService(malformed as never).read('staff', 'store')).rejects.toMatchObject({ httpStatus: 503 });
  jest.mocked(resolveStoreAccessLevel).mockResolvedValue({ level: 'none', organizationId: null } as never);
  await expect(new ConsultationTabletService(empty as never).read('outsider', 'store')).rejects.toMatchObject({ httpStatus: 403 });
});
