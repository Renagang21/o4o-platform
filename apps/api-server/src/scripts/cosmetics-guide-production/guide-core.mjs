/**
 * WO-O4O-COSMETICS-KO-GUIDE-FULL-PRODUCTION-V1 — KO 최소 설명서 생성 core (SSOT)
 *
 * 기준: `docs/cosmetics/O4O-COSMETICS-PRODUCT-GUIDE-PRODUCTION-STANDARD-V0.md`
 *
 * 이 파일은 파일럿의 인라인 맵(`cosmetics-census-pilot/04-generate-guides.mjs`)을 **전량 생산용으로 확장**한 것이다.
 * 파일럿 산출물은 이미 커밋된 기록이므로 파일럿 스크립트는 건드리지 않는다(범위 외).
 *
 * 불변 원칙 (기준문서 §5, WO §4)
 *   - 가진 근거만으로 채우고 없으면 비운다. 빈 정보를 추론해 채우지 않는다.
 *   - 성분·효능·수치·사용법 같은 사실정보를 새로 만들지 않는다.
 *   - 유형별 일반 사용 안내는 제품 고유 사용법인 것처럼 쓰지 않는다(`CATEGORY_GENERIC`).
 */

/**
 * 유형별 일반 사용 안내 (`usageSource: CATEGORY_GENERIC`).
 * 제품 고유 정보가 아니라 해당 제형의 통상적 사용 순서다.
 */
