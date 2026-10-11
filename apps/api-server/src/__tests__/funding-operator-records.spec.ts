jest.mock('../services/marketTrial.notification.js', () => ({ marketTrialNotification: {} }));
import { MarketTrial } from '@o4o/market-trial';
import { MarketTrialOperatorController as Controller } from '../controllers/market-trial/marketTrialOperatorController.js';
import { participantCsvCell } from '../services/funding/funding-participant-export.js';

const project = { id: 'project', title: '=fixture title, "quoted"', status: 'recruiting' };
const repo = { findOne: jest.fn() };
const ds: any = { getRepository: (entity: any) => entity === MarketTrial ? repo : {}, query: jest.fn() };
const response = () => { const res: any = { status: jest.fn(), json: jest.fn(), send: jest.fn(), setHeader: jest.fn() }; res.status.mockReturnValue(res); return res; };
beforeEach(() => { jest.clearAllMocks(); repo.findOne.mockResolvedValue(project); Controller.setDataSource(ds); });

it.each(['listParticipants', 'exportParticipantsCSV'] as const)('%s rejects invalid filters instead of exporting all participants', async handler => {
  const res = response(); await Controller[handler]({ params: { id: 'project' }, query: { paymentStatus: 'invalid' } } as any, res);
  expect(res.status).toHaveBeenCalledWith(400); expect(ds.query).not.toHaveBeenCalled();
});
it('exports the displayed payment/reward conditions and distinguishes first and last confirmation', async () => {
  ds.query.mockResolvedValue([{ participantName: '@fixture', participantType: 'store_owner', rewardType: 'product', rewardStatus: 'pending', paymentStatus: 'paid', paidAmount: '12000', paidAt: new Date('2026-10-01T00:00:00Z'), confirmedAt: new Date('2026-10-11T00:00:00Z'), paymentReference: 'fixture, "value"', createdAt: new Date('2026-10-01T00:00:00Z') }]);
  const res = response(); await Controller.exportParticipantsCSV({ params: { id: 'project' }, query: { paymentStatus: 'paid', rewardType: 'product' } } as any, res);
  const [sql, values] = ds.query.mock.calls[0];
  expect(sql).toContain('COALESCE(p."paymentStatus", \'unpaid\')'); expect(values).toEqual(['project', 'product', 'paid']);
  const csv = res.send.mock.calls[0][0]; expect(csv).toContain('최초 입금 확인일,마지막 확인일');
  expect(csv).toContain("\"'@fixture\""); expect(csv).toContain('"fixture, ""value"""'); expect(csv).toContain("'=fixture title");
  expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining("filename*=UTF-8''"));
});
it('disabled settlement remains 409 with no writes', async () => {
  const res = response(); await Controller.updateParticipantSettlementStatus({} as any, res);
  expect(res.status).toHaveBeenCalledWith(409); expect(ds.query).not.toHaveBeenCalled();
});
it('reward updates read the actual PostgreSQL SELECT projection and remain trial scoped', async () => {
  ds.query.mockResolvedValue([{ id: 'participant', rewardStatus: 'fulfilled', rewardType: 'product' }]);
  const res = response(); await Controller.updateParticipantRewardStatus({ params: { id: 'project', participantId: 'participant' }, body: { rewardStatus: 'fulfilled' } } as any, res);
  expect(ds.query.mock.calls[0][0]).toContain('SELECT * FROM updated'); expect(ds.query.mock.calls[0][1]).toEqual(['fulfilled', 'participant', 'project']);
  expect(res.json.mock.calls[0][0].data.rewardStatus).toBe('fulfilled');
});
it.each(['=SUM(1,2)', ' \t@fixture', '\rvalue', '-1', '+fixture'])('neutralizes spreadsheet formulas: %s', value => {
  expect(participantCsvCell(value)).toBe(`"'${value}"`);
});
