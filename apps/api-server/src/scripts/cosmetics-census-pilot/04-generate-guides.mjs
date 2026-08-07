/**
 * WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0 — 단계 4: 최소 설명서 생성 (KO / EN)
 *
 * WO §6 필수 항목: 브랜드 / 상품명 / 제품 유형 / 한 줄 제품 설명 / 확인 가능한 주요 특징 / 사용방법
 * WO §7: 전성분에서 효능을 추론하지 않는다. 근거 출처를 항목마다 남긴다.
 * WO §8: 사실정보(제품명·성분·수치·사용방법·주의사항)를 임의로 추가하지 않는다.
 *
 * 그래서 이 생성기는 **가진 근거만으로 채우고, 없으면 비운다.**
 *   - 기능성(식약처 보고): 효능효과·용법용량 **공식 원문 그대로**. 소비자 브랜드는 원천에 없다.
 *   - 일반(소매/화해): 브랜드·상품명·유형·용량은 판매 데이터. 사용방법은 **유형별 일반 안내**만 사용하고
 *     제품 고유 사용법인 것처럼 쓰지 않는다(usageSource 로 구분).
 *   - 영어: **공식 영문명이 있을 때만** 생성한다. 한국어명을 임의로 영역하지 않는다.
 *
 * 산출: tmp/cosmetics-pilot/guide-pilot-ko.json, guide-pilot-en.json
 */
import { readOut, writeOut } from './lib.mjs';

/** 기능성 구분 — 공식 효능효과 원문에 실제로 등장하는 표현으로만 판정한다. */
const FUNCTIONAL_CLASSES = [
  [/자외선.*차단|자외선으로부터/, '자외선 차단'],
  [/미백/, '미백'],
  [/주름\s*개선/, '주름 개선'],
  [/탈모\s*증상/, '탈모 증상 완화'],
  [/여드름성\s*피부/, '여드름성 피부 완화'],
  [/아토피성\s*피부/, '아토피성 피부 보습'],
  [/튼살/, '튼살 완화'],
  [/염모|모발.*색상/, '염모'],
  [/제모/, '제모'],
  [/체취\s*방지/, '체취 방지'],
];

/**
 * 유형별 일반 사용 안내. 제품 고유 정보가 아니라 **해당 제형의 통상적 사용 순서**다.
 * 제품별 실제 사용법이 확보되면 이 값은 대체되어야 한다.
 */
const GENERIC_USAGE = {
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
  // 아래는 판매처 카테고리에서 파생된 유형에 대응하는 항목이다(파일럿 중 추가).
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
};

const TYPE_LABEL_EN = {
  토너: 'Toner', 토너패드: 'Toner Pad', 세럼: 'Serum', 앰플: 'Ampoule', 에센스: 'Essence',
  크림: 'Cream', 아이크림: 'Eye Cream', 핸드크림: 'Hand Cream', 로션: 'Lotion', 미스트: 'Mist',
  마스크: 'Sheet Mask', 팩: 'Mask Pack', 클렌징폼: 'Cleansing Foam', 클렌징오일: 'Cleansing Oil',
  클렌징워터: 'Cleansing Water', 클렌징밤: 'Cleansing Balm', 선케어: 'Sun Care', 샴푸: 'Shampoo',
  트리트먼트: 'Hair Treatment', 컨디셔너: 'Conditioner', 바디워시: 'Body Wash', 바디로션: 'Body Lotion',
  메이크업: 'Makeup', 립: 'Lip', 오일: 'Face Oil', 젤: 'Gel', 밤: 'Balm', 스틱: 'Stick',
  파우더: 'Powder', 비누: 'Soap', 패드: 'Pad', 올인원: 'All-in-One', 부스터: 'Booster',
  패치: 'Patch', 스크럽: 'Scrub', 향수: 'Fragrance', 헤어에센스: 'Hair Essence',
  헤어미스트: 'Hair Mist', 헤어케어: 'Hair Care', 두피케어: 'Scalp Care', 컨디셔너: 'Conditioner',
  바디오일: 'Body Oil', 바디미스트: 'Body Mist', 데오드란트: 'Deodorant', 핸드워시: 'Hand Wash',
  네일: 'Nail', 염모제: 'Hair Color',
};

