/**
 * BulkMatchService
 *
 * WO-O4O-BULK-MATCHING-NORMALIZATION-V1
 * WO-O4O-PRODUCTMASTER-MATCHING-RECALL-CLOSURE-FOR-CAFE24-V1 (recall 개선)
 *
 * 외부 상품(이름 + 선택적 자체상품코드)을 ProductMaster 에 매칭한다.
 *
 * 사다리:
 *   1. identifier_exact   — product_identifiers (identifier_value / normalized_value) 완전일치
 *   2. normalized_exact   — 이름 정규화 키 완전일치 (양쪽 동일 규칙)
 *   3. containment        — master 정규화명이 입력 정규화명에 포함 + Dice 유사도
 *   4. NOT_FOUND
 *
 * 왜 바뀌었나 (WO-...-RECALL-CLOSURE-...):
 *   기존 구현은 `normalizeName(q)` 로 만든 needle 을 **정규화되지 않은** `product_masters.name`
 *   컬럼에 ILIKE 로 넣었다. 정규화가 한쪽에만 걸려 있어서 공백/괄호 차이만으로 정답이
 *   후보에 들어오지 못했다 (Cafe24 Controlled Pilot 30건 중 expected 도달 19건, LIMIT 6 통과 18건).
 *   추가로 LIMIT 6 컷오프, 식별자 축 미사용이 recall 을 더 깎았다.
 *   지금은 batch 당 product_masters 를 1회 선적재해 메모리 정규화 인덱스를 만든다
 *   (drug-import/drug-master-promotion-apply.db.ts `preloadCatalog` 과 동일한 기존 패턴).
 *   이름당 seq scan 을 반복하지 않으므로 정확도와 속도가 함께 좋아진다.
 */

import type { DataSource } from 'typeorm';

export type MatchStatus = 'EXACT_MATCH' | 'SIMILAR_MATCH' | 'NOT_FOUND';

/** 어느 단계에서 매칭됐는지 — 자동확정 여부 판단 근거 */
export type MatchStep = 'identifier_exact' | 'normalized_exact' | 'containment' | 'none';

export interface MasterCandidate {
  id: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  barcode: string;
}

export interface MatchResult {
  /** 원본 입력값 */
  rawName: string;
  /** 정규화된 이름 */
  normalizedName: string;
  /** 매칭 상태 */
  status: MatchStatus;
  /** 매칭이 성립한 단계 */
  matchedBy: MatchStep;
  /** EXACT_MATCH 시 연결할 master */
  master?: MasterCandidate;
  /** SIMILAR_MATCH 시 후보 목록 (최대 5건) */
  candidates?: MasterCandidate[];
  /** SIMILAR_MATCH 중 1순위 후보의 유사도 (0~1). 자동확정 근거로 쓰지 않는다. */
  topScore?: number;
}

/** 입력 항목 — 이름은 필수, 자체상품코드는 있으면 1순위 축으로 쓴다. */
export interface MatchInput {
  name: string;
  /** 외부몰 자체상품코드 등 식별자 (Cafe24 custom_product_code) */
  code?: string | null;
}

/**
 * 상품명 정규화 (표시/alias 저장용 — 공백 유지)
 *
 * - trim, 소문자화
 * - 연속 공백 정리
 * - 특수문자 제거 (Korean, English, digits, spaces 유지)
 * - 단위 정규화: 숫자+단위 사이 공백 제거 (500 mg → 500mg)
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w가-힣\s]/g, '')
    .replace(/(\d+)\s*(mg|ml|g|kg|mcg|iu|정|캡슐|포|매|개|회|일)\b/gi, '$1$2')
    .trim();
}

/**
 * 매칭 키 정규화 — 공백까지 제거한 비교 전용 키.
 *
 * 검색 대상(master.name)과 검색어에 **동일하게** 적용해야 한다.
 * 한쪽에만 적용하면 `지엠팜임산부리포퍼액상철분제` 가
 * `지엠팜 임산부 리포퍼 액상 철분제` 를 찾지 못한다.
 */
export function normalizeKey(name: string): string {
  return (name || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}

/** 식별자 정규화 — product_identifiers.normalized_value 조회용 */
function normalizeIdentifier(code: string): string {
  return (code || '').trim().toUpperCase();
}

/** bigram Dice 계수 */
export function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const grams = (s: string): Set<string> => {
    const out = new Set<string>();
    if (s.length < 2) { out.add(s); return out; }
    for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
    return out;
  };
  const A = grams(a);
  const B = grams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter += 1;
  return (2 * inter) / (A.size + B.size);
}

