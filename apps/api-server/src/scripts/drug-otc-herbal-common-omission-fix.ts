/**
 * 은행엽·포도엽 draft 공통 누락 보완 (미승격 draft 만 수정 — 공개 canonical 없음)
 *
 * WO-O4O-OTC-HERBAL-COMMON-OMISSION-FIX-V1
 * 근거: CHECK-O4O-OTC-HERBAL-REVIEW-GINKGO-GRAPELEAF-V1 §4
 *
 * 두 그룹은 아직 승격되지 않았다(mfds_drug_otc canonical 0). 따라서 **draft content_json 만** 수정한다.
 * 공개 콘텐츠 변경 0.
 *
 * 반영 = 근거 제품 전체에 공통인 항목만:
 *   은행엽: ① 뇌기능장애 용법(3/3 공통) → usage · ② 유전질환 금기 3종(3/3) → caution
 *   포도엽: ① 포도당-갈락토오스 흡수장애 금기(2/2) → caution
 *
 * 미반영(원문이 제품별로 갈림 — 임의 통일·부착 금지):
 *   은행엽 수술 예정(2상담/1금기) · 3개월 상한(1/3) · 포도엽 3달 상한(1/2)
 *   → 라벨 표현 차이(제형·부형제 차이 아님) + 승격 대상은 e약은요 없어 분류 불가 → 분리 아님, 미변경.
 *
 * 안전: 각 draft 의 현재 값이 EXPECTED_OLD 와 정확히 같을 때만 갱신(concurrent drift 방어).
 *   신규 값은 손으로 정의한 문자열. 빌더가 missing 0 으로 렌더되는지 확인.
 *   단일 트랜잭션 · 멱등.
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_HERBAL_FIX_CONFIRM=YES`
 */

import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const GINKGO = '은행엽건조엑스|80밀리그램|정';
const GRAPE = '포도엽건조엑스|180밀리그램|캡슐';

const GINKGO_USAGE_OLD =
  '성인은 말초동맥 순환장애·어지러움·이명에 1회 1/2정(40mg) 1일 3회 또는 1회 1정(80mg) 1일 2회 복용하며 연령·증상에 따라 조절합니다.';
const GINKGO_USAGE_NEW =
  '성인은 말초동맥 순환장애·어지러움·이명에 1회 1/2정(40mg) 1일 3회 또는 1회 1정(80mg) 1일 2회 복용합니다. 기억력 감퇴 등 기질성 뇌기능장애에는 1회 1/2~1정(40~80mg) 1일 3회 또는 1회 1.5정(120mg) 1일 2회 복용합니다. 연령·증상에 따라 조절합니다.';

const GINKGO_CAUTION_OLD =
  '이 약에 과민증이 있거나 12세 이하 소아, 치료가 필요한 고혈압, 임부는 복용하지 않습니다. 수유부, 출혈 장애, 수술 예정인 경우는 복용 전 약사와 상담하고, 항응고제·항혈소판제와 함께 복용할 때는 상의하세요.';
const GINKGO_CAUTION_NEW =
  '이 약에 과민증이 있거나 12세 이하 소아, 치료가 필요한 고혈압, 임부, 갈락토오스 불내성·Lapp 유당분해효소 결핍증·포도당-갈락토오스 흡수장애 같은 유전 질환이 있으면 복용하지 않습니다. 수유부, 출혈 장애, 수술 예정인 경우는 복용 전 약사와 상담하고, 항응고제·항혈소판제와 함께 복용할 때는 상의하세요.';

const GRAPE_CAUTION_OLD =
  '이 약에 과민증이 있거나 소아·청소년, 임부·임신 가능성이 있는 여성·수유부는 복용하지 않습니다. 6주 정도 복용해도 개선이 없으면 중단하고, 한쪽 다리에 갑작스러운 통증·부기·피부 변색이 나타나면 즉시 복용을 중단하고 상담하세요.';
