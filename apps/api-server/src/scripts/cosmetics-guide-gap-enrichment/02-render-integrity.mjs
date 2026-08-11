/**
 * 선행 산출물(설명서 객체) → 렌더 결과가 **운영 DB 본문과 정확히 일치**하는지 확인한다.
 *
 * 이게 성립해야 "기존 사실 유지 + 결손 필드만 추가" 를 재렌더로 안전하게 할 수 있다(WO §7).
 * 불일치가 있으면 그 건은 재렌더 대상에서 제외한다(운영본을 임의로 덮어쓰지 않는다).
 */
import { join } from 'node:path';
import { renderHtml } from '../cosmetics-productmaster-apply-pilot/render.mjs';
import { OUT_DIR, readJsonl, readProd, writeOut } from './lib.mjs';

const guides = readProd('all-guides-ko.json');
const guideList = Array.isArray(guides) ? guides : (guides.guides ?? []);
const byKey = new Map(guideList.map((g) => [g.key, g]));

let same = 0;
let diff = 0;
let noGuide = 0;
const diffSamples = [];
const mismatchedIds = [];

await readJsonl(join(OUT_DIR, 'db-cosmetics-ko-canonical.jsonl'), (r) => {
  const g = byKey.get(r.census_key);
  if (!g) {
    noGuide += 1;
    return;
  }
  const rendered = renderHtml(g);
  if (rendered === (r.content ?? '')) {
    same += 1;
  } else {
    diff += 1;
    mismatchedIds.push(r.master_id);
    if (diffSamples.length < 5) {
      diffSamples.push({ masterId: r.master_id, key: r.census_key, db: r.content?.slice(0, 300), rendered: rendered.slice(0, 300) });
    }
  }
});

writeOut('render-integrity.json', { same, diff, noGuide, diffSamples, mismatchedIds: mismatchedIds.slice(0, 2000) });
process.stderr.write(`same=${same} diff=${diff} noGuide=${noGuide}\n`);
