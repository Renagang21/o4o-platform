/**
 * WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §5 / §6
 *
 * HFF KO canonical → 일본어(ja) **직접** 번역 엔진.
 *   - KO canonical 이 유일한 기준본이다. EN·ZH canonical 은 참조하지 않는다(§1·§6 금지).
 *   - 외부 번역 API 없음 → **승인 사전 + 결정적 조합 규칙**으로 생산한다(ZH 트랙과 같은 계약).
 *   - 슬롯 정의(JA_SLOTS)·키 정규화(key)는 HFF 트랙 공통이며 구조(태그·class·순서)는 손대지 않는다.
 *   - 수치·단위·원료 귀속은 조합 규칙이 만들어내지 않는다. 원문 토큰을 그대로 옮긴다(§6).
 *
 * 일본어가 중국어와 다른 점(설계 근거):
 *   ① 섭취 빈도는 한국어와 같은 숫자 표기를 그대로 쓴다(`1일 3회` → `1日3回`). `每` 같은
 *      어순 변환이 없으므로 수치 대조축이 원문과 1:1로 맞는다.
 *   ② 동그라미 숫자(①②)·괄호 숫자는 일본어 표기에서도 그대로 쓰인다 → 기호 변환을 하지 않는다.
 *   ③ 한자를 정상적으로 쓰므로 "한자 있음"으로 오염을 볼 수 없다. 간체자 전용 글자로만 판정한다.
 */
import fs from 'node:fs';
import { norm, key } from './hff-en-batch-01-translate.mjs';
import { JA_SLOTS, HANGUL, SIMPLIFIED_ONLY } from './hff-ja-b01-slots.mjs';

export { norm, key, JA_SLOTS, HANGUL, SIMPLIFIED_ONLY };
const D = 'apps/api-server/src/scripts/data';

/* ── 1. 프레임 사전 (섹션 제목 · 푸터 · 공통 라벨) ────────────── */
const HEADING = {
  '주요 기능성': '主な機能性',
  '섭취량 및 섭취방법 (공식 표기 그대로)': '摂取量および摂取方法（公式表記のまま）',
  '확인 가능한 기준·규격 정보': '確認できる基準・規格情報',
  '매장 전문가 문의 안내': '店舗の専門家への相談案内',
  '섭취 시 참고사항': '摂取時の参考事項',
  '표시 기준': '表示基準',
  '왜 이 제품인가': 'なぜこの製品なのか',
  '섭취방법 (공식 표기 그대로)': '摂取方法（公式表記のまま）',
  '원료별 공식 인정 기능성': '原料別の公式認定機能性',
  '공식 인정 기능성': '公式認定機能性',
  '제품 정보': '製品情報',
  '보관 방법': '保管方法',
  '주의사항': '注意事項',
  '한눈에 보기': 'ひと目でわかる情報',
};

/* ── 2. 원료·영양성분 용어집 ─────────────────────────────────── */
export const ING = {
  '건강기능식품': '健康機能食品',
  '비타민 A': 'ビタミンA', '비타민 B1': 'ビタミンB1', '비타민 B2': 'ビタミンB2', '비타민 B6': 'ビタミンB6',
  '비타민 B12': 'ビタミンB12', '비타민 C': 'ビタミンC', '비타민 D': 'ビタミンD', '비타민 E': 'ビタミンE',
  '비타민 K': 'ビタミンK', '비타민 K1': 'ビタミンK1', '비타민 K2': 'ビタミンK2', '비타민 D3': 'ビタミンD3',
  '비타민 B3': 'ビタミンB3', '비타민 B5': 'ビタミンB5', '비타민 B7': 'ビタミンB7', '비타민 B9': 'ビタミンB9',
  '비타민': 'ビタミン',
  '나이아신': 'ナイアシン', '판토텐산': 'パントテン酸', '엽산': '葉酸', '비오틴': 'ビオチン',
  '아연': '亜鉛', '철': '鉄', '철분': '鉄', '칼슘': 'カルシウム', '마그네슘': 'マグネシウム', '망간': 'マンガン',
  '구리': '銅', '셀레늄': 'セレン', '셀렌': 'セレン', '크롬': 'クロム', '요오드': 'ヨウ素', '몰리브덴': 'モリブデン',
  '칼륨': 'カリウム', '인': 'リン', '나트륨': 'ナトリウム',
  '단백질': 'たんぱく質', '식이섬유': '食物繊維', '아미노산': 'アミノ酸',
  '오메가3': 'オメガ3', '오메가-3': 'オメガ3', 'EPA': 'EPA', 'DHA': 'DHA',
  'EPA와 DHA의 합': 'EPAとDHAの合計', 'EPA 및 DHA': 'EPAおよびDHA',
  '루테인': 'ルテイン', '지아잔틴': 'ゼアキサンチン', '아스타잔틴': 'アスタキサンチン',
  '프로바이오틱스': 'プロバイオティクス', '유산균': '乳酸菌', '프리바이오틱스': 'プレバイオティクス',
  'MSM': 'MSM', 'MSM(엠에스엠·디메틸설폰)': 'MSM（メチルスルフォニルメタン・ジメチルスルホン）',
  '엠에스엠': 'メチルスルフォニルメタン', '디메틸설폰': 'ジメチルスルホン',
  '콜라겐': 'コラーゲン', '콜라겐펩타이드': 'コラーゲンペプチド', '저분자콜라겐펩타이드': '低分子コラーゲンペプチド',
  '히알루론산': 'ヒアルロン酸', '코엔자임Q10': 'コエンザイムQ10', '코엔자임 Q10': 'コエンザイムQ10',
  '가르시니아캄보지아 추출물': 'ガルシニアカンボジア抽出物', '가르시니아캄보지아추출물': 'ガルシニアカンボジア抽出物',
  '차전자피': 'オオバコ種皮', '차전자피식이섬유': 'オオバコ種皮食物繊維', '차전자피 식이섬유': 'オオバコ種皮食物繊維',
  '뮤코다당·단백': 'ムコ多糖・タンパク', '뮤코다당·단백(콘드로이친)': 'ムコ多糖・タンパク（コンドロイチン）',
  '콘드로이친': 'コンドロイチン', '글루코사민': 'グルコサミン',
  '은행잎추출물': 'イチョウ葉抽出物', '포스파티딜세린': 'ホスファチジルセリン',
  '헤마토코쿠스추출물': 'ヘマトコッカス抽出物', '헤마토코쿠스추출물(아스타잔틴)': 'ヘマトコッカス抽出物（アスタキサンチン）',
  '바나바잎추출물': 'バナバ葉抽出物', '홍삼': '紅参', '인삼': '高麗人参', '홍삼농축액': '紅参濃縮液',
  '밀크씨슬': 'ミルクシスル', '밀크씨슬 추출물': 'ミルクシスル抽出物', '밀크씨슬추출물': 'ミルクシスル抽出物',
  '쏘팔메토열매추출물': 'ノコギリヤシ果実抽出物', '감마리놀렌산': 'γ-リノレン酸',
  '알로에겔': 'アロエゲル', '스피루리나': 'スピルリナ', '클로렐라': 'クロレラ',
  '녹차추출물': '緑茶抽出物', '카테킨': 'カテキン', '대두이소플라본': '大豆イソフラボン',
  '가르시니아': 'ガルシニア', '난소화성말토덱스트린': '難消化性デキストリン',
  '프락토올리고당': 'フラクトオリゴ糖', '이눌린': 'イヌリン', '루테인지아잔틴복합추출물': 'ルテイン・ゼアキサンチン複合抽出物',
  '옥타코사놀': 'オクタコサノール', '레시틴': 'レシチン', '스쿠알렌': 'スクワレン', '베타카로틴': 'β-カロテン',
  '엽록소함유식물': 'クロロフィル含有植物', '키토산': 'キトサン', '키토올리고당': 'キトオリゴ糖',
  '프로폴리스추출물': 'プロポリス抽出物', '로얄젤리': 'ローヤルゼリー', '테아닌': 'テアニン', 'L-테아닌': 'L-テアニン',
  '아르기닌': 'アルギニン', '타우린': 'タウリン', '글루타치온': 'グルタチオン',
  '유산균증식물질': '乳酸菌増殖物質', '효모': '酵母', '효소': '酵素',
  '단백질보충용': 'たんぱく質補給用', '초유': '初乳',
  '가르시니아캄보지아': 'ガルシニアカンボジア', '녹차': '緑茶',
};

/* ── 3. 조각 사전 (조합 규칙이 쓰는 최소 단위) ───────────────── */
const FRAG = {
  '물과 함께': '水とともに摂取',
  '충분한 물과 함께': '十分な水とともに摂取',
  '충분한 물과 함께 섭취': '十分な水とともに摂取',
  '씹어 섭취': '噛んで摂取',
  '식후 섭취': '食後に摂取',
  '식전 섭취': '食前に摂取',
  '식사와 함께': '食事とともに',
  '제품 표시사항 참고': '製品の表示事項を参照',
  '제품 표시사항을 함께 확인하십시오': '製品の表示事項もあわせてご確認ください',
  '섭취 전 제품 표시사항을 확인': '摂取前に製品の表示事項を確認',
  '자세한 주의사항은 제품 표시사항을 확인하십시오': '詳しい注意事項は製品の表示事項をご確認ください',
  '섭취 시 주의사항': '摂取時の注意事項',
  '임산부·수유부는 섭취 전 전문가와 상담': '妊産婦・授乳婦は摂取前に専門家にご相談ください',
  '질환이 있거나 의약품 복용 시 전문가와 상담': '疾患がある場合や医薬品を服用中の場合は専門家にご相談ください',
  '고칼슘혈증이 있거나 의약품 복용 시 전문가와 상담': '高カルシウム血症がある場合や医薬品を服用中の場合は専門家にご相談ください',
  '알레르기 체질 등은 개인에 따라 과민반응 가능': 'アレルギー体質の方などは個人によって過敏反応が起こる場合があります',
  '이상사례 발생 시 섭취를 중단하고 전문가와 상담': '異常が生じた場合は摂取を中止し専門家にご相談ください',
  '어린이가 함부로 섭취하지 않도록 일일섭취량 방법을 지도할 것': 'お子様がむやみに摂取しないよう、1日の摂取量と摂取方法を指導してください',
  '건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은 매장 내 약사 등 전문가와 상담하십시오':
    '健康機能食品は疾病の予防・治療のための医薬品ではありません。ご不明な点は店舗内の薬剤師など専門家にご相談ください',
};

/* ── 4. 저작 라운드 (j1..jN) ─────────────────────────────────── */
export const authoredRounds = [];
const COLORS_RAW = {};
const COLOR = {};
/** 해석 실패 조각 수집기(저작 라운드 입력). */
export const FAILED = new Map();
const AUTH = { clause: {}, label: {}, meta: {}, heading: {}, badge: {}, intro: {}, foot: {}, spec: {} };
const ROUND_FILES = [];
for (let n = 1; n <= 200; n++) ROUND_FILES.push([`j${n}`, `${D}/hff-ja-b01-j${n}-translations-v1.json`]);
for (const [tag, f] of ROUND_FILES) {
  if (!fs.existsSync(f)) continue;
  const T = JSON.parse(fs.readFileSync(f, 'utf8'));
  authoredRounds.push(tag);
  for (const kind of Object.keys(AUTH)) for (const [k, v] of Object.entries(T[kind] ?? {})) AUTH[kind][key(k)] = v;
  /* any = 슬롯 종류와 무관하게 같은 의미로 쓰이는 문구. ZH 트랙의 교훈대로 조립 중 부분 조각에도
     걸리므로, 값이 아니라 **표기만** 조립 경로에 맞춘 형태로 저작한다. */
  for (const [k, v] of Object.entries(T.any ?? {})) for (const kind of Object.keys(AUTH)) AUTH[kind][key(k)] = v;
  Object.assign(COLORS_RAW, T.color ?? {});
}
for (const [k, v] of Object.entries(COLORS_RAW)) COLOR[key(k)] = v;
for (const [k, v] of Object.entries(HEADING)) AUTH.heading[key(k)] = v;
for (const [k, v] of Object.entries(FRAG)) for (const kind of Object.keys(AUTH)) AUTH[kind][key(k)] ??= v;
for (const [k, v] of Object.entries(ING)) for (const kind of Object.keys(AUTH)) AUTH[kind][key(k)] ??= v;

/* ── 5. 수치 보존 ────────────────────────────────────────────── */
/* `24개월` 의 `개` 는 수량 단위가 아니라 `개월`(기간)의 일부다. 단위로 세면 일본어 `24ヶ月` 와
   대조가 어긋나 수치 유실 오탐이 난다 — 뒤에 `월` 이 오면 단위에서 제외한다. */
/* `캅셀`·`캅셀` 은 표기만 다른 같은 단위다 — 단위 목록에서 빠지면 `1회 2캅셀` 이 수량으로 읽히지 않는다. */
const UNITS = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|%|정|캡슐|캅셀|포|병|스푼|스픈|알|매|회|일|개(?!월)`;
const UNITS_SYM = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|%`;
const UNITS_WORD_KO = String.raw`정|캡슐|캅셀|포|병|스푼|스픈|알|매|회|일|개(?!월)`;
/* 일본어 수량 단위. カタカナ 단위(カプセル·スプーン)는 뒤에 이어지는 가나와 붙어도 경계가 분명하다. */
const UNITS_WORD_JA = String.raw`錠|カプセル|包|瓶|スプーン|粒|枚|個|回|日`;
const NUM_LEAD = String.raw`(?<![A-Za-z0-9])\d+(?:[.,]\d+)*`;
const NUM_SCALE = String.raw`(?:\s*(?:억|만|천|億|万|千))?`;
const SCALE_MULT = { e8: 1e8, e4: 1e4, e3: 1e3, e9: 1e9, e6: 1e6 };
/* 배수 접미사는 표기가 달라도 값이 같으면 같은 수치다(`100억` = `100億`). 단위 환산은 하지 않는다. */
const canonUnit = (x) => {
  const t = x.replace(/[,\s]/g, '')
    .replace(/㎎/g, 'mg').replace(/㎍|μg|mcg/g, 'ug').replace(/㎖/g, 'ml')
    .replace(/억|億/g, 'E8').replace(/만|万/g, 'E4').replace(/천|千/g, 'E3')
    .replace(/정|錠/g, 'TAB').replace(/캡슐|캅셀|カプセル/g, 'CAP').replace(/포|包/g, 'SAC')
    .replace(/병|瓶/g, 'BTL').replace(/스푼|스픈|スプーン/g, 'SPN').replace(/알|粒/g, 'PIL')
    .replace(/매|枚/g, 'SHT').replace(/개|個/g, 'EA')
    .toLowerCase();
  const m = /^(\d+(?:\.\d+)?)(e[3468]|e9)?(.+)$/.exec(t);
  if (!m) return t;
  return String(Number(m[1]) * (SCALE_MULT[m[2]] ?? 1)) + m[3];
};
const NUM_RE = new RegExp(String.raw`${NUM_LEAD}${NUM_SCALE}(?:\s*(?:${UNITS_SYM})|(?:${UNITS_WORD_KO}))(?![A-Za-z])`, 'g');
const JA_RE = new RegExp(String.raw`${NUM_LEAD}${NUM_SCALE}(?:\s*(?:${UNITS_SYM})|(?:${UNITS_WORD_KO}|${UNITS_WORD_JA}))(?![A-Za-z])`, 'g');
const bag = (a) => { const m = new Map(); for (const x of a) m.set(x, (m.get(x) ?? 0) + 1); return m; };
/* 섭취 빈도 축. 일본어는 한국어와 같은 `N日M回` 표기를 쓰므로 축 환원이 대칭이다.
   제품명은 한국어 표기를 유지하므로 일본어 본문 안에도 `1일`·`1회` 가 남는다 — 양쪽 표기를 모두 센다. */
