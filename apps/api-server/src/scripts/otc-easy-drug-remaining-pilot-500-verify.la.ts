/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-QUEUE-V1 — 독립검증 (READ-ONLY)
 *
 * ⚠️ READ-ONLY · DB write 0. 선정 스크립트와 **별개 코드경로**로 pilot 500 원장을 재검증한다.
 * 선정 로직(분류기·D'Hondt·층화)을 일절 재사용하지 않고, 산출 JSON 을 입력으로 받아 DB 실측과 직접 대조한다.
 *
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-remaining-pilot-500-verify.la.ts [--port 5497]
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const readPw = (): string => {
  const m = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m);
  if (!m) throw new Error('DB_PASSWORD not found in .env');
  return m[1].trim();
};
const argPort = (): number => {
  const i = process.argv.indexOf('--port');
  return i >= 0 && process.argv[i + 1] ? parseInt(process.argv[i + 1], 10) : 5497;
};
const AUTHORED = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'o4o_drug_otc_topical', 'nutrition_combo'];
const SECTION_KEYS = ['효능·효과', '용법·용량', '경고', '사용상 주의사항', '이상반응', '상호작용'];
/** 원장 생성기와 다른 구현으로 섹션을 다시 뽑는다(정규식 재사용 금지 목적의 별개 파서). */
function parseSections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of content.split('<p><strong>')) {
    const close = part.indexOf('</strong>');
    if (close < 0) continue;
    const key = part.slice(0, close).trim();
    const rest = part.slice(close + '</strong>'.length).replace(/^<br\s*\/?>/, '');
    const end = rest.indexOf('</p>');
    out[key] = (end < 0 ? rest : rest.slice(0, end)).trim();
  }
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function refFor(masterId: string): string {
  const h = md5('otc-v4-master-leaflet:' + masterId);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

async function main(): Promise<void> {
  const ledger = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-ledger-v1.json'), 'utf8'));
  const gaInput = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-agent-ga-input-v1.json'), 'utf8'));
  const naSchema = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-agent-na-handoff-schema-v1.json'), 'utf8'));
  const check = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-500-check-v1.json'), 'utf8'));
  const readyLedger = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-ready-1134-unit-ledger-v1.json'), 'utf8'));
  const ready1134 = new Set<string>((readyLedger.units as any[]).flatMap((u) => u.masterIds));
  const p100 = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-easy-drug-remaining-pilot-100-ledger-v1.json'), 'utf8'));
  const pilot100 = new Set<string>((p100.masters as any[]).map((m) => m.masterId));
  const p100Green = new Set<string>((JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-v4-pilot-100-green-ledger.ga.json'), 'utf8')).rows as any[]).map((r) => r.masterId));
  const p100Exc = new Set<string>((JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-v4-pilot-100-exception-handoff-na.ga.json'), 'utf8')).rows as any[]).map((r) => r.masterId));

  const rows: any[] = ledger.masters;
  const ids: string[] = rows.map((r) => r.masterId);
  const byId = new Map(rows.map((r) => [r.masterId, r]));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: '127.0.0.1', port: argPort(), username: 'o4o_api', password: readPw(),
    database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 600000 },
  });
  await ds.initialize();
  await ds.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const roMode = retRows<{ ro: string }>(await ds.query("SELECT current_setting('transaction_read_only') ro"))[0];

  // 1) master 실재 + OTC 확장 + 이름/규격
  const live = retRows<{ mid: string; name: string; spec: string | null; otc: string }>(await ds.query(`
    SELECT pm.id::text mid, pm.name, pm.specification spec,
      (SELECT count(*) FROM product_drug_extensions e WHERE e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL)::text otc
    FROM product_masters pm WHERE pm.id = ANY($1::uuid[])`, [ids]));
  const liveBy = new Map(live.map((r) => [r.mid, r]));

  // 2) 공식 원문 — 행수 / hash 수 / 대표 content
  const srcAgg = retRows<{ mid: string; n: string; nh: string }>(await ds.query(`
    SELECT s.master_id::text mid, count(*)::text n, count(DISTINCT md5(s.content))::text nh
    FROM shared_product_descriptions s
    WHERE s.master_id = ANY($1::uuid[]) AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
      AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
    GROUP BY 1`, [ids]));
  const srcAggBy = new Map(srcAgg.map((r) => [r.mid, { n: Number(r.n), nh: Number(r.nh) }]));
  const src = retRows<{ mid: string; content: string }>(await ds.query(`
    SELECT DISTINCT ON (s.master_id) s.master_id::text mid, s.content
    FROM shared_product_descriptions s
    WHERE s.master_id = ANY($1::uuid[]) AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
      AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
    ORDER BY s.master_id, length(s.content) DESC`, [ids]));
  const contentBy = new Map(src.map((r) => [r.mid, r.content]));

  // 3) 기존 canonical 점유 + needs_review
  const canon = retRows<{ mid: string; ko: string; en: string; nr: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type=ANY($2))::text ko,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL)::text en,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.status='needs_review' AND s.deleted_at IS NULL)::text nr
    FROM unnest($1::uuid[]) m(mid)`, [ids, AUTHORED]));
  const canonBy = new Map(canon.map((r) => [r.mid, r]));

  // 4) 표준코드 축 — 품목기준코드 / 일반명코드 / 전문일반구분 / 취소
  const std = retRows<{ mid: string; permits: string[] | null; gencodes: string[] | null; cls: string[] | null; rows: string; cancelled: string }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
      array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'품목기준코드','')), NULL) permits,
      array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
      array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'전문일반구분','')), NULL) cls,
      COUNT(*)::text rows,
      COUNT(*) FILTER (WHERE (pc.raw_payload->>'isCancelled')::boolean IS TRUE)::text cancelled
    FROM product_identifiers pi
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
      AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1`, [ids]));
  const stdBy = new Map(std.map((r) => [r.mid, r]));

  // 5) sourceRef LIVE 점유 (pilot 500 + pilot 100 GREEN 80 ref)
  const refs = rows.map((r) => r.sourceRef);
  const green80Refs = [...p100Green].map((id) => refFor(id));
  const refHit = retRows<{ ref: string; n: string }>(await ds.query(
    `SELECT r.ref::text ref, (SELECT count(*) FROM shared_product_descriptions s WHERE s.source_ref_id=r.ref AND s.deleted_at IS NULL)::text n
     FROM unnest($1::uuid[]) r(ref)`, [refs]));
  const refHitTotal = refHit.reduce((s, r) => s + Number(r.n), 0);
  // sourceRef → master 1:1 (동일 ref 가 다른 master 에 이미 존재하지 않는지)
  const refCross = retRows<{ n: string }>(await ds.query(
    `SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [refs]));

  // 6) easy_drug 등록 여부(공식 분모)
  const easyReg = new Set(retRows<{ mid: string }>(await ds.query(
    `SELECT DISTINCT master_id::text mid FROM shared_product_descriptions
     WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND master_id = ANY($1::uuid[])`, [ids])).map((r) => r.mid));

  await ds.query('COMMIT');
  await ds.destroy();

  const fail: string[] = [];
  const push = (ok: boolean, msg: string) => { if (!ok) fail.push(msg); };
  const A = rows.filter((r) => r.stratum === 'A_NORMAL');

  // ── §11 검증 ────────────────────────────────────────────────────────────────────────
  push(roMode?.ro === 'on', 'read-only transaction 아님');
  push(rows.length === 500, `pilot != 500 (${rows.length})`);
  push(new Set(ids).size === 500, `masterId 중복 ${500 - new Set(ids).size}`);
  push(ids.every((id) => !pilot100.has(id)), 'pilot 100 교집합 존재');
  push(ids.every((id) => !p100Green.has(id)), 'pilot 100 GREEN 80 교집합 존재');
  push(ids.every((id) => !p100Exc.has(id)), 'pilot 100 예외 20 교집합 존재');
  push(ids.every((id) => !ready1134.has(id)), 'READY 1,134 교집합 존재');
  push(ids.every((id) => liveBy.has(id)), 'master 미실재 존재');
  push(ids.every((id) => Number(liveBy.get(id)?.otc || 0) > 0), 'OTC 확장 없는 master 포함(공식 분모 밖)');
  push(ids.every((id) => easyReg.has(id)), 'e약은요 미등록 master 포함(공식 분모 밖)');
  push(ids.every((id) => liveBy.get(id)!.name === byId.get(id)!.productName), '제품명 원장≠DB');
  push(ids.every((id) => (liveBy.get(id)!.spec ?? null) === (byId.get(id)!.specification ?? null)), '규격 원장≠DB');

  // 기존 완료 대상 0 (authored ko + en canonical 동시 보유 = 완료)
  push(ids.every((id) => !(Number(canonBy.get(id)!.ko) > 0 && Number(canonBy.get(id)!.en) > 0)), '기존 완료(authored ko+en) master 포함');
  push(rows.every((r) => Number(canonBy.get(r.masterId)!.ko) === r.existingCanonicalKo), 'existingCanonicalKo 원장≠DB');
  push(rows.every((r) => Number(canonBy.get(r.masterId)!.en) === r.existingCanonicalEn), 'existingCanonicalEn 원장≠DB');
  push(A.every((r) => Number(canonBy.get(r.masterId)!.ko) === 0 && Number(canonBy.get(r.masterId)!.en) === 0), 'A 정상층에 기존 canonical 점유');

  // exclude 대상 0 — 표준코드 전량 취소 / 수출·군납·비매품 키워드 독립 재검사
  const EXCLUDE_KW = /수출\s*명|수출\s*용|수출\s*전용|전량\s*수출|for\s*export|export\s*only|군납|군납명|보건소\s*용|보건소\s*납품|비매품|임상\s*시험\s*용|샘플\s*용|견본\s*품|별첨/i;
  push(ids.every((id) => !EXCLUDE_KW.test(liveBy.get(id)!.name) && !EXCLUDE_KW.test(liveBy.get(id)!.spec || '')), 'exclude 키워드(수출/군납/비매품) master 포함');
  push(ids.every((id) => { const s = stdBy.get(id); return !s || !(Number(s.cancelled) > 0 && Number(s.cancelled) === Number(s.rows)); }), '표준코드 전량취소 master 포함');

  // 공식 원문 — hash / 행수 / 섹션 presence 를 별개 파서로 재계산
  push(rows.every((r) => (r.officialSourceHash ?? null) === (contentBy.has(r.masterId) ? md5(contentBy.get(r.masterId)!) : null)), 'officialSourceHash 원장≠DB');
  push(rows.every((r) => r.officialSourceCount === (srcAggBy.get(r.masterId)?.n ?? 0)), 'officialSourceCount 원장≠DB');
  push(rows.every((r) => r.officialSourceHashCount === (srcAggBy.get(r.masterId)?.nh ?? 0)), 'officialSourceHashCount 원장≠DB');
  push(rows.every((r) => {
    const sec = parseSections(contentBy.get(r.masterId) || '');
    return SECTION_KEYS.every((k) => (stripTags(sec[k] || '') ? 1 : 0) === r.officialSectionPresence[k]);
  }), 'officialSectionPresence 원장≠DB(별개 파서)');
  push(A.every((r) => {
    const sec = parseSections(contentBy.get(r.masterId) || '');
    return !!stripTags(sec['효능·효과'] || '') && !!stripTags(sec['용법·용량'] || '');
  }), 'A 정상층에 효능·효과 또는 용법·용량 결손');

  // 전문용 혼입 0
  const SURGICAL = /수술\s*용|시술\s*용|무균\s*수술|관류액|투석액|조영|마취/i;
  push(A.every((r) => {
    const cls = (stdBy.get(r.masterId)?.cls || []).filter(Boolean);
    return !cls.some((c) => /전문/.test(c)) && !SURGICAL.test(liveBy.get(r.masterId)!.name) && !SURGICAL.test(liveBy.get(r.masterId)!.spec || '');
  }), 'A 정상층에 전문/수술 표지 master 혼입');
  push(A.every((r) => !r.professionalSuspect), 'A 정상층 professionalSuspect=true');

  // identity 판정 — §3 정정 기준 대조 (DB 실측 permitCode / 원문 hash)
  push(rows.every((r) => (stdBy.get(r.masterId)?.permits || []).length === r.permitCodeCount), 'permitCodeCount 원장≠DB');
  push(rows.every((r) => (stdBy.get(r.masterId)?.gencodes || []).length === r.gencodeCount), 'gencodeCount 원장≠DB');
  push(rows.filter((r) => r.expectedExceptionCode === 'IDENTITY_CONFLICT')
    .every((r) => (stdBy.get(r.masterId)?.permits || []).length >= 2 || (srcAggBy.get(r.masterId)?.nh || 0) >= 2),
    'IDENTITY_CONFLICT 판정이 §3 정정 기준(permitCode>=2 ∪ 원문hash>=2)과 불일치');
  push(rows.filter((r) => (stdBy.get(r.masterId)?.gencodes || []).length >= 2
      && (stdBy.get(r.masterId)?.permits || []).length < 2 && (srcAggBy.get(r.masterId)?.nh || 0) < 2)
    .every((r) => r.expectedExceptionCode !== 'IDENTITY_CONFLICT'),
    'gencodeCount>=2 단독 건이 IDENTITY_CONFLICT 로 남아 있음(§3 위반)');

  // sourceRef
  push(new Set(refs).size === 500, 'sourceRef 중복');
  push(refHitTotal === 0, `sourceRef LIVE 점유 ${refHitTotal}`);
  push(Number(refCross[0].n) === 0, `sourceRef 가 기존 LIVE row 에 존재 ${refCross[0].n}`);
  push(rows.every((r) => r.sourceRef === refFor(r.masterId)), 'sourceRef 산식 불일치');
  push(refs.every((r) => !green80Refs.includes(r)), 'pilot 100 GREEN 80 sourceRef 와 충돌');

  // 층/기대 상태
  push(rows.every((r) => r.expectedStatus === 'PRODUCE_EXPECTED' || !!r.expectedExceptionCode), '사전예외에 예외코드 누락');
  push(A.every((r) => r.expectedStatus === 'PRODUCE_EXPECTED'), 'A 정상층에 사전예외 혼입');
  push(rows.filter((r) => r.stratum !== 'A_NORMAL').every((r) => r.expectedStatus === 'PRE_EXCEPTION_EXPECTED'), 'B/C 층에 정상 기대 혼입');
  push(rows.every((r) => r.layer === r.stratum), 'layer ≠ stratum');
  push(rows.every((r) => ['A_NORMAL', 'B_BOUNDARY', 'C_SOURCE_COMPOSER'].includes(r.stratum)), '알 수 없는 stratum');

  // §5 필수 필드 완비
  const REQUIRED_FIELDS = ['masterId', 'permitCode', 'permitCodeCount', 'productName', 'specification', 'layer', 'sourceHoldClass',
    'candidateRoute', 'gencodeCount', 'officialSourceCount', 'officialSourceHashCount', 'officialSectionPresence',
    'dosageForm', 'atcCode', 'ingredientSource', 'existingCanonicalKo', 'existingCanonicalEn',
    'sourceRef', 'sourceRefOccupied', 'expectedStatus', 'expectedExceptionCode'];
  push(rows.every((r) => REQUIRED_FIELDS.every((f) => f in r)), '원장 필수 필드 누락');
  push(rows.every((r) => Object.keys(r.officialSectionPresence).length === 6), '공식 6섹션 presence 불완전');

  // agent-ga 입력 ↔ 원장 일치
  push(gaInput.masters.length === 500, `agent-ga 입력 ${gaInput.masters.length} != 500`);
  push(gaInput.masters.every((g: any, i: number) =>
    g.masterId === rows[i].masterId && g.expectedStatus === rows[i].expectedStatus
    && g.expectedExceptionCode === rows[i].expectedExceptionCode && g.sourceRef === rows[i].sourceRef
    && g.candidateRoute === rows[i].candidateRoute && g.officialSourceHash === rows[i].officialSourceHash
    && g.layer === rows[i].layer), 'agent-ga 입력 ≠ pilot 원장');

  // 계약 문서 완비
  push(Object.keys(naSchema.exceptionHandoffSchema.required).length === 17, '예외 schema 필수 17필드 아님');
  push(naSchema.exceptionCodes.length === 15, `예외 코드 ${naSchema.exceptionCodes.length} != 15`);
  push(naSchema.systemStopConditions.length === 17, `시스템 중지 조건 ${naSchema.systemStopConditions.length} != 17 (SYS-01~17)`);
  push(['SYS-13', 'SYS-14', 'SYS-15', 'SYS-16', 'SYS-17'].every((id) => naSchema.systemStopConditions.some((s: any) => s.id === id)), 'SYS-13~17 추가 중지 조건 누락');
  push(naSchema.expansionGateRemainingAll.length === 15, `전량 확대 게이트 ${naSchema.expansionGateRemainingAll.length} != 15`);
  push(JSON.stringify(naSchema.finalVerdictEnum) === JSON.stringify(['APPROVED_FOR_REMAINING_ALL', 'NEEDS_PIPELINE_FIX', 'SYSTEM_STOP']), '최종 판정 enum 불일치');
  push(naSchema.carriedOverExceptions.total === 20, 'pilot 100 예외 20 인계 기록 누락');

  // 선정 스크립트 게이트 전건 PASS
  push(check.gatePass === true && Object.values(check.gates).every(Boolean), `선정 게이트 실패: ${Object.entries(check.gates).filter(([, v]) => !v).map(([k]) => k).join(',')}`);
  push(check.liveDbWrite === 0 && ledger.liveDbWrite === 0 && naSchema.liveDbWrite === 0, 'liveDbWrite != 0 선언');

  const byStratum = rows.reduce((o: Record<string, number>, r) => { o[r.stratum] = (o[r.stratum] || 0) + 1; return o; }, {});
  const byRoute = rows.reduce((o: Record<string, number>, r) => { const k = r.candidateRoute || 'UNRESOLVED'; o[k] = (o[k] || 0) + 1; return o; }, {});
  const byCode = rows.filter((r) => r.expectedExceptionCode).reduce((o: Record<string, number>, r) => { o[r.expectedExceptionCode] = (o[r.expectedExceptionCode] || 0) + 1; return o; }, {});

  console.log('=== PILOT 500 독립검증 (별개 코드경로 · READ-ONLY · dbWrite 0) ===');
  console.log(`transaction_read_only=${roMode?.ro} · rows ${rows.length} · masterUniq ${new Set(ids).size} · sourceRefUniq ${new Set(refs).size} · sourceRefLiveHit ${refHitTotal}`);
  console.log(`byStratum ${JSON.stringify(byStratum)} · byRoute ${JSON.stringify(byRoute)} · byExpectedCode ${JSON.stringify(byCode)}`);
  console.log(`pilot100 교집합 ${ids.filter((id) => pilot100.has(id)).length} · READY1134 교집합 ${ids.filter((id) => ready1134.has(id)).length}`);
  console.log(`identity: permitCode>=2 ${rows.filter((r) => r.permitCodeCount >= 2).length} · 원문hash>=2 ${rows.filter((r) => r.officialSourceHashCount >= 2).length} · gencode>=2 ${rows.filter((r) => r.gencodeCount >= 2).length} · IDENTITY_CONFLICT ${byCode['IDENTITY_CONFLICT'] || 0}`);
  console.log(fail.length ? `FAIL(${fail.length}):\n - ${fail.join('\n - ')}` : 'VERIFY: ALL PASS');
  if (fail.length) process.exit(1);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
