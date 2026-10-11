import { MarketTrialOperatorController as controller } from '../marketTrialOperatorController.js';
import { MarketTrialForumSyncFailure } from '../../../extensions/trial-forum-monitor/entities/MarketTrialForumSyncFailure.entity.js';
import { DataSource, IsNull } from 'typeorm';

const id = '00000000-0000-4000-8000-000000000001';
const initial = { id, trialId: id, trialTitle: 'fixture funding', stage: 'forum_post_create', severity: 'critical', errorMessage: 'fixture', errorStack: 'private stack', occurredAt: new Date(), resolvedAt: null, resolutionNote: null };
let repo: any;
const response = () => {
  const res: any = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};
beforeEach(() => {
  repo = { findOne: jest.fn().mockResolvedValue({ ...initial }), update: jest.fn().mockResolvedValue({ affected: 1 }), save: jest.fn() };
  controller.setDataSource({ getRepository: (entity: unknown) => entity === MarketTrialForumSyncFailure ? repo : {} } as any);
});

it('conditional resolution prevents a concurrent winner from having its note overwritten', async () => {
  repo.update.mockResolvedValue({ affected: 0 });
  const res = response();
  await controller.resolveForumSyncFailure({ params: { failureId: id }, body: { note: 'losing note' } } as any, res);
  expect(repo.update.mock.calls[0][0].resolvedAt.type).toBe('isNull');
  expect(repo.update.mock.calls[0][0].id).toBe(id);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Already resolved' });
  expect(repo.save).not.toHaveBeenCalled();
});
it('successful resolution returns the persisted resolution fields and excludes the private stack', async () => {
  const res = response();
  await controller.resolveForumSyncFailure({ params: { failureId: id }, body: { note: 'confirmed' } } as any, res);
  const { data } = res.json.mock.calls[0][0];
  expect(data.resolutionNote).toBe('confirmed');
  expect(data.resolvedAt).toBe(repo.update.mock.calls[0][1].resolvedAt.toISOString());
  expect(data.errorStack).toBeUndefined();
});
it('TypeORM emits the unresolved condition against the mapped database column without connecting', async () => {
  const source = new DataSource({ type: 'postgres', entities: [MarketTrialForumSyncFailure] });
  await (source as any).buildMetadatas();
  const query = source.getRepository(MarketTrialForumSyncFailure).createQueryBuilder()
    .update({ resolvedAt: new Date(), resolutionNote: 'fixture memo' })
    .where({ id, resolvedAt: IsNull() });
  expect(query.getQuery()).toMatch(/WHERE.*"id" = .*AND.*"resolved_at" IS NULL/);
  expect(source.isInitialized).toBe(false);
});
it.each([{ failureId: 'malformed', note: 'text' }, { failureId: id, note: { invalid: true } }])('invalid input %j never reaches persistence', async ({ failureId, note }) => {
  const res = response();
  await controller.resolveForumSyncFailure({ params: { failureId }, body: { note } } as any, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(repo.findOne).not.toHaveBeenCalled();
});
