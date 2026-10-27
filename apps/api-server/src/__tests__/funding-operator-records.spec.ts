jest.mock('../services/marketTrial.notification.js', () => ({ marketTrialNotification: {} }));
import { MarketTrial } from '@o4o/market-trial';
import { MarketTrialOperatorController as Controller } from '../controllers/market-trial/marketTrialOperatorController.js';
import { participantCsvCell } from '../services/funding/funding-participant-export.js';

const project = { id: 'project', title: '=fixture title, "quoted"', status: 'recruiting' };
const repo = { findOne: jest.fn() };
const auditInsert = jest.fn().mockResolvedValue({});
const ds: any = { transaction: jest.fn((work: any) => work({ query: ds.query, getRepository: () => ({ insert: auditInsert }) })), getRepository: (entity: any) => entity === MarketTrial ? repo : {}, query: jest.fn() };
const response = () => { const res: any = { status: jest.fn(), json: jest.fn(), send: jest.fn(), setHeader: jest.fn() }; res.status.mockReturnValue(res); return res; };
beforeEach(() => { jest.clearAllMocks(); repo.findOne.mockResolvedValue(project); Controller.setDataSource(ds); });

it.each(['listParticipants', 'exportParticipantsCSV'] as const)('%s rejects invalid filters instead of exporting all participants', async handler => {
  const res = response(); await Controller[handler]({ params: { id: 'project' }, query: { paymentStatus: 'invalid' } } as any, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(ds.query).not.toHaveBeenCalled();
});
it('exports the displayed payment/reward conditions and distinguishes first and last confirmation', async () => {
  ds.query.mockResolvedValue([{ participantName: '@fixture', participantType: 'store_owner', rewardType: 'product', rewardStatus: 'pending', paymentStatus: 'paid', paidAmount: '12000', paidAt: new Date('2026-10-01T00:00:00Z'), confirmedAt: new Date('2026-10-11T00:00:00Z'), paymentReference: 'fixture, "value"', withdrawn:true, createdAt: new Date('2026-10-01T00:00:00Z') }]);
  const res = response(); await Controller.exportParticipantsCSV({ params: { id: 'project' }, query: { paymentStatus: 'paid', rewardType: 'product' } } as any, res);
  const [sql, values] = ds.query.mock.calls[0];
  expect(sql).toContain('COALESCE(p."paymentStatus", \'unpaid\')'); expect(values).toEqual(['project', 'product', 'paid']);
  const csv = res.send.mock.calls[0][0]; expect(csv).toContain('참여 상태'); expect(csv).toContain('철회'); expect(csv).toContain('최초 입금 확인일,마지막 확인일');
  expect(csv).toContain("\"'@fixture\""); expect(csv).toContain('"fixture, ""value"""'); expect(csv).toContain("'=fixture title");
  expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining("filename*=UTF-8''"));
});
it('disabled settlement remains 409 with no writes', async () => {
  const res = response(); await Controller.updateParticipantSettlementStatus({} as any, res);
  expect(res.status).toHaveBeenCalledWith(409); expect(ds.query).not.toHaveBeenCalled();
});
it('reward updates read the actual PostgreSQL SELECT projection and remain trial scoped', async () => {
  ds.query.mockResolvedValueOnce([{ id: 'participant', rewardStatus: 'pending' }]).mockResolvedValueOnce([{ id: 'participant', rewardStatus: 'fulfilled', rewardType: 'product' }]);
  const res = response(); await Controller.updateParticipantRewardStatus({ user: { id: 'operator' }, params: { id: 'project', participantId: 'participant' }, body: { rewardStatus: 'fulfilled' } } as any, res);
  expect(ds.query.mock.calls[0][0]).toContain('FOR UPDATE'); expect(ds.query.mock.calls[0][1]).toEqual(['participant', 'project']);
  expect(ds.query.mock.calls[1][0]).toContain('SELECT * FROM updated'); expect(ds.query.mock.calls[1][1]).toEqual(['fulfilled', 'participant', 'project']);
  expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'operator', meta: { trialId: 'project', participantId: 'participant', beforeStatus: 'pending', afterStatus: 'fulfilled' } }));
  expect(res.json.mock.calls[0][0].data.rewardStatus).toBe('fulfilled');
});
it.each(['=SUM(1,2)', ' \t@fixture', '\rvalue', '-1', '+fixture'])('neutralizes spreadsheet formulas: %s', value => {
  expect(participantCsvCell(value)).toBe(`"'${value}"`);
});

it('reports one current participant after withdrawal/replacement while preserving both history rows', async () => {
  const date=new Date('2026-10-17T00:00:00Z');
  ds.query.mockReset().mockResolvedValueOnce([
    {id:'old',participantName:'철회 기록',withdrawn:true,rewardType:'product',rewardStatus:'pending',createdAt:date,updatedAt:date},
    {id:'replacement',participantName:'현재 참여',withdrawn:false,rewardType:'product',rewardStatus:'pending',createdAt:date,updatedAt:date},
  ]).mockResolvedValueOnce([
    {withdrawn:true,rewardType:'product',rewardStatus:'pending',settlementStatus:'pending'},
    {withdrawn:false,rewardType:'product',rewardStatus:'pending',settlementStatus:'pending'},
  ]);
  const res=response();await Controller.listParticipants({params:{id:'project'},query:{}} as any,res);
  const data=res.json.mock.calls[0][0].data;
  expect(data.summary).toMatchObject({totalCount:1,recordCount:2,withdrawnCount:1,productCount:1,pendingCount:1});
  expect(data.participants.map((p:any)=>p.withdrawn)).toEqual([true,false]);
});

it('preserves the history data array while adding bounded page metadata', async () => {
  ds.query.mockReset().mockResolvedValueOnce([{ id: 'participant' }]).mockResolvedValueOnce(Array.from({ length: 51 }, (_, n) => ({ id: String(n) })));
  const res = response();
  await Controller.participantHistory({ params: { id: '10000000-0000-4000-8000-000000000001', participantId: '20000000-0000-4000-8000-000000000001' }, query: { page: '2' } } as any, res);
  const result = res.json.mock.calls[0][0];
  expect(result).toMatchObject({ success: true, page: 2, hasMore: true });
  expect(Array.isArray(result.data)).toBe(true); expect(result.data).toHaveLength(50);
});