export const GENERIC_USAGE = {
  // ── 파일럿에서 확립된 항목 ─────────────────────────────────────────
  토너: '세안 후 적당량을 화장솜 또는 손에 덜어 피부결을 따라 부드럽게 정돈해 주세요.',
  토너패드: '세안 후 패드를 꺼내 피부결을 따라 부드럽게 닦아내듯 사용해 주세요.',
  세럼: '토너로 피부결을 정돈한 뒤 적당량을 덜어 얼굴 전체에 부드럽게 펴 발라 주세요.',
  앰플: '토너로 피부결을 정돈한 뒤 적당량을 덜어 집중이 필요한 부위에 펴 발라 주세요.',
  에센스: '토너 사용 후 적당량을 덜어 얼굴 전체에 고르게 펴 발라 주세요.',
  크림: '기초 단계 마지막에 적당량을 덜어 얼굴 전체에 부드럽게 펴 발라 주세요.',
  아이크림: '기초 단계 후 적당량을 덜어 눈가에 부드럽게 두드려 흡수시켜 주세요.',
  핸드크림: '적당량을 덜어 손 전체에 고르게 펴 발라 주세요.',
  로션: '토너 사용 후 적당량을 덜어 얼굴 전체에 부드럽게 펴 발라 주세요.',
  미스트: '필요할 때 얼굴에서 적당히 거리를 두고 가볍게 분사해 주세요.',
  마스크: '세안 후 토너로 피부결을 정돈한 뒤 시트를 밀착시키고 일정 시간 후 떼어내 주세요.',
  팩: '세안 후 적당량을 얼굴에 고르게 펴 바른 뒤 일정 시간 후 씻어내 주세요.',
  클렌징폼: '물과 함께 충분히 거품을 낸 뒤 얼굴을 부드럽게 마사지하고 물로 깨끗이 씻어내 주세요.',
  클렌징오일: '건조한 얼굴에 적당량을 펴 발라 메이크업을 녹인 뒤 물로 충분히 헹궈내 주세요.',
  클렌징워터: '화장솜에 적당량을 덜어 메이크업 부위를 부드럽게 닦아내 주세요.',
  클렌징밤: '건조한 얼굴에 적당량을 펴 발라 메이크업을 녹인 뒤 물로 충분히 헹궈내 주세요.',
  선케어: '외출 전 적당량을 덜어 얼굴과 노출 부위에 고르게 펴 발라 주세요.',
  샴푸: '모발을 적신 뒤 적당량을 덜어 거품을 내어 두피와 모발을 마사지하고 깨끗이 헹궈 주세요.',
  트리트먼트: '샴푸 후 물기를 제거하고 모발에 고르게 발라 일정 시간 후 헹궈 주세요.',
  컨디셔너: '샴푸 후 모발 중간부터 끝까지 발라준 뒤 깨끗이 헹궈 주세요.',
  바디워시: '물과 함께 거품을 내어 몸 전체를 부드럽게 씻어낸 뒤 헹궈 주세요.',
  바디로션: '샤워 후 적당량을 덜어 몸 전체에 고르게 펴 발라 주세요.',
  비누: '물과 함께 거품을 내어 사용한 뒤 깨끗이 헹궈 주세요.',
  오일: '적당량을 덜어 필요한 부위에 부드럽게 펴 발라 주세요.',
  패드: '적당량을 덜어 필요한 부위에 부드럽게 닦아내듯 사용해 주세요.',
  올인원: '세안 후 적당량을 덜어 얼굴 전체에 고르게 펴 발라 주세요.',
  부스터: '세안 후 가장 먼저 적당량을 덜어 얼굴 전체에 펴 발라 주세요.',
  솔루션: '토너로 피부결을 정돈한 뒤 적당량을 덜어 필요한 부위에 펴 발라 주세요.',
  트러블케어: '기초 단계 후 적당량을 덜어 고민 부위에 얇게 펴 발라 주세요.',
  패치: '깨끗이 세안한 뒤 필요한 부위에 붙이고 일정 시간 후 떼어내 주세요.',
  스크럽: '젖은 피부에 적당량을 덜어 부드럽게 문지른 뒤 물로 깨끗이 씻어내 주세요.',
  메이크업: '기초 단계 후 적당량을 덜어 원하는 부위에 고르게 펴 발라 주세요.',
  립: '적당량을 입술에 고르게 발라 주세요.',
  밤: '적당량을 덜어 필요한 부위에 부드럽게 펴 발라 주세요.',
  젤: '적당량을 덜어 필요한 부위에 부드럽게 펴 발라 주세요.',
  스틱: '적당량을 필요한 부위에 직접 굴리듯 발라 주세요.',
  헤어케어: '적당량을 덜어 모발에 고르게 사용해 주세요.',
  헤어에센스: '모발을 말린 뒤 적당량을 덜어 모발 중간부터 끝까지 발라 주세요.',
  헤어미스트: '모발에서 적당히 거리를 두고 가볍게 분사해 주세요.',
  헤어스타일링: '적당량을 덜어 원하는 모양으로 모발을 정돈해 주세요.',
  두피케어: '두피에 적당량을 덜어 고르게 도포하고 가볍게 마사지해 주세요.',
  바디오일: '샤워 후 적당량을 덜어 몸에 고르게 펴 발라 주세요.',
  바디스크럽: '젖은 몸에 적당량을 덜어 부드럽게 문지른 뒤 깨끗이 헹궈 주세요.',
  바디미스트: '몸에서 적당히 거리를 두고 원하는 만큼 분사해 주세요.',
  데오드란트: '깨끗이 씻고 물기를 제거한 부위에 적당량을 발라 주세요.',
  입욕제: '욕조에 받은 물에 적당량을 풀어 사용해 주세요.',
  핸드워시: '물과 함께 거품을 내어 손을 씻은 뒤 깨끗이 헹궈 주세요.',
  풋케어: '깨끗이 씻은 발에 적당량을 덜어 고르게 펴 발라 주세요.',
  여성청결제: '적당량을 덜어 외음부를 부드럽게 세정한 뒤 물로 깨끗이 헹궈 주세요.',
  향수: '원하는 부위에 적당히 거리를 두고 분사해 주세요.',
  네일: '손톱 표면을 정돈한 뒤 얇게 펴 발라 충분히 건조시켜 주세요.',
  네일리무버: '화장솜에 적당량을 덜어 손톱에 올린 뒤 부드럽게 닦아내 주세요.',

  // ── 전량 생산(V1)에서 실제 모집단에 존재해 추가한 유형 ────────────────
  // census 33,106 의 유형 분포 실측에서 파일럿 맵에 없던 화장품 유형만 올린다.
  스킨케어세트: '세트 구성품을 각 제품의 사용 단계(토너 → 에센스 → 로션/크림) 순서에 따라 사용해 주세요.',
  염모제: '제품 설명서에 따라 준비한 뒤 모발에 도포하고 정해진 시간이 지나면 깨끗이 헹궈 주세요. 사용 전 피부 반응 시험(패치 테스트)을 해 주세요.',
  제모: '제모할 부위에 적당량을 도포하고 정해진 시간이 지난 뒤 제거하고 물로 깨끗이 씻어내 주세요.',
  탈모케어: '두피에 적당량을 도포한 뒤 가볍게 마사지해 주세요.',
  쉐이빙: '면도할 부위에 적당량을 도포한 뒤 면도하고 물로 깨끗이 씻어내 주세요.',
  '클렌저/워시': '물과 함께 거품을 내어 부드럽게 씻어낸 뒤 깨끗이 헹궈 주세요.',
  토닉: '적당량을 덜어 필요한 부위에 고르게 발라 주세요.',
  속눈썹영양제: '깨끗하게 정돈한 속눈썹에 적당량을 도포해 주세요.',
  기타메이크업: '기초 단계 후 적당량을 덜어 원하는 부위에 고르게 펴 발라 주세요.',
};

