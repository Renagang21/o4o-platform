import { readFileSync, writeFileSync } from 'node:fs';
const ENV = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const DATA = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\src\\scripts\\data\\otc-batch-02-ko-final-v1.json';
const pw = readFileSync(ENV, 'utf8').match(/^DB_PASSWORD=(.*)$/m)[1].trim();
const data = JSON.parse(readFileSync(DATA, 'utf8'));
const { DataSource } = await import('typeorm');
const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: pw, database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
await ds.initialize();
const out = { groups: [], totals: {} };
let tEn = 0, tPair = 0, tRef = 0, tHangul = 0, tTable = 0, tCmt = 0, tDbl = 0, tSd = 0, tArgBad = 0;
for (const g of data.groups) {
  const r = await ds.query(
    `SELECT
       count(*) FILTER (WHERE en.id IS NOT NULL)::int en_cnt,
       count(*) FILTER (WHERE en.id IS NOT NULL AND ko.master_id=en.master_id)::int pair,
       count(*) FILTER (WHERE en.id IS NOT NULL AND en.source_ref_id=ko.source_ref_id)::int ref,
       count(*) FILTER (WHERE en.content ~ '[가-힣]')::int hangul,
       count(*) FILTER (WHERE en.content LIKE '%<table%')::int tbl,
       count(*) FILTER (WHERE en.content LIKE '%<!--%')::int cmt,
       count(*) FILTER (WHERE en.content ~ '&amp;(amp|lt|gt|quot);')::int dbl,
       count(*) FILTER (WHERE en.content LIKE '%sd-warn%')::int sd,
       count(*) FILTER (WHERE en.content ~* '(detox|liver recovery|improved liver health|fatigue relief|liver detoxification)')::int argbad
     FROM shared_product_descriptions ko
     JOIN shared_product_descriptions en ON en.master_id=ko.master_id AND en.deleted_at IS NULL
       AND en.description_type='STORE' AND en.language='en' AND en.status='needs_review' AND en.source_type='mfds_drug_otc'
     WHERE ko.source_type='mfds_drug_otc' AND ko.description_type='STORE' AND ko.status='canonical' AND ko.language='ko'
       AND ko.deleted_at IS NULL AND ko.source_ref_id=$1::uuid`,
    [g.candidateId]);
  const row = { key: g.key, expected: g.newInsert, en: r[0].en_cnt, pair: r[0].pair, ref: r[0].ref, hangul: r[0].hangul, table: r[0].tbl, comment: r[0].cmt, dblEsc: r[0].dbl, sdwarn: r[0].sd, argExpansion: r[0].argbad };
  out.groups.push(row);
  tEn += r[0].en_cnt; tPair += r[0].pair; tRef += r[0].ref; tHangul += r[0].hangul; tTable += r[0].tbl; tCmt += r[0].cmt; tDbl += r[0].dbl; tSd += r[0].sd; tArgBad += r[0].argbad;
}
// master당 en STORE 중복
const allTargets = (await ds.query(
  `SELECT ko.master_id::text mid FROM shared_product_descriptions ko
   WHERE ko.source_type='mfds_drug_otc' AND ko.description_type='STORE' AND ko.status='canonical' AND ko.language='ko' AND ko.deleted_at IS NULL
     AND ko.source_ref_id = ANY($1::uuid[])`, [data.groups.map((g) => g.candidateId)])).map((x) => x.mid);
const dup = (await ds.query(
  `SELECT count(*)::int n FROM (SELECT master_id FROM shared_product_descriptions
     WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL AND status IN ('needs_review','canonical')
     GROUP BY master_id HAVING count(*)>1) t`, [allTargets]))[0].n;
out.totals = { en: tEn, pair: tPair, ref: tRef, hangul: tHangul, table: tTable, comment: tCmt, dblEsc: tDbl, sdwarn: tSd, argExpansion: tArgBad, dupMaster: dup, expected: 66 };
await ds.destroy();
writeFileSync('C:\\tmp\\otc-b02-en-postverify.json', JSON.stringify(out, null, 2), 'utf8');
console.log(`en ${tEn}/66 · pair ${tPair} · ref ${tRef} · hangul ${tHangul} · table ${tTable} · comment ${tCmt} · dblEsc ${tDbl} · sdwarn ${tSd} · argExpansion ${tArgBad} · dupMaster ${dup}`);