const GENERIC_USAGE_EN = {
  토너: 'After cleansing, apply an appropriate amount with a cotton pad or your hands and smooth it over the skin.',
  세럼: 'After toner, apply an appropriate amount and spread evenly over the face.',
  앰플: 'After toner, apply an appropriate amount to areas that need extra care.',
  에센스: 'After toner, apply an appropriate amount and spread evenly over the face.',
  크림: 'As the last step of your skincare routine, apply an appropriate amount evenly over the face.',
  아이크림: 'After your skincare routine, gently pat an appropriate amount around the eye area.',
  핸드크림: 'Apply an appropriate amount and spread evenly over your hands.',
  로션: 'After toner, apply an appropriate amount and spread evenly over the face.',
  마스크: 'After cleansing and toning, place the sheet on the face, leave it on, then remove.',
  클렌징폼: 'Lather with water, massage over the face, then rinse thoroughly.',
  선케어: 'Before going outside, apply an appropriate amount evenly to the face and exposed areas.',
  샴푸: 'Wet the hair, lather an appropriate amount, massage the scalp and hair, then rinse thoroughly.',
  바디워시: 'Lather with water, cleanse the body, then rinse thoroughly.',
  바디로션: 'After showering, apply an appropriate amount evenly over the body.',
  토너패드: 'After cleansing, take a pad and gently sweep it along the skin.',
  패드: 'Take a pad and gently wipe the area you want to care for.',
  올인원: 'After cleansing, apply an appropriate amount evenly over the face.',
  부스터: 'After cleansing, apply an appropriate amount as the first step of your routine.',
  패치: 'After cleansing, attach to the desired area, leave it on, then remove.',
  스크럽: 'On damp skin, gently massage an appropriate amount, then rinse thoroughly.',
  메이크업: 'After your skincare routine, apply an appropriate amount evenly to the desired area.',
  립: 'Apply an appropriate amount evenly to the lips.',
  향수: 'Spray onto the desired area from a comfortable distance.',
  클렌징오일: 'On dry skin, massage an appropriate amount to melt makeup, then rinse thoroughly.',
  클렌징워터: 'Soak a cotton pad and gently wipe away makeup.',
  클렌징밤: 'On dry skin, massage an appropriate amount to melt makeup, then rinse thoroughly.',
  트리트먼트: 'After shampooing, remove excess water, apply evenly to the hair, leave on, then rinse.',
  컨디셔너: 'After shampooing, apply from mid-length to ends, then rinse thoroughly.',
  데오드란트: 'Apply an appropriate amount to clean, dry skin.',
  헤어에센스: 'On dried hair, apply an appropriate amount from mid-length to ends.',
  오일: 'Apply an appropriate amount and gently spread over the area you want to care for.',
  아이크림: 'After your skincare routine, gently pat an appropriate amount around the eye area.',
  미스트: 'Spray lightly onto the face from a comfortable distance whenever needed.',
  팩: 'After cleansing, spread evenly over the face, leave on, then rinse off.',
  비누: 'Lather with water, cleanse, then rinse thoroughly.',
};

const firstSentence = (t) =>
  (t ?? '').split(/\n/)[0].replace(/\s+/g, ' ').trim().slice(0, 200) || null;

