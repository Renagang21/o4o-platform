/**
 * OTC 영문 번역 저장 파일럿 (5건) — 승격된 한국어 canonical 기준
 *
 * WO-O4O-OTC-EN-TRANSLATION-PERSIST-PILOT-V1
 * 선행: WO-O4O-OTC-CANONICAL-APPLY-AUTO-ONLY-V1 (A군 686 한국어 canonical 승격 완료)
 *
 * 번역 기준: docs/guides/OTC-EN-TRANSLATION-GUIDE (V0.5) · OTC-KO-EN-GLOSSARY (V0.4)
 *   - 정보(T-01~T-05) 엄격 / 표현(T-06~T-10) 소비자 톤.
 *   - 연령 경계 고정(GLOSSARY §4-1): N세 이상=`N or older` · N세 미만=`under N` · N세 이하=`N or under`.
 *   - route=oral(DR-019) → 동사 `take`. 5건 전부 경구.
 *   - 내부 편집 주석(CR-021)은 번역 대상이 아니다 — 아래 EN 은 구조화 4필드만 옮겼다.
 *
 * 저장 계약:
 *   - description_type='STORE' · language='en' · **status='needs_review'**(검토 상태; canonical 아님).
 *     canonical 유일 인덱스는 status='canonical' 에만 걸리므로 ko canonical 과 충돌하지 않는다.
 *   - 한국어와의 연결 = **같은 master_id** + **같은 source_ref_id(draft candidate_id)**.
 *   - 기존 en STORE 행이 있으면 **덮어쓰지 않고 중단**.
 *   - 한국어 행·기존 데이터 **수정 0** (UPDATE 문 없음).
 *   - 대상 = 그룹당 **대표 master 1개** → 총 5 rows (소규모 저장 시험).
 *
 * DB write 게이트: `--apply` AND `DRUG_OTC_EN_PILOT_CONFIRM=YES`
 */

const PROMOTION_SOURCE_TYPE = 'mfds_drug_otc';
const EXPECTED_ROWS = 5;

/** 영문 시안 — 구조화 4필드 번역. groupKey 로 한국어 canonical 과 매칭한다. */
interface EnTranslation {
  groupKey: string;
  title: string;
  efficacy: string;
  usage: string;
  usageLabel: string;
  caution: string;
  summaryTable: Record<string, string>;
}

