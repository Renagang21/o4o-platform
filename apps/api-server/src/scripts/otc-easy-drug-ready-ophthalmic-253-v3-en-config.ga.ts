/**
 * WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-CONTENT-FP-V3-FINAL-READINESS-V1 — 26 content fp EN 저작 (에이전트 가)
 *
 * ophthalmic-unit-1 의 26개 content fingerprint 각각에 대한 **영문 저작 페이로드**.
 * grounding = 각 fp 대표 master 의 e약은요 공식 6섹션(효능·효과 / 용법·용량 / 경고 / 사용상 주의사항 /
 * 이상반응 / 상호작용). 공식 원문에 없는 의료 사실을 만들지 않는다(신규 사실 0). 공식 원문의 효능·용법·
 * 금기·주의·이상반응·상호작용을 소비자 영어로 충실히 옮기되, 방울 수·횟수·간격·기간·연령 등 수치는 보존한다.
 *
 * safety 맵은 **각 fp 의 present 안전 섹션과 1:1** 이어야 한다(renderEnV3 게이트가 강제):
 *   - 사용상 주의사항·이상반응 : 26개 fp 전부 present.
 *   - 경고     : b497101eb4bc556d (1개) 만 present.
 *   - 상호작용 : 9dba4a694da86090 · 6719ba1ecdd10aa9 · d274d7256f243712 · fb48c83e85ad84eb (4개) present.
 *
 * usageLabel 은 프로파일에서 주입하므로 여기 두지 않는다. title 은 KO(`점안액 (gencode)`) 대응 영문.
 * 경구 동사(take/swallow/orally/by mouth) 사용 금지 — 점안 경로. "먹었을 경우" 는 "accidentally ingested".
 */
import type { EnV3Payload } from './otc-easy-drug-ready-ophthalmic-253-v3-composer.ga.js';

// NOTE: 경구 동사 게이트가 \btake\b 를 차단하므로 "take care" 같은 관용구도 사용 금지 → "be careful" 로 대체.
const SUMMARY = (gencode: string, how: string): Record<string, string> => ({
  Category: 'OTC · Eye drops',
  'How it works': how,
  'Why this one': 'Products with the same general-name code share the same ingredient, strength and form. Check by ingredient and strength, not by brand name.',
  Ingredient: `General-name code ${gencode}`,
});

