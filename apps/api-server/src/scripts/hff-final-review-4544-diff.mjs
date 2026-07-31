/** 생성된 patch 의 실제 before/after 구간을 눈으로 확인한다 (read-only, DB 접근 없음). */
import fs from 'node:fs';
const D = 'apps/api-server/src/scripts/data';
const t = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-safe-targets-v1.json`, 'utf8'));
const rb = new Map(JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-rollback-v1.json`, 'utf8')).targets.map((x) => [x.canonicalId, x]));
const nc = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-final-4544-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x.newContent]));
const op = process.argv[2] ?? 'NEW_INGREDIENT_CARD';
const n = parseInt(process.argv[3] ?? '2', 10);
for (const tg of t.targetsIndex.filter((x) => x.ops[0] === op).slice(0, n)) {
  const before = rb.get(tg.canonicalId).oldContent, after = nc.get(tg.canonicalId);
  let i = 0; while (i < before.length && before[i] === after[i]) i++;
  let j = 0; while (j < before.length - i && before[before.length - 1 - j] === after[after.length - 1 - j]) j++;
  console.log('='.repeat(100));
  console.log(`${tg.productName} | ${tg.canonicalId} | ${tg.fromReason} | family=${tg.rendererFamily} | mode=${tg.detail.mode} | Δ=${tg.byteDelta}`);
  console.log('--- 앞 컨텍스트 400 ---'); console.log(before.slice(Math.max(0, i - 400), i));
  console.log('--- 삽입분 ---');        console.log(after.slice(i, after.length - j));
  console.log('--- 뒤 컨텍스트 200 ---'); console.log(before.slice(i, i + 200));
}
