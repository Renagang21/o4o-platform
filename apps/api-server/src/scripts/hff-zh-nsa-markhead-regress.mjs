/**
 * WO-O4O-HFF-ZH-NUMBER-STRUCTURE-AMBIGUOUS-101-REPAIR-AND-APPLY-V1  §4 공용 로직 회귀 감사
 *
 * `MARK_HEAD` 에 `(?!\d)` 가드를 넣기 전에는 텍스트 노드가 소수로 시작할 때(`0.5g당 …`)
 * 앞의 `0.` 을 항목 번호로 떼어냈다. 단위가 붙은 소수는 수치 게이트가 잡아 생산 자체가 막혔지만,
 * 단위가 없는 소수(`1.5배`)는 토큰이 아니어서 그대로 통과했을 수 있다.
 * 기존 ZH canonical 40,498 건 중 **KO 텍스트 노드가 소수로 시작하는** 문서만 후보로 좁혀,
 * 그 소수가 ZH 에 원형대로 남아 있는지 전수 대조한다. read-only.
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 1800000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const HFF = `deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`;
const zhTotal = Number((await c.query(`SELECT count(*) n FROM shared_product_descriptions WHERE ${HFF} AND language='zh'`)).rows[0].n);

/* 후보 = ZH 가 있고, KO 텍스트 노드가 소수로 시작하는 문서. 그 외에는 MARK_HEAD 가 개입할 수 없다. */
const rows = (await c.query(`
  SELECT k.master_id, k.content ko, z.content zh
    FROM shared_product_descriptions k
    JOIN shared_product_descriptions z
      ON z.master_id = k.master_id AND z.deleted_at IS NULL AND z.description_type='STORE'
     AND z.status='canonical' AND z.source_type='o4o_hff_generated' AND z.language='zh'
   WHERE k.deleted_at IS NULL AND k.description_type='STORE' AND k.status='canonical'
     AND k.source_type='o4o_hff_generated' AND coalesce(k.language,'ko')='ko'
     AND k.content ~ '>[[:space:]]*[0-9]+\\.[0-9]'`)).rows;

/* 텍스트 노드 선두의 소수만 뽑는다 — 오래된 MARK_HEAD 가 잘라냈을 자리다.
   단 `1.1일 3회 … 2. …` 처럼 형제 마커가 뒤따르면 소수가 아니라 항목 번호이므로 후보에서 뺀다. */
const LEAD_DEC = />\s*(\d+)\.(\d+[^<]*)/g;
const damaged = [];
const markerNotDecimal = [];
for (const r of rows) {
  const lost = [];
  for (const m of r.ko.matchAll(LEAD_DEC)) {
    const [head, rest] = [m[1], m[2]];
    const isMarker = new RegExp(String.raw`(?:^|[\s(])${Number(head) + 1}\s*[).](?!\d)`).test(rest) || /^\d+\s*일\s*\d+\s*회/.test(rest);
    if (isMarker) { markerNotDecimal.push(r.master_id); continue; }
    const dec = `${head}.${/^\d+/.exec(rest)[0]}`;
    if (!r.zh.includes(dec)) lost.push(dec);
  }
  if (lost.length) damaged.push({ masterId: r.master_id, lost: [...new Set(lost)] });
}

const out = {
  wo: 'WO-O4O-HFF-ZH-NUMBER-STRUCTURE-AMBIGUOUS-101-REPAIR-AND-APPLY-V1',
  scope: 'MARK_HEAD decimal-split regression over existing ZH canonical',
  scannedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  zhCanonicalTotal: zhTotal, candidateDocuments: rows.length,
  markerNotDecimalDocuments: new Set(markerNotDecimal).size,
  damagedDocuments: damaged.length, damaged: damaged.slice(0, 50),
  verdict: damaged.length === 0 ? 'PASS' : 'DAMAGE_FOUND',
};
fs.writeFileSync(`${D}/hff-zh-nsa-markhead-regress-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await c.end();