const EN: EnTranslation[] = [
  {
    groupKey: '덱스판테놀|100밀리그램|정',
    title: 'Dexpanthenol 100 mg Tablet',
    efficacy: 'This medicine is used as a supportive treatment for hair loss.',
    usage:
      'Adults take one tablet three times a day. The treatment period is 6 weeks.',
    usageLabel: 'How to take it',
    caution:
      'Do not take this if you have ever reacted to it, if you are under 19, or for any purpose other than hair loss. Talk to a pharmacist before taking it if you are pregnant or breastfeeding, or have ever had a drug allergy. If there is no improvement after about 6 weeks, stop taking it.',
    summaryTable: {
      Category: 'Over-the-counter',
      Ingredient: 'Dexpanthenol 100 mg',
      'How it works': 'Supports treatment for hair loss',
      'Main symptoms': 'Hair loss',
      'Who should be careful': 'Under 19; not for any purpose other than hair loss',
      'Why this one': 'A preparation used as a supportive treatment for hair loss',
    },
  },
  {
    groupKey: '사카로마이세스보울라르디균|282.5밀리그램|캡슐',
    title: 'Saccharomyces boulardii 282.5 mg Capsule',
    efficacy:
      'This medicine is used to settle the gut when the balance of gut bacteria is upset — for example by antibiotics or chemotherapy — and to help with constipation, loose stools, bloating and abnormal fermentation in the bowel.',
    usage:
      'Adults and children 12 or older take one to two capsules twice a day. Children aged 3 to under 12 take one capsule three times a day.',
    usageLabel: 'How to take it',
    caution:
      'Talk to a pharmacist before giving this to a baby under 3 months old. If there is no improvement after about a month, stop taking it and get advice. (The domestic pack should be kept in a cool place.)',
    summaryTable: {
      Category: 'Over-the-counter',
      Ingredient: 'Saccharomyces boulardii 282.5 mg',
      'How it works': 'Settles the gut (live yeast)',
      'Main symptoms': 'Upset gut balance from antibiotics, constipation, loose stools, bloating',
      'Who should be careful': 'Babies under 3 months',
      'Why this one': 'A yeast-based gut treatment for antibiotic-related upset of gut bacteria',
    },
  },
  {
    groupKey: '알벤다졸|400밀리그램|정',
    title: 'Albendazole 400 mg Tablet',
    efficacy:
      'This medicine is used to treat infection with roundworm, pinworm, hookworm, whipworm, American hookworm and threadworm, including mixed infections.',
    usage:
      'For roundworm, hookworm, whipworm and hookworm infection, adults and children 24 months or older take one tablet (400 mg) once. For pinworm, take one tablet and then one more tablet 7 days later to prevent reinfection. If the tablet is hard to swallow, you may chew it or take it with a small amount of water.',
    usageLabel: 'How to take it',
    caution:
      'Do not take this if you have ever reacted to it, if you are pregnant, may be pregnant or are breastfeeding, or for children under 2. Talk to a pharmacist before taking it if you have liver or kidney problems. Pinworm often spreads again within a family, so it is best to treat everyone together.',
    summaryTable: {
      Category: 'Over-the-counter',
      Ingredient: 'Albendazole 400 mg',
      'How it works': 'Treats worm infection',
      'Main symptoms': 'Roundworm, pinworm, hookworm, whipworm infection',
      'Who should be careful': 'Pregnancy and breastfeeding; do not give to children under 2',
      'Why this one': 'A worm treatment taken as a single dose',
    },
  },
  {
    groupKey: '덱시부프로펜|300밀리그램|정',
    title: 'Dexibuprofen 300 mg Tablet',
    efficacy:
      'This medicine is used for chronic polyarthritis, rheumatoid arthritis, joint disease and ankylosing spondylitis; for painful swelling and inflammation after injury or surgery; and as a supportive treatment for infections that come with a fever.',
    usage:
      'Adults take one tablet (300 mg) two to four times a day. Do not take more than four tablets (1,200 mg) in one day. For sudden, short-term illness, take it for no more than 5 days as a rule. Take it after food if your stomach is sensitive.',
    usageLabel: 'How to take it',
    caution:
      'Do not take this if you have ever reacted to this medicine, to aspirin or to another anti-inflammatory painkiller; if you have a peptic ulcer, bleeding, severe liver or kidney problems, heart failure or severe high blood pressure; for pain around coronary artery bypass surgery (CABG); or if you are 6 months or more into pregnancy. There is a risk of blood clots in the heart and brain (heart attack, stroke) and of bleeding, ulcers or perforation in the gut — stop taking it if you have stomach pain, black stools or difficulty breathing. If you feel dizzy after taking it, take care when driving or operating machinery.',
    summaryTable: {
      Category: 'Over-the-counter',
      Ingredient: 'Dexibuprofen 300 mg',
      'How it works': 'Reduces fever, pain and inflammation (a refined form of the ibuprofen family)',
      'Main symptoms': 'Arthritis, pain and swelling after injury or surgery, pain with fever',
      'Who should be careful': 'Stomach problems; heart, liver or kidney disease; pregnancy',
      'Why this one': 'An anti-inflammatory painkiller based on the active form of the ibuprofen family',
    },
  },
  {
    groupKey: '세티리진염산염|10밀리그램|정',
    title: 'Cetirizine Hydrochloride 10 mg Tablet',
    efficacy:
      'This medicine is used for seasonal and year-round allergic rhinitis, allergic conjunctivitis, long-lasting hives with no known cause, and itchy skin.',
    usage:
      'Adults and children 6 or older take one tablet (10 mg) once a day, before bed. If you are sensitive to side effects, you may split the dose and take half a tablet (5 mg) in the morning and half in the evening.',
    usageLabel: 'How to take it',
    caution:
      'Take care if you have ever reacted to this medicine or to hydroxyzine or piperazine derivatives, or if you have kidney failure. Talk to a pharmacist before taking it if you are pregnant or breastfeeding, have kidney or liver problems, are elderly, or are at risk of epilepsy or seizures. It can make you sleepy, so take care when driving or operating machinery. Do not take it together with theophylline, ritonavir or a large amount of alcohol.',
    summaryTable: {
      Category: 'Over-the-counter',
      Ingredient: 'Cetirizine hydrochloride 10 mg',
      'How it works': 'Antihistamine (eases allergy symptoms)',
      'Main symptoms': 'Allergic rhinitis, allergic conjunctivitis, long-lasting hives, itchy skin',
      'Who should be careful': 'Kidney problems; pregnancy and breastfeeding; may cause sleepiness',
      'Why this one': 'An antihistamine taken once a day',
    },
  },
];

