/**
 * WO-...-BATCH-01-HOLD-4209-REPRODUCTION-V1 / 프레임 번역 엔진.
 *
 * 4,209건의 미커버 문구는 대부분 **같은 문형의 어미 변형 + 슬롯 치환**이다.
 *   `{질환}이 있는 경우 섭취 전 전문가와 상담할 것`
 *   `{증상} 등의 이상사례 발생 시 섭취를 중단하고 전문가와 상담하시기 바랍니다.`
 * 프레임 + 슬롯 사전으로 확정하며, 슬롯 값이 사전에 없으면 번역하지 않는다(HOLD).
 * 조건·부정·금기의 강도와 질환명·증상명은 영어에서도 약화하지 않는다.
 */

// ── 슬롯 사전 ──────────────────────────────────────────────────────────────
export const TERM = {
  // 질환·상태
  '당뇨병': 'diabetes', '당뇨': 'diabetes', '신장질환': 'kidney disease', '간질환': 'liver disease',
  '심장질환': 'heart disease', '고혈압': 'high blood pressure', '저혈압': 'low blood pressure',
  '고칼슘혈증': 'hypercalcaemia', '갑상선질환': 'thyroid disease', '갑상선 질환': 'thyroid disease',
  '출혈성 질환': 'a bleeding disorder', '위장질환': 'gastrointestinal disease', '신장 질환': 'kidney disease',
  '간 질환': 'liver disease', '심혈관질환': 'cardiovascular disease', '천식': 'asthma',
  '알레르기': 'allergies', '특이체질': 'an idiosyncratic constitution', '알레르기 체질': 'an allergic constitution',
  '알레르기체질': 'an allergic constitution', '특정질환': 'certain medical conditions',
  '담석': 'gallstones', '담관에 이상': 'a bile duct abnormality', '통풍': 'gout',
  '페닐케톤뇨증': 'phenylketonuria', '위산과다': 'excess stomach acid', '역류성 식도염': 'reflux oesophagitis',
  '유방암': 'breast cancer', '자궁내막증': 'endometriosis', '자가면역질환': 'an autoimmune disease',
  // 증상
  '손발 따끔거림, 작열감 또는 저림': 'tingling, burning or numbness in the hands and feet',
  '설사, 위통, 복부팽만': 'diarrhoea, stomach pain or abdominal bloating',
  '메스꺼움': 'nausea', '설사': 'diarrhoea', '구토': 'vomiting', '복통': 'abdominal pain',
  '위장장애': 'gastrointestinal upset', '소화불량': 'indigestion', '변비': 'constipation',
  '가스참, 트림, 복통, 복부팽만감': 'gas, belching, abdominal pain or bloating',
  '초조감, 불면': 'restlessness or insomnia', '두통': 'headache', '어지러움': 'dizziness',
  '발진': 'rash', '가려움': 'itching', '부종': 'swelling',
  // 대상
  '임산부': 'pregnant women', '수유부': 'breastfeeding women', '어린이': 'children',
  '영·유아': 'infants', '영유아': 'infants', '고령자': 'older adults', '노약자': 'frail people',
  '임산부 및 수유부': 'pregnant and breastfeeding women',
  '임산부, 수유부': 'pregnant and breastfeeding women',
  '어린이, 임산부 및 수유부': 'children, pregnant women and breastfeeding women',
  '임산부, 수유부, 어린이 및 수술전후 환자': 'pregnant women, breastfeeding women, children and patients before or after surgery',
  '수술전후 환자': 'patients before or after surgery', '수술 전후 환자': 'patients before or after surgery',
  '흡연자': 'smokers', '성인남성': 'adult men', '남성': 'men', '여성': 'women',
  '에스트로겐 호르몬에 민감한 사람': 'people sensitive to oestrogen',
  // 약물
  '항응고제': 'anticoagulants', '항혈소판제': 'antiplatelet agents', '혈압강하제': 'antihypertensives',
  '혈액항응고제': 'blood anticoagulants', '당뇨치료제': 'diabetes treatments',
  '면역억제제': 'immunosuppressants', '호르몬제': 'hormone preparations', '갑상선호르몬제': 'thyroid hormone preparations',
  '의약품': 'medication', '아스피린': 'aspirin',
  '항응고제, 항혈소판제, 혈압강하제 등': 'anticoagulants, antiplatelet agents or antihypertensives',
  '당뇨치료제, 혈액항응고제': 'diabetes treatments or blood anticoagulants',
  '당뇨치료제 및 혈액항응고제': 'diabetes treatments or blood anticoagulants',
  // 원료(알레르기 문맥)
  '프로폴리스': 'propolis', '대두': 'soy', '우유': 'milk', '땅콩': 'peanuts', '갑각류': 'crustaceans',
  '게 또는 새우': 'crab or shrimp', '카페인': 'caffeine', '특정 단백질': 'particular proteins',
  '특정 원료 성분': 'particular ingredients', '크레아틴': 'creatine',
};