/** containment 후보로 쓸 master 정규화명 최소 길이 — 너무 짧으면 아무 이름에나 걸린다 */
const MIN_CONTAINMENT_KEY_LENGTH = 6;
/** SIMILAR 로 제시할 최소 유사도 */
const SIMILAR_MIN_SCORE = 0.7;
/** 1순위 후보를 대표로 내세울 최소 점수 격차 */
const SIMILAR_DOMINANCE_GAP = 0.05;
/** 한 번에 처리하는 최대 입력 수 */
const MAX_INPUTS = 200;
/** 후보 목록 상한 (유사도 후보) */
const MAX_CANDIDATES = 5;
/**
 * 이름이 완전히 같은 master 가 여러 건일 때의 후보 상한.
 * 이 경우 후보들은 이름으로 구별이 불가능하므로(제조사/규격으로만 구별) 잘라내면
 * 정답이 목록에서 빠진다. 실측: `홍삼농축액 15` 동명 13건 중 정답이 13번째.
 */
const MAX_EXACT_COLLISION_CANDIDATES = 20;

interface MasterRow {
  id: string;
  name: string;
  regulatory_name: string;
  manufacturer_name: string;
  barcode: string;
}

interface MasterIndex {
  byId: Map<string, MasterRow>;
  /** 정규화 키 → master id 목록 */
  byKey: Map<string, string[]>;
  /** containment 대상 키 (길이 >= MIN_CONTAINMENT_KEY_LENGTH) */
  longKeys: string[];
}

function toCandidate(r: MasterRow): MasterCandidate {
  return {
    id: r.id,
    name: r.name,
    regulatoryName: r.regulatory_name,
    manufacturerName: r.manufacturer_name,
    barcode: r.barcode,
  };
}