const GRAPE_CAUTION_NEW =
  '이 약에 과민증이 있거나 소아·청소년, 임부·임신 가능성이 있는 여성·수유부, 포도당-갈락토오스 흡수장애가 있으면 복용하지 않습니다. 6주 정도 복용해도 개선이 없으면 중단하고, 한쪽 다리에 갑작스러운 통증·부기·피부 변색이 나타나면 즉시 복용을 중단하고 상담하세요.';

interface Fix {
  gk: string;
  field: 'usage' | 'caution';
  old: string;
  next: string;
  addedTokens: string[]; // 신규 값에 반드시 들어가야 하는 토큰(보완 확인)
  keepTokens: string[]; // 기존 값의 숫자·항목 보존 확인
}

const FIXES: Fix[] = [
  { gk: GINKGO, field: 'usage', old: GINKGO_USAGE_OLD, next: GINKGO_USAGE_NEW,
    addedTokens: ['기질성 뇌기능장애', '120mg', '1.5정'],
    keepTokens: ['40mg', '80mg', '1일 3회', '1일 2회'] },
  { gk: GINKGO, field: 'caution', old: GINKGO_CAUTION_OLD, next: GINKGO_CAUTION_NEW,
    addedTokens: ['갈락토오스 불내성', 'Lapp 유당분해효소 결핍증', '포도당-갈락토오스 흡수장애'],
    keepTokens: ['수술 예정', '항응고제·항혈소판제', '12세 이하 소아'] },
  { gk: GRAPE, field: 'caution', old: GRAPE_CAUTION_OLD, next: GRAPE_CAUTION_NEW,
    addedTokens: ['포도당-갈락토오스 흡수장애'],
    keepTokens: ['6주 정도 복용', '통증·부기·피부 변색', '소아·청소년'] },
];

