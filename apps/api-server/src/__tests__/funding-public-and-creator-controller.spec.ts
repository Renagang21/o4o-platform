jest.mock('../services/marketTrial.notification.js', () => ({ marketTrialNotification: { onSubmitted: jest.fn(), onJoined: jest.fn() } }));
jest.mock('../controllers/market-trial/marketTrialOperatorController.js', () => ({ computeKpiSnapshot: jest.fn() }));
jest.mock('../modules/neture/middleware/neture-identity.middleware.js', () => ({ createRequireActiveSupplier: jest.fn() }));
jest.mock('../services/funding/funding-access.js', () => ({ isFundingCreator: jest.fn(), resolveFundingAccess: jest.fn() }));
import { MarketTrial, MarketTrialForum, MarketTrialParticipant, TrialStatus } from '@o4o/market-trial';
import { MarketTrialController } from '../controllers/market-trial/marketTrialController.js';
import { createRequireActiveSupplier } from '../modules/neture/middleware/neture-identity.middleware.js';
import { isFundingCreator } from '../services/funding/funding-access.js';
const creator = isFundingCreator as jest.Mock;
let record: any;
const repo = { find: jest.fn(), findOne: jest.fn(), createQueryBuilder: jest.fn(), create: jest.fn(), save: jest.fn() };
const participants = {find:jest.fn(),findOne:jest.fn()};
const forum = {findOne:jest.fn()};
const ds: any = { getRepository: (entity: any) => entity === MarketTrial ? repo : entity === MarketTrialParticipant ? participants : entity === MarketTrialForum ? forum : {}, query: jest.fn() };
function response() { const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; }
beforeEach(() => { jest.clearAllMocks(); ds.query.mockReset().mockResolvedValue([]);repo.find.mockResolvedValue([]);participants.find.mockResolvedValue([]);forum.findOne.mockResolvedValue(null); record = { id: 'project', status: TrialStatus.DRAFT, statusHistory: [], supplierId: 'owner' }; repo.findOne.mockImplementation(async () => record); MarketTrialController.setDataSource(ds); });
it.each(['draft', 'submitted', 'invalid'])('public status filter %s cannot enumerate unpublished projects', async status => {
  const res = response(); await MarketTrialController.getTrials({ query: { status } } as any, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(repo.createQueryBuilder).not.toHaveBeenCalled();
});
it.each([TrialStatus.DRAFT, TrialStatus.SUBMITTED, TrialStatus.CLOSED])('even a logged-in owner cannot use public detail to read unpublished/ambiguous %s', async status => {
  record.status = status;
  const res = response(); await MarketTrialController.getTrialById({ params: { id: 'project' }, user: { id: 'owner' } } as any, res);
  expect(res.status).toHaveBeenCalledWith(404);
});
it.each(['updateTrial', 'submitTrial', 'getCreatorParticipants', 'getSupplierTrialResults', 'changeCreatorStatus'] as const)('%s verifies current ownership before writes or participant disclosures', async handler => {
  creator.mockResolvedValue(false); const res = response();
  await MarketTrialController[handler]({ params: { id: 'project' }, body: { status: 'development' }, user: { id: 'other' } } as any, res);
  expect(res.status).toHaveBeenCalledWith(403); expect(ds.query).not.toHaveBeenCalled(); expect(repo.save).not.toHaveBeenCalled();
});
it('creation qualification delegates to the canonical supplier middleware, not JWT roles', async () => {
  const middleware = jest.fn(async (_req, res) => res.status(403).json({ code: 'SUPPLIER_NOT_ACTIVE' }));
  (createRequireActiveSupplier as jest.Mock).mockReturnValue(middleware);
  const res = response(); MarketTrialController.requireActiveCreator({ user: { id: 'ordinary', roles: ['supplier'] } } as any, res, jest.fn());
  expect(createRequireActiveSupplier).toHaveBeenCalledWith(ds); expect(res.status).toHaveBeenCalledWith(403);
});

it('uses recorded net deposits for supplier list and detail even when the legacy counter differs', async () => {
  record={...record,status:TrialStatus.DEVELOPMENT,currentAmount:999,targetAmount:100,trialUnitPrice:100,createdAt:new Date(),updatedAt:new Date()};
  repo.find.mockResolvedValue([record]);creator.mockResolvedValue(true);
  ds.query.mockImplementation(async(sql:string)=>sql.includes('GROUP BY "marketTrialId"')?[{id:'project',amount:'40'}]:[]);
  const list=response();await MarketTrialController.getMyTrials({user:{id:'owner'}} as any,list);
  expect(list.json).toHaveBeenCalledWith(expect.objectContaining({data:[expect.objectContaining({currentAmount:40,amountRate:40})]}));
  const detail=response();await MarketTrialController.getSupplierTrialResults({params:{id:'project'},user:{id:'owner'}} as any,detail);
  expect(detail.json).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({trial:expect.objectContaining({currentAmount:40,amountRate:40})})}));
  expect(ds.query.mock.calls.every(([sql]:[string])=>!/^\s*(INSERT|UPDATE|DELETE)/i.test(sql))).toBe(true);
});