export class BulkMatchService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 이름 목록을 받아 각각의 ProductMaster 매칭 결과를 반환한다. (기존 계약 유지)
   */
  async matchNames(names: string[]): Promise<MatchResult[]> {
    return this.matchItems(names.map((name) => ({ name })));
  }

  /**
   * 이름 + 선택적 식별자로 매칭한다.
   * 최대 200건 제한.
   */
  async matchItems(items: MatchInput[]): Promise<MatchResult[]> {
    const limited = items.slice(0, MAX_INPUTS);
    const results: MatchResult[] = [];

    const usable = limited.filter((it) => (it.name || '').trim() || (it.code || '').trim());
    if (usable.length === 0) {
      return limited.map((it) => ({
        rawName: it.name ?? '',
        normalizedName: '',
        status: 'NOT_FOUND' as const,
        matchedBy: 'none' as const,
      }));
    }

    // 1) 식별자 축 — 인덱스가 있으므로 batch 단일 쿼리
    const identifierMap = await this.loadIdentifierMatches(usable);

    // 2) 이름 축 — batch 당 1회 선적재 (이름당 seq scan 반복 제거)
    const needsNameAxis = usable.some((it) => !this.pickSingle(identifierMap, it.code));
    const index = needsNameAxis ? await this.loadMasterIndex() : null;

    // 식별자로만 끝난 batch 는 전체 선적재를 하지 않으므로 확정된 master 만 개별 조회한다
    const resolvedById = index
      ? index.byId
      : await this.loadMastersByIds(
          usable.map((it) => this.pickSingle(identifierMap, it.code)).filter((id): id is string => !!id),
        );

    for (const item of limited) {
      const rawName = item.name ?? '';
      if (!rawName.trim() && !(item.code || '').trim()) {
        results.push({ rawName, normalizedName: '', status: 'NOT_FOUND', matchedBy: 'none' });
        continue;
      }
      results.push(this.resolve(item, identifierMap, index, resolvedById));
    }

    return results;
  }

  /** 단계별 판정 — DB 접근 없음(선적재된 인덱스만 사용) */
  private resolve(
    item: MatchInput,
    identifierMap: Map<string, string[]>,
    index: MasterIndex | null,
    resolvedById: Map<string, MasterRow>,
  ): MatchResult {
    const rawName = item.name ?? '';
    const normalizedName = normalizeName(rawName);

    // 1. identifier exact — 단일 후보일 때만 확정
    const idHit = this.pickSingle(identifierMap, item.code);
    if (idHit) {
      const row = resolvedById.get(idHit);
      return {
        rawName,
        normalizedName,
        status: 'EXACT_MATCH',
        matchedBy: 'identifier_exact',
        ...(row ? { master: toCandidate(row) } : {}),
      };
    }

    if (!index || !rawName.trim()) {
      return { rawName, normalizedName, status: 'NOT_FOUND', matchedBy: 'none' };
    }

    const key = normalizeKey(rawName);
    if (!key) return { rawName, normalizedName, status: 'NOT_FOUND', matchedBy: 'none' };

    // 2. normalized exact
    const exactIds = index.byKey.get(key) ?? [];
    if (exactIds.length === 1) {
      return {
        rawName,
        normalizedName,
        status: 'EXACT_MATCH',
        matchedBy: 'normalized_exact',
        master: toCandidate(index.byId.get(exactIds[0])!),
      };
    }
    if (exactIds.length > 1) {
      // 동명이인 — 자동확정하지 않는다
      return {
        rawName,
        normalizedName,
        status: 'SIMILAR_MATCH',
        matchedBy: 'normalized_exact',
        candidates: exactIds
          .slice(0, MAX_EXACT_COLLISION_CANDIDATES)
          .map((id) => toCandidate(index.byId.get(id)!)),
        topScore: 1,
      };
    }

    // 3. containment — master 정규화명이 입력 정규화명 안에 들어 있는 경우
    //    (Cafe24 쪽이 `[브랜드]`, `(본품)`, `50ml` 처럼 토큰을 더 갖는 실제 패턴)
    const pool = new Set<string>();
    for (const k of index.longKeys) {
      if (key.includes(k)) {
        for (const id of index.byKey.get(k) ?? []) pool.add(id);
      }
    }
    const scored = [...pool]
      .map((id) => ({ id, score: diceSimilarity(key, normalizeKey(index.byId.get(id)!.name)) }))
      .filter((s) => s.score >= SIMILAR_MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES);

    if (scored.length === 0) {
      return { rawName, normalizedName, status: 'NOT_FOUND', matchedBy: 'none' };
    }
    return {
      rawName,
      normalizedName,
      status: 'SIMILAR_MATCH',
      matchedBy: 'containment',
      candidates: scored.map((s) => toCandidate(index.byId.get(s.id)!)),
      topScore: scored[0].score,
    };
  }

  /** 식별자 후보가 단 하나일 때만 반환 */
  private pickSingle(map: Map<string, string[]>, code?: string | null): string | null {
    const norm = normalizeIdentifier(code ?? '');
    if (!norm) return null;
    const ids = map.get(norm);
    return ids && ids.length === 1 ? ids[0] : null;
  }

  /** 입력 코드들을 한 번에 product_identifiers 에서 조회 (인덱스 사용) */
  private async loadIdentifierMatches(items: MatchInput[]): Promise<Map<string, string[]>> {
    const codes = [...new Set(items.map((it) => normalizeIdentifier(it.code ?? '')).filter(Boolean))];
    const map = new Map<string, string[]>();
    if (codes.length === 0) return map;

    const rows: Array<{ identifier_value: string; normalized_value: string | null; product_master_id: string }> =
      await this.dataSource.query(
        `SELECT identifier_value, normalized_value, product_master_id
           FROM product_identifiers
          WHERE deleted_at IS NULL
            AND (upper(identifier_value) = ANY($1::text[]) OR upper(normalized_value) = ANY($1::text[]))`,
        [codes],
      );
    for (const r of rows) {
      for (const raw of [r.identifier_value, r.normalized_value]) {
        const k = normalizeIdentifier(raw ?? '');
        if (!k || !codes.includes(k)) continue;
        const arr = map.get(k);
        if (arr) {
          if (!arr.includes(r.product_master_id)) arr.push(r.product_master_id);
        } else {
          map.set(k, [r.product_master_id]);
        }
      }
    }
    return map;
  }

  /** 확정된 master id 만 개별 조회 (전체 선적재 회피) */
  private async loadMastersByIds(ids: string[]): Promise<Map<string, MasterRow>> {
    const map = new Map<string, MasterRow>();
    const unique = [...new Set(ids)];
    if (unique.length === 0) return map;
    const rows: MasterRow[] = await this.dataSource.query(
      `SELECT id, name, regulatory_name, manufacturer_name, barcode
         FROM product_masters
        WHERE id = ANY($1::uuid[])`,
      [unique],
    );
    for (const r of rows) map.set(r.id, r);
    return map;
  }

  /**
   * product_masters 선적재 → 정규화 인덱스.
   *
   * batch 1회만 수행한다. 상주 캐시를 두지 않는 이유는 Cloud Run 인스턴스 메모리를
   * 상시 점유하지 않기 위해서다(요청 종료 후 GC 대상).
   */
  private async loadMasterIndex(): Promise<MasterIndex> {
    const rows: MasterRow[] = await this.dataSource.query(
      `SELECT id, name, regulatory_name, manufacturer_name, barcode
         FROM product_masters
        WHERE status = 'ACTIVE'`,
    );
    const byId = new Map<string, MasterRow>();
    const byKey = new Map<string, string[]>();
    for (const r of rows) {
      byId.set(r.id, r);
      const k = normalizeKey(r.name ?? '');
      if (!k) continue;
      const arr = byKey.get(k);
      if (arr) arr.push(r.id);
      else byKey.set(k, [r.id]);
    }
    const longKeys: string[] = [];
    for (const k of byKey.keys()) {
      if (k.length >= MIN_CONTAINMENT_KEY_LENGTH) longKeys.push(k);
    }
    return { byId, byKey, longKeys };
  }
}