function buildKo(unit, functionalSource) {
  const type = unit.productType;
  const highlights = [];
  const missing = [];

  if (functionalSource) {
    const eff = functionalSource.efficacy ?? '';
    const klass = FUNCTIONAL_CLASSES.filter(([re]) => re.test(eff)).map(([, l]) => l);
    if (klass.length) {
      highlights.push({ text: `기능성화장품 — ${klass.join(' · ')}`, evidence: 'MFDS_REPORT_EFFICACY' });
    }
    const oneLine = klass.length
      ? `식약처에 ${klass.join(' · ')} 기능성화장품으로 보고된 제품입니다.`
      : '식약처에 기능성화장품으로 보고된 제품입니다.';
    if (functionalSource.efficacy) {
      highlights.push({ text: firstSentence(functionalSource.efficacy), evidence: 'MFDS_REPORT_EFFICACY' });
    }
    if (!unit.brandName) missing.push('brandName');
    if (!type) missing.push('productType');
    // 보고 데이터에 용법이 비어 있으면 일반 제품과 동일하게 유형별 일반 안내로 채우되 출처를 구분한다.
    const fUsage = functionalSource.usage ?? (type ? GENERIC_USAGE[type] ?? null : null);
    if (!fUsage) missing.push('usage');
    return {
      brandName: unit.brandName,
      productName: unit.canonicalProductName,
      productType: type,
      oneLineDescription: oneLine,
      highlights,
      usage: fUsage,
      usageSource: functionalSource.usage ? 'MFDS_REPORT_OFFICIAL' : fUsage ? 'CATEGORY_GENERIC' : null,
      caution: functionalSource.caution ?? null,
      cautionSource: functionalSource.caution ? 'MFDS_REPORT_OFFICIAL' : null,
      missingRequired: missing,
    };
  }

  // 일반화장품 — 판매 데이터 기반
  const m = unit.members[0] ?? {};
  if (m.capacity) highlights.push({ text: `용량/구성: ${m.capacity}`, evidence: 'RETAIL_LISTING' });
  if (unit.variants.length) {
    highlights.push({ text: `색상/호수 선택: ${unit.variants.join(', ')}`, evidence: 'RETAIL_LISTING' });
  }
  for (const t of (m.reviewTopics ?? []).slice(0, 3)) {
    // 브랜드 주장 아님 — 화해에 누적된 사용자 리뷰에서 반복 확인되는 표현이다.
    highlights.push({ text: t, evidence: 'HWAHAE_REVIEW_TOPIC' });
  }
  const oneLine = type
    ? `${unit.brandName ?? ''} ${unit.canonicalProductName} — ${type} 제품입니다.`.trim()
    : `${unit.brandName ?? ''} ${unit.canonicalProductName}`.trim();
  if (!unit.brandName) missing.push('brandName');
  if (!type) missing.push('productType');
  const usage = type ? GENERIC_USAGE[type] ?? null : null;
  if (!usage) missing.push('usage');
  return {
    brandName: unit.brandName,
    productName: unit.canonicalProductName,
    productType: type,
    oneLineDescription: oneLine,
    highlights,
    usage,
    usageSource: usage ? 'CATEGORY_GENERIC' : null,
    caution: null,
    cautionSource: null,
    missingRequired: missing,
  };
}

function buildEn(unit, ko) {
  // WO §8: 공식 영문명이 없으면 만들지 않는다. 한국어 상품명을 임의 영역하지 않는다.
  if (!unit.englishProductName) return null;
  const typeEn = unit.productType ? TYPE_LABEL_EN[unit.productType] ?? null : null;
  const usageEn = unit.productType ? GENERIC_USAGE_EN[unit.productType] ?? null : null;
  const brandEn = unit.members.find((m) => m.englishBrandName)?.englishBrandName ?? null;
  return {
    brandName: brandEn ?? unit.brandName,
    productName: unit.englishProductName,
    productType: typeEn,
    oneLineDescription: typeEn
      ? `${brandEn ?? ''} ${unit.englishProductName} — a ${typeEn.toLowerCase()} product.`.trim()
      : unit.englishProductName,
    highlights: ko.highlights.filter((h) => h.evidence === 'RETAIL_LISTING' && /용량/.test(h.text)).length
      ? [{ text: `Size: ${unit.members[0]?.capacity}`, evidence: 'RETAIL_LISTING' }]
      : [],
    usage: usageEn,
    usageSource: usageEn ? 'CATEGORY_GENERIC' : null,
    missingRequired: [
      ...(brandEn ?? unit.brandName ? [] : ['brandName']),
      ...(typeEn ? [] : ['productType']),
      ...(usageEn ? [] : ['usage']),
    ],
  };
}

