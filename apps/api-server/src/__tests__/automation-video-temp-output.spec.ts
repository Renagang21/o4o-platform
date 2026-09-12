/**
 * WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1
 *
 * 완성 영상 임시 output: 등록 · 상태 · 다운로드 · 만료 · 자동 삭제 · 교체 · 제거 · Multi-Job 독립 · Media Library 경계.
 * Storage 는 mock — object 저장/삭제 호출과 key 형태만 검증한다. DB 는 automation-job.spec 과 같은 일회성 PostgreSQL.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { MediaAsset } from '../modules/media/entities/MediaAsset.entity.js';
import { AutomationJob } from '../modules/automation/entities/AutomationJob.entity.js';
import { AutomationJobService } from '../modules/automation/services/automation-job.service.js';
import { VideoTempOutputService } from '../modules/automation/services/video-temp-output.service.js';
import { VIDEO_TEMP_OUTPUT_CONFIG } from '../modules/automation/config/video-temp-output.config.js';
import { CreateMediaAssetsTable20260401300000 } from '../database/migrations/20260401300000-CreateMediaAssetsTable.js';
import { AddMediaAssetFolder20260401400000 } from '../database/migrations/20260401400000-AddMediaAssetFolder.js';
import { AddMediaAssetMetadata20261222000000 } from '../database/migrations/20261222000000-AddMediaAssetMetadata.js';
import { MediaLibraryV2Foundation20270407000000 } from '../database/migrations/20270407000000-MediaLibraryV2Foundation.js';
import { CreateAutomationJobs20270410000000 } from '../database/migrations/20270410000000-CreateAutomationJobs.js';
import { AddAutomationJobTempOutput20270411000000 } from '../database/migrations/20270411000000-AddAutomationJobTempOutput.js';

const saveFile = jest.fn().mockResolvedValue(undefined);
const deleteFile = jest.fn().mockResolvedValue(undefined);
const readStream = jest.fn(() => Readable.from([Buffer.from('mp4-bytes')]));
const bucketFn = jest.fn((name: string) => ({
  name,
  file: (key: string) => ({ key, save: saveFile, delete: () => deleteFile(key), createReadStream: readStream }),
}));
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({ bucket: bucketFn })),
}));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const integration = process.env.MEDIA_V2_TEST_PORT === '55439' ? describe : describe.skip;
integration('Automation VIDEO job — temporary output download + TTL auto cleanup', () => {
  let ds: DataSource;
  let jobs: AutomationJobService;
  let temp: VideoTempOutputService;
  const actor = randomUUID();
  const mp4 = (name = 'final.mp4', mimetype = 'video/mp4') => ({ buffer: Buffer.from('0123456789'), size: 10, originalname: name, mimetype });
  const HOUR = 60 * 60 * 1000;

  beforeAll(async () => {
    const connection = { type: 'postgres' as const, host: '127.0.0.1', port: 55439, username: 'media_test', database: 'postgres' };
    const admin = await new DataSource(connection).initialize();
    const database = 'video_temp_output_' + Date.now();
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
    await new AddAutomationJobTempOutput20270411000000().up(q);
    await q.release();
    jobs = new AutomationJobService(ds);
    temp = new VideoTempOutputService(ds);
  }, 30000);
  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });
  beforeEach(() => {
    saveFile.mockClear();
    deleteFile.mockReset().mockResolvedValue(undefined);
    readStream.mockClear();
  });

  const setExpiry = (id: string, at: Date) =>
    ds.query('UPDATE automation_jobs SET temp_output_expires_at=$2 WHERE id=$1', [id, at]);

  test('A. register → status → download → re-download before expiry; expiresAt = uploadedAt + TTL; private bucket key only', async () => {
    const job = await jobs.create({ title: '미네락600 제품 설명영상' }, actor);
    expect((await jobs.get(job.id)).tempOutput).toMatchObject({ state: 'NONE', downloadable: false, expiresAt: null });
    await expect(temp.openDownload(job.id)).rejects.toMatchObject({ code: 'TEMP_OUTPUT_NOT_FOUND', status: 404 });

    const view = await temp.register(job.id, mp4('미네락600_final.mp4'));
    expect(view).toMatchObject({ state: 'AVAILABLE', downloadable: true, fileName: '미네락600_final.mp4', mimeType: 'video/mp4', size: 10, ttlHours: VIDEO_TEMP_OUTPUT_CONFIG.ttlHours });
    expect(view.expiresAt!.getTime() - view.uploadedAt!.getTime()).toBe(VIDEO_TEMP_OUTPUT_CONFIG.ttlHours * HOUR);
    // 비공개 bucket + video-jobs/<jobId>/ prefix. 저장 metadata 는 private/no-store.
    expect(bucketFn).toHaveBeenLastCalledWith(VIDEO_TEMP_OUTPUT_CONFIG.bucket);
    expect(VIDEO_TEMP_OUTPUT_CONFIG.bucket).not.toBe('o4o-media-library');
    const row = (await ds.query('SELECT temp_output_object_key AS k, temp_output_cleanup_status AS s FROM automation_jobs WHERE id=$1', [job.id]))[0];
    expect(row.k).toMatch(new RegExp(`^${VIDEO_TEMP_OUTPUT_CONFIG.objectPrefix}${job.id}/[0-9a-f-]{36}\\.mp4$`));
    expect(row.s).toBe('AVAILABLE');
    expect(saveFile).toHaveBeenCalledTimes(1);
    expect(saveFile.mock.calls[0][1]).toMatchObject({ resumable: false, metadata: { contentType: 'video/mp4', cacheControl: 'private, no-store' } });
    // API view 에 object key / bucket 이 없다
    expect(JSON.stringify(view)).not.toContain(row.k);
    expect(JSON.stringify(await jobs.get(job.id))).not.toContain('video-jobs/');
    // media_assets 에는 아무것도 생기지 않는다 (Media Library catalog 대상 아님)
    expect((await ds.query('SELECT count(*)::int AS c FROM media_assets'))[0].c).toBe(0);
    expect((await ds.query('SELECT count(*)::int AS c FROM media_entity_links WHERE entity_id=$1', [job.id]))[0].c).toBe(0);

    const dl1 = await temp.openDownload(job.id);
    expect(dl1).toMatchObject({ fileName: '미네락600_final.mp4', mimeType: 'video/mp4', size: 10 });
    const dl2 = await temp.openDownload(job.id); // 다운로드 후 즉시 삭제하지 않는다 — 만료 전 재다운로드 가능
    expect(dl2.fileName).toBe('미네락600_final.mp4');
    expect(readStream).toHaveBeenCalledTimes(2);
    expect((await temp.status(job.id)).downloadable).toBe(true);
  });

  test('B. validation: video only, file required, unknown/cancelled job refused, completed job accepted', async () => {
    const job = await jobs.create({ title: 'v' }, actor);
    await expect(temp.register(job.id, undefined)).rejects.toMatchObject({ code: 'TEMP_OUTPUT_FILE_REQUIRED' });
    await expect(temp.register(job.id, mp4('poster.png', 'image/png'))).rejects.toMatchObject({ code: 'TEMP_OUTPUT_VIDEO_ONLY' });
    await expect(temp.register(randomUUID(), mp4())).rejects.toMatchObject({ code: 'JOB_NOT_FOUND', status: 404 });
    await expect(temp.register('nope', mp4())).rejects.toMatchObject({ code: 'INVALID_UUID' });
    expect(saveFile).not.toHaveBeenCalled();
    await jobs.update(job.id, { status: 'CANCELLED' });
    await expect(temp.register(job.id, mp4())).rejects.toMatchObject({ code: 'JOB_CANCELLED', status: 409 });
    expect(saveFile).not.toHaveBeenCalled();
    await jobs.update(job.id, { status: 'IN_PROGRESS' });
    await jobs.complete(job.id, { cleanupDecision: 'KEEP_ALL' });
    // 제작 완료 뒤 완성본 도착 — 완료된 Job 에도 등록 가능(Media 연결과 다른 생명주기)
    expect((await temp.register(job.id, mp4('done.webm', 'video/webm'))).state).toBe('AVAILABLE');
    await expect(jobs.linkAsset(job.id, { mediaAssetId: randomUUID(), purpose: 'INPUT' })).rejects.toMatchObject({ code: 'JOB_CLOSED' });
  });

  test('C. replace deletes the previous object; remove deletes object and clears state', async () => {
    const job = await jobs.create({ title: 'r' }, actor);
    await temp.register(job.id, mp4('v1.mp4'));
    const k1 = (await ds.query('SELECT temp_output_object_key AS k FROM automation_jobs WHERE id=$1', [job.id]))[0].k;
    const v2 = await temp.register(job.id, mp4('v2.mov', 'video/quicktime'));
    const k2 = (await ds.query('SELECT temp_output_object_key AS k FROM automation_jobs WHERE id=$1', [job.id]))[0].k;
    expect(k2).not.toBe(k1);
    expect(k2.endsWith('.mov')).toBe(true);
    expect(deleteFile).toHaveBeenCalledWith(k1);
    expect(v2.fileName).toBe('v2.mov');

    // 이전 object 삭제 실패는 교체를 막지 않는다(lifecycle 백스톱)
    deleteFile.mockRejectedValueOnce(Object.assign(new Error('gcs down'), { code: 503 }));
    expect((await temp.register(job.id, mp4('v3.mp4'))).fileName).toBe('v3.mp4');

    // 제거: storage 삭제 실패 → 상태 유지
    deleteFile.mockRejectedValueOnce(Object.assign(new Error('gcs down'), { code: 503 }));
    await expect(temp.remove(job.id)).rejects.toMatchObject({ code: 'TEMP_OUTPUT_STORAGE_DELETE_FAILED', status: 502 });
    expect((await temp.status(job.id)).state).toBe('AVAILABLE');
    // 제거 성공 (404=이미 없음도 성공)
    deleteFile.mockRejectedValueOnce(Object.assign(new Error('gone'), { code: 404 }));
    expect(await temp.remove(job.id)).toMatchObject({ state: 'NONE', fileName: null, expiresAt: null });
    expect((await ds.query('SELECT temp_output_object_key AS k, temp_output_cleanup_status AS s FROM automation_jobs WHERE id=$1', [job.id]))[0]).toEqual({ k: null, s: null });
    await expect(temp.remove(job.id)).rejects.toMatchObject({ code: 'TEMP_OUTPUT_NOT_FOUND', status: 404 });
  });

  test('D. expiry: download blocked once expiresAt passes even before cleanup; expiry job deletes object and records EXPIRED; failures retried; other jobs unaffected', async () => {
    const a = await jobs.create({ title: 'expired-a' }, actor);
    const b = await jobs.create({ title: 'expired-b (storage fails)' }, actor);
    const c = await jobs.create({ title: 'still-live' }, actor);
    const d = await jobs.create({ title: 'no-output' }, actor);
    for (const j of [a, b, c]) await temp.register(j.id, mp4(`${j.title}.mp4`));
    const past = new Date(Date.now() - HOUR);
    await setExpiry(a.id, past);
    await setExpiry(b.id, past);

    // 만료 시각이 지나면 job 이 돌기 전에도 다운로드 차단 + 상태는 EXPIRED 로 보임(cleanupPending)
    expect((await temp.status(a.id))).toMatchObject({ state: 'EXPIRED', downloadable: false, cleanupPending: true });
    await expect(temp.openDownload(a.id)).rejects.toMatchObject({ code: 'TEMP_OUTPUT_EXPIRED', status: 410 });
    expect((await temp.status(c.id)).downloadable).toBe(true);

    const keyA = (await ds.query('SELECT temp_output_object_key AS k FROM automation_jobs WHERE id=$1', [a.id]))[0].k;
    const keyB = (await ds.query('SELECT temp_output_object_key AS k FROM automation_jobs WHERE id=$1', [b.id]))[0].k;
    deleteFile.mockImplementation(async (key: string) => {
      if (key === keyB) throw Object.assign(new Error('gcs down'), { code: 503 });
    });
    const run1 = await temp.expireDue();
    expect(run1).toMatchObject({ due: 2, expired: 1, failed: 1 });
    expect(deleteFile).toHaveBeenCalledWith(keyA);
    expect(deleteFile).toHaveBeenCalledWith(keyB);
    const statusOf = async (id: string) => (await ds.query('SELECT temp_output_cleanup_status AS s FROM automation_jobs WHERE id=$1', [id]))[0].s;
    expect(await statusOf(a.id)).toBe('EXPIRED');
    expect(await statusOf(b.id)).toBe('DELETE_FAILED');
    expect(await statusOf(c.id)).toBe('AVAILABLE');
    expect(await statusOf(d.id)).toBeNull();
    expect((await temp.status(a.id))).toMatchObject({ state: 'EXPIRED', downloadable: false, cleanupPending: false });
    expect((await temp.status(b.id))).toMatchObject({ state: 'EXPIRED', downloadable: false, cleanupPending: true });
    await expect(temp.openDownload(b.id)).rejects.toMatchObject({ code: 'TEMP_OUTPUT_EXPIRED', status: 410 });
    // 다른 Job(c) 은 그대로 다운로드 가능 · d 는 영향 없음 · 목록도 각자 상태
    expect((await temp.openDownload(c.id)).fileName).toBe('still-live.mp4');
    const list = await jobs.list();
    expect(list.find((j) => j.id === a.id)?.tempOutput.state).toBe('EXPIRED');
    expect(list.find((j) => j.id === c.id)?.tempOutput.state).toBe('AVAILABLE');
    expect(list.find((j) => j.id === d.id)?.tempOutput.state).toBe('NONE');

    // 재시도: storage 복구 → b 도 EXPIRED. 이미 EXPIRED 인 a 는 다시 지우지 않는다. lifecycle 이 먼저 지운 404 도 성공.
    deleteFile.mockReset().mockRejectedValue(Object.assign(new Error('gone'), { code: 404 }));
    const run2 = await temp.expireDue();
    expect(run2).toMatchObject({ due: 1, expired: 1, failed: 0, jobIds: [b.id] });
    expect(await statusOf(b.id)).toBe('EXPIRED');
    expect(deleteFile).toHaveBeenCalledTimes(1);
    expect(await temp.expireDue()).toMatchObject({ due: 0 });

    // 만료 뒤 새 완성본 등록 = 새 TTL 로 다시 AVAILABLE (이전 EXPIRED object 는 이미 없으므로 삭제 시도만 404 로 지나간다)
    const again = await temp.register(a.id, mp4('again.mp4'));
    expect(again).toMatchObject({ state: 'AVAILABLE', downloadable: true });
    expect(again.expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  test('E. boundary: cleanupDecision / cleanup never touch the temp output; legacy Media OUTPUT stays KEEP', async () => {
    const job = await jobs.create({ title: 'boundary' }, actor);
    await temp.register(job.id, mp4('final.mp4'));
    await jobs.complete(job.id, { cleanupDecision: 'KEEP_OUTPUTS' });
    const applied = await jobs.cleanupApply(job.id, { decision: 'KEEP_OUTPUTS' });
    expect(applied.items).toEqual([]);
    expect(deleteFile).not.toHaveBeenCalled();
    expect((await temp.status(job.id)).state).toBe('AVAILABLE');
    const keepSelected = await jobs.cleanupApply(job.id, { decision: 'KEEP_SELECTED' });
    expect(keepSelected.items).toEqual([]);
    expect((await temp.status(job.id)).state).toBe('AVAILABLE');
  });
});