/** EN 은 영어 라벨을 쓰므로 sd-* 빌더를 그대로 쓰되 라벨만 영어로 조립한다. */
function buildEnHtml(t: EnTranslation): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const st = t.summaryTable;
  const out: string[] = [];
  out.push('<div class="sd-card">');
  out.push('  <div class="sd-hero">');
  out.push(
    `    <div class="sd-badges"><span class="sd-badge is-solid">${esc(st['Category'])}</span><span class="sd-badge">${esc(st['How it works'])}</span></div>`,
  );
  out.push(`    <h1>${esc(t.title)}<small>${esc(st['Why this one'])}</small></h1>`);
  out.push(`    <p class="sd-meta">${esc(st['Ingredient'])}</p>`);
  out.push('  </div>');
  out.push('  <div class="sd-body">');
  out.push(`    <p class="sd-intro">${esc(t.efficacy)}</p>`);
  out.push('    <h2>At a glance</h2>');
  out.push('    <div class="sd-core">');
  for (const [k, v] of Object.entries(st)) {
    out.push('      <div class="sd-item">');
    out.push(`        <span class="sd-tag">${esc(k)}</span>`);
    out.push(`        <p>${esc(v)}</p>`);
    out.push('      </div>');
  }
  out.push('    </div>');
  out.push(`    <h2>${esc(t.usageLabel)}</h2>`);
  out.push(`    <p class="sd-intake">${esc(t.usage)}</p>`);
  out.push('    <h2>Before you take this</h2>');
  out.push('    <ul class="sd-who">');
  for (const p of t.caution.split(/(?<=\.)\s+(?=[A-Z(])/)) out.push(`      <li>${esc(p.trim())}</li>`);
  out.push('    </ul>');
  out.push(
    '    <p class="sd-foot">Medicines are managed to GMP standards through sourcing, manufacturing and quality control. Products with the same ingredient, strength and form are managed to the same standard for quality and effect. Check with a pharmacist by ingredient and strength rather than by product name.</p>',
  );
  out.push('  </div>');
  out.push('</div>');
  return out.join('\n');
}