const freqTokens = (t, jaSide) => {
  const out = [];
  for (const m of t.matchAll(/(\d+)\s*일(?![가-힣])/g)) out.push(`PERDAY${m[1]}`);
  for (const m of t.matchAll(/(\d+)\s*회(?:당|에|시|씩)?(?![가-힣])/g)) out.push(`TIMES${m[1]}`);
  if (jaSide) {
    for (const m of t.matchAll(/(\d+)\s*日/g)) out.push(`PERDAY${m[1]}`);
    for (const m of t.matchAll(/(\d+)\s*回/g)) out.push(`TIMES${m[1]}`);
  }
  return out;
};
/* `1일섭취량기준` 처럼 뒤 한글에 붙은 `1일`·`1회` 는 빈도로도 수량으로도 읽지 않는다(ZH 트랙과 동일). */
const FREQ_COMPOUND_KO = /(\d+)\s*(?:일|회)(?=[가-힣])/g;
const stripFreq = (t, jaSide) => {
  let s = t.replace(/(\d+)\s*(?:일|회(?:당|에|시|씩)?)(?![가-힣])/g, ' ').replace(FREQ_COMPOUND_KO, ' ');
  if (jaSide) s = s.replace(/(\d+)\s*(?:日|回)/g, ' ');
  return s;
};
const SEP_UNIT_NUM = new RegExp(String.raw`(\d\s*(?:mcg|mg|kcal|CFU|㎎|kg|ug|㎍|μg|IU|mL|ml|㎖|L|g|%))(?=\d)`, 'g');
const sepUnit = (t) => t.replace(SEP_UNIT_NUM, '$1 ');
export const koNums = (s) => { const t = sepUnit(norm(s)); return [...(stripFreq(t, false).match(NUM_RE) ?? []).map(canonUnit), ...freqTokens(t, false)]; };
export const jaNums = (s) => { const t = sepUnit(norm(s)); return [...(stripFreq(t, true).match(JA_RE) ?? []).map(canonUnit), ...freqTokens(t, true)]; };
/** 원문 수치가 번역문에 남아 있는지 — 개수까지 본다. */
export const lostNums = (ko, ja) => {
  const kb = bag(koNums(ko)), jb = bag(jaNums(ja));
  const lost = [];
  for (const [k, n] of kb) if ((jb.get(k) ?? 0) < n) lost.push(k);
  return lost;
};

/* ── 6. 조합 규칙 ────────────────────────────────────────────── */
const KINDS = ['clause', 'meta', 'label', 'badge', 'intro', 'heading', 'foot', 'spec'];
const keyVariants = (k) => [...new Set([
  k, k.replace(/하여야함$/, '할것'), k.replace(/하여야한다$/, '할것'),
])].filter((x) => x);
/* `할것` 을 붙여서 조회하면 원문에 없는 지시가 생기고, 떼고 조회하면 명령형 문장이 명사 항목에 붙어
   지시 강도가 사라진다(`섭취하시기 바랍니다.` → `摂取`). §6 은 양쪽 모두 금지한다.
   떼는 쪽만, 그것도 값이 이미 서술을 끝맺은 형태일 때만 허용한다. */
const keyRelaxed = (k) => (/할것$/.test(k) ? [k.replace(/할것$/, '')] : []);
const RELAXED_OK = /(?:ください|下さい|こと|ます|ません|ましょう|。)$/;
/* 원문 표기를 유지하는 고유명사 — 제조사 법인명(`… 製造`). 잔존 한글 검사에서 제외한다. */
export const KEEP_PROPER = /[^·<>]{0,40}(?:製造|\(주\)|㈜|주식회사|유한회사)[^·<>]{0,40}/g;

const flat = (k) => k.replace(/[·()（）\[\]:：;；\-–—]/g, '');
const FLAT = {};
let FLAT_READY = false;
function buildFlat() {
  for (const kd of KINDS) {
    const seen = new Map();
    for (const [k, v] of Object.entries(AUTH[kd])) {
      const f = flat(k);
      if (!f) continue;
      if (seen.has(f) && seen.get(f) !== v) seen.set(f, null);
      else if (!seen.has(f)) seen.set(f, v);
    }
    FLAT[kd] = seen;
  }
  FLAT_READY = true;
}

const MARK_LEAD = /^\s*(?:[①-⑮➀-➄]|\(\s*\d+\s*\)|\d+\s*[).](?!\d))\s*/;
const MARK_TAIL = /\s*(?:[①-⑮➀-➄]|\d+\s*[).])\s*$/;
function alignMarks(src, kind, v) {
  if (typeof v !== 'string' || !v) return v;
  let out = v;
  const sl = MARK_LEAD.exec(src), vl = MARK_LEAD.exec(out);
  if (vl && (!sl || sl[0].trim() !== vl[0].trim())) out = out.slice(vl[0].length);
  if (sl && !MARK_LEAD.test(out)) out = `${sl[0].trim()} ${out}`;
  if (MARK_TAIL.test(out) && !MARK_TAIL.test(src)) out = out.replace(MARK_TAIL, '');
  /* 끝의 콜론은 표기 흔들림이 아니라 라벨 구분자다(`주원료: <b>…`). flat 조회가 무시하므로 여기서 되돌린다. */
  const sc = /[:：]\s*$/.test(src), vc = /[:：]\s*$/.test(out);
  if (sc && !vc) out = `${out}：`;
  else if (!sc && vc) out = out.replace(/[:：]\s*$/, '');
  return out;
}

function lookup(kind, t) {
  const k0 = key(t);
  const ks = keyVariants(k0);
  const order = kind ? [kind, ...KINDS.filter((x) => x !== kind)] : KINDS;
  for (const k2 of ks) for (const kd of order) if (AUTH[kd][k2]) return { ja: alignMarks(t, kind, AUTH[kd][k2]), how: `dict(${kd})` };
  for (const k2 of keyRelaxed(k0)) for (const kd of order) {
    const v = AUTH[kd][k2];
    if (v && RELAXED_OK.test(v)) return { ja: alignMarks(t, kind, v), how: `dict-relaxed(${kd})` };
  }
  if (!FLAT_READY) buildFlat();
  const f = flat(k0);
  if (f) for (const kd of order) { const v = FLAT[kd].get(f); if (v) return { ja: alignMarks(t, kind, v), how: `dict-flat(${kd})` }; }
  return null;
}
/* 구분자 뒤에 곧바로 숫자가 오면 열거 기호가 아니라 **소수점**이다(`0.5g당`). ZH 트랙에서 확정된 가드. */
const MARK_HEAD = /^(\s*(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⒜⒝⒞㉮㉯㉰㉱㈎㈏㈐㈑○●◦▶ⓛ]|\(\s*\d+\s*\)|\d+(?:-\d+)+\s*[).](?!\d)|\d+\s*[).>](?!\d)|\(\s*[가나다라마바사]\s*\)|[가나다라마바사]\s*[.)])\s*)/;
const SIBLING_MARK = (n) => new RegExp(String.raw`(?:^|[\s(])${n + 1}\s*[).](?!\d)`);
const FREQ_HEAD = /^\d+\s*일\s*\d+\s*회/;
const MARK_HEAD_AMBIG = /^\s*(\d+)\s*[).](?=\d)/;
function markHead(t) {
  const mm = MARK_HEAD.exec(t);
  if (mm) return mm;
  const am = MARK_HEAD_AMBIG.exec(t);
  if (!am) return null;
  const rest = t.slice(am[0].length);
  if (SIBLING_MARK(Number(am[1])).test(rest) || FREQ_HEAD.test(rest)) return [am[0]];
  return null;
}
/* 가·나·다 마커는 한글 자체가 순서 기호다. 일본어 열거 기호(ア·イ·ウ…)로 순서를 유지해 옮긴다. */
const KANA_MARK = { 가: 'ア', 나: 'イ', 다: 'ウ', 라: 'エ', 마: 'オ', 바: 'カ', 사: 'キ' };
const SPLIT = /\s*[·､、･•․∙]\s*|\s*(?:(?<!\d)[,，]|[,，](?!\s*\d))\s*|(?<![A-Za-z0-9])\s*\/\s*|\s*\/\s*(?![A-Za-z0-9])/;
const OPEN = '([{｛（〔［', CLOSE = ')]}｝）〕］';
function splitTop(t, sepRe) {
  const re = new RegExp(sepRe.source, 'g');
  const parts = [], seps = [];
  let d = 0, last = 0;
  for (let i = 0; i < t.length; i++) {
    if (OPEN.includes(t[i])) { d++; continue; }
    if (CLOSE.includes(t[i])) { if (d) d--; continue; }
    if (d) continue;
    re.lastIndex = i;
    const m = re.exec(t);
    if (m && m.index === i && m[0].length) {
      parts.push(t.slice(last, i)); seps.push(m[0]);
      i = last = i + m[0].length; i--;
    }
  }
  parts.push(t.slice(last));
  return { parts: parts.map((x) => x.trim()), seps };
}
const NUMTOK = new RegExp(String.raw`^\d+(?:[.,]\d+)*\s*(?:억|만|천)?\s*(?:${UNITS})$`);

/* 섭취 단위 — 일본어 표기. 값은 그대로 두고 단위 표기만 옮긴다. */
const UNIT_JA = { 정: '錠', 캡슐: 'カプセル', 캅셀: 'カプセル', 포: '包', 병: '瓶', 스푼: 'スプーン', 스픈: 'スプーン',
  알: '粒', 매: '枚', 개: '個', 환: '丸',
  구미: '粒グミ', 젤리: '粒ゼリー', 방울: '滴', 드롭: '滴', 스틱: '本', 팩: 'パック', 앰플: 'アンプル' };
const DU = '젤리|구미|방울|드롭|스틱|팩|앰플|정|캡슐|캅셀|포|병|스푼|스픈|알|매|개|환|㎖|ml|mL|g|mg';

