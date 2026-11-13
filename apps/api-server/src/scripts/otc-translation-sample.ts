/**
 * OTC 번역 비교 표본 CLI — 설계 · 판정 기준은 otc-translation-sample.service.ts,
 * 실행 절차는 docs/work-orders/WO-O4O-OTC-TRANSLATION-QUALITY-SAMPLE-V1.md.
 *
 *   OTC_SAMPLE_MODE=extract   OTC_SAMPLE_FILE=<경로>  — 읽기 전용(o4o_readonly · read-only transaction)
 *   OTC_SAMPLE_MODE=translate OTC_SAMPLE_FILE=<경로> OTC_SAMPLE_ACTOR=<승인자 사용자 ID>
 *       — 운영 AI 번역 경로 호출. 설명 표에는 쓰지 않는다. AI 사용 기록이 남으므로 통합 담당 승인 후에만 실행한다.
 *   OTC_SAMPLE_MODE=compare   OTC_SAMPLE_FILE=<경로>  — DB · AI 없이 파일만 비교한다.
 * 결과 파일은 저장소 밖에 둔다(권한 0600).
 */
import 'reflect-metadata';
import { readFileSync, writeFileSync } from 'node:fs';
import { Client } from 'pg';
import { SAMPLE_PER_BUCKET, SAMPLE_SQL, summarize, type SampleItem } from './otc-translation-sample.service.js';
import { readPassword } from '../../../../scripts/deployment/pharmacy-hub-qr-probes.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const write = (file: string, value: unknown) => writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600 });

async function extract(file: string) {
  if (!process.env.DB_NAME?.trim()) throw new Error('DATABASE_BINDINGS_MISSING');
  const client = new Client({ host: '127.0.0.1', port: 55432, user: 'o4o_readonly', database: process.env.DB_NAME,
    password: readPassword(undefined, 'o4o-db-readonly-password'), connectionTimeoutMillis: 15000,
    options: '-c default_transaction_read_only=on' });
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const rows = (await client.query(SAMPLE_SQL, ['mfds_drug_otc', SAMPLE_PER_BUCKET])).rows as SampleItem[];
    await client.query('ROLLBACK');
    write(file, rows);
    const buckets = rows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.bucket]: (acc[row.bucket] ?? 0) + 1 }), {});
    console.log(JSON.stringify({ mode: 'extract', total: rows.length, buckets }));
  } finally { await client.end(); }
}

async function translate(file: string) {
  const actor = process.env.OTC_SAMPLE_ACTOR ?? '';
  if (!UUID.test(actor)) throw new Error('APPROVER_REQUIRED');
  const items = JSON.parse(readFileSync(file, 'utf8')) as SampleItem[];
  const { default: AppDataSource } = await import('../database/data-source.js');
  const { ContentTranslationService } = await import('../modules/store-ai/services/content-ai-translation.service.js');
  await AppDataSource.initialize();
  try {
    const service = new ContentTranslationService(AppDataSource);
    let done = 0;
    for (const item of items) {
      if (item.aiEn) { done++; continue; } // 다시 실행하면 남은 것만 번역한다.
      const out = await service.translate(item.name, item.ko, 'en', {
        actorId: actor, organizationId: 'otc-translation-sample', contentId: item.masterId, authorize: async () => true,
      });
      item.aiEn = out?.result.html ?? null;
      item.aiModel = out?.model ?? null;
      if (item.aiEn) done++;
      write(file, items); // 중간에 멈춰도 결과를 잃지 않는다.
    }
    console.log(JSON.stringify({ mode: 'translate', total: items.length, translated: done }));
  } finally { await AppDataSource.destroy(); }
}

function compare(file: string) {
  const items = JSON.parse(readFileSync(file, 'utf8')) as SampleItem[];
  const result = summarize(items);
  write(file.replace(/\.json$/, '') + '.compare.json', result);
  console.log(JSON.stringify({ mode: 'compare', total: result.total, ok: result.ok, check: result.check, failed: result.failed }));
}

async function main() {
  const mode = process.env.OTC_SAMPLE_MODE ?? 'extract';
  const file = process.env.OTC_SAMPLE_FILE;
  if (!file || !file.endsWith('.json')) throw new Error('OTC_SAMPLE_FILE_REQUIRED');
  if (mode === 'extract') return extract(file);
  if (mode === 'translate') return translate(file);
  if (mode === 'compare') return compare(file);
  throw new Error('INVALID_OPERATION_MODE');
}

main().catch(error => {
  const code = typeof error?.message === 'string' && /^[A-Z_]+$/.test(error.message) ? error.message : 'OTC_SAMPLE_FAILED';
  console.error(JSON.stringify({ code }));
  process.exitCode = 1;
});
