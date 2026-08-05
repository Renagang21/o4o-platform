/**
 * WO-O4O-EASY-DRUG-KO-ORAL-PROHIBITION-CORPUS-REBUILD-V1 — 단계 4 파생 EN·ZH 원장 (READ-ONLY · write 0)
 *
 * WO 원칙 8·9:
 *   8. EN·ZH **본문은 이번 WO 에서 수정하지 않는다.**
 *   9. 다만 잘못된 KO 에서 파생된 활성 EN·ZH 를 **전수 식별**해 비노출·재번역 대기로 분리한다.
 *
 * 이 스크립트는 9항의 앞부분(전수 식별)만 한다. 상태 분리는 별도 게이트(`separate-derived-translations.ts`)다.
 * 식별 기준은 **ProductMaster 연결**이다 — KO 파손 본문이 걸린 master 의 활성 EN·ZH STORE canonical 은
 * 전부 그 KO 를 기준으로 만들어진 번역이므로, 번역문을 다시 읽어 판정하지 않는다
 * (번역문 판정은 오탐이 크고, 어차피 기준본이 바뀌면 전건 재번역 대상이다).
 *
 * 참고 시작값(EN 750 / ZH 56)은 재현 대상이지 목표치가 아니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { connect, type Db } from '../easy-drug-ko-critical-content-correction/correction-contract.js';
import { WO } from './prohibition-contract.mjs';
import type { RebuildPlanRow } from './plan-rebuild.js';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RESULTS = path.join(HERE, 'results');
const PLAN = path.join(RESULTS, 'rebuild-plan.json');

async function main(): Promise<void> {
  const rows: RebuildPlanRow[] = JSON.parse(fs.readFileSync(PLAN, 'utf8')).rows;
  const byMaster = new Map(rows.map((r) => [r.masterId, r]));
  const masterIds = [...byMaster.keys()];

  const db: Db = await connect();
  await db.query('SET default_transaction_read_only = on');

  const tr = await db.query(`
    SELECT sd.id::text "descId", sd.master_id::text "masterId", sd.language,
           sd.status, sd.source_type "sourceType", md5(sd.content) "contentMd5",
           sd.created_at "createdAt", sd.updated_at "updatedAt"
      FROM shared_product_descriptions sd
     WHERE sd.deleted_at IS NULL AND sd.description_type='STORE'
       AND COALESCE(sd.language,'ko') <> 'ko'
       AND sd.master_id = ANY($1::uuid[])
     ORDER BY sd.language, sd.master_id`, [masterIds]);

  const ledger = (tr as any[]).map((t) => {
    const ko = byMaster.get(t.masterId)!;
    return {
      ...t,
      koAction: ko.action,
      koHoldCode: ko.postHoldCode ?? ko.holdCode,
      koItemSeq: ko.itemSeq,
      koOldMd5: ko.oldMd5,
      koNewMd5: ko.newMd5,
      koDetectedBy: ko.detectedBy,
      /** KO 가 교체되면 재번역, KO 가 회수되면 번역도 비노출이어야 한다. */
      disposition: ko.action === 'REPLACE' ? 'RETRANSLATE_PENDING' : 'WITHDRAW',
    };
  });

  const count = (pred: (r: any) => boolean): number => ledger.filter(pred).length;
  const byLangStatus: Record<string, number> = {};
  for (const r of ledger) {
    const k = `${r.language}/${r.status}`;
    byLangStatus[k] = (byLangStatus[k] || 0) + 1;
  }
  const summary = {
    wo: WO, mode: 'READ-ONLY LEDGER (write 0)',
    criterion: '파손 KO canonical 이 걸린 ProductMaster 의 활성 비-ko STORE 설명서 전건',
    koMasters: masterIds.length,
    derivedRows: ledger.length,
    byLangStatus,
    activeEn: count((r) => r.language === 'en' && r.status === 'canonical'),
    activeZh: count((r) => r.language === 'zh' && r.status === 'canonical'),
    byDisposition: {
      RETRANSLATE_PENDING: count((r) => r.disposition === 'RETRANSLATE_PENDING' && r.status === 'canonical'),
      WITHDRAW: count((r) => r.disposition === 'WITHDRAW' && r.status === 'canonical'),
    },
    referenceStartValues: { en: 750, zh: 56, note: '재현 대상이며 강제 목표 아님' },
  };
  fs.mkdirSync(RESULTS, { recursive: true });
  fs.writeFileSync(path.join(RESULTS, 'derived-translation-ledger.json'),
    JSON.stringify({ ...summary, ledger }, null, 2) + '\n', 'utf8');
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');

  await db.destroy();
}

main().catch((e) => { process.stderr.write(`${e?.stack || e}\n`); process.exit(1); });