/** `1일 3회` `1회 2정` `1회 1포(3g)` 등 섭취 표기. 수치는 원문 토큰을 그대로 옮긴다. */
function dosage(t0) {
  const t = t0.replace(/씩$/, '').trim();
  let m;
  if ((m = /^1일\s*(\d+)\s*회$/.exec(t))) return `1日${m[1]}回`;
  if ((m = /^(\d+)일\s*(\d+)\s*회$/.exec(t))) return `${m[1]}日${m[2]}回`;
  if ((m = new RegExp(String.raw`^1회\s*(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t))) return `1回${m[1]}${UNIT_JA[m[2]] ?? m[2]}`;
  if ((m = new RegExp(String.raw`^1일\s*(\d+)\s*회\s*[,，]?\s*1회\s*(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t)))
    return `1日${m[1]}回、1回${m[2]}${UNIT_JA[m[3]] ?? m[3]}`;
  if ((m = new RegExp(String.raw`^1일\s*(\d+)\s*회\s*(?:1회\s*)?(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t)))
    return `1日${m[1]}回、1回${m[2]}${UNIT_JA[m[3]] ?? m[3]}`;
  if ((m = new RegExp(String.raw`^1일\s*(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t))) return `1日${m[1]}${UNIT_JA[m[2]] ?? m[2]}`;
  if ((m = new RegExp(String.raw`^(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t))) return `${m[1]}${UNIT_JA[m[2]] ?? m[2]}`;
  return null;
}

/** 원료명 + 표시량 (`루테인 20mg`). 용어집 + 원문 수치 토큰. */
function ingredientAmount(t) {
  const m = /^(.+?)\s*(\d+(?:[.,]\d+)*\s*(?:억|만|천)?\s*(?:mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|%))$/.exec(t);
  if (!m) return null;
  if (/[~〜～\-–,，/]$/.test(m[1].trim())) return null;
  const head = resolveAtom(m[1].trim());
  if (!head) return null;
  return `${head} ${m[2].replace(/\s+/g, '').replace(/억/g, '億').replace(/만/g, '万').replace(/천/g, '千')}`;
}

/** `A(B)` — 괄호 안은 별칭이거나 원문 표기다. */
function paren(t) {
  const m = /^([^()]+)\(([^()]+)\)$/.exec(t);
  if (!m) return null;
  const a = resolveAtom(m[1].trim());
  if (!a) return null;
  const b = resolveAtom(m[2].trim());
  if (!b && /[가-힣]/.test(m[2])) return null;
  return `${a}（${b ?? m[2].trim()}）`;
}

/** `A : B` — 라벨과 값. 양쪽이 해석돼야 한다. */
function labelColon(t) {
  const m = /^([^:：]{1,90})\s*[:：]\s*(.+)$/.exec(t);
  if (!m) return null;
  const a = resolveAtom(m[1].trim()), b = resolveAtom(m[2].trim());
  if (!a || !b) return null;
  return `${a}：${b}`;
}

/* 기능성 문구 뒤에 그 기능성이 귀속되는 영양성분명이 붙는 라벨 형태.
   귀속(어느 성분의 기능성인가)과 표기 순서를 원문 그대로 보존한다(§6). */
const FUNC_TAIL = /(?:필요|필요\.|도움을 줌|도움이 됨|도움을 줄 수 있음|도움을 줄 수 있음\.|관여|기여)$/;
function functionNutrient(t, depth) {
  const m = /^(.{4,}?)\s+([*·◦●○☆★]?)\s*([가-힣A-Za-z][가-힣A-Za-z0-9]{0,11})\s*([:：\-–—])?\s*$/.exec(t);
  if (!m) return null;
  const head = m[1].trim();
  if (!FUNC_TAIL.test(head)) return null;
  const a = resolveAtom(head, depth + 1);
  if (!a) return null;
  const b = ING[key(m[3])] ?? lookup(null, m[3])?.ja;
  if (!b) return null;
  const tail = m[4] ? (/[:：]/.test(m[4]) ? '：' : m[4]) : '';
  return `${a} ${m[2]}${b}${tail}`;
}

/** `1일 1회, 1회 1캡슐` 처럼 이어진 섭취 표기. */
function doseChain(t) {
  if (!/[,，]/.test(t)) return null;
  const parts = t.split(/\s*[,，]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const z = parts.map(dosage);
  return z.every(Boolean) ? z.join('、') : null;
}

/* 섭취 방식 부사. 문장 안에 들어가는 형태만 둔다. */
const MANNER = {
  '물과 함께': '水とともに', '충분한 물과 함께': '十分な水とともに', '충분한 물과': '十分な水とともに',
  '따뜻한 물과 함께': 'ぬるま湯とともに', '미지근한 물과 함께': 'ぬるま湯とともに', '물 또는 음료와 함께': '水または飲料とともに',
  '씹어': '噛んで', '씹어서': '噛んで', '그대로': 'そのまま', '식사와 함께': '食事とともに',
  '식후에': '食後に', '식후': '食後に', '식전에': '食前に', '식전': '食前に', '공복에': '空腹時に',
  '직접 또는 물과 함께': 'そのままか水とともに', '그대로 혹은 물과 함께': 'そのままか水とともに',
  '직접 섭취하거나 물과 함께': 'そのまま、または水とともに', '물에 타서': '水に溶かして',
  '물이나 음료에 타서': '水または飲料に溶かして', '직접': 'そのまま',
  '삼켜서': '飲み込んで', '물과 함께 삼켜서': '水とともに飲み込んで', '음용수와 함께': '飲料水とともに',
  '음용수와': '飲料水とともに', '음용수': '飲料水とともに', '따뜻한 물에 타서': 'ぬるま湯に溶かして',
  '찬물에 타서': '冷水に溶かして', '한번에': '一度に', '녹여': '溶かして', '녹여서': '溶かして',
  '입안에서 녹여': '口の中で溶かして', '입안에서 녹여서': '口の中で溶かして',
  '입에서 녹여': '口の中で溶かして', '입안에서 서서히 녹여': '口の中でゆっくり溶かして',
  '온수 또는 냉수에 타서': '温水または冷水に溶かして', '냉수 또는 온수에 타서': '冷水または温水に溶かして',
  '흔들어서': 'よく振って', '흔들어': 'よく振って', '씹거나 삼키지 말고 입안에서 천천히 녹여': '噛んだり飲み込んだりせず口の中でゆっくり溶かして',
  '충분한 물과 함께 삼켜서': '十分な水とともに飲み込んで', '우유와 함께': '牛乳とともに',
  '음료와 함께': '飲料とともに', '음료에 타서': '飲料に溶かして', '주스에 타서': 'ジュースに溶かして',
  '충분히 씹어서': 'よく噛んで', '충분히 씹어': 'よく噛んで', '씹거나 녹여서': '噛むか溶かして',
  '씹거나 녹여': '噛むか溶かして', '씹거나 물과 함께': '噛むか水とともに', '잘 저어': 'よくかき混ぜて',
  '저어': 'かき混ぜて', '데워': '温めて', '직접 또는 데워': 'そのままか温めて', '온수 또는 냉수에 타서': 'お湯または冷水に溶かして',
  '냉수나 온수에 타서': '冷水またはお湯に溶かして', '따뜻한 물이나 찬물에 타서': 'ぬるま湯または冷水に溶かして',
};
const PRE_MANNER = {
  '식사와 관계없이': '食事に関係なく', '식사와 관계 없이': '食事に関係なく', '식사에 관계없이': '食事に関係なく',
  '식사 여부와 관계없이': '食事の有無に関係なく', '식전, 식후 관계없이': '食前・食後に関係なく',
  '식전, 식후 관계 없이': '食前・食後に関係なく', '식사 전, 후 관계없이': '食前・食後に関係なく',
  '식사 전, 후 관계 없이': '食前・食後に関係なく', '식전·식후 관계없이': '食前・食後に関係なく',
  '식전 또는 식후에': '食前または食後に', '식후에': '食後に', '식전에': '食前に', '공복에': '空腹時に',
};
const MANNER_KEYS = Object.keys(MANNER).sort((a, b) => b.length - a.length);

/** `1일 1회, 1회 1캡슐을 물과 함께 섭취하십시오.` — 섭취 표기와 방식을 분리해 옮긴다. */
function intake(t) {
  const VERB = '(?:(?:섭취|복용|음용|투여)\\s*(?:하십시오|하십시요|하십오|하세요|하시오|합니다|하시기\\s*바랍니다|하여\\s*주시기\\s*바랍니다|해\\s*주십시오|하여\\s*주십시오|할\\s*것|하도록\\s*하십시오|하여야\\s*함|한다)?|드십시오|드십시요|드시기\\s*바랍니다|드세요|드시오|먹습니다)';
  const t1 = t.replace(/합께/g, '함께').replace(/물과함께/g, '물과 함께').replace(/1회시/g, '1회').replace(/\s+/g, ' ');
  const m = new RegExp(`^(.+?)\\s*${VERB}\\s*([.]?)$`).exec(t1);
  if (!m) return null;
  let body = m[1].trim();
  /* `100~200ml 물에 타서` — 물 양이 들어간 섭취 방식. 수치는 원문 그대로 둔다. */
  const waterManner = [];
  let wm;
  if ((wm = /\s*([\d][\d~\-–.,\s]*(?:ml|mL|㎖|L|리터))\s*(?:의\s*)?(?:물|온수|냉수)에\s*(타서|녹여|녹여서|풀어서|풀어)$/.exec(body))
    || (wm = /\s*(?:물|온수|냉수)\s*([\d][\d~\-–.,\s]*(?:ml|mL|㎖|L|리터))\s*에\s*(타서|녹여|녹여서|풀어서|풀어)$/.exec(body))) {
    const amt = wm[1].replace(/\s+/g, '').replace(/리터/, 'L');
    waterManner.push(/타서|풀어/.test(wm[2]) ? `${amt}の水に溶かして` : `${amt}の水に溶かして`);
    body = body.slice(0, wm.index).replace(/(?:을|를|씩|씩을)$/, '').trim();
  }
  const manners = [...waterManner];
  for (let i = 0; i < 3; i++) {
    const k = MANNER_KEYS.find((x) => body.endsWith(x));
    if (!k) break;
    manners.unshift(MANNER[k]);
    body = body.slice(0, -k.length).replace(/(?:을|를|씩|씩을)$/, '').trim();
  }
  let pre = '';
  for (const k of Object.keys(PRE_MANNER).sort((a, b) => b.length - a.length)) {
    if (body.startsWith(k)) { pre = PRE_MANNER[k]; body = body.slice(k.length).trim(); break; }
    if (body.endsWith(k)) { pre = PRE_MANNER[k]; body = body.slice(0, -k.length).replace(/(?:을|를|씩|씩을)$/, '').trim(); break; }
  }
  body = body.replace(/(?:을|를|씩|씩을)$/, '').trim();
  if (!body) return null;
  /* 섭취 표기가 아니라 일반 문장인데 `… 섭취하십시오` 로 끝나는 경우가 많다(`성분을 확인하신 후 섭취하십시오`).
     그런 문장을 여기서 잡으면 앞부분이 섭취량으로 둔갑한다. 수량 표기가 있을 때만 이 경로를 쓴다. */
  const dose = doseChain(body) ?? dosage(body) ?? (NUM_RE.test(body) ? resolveAtom(body, 3) : null);
  NUM_RE.lastIndex = 0;
  if (!dose) return null;
  return `${pre ? `${pre}、` : ''}${dose}を${manners.join('')}摂取してください${m[2] ? '。' : ''}`;
}

const SPACED = /\s+[·・*•․∙]\s+/;

/** 도입·요약 문장 틀. 원료·수치·섭취표기는 슬롯으로 두고 틀만 옮긴다. */
const SENT = [
  [/^이 제품은\s*(.+?)\s*을\(를\)\s*주원료로 한 건강기능식품입니다[.]?$/, (a) => `本製品は${a}を主原料とした健康機能食品です。`],
  [/^이 제품은\s*(.+?)\s*(?:을|를)\s*주원료로 한 건강기능식품입니다[.]?$/, (a) => `本製品は${a}を主原料とした健康機能食品です。`],
  [/^이 제품은\s*(.+?)\s*(?:을\(를\)|을|를)\s*표시량으로 담은\s*(\d+)\s*원료 복합 건강기능식품입니다[.]?$/, (a, n) => `本製品は${a}を表示量で配合した${n}原料複合の健康機能食品です。`],
  [/^이 제품은\s*(.+?)\s*(?:을\(를\)|을|를)\s*담은 복합 건강기능식품입니다[.]?$/, (a) => `本製品は${a}を配合した複合健康機能食品です。`],
  [/^이 제품은\s*(.+?)\s*(?:을\(를\)|을|를)\s*표시량으로 담은 건강기능식품입니다[.]?$/, (a) => `本製品は${a}を表示量で配合した健康機能食品です。`],
  [/^이 제품의 표시 기준은\s*(.+?)\s*입니다[.]?$/, (a) => `本製品の表示基準は${a}です。`],
  [/^공식 섭취방법은\s*(.+?)\s*입니다[.]?$/, (a) => `公式な摂取方法は${a}です。`],
  [/^(.+?)에 도움을 줄 수 있는\s*(.+?)\s*(?:을|를)\s*담았습니다[.]?$/, (a, b) => `${a}に役立つ${b}を配合しました。`],
];
function sentenceCompose(t, depth = 0) {
  for (const [re, f] of SENT) {
    const m = re.exec(t);
    if (!m) continue;
    const slots = m.slice(1).map((s) => (/^\d+$/.test(s) ? s : null));
    const jas = m.slice(1).map((s, i) => (slots[i] ?? doseChain(s.trim()) ?? resolveAtom(s.trim(), depth + 1)));
    if (jas.every(Boolean)) return f(...jas);
  }
  return null;
}

/** `비타민 D 영양기능 (공식 인정 기능성)` 같은 섹션 제목. */
function headingCompose(t, depth = 0) {
  const P = [
    [/^(.+?)\s*영양기능\s*\(\s*공식 인정 기능성\s*\)$/, (a) => `${a}の栄養機能（公式認定機能性）`],
    [/^(.+?)\s*영양기능\s*\(\s*공식 인정\s*\)$/, (a) => `${a}の栄養機能（公式認定）`],
    [/^(.+?)\s*기능성\s*\(\s*공식 인정 기능성\s*\)$/, (a) => `${a}の機能性（公式認定機能性）`],
    [/^(.+?)\s*기능성\s*\(\s*공식 인정\s*\)$/, (a) => `${a}の機能性（公式認定）`],
    [/^(.+?)\s*영양기능$/, (a) => `${a}の栄養機能`],
    [/^(.+?)\s*원료별 공식 인정 기능성$/, (a) => `${a}の原料別公式認定機能性`],
    [/^(.+?)\s*공식 인정 기능성$/, (a) => `${a}の公式認定機能性`],
    [/^이\s*(.+?)의 공식 기능성$/, (a) => `この${a}の公式機能性`],
  ];
  for (const [re, f] of P) {
    const m = re.exec(t);
    if (!m) continue;
    const a = resolveAtom(m[1].trim(), depth + 1);
    if (a) return f(a);
  }
  return null;
}

/* ── 문장 조각 템플릿 ────────────────────────────────────────────
   `<b>` 같은 인라인 라벨이 문장 중간에 있으면 슬롯이 조각으로 나뉜다.
   조각 순서를 그대로 두고 접속 표현만 일본어 어순에 맞춰 옮긴다. */
function fragmentCompose(t, depth) {
  let m;
  if ((m = /^이 제품은\s+1일 섭취량\((.+?)\)에\s*(.*)$/.exec(t))) {
    const d = resolveAtom(m[1].trim(), depth + 1);
    const rest = m[2].trim() ? resolveAtom(m[2].trim(), depth + 1) : '';
    if (d && rest !== null) return `本製品は1日摂取量（${d}）あたり${rest}`;
  }
  if ((m = /^이 제품은\s*(.*)$/.exec(t))) {
    if (!m[1].trim()) return '本製品は';
    const a = resolveAtom(m[1].trim(), depth + 1);
    if (a) return `本製品は${a}`;
  }
  if (/^이 제품의 표시 기준은$/.test(t)) return '本製品の表示基準は';
  if (/^입니다[.]?$/.test(t)) return 'です。';
  if (/^입니다[.]?\s*공식 섭취방법은$/.test(t)) return 'です。公式な摂取方法は';
  if (/^입니다[.]?\s*공식 인정 기능성은 아래와 같습니다[.]?$/.test(t)) return 'です。公式認定機能性は以下のとおりです。';
  if (/^입니다[.]?\s*각 원료의 공식 인정 기능성은 아래와 같습니다[.]?$/.test(t)) return 'です。各原料の公式認定機能性は以下のとおりです。';
  if (/^이며,\s*각 원료의 공식 인정 기능성은 아래와 같습니다[.]?$/.test(t)) return 'であり、各原料の公式認定機能性は以下のとおりです。';
  if (/^을\(를\)\s*주원료로 한 건강기능식품입니다[.]?\s*공식 섭취방법은$/.test(t)) return 'を主原料とした健康機能食品です。公式な摂取方法は';
  if (/^을\(를\)\s*주원료로 한 건강기능식품입니다[.]?\s*공식 인정 기능성은 아래와 같습니다[.]?$/.test(t)) return 'を主原料とした健康機能食品です。公式認定機能性は以下のとおりです。';
  if (/^을\(를\)\s*주원료로 한 건강기능식품입니다[.]?$/.test(t)) return 'を主原料とした健康機能食品です。';
  if ((m = /^를?\s*표시량으로 담은\s*(\d+)원료 복합 건강기능식품입니다[.]?\s*각 원료의 공식 인정 기능성은 아래와 같습니다[.]?$/.exec(t))) {
    return `を表示量で配合した${m[1]}原料複合の健康機能食品です。各原料の公式認定機能性は以下のとおりです。`;
  }
  if ((m = /^를?\s*표시량으로 담은\s*(\d+)원료 복합 건강기능식품입니다[.]?$/.exec(t))) {
    return `を表示量で配合した${m[1]}原料複合の健康機能食品です。`;
  }
  if ((m = /^를?\s*주원료로 한\s*(\d+)원료 복합 건강기능식품입니다[.]?\s*공식 섭취방법은$/.exec(t))) {
    return `を主原料とした${m[1]}原料複合の健康機能食品です。公式な摂取方法は`;
  }
  if ((m = /^를?\s*주원료로 한\s*(\d+)원료 복합 건강기능식품입니다[.]?\s*공식 인정 기능성은 아래와 같습니다[.]?$/.exec(t))) {
    return `を主原料とした${m[1]}原料複合の健康機能食品です。公式認定機能性は以下のとおりです。`;
  }
  if ((m = /^를?\s*표시량으로 담았습니다\(표시 기준\s*(.+?)당\)[.]?\s*([\s\S]*)$/.exec(t))) {
    const b = resolveAtom(m[1].trim(), depth + 1);
    const rest = m[2].trim() ? resolveAtom(m[2].trim(), depth + 1) : '';
    if (b && rest !== null) return `を表示量で配合しました（表示基準${b}当たり）。${rest}`;
  }
  if ((m = /^[.]\s*([\s\S]+)$/.exec(t))) {
    const a = resolveAtom(m[1].trim(), depth + 1);
    if (a) return `。${a}`;
  }
  return null;
}

/* `성상` 서술 — 관능 표현·색·제형은 표기 변형이 많다. 표기를 정규화한 뒤 고정 대응으로 옮긴다. */
const sensoryNorm = (t) => t.replace(/\s+/g, ' ')
  .replace(/이미\s*(?:[,，、·･∙⸱‧․・ㆍ･･.]|와|과)?\s*이취/g, '이미·이취')
  .replace(/이취\s+([가없])/g, '이취$1')
  .replace(/고유의향미/g, '고유의 향미')
  .replace(/([가-힣])이미·이취/g, '$1 이미·이취')
  .replace(/이취가없/g, '이취가 없')
  .replace(/이미·이취\s*[,，、·･∙⸱]\s*이물/g, '이미·이취·이물')
  .replace(/(있고|없고|있으며|없으며)\s*,/g, '$1')
  .replace(/색택\s*[,，]\s*향미/g, '색택과 향미')
  .replace(/없어야\s*(한다|함|합니다)/g, '없어야 $1')
  .trim();
const SENSORY = [
  [/^고유의 (?:향미가 (?:있고|있으며)|향미를 (?:지니고|가지고|가지며|지니며|가지고 있고|가지고 있으며|가지고 있는|가진)) 이미·이취가 (?:없는|없으며|없고) ?(.*)$/, '固有の香味を有し、異味・異臭のない'],
  [/^고유의 색택과 향미를 (?:가지고 있으며|가지고 있는|가지고 있고|가진) 이미·이취가 (?:없는|없으며|없고) ?(.*)$/, '固有の色沢と香味を有し、異味・異臭のない'],
  [/^고유의 색택과 향미를 (?:가진|가지는|가지고 있는)\s*(.+)$/, '固有の色沢と香味を有する'],
  [/^고유의 색택과 향미가 (?:있고|있으며) 이미·이취가 (?:없는|없으며|없고) ?(.*)$/, '固有の色沢と香味を有し、異味・異臭のない'],
  [/^이미·이취·이물이 (?:없어야 (?:한다|함|합니다)|없다|없음)[.]? ?(.*)$/, '異味・異臭・異物がないこと。'],
  [/^이미·이취·이물이 (?:없는|없고|없으며) ?(.+)$/, '異味・異臭・異物のない'],
  [/^이취가 (?:없는|없고|없으며) ?(.+)$/, '異臭のない'],
  [/^고유의 향미가 (?:있고|있으며|있다|있음)[.]?()$/, '固有の香味を有する。'],
  [/^이미·이취가 (?:없고|없으며),? ?고유의 (?:향미가 있는|향미를 (?:가진|지닌|가지고 있는|지니고 있는)) ?(.*)$/, '異味・異臭がなく固有の香味を有する'],
  [/^고유의 향미를 (?:가지며|지니며) 이미·이취가 없는 ?(.*)$/, '固有の香味を有し、異味・異臭のない'],
  [/^고유의 색택과 향미를 (?:가지며|가지고|지니며|지니고) 이미·이취가 (?:없어야 (?:한다|함|합니다)|없다|없음)[.]? ?(.*)$/, '固有の色沢と香味を有し、異味・異臭がないこと。'],
  [/^고유의 색택과 향미를 (?:가지며|가지고) 이미·이취가 없는 ?(.*)$/, '固有の色沢と香味を有し、異味・異臭のない'],
  [/^이미·이취가 (?:없어야 (?:한다|함|합니다)|없다|없음)[.]? ?(.*)$/, '異味・異臭がないこと。'],
  [/^이미·이취가 (?:없는|없으며|없고) ?(.+)$/, '異味・異臭のない'],
];
function appearance(t0, depth) {
  const t = sensoryNorm(t0);
  let lm = /^(?:\(?\s*(?:\d+|[①-⑳⑴-⑽])\s*\)?\s*[.．)]?\s*)?성상\s*(?:정제\s*\d+\s*)?[:：;]\s*(.+)$/.exec(t);
  if (lm) {
    const a = resolveAtom(lm[1].trim(), depth + 1);
    if (a) return `性状：${a}`;
  }
  for (const [re, head] of SENSORY) {
    const m = re.exec(t);
    if (!m) continue;
    const rest = m[1].trim();
    if (!rest) return head.replace(/の$/, 'もの');
    const a = resolveAtom(rest, depth + 1);
    if (a) return head + a;
  }
  let sm;
  if ((sm = /^(.+?)\s*으?로 고유의 색택과 향미를 (?:가지며|가지고|지니며|지니고),? 이미·이취가 (?:없어야 (?:한다|함|합니다)|없다|없음)[.]?$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1);
    if (a) return `${a}であり、固有の色沢と香味を有し、異味・異臭がないこと。`;
  }
  if ((sm = /^(?:불규칙한\s*)?(?:점박이|반점)(?:가|를|이)\s*(?:있는|있으며|포함한|함유한|포함된)\s*(.+)$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1);
    if (a) return `斑点のある${a}`;
  }
  if ((sm = /^(?:점성|점조성|점도)를?을?\s*(?:가진|가지는|갖는|있는)\s*(.+)$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1);
    if (a) return `粘性のある${a}`;
  }
  if ((sm = /^점도가\s*묽은\s*(.+)$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1);
    if (a) return `粘度の低い${a}`;
  }
  if ((sm = /^분말이\s*현탁된\s*(.+)$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1);
    if (a) return `粉末が懸濁した${a}`;
  }
  if ((sm = /^([A-Za-z]+)\s*모양의\s*(.+)$/.exec(t))) {
    const shape = { oval: '楕円形', round: '円形', capsule: 'カプセル形' }[sm[1].toLowerCase()];
    const a = resolveAtom(sm[2].trim(), depth + 1);
    if (shape && a) return `${shape}の${a}`;
  }
  /* `해, 달, 별, 하트 모양 젤리` — 열거 순서를 그대로 유지한다. */
  if ((sm = /^(.+?)\s*모양의?\s*(.+)$/.exec(t))) {
    const names = sm[1].split(/\s*[,，·、]\s*|\s+및\s+|\s+또는\s+/).map((x) => x.trim()).filter(Boolean);
    const shapes = names.map((x) => SHAPE_JA[x] ?? null);
    const a = resolveAtom(sm[2].trim(), depth + 1);
    if (a && names.length && shapes.every(Boolean))
      return shapes.length === 1 ? `${shapes[0]}形の${a}` : `${shapes.join('・')}の形をした${a}`;
  }
  if ((sm = /^(.+?)\s*(?:또는|혹은)\s*(.+)$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1);
    const b = resolveAtom(sm[2].trim(), depth + 1);
    if (a && b) return `${a}または${b}`;
  }
  if ((sm = /^(.+?)\s*으?로 이미·이취가 (?:없음|없다|없어야 한다|없어야 함)[.]?$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1);
    if (a) return `${a}であり、異味・異臭がない。`;
  }
  if ((sm = /^(.*?)([가-힣 ]+?)\s*빛이 도는\s*(.+)$/.exec(t))) {
    const tone = colorCompose(sm[2]);
    const rest = resolveAtom(sm[3].trim(), depth + 1);
    const pre = sm[1].trim() ? resolveAtom(sm[1].trim(), depth + 1) : '';
    if (tone && rest && pre !== null) return `${pre}${tone}色を帯びた${rest}`;
  }
  /* `분말을 내용물로한 미황색의 경질캡슐` — `내용물로 한`(띄어쓰기 무관)까지만 넓힌다.
     포함 동사 목록을 `가진`·`하는` 까지 넓히면 다른 규칙과 겹쳐 조사가 중복된 비문이 나온다
     (`内容液をが濃濃褐色`). 실측으로 확인된 사례이므로 넓히지 않는다. */
  if ((sm = /^(.*?)\s*(내용물|분말|과립|알갱이|입자|액상|알맹이|결정|고체상|점박이|반점|광택|오일|유상액)(?:을|를|이|가)?\s*(?:내용물로\s*)?(?:함유한|함유하는|함유하고 있는|함유하고있는|포함한|포함하는|가진|든|들어있는|들어 있는|포함된|함유된|현탁된|보이는|느껴지는|있는|한)\s+(.+)$/.exec(t))) {
    const NOUN = { 내용물: '内容物', 분말: '粉末', 과립: '顆粒', 알갱이: '粒', 입자: '粒子', 액상: '液状の内容物', 알맹이: '粒', 결정: '結晶', 고체상: '固体状のもの', 점박이: '斑点', 반점: '斑点', 광택: '光沢', 오일: 'オイル', 유상액: '油状液' };
    const pre = sm[1].trim() ? resolveAtom(sm[1].trim(), depth + 1) : '';
    const tail = resolveAtom(sm[3].trim(), depth + 1);
    if (pre !== null && tail) return `${pre}${NOUN[sm[2]]}を含む${tail}`;
  }
  /* `연한노랑색의 분말` — 앞부분·색·제형. `색`이 여러 번 나오므로 가능한 분해 지점을 모두 시도한다. */
  for (let idx = t.indexOf('색'); idx >= 0; idx = t.indexOf('색', idx + 1)) {
    const head = t.slice(0, idx);
    const tail = t.slice(idx + 1).replace(/^의/, '').trim();
    if (!tail || !head) continue;
    for (let j = 0; j < head.length; j++) {
      const colSeg = head.slice(j).trim();
      if (!colSeg || !/[가-힣]/.test(colSeg[0] ?? '')) continue;
      const col = colorCompose(colSeg);
      if (!col) continue;
      const preSeg = head.slice(0, j).trim();
      const pre = preSeg ? resolveAtom(preSeg, depth + 1) : '';
      const form = resolveAtom(tail, depth + 1);
      if (pre !== null && form) return `${pre}${col}色の${form}`;
      break;
    }
  }
  if ((sm = /^(.*?)\s*([가-힣 ]+)의\s+(.+)$/.exec(t))) {
    const col = colorCompose(sm[2]);
    const form = col ? resolveAtom(sm[3].trim(), depth + 1) : null;
    const pre = sm[1].trim() ? resolveAtom(sm[1].trim(), depth + 1) : '';
    if (col && form && pre !== null) return `${pre}${col}色の${form}`;
  }
  if ((sm = /^([가-힣 ()（）]+?)색$/.exec(t))) { const col = colorCompose(sm[1]); if (col) return `${col}色`; }
  if (/(노랑|노란|황|백|하양|흰|갈|흑|검정|적|빨강|빨간|붉은|녹|초록|연두|청|파랑|자|보라|회|분홍|주황|투명)$/.test(t)) {
    const col = colorCompose(t);
    if (col) return `${col}色`;
  }
  if ((sm = /^상부\s*(.+?)\s*[,，]\s*하부\s*(.+)$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1), b = resolveAtom(sm[2].trim(), depth + 1);
    if (a && b) return `上部が${a}、下部が${b}`;
  }
  if ((sm = /^(.+?)에\s*(?:점도|점성|점조성)가?이?\s*있는\s*(.+)$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1), b = resolveAtom(sm[2].trim(), depth + 1);
    if (a && b) return `${a}で粘性のある${b}`;
  }
  if ((sm = /^(.+?)\s*바탕에\s*(.+)$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1), b = resolveAtom(sm[2].trim(), depth + 1);
    if (a && b) return `${a}を地色とする${b}`;
  }
  if (/[\s\-–—]$/.test(t)) {
    const a = resolveAtom(t.replace(/[\s\-–—]+$/, ''), depth + 1);
    if (a) return a;
  }
  const fc = formCompose(t);
  if (fc) return fc;
  if (/[.]$/.test(t)) {
    const a = resolveAtom(t.replace(/[.]+$/, ''), depth + 1);
    if (a) return period(a);
  }
  return null;
}

/** 마침표 부착. 안쪽 규칙이 이미 문장을 종결했으면 겹쳐 찍지 않는다(`です。。` 방지). */
function period(a) {
  return /[。！？!?]$/.test(a) ? a : `${a}。`;
}

/* 색 표기는 수식어 + 색 어근의 조합이다. 사전 나열 대신 형태소 단위로 옮긴다.
   `${col}色` 형태로 쓰이므로 색 어근은 한자 1글자 또는 카타카나 어휘로 둔다(淡黄色·クリーム色). */
const CTOK_RAW = {
  연한: '淡', 옅은: '淡', 엷은: '淡', 담: '淡', 진한: '濃', 짙은: '濃', 어두운: '暗', 암: '暗',
  밝은: '明', 흐린: '濁', 탁한: '濁', 맑은: '清', 미: '微', 짚은: '濃',
  노란: '黄', 노랑: '黄', 황: '黄', 하얀: '白', 하양: '白', 흰: '白', 백: '白', 유백: '乳白',
  빨간: '赤', 빨강: '赤', 적: '赤', 붉은: '赤', 분홍: '桃', 핑크: 'ピンク', 자주: '赤紫',
  갈: '褐', 갈색: '褐', 밤: '栗', 흑: '黒', 검은: '黒', 검정: '黒', 회: '灰', 재: '灰',
  녹: '緑', 초록: '緑', 연두: '黄緑', 보라: '紫', 자: '紫', 주황: '橙', 오렌지: 'オレンジ',
  청: '青', 파란: '青', 파랑: '青', 크림: 'クリーム', 베이지: 'ベージュ', 상아: '象牙', 우유: '乳',
  선명한: '鮮', 짙: '濃', 무: '無', 초콜렛: 'チョコレート', 초콜릿: 'チョコレート', 카라멜: 'キャラメル',
  자줏빛: '紫', 분홍빛: '桃', 노랑빛: '黄', 미황: '微黄', 담황: '淡黄', 유황: '乳黄',
  살구: 'アプリコット', 커피: 'コーヒー', 겨자: 'マスタード', 미색: 'アイボリー',
  투명: '透明', 반투: '半透明', 불투명: '不透明', 진: '濃', 연: '淡', 흙: '土',
  초코렛: 'チョコレート', 초코릿: 'チョコレート', 명: '明', 은: '銀', 남: '藍', 탁: '濁', 록: '緑', 청록: '青緑',
};
const CTOK_KEYS = Object.keys(CTOK_RAW).sort((a, b) => b.length - a.length);
function colorCompose(t) {
  const s = String(t ?? '').replace(/\s+/g, '');
  if (!s || !/[가-힣]/.test(s)) return null;
  const pm = /^([가-힣]*)[(（]([가-힣]+)[)）]([가-힣]*)$/.exec(s);
  if (pm) {
    const [a, b, c] = [pm[1] ? colorCompose(pm[1]) : '', colorCompose(pm[2]), pm[3] ? colorCompose(pm[3]) : ''];
    if (a !== null && b && c !== null) return `${a}（${b}）${c}`;
    return null;
  }
  let i = 0, out = '';
  outer: while (i < s.length) {
    for (const k of CTOK_KEYS) if (s.startsWith(k, i)) { out += CTOK_RAW[k]; i += k.length; continue outer; }
    return null;
  }
  return out;
}

/* `… 모양 젤리` 의 모양 어휘. */
const SHAPE_JA = {
  반원: '半円', 원형: '円', 원통: '円筒', 타원: '楕円', 정사각: '正方', 직사각: '長方', 삼각: '三角', 사각: '四角',
  별: '星', 달: '月', 해: '太陽', 하트: 'ハート', 클로버: 'クローバー', 리본: 'リボン', 꽃: '花', 나뭇잎: '木の葉',
  가위: 'ハサミ', 바위: 'グー', 보: 'パー', 곰: 'クマ', 곰돌이: 'クマ', 물고기: '魚', 공룡: '恐竜', 동물: '動物',
  포도: 'ぶどう', 딸기: 'いちご', 사과: 'りんご', 오렌지: 'オレンジ', 레몬: 'レモン', 복숭아: '桃', 수박: 'すいか',
  뽀로로: 'ポロロ', 알약: '錠剤', 캡슐: 'カプセル', 구슬: '球', 방울: 'しずく', 튜브: 'チューブ', 스틱: 'スティック', 공: 'ボール',
};

/* 제형 서술 — 모양·코팅·재질 수식어의 조합이다. 최장 일치로 토막 내 순서대로 잇는다. */
const FORM_RAW = {
  점도가있는: '粘性のある', 내용물을함유한: '内容物を含む', 분말을함유한: '粉末を含む', 과립을함유한: '顆粒を含む',
  액상을함유한: '液状の内容物を含む', 내용물이든: '内容物を含む',
  투명한: '透明', 투명의: '透明', 투명: '透明', 반투명: '半透明', 불투명: '不透明',
  장방형: '長方形', 타원형: '楕円形', 장타원형: '長楕円形', 원형: '円形', 구형: '球形',
  스틱형: 'スティック形', 삼각형: '三角形', 사각형: '四角形', 캡슐형: 'カプセル形', 아몬드형: 'アーモンド形',
  츄어블: 'チュアブル', 제피: 'コーティング', 코팅: 'コーティング', 필름코팅: 'フィルムコーティング', 이중: '二層', 서방형: '徐放性',
  연질캡슐: 'ソフトカプセル', 경질캡슐: 'ハードカプセル', 연질캅셀: 'ソフトカプセル', 경질캅셀: 'ハードカプセル', 캡슐: 'カプセル', 캅셀: 'カプセル',
  제피정제: 'コーティング錠', 코팅정제: 'コーティング錠', 정제: '錠剤', 정: '錠剤',
  젤리: 'ゼリー', 액상: '液状', 액제: '液剤', 분말: '粉末', 과립: '顆粒', 환: '丸', 시럽: 'シロップ',
  분말스틱: '粉末スティック', 바: 'バー', 필름: 'フィルム',
  입자성이있는: '粒子感のある', 점조성이있는: '粘稠な', 점조성: '粘稠', 유동성: '流動性',
  내용물을포함한: '内容物を含む', 분말을포함한: '粉末を含む', 액상제품: '液状製品', 제품: '製品',
  불투명한: '不透明', 반투명한: '半透明', 이중정제: '二層錠', 츄어블정제: 'チュアブル錠',
  연질캡슐제: 'ソフトカプセル剤', 경질캡슐제: 'ハードカプセル剤', 연질캅셀제: 'ソフトカプセル剤', 경질캅셀제: 'ハードカプセル剤',
  경질캡: 'ハードカプセル', 연질캡: 'ソフトカプセル', 하드캡슐: 'ハードカプセル', 소프트캡슐: 'ソフトカプセル',
  장용성: '腸溶性', 장용: '腸溶', 원형정제: '円形錠', 장방형정제: '長方形錠', 타원형정제: '楕円形錠',
  직사각형: '長方形', 물고기모양: '魚形', 하트모양: 'ハート形', 별모양: '星形', 튜브형: 'チューブ形',
  클로버모양: 'クローバー形', 곰모양: 'クマ形', 달모양: '月形', 해모양: '太陽形', 공모양: '球形',
  농축액: '濃縮液', 농축액상: '濃縮液状', 과립상: '顆粒状', 분말상: '粉末状', 유상: '油状',
  묽은: '希薄な', 걸쭉한: '粘稠な', 현탁액: '懸濁液', 페이스트: 'ペースト状', 겔상: 'ゲル状', 겔: 'ゲル',
  분말이든: '粉末を含む', 과립이든: '顆粒を含む', 액상이든: '液状の内容物を含む', 내용물을담은: '内容物を含む',
  구미: 'グミ', 구미젤리: 'グミゼリー', 츄어블연질캡슐: 'チュアブルソフトカプセル', 스틱: 'スティック', 포: '包',
  과립제: '顆粒剤', 산제: '散剤', 정제제: '錠剤', 식물성: '植物性', 입자성의: '粒子感のある',
  이중코팅정제: '二層コーティング錠', 투명제피정제: '透明コーティング錠', 제피과립: 'コーティング顆粒',
  코팅된: 'コーティングされた', 장용성코팅된: '腸溶性コーティングされた', 반구형: '半球形', 정방형: '正方形',
  투명제피: '透明コーティング', 츄어블정: 'チュアブル錠', 정제제품: '錠剤製品', 액상제: '液剤',
  장원형: '長楕円形', 고체상: '固体状', 무광택의: '無光沢の', 무광택: '無光沢', 여러가지: 'さまざまな',
  다양한형태의: 'さまざまな形態の', 동물모양: '動物形', 이중제피정제: '二層コーティング錠', 제품임: '製品', 농축액제품: '濃縮液製品',
  /* `타원형의 연질캡슐` 처럼 조사가 끼는 표기. 의미가 없으므로 자리만 흡수한다. */
  의: 'の', 인: '', 임: '', 으로된: '', 로된: '',
};
const FORM = {};
for (const [k, v] of Object.entries(FORM_RAW)) FORM[k] = v;
const FORM_KEYS = Object.keys(FORM).sort((a, b) => b.length - a.length);
function formCompose(t) {
  const s = t.replace(/\s+/g, '');
  if (!s || !/[가-힣]/.test(s)) return null;
  let i = 0, out = '';
  outer: while (i < s.length) {
    for (const k of FORM_KEYS) {
      if (s.startsWith(k, i)) { out += FORM[k]; i += k.length; continue outer; }
    }
    return null;
  }
  return out;
}

const LIMIT_JA = { 이상: '以上', 이하: '以下', 미만: '未満', 초과: '超過', 이내: '以内' };

const ATOM_MEMO = new Map();
function resolveAtom(t, depth = 0) {
  /* 성상 문구는 수식이 겹겹이 쌓여 5단을 넘는다. 메모가 있으므로 비용은 선형이다(ZH 트랙 교훈). */
  if (depth > 8) return null;
  const t0 = norm(t);
  if (!t0) return null;
  const mk = `${depth} ${t0}`;
  if (ATOM_MEMO.has(mk)) return ATOM_MEMO.get(mk);
  const r0 = resolveAtomRaw(t0, depth);
  ATOM_MEMO.set(mk, r0);
  return r0;
}
function resolveAtomRaw(t0, depth) {
  /* 한글이 없는 조각(수치·단위·로마자·기호)은 번역 대상이 아니다. 원문 표기를 그대로 둔다. */
  if (!/[가-힣]/.test(t0)) return t0;
  /* 수치 문맥의 `이상` 은 하한(以上)이다. 일반 경로는 이 자리를 안전 문맥의 `이상`(異常)으로 옮겨
     부등호 방향을 뒤집는다(`80 이상 120 이하` → `80異常120以下`). 규격 수치 문형으로 **확정될 때만**
     선행 처리해 그 오역을 막는다 — 매칭이 실패하면 아무것도 바꾸지 않고 기존 경로로 내려간다.
     (WO-…-STRUCTURED-COMPRESSION §1 / §6 기준·규격 수치와 범위 보존) */
  if (/[\d%]\s*이상/.test(t0)) {
    const v = specValueCore(t0);
    if (v) return v;
    /* 값 표현 안에 **하한·상한이 짝을 이룬 수치 범위**가 있으면 그 `이상` 은 하한이다.
       (`… 4.00ug/800mg의 80% 이상 ~ 190% 이하`) 짝이 없으면(안전 문맥의 `이상사례` 등)
       이 규칙은 발동하지 않는다 — 두 수치와 종결어(이하/미만)를 모두 요구하기 때문이다. */
    /* 앞부분에 괄호가 있으면 이 규칙을 쓰지 않는다 — 괄호 안 표기는 일반 조합 경로에서
       괄호가 소실될 수 있다(`表示量（94.5 mg/3,000 mg）` → `表示量94.5mg/3,000 mg)`).
       괄호가 있는 형태는 위의 specValueCore 가 문형째로 확정한다. */
    const rg = /[(（]/.test(t0) ? null : NUM_RANGE.exec(t0);
    if (rg) {
      const head = rg[1].trim() ? resolveAtom(rg[1].trim(), depth + 1) : '';
      const tail = rg[7].trim() ? resolveAtom(rg[7].trim(), depth + 1) : '';
      if (head !== null && tail !== null) {
        const sep = /[~〜～]/.test(rg[0]) ? '〜' : '';
        return `${head}${rg[2]}${rg[3]}以上${sep}${rg[4]}${rg[5]}${rg[6] === '이하' ? '以下' : '未満'}${tail}`;
      }
    }
  }
  const hit = lookup(null, t0);
  if (hit) return hit.ja;
  /* `세 균 수` `성 상` — 기준·규격 표에서 자간을 벌린 표기. */
  if (/[가-힣]\s+[가-힣]/.test(t0)) {
    const sq = lookup(null, t0.replace(/\s+/g, ''));
    if (sq) return sq.ja;
  }
  /* `(4) 붕해시험 : …` `③ 대장균군 : …` `1. 직사광선을 피하여 …` — 공식 주의·규격 표의 항목 번호.
     번호는 원문 순서 그대로 두고 본문만 옮긴다. 번호를 지우면 항목 대응이 깨진다(§6 구조 보존). */
  {
    /* 번호는 반드시 구분 기호(`)` `.` `]`)를 달고 있거나 동그라미 숫자여야 한다.
       맨숫자를 번호로 보면 `1일 1회` 의 `1` 까지 떼어내 섭취 표기를 망가뜨린다(§6 수치·단위 보존). */
    const mn = /^((?:[([]\s*\d{1,2}\s*[).\]]|\d{1,2}\s*[).\]]|[①-⑳㉑-㉟])\s*)(.+)$/.exec(t0);
    /* `5.0 이하` 처럼 번호가 아니라 수치인 경우를 가로채지 않는다 — 뒤쪽이 숫자로 시작하면 소수점·범위이지
       항목 번호가 아니다. 값이 쪼개지면 §6 수치 보존을 깬다. */
    if (mn && /[가-힣]/.test(mn[2]) && !/^\d/.test(mn[2])) {
      const a = resolveAtom(mn[2].trim(), depth + 1);
      if (a) return `${mn[1].replace(/\s+$/, '')} ${a}`;
    }
  }
  /* 문장이 둘 이상 이어붙은 조각(`… 보관하십시오. … 주의하십시오.`). 공식 주의·보관 문구는
     문장 단위로 독립적이므로 문장별로 옮기고 원래 순서대로 다시 잇는다. 하나라도 실패하면 통째로 실패시킨다 —
     일부만 일본어로 바뀐 혼합 문장을 만들지 않기 위해서다(§6 번역 슬롯 내 한국어 잔존 금지). */
  {
    const parts = t0.split(/(?<=[.。!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((s) => s.length > 1)) {
      const outs = parts.map((s) => resolveAtom(s, depth + 1));
      if (outs.every(Boolean)) return outs.join(' ');
    }
  }
  /* `1일 1회 1회 1포 — 매일 챙기기 쉽게` — KO 저작기가 붙이는 섭취 배지. 앞은 공식 섭취 표기다. */
  {
    const mb = /^(.+?)\s*[—–]\s*매일\s*챙기기\s*쉽게$/.exec(t0);
    if (mb) { const a = resolveAtom(mb[1].trim(), depth + 1); if (a) return `${a} — 毎日続けやすく`; }
  }
  /* 한글이 배수 접미사뿐인 조각(`300,000,000,000(3,000억) CFU/g`). 값·단위는 그대로 둔다. */
  if (/^[^가-힣]*(?:[억만천][^가-힣]*)+$/.test(t0))
    return t0.replace(/억/g, '億').replace(/만/g, '万').replace(/천/g, '千');
  /* `깅콜릭산(ginkgolic acid)(mg/kg)` — 뒤에 붙는 별칭·단위 괄호. */
  {
    const pm = /^(.+?)((?:\s*[([]\s*[^()[\]가-힣]*\s*[)\]])+)$/.exec(t0);
    if (pm && /[가-힣]/.test(pm[1])) {
      const a = resolveAtom(pm[1].trim(), depth + 1);
      if (a) return a + pm[2].replace(/^\s+/, '').replace(/\s*([([])\s*/g, '$1');
    }
  }
  /* `리스펙타(Respecta®)[프로바이오틱스 등 복합물](제2019-26호)` — 개별인정 원료 라벨.
     원료명 뒤에 상표·복합물 설명·인정번호가 괄호/대괄호로 연달아 붙는다. 괄호 종류와 순서를 그대로 두고
     안쪽에 한글이 있는 것만 옮긴다 — 순서가 바뀌면 인정 대상이 어느 원료인지가 흐려진다(§6 귀속 보존). */
  {
    const gm = /^(.+?)((?:\s*[([][^()[\]]*[)\]])+)$/.exec(t0);
    if (gm && /[가-힣]/.test(gm[1])) {
      const head = resolveAtom(gm[1].trim(), depth + 1);
      const groups = gm[2].match(/[([][^()[\]]*[)\]]/g) ?? [];
      const outs = head ? groups.map((p) => {
        const inner = p.slice(1, -1).trim();
        if (!/[가-힣]/.test(inner)) return `${p[0]}${inner}${p[p.length - 1]}`;
        const r = resolveAtom(inner, depth + 1);
        return r ? `${p[0]}${r}${p[p.length - 1]}` : null;
      }) : [];
      if (head && outs.length && outs.every(Boolean)) return head + outs.join('');
    }
  }
  /* 순수 수치 토큰. 값·단위는 그대로 두고 표기만 일본어로 옮긴다(값 동일). */
  if (NUMTOK.test(t0)) return t0.replace(/\s+/g, '').replace(/억/g, '億').replace(/만/g, '万').replace(/천/g, '千')
    .replace(/정$/, '錠').replace(/(?:캡슐|캅셀)$/, 'カプセル').replace(/포$/, '包').replace(/병$/, '瓶')
    .replace(/알$/, '粒').replace(/매$/, '枚').replace(/개$/, '個').replace(/회$/, '回')
    .replace(/(?:스푼|스픈)$/, 'スプーン').replace(/일$/, '日');
  /* `진세노사이드 Rg1, Rb1 및 Rg3의 합계로서 3~80 mg` — 지표성분 합계 표기.
     합계는 열거 전체에 걸린다. 분해 규칙보다 먼저 처리해 귀속을 마지막 원료로 좁히지 않는다(§6). */
  let mS;
  if ((mS = /^([^:：]+?)(?:으로서|로서)\s+([^:：]+)$/.exec(t0))) {
    const a = resolveAtom(mS[1].trim(), depth + 1), b = resolveAtom(mS[2].trim(), depth + 1);
    if (a && b) return `${a}として${b}`;
  }
  if ((mS = /^(.+?)의\s*(?:합계|합)$/.exec(t0))) { const a = resolveAtom(mS[1].trim(), depth + 1); if (a) return `${a}の合計`; }
  const d = dosage(t0); if (d) return d;
  const ia = ingredientAmount(t0); if (ia) return ia;
  const p = paren(t0); if (p) return p;
  const lc = labelColon(t0); if (lc) return lc;
  const dc = doseChain(t0); if (dc) return dc;
  const ik = intake(t0); if (ik) return ik;
  const fn = functionNutrient(t0, depth); if (fn) return fn;
  const hc = headingCompose(t0, depth); if (hc) return hc;
  /* `… 보관하십시오. 2) 어린이의 손이 …` — 한 슬롯에 여러 문장. 항목 번호 표기는 원문 그대로 둔다. */
  if (/[.]\s+\S/.test(t0)) {
    const parts = t0.split(/(?<=[^0-9][.])\s+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1 && parts.length <= 8) {
      const zs = parts.map((pp) => {
        const mm = /^(\(\d+\)|\d+\)|[①-⑳⑴-⑽]|\d+[.])\s*(.+)$/.exec(pp);
        const r = resolveAtom(mm ? mm[2].trim() : pp, depth + 1);
        return r === null ? null : (mm ? `${mm[1]} ${r}` : r);
      });
      if (zs.every(Boolean)) return zs.join(' ');
    }
  }
  /* 푸터·각주는 ` · ` / ` * ` (공백 포함) 로 조각이 이어진다. */
  if (SPACED.test(t0)) {
    const sp = splitTop(t0, SPACED);
    const parts = sp.parts;
    const seps = sp.seps.map((x) => (x.includes('*') ? ' * ' : ' · '));
    if (parts.length > 1 && parts.every(Boolean)) {
      const ja = parts.map((s) => resolveAtom(s, depth + 1));
      if (ja.every(Boolean)) return ja.map((s, i) => (i ? seps[i - 1] + s : s)).join('');
    }
  }
  const co = /^(.+?)\s*[:：]$/.exec(t0);
  if (co) { const a = resolveAtom(co[1].trim(), depth + 1); if (a) return `${a}：`; }
  const st = /^([*※])\s*(.+)$/.exec(t0);
  if (st) { const a = resolveAtom(st[2].trim(), depth + 1); if (a) return `${st[1]} ${a}`; }
  const sc = sentenceCompose(t0, depth); if (sc) return sc;
  const fc = fragmentCompose(t0, depth); if (fc) return fc;
  /* 여러 문장이 이어진 슬롯. 한국어 종결 어미 뒤에서만 나눠 수치 소수점과 구분한다. */
  {
    const SENT_RE = /(?<=[다요오][.])\s*(?=\S)/;
    if (SENT_RE.test(t0)) {
      const ss = t0.split(SENT_RE).map((s) => s.trim()).filter(Boolean);
      if (ss.length > 1) {
        const jas = ss.map((s) => ja(null, s)).map((r) => r && r.ja);
        if (jas.every(Boolean)) return jas.map((s) => (/[。！？.:：)）]$/.test(s) ? s : `${s}。`)).join('');
      }
    }
  }
  if (/[.]\s+\S/.test(t0)) {
    const ss = t0.split(/(?<=[.])\s+/).map((s) => s.trim()).filter(Boolean);
    if (ss.length > 1) {
      const jas = ss.map((s) => resolveAtom(s, depth + 1));
      if (jas.every(Boolean)) return jas.join('');
    }
  }
  /* `2g당 1억 CFU 이상` — 기준·규격 표기. 수치는 원문 토큰을 그대로 옮긴다. */
  let m2;
  if ((m2 = /^(.+?)\s*당\s*(.+?)\s*(이상|이하|미만|초과)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}当たり${b}${LIMIT_JA[m2[3]]}`;
  }
  if ((m2 = /^(.+?)\s*당\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}当たり${b}`;
  }
  if ((m2 = /^(.+?)\s*(이하|이상|미만|초과|이내)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return a + LIMIT_JA[m2[2]];
  }
  /* `60분` `12개월` — 시간 단위. */
  if ((m2 = /^(\d+(?:[.,]\d+)*)\s*(분|시간|초|주|개월|년|일)$/.exec(t0)))
    return m2[1] + { 분: '分', 시간: '時間', 초: '秒', 주: '週', 개월: 'ヶ月', 년: '年', 일: '日' }[m2[2]];
  if ((m2 = /^(\d[\d.,]*)\s*(억|만|천)$/.exec(t0)))
    return m2[1] + { 억: '億', 만: '万', 천: '千' }[m2[2]];
  /* `표시량(2.55mg/500mg)의 80~150%` — 뒤가 순수 수치면 앞만 옮긴다. */
  if ((m2 = /^(.+?)의\s*([^가-힣]+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}の${m2[2].trim()}`;
  }
  if ((m2 = /^\[(.+)\]$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `[${a}]`; }
  if ((m2 = /^\((.+)\)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `（${a}）`; }
  if ((m2 = /^[-–]\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `- ${a}`; }
  if ((m2 = /^(.+?)\s*제품$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}製品`; }
  if ((m2 = /^(.+?)의\s*(기능성|영양기능)은\s*아래\s*공식\s*인정\s*범위와\s*같습니다[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}の${m2[2] === '기능성' ? '機能性' : '栄養機能'}は下記の公式認定範囲のとおりです。`;
  }
  if ((m2 = /^([^([{｛（〔［]+)[([{｛（〔［](.+)[)\]}｝）〕］]\s*의\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1), c2 = resolveAtom(m2[3].trim(), depth + 1);
    if (a && b && c2) return `${a}（${b}）の${c2}`;
  }
  if ((m2 = /^([^([{｛（〔［]+)[([{｛（〔［](.+)[)\]}｝）〕］]$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}（${b}）`;
  }
  const ap = appearance(t0, depth); if (ap) return ap;
  /* `1일 1회(1캡슐) 섭취로 루테인 20mg` — 섭취 단위당 표시량. */
  if ((m2 = /^(.+?)\s*섭취로\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}の摂取で${b}`;
  }
  /* `36 mg/1일 섭취량` — 기준량 표기의 슬래시. 표기는 그대로 둔다. */
  if (t0.includes('/')) {
    const sl = t0.split('/').map((x) => x.trim());
    if (sl.length > 1 && sl.every(Boolean)) {
      const zs = sl.map((x) => resolveAtom(x, depth + 1));
      if (zs.every((x) => x !== null)) return zs.join('/');
    }
  }
  if ((m2 = /^(.+)의\s*합$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}の合計`; }
  /* 성분 기호 뒤의 연결어(`Rg1과 Rb1`, `Rb1 및 Rg3`). 좌변이 기호·숫자로 끝날 때만 적용한다. */
  if ((m2 = /^(.+?[A-Za-z0-9])\s*(과|와|및)\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[3].trim(), depth + 1);
    if (a && b) return `${a}${m2[2] === '및' ? 'および' : 'と'}${b}`;
  }
  /* ── 보관 조건·유통기한 ──────────────────────────────────────── */
  if ((m2 = /^(본\s*)?제품은\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[2].trim(), depth + 1);
    if (a) return `本製品は${a}`;
  }
  if ((m2 = /^(.+?)[을를]?\s*(?:피하여|피하고|피해서|피해|피하)\s*[,，]?\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}を避けて、${b}`;
  }
  {
    const KEEP_END = '(?:하십시오|하세요|하시기\\s*바랍니다|하여야\\s*한다|해야\\s*한다|하여야\\s*함|해야\\s*함|한다|합니다|해\\s*주십시오|해주세요|할\\s*것)?';
    const KEEP_RE = new RegExp(`^(.+?)(?:에서|에)\\s*(?:보관|보존)\\s*(?:[,，]?\\s*(?:및\\s*)?유통)?\\s*${KEEP_END}\\s*[.]?$`);
    if ((m2 = KEEP_RE.exec(t0))) {
      const a = resolveAtom(m2[1].trim(), depth + 1);
      if (a) return /유통/.test(m2[0].slice(m2[1].length)) ? `${a}で保管・流通してください。` : `${a}で保管してください。`;
    }
    const CONT_RE = new RegExp('^(.+?)(?:에서|에)\\s*(?:보관|보존)\\s*(?:[,，]?\\s*(?:및\\s*)?유통)?\\s*(?:하시고|하고|하시며|하며)\\s*[,，]?\\s*(.+)$');
    if ((m2 = CONT_RE.exec(t0))) {
      const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
      if (a && b) return `${a}で${/유통/.test(t0.slice(m2[1].length, t0.length - m2[2].length)) ? '保管・流通し' : '保管し'}、${b}`;
    }
  }
  /* `제2018-4호` — 개별인정 번호. 번호는 원문 그대로 둔다(§6). */
  if ((m2 = /^제\s*([\d‐-―-]+)\s*호$/.exec(t0))) return `第${m2[1]}号`;
  /* `2g = 1포 = 하루 섭취량` — 등가 표기. */
  if (/\s=\s/.test(t0)) {
    const ps = t0.split(/\s*=\s*/).map((s) => s.trim()).filter(Boolean);
    if (ps.length > 1) {
      const zs = ps.map((s) => resolveAtom(s, depth + 1));
      if (zs.every(Boolean)) return zs.join(' = ');
    }
  }
  /* `(가) … (나) …` — 기능성 항목의 병렬 표기. 순서를 유지해 일본어 열거 기호로 옮긴다. */
  if (/[(（][가나다라마바사][)）]/.test(t0) && t0.split(/(?=[(（][가나다라마바사][)）])/).length > 2) {
    const ps = t0.split(/(?=[(（][가나다라마바사][)）])/).map((s) => s.trim()).filter(Boolean);
    const zs = ps.map((s) => { const r = ja(null, s); return r && r.ja; });
    if (zs.every(Boolean)) return zs.join(' ');
  }
  if ((m2 = /^제조일(?:로\s*|)부터\s*(.+?)\s*(까지)?[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `製造日から${a}${m2[2] ? 'まで' : ''}`;
  }
  if ((m2 = /^(.+?)\s*까지$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}まで`; }
  /* `코스맥스바이오(주) 제조` — 제조사 법인명은 고유명사다. 일본어 상호를 지어내지 않는다. */
  if ((m2 = /^(.{1,32}?)\s*제조$/.exec(t0)) && !/(시설|설비|공법|사용|천연|원료|업체|제품|하여|합니다|되었|중인)/.test(m2[1])
    && /(주\)|\(주|주식회사|유한회사|㈜|공장|사업소)/.test(m2[1]))
    return `${m2[1].replace(/\s+/g, ' ').trim()} 製造`;
  /* ── 기준·규격 표기 ──────────────────────────────────────────── */
  if ((m2 = /^(.+?)\s*(이하|이상|미만|초과|이내)\s*(?:이어야|이여야)\s*한다[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}${LIMIT_JA[m2[2]]}であること。`;
  }
  if ((m2 = /^(.+?(?:이하|이상|미만|초과|이내))\s*[.]$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return period(a);
  }
  if ((m2 = /^([^가-힣]+)\s*당$/.exec(t0))) return `${m2[1].replace(/\s+/g, '')}当たり`;
  if ((m2 = /^(.+?)\s*중\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}中${b}`;
  }
  if ((m2 = /^(.+?)[을를]?\s*사용한\s*경우$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}を使用した場合`;
  }
  /* 붕해 시험의 판정. */
  if ((m2 = /^물을\s*시험액으로\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `水を試験液として${a}`; }
  if ((m2 = /^물에서\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `水中で${a}`; }
  if ((m2 = /^제\s*(\d+)\s*액에서\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `第${m2[1]}液で${a}`; }
  if ((m2 = /^(\d+)\s*액에서\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `第${m2[1]}液で${a}`; }
  if ((m2 = /^제?\s*(\d+)\s*액\s+(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `第${m2[1]}液${a}`; }
  if ((m2 = /^(\d+)\s*차\s+(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `第${m2[1]}次${a}`; }
  if ((m2 = /^(.+?)\s*(적합|붕해|확인|검출)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return a + { 적합: '適合', 붕해: '崩壊', 확인: '確認', 검출: '検出' }[m2[2]];
  }
  if ((m2 = /^(.+?)\s*(함량|비율|함유량|활성)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return a + { 함량: '含量', 비율: '割合', 함유량: '含量', 활성: '活性' }[m2[2]];
  }
  if ((m2 = /^(.+?[가-힣])\s*수$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}数`; }
  if ((m2 = /^(.+?)(?:으로서|로서)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}として`; }
  if ((m2 = /^[(（]([^()（）]+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `（${a}`; }
  if ((m2 = /^([^()（）]+)[)）]$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}）`; }
  if ((m2 = /^(.+?)\s+(제\s*[\d.]+.*)$/.exec(t0)) && !/[가-힣]/.test(m2[2].replace(/^제/, ''))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a} 第${m2[2].replace(/^제\s*/, '')}`;
  }
  if ((m2 = /^([^가-힣]+)\s*[(（](.+)[)）]$/.exec(t0))) {
    const a = resolveAtom(m2[2].trim(), depth + 1);
    if (a) return `${m2[1].trim()}（${a}）`;
  }
  if ((m2 = /^[(（]([^()（）]+)[)）]\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `（${a}）${b}`;
  }
  /* ── 서술부 ────────────────────────────────────────────────────
     공식 기능성·주의사항 문구는 앞의 명사구만 다르고 서술부는 유한한 몇 가지로 반복된다.
     서술부를 규칙으로 두면 명사구 사전 한 줄이 문장 수십 개를 연다. 앞부분이 해석되지
     않으면 전체를 실패로 돌린다 — 반쪽 번역 금지(§6). */
  /* `혈압이 높은 사람에게 도움을 줄 수 있음` — 수혜 대상은 `에게` 로 온다. */
  if ((m2 = /^(.+?)에게\s*(?:도움을\s*줄\s*수\s*있(?:음|습니다)|도움을\s*줌|도움이\s*됨|도움)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}に役立つ`;
  }
  if ((m2 = /^(.+?)에\s*(?:도움을\s*줄\s*수\s*있(?:음|습니다)|도움을\s*줌|도움이\s*됨|도움)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}に役立つ`;
  }
  if ((m2 = /^(.+?)에\s*(?:필요함?|관여함?|기여함?)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}に${{ 필요: '必要', 필요함: '必要', 관여: '関与', 관여함: '関与', 기여: '寄与', 기여함: '寄与' }[/(필요함?|관여함?|기여함?)/.exec(t0.replace(/[.]$/, ''))[1]]}`;
  }
  /* 앞에 주제 표지(`~은/는`)가 있으면 `X에 주의` 는 문장 전체가 아니라 뒷절이다.
     통째로 잡으면 주어절이 목적어로 둔갑한다 — 주제절 규칙에 넘긴다. */
  if ((m2 = /^(.+?)에\s*주의[.]?$/.exec(t0)) && !/[은는]\s/.test(m2[1])) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}に注意`;
  }
  /* `… 섭취할 것` / `… 상담하십시오.` — 어간은 한자어 명사이므로 종결 어미만 갈아끼운다. */
  const VSTEM = {
    섭취: '摂取', 상담: '相談', 상의: '相談', 주의: '注意', 보관: '保管', 확인: '確認', 중단: '中止',
    준수: '遵守', 문의: 'お問い合わせ', 복용: '服用', 사용: '使用', 참고: '参考', 실시: '実施',
    유의: '留意', 관리: '管理', 조절: '調節', 병용: '併用', 유통: '流通', 소비: '消費', 파손: '破損',
    보존: '保存', 취급: '取り扱い', 개봉: '開封', 밀봉: '密封', 희석: '希釈', 차단: '遮断',
    결정: '決定', 발생: '発生', 관찰: '観察', 음용: '飲用', 폐기: '廃棄', 냉장보관: '冷蔵保管',
    실온보관: '常温保管', 냉동보관: '冷凍保管',
    흡습: '吸湿', 인습: '吸湿', 변질: '変質', 변색: '変色', 방치: '放置', 노출: '露出',
    저해: '阻害', 억제: '抑制', 촉진: '促進', 지도: '指導', 섭취보관: '摂取・保管',
    /* 공식 기능성 서술에 쓰이는 동사성 명사. `유지` 는 문맥상 `維持` 다 —
       원료명 안의 `함유 유지`(油脂)와 표기가 같으므로 사전에서 낱말로 두지 않고 여기서만 푼다(§6). */
    유지: '維持', 개선: '改善', 향상: '向上', 증진: '増進', 감소: '減少', 흡수: '吸収',
    이용: '利用', 형성: '形成', 생성: '生成', 배출: '排出', 완화: '緩和', 보호: '保護',
    합성: '合成', 분해: '分解', 공급: '供給', 제거: '除去', 대사: '代謝', 활성화: '活性化',
    과량섭취: '過量摂取', 함유: '含有', 증식: '増殖', 유지관리: '維持管理',
    응고: '凝固', 지연: '遅延', 저하: '低下', 상승: '上昇', 축적: '蓄積', 손상: '損傷',
    작용: '作用', 조성: '造成', 순환: '循環', 성장: '成長', 재생: '再生', 침착: '沈着',
  };
  /* 부정 명령(`섭취하지 마십시오`). 긍정형보다 먼저 본다. */
  if ((m2 = /^(.*?)([가-힣]{2,5})하지\s*(마십시오|마세요|마시기\s*바랍니다|말\s*것|않는다|않도록\s*할\s*것)[.]?$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}${VSTEM[m2[2]]}し${/말\s*것|않는다|않도록/.test(m2[3]) ? 'ないこと' : 'ないでください'}`;
  }
  /* `밀봉하여 보관하십시오` / `확인하고 섭취하십시오` — 선행 동작 + 본동작. */
  if ((m2 = /^(.*?)([가-힣]{2,5})(?:하여|하고|하신\s*뒤|한\s*뒤)\s+(.+)$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    const b = resolveAtom(m2[3].trim(), depth + 1);
    if (head !== null && b) return `${head}${VSTEM[m2[2]]}して${b}`;
  }
  if ((m2 = /^(.*?)([가-힣]{2,5})하여야\s*(?:한다|합니다|함)[.]?$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}${VSTEM[m2[2]]}しなければならない`;
  }
  if ((m2 = /^(.*?)([가-힣]{2,5})한다[.]?$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}${VSTEM[m2[2]]}する`;
  }
  /* 권유·권장 표현. */
  if ((m2 = /^(.*?)([가-힣]{2,5})하는\s*것이\s*좋습니다[.]?$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}${VSTEM[m2[2]]}することが望ましいです`;
  }
  if ((m2 = /^(.*?)피하는\s*것이\s*좋습니다[.]?$/.exec(t0))) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}避けることが望ましいです`;
  }
  if ((m2 = /^(.*?)([가-힣]{2,5})(?:할|하실)\s*것을\s*권장(?:드립니다|합니다)[.]?$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}${VSTEM[m2[2]]}することをお勧めします`;
  }
  if ((m2 = /^(.+?)[을를]\s*권장(?:드립니다|합니다)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}をお勧めします`;
  }
  /* `드십시오` 계열 — 섭취의 경어 표현. */
  if ((m2 = /^(.*?)드시지\s*(?:마십시오|마세요)[.]?$/.exec(t0))) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}召し上がらないでください`;
  }
  if ((m2 = /^(.*?)드(?:십시오|세요|시기\s*바랍니다|시길\s*바랍니다)[.]?$/.exec(t0))) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}お召し上がりください`;
  }
  /* 종결 어미 변형이 원문마다 다르다(`하십시요` 같은 원문 오타 포함). 어간이 같으면 같은 문장이다. */
  if ((m2 = /^(.*?)([가-힣]{2,5})\s*(할\s*것|하여야\s*함|해야\s*함|하십시오|하십시요|하시기\s*바랍니다|하시길\s*바랍니다|하세요|해\s*주십시오|하여\s*주십시오|하여\s*주시기\s*바랍니다|해\s*주시기\s*바랍니다|하여\s*주세요|하시오)[.]?$/.exec(t0))
      && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}${VSTEM[m2[2]]}${/할\s*것|하여야\s*함|해야\s*함/.test(m2[3]) ? 'すること' : 'してください'}`;
  }
  if ((m2 = /^(.*?)(?:피할\s*것|피하여야\s*함)[.]?$/.exec(t0))) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}避けること`;
  }
  if ((m2 = /^(.*?)(?:피하십시오|피하시기\s*바랍니다)[.]?$/.exec(t0))) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}避けてください`;
  }
  /* `공기 중에 방치하거나 다른 용기에 옮기지 마십시오` — 병렬 동작. */
  if ((m2 = /^(.*?)([가-힣]{2,5})하거나\s+(.+)$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    const b = resolveAtom(m2[3].trim(), depth + 1);
    if (head !== null && b) return `${head}${VSTEM[m2[2]]}したり${b}`;
  }
  /* `흡습되지 않게 밀봉하여 보관하십시오` — 부정 목적절. */
  if ((m2 = /^(.*?)([가-힣]{2,5})(?:되|하)지\s*않(?:게|도록)\s*[,，]?\s*(.+)$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    const b = resolveAtom(m2[3].trim(), depth + 1);
    if (head !== null && b) return `${head}${VSTEM[m2[2]]}しないよう${b}`;
  }
  /* `직사광선을 피하여 서늘한 곳에 보관` — 회피 동작 + 본동작. */
  if ((m2 = /^(.+?)[을를]?\s*피(?:하여|하고|해)\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}を避けて${b}`;
  }
  /* 존대 관형(`알레르기 체질이신 경우` `약물 복용 중이신 분은`). 대상 한정이므로 조건절로 옮긴다. */
  if ((m2 = /^(.+?)(?:이신|인|이거나)\s*(?:경우|분|사람)(?:은|는|께서는|께서)?\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}の方は${b}`;
  }
  if ((m2 = /^(.+?)(?:이신|인)\s*(?:경우|분|사람)(?:은|는)?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}の方`;
  }
  if ((m2 = /^(.+?)[이가]\s*있(?:는|으신)\s*(?:사람|분|자)(?:은|는|께서는)?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}のある方`;
  }
  /* `A이거나 B` — 선택 조건. `A 또는 B` 와 같은 뜻이므로 같은 접속으로 옮긴다. */
  if ((m2 = /^(.+?)이거나\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}または${b}`;
  }
  if ((m2 = /^(.+?)\s*(?:또는|혹은)\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}または${b}`;
  }
  /* `섭취량 및 섭취방법` — 병렬. 기능성 문구의 원료 귀속을 흐리지 않도록 양쪽 모두 해석돼야 한다(§6). */
  if ((m2 = /^(.+?)\s*및\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}および${b}`;
  }
  /* `개인에 따라` `신체상태에 따라` — 조건 부사절. */
  if ((m2 = /^(.+?)에\s*따라\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}によって${b}`;
  }
  if ((m2 = /^(.+?)(?:으)?로\s*인해\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}により${b}`;
  }
  if ((m2 = /^(.+?)\s*후에는\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}後は${b}`;
  }
  /* `상처를 입을 위험이 있고, 내용물이 흘러나올 수 있으므로` — 앞절 연결. */
  if ((m2 = /^(.+?)[이가]\s*있고[,，]?\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}があり、${b}`;
  }
  /* `목에 걸릴 우려가 있으니 보호자의 지도하에 섭취하십시오` — 우려·위험 조건. */
  if ((m2 = /^(.+?)\s*(?:우려|위험)[이가]?\s*있으(?:니|므로)[,，]?\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}おそれがありますので、${b}`;
  }
  if ((m2 = /^(.+?)[을를]?\s*(저해|방해|억제|촉진)할\s*수도?\s*있(?:음|습니다)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    const V = { 저해: '阻害', 방해: '妨げ', 억제: '抑制', 촉진: '促進' }[m2[2]];
    if (a) return `${a}を${m2[2] === '방해' ? '妨げる' : `${V}する`}こと${/습니다/.test(t0) ? 'があります' : 'がある'}`;
  }
  if ((m2 = /^(.+?)[이가]?\s*될\s*수\s*있(?:음|습니다)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}になること${/습니다/.test(t0) ? 'があります' : 'がある'}`;
  }
  /* ── 공식 기능성 서술 `~하는 데 도움을 줄 수 있음` ────────────────
     기능성 문구의 표준형이다. 목적(`~하는 데`)과 서술(`도움`·`필요`)을 분리해 옮기고,
     앞 명사구가 해석되지 않으면 전체를 실패로 돌린다 — 기능성 추가·축소 금지(§6). */
  if ((m2 = /^(.*?)([가-힣]{2,6})(하|되)는\s*데[에]?\s*(?:도움을\s*줄\s*수\s*있(?:음|습니다)|도움을\s*줌|도움이\s*됨|도움|필요함?|관여함?|기여함?)[.]?$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    const tailKo = /(필요|관여|기여)/.exec(t0.replace(/[.]$/, ''));
    const tail = tailKo ? { 필요: 'に必要', 관여: 'に関与', 기여: 'に寄与' }[tailKo[1]] : 'のに役立つ';
    if (head !== null) return `${head}${VSTEM[m2[2]]}${m2[3] === '되' ? 'される' : 'する'}${tailKo ? `の${tail}` : tail}`;
  }
  /* `인이 흡수되고 이용되는데 필요` — 나열된 수동 동작. 앞 동작을 중지형으로 잇는다. */
  if ((m2 = /^(.*?)([가-힣]{2,6})되고[,，]?\s+(.+)$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    const b = resolveAtom(m2[3].trim(), depth + 1);
    if (head !== null && b) return `${head}${VSTEM[m2[2]]}され、${b}`;
  }
  /* `확인하시고 섭취하여 주십시오` — 선행 동작(존대). */
  if ((m2 = /^(.*?)([가-힣]{2,6})하시고[,，]?\s+(.+)$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    const b = resolveAtom(m2[3].trim(), depth + 1);
    if (head !== null && b) return `${head}${VSTEM[m2[2]]}し、${b}`;
  }
  /* `자외선에 의한 피부손상` — 원인 수식. */
  if ((m2 = /^(.+?)에\s*의한\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}による${b}`;
  }
  if ((m2 = /^(.+?)(?:으)?로부터\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}から${b}`;
  }
  /* `복용 시 섭취에 주의` `근력 운동 시에 …` — 시점 한정. 어간이 동사성 명사일 때만 `時` 로 읽는다. */
  if ((m2 = /^(.*?[가-힣])\s*시(?:에|에는|는)?\s+(.+)$/.exec(t0)) && /(?:섭취|복용|사용|운동|개봉|보관|취급|음용|조리|투여|구매|선택|발생)$/.test(m2[1].trim())) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    /* `시에` 는 시점 지정(`に`), 그 밖의 `시`·`시는` 은 조건 제시이므로 주제 표지(`は`)를 쓴다.
       조사를 아예 빼면 앞뒤 절이 한 덩어리로 붙어 지시 대상이 흐려진다. */
    if (a && b) return `${a}時${/시에(?!는)/.test(t0) ? 'に' : 'は'}${b}`;
  }
  /* `… 나타나는 경우에는 …` — 조건절. 대상 한정과 달리 사건 조건이므로 `場合` 으로 옮긴다. */
  if ((m2 = /^(.+?)[이가]\s*나타나는\s*경우(?:에는|에|는)?[,，]?\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}が現れる場合は${b}`;
  }
  if ((m2 = /^(.+?)\s*경우(?:에는|에|는|은)?[,，]?\s+(.+)$/.exec(t0)) && !/[이인]$/.test(m2[1].trim())) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}場合は${b}`;
  }
  /* `흡습의 우려가 있으니 …` 같은 조건절이 앞 규칙에서 남긴 `~의` 조각. */
  if ((m2 = /^(.+?)의$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}の`; }
  /* `6세 이하는` — 연령 기준. 수치·부등호 방향을 그대로 옮긴다(§6). */
  if ((m2 = /^(\d+)\s*세\s*(이상|이하|미만|초과)(?:은|는|의)?$/.exec(t0)))
    return `${m2[1]}歳${{ 이상: '以上', 이하: '以下', 미만: '未満', 초과: '超過' }[m2[2]]}`;
  if ((m2 = /^(.+?)[을를]\s*함유(?:합니다|한다|함)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}を含有${/합니다/.test(t0) ? 'します' : 'する'}${/[.]$/.test(t0) ? '。' : ''}`;
  }
  /* ── KO 저작기 템플릿 문장 ──────────────────────────────────
     `를 표시량으로 담았습니다(표시 기준 130mg당). 비타민 D는 …` — 앞의 `<b>함량</b>` 뒤에 붙는
     고정 문장이다. 기준 수치는 그대로 두고 서술만 옮긴다(§6 기준·규격 수치 보존). */
  if ((m2 = /^를\s*표시량으로\s*담았습니다\(표시\s*기준\s*(.+?)당\)\.\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `を表示量として配合しています(表示基準${a}あたり)。${b}`;
  }
  /* `코뉴 제조` — 제조사 표기. 법인명은 원문 표기 유지 계약이므로 해석되지 않으면 그대로 둔다(§6). */
  if ((m2 = /^(.+?)\s*제조$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1) ?? m2[1].trim();
    return `${a}製造`;
  }
  /* `1일 1~2회` — 범위 표기 빈도. 범위 자체가 공식 표기이므로 한쪽으로 좁히지 않는다(§6). */
  if ((m2 = /^(\d+)\s*일\s*(\d+)\s*[~∼-]\s*(\d+)\s*회$/.exec(t0))) return `${m2[1]}日${m2[2]}~${m2[3]}回`;
  /* `특정 질병이 있거나 의약품 복용 시 …` — 절 단위 선택(`~거나`). 두 조건 중 하나라는 뜻을 살린다. */
  if ((m2 = /^(.+?)[이가]\s*있거나[,，]?\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}がある場合や${b}`;
  }
  /* `이상반응 발생` — 명사구 + 동작 명사. `~시`·`~의` 규칙이 떼어낸 앞 조각에서 자주 남는다. */
  if ((m2 = /^(.+?)\s+([가-힣]{2,6})$/.exec(t0)) && VSTEM[m2[2]]) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}の${VSTEM[m2[2]]}`;
  }
  /* `혈액이 정상적으로` — 서술부 규칙이 떼어낸 주어절 조각. 뒤쪽 규칙이 모두 실패한 뒤에만 본다:
     앞에서 걸러야 할 `X이 나타나는 경우`·`X이 될 수 있음` 같은 형태를 가로채지 않기 위해서다. */
  if ((m2 = /^(.+?)[이가]\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}が${b}`;
  }
  /* 목적격 조사만 남은 조각(`섭취를`). 서술부 규칙이 어간을 떼어낸 뒤에 남는다. */
  if ((m2 = /^(.+?)[을를]$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}を`; }
  if ((m2 = /^(.+?)[와과]의\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}との${b}`;
  }
  /* `과량섭취 시 부작용이 있을 수 있음.` — 조건절. */
  if ((m2 = /^(.+?)\s*시\s+(.+)$/.exec(t0)) && !/^\d/.test(m2[2])) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}時は${b}`;
  }
  /* 원문의 문체를 따른다 — 공식 기능성 표기는 `있음`(평서), 주의사항 안내문은 `있습니다`(경어). */
  const CAN = /습니다[.]?$/.test(t0) ? 'ことがあります' : 'ことがある';
  if ((m2 = /^(.+?)[이가]\s*있을\s*수\s*있(?:음|습니다)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}が生じる${CAN}`;
  }
  if ((m2 = /^(.+?)[이가]?\s*나타날\s*수\s*있(?:음|습니다)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}が現れる${CAN}`;
  }
  if ((m2 = /^(.+?)[을를]?\s*(?:유발|초래)할\s*수도?\s*있(?:음|습니다)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}を引き起こす${CAN}`;
  }
  /* `성상 변화 여부 확인` — 시험 판정 표기. */
  if ((m2 = /^(.+?)\s*여부\s*확인$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}の有無を確認`; }
  if ((m2 = /^(.+?)[를을]?\s*실시하여\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}を実施して${b}`;
  }
  if ((m2 = /^(.+?)\s*섭취$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}摂取`; }
  if ((m2 = /^(.+?)[을를]\s*입을\s*수\s*있(?:음|습니다)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}を負うことがある`;
  }
  if ((m2 = /^(.+?)\s*우려가\s*있(?:음|습니다)[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}おそれがある`;
  }
  /* `… 상처를 입을 수 있으니 주의하시기 바랍니다.` — 앞절을 `~수 있음` 으로 되돌려 해석한 뒤
     종결만 연결형으로 바꾼다. 서술부 규칙을 재사용하므로 어휘를 새로 요구하지 않는다. */
  if ((m2 = /^(.+?\s*수)\s*있으(?:니|므로)[,，]?\s*([\s\S]*)$/.exec(t0))) {
    const a = resolveAtom(`${m2[1]} 있음`, depth + 1);
    const b = m2[2].trim() ? resolveAtom(m2[2].trim(), depth + 1) : '';
    if (a && b !== null && /ことがある$/.test(a)) return `${a.replace(/ことがある$/, 'ことがありますので、')}${b}`;
  }
  if ((m2 = /^(.+?)[이가]\s*있는\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}がある${b}`;
  }
  if ((m2 = /^(.+?)[을를]\s*나타내는\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}を示す${b}`;
  }
  /* `어린이의 손이 닿지 않는 곳에 보관` — 표현 변형(`손에`/`손이`)이 많아 규칙으로 둔다. */
  if ((m2 = /^(.+?)(?:의)?\s*손[이에]?\s*닿지\s*않(?:는|도록)\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}の手の届かない${b}`;
  }
  /* `섭취량 및 섭취방법을 확인한 후 섭취하십시오.` — 선행 동작절. */
  if ((m2 = /^(.*?)([가-힣]{2,5})(?:한|하신|하고|하여)\s*후[,，]?\s*$/.exec(t0)) && VSTEM[m2[2]]) {
    const head = m2[1].trim() ? resolveAtom(m2[1].trim(), depth + 1) : '';
    if (head !== null) return `${head}${VSTEM[m2[2]]}した後`;
  }
  if ((m2 = /^(.+?)\s*전\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}前に${b}`;
  }
  if ((m2 = /^(.+?)[이가]\s*있거나\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}があるか、${b}`;
  }
  if ((m2 = /^(.+?)\s*중인\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}中の${b}`;
  }
  if ((m2 = /^(.+?)에\s*의해\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}により${b}`;
  }
  /* ── 조사·의존명사 ─────────────────────────────────────────────
     위 규칙들이 서술부를 떼어내면 조사만 달린 명사구가 남는다. 어휘를 더하지 않고 표기만 옮긴다. */
  /* 단독 열거 기호. 순서를 유지한 채 일본어 표기로 옮긴다. */
  if ((m2 = /^[(（]([가나다라마바사])[)）]$/.exec(t0)) && KANA_MARK[m2[1]]) return `（${KANA_MARK[m2[1]]}）`;
  /* `총 수은` `총비소` — 기준·규격 표의 합계 항목. */
  if ((m2 = /^총\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `総${a}`; }
  if ((m2 = /^(.+?)\s*시$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}時`; }
  if ((m2 = /^(.+?)에\s*한함$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}に限る`; }
  if ((m2 = /^(.+?)\s*경우에\s*한함$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}場合に限る`; }
  if ((m2 = /^(.+?)\s*등$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}など`; }
  if ((m2 = /^(.+?)\s*전$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}前`; }
  if ((m2 = /^(.+?)\s*후$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}後`; }
  if ((m2 = /^(.+?)\s*중$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}中`; }
  /* 접속 표기. 양쪽이 모두 해석돼야 한다(일부만 번역된 혼합 조각 금지). */
  if ((m2 = /^(.+?)\s*(및|또는|이나|와|과)\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[3].trim(), depth + 1);
    if (a && b) return `${a}${{ 및: 'および', 또는: 'または', 이나: 'または', 와: 'と', 과: 'と' }[m2[2]]}${b}`;
  }
  if ((m2 = /^(.+?)\s+([-–—])\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[3].trim(), depth + 1);
    if (a && b) return `${a} ${m2[2]} ${b}`;
  }
  if ((m2 = /^([·•])\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `${m2[1]} ${a}`; }
  if (/^[(（]국문[)）]/.test(t0) && (t0.match(/[(（]국문[)）]/g) ?? []).length > 1) {
    const segs = t0.split(/(?=[(（]국문[)）])/).map((s) => s.trim()).filter(Boolean);
    const outs = segs.map((s) => resolveAtom(s, depth + 1));
    if (outs.every(Boolean)) return outs.join('、');
  }
  /* `(국문) … (영문) …` — 개별인정 기능성의 국·영문 병기. 영문 원문은 그대로 둔다(§6 원문 보존). */
  if ((m2 = /^[(（]국문[)）]\s*(.+?)\s*[(（]영문[)）]\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (!a) return null;
    const en = m2[2].trim().replace(/[\s,，]+$/, '');
    const h = en.search(/[가-힣]/);
    if (h < 0) return `（韓国語）${a}（英語）${en}`;
    const tail = resolveAtom(en.slice(h).trim(), depth + 1);
    if (!tail || /[가-힣]/.test(tail.replace(KEEP_PROPER, ''))) return null;
    return `（韓国語）${a}（英語）${en.slice(0, h).replace(/[\s,，]+$/, '')}、${tail}`;
  }
  if ((m2 = /^[을를]\s*주원료로\s*한\s*(\d+)\s*원료\s*복합\s*건강기능식품입니다[.]?\s*(.*)$/.exec(t0))) {
    const rest = m2[2].trim();
    const b = rest ? resolveAtom(rest, depth + 1) : '';
    if (b !== null) return `を主原料とした${m2[1]}原料複合の健康機能食品です。${b}`;
  }
  /* `코엔자임 Q10은 항산화에 도움을 줄 수 있습니다.` — 주어 + 서술. 양쪽이 모두 해석돼야 한다. */
  if ((m2 = /^(.+?)[은는]\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}は${b}`;
  }
  /* 법인명 단독 조각(`(주)한국인삼공사`) — 원문 표기를 유지한다. */
  if (/(\(주\)|㈜|주식회사|유한회사)/.test(t0) && t0.length <= 32 && !/(합니다|입니다|하십시오|제품을|사용)/.test(t0))
    return t0.replace(/\s+/g, ' ').trim();
  /* 남은 처소격. `~에 의해` `~에 주의` 같은 고정 표현이 모두 지나간 뒤에만 적용한다. */
  if ((m2 = /^(.+?)에\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}に${b}`;
  }
  /* 남은 조사. 열거·공백 분해보다 뒤에 두면 조각이 더 잘게 쪼개지므로 여기서 처리한다. */
  if ((m2 = /^(.+?)[와과]$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}と`; }
  if ((m2 = /^(.+?)에서$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}で`; }
  if ((m2 = /^(.+?)에$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}に`; }
  if ((m2 = /^(.+?)[은는]$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}は`; }
  if ((m2 = /^(.+?)[이가]$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}が`; }
  /* 열거 — 모든 조각이 해석돼야 한다. 구분자는 원문 표기를 따른다(일본어 나카구로 `・`). */
  if (SPLIT.test(t0)) {
    const sp = splitTop(t0, SPLIT);
    const parts = sp.parts;
    const seps = sp.seps.map((x) => (/[,，]/.test(x) ? '、' : /\//.test(x) ? '/' : '・'));
    if (parts.length > 1 && parts.every(Boolean)) {
      const jas = parts.map((s) => resolveAtom(s, depth + 1));
      if (jas.every(Boolean)) return jas.map((s, i) => (i ? seps[i - 1] + s : s)).join('');
    }
  }
  /* 공식 규격표 값 문법. **위 경로가 모두 실패한 뒤에만** 시도되는 순수 fallback 이며,
     한글이 섞이지 않은 수치·단위 구간만 다룬다 — 산문은 이 규칙에 들어오지 못한다.
     (WO-…-STRUCTURED-COMPRESSION §1: 의미 경계를 만드는 자동화는 금지, 수치 규격 표기만 허용) */
  {
    const v = specValue(t0);
    if (v) return v;
  }
  /* 최후 수단 — 공백으로 이어진 두 조각. 순서는 원문을 따르고 내용을 더하거나 빼지 않는다. */
  if ((m2 = /^(\S+)\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}${/^[A-Za-z0-9(]/.test(b) ? ' ' : ''}${b}`;
  }
  /* 저작 대상 원자 수집 — 짧은 실패 조각이 다음 라운드의 입력이다. */
  FAILED.set(t0, (FAILED.get(t0) ?? 0) + 1);
  return null;
}

/* ── 공식 규격표 값 문법 ─────────────────────────────────────────
   `표시량(4mg/g)의 80~120%` 처럼 **수치·단위와 규격 연결어만으로 이루어진 값**을 옮긴다.
   설계 제약(안전 조건):
     ① 괄호 안(X)에 한글이 있으면 처리하지 않는다 — 원료명 해석은 사전 저작의 몫이다.
     ② 문장을 쪼개거나 잇지 않는다. 하나의 값 표현만 통째로 대응시킨다.
     ③ 수치·단위·괄호 표기는 원문 토큰을 그대로 옮긴다(호출부 lostNums 가 재확인한다).
   따라서 이 규칙은 새로운 의미를 만들지 않고, 실패하면 조용히 null 을 돌려준다. */
/* 하한·상한이 짝을 이룬 수치 범위. 두 수치와 종결어(이하/미만)를 모두 요구하므로
   안전 문맥의 `이상`(이상사례·이상반응)에는 걸리지 않는다. */
const NUM_RANGE = /^([\s\S]*?)([\d.,]+)\s*(%?)\s*이상\s*[~〜～]?\s*([\d.,]+)\s*(%?)\s*(이하|미만)([\s\S]*)$/;
const SPEC_PURE = /^[^가-힣]+$/;              /* 한글이 없는 수치·단위 구간 */
const SPEC_SUFFIX = /^(.*?)\s*(?:이어야\s*한다|이어야\s*함|이여야\s*한다|여야\s*한다|여야\s*함|이어야한다|이어야합니다)\s*[.]?$/;
function specValueCore(t) {
  let m;
  /* 표시량(X)의 N~M%  ·  표시량(X)의 N%~M% */
  if ((m = /^표시량\s*[(（]\s*([^()（）]*?)\s*[)）]\s*의\s*([\d.,]+)\s*(%?)\s*[~〜～]\s*([\d.,]+)\s*%$/.exec(t))
    && SPEC_PURE.test(m[1])) return `表示量（${m[1]}）の${m[2]}${m[3]}〜${m[4]}%`;
  /* 표시량(X)의 N% 이상 M% 이하 */
  if ((m = /^표시량\s*[(（]\s*([^()（）]*?)\s*[)）]\s*의\s*([\d.,]+)\s*%\s*이상\s*[~〜～]?\s*([\d.,]+)\s*%\s*이하$/.exec(t))
    && SPEC_PURE.test(m[1])) return `表示量（${m[1]}）の${m[2]}%以上${m[3]}%以下`;
  /* 표시량(X)의 N% 이상 | 이하 */
  if ((m = /^표시량\s*[(（]\s*([^()（）]*?)\s*[)）]\s*의\s*([\d.,]+)\s*%\s*(이상|이하)$/.exec(t))
    && SPEC_PURE.test(m[1])) return `表示量（${m[1]}）の${m[2]}%${m[3] === '이상' ? '以上' : '以下'}`;
  /* 표시량(X) 이상 | 이하 */
  if ((m = /^표시량\s*[(（]\s*([^()（）]*?)\s*[)）]\s*(이상|이하)$/.exec(t))
    && SPEC_PURE.test(m[1])) return `表示量（${m[1]}）${m[2] === '이상' ? '以上' : '以下'}`;
  /* 표시량의 N%~M%  (뒤에 실제 값이 괄호로 붙는 형태 포함) */
  if ((m = /^표시량\s*의\s*([\d.,]+)\s*%\s*[~〜～]\s*([\d.,]+)\s*%\s*(?:\(\s*([^()]*?)\s*\))?$/.exec(t))
    && (!m[3] || SPEC_PURE.test(m[3]))) return `表示量の${m[1]}%〜${m[2]}%${m[3] ? `（${m[3]}）` : ''}`;
  /* 표시량(X)의 N 이상 M 이하  ·  N% 이상 ~ M% 이하
     수치 문맥의 `이상` 은 하한(以上)이다. 일반 경로는 이 자리를 안전 문맥의 `이상`(異常)으로 옮겨
     부등호 방향을 뒤집는다 — 그 오역을 막기 위해 이 문형을 명시적으로 확정한다(§6 기준·규격 수치 보존). */
  if ((m = /^표시량\s*[(（]\s*([^()（）]*?)\s*[)）]\s*의\s*([\d.,]+)\s*(%?)\s*이상\s*[~〜～]?\s*([\d.,]+)\s*(%?)\s*이하$/.exec(t))
    && SPEC_PURE.test(m[1])) return `表示量（${m[1]}）の${m[2]}${m[3]}以上${m[4]}${m[5]}以下`;
  /* 수치 범위만 있는 값: `1.0 이상 9.0 미만` · `80 이상 120 이하` */
  if ((m = /^([\d.,]+)\s*(%?)\s*이상\s*[~〜～]?\s*([\d.,]+)\s*(%?)\s*(이하|미만)$/.exec(t)))
    return `${m[1]}${m[2]}以上${m[3]}${m[4]}${m[5] === '이하' ? '以下' : '未満'}`;
  return null;
}
function specValue(t) {
  const core = specValueCore(t);
  if (core) return core;
  /* `… 이어야 한다.` 는 규격 값에만 붙이는 종결이다. 앞이 규격 값으로 확정될 때만 붙인다. */
  const s = SPEC_SUFFIX.exec(t);
  if (s && s[1].trim() && s[1].trim() !== t) {
    const c = specValueCore(s[1].trim());
    if (c) return `${c}であること。`;
  }
  return null;
}

/* 조립 결과에 남는 **표기**만 마지막에 정리한다. 뜻을 바꾸는 치환이 아니다.
   ① 수치에 붙은 배수 접미사(`1,000억 CFU`) — 사전·조립 어느 경로로 들어와도 한국어로 남을 수 있다.
   ② 항목 기호로 쓰인 `(가)(나)(다)` — 문장 중간에 있으면 마커 경로를 타지 않는다.
   앞뒤 문맥을 좁게 못박아 오치환이 생기지 않게 한다. */
const MULT = { 억: '億', 만: '万', 천: '千' };
function tailNorm(s) {
  return s
    .replace(/(?<=[\d,)])\s*([억천])(?=\s*(?:CFU|IU|[A-Za-z㎎㎍㎖]|개|마리|원|이상|以上|미만|[)/,]|$))/g, (_, c) => MULT[c])
    .replace(/(?<=[\d,)])\s*(만)(?=\s*(?:CFU|IU|[A-Za-z㎎㎍㎖]|개|마리|원))/g, (_, c) => MULT[c])
    .replace(/[(（]\s*([가나다라마바사])\s*[)）]/g, (_, c) => `（${KANA_MARK[c]}）`)
    /* 조합 과정에서 한국어 띄어쓰기가 그대로 넘어온다(`特に 6歳以下`). 일본어는 한자·가나 사이를
       띄우지 않는다. 로마자·수치 주변 공백은 원문 표기이므로 건드리지 않는다. */
    .replace(/(?<=[ぁ-んァ-ヶ一-龥、。])\s+(?=[ぁ-んァ-ヶ一-龥、。])/g, '')
    .replace(/(?<=[ぁ-んァ-ヶ一-龥])\s+(?=\d)/g, '')
    .replace(/(?<=\d)\s+(?=[ぁ-んァ-ヶ一-龥])/g, '')
    /* 앞 조각이 이미 `の` 로 끝났는데 바깥 규칙이 다시 `の` 를 붙이는 경우가 있다(`β-カロテンのの吸収`).
       일본어에 `のの` 연속은 없으므로 하나로 줄인다 — 낱말은 건드리지 않는다. */
    .replace(/のの(?=[^の])/g, 'の');
}

const JA_MEMO = new Map();
/**
 * 슬롯 번역. 해석 불가면 null 을 돌려주고 호출부가 문제 큐로 보낸다.
 * 반환된 문자열은 수치 보존 검사를 통과해야만 사용한다(호출부 계약).
 */
export function ja(kind, text) {
  const t = norm(text);
  if (!t) return null;
  const mk = `${kind} ${t}`;
  if (JA_MEMO.has(mk)) return JA_MEMO.get(mk);
  const res = jaCompute(kind, t);
  /* 동그라미 숫자(①②)는 일본어에서도 그대로 쓰이므로 변환하지 않는다(ZH 트랙과 다른 점). */
  if (res && typeof res.ja === 'string') res.ja = tailNorm(res.ja);
  JA_MEMO.set(mk, res);
  return res;
}
function jaCompute(kind, t) {
  /* 한글이 없는 슬롯(수치·기호·로마자 표기)은 번역 대상이 아니다. 원문을 그대로 둔다. */
  if (!/[가-힣]/.test(t)) return { ja: t, how: 'passthrough' };
  const hit = lookup(kind, t);
  if (hit) return hit;
  /* 마커 접두는 표기다. 원문 마커를 그대로 두고 본문만 번역한다. */
  const mm = markHead(t);
  if (mm) {
    const rest = t.slice(mm[0].length);
    const r = ja(kind, rest);
    if (r) return { ja: mm[0].replace(/\s+$/, ' ').replace(/[가나다라마바사]/g, (c) => KANA_MARK[c]) + r.ja, how: `marker+${r.how}` };
  }
  const a = resolveAtom(t);
  if (a) return { ja: a, how: 'compose' };
  return null;
}

export const dictSize = () => Object.fromEntries(Object.entries(AUTH).map(([k, v]) => [k, Object.keys(v).length]));
/* 렌더 단계 진입 전 메모 해제 — 번역이 끝난 뒤에는 heap 만 차지한다. */
export const clearMemo = () => { ATOM_MEMO.clear(); JA_MEMO.clear(); };
