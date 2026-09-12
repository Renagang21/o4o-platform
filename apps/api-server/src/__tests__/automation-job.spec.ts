import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { MediaAsset } from '../modules/media/entities/MediaAsset.entity.js';
import { AutomationJob } from '../modules/automation/entities/AutomationJob.entity.js';
import { AutomationJobService } from '../modules/automation/services/automation-job.service.js';
import { MediaCatalogService } from '../modules/media/services/media-catalog.service.js';
import { MediaLibraryService } from '../modules/media/services/media-library.service.js';
import { CreateMediaAssetsTable20260401300000 } from '../database/migrations/20260401300000-CreateMediaAssetsTable.js';
import { AddMediaAssetFolder20260401400000 } from '../database/migrations/20260401400000-AddMediaAssetFolder.js';
import { AddMediaAssetMetadata20261222000000 } from '../database/migrations/20261222000000-AddMediaAssetMetadata.js';
import { MediaLibraryV2Foundation20270407000000 } from '../database/migrations/20270407000000-MediaLibraryV2Foundation.js';
import { CreateAutomationJobs20270410000000 } from '../database/migrations/20270410000000-CreateAutomationJobs.js';

const saveFile = jest.fn().mockResolvedValue(undefined);
const deleteFile = jest.fn().mockResolvedValue(undefined);
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: () => ({ file: () => ({ save: saveFile, delete: deleteFile }) }),
  })),
}));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Explicit opt-in, fixed localhost-only disposable cluster (same contract as media-library-v2.spec).
const integration = process.env.MEDIA_V2_TEST_PORT === '55439' ? describe : describe.skip;
integration('Automation VIDEO job P0 — jobs, links, cleanup, delete guard regression', () => {
  let ds: DataSource;
  let jobs: AutomationJobService;
  let catalog: MediaCatalogService;
  let library: MediaLibraryService;
  const actor = randomUUID();
  beforeAll(async () => {
    const connection = { type: 'postgres' as const, host: '127.0.0.1', port: 55439, username: 'media_test', database: 'postgres' };
    const admin = await new DataSource(connection).initialize();
    const database = 'automation_job_' + Date.now();
    await admin.query('CREATE DATABASE ' + database);
    await admin.destroy();
    ds = await new DataSource({ ...connection, database, entities: [MediaAsset, AutomationJob], synchronize: false }).initialize();
    const q = ds.createQueryRunner();
    await q.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await new CreateMediaAssetsTable20260401300000().up(q);
    await new AddMediaAssetFolder20260401400000().up(q);
    await new AddMediaAssetMetadata20261222000000().up(q);
    await new MediaLibraryV2Foundation20270407000000().up(q);
    await new CreateAutomationJobs20270410000000().up(q);
    await q.query('CREATE TABLE store_execution_assets(id uuid,organization_id uuid,title text,usage_type text,updated_at timestamptz,html_content text)');
    await q.query('CREATE TABLE store_tablet_screen_sets(id uuid PRIMARY KEY)');
    await q.query('CREATE TABLE store_tablet_screen_blocks(screen_set_id uuid,config jsonb)');
    await q.release();
    jobs = new AutomationJobService(ds);
    catalog = new MediaCatalogService(ds);
    library = new MediaLibraryService(ds);
  }, 30000);
  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });
  beforeEach(() => {
    deleteFile.mockReset().mockResolvedValue(undefined);
  });

  const upload = (name = 'clip.mp4') =>
    library.upload({ buffer: Buffer.from('x'), size: 1, originalname: name, mimetype: 'video/mp4' }, actor);
  const link = (jobId: string, purpose: string, assetId?: string) =>
    upload().then(async (a) => ({ asset: a, ...(await jobs.linkAsset(jobId, { mediaAssetId: assetId ?? a.id, purpose })) }));

  test('migration: rollback drops only automation_jobs and re-apply works', async () => {
    const q = ds.createQueryRunner();
    const m = new CreateAutomationJobs20270410000000();
    await m.down(q);
    expect((await q.query("SELECT to_regclass('automation_jobs') AS t"))[0].t).toBeNull();
    expect((await q.query("SELECT to_regclass('media_entity_links') AS t"))[0].t).toBe('media_entity_links');
    await m.up(q);
    await q.release();
  });

  test('A. job create / list / detail / status / cancel / complete', async () => {
    const job = await jobs.create({ title: '미네락600 제품 설명영상', instructions: '30초, 한국어 내레이션' }, actor);
    expect(job).toMatchObject({ type: 'VIDEO', status: 'DRAFT', createdBy: actor, cleanupDecision: null, completedAt: null });
    await expect(jobs.create({ title: '' }, actor)).rejects.toMatchObject({ code: 'INVALID_TEXT' });
    await expect(jobs.create({ title: 'x', type: 'AUDIO' }, actor)).rejects.toMatchObject({ code: 'INVALID_JOB_TYPE' });

    const progressed = await jobs.update(job.id, { status: 'IN_PROGRESS', statusNote: 'Veo 생성 중' });
    expect(progressed).toMatchObject({ status: 'IN_PROGRESS', statusNote: 'Veo 생성 중' });
    await expect(jobs.update(job.id, { status: 'COMPLETED' })).rejects.toMatchObject({ code: 'USE_COMPLETE_ENDPOINT' });
    await expect(jobs.update(job.id, { status: 'RENDERING' })).rejects.toMatchObject({ code: 'INVALID_JOB_STATUS' });

    const detail = await jobs.get(job.id);
    expect(detail.assets).toEqual([]);
    expect((await jobs.list({ status: 'IN_PROGRESS' })).map((j) => j.id)).toContain(job.id);
    await expect(jobs.get(randomUUID())).rejects.toMatchObject({ code: 'JOB_NOT_FOUND', status: 404 });

    const cancelled = await jobs.update(job.id, { status: 'CANCELLED' });
    expect(cancelled.status).toBe('CANCELLED');
    await expect(jobs.linkAsset(job.id, { mediaAssetId: randomUUID(), purpose: 'INPUT' })).rejects.toMatchObject({ code: 'JOB_CLOSED' });
    expect((await jobs.update(job.id, { status: 'DRAFT' })).status).toBe('DRAFT');

    await expect(jobs.complete(job.id, {})).rejects.toMatchObject({ code: 'INVALID_CLEANUP_DECISION' });
    const done = await jobs.complete(job.id, { cleanupDecision: 'DECIDE_LATER' });
    expect(done.status).toBe('COMPLETED');
    expect(done.completedAt).toBeInstanceOf(Date);
    expect(done.cleanupDecision).toBe('DECIDE_LATER');
    await expect(jobs.update(job.id, { title: 'late' })).rejects.toMatchObject({ code: 'JOB_CLOSED', status: 409 });
    await expect(jobs.complete(job.id, { cleanupDecision: 'KEEP_ALL' })).rejects.toMatchObject({ code: 'JOB_CLOSED' });
  });

  test('B. multiple VIDEO jobs keep independent state; a WAITING job blocks nothing', async () => {
    const a = await jobs.create({ title: '인바디 서비스 소개영상' }, actor);
    const b = await jobs.create({ title: '외국인 약국 안내영상' }, actor);
    await jobs.update(a.id, { status: 'WAITING', statusNote: '내레이션 검수' });
    const bIn = await link(b.id, 'INPUT');
    expect((await jobs.update(b.id, { status: 'IN_PROGRESS' })).status).toBe('IN_PROGRESS');
    expect((await jobs.complete(b.id, { cleanupDecision: 'KEEP_ALL' })).status).toBe('COMPLETED');
    const list = await jobs.list();
    expect(list.find((j) => j.id === a.id)).toMatchObject({ status: 'WAITING', statusNote: '내레이션 검수', assetCounts: { INPUT: 0, INTERMEDIATE: 0, OUTPUT: 0 } });
    expect(list.find((j) => j.id === b.id)).toMatchObject({ status: 'COMPLETED', assetCounts: { INPUT: 1, INTERMEDIATE: 0, OUTPUT: 0 } });
    expect((await jobs.get(b.id)).assets[0]).toMatchObject({ linkId: bIn.linkId, purpose: 'INPUT', asset: { id: bIn.asset.id } });
  });

  test('C. asset link INPUT/INTERMEDIATE/OUTPUT, purpose switch, unlink, unknown job/asset refused', async () => {
    const job = await jobs.create({ title: 'link' }, actor);
    const input = await link(job.id, 'INPUT');
    const mid = await link(job.id, 'INTERMEDIATE');
    const out = await link(job.id, 'OUTPUT');
    expect((await jobs.get(job.id)).assets.map((l) => l.purpose)).toEqual(['INPUT', 'INTERMEDIATE', 'OUTPUT']);
    // 같은 asset 을 다른 purpose 로 재연결하면 이전 purpose 링크는 사라진다(한 Job 에 한 purpose)
    await jobs.linkAsset(job.id, { mediaAssetId: mid.asset.id, purpose: 'OUTPUT' });
    const after = (await jobs.get(job.id)).assets;
    expect(after.filter((l) => l.asset.id === mid.asset.id)).toHaveLength(1);
    expect(after.find((l) => l.asset.id === mid.asset.id)?.purpose).toBe('OUTPUT');
    await expect(jobs.linkAsset(job.id, { mediaAssetId: input.asset.id, purpose: 'TEMPORARY' })).rejects.toMatchObject({ code: 'INVALID_PURPOSE' });
    await expect(jobs.linkAsset(job.id, { mediaAssetId: randomUUID(), purpose: 'INPUT' })).rejects.toMatchObject({ code: 'ASSET_NOT_FOUND', status: 404 });
    await expect(jobs.linkAsset(randomUUID(), { mediaAssetId: input.asset.id, purpose: 'INPUT' })).rejects.toMatchObject({ code: 'JOB_NOT_FOUND', status: 404 });
    // 다른 Job 의 linkId 로는 해제할 수 없다 (entityId 를 알아도 Job 범위 밖 조작 불가)
    const other = await jobs.create({ title: 'other' }, actor);
    await expect(jobs.unlinkAsset(other.id, out.linkId)).rejects.toMatchObject({ code: 'LINK_NOT_FOUND', status: 404 });
    await jobs.unlinkAsset(job.id, out.linkId);
    expect((await jobs.get(job.id)).assets.map((l) => l.linkId)).not.toContain(out.linkId);
    // 연결된 asset 은 기존 Media delete guard 로 삭제가 막힌다 (회귀)
    await expect(library.deleteAsset(input.asset.id)).rejects.toMatchObject({ code: 'MEDIA_IN_USE_LINK' });
    expect(deleteFile).not.toHaveBeenCalled();
  });

  test('D. cleanup: only INTERMEDIATE is a candidate; protected assets are unlinked, not deleted', async () => {
    const job = await jobs.create({ title: 'cleanup' }, actor);
    const input = await link(job.id, 'INPUT');
    const plain = await link(job.id, 'INTERMEDIATE');
    const shared = await link(job.id, 'INTERMEDIATE');
    const parent = await link(job.id, 'INTERMEDIATE');
    const screen = await link(job.id, 'INTERMEDIATE');
    const out = await link(job.id, 'OUTPUT');
    // shared: 다른 entity(product) 에도 연결
    await catalog.saveLink(shared.asset.id, { entityType: 'product', entityId: 'p-1', purpose: 'gallery' });
    // parent: OUTPUT 의 lineage parent
    await catalog.patch(out.asset.id, { parentAssetId: parent.asset.id, derivationType: 'final-video' }, actor);
    // screen: Screen Set 이 참조
    const setId = randomUUID();
    await ds.query('INSERT INTO store_tablet_screen_sets VALUES($1)', [setId]);
    await ds.query('INSERT INTO store_tablet_screen_blocks VALUES($1,$2)', [setId, JSON.stringify({ items: [{ url: screen.asset.url }] })]);

    await expect(jobs.cleanupPreview(job.id, { decision: 'KEEP_OUTPUTS' })).rejects.toMatchObject({ code: 'JOB_NOT_COMPLETED', status: 409 });
    await jobs.complete(job.id, { cleanupDecision: 'DECIDE_LATER' });

    const keepAll = await jobs.cleanupPreview(job.id, { decision: 'KEEP_ALL' });
    expect(keepAll.items.every((i) => i.plan === 'KEEP')).toBe(true);
    const later = await jobs.cleanupApply(job.id, { decision: 'DECIDE_LATER' });
    expect(later.items.every((i) => i.result === 'KEPT')).toBe(true);
    expect((await jobs.get(job.id)).assets).toHaveLength(6);

    const preview = await jobs.cleanupPreview(job.id, { decision: 'KEEP_OUTPUTS' });
    const byLink = (r: { items: { linkId: string }[] }, l: { linkId: string }) => r.items.find((i) => i.linkId === l.linkId)!;
    expect(byLink(preview, input)).toMatchObject({ plan: 'KEEP' });
    expect(byLink(preview, out)).toMatchObject({ plan: 'KEEP' });
    expect(byLink(preview, plain)).toMatchObject({ plan: 'DELETE' });
    expect(byLink(preview, shared)).toMatchObject({ plan: 'UNLINK_ONLY', reason: 'LINKED_ELSEWHERE' });
    expect(byLink(preview, parent)).toMatchObject({ plan: 'UNLINK_ONLY', reason: 'LINEAGE_PROTECTED' });
    expect(byLink(preview, screen)).toMatchObject({ plan: 'UNLINK_ONLY', reason: 'SCREEN_SET_IN_USE' });
    expect((await jobs.get(job.id)).assets).toHaveLength(6); // preview 는 상태를 바꾸지 않는다

    // KEEP_SELECTED: plain 을 보관 선택하면 KEEP
    const selected = await jobs.cleanupPreview(job.id, { decision: 'KEEP_SELECTED', keepLinkIds: [plain.linkId] });
    expect(byLink(selected, plain)).toMatchObject({ plan: 'KEEP' });
    expect(byLink(selected, shared)).toMatchObject({ plan: 'UNLINK_ONLY' });

    // storage 삭제 실패 → DB row 와 link 보존, 결과 구분
    deleteFile.mockRejectedValueOnce(Object.assign(new Error('gcs down'), { code: 503 }));
    const failed = await jobs.cleanupApply(job.id, { decision: 'KEEP_OUTPUTS' });
    expect(byLink(failed, plain)).toMatchObject({ result: 'STORAGE_DELETE_FAILED', code: 'MEDIA_STORAGE_DELETE_FAILED' });
    expect(await library.getById(plain.asset.id)).not.toBeNull();
    expect(byLink(failed, shared)).toMatchObject({ result: 'UNLINKED' });
    expect(byLink(failed, parent)).toMatchObject({ result: 'UNLINKED' });
    expect(byLink(failed, screen)).toMatchObject({ result: 'UNLINKED' });
    expect(byLink(failed, input)).toMatchObject({ result: 'KEPT' });
    let remaining = (await jobs.get(job.id)).assets.map((l) => l.linkId);
    expect(remaining.sort()).toEqual([input.linkId, plain.linkId, out.linkId].sort());
    for (const a of [shared, parent, screen]) expect(await library.getById(a.asset.id)).not.toBeNull();
    expect((await jobs.get(job.id)).cleanupDecision).toBe('KEEP_OUTPUTS');

    // 재시도: storage OK → 삭제
    const applied = await jobs.cleanupApply(job.id, { decision: 'KEEP_OUTPUTS' });
    expect(byLink(applied, plain)).toMatchObject({ result: 'DELETED' });
    expect(await library.getById(plain.asset.id)).toBeNull();
    expect(deleteFile).toHaveBeenCalledTimes(2);
    remaining = (await jobs.get(job.id)).assets.map((l) => l.linkId);
    expect(remaining.sort()).toEqual([input.linkId, out.linkId].sort());
  });

  test('E. regression: existing delete treats storage 404 as gone, other storage errors keep the row', async () => {
    const a = await upload('doc.pdf');
    deleteFile.mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 500 }));
    await expect(library.deleteAsset(a.id)).rejects.toMatchObject({ code: 'MEDIA_STORAGE_DELETE_FAILED' });
    expect(await library.getById(a.id)).not.toBeNull();
    deleteFile.mockRejectedValueOnce(Object.assign(new Error('not found'), { code: 404 }));
    await library.deleteAsset(a.id);
    expect(await library.getById(a.id)).toBeNull();
  });
});