function main() {
  const { units } = readOut('normalized-products.json');
  const functional = new Map();
  for (const c of readOut('functional-candidates-500.json').candidates) {
    functional.set(c.sourceProductName, c.raw);
  }
  const generalRaw = new Map();
  for (const c of readOut('general-candidates-500.json').candidates) {
    generalRaw.set(c.sourceProductName, c);
  }

  /**
   * 식약처 보고 데이터에는 소비자 브랜드가 없다(실측: 기능성 단위 전건 브랜드 결측).
   * 다만 보고 품목명은 대개 브랜드로 시작하므로, **소매 데이터에서 실제로 관측된 브랜드명**에
   * 한해 접두 일치로만 회수한다. 추측으로 브랜드를 만들지 않는다.
   */
  const observedBrands = [
    ...new Set(
      [...generalRaw.values()].map((c) => c.brandName).filter(Boolean).map((b) => b.replace(/\s+/g, '')),
    ),
  ]
    .filter((b) => b.length >= 3)
    .sort((a, b) => b.length - a.length);
  const recoverBrand = (name) => {
    const n = (name ?? '').replace(/\s+/g, '');
    return observedBrands.find((b) => n.startsWith(b)) ?? null;
  };
  let brandRecovered = 0;

  const koGuides = [];
  const enGuides = [];
  const hard = [];

  for (const u of units) {
    // 원천 보강: 화해 리뷰 토픽 / OY 영문 브랜드는 후보 파일에만 있다.
    for (const m of u.members) {
      const src = generalRaw.get(m.sourceProductName);
      if (src) {
        m.reviewTopics = src.raw?.reviewTopics ?? [];
        m.englishBrandName = src.raw?.englishBrandName ?? null;
        if (!u.englishProductName && src.englishProductName) u.englishProductName = src.englishProductName;
      }
    }
    const fSrc = u.group === 'functional' ? functional.get(u.members[0]?.sourceProductName) ?? null : null;
    let brandSource = u.brandName ? 'SOURCE_DATA' : null;
    if (!u.brandName) {
      const rb = recoverBrand(u.canonicalProductName);
      if (rb) {
        u.brandName = rb;
        brandSource = 'RETAIL_BRAND_PREFIX_MATCH';
        brandRecovered++;
      }
    }
    const ko = buildKo(u, fSrc);
    const record = { unitKey: u.unitKey, group: u.group, ...ko, brandNameSource: brandSource };
    // WO §6 필수 6 항목이 모두 채워졌는지가 "생성 성공" 판정 기준이다.
    record.status = ko.missingRequired.length === 0 ? 'COMPLETE' : 'PARTIAL';
    koGuides.push(record);
    if (record.status === 'PARTIAL') {
      hard.push({ unitKey: u.unitKey, group: u.group, missing: ko.missingRequired, productName: ko.productName });
    }
    const en = buildEn(u, ko);
    if (en) {
      enGuides.push({
        unitKey: u.unitKey,
        group: u.group,
        ...en,
        status: en.missingRequired.length === 0 ? 'COMPLETE' : 'PARTIAL',
      });
    }
  }

  const tally = (arr) => arr.reduce((a, g) => ((a[g.status] = (a[g.status] ?? 0) + 1), a), {});
  const missTally = hard.reduce((a, h) => {
    for (const m of h.missing) a[m] = (a[m] ?? 0) + 1;
    return a;
  }, {});

  const meta = {
    wo: 'WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0',
    guideUnits: units.length,
    koGenerated: koGuides.length,
    koStatus: tally(koGuides),
    koMissingBreakdown: missTally,
    brandRecoveredByRetailPrefix: brandRecovered,
    enGenerated: enGuides.length,
    enStatus: tally(enGuides),
    enSkippedNoOfficialName: units.length - enGuides.length,
  };
  writeOut('guide-pilot-ko.json', { meta, guides: koGuides });
  writeOut('guide-pilot-en.json', { meta, guides: enGuides });
  process.stderr.write(JSON.stringify(meta, null, 2) + '\n');
}

main();