/**
 * 비화장품 의심 유형. 소매 뷰티 랭킹에 섞여 들어온 건기식·기기·생활용품 마디다(기준문서 규칙 S4/T5).
 * 제외하지 않고(원칙 5) 생산은 하되 유형별 일반 사용 안내를 붙이지 않고 문제 큐에 남긴다.
 */
export const NON_COSMETIC_TYPES = new Set([
  '이너뷰티', '체지방 관리', '종합 건강', '눈 건강', '피부 건강', '면역/피로 관리',
  '항산화 관리', '소화/위장 건강', '근육량 증가', '뼈/관절/치아 건강', '모발/손톱 건강',
  '혈행 개선', '기타 식품', '뷰티소품', '뷰티디바이스', '물티슈',
]);

/**
 * 유형이 아니라 분류축인 마디(기준문서 규칙 T3). 유형으로 쓸 수 없으므로 사용 안내를 붙이지 않는다.
 */
export const AXIS_TYPES = new Set(['기타', '스킨케어 기타', '베이비&맘', '임산부화장품']);

/**
 * 유형 미판정 건의 이름 기반 보조 판정 (기준문서 규칙 T2 — 한국어 상품명은 **가장 뒤에 나온** 키워드가 핵심어다).
 * 카테고리가 없을 때만 쓰는 보조 수단이며, 판정되면 `typeSource: NAME_KEYWORD` 로 남긴다.
 */
const NAME_TYPE_KEYWORDS = [
  ['토너패드', '토너패드'], ['클렌징폼', '클렌징폼'], ['클렌징오일', '클렌징오일'],
  ['클렌징워터', '클렌징워터'], ['클렌징밤', '클렌징밤'], ['아이크림', '아이크림'],
  ['핸드크림', '핸드크림'], ['바디로션', '바디로션'], ['바디워시', '바디워시'],
  ['바디미스트', '바디미스트'], ['바디오일', '바디오일'], ['헤어에센스', '헤어에센스'],
  ['헤어미스트', '헤어미스트'], ['트리트먼트', '트리트먼트'], ['컨디셔너', '컨디셔너'],
  ['데오드란트', '데오드란트'], ['선크림', '선케어'], ['선스틱', '선케어'], ['선쿠션', '선케어'],
  ['자외선차단', '선케어'], ['샴푸', '샴푸'], ['토너', '토너'], ['스킨', '토너'],
  ['세럼', '세럼'], ['앰플', '앰플'], ['에센스', '에센스'], ['크림', '크림'],
  ['로션', '로션'], ['미스트', '미스트'], ['마스크', '마스크'], ['팩', '팩'],
  ['패드', '패드'], ['패치', '패치'], ['스크럽', '스크럽'], ['오일', '오일'],
  ['밤', '밤'], ['젤', '젤'], ['스틱', '스틱'], ['비누', '비누'],
  ['향수', '향수'], ['퍼퓸', '향수'], ['립밤', '립'], ['립스틱', '립'], ['틴트', '립'],
  ['쿠션', '메이크업'], ['파운데이션', '메이크업'], ['컨실러', '메이크업'],
  ['섀도우', '메이크업'], ['마스카라', '메이크업'], ['아이라이너', '메이크업'],
];

/**
 * **같은 판매 마디 안에서만** 허용하는 유형 좁히기 표.
 * 육안 검수(WO §14)와 전수 측정에서 반복 확인된 마디만 넣는다 — 한두 건짜리 예외는 넣지 않는다(기준문서 §10).
 * 마디 이름에 실제로 그 토큰이 있고, 좁힌 유형이 자기 사용 안내를 가진 경우만 적용한다.
 */