async function main(): Promise<void> {
  const apply =
    process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_HERBAL_FIX_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정');
  const ds = new DataSource({
    type: 'postgres', host, port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();

  try {
    // ── 0) 공개 canonical 이 없어야 한다(미승격 확인) ──
    const [{ pub }]: { pub: string }[] = await ds.query(
      `SELECT count(*)::text AS pub FROM shared_product_descriptions s
         JOIN product_candidate_description_drafts d ON d.candidate_id=s.source_ref_id
        WHERE s.source_type='mfds_drug_otc' AND s.status='canonical' AND s.deleted_at IS NULL
          AND d.content_json->>'groupKey' = ANY($1::text[])`,
      [[GINKGO, GRAPE]],
    );
    const published = Number(pub);

    // ── 1) draft 로드 ──
    const drafts: { gk: string; candidate_id: string; content_json: Record<string, unknown> }[] =
      await ds.query(
        `SELECT content_json->>'groupKey' AS gk, candidate_id::text, content_json
           FROM product_candidate_description_drafts
          WHERE source_label='MFDS_DRUG_OTC' AND content_json->>'groupKey' = ANY($1::text[])`,
        [[GINKGO, GRAPE]],
      );
    const byGk = new Map(drafts.map((d) => [d.gk, d]));

    // ── 2) 사전 검증 + 멱등 판정 ──
    const checks: { name: string; ok: boolean; got: string | number }[] = [];
    checks.push({ name: '공개 canonical 0(미승격)', ok: published === 0, got: published });
    checks.push({ name: 'draft 2개', ok: drafts.length === 2, got: drafts.length });

    let alreadyAll = true;
    const plan: { gk: string; nextJson: Record<string, unknown> }[] = [];
    const perGk = new Map<string, Record<string, unknown>>();

    for (const f of FIXES) {
      const d = byGk.get(f.gk);
      const cur = String(d?.content_json?.[f.field] ?? '');
      const isOld = cur === f.old;
      const isNew = cur === f.next;
      if (!isNew) alreadyAll = false;
      checks.push({
        name: `${f.gk.slice(0, 3)} ${f.field} 상태`,
        ok: isOld || isNew,
        got: isOld ? 'OLD(수정대상)' : isNew ? 'NEW(이미적용)' : 'UNEXPECTED',
      });
      // 신규 값 토큰 확인
      const addOk = f.addedTokens.every((t) => f.next.includes(t));
      const keepOk = f.keepTokens.every((t) => f.next.includes(t) && f.old.includes(t));
      checks.push({ name: `${f.gk.slice(0, 3)} ${f.field} 토큰`, ok: addOk && keepOk, got: addOk && keepOk ? 'ok' : 'NG' });

      if (isOld && d) {
        const base = perGk.get(f.gk) ?? { ...d.content_json };
        base[f.field] = f.next;
        perGk.set(f.gk, base);
      }
    }
    for (const [gk, nextJson] of perGk) plan.push({ gk, nextJson });

    // ── 3) 신규 draft 가 빌더로 깨끗이 렌더되는지 ──
    const renderIssues: string[] = [];
    for (const p of plan) {
      const d = byGk.get(p.gk)!;
      const built = buildDrugOtcConsumerHtml(p.nextJson as never, { title: String(d.content_json.title ?? p.gk) });
      if (built.missing.length) renderIssues.push(`${p.gk}: missing ${built.missing.join(',')}`);
      // sd-* 구조 유지
      if (!built.html.includes('sd-card') || !built.html.includes('sd-intake') || !built.html.includes('sd-warn'))
        renderIssues.push(`${p.gk}: 구조 결손`);
    }
    checks.push({ name: '신규 draft 렌더', ok: renderIssues.length === 0, got: renderIssues.length ? renderIssues[0] : 'ok' });

    if (alreadyAll && plan.length === 0) {
      console.log(`은행엽·포도엽 draft 보완 (${mode}) — **이미 적용됨 (no-op)** · dbWrite 0`);
      return;
    }

    // ── 4) apply ──
    let updated = 0;
    if (apply) {
      const bad = checks.filter((c) => !c.ok);
      if (bad.length) throw new Error(`사전 검증 실패: ${bad.map((b) => `${b.name}(=${b.got})`).join(', ')}`);

      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const f of FIXES) {
          const d = byGk.get(f.gk)!;
          if (String(d.content_json[f.field]) !== f.old) continue; // 이미 NEW 면 skip
          const res = await qr.query(
            `UPDATE product_candidate_description_drafts
                SET content_json = jsonb_set(content_json, $2::text[], to_jsonb($3::text), false), updated_at = now()
              WHERE source_label='MFDS_DRUG_OTC' AND content_json->>'groupKey'=$1
                AND content_json->>${f.field === 'usage' ? "'usage'" : "'caution'"} = $4
             RETURNING id`,
            [f.gk, `{${f.field}}`, f.next, f.old],
          );
          const rr: unknown[] = Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as unknown[]) : (res as unknown[]);
          if (rr.length !== 1) throw new Error(`${f.gk}/${f.field} 갱신 수 이상: ${rr.length} — 롤백`);
          updated += rr.length;
        }
        // 커밋 전 사후검증 — 각 필드가 NEW 로 바뀌었는가
        for (const f of FIXES) {
          const [{ n }]: { n: string }[] = await qr.query(
            `SELECT count(*)::text AS n FROM product_candidate_description_drafts
              WHERE source_label='MFDS_DRUG_OTC' AND content_json->>'groupKey'=$1
                AND content_json->>${f.field === 'usage' ? "'usage'" : "'caution'"} = $2`,
            [f.gk, f.next],
          );
          if (Number(n) !== 1) throw new Error(`${f.gk}/${f.field} NEW 미확인 — 롤백`);
        }
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    console.log('───────────────────────────────────────────────');
    console.log(`은행엽·포도엽 draft 공통 누락 보완 (${mode})`);
    console.log('───────────────────────────────────────────────');
    for (const c of checks) console.log(`  ${c.ok ? '✅' : '❌'} ${c.name.padEnd(22)} = ${c.got}`);
    console.log(`갱신 대상 필드     : ${FIXES.filter((f) => String(byGk.get(f.gk)?.content_json?.[f.field]) === f.old).length}`);
    console.log(`dbWrite            : ${apply ? updated + ' draft fields' : 0}`);
    console.log('\n미반영(갈림 — 분리 아님): 은행엽 수술예정(2상담/1금기)·3개월상한(1/3) · 포도엽 3달상한(1/2)');
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