// 인공눈물 계열(눈의 건조·바람·태양) 공통 안전 문구 — fp 별 실제 원문에 맞춰 개별 채움.
export const EN_CONFIG: Record<string, EnV3Payload> = {
  // ── sz112 · 안구건조증 + 예방, 용법에 15분 간격 ──
  ef8402ed8ec4bc6b: {
    fp: 'ef8402ed8ec4bc6b',
    title: 'Eye drops (228633COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dry eye or by exposure to wind or sun, and for the prevention of eye irritation.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use. If used together with other eye drops, instil them at least 15 minutes apart to avoid a dilution effect.',
    summaryTable: SUMMARY('228633COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'For external use only. Do not reuse after a single use; always discard any remaining solution and the container. To avoid contamination, do not let the tip of the container touch any surface. Do not use if the solution has changed colour or become cloudy. Temporary blurred vision may occur, so be careful when driving or operating dangerous machinery until your vision clears.',
      이상반응: 'If you have eye pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  // ── sz32 · 알러지성 결막염, 성인 1방울 1일 2~4회, 5분/15분 렌즈 ──
  '286d1815a2bc15f0': {
    fp: '286d1815a2bc15f0',
    title: 'Eye drops (180147COS)',
    efficacy: 'For allergic conjunctivitis.',
    usage: 'Adults: instil 1 drop into the eye 2 to 4 times a day, or as appropriate to the condition. Infants and children: follow the doctor\'s prescription. Discard any remaining solution and the container immediately after use (single-use products only).',
    summaryTable: SUMMARY('180147COS', 'Relieves the symptoms of allergic conjunctivitis'),
    safety: {
      '사용상 주의사항': 'Do not use in people hypersensitive to this medicine or in children under 1 year of age. Before use, consult a doctor or pharmacist if you are receiving allergy treatment such as desensitisation therapy, have had allergic reactions to medicines, have eye pain with itching, are unsure whether the symptoms are allergic, or are pregnant or breastfeeding. If your vision becomes blurred after instilling, do not drive or operate machinery until it clears. Drowsiness or sedation may rarely occur, so be careful when driving or operating machinery. If there is no improvement after about 1 week of use, stop immediately and consult a doctor or pharmacist. Keep to the stated dosage. For ophthalmic use only. If the tip of the container touches the eyelid or eyelashes, the solution may become contaminated or cloudy, so be careful and do not use a cloudy solution. To prevent contamination, avoid sharing with others. If used with other eye drops, allow at least 5 minutes between them. Do not use while wearing soft contact lenses, and wait at least 15 minutes after use before putting the lenses back in.',
      이상반응: 'If you develop eye redness, irritation, persistent itching, eyelid inflammation, eyelid dermatitis or blurred vision, stop use immediately and consult a doctor or pharmacist. Temporary local irritation such as burning, redness, swelling or itching may occur.',
    },
  },
  // ── 인공눈물 g228651 계열 (표준 leaflet) ──
  ab1970701df3c680: {
    fp: 'ab1970701df3c680',
    title: 'Eye drops (228651COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228651COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have ever had an allergic reaction to eye drops (such as eye redness, itching, swelling, rash or reddening). For ophthalmic use only. Do not reuse after a single use; always discard any remaining solution and the container. To avoid contamination, do not let the tip of the container touch any surface. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Keep to the stated dosage. Do not use if the solution has changed colour or become cloudy. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled.',
      이상반응: 'If you develop itching, swelling, eye pain, changes in vision, or persistent eye redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  '46fbd4f65c479db0': {
    fp: '46fbd4f65c479db0',
    title: 'Eye drops (228648COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228648COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have experienced an allergic reaction to eye drops (eye redness, itching, swelling or reddening). Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, or if this medicine is accidentally ingested, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  '7ca0760c03dbca9d': {
    fp: '7ca0760c03dbca9d',
    title: 'Eye drops (228648COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228648COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have experienced an allergic reaction to eye drops (eye redness, itching, swelling or reddening). Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, or if this medicine is accidentally ingested, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  // ── 상호작용 present (1/4) ──
  '9dba4a694da86090': {
    fp: '9dba4a694da86090',
    title: 'Eye drops (228651COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228651COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have experienced an allergic reaction to eye drops (such as eye redness, itching, swelling or reddening). Keep to the stated dosage. For ophthalmic use only. To avoid contamination of the medicine and injury to the eye, do not let the tip of the container touch the eye or any surface. Do not use if the solution has changed colour or become cloudy. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, persistent redness or irritation, or if a hard contact lens wearer has increased discharge with rare lens clouding, stop use immediately and consult a doctor or pharmacist.',
      상호작용: 'If used together with other eye drops, allow at least a 15 minute interval before using this medicine.',
    },
  },
  // ── 눈의 피로/결막충혈 등 다증상 ──
  '09eeda83ab2b42b3': {
    fp: '09eeda83ab2b42b3',
    title: 'Eye drops (A52200COS)',
    efficacy: 'For tired eyes, conjunctival congestion, eye discomfort after swimming or when dust or sweat gets into the eyes, eye inflammation caused by ultraviolet or other light, sore eyelids, discomfort while wearing hard contact lenses, itchy eyes and dim or clouded eyes (for example when there is a lot of discharge).',
    usage: 'Instil 2 to 3 drops 5 to 6 times a day.',
    summaryTable: SUMMARY('A52200COS', 'Relieves eye fatigue, congestion and irritation'),
    safety: {
      '사용상 주의사항': 'Before use, consult a doctor or pharmacist if you are hypersensitive to eye drops, have had an allergic reaction to eye drops (such as eye redness, itching, swelling, rash or reddening), have glaucoma, or are hypersensitive to propylene glycol. Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them. To prevent contamination, avoid sharing with others. Do not use beyond the expiry date, and once opened use as soon as possible.',
      이상반응: 'If you develop eye redness, itching or swelling, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  // ── 상호작용 present (2/4) ──
  '6719ba1ecdd10aa9': {
    fp: '6719ba1ecdd10aa9',
    title: 'Eye drops (228648COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228648COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have ever had an allergic reaction to eye drops (eye redness, itching, swelling or reddening). Keep to the stated dosage. For ophthalmic use only. Do not reuse after a single use; always discard any remaining solution and the container. Do not let the tip of the container touch the eye or any surface. Do not use if the solution has changed colour or become cloudy. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. Because of its high viscosity, vision may be temporarily blurred.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, stop use immediately and consult a doctor or pharmacist.',
      상호작용: 'If used together with other eye drops, allow at least a 15 minute interval between them.',
    },
  },
  dbb5a148e9d0da1a: {
    fp: 'dbb5a148e9d0da1a',
    title: 'Eye drops (228648COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228648COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain, have had an allergic reaction (eye redness, itching, swelling or reddening), or are under a doctor\'s care. Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled, so be careful.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, or if this medicine is accidentally ingested, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  a694cf00621d64b7: {
    fp: 'a694cf00621d64b7',
    title: 'Eye drops (228648COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228648COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain, have experienced an allergic reaction to eye drops (for example eye redness, itching, swelling or reddening), or are under a doctor\'s care. Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled, so be careful.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, or if this medicine is accidentally ingested, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  af2a870f1fb0b0d8: {
    fp: 'af2a870f1fb0b0d8',
    title: 'Eye drops (228651COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228651COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain, have experienced an allergic reaction to eye drops (for example eye redness, itching, swelling or reddening), or are under a doctor\'s care. Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled, so be careful.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, or if this medicine is accidentally ingested, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  // ── 건조/하드렌즈, 1일 4~5회 ──
  '29f3432132be76aa': {
    fp: '29f3432132be76aa',
    title: 'Eye drops (216134COS)',
    efficacy: 'For dry eyes and for use when wearing hard contact lenses.',
    usage: 'Instil 1 to 2 drops 4 to 5 times a day. Increase or decrease as appropriate to the symptoms.',
    summaryTable: SUMMARY('216134COS', 'Lubricates dry eyes, including eyes wearing hard contact lenses'),
    safety: {
      '사용상 주의사항': 'Avoid wearing soft contact lenses during treatment. For ophthalmic use only. To prevent contamination, avoid sharing with others as far as possible.',
      이상반응: 'Very rarely, a hypersensitivity reaction may occur.',
    },
  },
  // ── 눈물/점액 부족 건조, 1일 수회 ──
  caf50c897dd15a11: {
    fp: 'caf50c897dd15a11',
    title: 'Eye drops (331800COS)',
    efficacy: 'For dry eye caused by insufficient tear secretion and insufficient mucin.',
    usage: 'Depending on the eye irritation symptoms, instil 1 to 2 drops several times a day.',
    summaryTable: SUMMARY('331800COS', 'Supplements moisture for dry eye from low tear and mucin secretion'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Contact lens wearers should remove their lenses before use and put them back in at least 30 minutes later. Use within 1 month of opening. For ophthalmic use only. Do not let the tip of the container touch the eyelid or eyelashes, and do not use a cloudy solution. Do not share with other people.',
      이상반응: 'If you develop pain, changes in vision, irritation or redness, or if dryness symptoms last more than 72 hours or worsen, stop use and consult a doctor or pharmacist. Discharge, tears or congestion may worsen the condition of the eye and lead to hypersensitivity to this medicine.',
    },
  },
  '47270aa7c15ad043': {
    fp: '47270aa7c15ad043',
    title: 'Eye drops (228651COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'Instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228651COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have experienced an allergic reaction to eye drops (eye redness, itching, swelling or reddening). Keep to the stated dosage. For ophthalmic use only. Do not reuse after a single use; always discard any remaining solution and the container. To avoid contamination of the medicine and injury to the eye, do not let the tip of the container touch the eye or any surface. Do not use if the solution has changed colour or become cloudy. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval between them. Because of its high viscosity, vision may be temporarily blurred.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, or if this medicine is accidentally ingested, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  '5543f595156851aa': {
    fp: '5543f595156851aa',
    title: 'Eye drops (228648COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228648COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have ever had an allergic reaction to eye drops (such as eye redness, itching, swelling, rash or reddening). For ophthalmic use only. Do not reuse after a single use; always discard any remaining solution and the container. To avoid contamination, do not let the tip of the container touch any surface. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Keep to the stated dosage. Do not use if the solution has changed colour or become cloudy. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled.',
      이상반응: 'If you develop itching, swelling, eye pain, changes in vision, or persistent eye redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  // ── 결막염/다래끼/안검염, 1~3방울 1일 3~6회 ──
  '6c0640ca18e5053d': {
    fp: '6c0640ca18e5053d',
    title: 'Eye drops (A75800COS)',
    efficacy: 'For conjunctivitis (epidemic keratoconjunctivitis), styes, blepharitis (sore eyelids) and itchy eyes.',
    usage: 'Instil 1 to 3 drops 3 to 6 times a day.',
    summaryTable: SUMMARY('A75800COS', 'For conjunctivitis, styes, blepharitis and eye itching'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine or have severe eye pain. Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them. To prevent contamination, avoid sharing with others as far as possible. If there is no improvement after 3 to 4 days of use, stop immediately and consult a doctor or pharmacist.',
      이상반응: 'If you develop eye redness, itching or swelling, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  // ── 안구건조증, 개봉 방식 안내 ──
  '80ff29f78c5c8c9a': {
    fp: '80ff29f78c5c8c9a',
    title: 'Eye drops (228633COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dry eye or by exposure to wind or sun, and for the prevention of irritation.',
    usage: 'When needed, put 1 to 2 drops into the affected eye. To open, bend the tip of the container fully back and forth and then pull it off.',
    summaryTable: SUMMARY('228633COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'If symptoms worsen or last more than 72 hours, stop use of this medicine immediately and consult a doctor. If this medicine is accidentally ingested, get help from a doctor or other professional immediately. To avoid contamination, do not let the tip of the container touch any surface. Also, do not use if it has changed colour or become cloudy. Do not reuse after a single use. Discard any remaining solution and the container after instillation.',
      이상반응: 'If you experience pain, changes in vision, or persistent redness or irritation, stop use of this medicine immediately and consult a doctor or pharmacist.',
    },
  },
  // ── 경고 present (유일) ──
  b497101eb4bc556d: {
    fp: 'b497101eb4bc556d',
    title: 'Eye drops (A25800COS)',
    efficacy: 'For the temporary relief of irritation and burning caused by dryness of the eye, and for the prevention of irritation.',
    usage: 'Whenever needed, instil 1 to 2 drops into the affected eye.',
    summaryTable: SUMMARY('A25800COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      경고: 'If you have eye pain, changes in eyesight, or persistent redness or irritation, stop use and consult a doctor.',
      '사용상 주의사항': 'Before use, pregnant or breastfeeding women and children aged 6 years or under should consult a doctor or pharmacist. To avoid contamination of this medicine, do not let the tip of the container touch any surface. Remove contact lenses before using this medicine. Do not use if this medicine has changed colour or become cloudy. Close the cap tightly after use.',
      이상반응: 'If you develop eye pain, changes in eyesight, or persistent redness or irritation, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  bfdd82670eb5efc3: {
    fp: 'bfdd82670eb5efc3',
    title: 'Eye drops (228648COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228648COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have experienced an allergic reaction to eye drops (eye redness, itching, swelling or reddening). Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, or if this medicine is accidentally ingested, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  // ── 상호작용 present (3/4) ──
  d274d7256f243712: {
    fp: 'd274d7256f243712',
    title: 'Eye drops (228651COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by wind or sun.',
    usage: 'When needed, put 1 to 2 drops into the affected eye.',
    summaryTable: SUMMARY('228651COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have experienced allergic symptoms to eye drops such as eye redness, itching, swelling or rash. Use this medicine for the eye only, that is, as an eye drop. If this medicine is accidentally ingested, get help from a doctor or other professional immediately. Do not reuse after a single use. Discard any remaining solution and the container after instillation. If symptoms worsen or last more than 72 hours, stop use of this medicine immediately and consult a doctor or pharmacist. To avoid contamination of the medicine and injury to the eye, do not let the tip of the container touch the eye or any surface. Do not use if the solution has changed colour or become cloudy. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; remove contact lenses before use and put them back in 15 minutes after instillation. Keep to the stated dosage.',
      이상반응: 'If you develop itching, swelling, eye pain, changes in vision, or persistent eye redness or irritation, stop use of this medicine immediately and consult a doctor or pharmacist. If a hard contact lens wearer has increased discharge with rare lens clouding, stop use immediately and consult a doctor or pharmacist. Because of its high viscosity, vision may be temporarily blurred when this medicine is put into the eye.',
      상호작용: 'If this medicine is used together with other eye drops, allow at least a 15 minute interval before using this medicine.',
    },
  },
  e85a9d4b46d958df: {
    fp: 'e85a9d4b46d958df',
    title: 'Eye drops (228651COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228651COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain, have had an allergic reaction (eye redness, itching, swelling or reddening), or are under a doctor\'s care. Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. If used with other eye drops, allow at least a 15 minute interval before using this medicine. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled, so be careful.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, or if this medicine is accidentally ingested, stop use immediately and consult a doctor or pharmacist.',
    },
  },
  // ── 상호작용 present (4/4) ──
  fb48c83e85ad84eb: {
    fp: 'fb48c83e85ad84eb',
    title: 'Eye drops (228651COS)',
    efficacy: 'For the temporary relief of burning, irritation and discomfort caused by dryness of the eye or by exposure to wind or sun.',
    usage: 'When needed, instil 1 to 2 drops into the affected eye, then discard any remaining solution and the container after use.',
    summaryTable: SUMMARY('228651COS', 'Lubricates the eye surface and relieves dryness-related irritation'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. Before use, consult a doctor or pharmacist if you have severe eye pain or have experienced allergic symptoms to eye drops (such as eye redness, itching, swelling or reddening). If this medicine is accidentally ingested, consult a doctor or pharmacist. Keep to the stated dosage. For ophthalmic use only. Do not reuse after a single use; always discard any remaining solution and the container. To avoid contamination of the medicine and injury to the eye, do not let the tip of the container touch the eye or any surface. Do not use if the solution has changed colour or become cloudy. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them; contact lenses should be removed before use and put back in 15 minutes after instillation. Because of its high viscosity, vision may be temporarily blurred when this medicine is instilled.',
      이상반응: 'If you develop itching, swelling, pain, changes in vision, or persistent redness or irritation, or if symptoms worsen or last more than 72 hours, or if a hard contact lens wearer has increased discharge with rare lens clouding, stop use immediately and consult a doctor or pharmacist.',
      상호작용: 'If used together with other eye drops, allow at least a 15 minute interval before using this medicine.',
    },
  },
  // ── 알러지성 결막염 (94ccadff/58a15dc5 · discard 절 없음) ──
  '94ccadff122bbcab': {
    fp: '94ccadff122bbcab',
    title: 'Eye drops (180137COS)',
    efficacy: 'For allergic conjunctivitis.',
    usage: 'Adults: instil 1 drop into the eye 2 to 4 times a day, or as appropriate to the condition. Infants and children: follow the doctor\'s prescription.',
    summaryTable: SUMMARY('180137COS', 'Relieves the symptoms of allergic conjunctivitis'),
    safety: {
      '사용상 주의사항': 'Do not use in people hypersensitive to this medicine or in children under 1 year of age. Before use, consult a doctor or pharmacist if you are receiving allergy treatment (such as desensitisation therapy), have experienced allergic symptoms to medicines, have eye pain with itching, are unsure whether the symptoms are allergic, or are pregnant or breastfeeding. If your vision becomes blurred after instilling, do not drive or operate machinery until it clears. Drowsiness or sedation may rarely occur, so be careful when driving or operating machinery. If there is no improvement after about 1 week of use, stop immediately and consult a doctor or pharmacist. Keep to the stated dosage. For ophthalmic use only. If the tip of the container touches the eyelid or eyelashes, the solution may become contaminated or cloudy, so be careful not to let it touch the eye directly; also, do not use a cloudy solution. To prevent contamination, avoid sharing with others. If used with other eye drops, allow at least 5 minutes between them. Do not use while wearing soft contact lenses, and wait at least 15 minutes after use before putting the lenses back in.',
      이상반응: 'If you develop eye redness, irritation, persistent itching, eyelid inflammation, eyelid dermatitis or blurred vision, stop use immediately and consult a doctor or pharmacist. Temporary local irritation such as burning, redness, swelling or itching may occur.',
    },
  },
  // ── 눈물/점액 부족 (일회용, 즉시 폐기) ──
  dc87ca1dbe081aa2: {
    fp: 'dc87ca1dbe081aa2',
    title: 'Eye drops (331800COS)',
    efficacy: 'For dry eye caused by insufficient tear secretion and insufficient mucin.',
    usage: 'Depending on the eye irritation symptoms, instil 1 to 2 drops into the eye several times a day. Discard any remaining solution and the container immediately after use.',
    summaryTable: SUMMARY('331800COS', 'Supplements moisture for dry eye from low tear and mucin secretion'),
    safety: {
      '사용상 주의사항': 'Do not use if you are hypersensitive to this medicine. For ophthalmic use (instillation into the eye) only. To prevent contamination, avoid sharing with others as far as possible. After opening, use only once immediately and discard any remaining solution and the container right away (single-use only).',
      이상반응: 'If you develop pain, changes in vision, irritation or redness, or if dryness symptoms last more than 72 hours or worsen, stop use immediately and consult a doctor or pharmacist. Discharge, tears or congestion may worsen the condition of the eye and lead to hypersensitivity to this medicine.',
    },
  },
  '58a15dc514769a8a': {
    fp: '58a15dc514769a8a',
    title: 'Eye drops (180138COS)',
    efficacy: 'For allergic conjunctivitis.',
    usage: 'Adults: instil 1 drop into the eye 2 to 4 times a day, or as appropriate to the condition. Infants and children: follow the doctor\'s prescription.',
    summaryTable: SUMMARY('180138COS', 'Relieves the symptoms of allergic conjunctivitis'),
    safety: {
      '사용상 주의사항': 'Do not use in people hypersensitive to this medicine or in children under 1 year of age. Before use, consult a doctor or pharmacist if you are receiving allergy treatment (such as desensitisation therapy), have experienced allergic symptoms to medicines, have eye pain with itching, are unsure whether the symptoms are allergic, or are pregnant or breastfeeding. If your vision becomes blurred after instilling, do not drive or operate machinery until it clears. Drowsiness or sedation may rarely occur, so be careful when driving or operating machinery. If there is no improvement after about 1 week of use, stop immediately and consult a doctor or pharmacist. Keep to the stated dosage. For ophthalmic use only. If the tip of the container touches the eyelid or eyelashes, the solution may become contaminated or cloudy, so be careful not to let it touch the eye directly; also, do not use a cloudy solution. To prevent contamination, avoid sharing with others. If used with other eye drops, allow at least 5 minutes between them. Do not use while wearing soft contact lenses, and wait at least 15 minutes after use before putting the lenses back in.',
      이상반응: 'If you develop eye redness, irritation, persistent itching, eyelid inflammation, eyelid dermatitis or blurred vision, stop use immediately and consult a doctor or pharmacist. Temporary local irritation such as burning, redness, swelling or itching may occur.',
    },
  },
  // ── 다증상 (76e2996f · 1~3방울 1일 3~6회) ──
  '76e2996f2a1ecd8a': {
    fp: '76e2996f2a1ecd8a',
    title: 'Eye drops (A34700COS)',
    efficacy: 'For tired eyes, conjunctival congestion, eye discomfort after swimming or when dust or sweat gets into the eyes, eye inflammation caused by ultraviolet or other light, sore eyelids, discomfort while wearing hard contact lenses, itchy eyes and dim or clouded eyes (for example when there is a lot of discharge).',
    usage: 'Instil 1 to 3 drops 3 to 6 times a day.',
    summaryTable: SUMMARY('A34700COS', 'Relieves eye fatigue, congestion and irritation'),
    safety: {
      '사용상 주의사항': 'Before use, consult a doctor or pharmacist if you are hypersensitive to eye drops, have glaucoma, or have severe eye pain. Keep to the stated dosage. For ophthalmic use only. Do not use as a wetting solution for soft contact lenses, and do not use while wearing them. To prevent contamination, avoid sharing with others as far as possible. If there is no improvement after several days of use, stop immediately and consult a doctor or pharmacist.',
      이상반응: 'If you develop eye redness, itching or swelling, stop use immediately and consult a doctor or pharmacist.',
    },
  },
};