// ── 프레임 ────────────────────────────────────────────────────────────────
// 키는 어미 정규화(`할것`)된 형태로 매칭한다.
export const FRAMES = [
  // 질환/상태 조건
  { re: /^(.+?)(?:이|가)있는경우섭취전전문가와상담할것$/, en: (x) => `If you have ${x}, consult a professional before taking this product` },
  { re: /^(.+?)(?:이|가)있는경우전문가와상담할것$/, en: (x) => `If you have ${x}, consult a professional` },
  { re: /^(.+?)(?:이|가)있거나의약품복용시전문가와상담할것$/, en: (x) => `If you have ${x} or are taking medication, consult a professional` },
  { re: /^(.+?)(?:이|가)있는분은의사와상의하신후섭취할것$/, en: (x) => `If you have ${x}, consult a doctor before taking this product` },
  // 이상사례
  { re: /^(.+?)등의이상사례발생시섭취를중단하고전문가와상담할것$/, en: (x) => `If adverse reactions such as ${x} occur, stop taking the product and consult a professional` },
  { re: /^이상사례발생시섭취를중단하고전문가와상담할것$/, en: () => 'If an adverse reaction occurs, stop taking the product and consult a professional' },
  { re: /^(.+?)등의?위장관계장애가나타나는경우에는섭취에주의$/, en: (x) => `Take care if gastrointestinal disturbances such as ${x} occur` },
  { re: /^(.+?)(?:이|가)나타나는경우에는섭취중단$/, en: (x) => `Stop taking the product if ${x} occurs` },
  { re: /^알레르기반응이나타나는경우에는섭취중단$/, en: () => 'Stop taking the product if an allergic reaction occurs' },
  // 대상 주의/금지
  { re: /^(.+?)는섭취에주의(?:할것)?$/, en: (x) => `${cap(x)} should take care` },
  { re: /^(.+?)은섭취에주의(?:할것)?$/, en: (x) => `${cap(x)} should take care` },
  { re: /^(.+?)는섭취를피할것$/, en: (x) => `${cap(x)} should avoid taking this product` },
  { re: /^(.+?)는섭취를금할것$/, en: (x) => `${cap(x)} must not take this product` },
  { re: /^(.+?)만섭취할것$/, en: (x) => `Only ${x} should take this product` },
  { re: /^(.+?)의경우과다섭취를피할것$/, en: (x) => `${cap(x)} should avoid excessive intake` },
  // 약물 복용
  { re: /^의약품\((.+?)등?\)복용시전문가와상담할것$/, en: (x) => `If you are taking medicines such as ${x}, consult a professional` },
  { re: /^의약품\((.+?)등?\)복용시섭취에주의$/, en: (x) => `Take care if you are taking medicines such as ${x}` },
  { re: /^(.+?)복용시전문가와상담할것$/, en: (x) => `If you are taking ${x}, consult a professional` },
  { re: /^(.+?)복용시섭취에주의(?:할것)?$/, en: (x) => `Take care if you are taking ${x}` },
  { re: /^(.+?)등복용시전문가와상담할것$/, en: (x) => `If you are taking ${x} or similar medicines, consult a professional` },
  // 알레르기
  { re: /^(.+?)에알레르기를나타내는사람은섭취에주의$/, en: (x) => `People allergic to ${x} should take care` },
  { re: /^(.+?)에알레르기가있는사람은섭취에주의$/, en: (x) => `People allergic to ${x} should take care` },
  { re: /^(.+?)에알레르기체질은원료성분을확인후섭취할것$/, en: (x) => `People with an allergy to ${x} should check the ingredients before taking this product` },
  // 함유 성분 고지
  { re: /^(.+?)을함유한식품의섭취에주의할것$/, en: (x) => `Take care with foods containing ${x}` },
  { re: /^(.+?)(?:이|가)함유되어있어(.+?)등을나타낼수있음$/, en: (x, y) => `Contains ${x}, which may cause ${y}` },
  // 과량
  { re: /^과량섭취하지않도록주의할것$/, en: () => 'Take care not to consume an excessive amount' },
  { re: /^(.+?)(?:은|는)?과다섭취시일시적으로피부가황색으로변할수있음$/, en: () => 'Excessive intake may temporarily turn the skin yellow' },
  { re: /^과다섭취시일시적으로피부가황색으로변할수있음$/, en: () => 'Excessive intake may temporarily turn the skin yellow' },
  // 섭취 시점·방법
  { re: /^식사후섭취할것$/, en: () => 'Take after a meal' },
  { re: /^반드시충분한물과함께섭취할것$/, en: () => 'Always take with plenty of water' },
  { re: /^반드시충분한물과함께섭취할것\(액상제외\)$/, en: () => 'Always take with plenty of water (except liquid forms)' },
  { re: /^물과함께섭취할것$/, en: () => 'Take with water' },
  { re: /^섭취시목에걸릴수있으므로반드시물과함께섭취할것$/, en: () => 'May cause choking, so always take with water' },
  { re: /^섭취시목에걸리거나불편할수있으므로반드시물과함께섭취할것$/, en: () => 'May cause choking or discomfort, so always take with water' },
  { re: /^어린이의경우섭취시목에걸릴우려가있으니보호자의지도하에섭취할것$/, en: () => 'Children may choke, so they should take this product under the supervision of a guardian' },
  { re: /^(.+?)등소화계통의불편함과설사를유발할수있으니식사후섭취할것$/, en: (x) => `May cause digestive discomfort such as ${x} and diarrhoea, so take after a meal` },
  // 기한·품질
  { re: /^(소비기한|유통기한)을확인할것이며섭취량및섭취방법을준수할것$/, en: (x) => `Check the ${x === '소비기한' ? 'use-by date' : 'best-before date'} and follow the stated intake amount and directions` },
  { re: /^섭취전에(소비기한|유통기한)을확인후섭취할것또한\1(?:이)?경과한제품은섭취하지말것$/,
    en: (x) => `Check the ${x === '소비기한' ? 'use-by date' : 'best-before date'} before taking this product, and do not take it after that date` },
  { re: /^(소비기한|유통기한)(?:이)?경과된제품은섭취하지말것$/, en: (x) => `Do not take this product after the ${x === '소비기한' ? 'use-by date' : 'best-before date'}` },
  { re: /^섭취전제품에이상이있는경우섭취를금할것$/, en: () => 'Do not take this product if there is anything wrong with it' },
  { re: /^섭취전제품에이상이있는경우섭취하지말것$/, en: () => 'Do not take this product if there is anything wrong with it' },
  { re: /^제품개봉또는섭취시포장재에의해상처를입을수있으니주의할것$/, en: () => 'Take care not to injure yourself on the packaging when opening or taking this product' },
  { re: /^제품개봉또는섭취시포장재에의해다칠우려가있으니주의할것$/, en: () => 'Take care not to injure yourself on the packaging when opening or taking this product' },
  { re: /^개봉또는섭취시포장재에의해상처를입을수있으니주의할것$/, en: () => 'Take care not to injure yourself on the packaging when opening or taking this product' },
  // 기타 정형
  { re: /^개인의신체상태에따라이상증상이생길경우섭취를중단할것$/, en: () => 'If you develop unusual symptoms depending on your physical condition, stop taking the product' },
  { re: /^개인에따라피부관련이상반응이발생할수있음$/, en: () => 'Skin-related adverse reactions may occur in some people' },
  { re: /^어린이가함부로섭취하지않도록일일섭취량방법을지도할것$/, en: () => 'Instruct children on the daily intake so that they do not take the product unsupervised' },
  { re: /^섭취량및섭취방법을확인후섭취할것$/, en: () => 'Check the stated intake amount and directions before taking this product' },
  { re: /^(?:제안된섭취량|일일섭취량)이상(?:으로)?섭취시(.+?)등이있을수있음$/, en: (x) => `Taking more than the stated amount may cause ${x}` },
  { re: /^(?:제안된섭취량|일일섭취량)이상(?:으로)?섭취시(.+?)(?:이|가)발생할수있음$/, en: (x) => `Taking more than the stated amount may cause ${x}` },
  { re: /^섭취시(.+?)등이발생할수있음$/, en: (x) => `Taking this product may cause ${x}` },
];
const cap = (s) => s.replace(/^./, (x) => x.toUpperCase());