const NODE_TYPE_REFINEMENT = {
  '스킨/토너/패드': { 패드: '토너패드' },
  '에센스/세럼/앰플': { 앰플: '앰플', 에센스: '에센스' },
  '클렌징폼/젤/비누': { 젤: '젤', 비누: '비누' },
  '클렌징오일/워터': { 클렌징워터: '클렌징워터' },
  '마스크/팩': { 팩: '팩', 마스크: '마스크' },
};

/** 규칙 T2 — 가장 뒤에 나온 키워드로 판정한다. */
export function inferTypeFromName(name) {
  const n = (name ?? '').replace(/\s+/g, '');
  let best = null;
  let bestPos = -1;
  for (const [kw, type] of NAME_TYPE_KEYWORDS) {
    const pos = n.lastIndexOf(kw);
    // 같은 위치면 더 긴 키워드가 이긴다 (`클렌징폼` > `폼`).
    if (pos > bestPos || (pos === bestPos && pos >= 0 && kw.length > (best?.[0]?.length ?? 0))) {
      if (pos >= 0) {
        bestPos = pos;
        best = [kw, type];
      }
    }
  }
  return best ? best[1] : null;
}

/** 괄호·대괄호 구간을 지운다. 증정품 용량을 제품 용량으로 잘못 읽지 않기 위해서다. */
const stripBrackets = (s) => (s ?? '').replace(/\([^()]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');

const CAPACITY_RE = /(\d[\d,]*(?:\.\d+)?)\s*(ml|mL|ML|Ml|g|G|kg|KG|L|ℓ|cc)(?![A-Za-z가-힣])/g;
const COUNT_RE = /(\d[\d,]*)\s*(매|포|정|캡슐|개입|입|팩|장|알|구|호)(?![가-힣])/g;

/**
 * 증정품·동봉 구성품이 시작되는 지점. 이 뒤의 용량은 **이 제품의 용량이 아니다.**
 * 육안 검수 100건에서 4건이 여기서 다른 제품 용량을 가져왔다(증정 세럼 30ml, 동봉 크림 5ml 등) —
 * WO §8 의 "다른 제품 정보 혼입" 에 해당해 규칙으로 올린다(기준문서 §10).
 * `SPF50+` · `1+1` 처럼 숫자 뒤에 붙은 `+` 는 구성 구분자가 아니므로 자르지 않는다.
 */
const GIFT_CUT_RE = /(?<![0-9])[+＋]|증정|사은품/;

/**
 * 판매명에서 **관측된 사실값**만 뽑는다. 없으면 null 이다. 추정하지 않는다.
 * 증정·기획 구성은 제품 자체의 용량이 아니므로 괄호 구간과 증정 구간을 먼저 제거한다.
 */
export function extractCapacity(rawProductName) {
  const stripped = stripBrackets(rawProductName);
  const cut = stripped.search(GIFT_CUT_RE);
  const base = cut >= 0 ? stripped.slice(0, cut) : stripped;
  const ml = [...base.matchAll(CAPACITY_RE)].pop();
  if (ml) return `${ml[1]}${ml[2].toLowerCase() === 'ml' ? 'ml' : ml[2]}`;
  const cnt = [...base.matchAll(COUNT_RE)].pop();
  if (cnt) return `${cnt[1]}${cnt[2]}`;
  return null;
}

/** SPF·PA 표기는 판매처가 판매명에 붙인 사실값이다(기준문서 규칙 N3). 괄호 안도 그대로 읽는다. */
export function extractSunProtection(rawProductName) {
  const s = rawProductName ?? '';
  const spf = s.match(/SPF\s*\d+\+?/i)?.[0]?.replace(/\s+/g, '') ?? null;
  const pa = s.match(/PA\s*\+{1,4}/i)?.[0]?.replace(/\s+/g, '').toUpperCase() ?? null;
  if (!spf && !pa) return null;
  return [spf, pa].filter(Boolean).join('/');
}

const SOURCE_LABEL = {
  MUSINSA_BEAUTY: '무신사 뷰티',
  HWAHAE_RANKING: '화해',
  OLIVEYOUNG_GLOBAL_BEST: '올리브영 글로벌',
};

/** `뷰티|스킨케어|크림/아이크림` → `뷰티 > 스킨케어 > 크림/아이크림` */
const prettyCategory = (c) => (c ? c.split('|').map((x) => x.trim()).filter(Boolean).join(' > ') : null);

/**
 * 후보 1건 → KO 최소 설명서 1건.
 *
 * @param {object} c  census `retail-unique-guide-candidates.json` 의 후보
 * @param {object} fx `functional-match.json` 의 동일 key 결과 (없으면 null)
 */
export function buildKoGuide(c, fx) {
  const issues = [];
  const missing = [];

  // ── 유형 ────────────────────────────────────────────────────────────
  let type = c.type ?? null;
  let typeSource = c.type ? c.typeSource ?? 'RETAIL_CATEGORY' : null;
  if (!type) {
    const inferred = inferTypeFromName(c.canonicalProductName);
    if (inferred) {
      type = inferred;
      typeSource = 'NAME_KEYWORD';
    } else {
      missing.push('productType');
      issues.push({ type: 'PRODUCT_TYPE_UNDETERMINED', detail: '카테고리·이름 어느 쪽에서도 유형을 판정할 수 없다' });
    }
  }
  // 판매처 카테고리 마디가 서로 다른 제품군을 한 마디로 묶은 경우다.
  // 무신사 `헤어컬러/펌` 마디가 염모제로 매핑돼 **펌 제품 117건 중 16건**이 염모제로 표시됐다 —
  // 한두 건이 아니라 반복 사례이므로 규칙으로 올린다(기준문서 §10).
  // 근거 없이 유형을 바꿔 쓰지 않고, **유형을 주장하지 않는 쪽**으로 되돌린 뒤 문제 큐에 남긴다.
  if (type === '염모제' && /펌|파마/.test(c.canonicalProductName ?? '')) {
    issues.push({
      type: 'TYPE_NAME_CONTRADICTION',
      detail: `카테고리 유형 '염모제' 와 상품명(펌/파마)이 어긋난다 — 판매 마디 '헤어컬러/펌' 병합`,
    });
    type = null;
    typeSource = null;
    missing.push('productType');
  }

  // 판매 마디가 여러 제형을 슬래시로 묶으면(`스킨/토너/패드`) census 는 대표 유형 하나만 붙인다.
  // 상품명이 **같은 마디 안의 다른 토큰**을 가리키면 그 쪽으로 좁힌다(규칙 T2 — 이름 뒤쪽 핵심어가 제형).
  // 마디 밖 유형으로는 바꾸지 않는다. 어긋나기만 하는 건은 유형을 유지하고 큐에만 남긴다.
  const inferredFromName = type ? inferTypeFromName(c.canonicalProductName) : null;
  if (inferredFromName && inferredFromName !== type && !type.includes(inferredFromName)) {
    const leaf = (c.category ?? '').split('|').pop().trim();
    const refined = NODE_TYPE_REFINEMENT[leaf]?.[inferredFromName] ?? null;
    if (refined && GENERIC_USAGE[refined]) {
      type = refined;
      typeSource = 'RETAIL_CATEGORY+NAME_KEYWORD';
    } else {
      issues.push({
        type: 'TYPE_NAME_MISMATCH',
        detail: `카테고리 유형 '${type}' 과 상품명 핵심어 '${inferredFromName}' 이 어긋난다 — census 유형을 유지했다`,
      });
    }
  }

  const isNonCosmetic = type ? NON_COSMETIC_TYPES.has(type) : false;
  const isAxisType = type ? AXIS_TYPES.has(type) : false;
  if (isNonCosmetic) {
    issues.push({ type: 'NON_COSMETIC_SUSPECT', detail: `유형 '${type}' 은 화장품 마디가 아니다 — 사람 확인 필요` });
  }
  if (isAxisType) {
    issues.push({ type: 'PRODUCT_TYPE_AXIS_NOT_FORM', detail: `유형 '${type}' 은 제형이 아니라 분류축이다(규칙 T3)` });
  }

  // ── 주요 특징 — 관측된 사실값만 ──────────────────────────────────────
  const features = [];
  const primary = c.sources[0] ?? {};
  const capacities = [...new Set(c.sources.map((s) => extractCapacity(s.rawProductName)).filter(Boolean))];
  if (capacities.length) {
    features.push({ text: `용량/구성: ${capacities.slice(0, 3).join(' · ')}`, evidence: 'RETAIL_LISTING' });
  }
  if (c.variants?.length) {
    features.push({ text: `색상/호수 선택: ${c.variants.join(', ')}`, evidence: 'RETAIL_LISTING' });
  }
  const sun = c.sources.map((s) => extractSunProtection(s.rawProductName)).find(Boolean);
  if (sun) features.push({ text: `자외선 차단 지수 표기: ${sun}`, evidence: 'RETAIL_LISTING' });
  if (fx?.status === 'RETAIL_FUNCTIONAL_MATCHED' && fx.functionalReports?.length) {
    const r = fx.functionalReports[0];
    features.push({
      text: `식약처 기능성화장품 보고 제품 (보고번호 ${r.reportNo} · 책임판매업자 ${r.companyName})`,
      evidence: 'MFDS_REPORT_OFFICIAL',
    });
  }
  // 판매 분류는 **특징이 아니라 분류값**이다. 이것만 있는 건을 COMPLETE 로 세면
  // 완성도 지표가 부풀려진다 → 별도 필드(`classification`)로 빼고 특징 수에 넣지 않는다.
  const classification = prettyCategory(c.category);
  if (!features.length) {
    missing.push('mainFeatures');
    issues.push({
      type: 'NO_OBSERVED_FEATURE',
      detail: '용량·색상·자외선 지수·기능성 어느 것도 판매 데이터에서 관측되지 않았다',
    });
  }

  // 정규화가 제품 정체성까지 깎아낸 경우다. 생산은 하되 사람 확인이 필요하다(WO §9).
  const nameLen = (c.canonicalProductName ?? '').replace(/\s+/g, '').length;
  if (nameLen <= 3) {
    issues.push({ type: 'NAME_TOO_SHORT', detail: `정규화 후 상품명 '${c.canonicalProductName}' 이 너무 짧다` });
  }
  if (type && (c.canonicalProductName ?? '').replace(/\s+/g, '') === type.replace(/\s+/g, '')) {
    issues.push({ type: 'NAME_EQUALS_TYPE', detail: `상품명이 유형명 '${type}' 과 같다 — 제품 특정 불가` });
  }

  // ── 사용방법 ────────────────────────────────────────────────────────
  const usage = type && !isNonCosmetic && !isAxisType ? GENERIC_USAGE[type] ?? null : null;
  if (!usage) {
    missing.push('usage');
    if (type && !isNonCosmetic && !isAxisType) {
      issues.push({ type: 'USAGE_NO_GENERIC_MAPPING', detail: `유형 '${type}' 의 일반 사용 안내가 없다` });
    }
  }

  // ── 한 줄 설명 ──────────────────────────────────────────────────────
  const brand = c.brandName ?? '';
  const oneLine = type
    ? `${brand} ${c.canonicalProductName} — ${type} 제품입니다.`.trim()
    : `${brand} ${c.canonicalProductName}`.trim();
  if (!c.brandName) missing.push('brandName');
  if (!c.canonicalProductName) missing.push('productName');

  const distribution = c.sources.map((s) => SOURCE_LABEL[s.source] ?? s.source);

  return {
    key: c.key,
    brandName: c.brandName,
    brandNameSource: c.brandName ? 'SOURCE_DATA' : null,
    productName: c.canonicalProductName,
    productType: type,
    productTypeSource: typeSource,
    oneLineDescription: oneLine,
    mainFeatures: features,
    classification,
    usage,
    usageSource: usage ? 'CATEGORY_GENERIC' : null,
    // 선택 항목(WO §4) — 근거가 확인되는 경우에만 채운다. 현재 모집단에는 성분·제형·주의사항 원천이 없다.
    productHighlights: [],
    mainIngredients: null,
    texture: null,
    useContext: null,
    cautions: null,
    variants: c.variants ?? [],
    functionalStatus: fx?.status ?? null,
    distributionSources: distribution,
    sourceUrls: c.sources.map((s) => s.sourceUrl).filter(Boolean),
    rawProductNames: c.sources.map((s) => s.rawProductName),
    missingRequired: missing,
    status: missing.length === 0 ? 'COMPLETE' : 'PARTIAL',
    issues,
  };
}