async function main(): Promise<void> {
  // --dump-html: 렌더 검증용 HTML 산출(DB 접속 없음)
  if (process.argv.slice(2).includes('--dump-html')) {
    const fs = await import('node:fs');
    const out: Record<string, string> = {};
    for (const t of EN) out[t.groupKey] = buildEnHtml(t);
    fs.writeFileSync(process.env.DUMP_PATH || 'C:/tmp/pilot/en5-html.json', JSON.stringify(out, null, 1));
    console.log(`dumped ${EN.length} html`);
    return;
  }
  const apply =
    process.argv.slice(2).includes('--apply') && process.env.DRUG_OTC_EN_PILOT_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  const { DataSource } = await import('typeorm');
  const host = process.env.DB_HOST;
  if (!host) throw new Error('DB_HOST 미설정 — Cloud SQL Auth Proxy(127.0.0.1) 필요');
  const ds = new DataSource({
    type: 'postgres',
    host,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [],
    synchronize: false,
    logging: ['error'],
  });
  await ds.initialize();

  let inserted = 0;
  try {
    const plan: {
      groupKey: string;
      candidateId: string;
      masterId: string;
      koRows: number;
      htmlLen: number;
    }[] = [];

    for (const t of EN) {
      // 한국어 canonical 확인 + 대표 master (결정론적: master_id 최소)
      const rows: { cid: string; rep: string; ko_rows: string }[] = await ds.query(
        `SELECT d.candidate_id::text AS cid,
                (array_agg(s.master_id::text ORDER BY s.master_id))[1] AS rep,
                count(s.id)::text AS ko_rows
         FROM shared_product_descriptions s
         JOIN product_candidate_description_drafts d ON d.candidate_id = s.source_ref_id
         WHERE s.source_type = $1 AND s.status='canonical' AND s.language='ko'
           AND s.description_type='STORE' AND s.deleted_at IS NULL
           AND d.content_json->>'groupKey' = $2
         GROUP BY d.candidate_id`,
        [PROMOTION_SOURCE_TYPE, t.groupKey],
      );
      if (rows.length !== 1) throw new Error(`한국어 canonical 조회 실패: ${t.groupKey} (${rows.length}건)`);
      const { cid, rep, ko_rows } = rows[0];

      // 기존 en STORE 행이 있으면 중단(덮어쓰지 않는다)
      const [{ n }]: { n: string }[] = await ds.query(
        `SELECT count(*)::text AS n FROM shared_product_descriptions
         WHERE master_id = $1::uuid AND description_type='STORE' AND language='en' AND deleted_at IS NULL`,
        [rep],
      );
      if (Number(n) > 0) throw new Error(`기존 영문 존재 — 덮어쓰지 않고 중단: ${t.groupKey} (master ${rep})`);

      plan.push({ groupKey: t.groupKey, candidateId: cid, masterId: rep, koRows: Number(ko_rows), htmlLen: buildEnHtml(t).length });
    }

    if (plan.length !== EXPECTED_ROWS) throw new Error(`대상 수 불일치: ${plan.length} ≠ ${EXPECTED_ROWS}`);

    if (apply) {
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        for (const t of EN) {
          const p = plan.find((x) => x.groupKey === t.groupKey)!;
          const res = await qr.query(
            `INSERT INTO shared_product_descriptions
               (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             SELECT $1::uuid, $2, $3, $4, $5::uuid, 'needs_review', 'en', 'STORE', now(), now()
             WHERE NOT EXISTS(
               SELECT 1 FROM shared_product_descriptions s
               WHERE s.master_id = $1::uuid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL)
             RETURNING id`,
            [p.masterId, buildEnHtml(t), t.summaryTable['Main symptoms'] ?? null, PROMOTION_SOURCE_TYPE, p.candidateId],
          );
          inserted += Array.isArray(res) ? res.length : 0;
        }
        if (inserted !== EXPECTED_ROWS) throw new Error(`INSERT 수 불일치: ${inserted} ≠ ${EXPECTED_ROWS} — 롤백`);
        await qr.commitTransaction();
      } catch (e) {
        await qr.rollbackTransaction();
        throw e;
      } finally {
        await qr.release();
      }
    }

    console.log('───────────────────────────────────────────────');
    console.log(`OTC 영문 번역 저장 파일럿 (${mode})`);
    console.log('───────────────────────────────────────────────');
    for (const p of plan)
      console.log(`  ${p.groupKey.padEnd(42)} ko ${String(p.koRows).padStart(2)} rows → en 1 row (master ${p.masterId.slice(0, 8)}…, html ${p.htmlLen})`);
    console.log(`대상 rows            : ${plan.length}`);
    console.log(`status               : needs_review (검토 상태 — canonical 아님)`);
    console.log(`한국어 변경          : 0 (UPDATE 문 없음)`);
    console.log(`dbWrite              : ${apply ? inserted : 0}`);
  } finally {
    await ds.destroy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