/** 슬롯 값을 사전으로 번역. 미등록이면 null. */
export function term(koDense) {
  if (TERM[koDense]) return TERM[koDense];
  for (const [k, v] of Object.entries(TERM)) if (k.replace(/\s/g, '') === koDense) return v;
  // `A, B 및 C` / `A·B` 나열
  const parts = koDense.split(/[·,]/).filter(Boolean);
  if (parts.length > 1) {
    const en = [];
    for (const p of parts) {
      const t = term(p.replace(/^및/, ''));
      if (!t) return null;
      en.push(t);
    }
    return en.length === 2 ? `${en[0]} or ${en[1]}` : `${en.slice(0, -1).join(', ')} or ${en[en.length - 1]}`;
  }
  return null;
}

/** 프레임 적용. 모든 슬롯이 사전에 있어야 성공. */
export function applyFrames(normalizedKey) {
  for (const f of FRAMES) {
    const m = normalizedKey.match(f.re);
    if (!m) continue;
    const slots = m.slice(1).filter((x) => x !== undefined);
    if (!slots.length) return f.en();
    const en = [];
    for (const s of slots) {
      if (/^(소비기한|유통기한)$/.test(s)) { en.push(s); continue; }
      const t = term(s);
      if (!t) return null;
      en.push(t);
    }
    return f.en(...en);
  }
  return null;
}
