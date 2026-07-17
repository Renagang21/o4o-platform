/**
 * WO-O4O-OTC-BULK-BATCH-01B-KO-DRAFT-CORRECTION-AGENT-GA-V1 — 에이전트 가
 *
 * Batch 01 에서 제외된 2그룹의 ko draft 원문 누락 보완. canonical 승격·영문 번역 없음.
 * dry-run 기본 / apply 는 이중 게이트(`--apply` + DRUG_OTC_BATCH01B_CONFIRM=YES).
 *
 * ① 알파칼시돌 0.5㎍ 연질캡슐(draft 0436f0d8): 원문 4종 일치·제품별 차이 없음 → 공유 draft 보완.
 *    - 용법: 부갑상선기능저하증 등 비타민D 대사이상 1일 1회 2~8캡슐(1~4㎍) 추가(골다공증 0.5~1㎍과 별도) + 혈청칼슘 조절 문구.
 *    - 주의: 유육종증 환자 신중 추가.
 * ② 결정글루코사민 250mg 캡슐: grounded 10/10 황색5호이나 ungrounded 승격대상 원문 미확보 → 함유 미확정.
 *    공유 draft 일괄 추가 시 미함유 과잉경고 위험 → **draft 미수정, 첨가제 원천 확보 후 서브그룹 분리 트랙으로 보고만.**
 *
 * 안전: 대상 draft(알파칼시돌 1건)만 UPDATE. 지문 전후 비교(변경=usage·caution만). 빌더 재생성 성공·효능↔용법 대응·sd-warn·<table>0·주석0.
 *   canonical/영문/타 draft/Batch01·02 변경 0. 단일 TX.
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const ALPHA_GK = '알파칼시돌|0.5마이크로그램|연질캡슐';
const GLUCO_GK = '결정글루코사민황산염|250밀리그램|캡슐';
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');

// 보완 후 용법·주의 (원문 근거만 추가)
const NEW_USAGE = '성인은 골다공증·만성신부전에 1일 1회 1~2캡슐(0.5~1㎍)을, 부갑상선기능저하증 등 비타민 D 대사이상에는 1일 1회 2~8캡슐(1~4㎍)을 복용합니다. 혈청 칼슘 수치에 따라 용량을 조절하며, 복용 중에는 칼슘 섭취 지시를 지키고, 칼슘·비타민 D 함유 제제나 마그네슘 제제와 함께 복용하지 않습니다.';
const NEW_CAUTION = '이 약에 과민증이 있거나 고칼슘혈증·고인산혈증·고마그네슘혈증, 비타민 D 독성 증후가 있으면 복용하지 않습니다. 임부·수유부, 어린이, 고령자, 신장결석 경험자, 유육종증 환자는 복용 전 약사와 상담하세요. 정해진 용량을 초과하지 않도록 주의합니다.';

async function main(): Promise<void> {
  const apply = process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_BATCH01B_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  const report: any = { mode, alpha: {}, gluco: {}, anomalies: [] as string[], updated: 0 };
  try {
    // ── 알파칼시돌 draft ──
    const a: Array<{ candidate_id: string; title: string; content_json: any }> = await ds.query(
      `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL`, [ALPHA_GK]);
    if (a.length !== 1) throw new Error(`알파칼시돌 draft ${a.length} !== 1 → ABORT`);
    const ad = a[0];
    const cj = ad.content_json;
    report.alpha = { candidate: ad.candidate_id.slice(0, 8), beforeFp: md5(JSON.stringify(cj)),
      changes: { usage: { added: '부갑상선기능저하증 등 1일 1회 2~8캡슐(1~4㎍) + 혈청 칼슘 조절 문구' }, caution: { added: '유육종증 환자 신중' } },
      효능축변경: false, 숫자추가: ['2~8캡슐', '1~4㎍'], 연령기간변경: false };
    const newCj = { ...cj, usage: NEW_USAGE, caution: NEW_CAUTION };
    // 변경 = usage·caution만
    for (const k of Object.keys({ ...cj, ...newCj })) {
      if (k === 'usage' || k === 'caution') continue;
      if (JSON.stringify(cj[k]) !== JSON.stringify(newCj[k])) report.anomalies.push(`알파칼시돌: ${k} 변경됨(usage/caution 외)`);
    }
    // 효능↔용법 대응: 효능의 부갑상선기능저하증이 용법에 반영됐나
    if (/부갑상선/.test(String(cj.efficacy)) && !/부갑상선/.test(NEW_USAGE)) report.anomalies.push('알파칼시돌: 부갑상선 효능-용법 미대응');
    // 빌더 재생성
    const built = buildDrugOtcConsumerHtml(newCj, { title: ad.title });
    if (built.missing.length) report.anomalies.push(`알파칼시돌: 빌드 missing ${built.missing.join(',')}`);
    if (!built.html || built.html.includes('<table') || built.html.includes('<!--') || !built.html.includes('sd-warn')) report.anomalies.push('알파칼시돌: 빌드 위생 실패');
    report.alpha.afterFp = md5(JSON.stringify(newCj));
    report.alpha.usageBefore = String(cj.usage); report.alpha.usageAfter = NEW_USAGE;
    report.alpha.cautionBefore = String(cj.caution); report.alpha.cautionAfter = NEW_CAUTION;

    // ── 결정글루코사민: draft 미수정, 판정만 ──
    const g: Array<{ candidate_id: string }> = await ds.query(
      `SELECT candidate_id::text FROM product_candidate_description_drafts WHERE seed_json->>'groupKey'=$1 AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL`, [GLUCO_GK]);
    const gb = `pm.name LIKE '%(결정글루코사민황산염)' AND split_part(pm.specification,' / ',1)='250밀리그램' AND pm.name LIKE '%캡슐%'`;
    const gm: Array<{ tot: string; grounded: string; y5: string }> = await ds.query(
      `SELECT count(DISTINCT pm.id)::text tot,
              count(DISTINCT pm.id) FILTER(WHERE es.master_id IS NOT NULL)::text grounded,
              count(DISTINCT pm.id) FILTER(WHERE es.content ~ '황색\\s?5\\s?호')::text y5
       FROM product_masters pm
       LEFT JOIN shared_product_descriptions es ON es.master_id=pm.id AND es.source_type='mfds_easy_drug' AND es.description_type='STORE' AND es.status='canonical' AND es.deleted_at IS NULL
       WHERE ${gb}`);
    report.gluco = { candidate: g[0]?.candidate_id.slice(0, 8), groupMasters: gm[0].tot, grounded: gm[0].grounded, groundedWithY5: gm[0].y5,
      판정: 'ungrounded 함유 미확정 — 첨가제 원천 필요', 조치: 'draft 미수정. grounded 10/10 황색5호이나 ungrounded 승격대상은 원문 미확보 → NB_DOC 첨가제 원천으로 함유 master 식별 후 서브그룹 분리(첨가제 트랙 연계).' };

    if (report.anomalies.length) throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`);

    if (apply) {
      const qr = ds.createQueryRunner();
      await qr.connect(); await qr.startTransaction();
      try {
        const res = await qr.query(
          `UPDATE product_candidate_description_drafts
              SET content_json = jsonb_set(jsonb_set(content_json, '{usage}', to_jsonb($2::text)), '{caution}', to_jsonb($3::text)), updated_at=now()
            WHERE candidate_id=$1::uuid AND source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL
            RETURNING candidate_id`, [ad.candidate_id, NEW_USAGE, NEW_CAUTION]);
        const rows = Array.isArray(res) && Array.isArray(res[0]) ? res[0] : res;
        report.updated = Array.isArray(rows) ? rows.length : 0;
        // 사후: 재조회 usage/caution 일치 + 타 필드 불변
        const chk: Array<{ content_json: any }> = await qr.query(`SELECT content_json FROM product_candidate_description_drafts WHERE candidate_id=$1::uuid`, [ad.candidate_id]);
        const after = chk[0].content_json;
        if (after.usage !== NEW_USAGE || after.caution !== NEW_CAUTION) throw new Error('사후 usage/caution 불일치 → ROLLBACK');
        for (const k of Object.keys(cj)) { if (k === 'usage' || k === 'caution') continue; if (JSON.stringify(after[k]) !== JSON.stringify(cj[k])) throw new Error(`사후 ${k} 변경됨 → ROLLBACK`); }
        if (report.updated !== 1) throw new Error(`updated ${report.updated} !== 1 → ROLLBACK`);
        await qr.commitTransaction();
      } catch (err) { await qr.rollbackTransaction(); throw err; } finally { await qr.release(); }
    }
  } finally { await ds.destroy(); }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] 알파칼시돌 draft 보완(updated ${report.updated}) · 글루코사민=${report.gluco.판정} · 이상 ${report.anomalies.length}`);
  if (!apply) console.log('  (dry-run — write 없음. apply: --apply + DRUG_OTC_BATCH01B_CONFIRM=YES)');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
