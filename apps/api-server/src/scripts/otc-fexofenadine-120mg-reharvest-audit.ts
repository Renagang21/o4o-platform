/**
 * WO-O4O-OTC-FEXOFENADINE-120MG-REHARVEST-AND-CLOSEOUT-NA-V1 — Agent 나. READ-ONLY 분석부(생산 write 0).
 * 펙소페나딘염산염 120mg 정 한정. 현재 DB 로 정본 모집단 재구성 + 집합분리 + fingerprint 정합 + 게이트 판정.
 * 생산은 게이트 전부 PASS 시 별도 apply 스크립트(이중게이트)에서. 본 스크립트는 절대 write 안 함.
 * proxy: DISCOVERY_DB_PORT(기본 5433, 장애시 5434).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const AUTH = ['mfds_drug_otc', 'nutrition_combo'];
const ING = '펙소페나딘염산염', DOSE = '120밀리그램', FORM = '정';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string { return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim(); }
function easySections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null; while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out; }
function freeSections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null; while ((m = re.exec(content))) { const t = m[2].replace(/[:：]\s*$/, '').trim(); const b = m[3].trim(); if (t) out[t] = (out[t] ? out[t] + '\n' : '') + b; } return out; }
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string } { let ind = '', dos = '', cau = ''; for (const [t, b] of Object.entries(sec)) { if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b; else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b; else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b; } return { ind, dos, cau }; }
const formOf = (name: string): string => /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽' : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
function routeSig(name: string): string { if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal'; if (/좌약|좌제/.test(name)) return 'rectal'; if (/점안|안연고/.test(name)) return 'ophthalmic'; if (/점이액|귀에/.test(name)) return 'otic'; if (/점비|비강/.test(name)) return 'nasal'; if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical'; if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral'; return 'unknown'; }
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
function fpParts(name: string, spec: string, content: string) { let sec = easySections(content || ''); if (Object.keys(sec).length === 0) sec = freeSections(content || ''); const { ind, dos, cau } = bucketSections(sec); const indH = H(normalize(ind)), dosH = H(normalize(dos)), cauH = H(normalize(cau)); const fp = H([indH, dosH, cauH, H(`${ingredientOf(name)}|${strengthOf(spec)}`), H(formOf(name)), routeSig(name)].join('|')); return { fp, indH, dosH, cauH, form: formOf(name), route: routeSig(name) }; }

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.DISCOVERY_DB_PORT || '5433', 10), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();
  const out: any = { wo: 'WO-O4O-OTC-FEXOFENADINE-120MG-REHARVEST-AND-CLOSEOUT-NA-V1', readOnly: true, dbWrite: 0, group: `${ING}|${DOSE}|${FORM}` };
  try {
    // coarse universe: 현재 ko canonical(any) + easy(canonical|deprecated 최장) content 동반
    const rows: Array<{ id: string; name: string; spec: string; ko_src: string | null; ko_status: string | null; ko_ref: string | null; ko_md5: string | null; en_canon: string; en_md5s: string[]; easy_content: string | null; easy_status: string | null }> = await ds.query(`
      SELECT pm.id::text id, pm.name, pm.specification spec,
        kc.source_type ko_src, kc.status ko_status, kc.source_ref_id::text ko_ref, kc.md5 ko_md5,
        (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text en_canon,
        COALESCE((SELECT array_agg(DISTINCT md5(s.content)) FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.description_type='STORE' AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL), ARRAY[]::text[]) en_md5s,
        es.content easy_content, es.status easy_status
      FROM product_masters pm
      LEFT JOIN LATERAL (SELECT s.source_type, s.status, s.source_ref_id, md5(s.content) md5 FROM shared_product_descriptions s
          WHERE s.master_id=pm.id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL
          ORDER BY (s.source_type=ANY($4)) DESC LIMIT 1) kc ON true
      LEFT JOIN LATERAL (SELECT s.content, s.status FROM shared_product_descriptions s
          WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
          ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
      WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
      ORDER BY pm.id`, [ING, DOSE, FORM, AUTH]);

    const enriched = rows.map((r) => {
      const parts = r.easy_content ? fpParts(r.name, r.spec, r.easy_content) : { fp: null, indH: null, dosH: null, cauH: null, form: formOf(r.name), route: routeSig(r.name) };
      const isAuthored = r.ko_src != null && AUTH.includes(r.ko_src);
      const isEasy = r.ko_src === 'mfds_easy_drug';
      return { ...r, ...parts, isAuthored, isEasy };
    });

    // fingerprint 종류 집계 (easy content 기준 — LIVE 는 deprecated easy 로 재현)
    const fpGroups: Record<string, { n: number; authored: number; easy: number; cauHashes: Set<string>; indHashes: Set<string>; dosHashes: Set<string> }> = {};
    for (const e of enriched) { if (!e.fp) continue; const g = fpGroups[e.fp] || (fpGroups[e.fp] = { n: 0, authored: 0, easy: 0, cauHashes: new Set(), indHashes: new Set(), dosHashes: new Set() }); g.n++; if (e.isAuthored) g.authored++; if (e.isEasy) g.easy++; g.cauHashes.add(e.cauH!); g.indHashes.add(e.indH!); g.dosHashes.add(e.dosH!); }
    // dominant fp = authored(LIVE) 최다
    const fpSorted = Object.entries(fpGroups).sort((a, b) => b[1].authored - a[1].authored || b[1].n - a[1].n);
    const targetFp = fpSorted[0]?.[0] ?? null;

    const liveSet = enriched.filter((e) => e.isAuthored && e.fp === targetFp);
    const newSet = enriched.filter((e) => e.isEasy && e.fp === targetFp);
    const sameCoarseDiffFp = enriched.filter((e) => e.fp !== targetFp);
    const noFp = enriched.filter((e) => !e.fp);
    const anomalies = enriched.filter((e) => e.ko_src == null && e.fp === targetFp); // target fp 인데 ko canonical 없음

    // source_ref 집계 (LIVE)
    const liveRefs = [...new Set(liveSet.map((e) => e.ko_ref).filter(Boolean))];
    const liveAuthoredMd5 = [...new Set(liveSet.map((e) => e.ko_md5).filter(Boolean))];
    const liveEnMd5 = [...new Set(liveSet.flatMap((e) => e.en_md5s))];
    const liveEnCanonCount = liveSet.filter((e) => parseInt(e.en_canon, 10) >= 1).length;
    // NEW 후보 상태: en 기존? authored 기존?
    const newEnExisting = newSet.filter((e) => parseInt(e.en_canon, 10) >= 1).length;
    const newAuthoredExisting = newSet.filter((e) => e.isAuthored).length;

    // fingerprint 정합: target fp 그룹의 ind/dos/cau 해시가 단일?
    const tg = fpGroups[targetFp!];
    const singleInd = tg ? tg.indHashes.size === 1 : false;
    const singleDos = tg ? tg.dosHashes.size === 1 : false;
    const singleCau = tg ? tg.cauHashes.size === 1 : false;

    // 게이트 판정
    const gate: Record<string, boolean> = {
      fingerprint_single_kind: fpSorted.length >= 1 && singleInd && singleDos && singleCau,
      live_and_new_same_fp: liveSet.length > 0 && newSet.length > 0 && [...new Set([...liveSet, ...newSet].map((e) => e.fp))].length === 1,
      ingredient_strength_form_route_uniform: [...new Set([...liveSet, ...newSet].map((e) => `${e.form}|${e.route}`))].length === 1 && [...liveSet, ...newSet].every((e) => e.route === 'oral' && e.form === FORM),
      efficacy_usage_caution_identical: singleInd && singleDos && singleCau,
      other_zero: sameCoarseDiffFp.length === 0 && noFp.length === 0 && anomalies.length === 0,
      en_builder_byte_identical_reusable: liveEnMd5.length === 1 && liveEnCanonCount === liveSet.length,
      new_no_existing_authored_or_en: newAuthoredExisting === 0 && newEnExisting === 0,
      live_authored_content_single: liveAuthoredMd5.length === 1,
      live_ref_single: liveRefs.length === 1,
    };
    const gatePass = Object.values(gate).every(Boolean);

    // bridge entry 의 safety-fingerprint 세부 분류 (동일 full-content fp 내 안전지문불일치 존재?)
    let bridgeSplit: any = null;
    try {
      const bj = JSON.parse(readFileSync(path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json'), 'utf8'));
      const barr = bj.groups || bj;
      const bg = barr.filter((x: any) => x.pharmKey === `ing:${ING}|${DOSE}|${FORM}|oral`);
      const tgt = bg.find((x: any) => x.fingerprint === targetFp) || null;
      bridgeSplit = { targetFpEntry: tgt ? { fp: tgt.fingerprint, size: tgt.size, counts: tgt.counts } : null, allEntries: bg.map((x: any) => ({ fp: x.fingerprint, size: x.size, counts: x.counts })) };
    } catch { /* noop */ }
    const safetyMismatch = bridgeSplit?.targetFpEntry?.counts?.['안전지문불일치'] ?? 0;
    const authoredExpand = bridgeSplit?.targetFpEntry?.counts?.['authored그대로확장'] ?? 0;
    // LIVE easy source 부재 → fingerprint 재현/원문 대조 불가
    const liveEasySourcePresent = false; // probe 로 확인: 34 authored 전원 with_easy_any=0

    // 불일치 원인 (택1)
    let cause: string;
    if (safetyMismatch > 0) cause = 'CONTENT_VARIANT';              // 동일 full-fp 내 제품별 안전정보 차이 (bridge 안전지문불일치)
    else if (!gate.efficacy_usage_caution_identical || !gate.fingerprint_single_kind) cause = 'CONTENT_VARIANT';
    else if (!liveEasySourcePresent) cause = 'IDENTIFIER_LINK_ERROR'; // LIVE easy source 부재 → fingerprint 대조 불가
    else if (!gate.other_zero) cause = 'CONTENT_VARIANT';
    else if (newSet.length !== 5) cause = 'SOURCE_EXPANSION';
    else cause = 'READY_FOR_PRODUCTION';
    out.bridge_n_recorded = 5;
    out.bridgeSplit = bridgeSplit;
    out.safety_fingerprint_mismatch = safetyMismatch;
    out.authored_expand_bucket = authoredExpand;
    out.live_easy_source_present = liveEasySourcePresent;
    // 안전지문불일치>0 또는 LIVE easy 부재면 게이트 강제 실패
    gate.no_safety_fingerprint_mismatch = safetyMismatch === 0;
    gate.live_easy_source_verifiable = liveEasySourcePresent;

    out.reharvest = {
      coarseTotal: enriched.length, targetFp,
      liveCount: liveSet.length, newCount: newSet.length,
      sameCoarseDiffFpCount: sameCoarseDiffFp.length, noFpCount: noFp.length, anomalyCount: anomalies.length,
      fpKinds: fpSorted.length, fpDistribution: fpSorted.map(([fp, g]) => ({ fp, n: g.n, authored: g.authored, easy: g.easy, indKinds: g.indHashes.size, dosKinds: g.dosHashes.size, cauKinds: g.cauHashes.size, target: fp === targetFp })),
      live_source_ref_ids: liveRefs, live_authored_md5_kinds: liveAuthoredMd5.length, live_en_md5_kinds: liveEnMd5.length, live_en_canon_count: liveEnCanonCount,
      new_authored_existing: newAuthoredExisting, new_en_existing: newEnExisting,
      target_master_ids: newSet.map((e) => e.id).sort(),
      live_master_ids: liveSet.map((e) => e.id).sort(),
      diffFp_master_ids: sameCoarseDiffFp.map((e) => ({ id: e.id, name: e.name, spec: e.spec, fp: e.fp, ko_src: e.ko_src })),
    };
    const gatePassFinal = Object.values(gate).every(Boolean);
    out.gate = gate; out.gatePass = gatePassFinal; out.cause = cause;
    // 생산은 실행하지 않음(안전지문불일치·LIVE easy 부재). 참고용 이론 write 만 기록.
    out.expected_write_if_ready = { T: newSet.length, ko: 4 * newSet.length, en: 2 * newSet.length, total: 6 * newSet.length };
    out.actual_write = 0;
    out.verdict = gatePassFinal && cause === 'READY_FOR_PRODUCTION' ? 'READY_FOR_PRODUCTION' : 'HOLD_REVIEW_LATER';

    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(path.join(OUT_DIR, 'otc-fexofenadine-120mg-reharvest-v1.json'), JSON.stringify(out, null, 2), 'utf8');
    console.log(JSON.stringify({
      coarseTotal: enriched.length, targetFp, live: liveSet.length, new: newSet.length,
      other: { diffFp: sameCoarseDiffFp.length, noFp: noFp.length, anomaly: anomalies.length },
      fpKinds: fpSorted.length, liveRefs: liveRefs.length, liveAuthoredMd5Kinds: liveAuthoredMd5.length, liveEnMd5Kinds: liveEnMd5.length,
      newAuthoredExisting, newEnExisting, safetyMismatch, authoredExpand, liveEasySourcePresent,
      gate, gatePass: gatePassFinal, cause, expected_write_if_ready: out.expected_write_if_ready, actual_write: 0, verdict: out.verdict,
    }, null, 2));
  } finally { if (ds.isInitialized) await ds.destroy(); }
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
