/**
 * WO-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §4 / §5
 *
 * HFF KO canonical → 중국어(zh) 직접 번역 엔진.
 *   - **KO canonical 이 유일한 기준본**이다. EN canonical 은 참조하지 않는다(§1).
 *   - 저장소의 기존 중국어 정책을 따른다: 언어 코드 `zh` 단일(otc-zh-batch01-* 선례),
 *     외부 번역 API 없음 → **승인 사전 + 결정적 조합 규칙**으로 생산한다.
 *   - 슬롯 정의(SLOT_RE)·키 정규화(key)는 HFF 트랙 공통 계약을 그대로 쓴다.
 *     구조(태그·class·순서)는 손대지 않으므로 renderer family 가 그대로 승계된다.
 *   - 수치·단위·원료 귀속은 조합 규칙이 만들어내지 않는다. 원문 토큰을 그대로 옮긴다.
 */
import fs from 'node:fs';
import { norm, key, SLOT_RE } from './hff-en-batch-01-translate.mjs';

export { norm, key, SLOT_RE };
const D = 'apps/api-server/src/scripts/data';

/* ── 1. 프레임 사전 (섹션 제목 · 푸터 · 공통 라벨) ────────────── */
const HEADING = {
  '주요 기능성': '主要功能性',
  '섭취량 및 섭취방법 (공식 표기 그대로)': '摄取量及摄取方法（照官方标示）',
  '확인 가능한 기준·규격 정보': '可确认的基准·规格信息',
  '매장 전문가 문의 안내': '门店专业人员咨询指南',
  '섭취 시 참고사항': '摄取时参考事项',
  '표시 기준': '标示基准',
  '왜 이 제품인가': '为什么选择本产品',
  '섭취방법 (공식 표기 그대로)': '摄取方法（照官方标示）',
  '원료별 공식 인정 기능성': '各原料的官方认定功能性',
  '공식 인정 기능성': '官方认定功能性',
  '제품 정보': '产品信息',
  '보관 방법': '保存方法',
  '주의사항': '注意事项',
  '한눈에 보기': '一览',
};

/* ── 2. 원료·영양성분 용어집 ─────────────────────────────────── */
export const ING = {
  '건강기능식품': '健康功能食品',
  '비타민 A': '维生素A', '비타민 B1': '维生素B1', '비타민 B2': '维生素B2', '비타민 B6': '维生素B6',
  '비타민 B12': '维生素B12', '비타민 C': '维生素C', '비타민 D': '维生素D', '비타민 E': '维生素E',
  '비타민 K': '维生素K', '비타민 K1': '维生素K1', '비타민 K2': '维生素K2', '비타민 D3': '维生素D3',
  '비타민 B3': '维生素B3', '비타민 B5': '维生素B5', '비타민 B7': '维生素B7', '비타민 B9': '维生素B9',
  '비타민': '维生素',
  '나이아신': '烟酸', '판토텐산': '泛酸', '엽산': '叶酸', '비오틴': '生物素',
  '아연': '锌', '철': '铁', '철분': '铁', '칼슘': '钙', '마그네슘': '镁', '망간': '锰',
  '구리': '铜', '셀레늄': '硒', '셀렌': '硒', '크롬': '铬', '요오드': '碘', '몰리브덴': '钼',
  '칼륨': '钾', '인': '磷', '나트륨': '钠',
  '단백질': '蛋白质', '식이섬유': '膳食纤维', '아미노산': '氨基酸',
  '오메가3': 'Omega-3', '오메가-3': 'Omega-3', 'EPA': 'EPA', 'DHA': 'DHA',
  'EPA와 DHA의 합': 'EPA与DHA之和', 'EPA 및 DHA': 'EPA及DHA',
  '루테인': '叶黄素', '지아잔틴': '玉米黄质', '아스타잔틴': '虾青素',
  '프로바이오틱스': '益生菌', '유산균': '乳酸菌', '프리바이오틱스': '益生元',
  'MSM': 'MSM', 'MSM(엠에스엠·디메틸설폰)': 'MSM（甲基磺酰基甲烷·二甲基砜）',
  '엠에스엠': '甲基磺酰基甲烷', '디메틸설폰': '二甲基砜',
  '콜라겐': '胶原蛋白', '콜라겐펩타이드': '胶原蛋白肽', '저분자콜라겐펩타이드': '低分子胶原蛋白肽',
  '히알루론산': '透明质酸', '코엔자임Q10': '辅酶Q10', '코엔자임 Q10': '辅酶Q10',
  '가르시니아캄보지아 추출물': '藤黄果提取物', '가르시니아캄보지아추출물': '藤黄果提取物',
  '차전자피': '洋车前子壳', '차전자피식이섬유': '洋车前子壳膳食纤维', '차전자피 식이섬유': '洋车前子壳膳食纤维',
  '뮤코다당·단백': '黏多糖·蛋白', '뮤코다당·단백(콘드로이친)': '黏多糖·蛋白（软骨素）',
  '콘드로이친': '软骨素', '글루코사민': '氨基葡萄糖',
  '은행잎추출물': '银杏叶提取物', '포스파티딜세린': '磷脂酰丝氨酸',
  '헤마토코쿠스추출물': '雨生红球藻提取物', '헤마토코쿠스추출물(아스타잔틴)': '雨生红球藻提取物（虾青素）',
  '바나바잎추출물': '大花紫薇叶提取物', '홍삼': '红参', '인삼': '人参', '홍삼농축액': '红参浓缩液',
  '밀크씨슬': '水飞蓟', '밀크씨슬 추출물': '水飞蓟提取物', '밀크씨슬추출물': '水飞蓟提取物',
  '쏘팔메토열매추출물': '锯棕榈果提取物', '감마리놀렌산': 'γ-亚麻酸',
  '알로에겔': '芦荟凝胶', '스피루리나': '螺旋藻', '클로렐라': '小球藻',
  '녹차추출물': '绿茶提取物', '카테킨': '儿茶素', '대두이소플라본': '大豆异黄酮',
  '가르시니아': '藤黄果', '난소화성말토덱스트린': '难消化性麦芽糊精',
  '프락토올리고당': '低聚果糖', '이눌린': '菊粉', '루테인지아잔틴복합추출물': '叶黄素玉米黄质复合提取物',
  '옥타코사놀': '二十八烷醇', '레시틴': '卵磷脂', '스쿠알렌': '角鲨烯', '베타카로틴': 'β-胡萝卜素',
  '엽록소함유식물': '含叶绿素植物', '키토산': '壳聚糖', '키토올리고당': '壳寡糖',
  '프로폴리스추출물': '蜂胶提取物', '로얄젤리': '蜂王浆', '테아닌': '茶氨酸', 'L-테아닌': 'L-茶氨酸',
  '아르기닌': '精氨酸', '타우린': '牛磺酸', '글루타치온': '谷胱甘肽',
  '유산균증식물질': '乳酸菌增殖物质', '효모': '酵母', '효소': '酶',
  '단백질보충용': '蛋白质补充用', '초유': '初乳',
  '가르시니아캄보지아': '藤黄果', '녹차': '绿茶',
};

/* ── 3. 조각 사전 (조합 규칙이 쓰는 최소 단위) ───────────────── */
const FRAG = {
  '물과 함께': '与水一起服用',
  '충분한 물과 함께': '与充足的水一起服用',
  '충분한 물과 함께 섭취': '与充足的水一起摄取',
  '씹어 섭취': '咀嚼后摄取',
  '식후 섭취': '餐后摄取',
  '식전 섭취': '餐前摄取',
  '식사와 함께': '随餐服用',
  '제품 표시사항 참고': '参见产品标示事项',
  '제품 표시사항을 함께 확인하십시오': '请一并确认产品标示事项',
  '섭취 전 제품 표시사항을 확인': '摄取前请确认产品标示事项',
  '자세한 주의사항은 제품 표시사항을 확인하십시오': '详细注意事项请确认产品标示事项',
  '섭취 시 주의사항': '摄取时注意事项',
  '임산부·수유부는 섭취 전 전문가와 상담': '孕妇及哺乳期妇女摄取前请咨询专业人员',
  '질환이 있거나 의약품 복용 시 전문가와 상담': '患有疾病或正在服用药物时请咨询专业人员',
  '고칼슘혈증이 있거나 의약품 복용 시 전문가와 상담': '患有高钙血症或正在服用药物时请咨询专业人员',
  '알레르기 체질 등은 개인에 따라 과민반응 가능': '过敏体质等因人而异可能出现过敏反应',
  '이상사례 발생 시 섭취를 중단하고 전문가와 상담': '出现不良反应时请停止摄取并咨询专业人员',
  '어린이가 함부로 섭취하지 않도록 일일섭취량 방법을 지도할 것': '请指导儿童不要随意摄取，并遵守每日摄取量',
  '건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은 매장 내 약사 등 전문가와 상담하십시오':
    '健康功能食品不是用于预防或治疗疾病的药品，如有疑问请咨询门店内药师等专业人员',
};

/* ── 4. 저작 라운드 (z1..z60) ────────────────────────────────── */
export const authoredRounds = [];
const COLORS_RAW = {};
const COLOR = {};
/** 해석 실패 조각 수집기(저작 라운드 입력). */
export const FAILED = new Map();
const AUTH = { clause: {}, label: {}, meta: {}, heading: {}, badge: {}, intro: {}, foot: {}, spec: {} };
for (let n = 1; n <= 60; n++) {
  const f = `${D}/hff-zh-b01-z${n}-translations-v1.json`;
  if (!fs.existsSync(f)) continue;
  const T = JSON.parse(fs.readFileSync(f, 'utf8'));
  authoredRounds.push(`z${n}`);
  for (const kind of Object.keys(AUTH)) for (const [k, v] of Object.entries(T[kind] ?? {})) AUTH[kind][key(k)] = v;
  /* any = 슬롯 종류와 무관하게 같은 의미로 쓰이는 문구 */
  for (const [k, v] of Object.entries(T.any ?? {})) for (const kind of Object.keys(AUTH)) AUTH[kind][key(k)] = v;
  Object.assign(COLORS_RAW, T.color ?? {});
}
for (const [k, v] of Object.entries(COLORS_RAW)) COLOR[key(k)] = v;
for (const [k, v] of Object.entries(HEADING)) AUTH.heading[key(k)] = v;
for (const [k, v] of Object.entries(FRAG)) for (const kind of Object.keys(AUTH)) AUTH[kind][key(k)] ??= v;
for (const [k, v] of Object.entries(ING)) for (const kind of Object.keys(AUTH)) AUTH[kind][key(k)] ??= v;

/* ── 5. 수치 보존 ────────────────────────────────────────────── */
const UNITS = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|%|정|캡슐|포|병|스푼|알|매|회|일|개`;
/* 라틴·기호 단위는 숫자와 띄어 써도 같은 수치다(`500 mg`). */
const UNITS_SYM = String.raw`mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|%`;
/* 한국어·중국어 단어 단위는 숫자에 붙여 쓴다(`2정`·`2片`). 띄어쓰기를 허용하면
   `비타민B12   정상적인 엽산 대사` 같은 문장이 `12정` 이라는 가짜 수치로 잡힌다. */
const UNITS_WORD_KO = String.raw`정|캡슐|포|병|스푼|알|매|회|일|개`;
const UNITS_WORD_ZH = String.raw`片|胶囊|袋|瓶|勺|粒|张|个|次`;
/* 숫자 앞이 영문자·숫자면 성분 코드의 일부다(`B12`). 섭취량으로 세지 않는다. */
const NUM_LEAD = String.raw`(?<![A-Za-z0-9])\d+(?:[.,]\d+)*`;
/* 공백은 배수 접미사가 실제로 있을 때만 허용한다(`100 억 CFU`). 무조건 허용하면
   제품명 `두뇌엔 포스파티딜세린 365` 뒤에 오는 `포스파티딜세린` 의 첫 글자가 단위 `포` 로 붙어
   `365포` 라는 가짜 수치가 만들어진다. */
const NUM_SCALE = String.raw`(?:\s*(?:억|만|천|亿|万|千))?`;
const SCALE_MULT = { e8: 1e8, e4: 1e4, e3: 1e3, e9: 1e9, e6: 1e6 };
/* 배수 접미사는 표기가 달라도 값이 같으면 같은 수치다(`100억` = `100亿`). 단위 환산은 하지 않는다. */
const canonUnit = (x) => {
  const t = x.replace(/[,\s]/g, '')
    .replace(/㎎/g, 'mg').replace(/㎍|μg|mcg/g, 'ug').replace(/㎖/g, 'ml')
    .replace(/억|亿/g, 'E8').replace(/만|万/g, 'E4').replace(/천|千/g, 'E3')
    .replace(/정|片/g, 'TAB').replace(/캡슐|胶囊/g, 'CAP').replace(/포|袋/g, 'SAC')
    .replace(/병|瓶/g, 'BTL').replace(/스푼|勺/g, 'SPN').replace(/알|粒/g, 'PIL')
    .replace(/매|张/g, 'SHT').replace(/개|个/g, 'EA')
    .toLowerCase();
  const m = /^(\d+(?:\.\d+)?)(e[3468]|e9)?(.+)$/.exec(t);
  if (!m) return t;
  return String(Number(m[1]) * (SCALE_MULT[m[2]] ?? 1)) + m[3];
};
/* `비타민B12   정상적인` 처럼 영문 성분 코드 뒤 숫자가 뒤따르는 한국어 단어와 붙어 가짜 수치로 잡히는 것을 막는다.
   영문자 바로 뒤의 숫자는 성분 코드의 일부이지 섭취량이 아니다. */
const NUM_RE = new RegExp(String.raw`${NUM_LEAD}${NUM_SCALE}(?:\s*(?:${UNITS_SYM})|(?:${UNITS_WORD_KO}))(?![A-Za-z])`, 'g');
const ZH_RE = new RegExp(String.raw`${NUM_LEAD}${NUM_SCALE}(?:\s*(?:${UNITS_SYM})|(?:${UNITS_WORD_KO}|${UNITS_WORD_ZH}))(?![A-Za-z])`, 'g');
const bag = (a) => { const m = new Map(); for (const x of a) m.set(x, (m.get(x) ?? 0) + 1); return m; };
/* `1일 N회` ↔ `每日N次` 는 어순·표기가 다르므로 빈도 축(PERDAY/TIMES)으로 환원해 비교한다.
   중국어 `每日`·`每次` 는 숫자를 생략하지만 의미상 1 이다. 값 자체는 어느 쪽에서도 늘거나 줄지 않는다. */
const freqTokens = (t, zhSide) => {
  const out = [];
  if (zhSide) {
    for (const m of t.matchAll(/每\s*(\d+)?\s*(日|天)/g)) out.push(`PERDAY${m[1] ?? '1'}`);
    for (const m of t.matchAll(/每\s*次/g)) out.push('TIMES1');
    for (const m of t.matchAll(/(\d+)\s*次/g)) out.push(`TIMES${m[1]}`);
    /* 제품명은 한국어를 그대로 유지하므로(`딥트3일 스트롱플러스`) 중국어 본문 안에도 한국어 표기가 남는다.
       같은 글자를 한쪽에서만 세면 없어지지 않은 수치가 유실로 잡힌다. */
    for (const m of t.matchAll(/(\d+)\s*일(?![가-힣])/g)) out.push(`PERDAY${m[1]}`);
    for (const m of t.matchAll(/(\d+)\s*회(?![가-힣])/g)) out.push(`TIMES${m[1]}`);
  } else {
    for (const m of t.matchAll(/(\d+)\s*일(?![가-힣])/g)) out.push(`PERDAY${m[1]}`);
    for (const m of t.matchAll(/(\d+)\s*회(?![가-힣])/g)) out.push(`TIMES${m[1]}`);
  }
  return out;
};
const stripFreq = (t, zhSide) => (zhSide
  ? t.replace(/每\s*\d*\s*(?:日|天|次)/g, ' ').replace(/(\d+)\s*次/g, ' ').replace(/(\d+)\s*[일회](?![가-힣])/g, ' ')
  : t.replace(/(\d+)\s*[일회](?![가-힣])/g, ' '));
/* `每2000mg100亿 CFU` 처럼 단위 바로 뒤에 다음 수치가 붙는 표기가 있다. 이때 `100` 앞 글자가
   라틴 문자(`g`)여서 성분 코드 판정에 걸려 수치가 통째로 안 읽힌다. 이미 단위로 닫힌 자리 뒤에는
   경계를 넣어 다음 수치를 살리고, `비타민B12` 같은 성분 코드는 그대로 막는다. */
const SEP_UNIT_NUM = new RegExp(String.raw`(\d\s*(?:mcg|mg|kcal|CFU|㎎|kg|ug|㎍|μg|IU|mL|ml|㎖|L|g|%))(?=\d)`, 'g');
const sepUnit = (t) => t.replace(SEP_UNIT_NUM, '$1 ');
export const koNums = (s) => { const t = sepUnit(norm(s)); return [...(stripFreq(t, false).match(NUM_RE) ?? []).map(canonUnit), ...freqTokens(t, false)]; };
/* `1粒胶囊` 은 한국어 `1캡슐` 의 자연스러운 중국어 표기다. 알(粒) 이 아니라 캡슐로 센다. */
export const zhNums = (s) => { const t = sepUnit(norm(s)).replace(/粒\s*胶囊/g, '胶囊'); return [...(stripFreq(t, true).match(ZH_RE) ?? []).map(canonUnit), ...freqTokens(t, true)]; };
/* 원문 수치가 번역문에 남아 있는지 — 개수까지 본다(1일 2회 · 1회 2정 처럼 같은 값 반복 보존). */
export const lostNums = (ko, zh) => {
  const kb = bag(koNums(ko)), zb = bag(zhNums(zh));
  const lost = [];
  for (const [k, n] of kb) if ((zb.get(k) ?? 0) < n) lost.push(k);
  return lost;
};

/* ── 6. 조합 규칙 ────────────────────────────────────────────── */
const KINDS = ['clause', 'meta', 'label', 'badge', 'intro', 'heading', 'foot', 'spec'];
/* `주의` / `주의할 것` / `주의하십시오` 는 같은 지시다. 어미 표기 차이만 흡수한다(의미 변경 없음). */
const keyVariants = (k) => [...new Set([
  k, k.replace(/할것$/, ''), /할것$/.test(k) ? null : `${k}할것`,
  k.replace(/하여야함$/, '할것'), k.replace(/하여야한다$/, '할것'),
])].filter((x) => x);
/* 원문 표기를 유지하는 고유명사 — 제조사 법인명(`… 制造`). 잔존 한글 검사에서 제외한다.
   승인된 EN 자산이 `Made by 코스맥스바이오(주)` 로 법인명을 그대로 둔 것과 같은 계약이다. */
export const KEEP_PROPER = /[^·<>]{0,40}(?:制造|\(주\)|㈜|주식회사|유한회사)[^·<>]{0,40}/g;

/** 사전 조회. kind 를 주면 해당 슬롯을 먼저 본다. */
function lookup(kind, t) {
  const ks = keyVariants(key(t));
  const order = kind ? [kind, ...KINDS.filter((x) => x !== kind)] : KINDS;
  for (const k2 of ks) for (const kd of order) if (AUTH[kd][k2]) return { zh: AUTH[kd][k2], how: `dict(${kd})` };
  return null;
}
const MARK_HEAD = /^(\s*(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⒜⒝⒞㉮㉯㉰㉱㈎㈏㈐㈑○●◦▶ⓛ]|\(\s*\d+\s*\)|\d+(?:-\d+)+\s*[).]|\d+\s*[).>]|\(\s*[가나다라마바사]\s*\)|[가나다라마바사]\s*[.)])\s*)/;
/* 구분자 — `2,000` 의 쉼표와 `mg/kg` 의 슬래시는 열거 구분자가 아니다(수치·단위 보존). */
const SPLIT = /\s*[·､、･•․∙]\s*|\s*(?:(?<!\d)[,，]|[,，](?!\s*\d))\s*|(?<![A-Za-z0-9])\s*\/\s*|\s*\/\s*(?![A-Za-z0-9])/;
/* 괄호 밖(최상위)에서만 자른다 — `표시량(36 mg/1일 섭취량)의 …` 를 조각내지 않는다. */
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

/** `1일 3회` `1회 2정` `1회 1포(3g)` 등 섭취 표기. 수치는 원문 토큰을 그대로 옮긴다. */
function dosage(t0) {
  const t = t0.replace(/씩$/, '').trim();
  let m;
  if ((m = /^1일\s*(\d+)\s*회$/.exec(t))) return `每日${m[1]}次`;
  if ((m = /^(\d+)일\s*(\d+)\s*회$/.exec(t))) return `每${m[1]}日${m[2]}次`;
  if ((m = new RegExp(String.raw`^1회\s*(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t))) return `每次${m[1]}${UNIT_ZH[m[2]] ?? m[2]}`;
  if ((m = new RegExp(String.raw`^1일\s*(\d+)\s*회\s*[,，]?\s*1회\s*(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t)))
    return `每日${m[1]}次，每次${m[2]}${UNIT_ZH[m[3]] ?? m[3]}`;
  if ((m = new RegExp(String.raw`^1일\s*(\d+)\s*회\s*(?:1회\s*)?(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t)))
    return `每日${m[1]}次，每次${m[2]}${UNIT_ZH[m[3]] ?? m[3]}`;
  if ((m = new RegExp(String.raw`^1일\s*(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t))) return `每日${m[1]}${UNIT_ZH[m[2]] ?? m[2]}`;
  if ((m = new RegExp(String.raw`^(\d+(?:\.\d+)?)\s*(${DU})$`).exec(t))) return `${m[1]}${UNIT_ZH[m[2]] ?? m[2]}`;
  return null;
}
const UNIT_ZH = { 정: '片', 캡슐: '粒胶囊', 포: '袋', 병: '瓶', 스푼: '勺', 알: '粒', 매: '张', 개: '个', 환: '丸' };
const DU = '정|캡슐|포|병|스푼|알|매|개|환|㎖|ml|mL|g|mg';

/** 원료명 + 표시량 (`루테인 20mg`). 용어집 + 원문 수치 토큰. */
function ingredientAmount(t) {
  const m = /^(.+?)\s*(\d+(?:[.,]\d+)*\s*(?:억|만|천)?\s*(?:mg|g|㎎|kg|ug|㎍|μg|mcg|IU|kcal|mL|ml|㎖|L|CFU|%))$/.exec(t);
  if (!m) return null;
  /* `표시량의 80~150%` 처럼 앞부분이 범위 기호로 끊긴 경우는 원료명+표시량이 아니다(수치 훼손 방지). */
  if (/[~〜～\-–,，/]$/.test(m[1].trim())) return null;
  const head = resolveAtom(m[1].trim());
  if (!head) return null;
  return `${head} ${m[2].replace(/\s+/g, '')}`;
}

/** `A(B)` — 괄호 안은 별칭이거나 원문 표기다. 각각 해석되면 합친다. */
function paren(t) {
  const m = /^([^()]+)\(([^()]+)\)$/.exec(t);
  if (!m) return null;
  const a = resolveAtom(m[1].trim());
  if (!a) return null;
  const b = resolveAtom(m[2].trim());
  /* 괄호 안이 해석되지 않았는데 한글이 남아 있으면 원문을 그대로 흘리지 않는다(§7 슬롯 한글 0). */
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

/** `1일 1회, 1회 1캡슐` 처럼 이어진 섭취 표기. 조각이 모두 섭취 표기여야 한다. */
function doseChain(t) {
  if (!/[,，]/.test(t)) return null;
  const parts = t.split(/\s*[,，]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const z = parts.map(dosage);
  return z.every(Boolean) ? z.join('，') : null;
}

/* 섭취 방식 부사. 라벨용 완성 문구(FRAG)와 달리 문장 안에 들어가는 형태만 둔다. */
const MANNER = {
  '물과 함께': '与水一起', '충분한 물과 함께': '与充足的水一起', '충분한 물과': '与充足的水一起',
  '따뜻한 물과 함께': '与温水一起', '미지근한 물과 함께': '与温水一起', '물 또는 음료와 함께': '与水或饮料一起',
  '씹어': '咀嚼后', '씹어서': '咀嚼后', '그대로': '直接', '식사와 함께': '随餐',
  '식후에': '餐后', '식후': '餐后', '식전에': '餐前', '식전': '餐前', '공복에': '空腹时',
  '직접 또는 물과 함께': '直接或与水一起', '그대로 혹은 물과 함께': '直接或与水一起',
  '직접 섭취하거나 물과 함께': '直接摄取或与水一起', '물에 타서': '用水冲调后',
  '물이나 음료에 타서': '用水或饮料冲调后', '그대로': '直接', '직접': '直接',
};
/* 긴 표현이 짧은 표현을 포함하므로 항상 긴 쪽을 먼저 맞춘다. */
const MANNER_KEYS = Object.keys(MANNER).sort((a, b) => b.length - a.length);

/** `1일 1회, 1회 1캡슐을 물과 함께 섭취하십시오.` — 섭취 표기와 방식을 분리해 옮긴다. */
function intake(t) {
  const m = /^(.+?)\s*(?:섭취|복용)(?:하십시오|하세요|합니다|하시기\s*바랍니다|해\s*주십시오|하여\s*주십시오|할\s*것|하여야\s*함|한다)?\s*([.]?)$/.exec(t);
  if (!m) return null;
  let body = m[1].trim();
  let manner = '';
  for (const k of MANNER_KEYS) {
    if (body.endsWith(k)) { manner = MANNER[k]; body = body.slice(0, -k.length).trim(); break; }
  }
  body = body.replace(/(?:을|를|씩)$/, '').trim();
  if (!body) return null;
  const dose = doseChain(body) ?? dosage(body) ?? resolveAtom(body, 3);
  if (!dose) return null;
  return `${dose}${manner ? `，${manner}` : ''}摄取${m[2] ? '。' : ''}`;
}

const SPACED = /\s+[·・*•․∙]\s+/;

/** 도입·요약 문장 틀. 원료·수치·섭취표기는 슬롯으로 두고 틀만 옮긴다. */
const SENT = [
  [/^이 제품은\s*(.+?)\s*을\(를\)\s*주원료로 한 건강기능식품입니다[.]?$/, (a) => `本产品是以${a}为主原料的健康功能食品。`],
  [/^이 제품은\s*(.+?)\s*(?:을|를)\s*주원료로 한 건강기능식품입니다[.]?$/, (a) => `本产品是以${a}为主原料的健康功能食品。`],
  [/^이 제품은\s*(.+?)\s*(?:을\(를\)|을|를)\s*표시량으로 담은\s*(\d+)\s*원료 복합 건강기능식품입니다[.]?$/, (a, n) => `本产品是以标示量含有${a}的${n}原料复合健康功能食品。`],
  [/^이 제품은\s*(.+?)\s*(?:을\(를\)|을|를)\s*담은 복합 건강기능식품입니다[.]?$/, (a) => `本产品是含有${a}的复合健康功能食品。`],
  [/^이 제품은\s*(.+?)\s*(?:을\(를\)|을|를)\s*표시량으로 담은 건강기능식품입니다[.]?$/, (a) => `本产品是以标示量含有${a}的健康功能食品。`],
  [/^이 제품의 표시 기준은\s*(.+?)\s*입니다[.]?$/, (a) => `本产品的标示基准为${a}。`],
  [/^공식 섭취방법은\s*(.+?)\s*입니다[.]?$/, (a) => `官方摄取方法为${a}。`],
  [/^(.+?)에 도움을 줄 수 있는\s*(.+?)\s*(?:을|를)\s*담았습니다[.]?$/, (a, b) => `含有有助于${a}的${b}。`],
];
function sentenceCompose(t, depth = 0) {
  for (const [re, f] of SENT) {
    const m = re.exec(t);
    if (!m) continue;
    const slots = m.slice(1).map((s) => (/^\d+$/.test(s) ? s : null));
    const zhs = m.slice(1).map((s, i) => (slots[i] ?? doseChain(s.trim()) ?? resolveAtom(s.trim(), depth + 1)));
    if (zhs.every(Boolean)) return f(...zhs);
  }
  return null;
}

/** `비타민 D 영양기능 (공식 인정 기능성)` 같은 섹션 제목. 원료명만 용어집으로 옮긴다. */
function headingCompose(t, depth = 0) {
  const P = [
    [/^(.+?)\s*영양기능\s*\(\s*공식 인정 기능성\s*\)$/, (a) => `${a}营养功能（官方认定功能性）`],
    [/^(.+?)\s*영양기능\s*\(\s*공식 인정\s*\)$/, (a) => `${a}营养功能（官方认定）`],
    [/^(.+?)\s*기능성\s*\(\s*공식 인정 기능성\s*\)$/, (a) => `${a}功能性（官方认定功能性）`],
    [/^(.+?)\s*기능성\s*\(\s*공식 인정\s*\)$/, (a) => `${a}功能性（官方认定）`],
    [/^(.+?)\s*영양기능$/, (a) => `${a}营养功能`],
    [/^(.+?)\s*원료별 공식 인정 기능성$/, (a) => `${a}各原料的官方认定功能性`],
    [/^(.+?)\s*공식 인정 기능성$/, (a) => `${a}官方认定功能性`],
    [/^이\s*(.+?)의 공식 기능성$/, (a) => `本${a}的官方功能性`],
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
   조각 순서를 그대로 두고 접속 표현만 중국어 어순에 맞춰 옮긴다.
   원료명·수치는 조각 밖(라벨 규칙)에서 이미 보존되므로 여기서 만들어내지 않는다. */
function fragmentCompose(t, depth) {
  let m;
  if ((m = /^이 제품은\s+1일 섭취량\((.+?)\)에\s*(.*)$/.exec(t))) {
    const d = resolveAtom(m[1].trim(), depth + 1);
    const rest = m[2].trim() ? resolveAtom(m[2].trim(), depth + 1) : '';
    if (d && rest !== null) return `本产品在每日摄取量（${d}）中含有${rest}`;
  }
  if ((m = /^이 제품은\s*(.*)$/.exec(t))) {
    if (!m[1].trim()) return '本产品是以';
    const a = resolveAtom(m[1].trim(), depth + 1);
    if (a) return `本产品是以${a}`;
  }
  if (/^이 제품의 표시 기준은$/.test(t)) return '本产品的标示基准为';
  if (/^입니다[.]?$/.test(t)) return '。';
  if (/^입니다[.]?\s*공식 섭취방법은$/.test(t)) return '。官方摄取方法为';
  if (/^입니다[.]?\s*공식 인정 기능성은 아래와 같습니다[.]?$/.test(t)) return '。官方认定功能性如下。';
  if (/^입니다[.]?\s*각 원료의 공식 인정 기능성은 아래와 같습니다[.]?$/.test(t)) return '。各原料的官方认定功能性如下。';
  if (/^이며,\s*각 원료의 공식 인정 기능성은 아래와 같습니다[.]?$/.test(t)) return '，各原料的官方认定功能性如下。';
  if (/^을\(를\)\s*주원료로 한 건강기능식품입니다[.]?\s*공식 섭취방법은$/.test(t)) return '为主原料的健康功能食品。官方摄取方法为';
  if (/^을\(를\)\s*주원료로 한 건강기능식품입니다[.]?\s*공식 인정 기능성은 아래와 같습니다[.]?$/.test(t)) return '为主原料的健康功能食品。官方认定功能性如下。';
  if (/^을\(를\)\s*주원료로 한 건강기능식품입니다[.]?$/.test(t)) return '为主原料的健康功能食品。';
  if ((m = /^를?\s*표시량으로 담은\s*(\d+)원료 복합 건강기능식품입니다[.]?\s*각 원료의 공식 인정 기능성은 아래와 같습니다[.]?$/.exec(t))) {
    return `的标示量含有的${m[1]}原料复合健康功能食品。各原料的官方认定功能性如下。`;
  }
  if ((m = /^를?\s*표시량으로 담은\s*(\d+)원료 복합 건강기능식품입니다[.]?$/.exec(t))) {
    return `的标示量含有的${m[1]}原料复合健康功能食品。`;
  }
  if ((m = /^를?\s*주원료로 한\s*(\d+)원료 복합 건강기능식품입니다[.]?\s*공식 섭취방법은$/.exec(t))) {
    return `为主原料的${m[1]}原料复合健康功能食品。官方摄取方法为`;
  }
  if ((m = /^를?\s*주원료로 한\s*(\d+)원료 복합 건강기능식품입니다[.]?\s*공식 인정 기능성은 아래와 같습니다[.]?$/.exec(t))) {
    return `为主原料的${m[1]}原料复合健康功能食品。官方认定功能性如下。`;
  }
  /* `를 표시량으로 담았습니다(표시 기준 2000mg당). …` — 뒤 문장은 사전에서 그대로 가져온다. */
  if ((m = /^를?\s*표시량으로 담았습니다\(표시 기준\s*(.+?)당\)[.]?\s*([\s\S]*)$/.exec(t))) {
    const b = resolveAtom(m[1].trim(), depth + 1);
    const rest = m[2].trim() ? resolveAtom(m[2].trim(), depth + 1) : '';
    if (b && rest !== null) return `的标示量含有（标示基准每${b}）。${rest}`;
  }
  /* 선행 마침표만 남은 조각(`. 유산균 증식 …`). */
  if ((m = /^[.]\s*([\s\S]+)$/.exec(t))) {
    const a = resolveAtom(m[1].trim(), depth + 1);
    if (a) return `。${a}`;
  }
  return null;
}

/* `성상` 서술 — 관능 표현·색·제형은 표기 변형이 많다. 표기를 정규화한 뒤 고정 대응으로 옮긴다. */
const sensoryNorm = (t) => t.replace(/\s+/g, ' ')
  .replace(/이미\s*[,，、·･]?\s*이취/g, '이미·이취')
  .replace(/([있없]고)\s*,/g, '$1')
  .trim();
/* [정규화된 패턴, 중국어, 뒤에 제형이 이어지지 않는 종결형인지] */
const SENSORY = [
  [/^고유의 (?:향미가 (?:있고|있으며)|향미를 (?:지니고|가지고|가지며|지니며|가지고 있고)) 이미·이취가 없는 ?(.*)$/, '具有固有风味且无异味、无异臭的'],
  [/^이미·이취가 (?:없고|없으며),? ?고유의 (?:향미가 있는|향미를 (?:가진|지닌|가지고 있는|지니고 있는)) ?(.*)$/, '无异味、无异臭并具有固有风味的'],
  [/^고유의 향미를 (?:가지며|지니며) 이미·이취가 없는 ?(.*)$/, '具有固有风味且无异味、无异臭的'],
  [/^고유의 색택과 향미를 (?:가지며|가지고|지니며|지니고) 이미·이취가 (?:없어야 (?:한다|함|합니다)|없다|없음)[.]? ?(.*)$/, '应具有固有的色泽与风味，且无异味、无异臭。'],
  [/^고유의 색택과 향미를 (?:가지며|가지고) 이미·이취가 없는 ?(.*)$/, '具有固有色泽与风味且无异味、无异臭的'],
  [/^이미·이취가 (?:없어야 (?:한다|함|합니다)|없다|없음)[.]? ?(.*)$/, '应无异味、无异臭。'],
];
function appearance(t0, depth) {
  const t = sensoryNorm(t0);
  for (const [re, head] of SENSORY) {
    const m = re.exec(t);
    if (!m) continue;
    const rest = m[1].trim();
    if (!rest) return head.replace(/的$/, '');
    const a = resolveAtom(rest, depth + 1);
    if (a) return head.endsWith('。') ? head + a : head + a;
  }
  /* `갈색의 분말로 이미·이취가 없음` — 성상이 뒤에 붙는 어순. */
  let sm;
  if ((sm = /^(.+?)\s*으?로 이미·이취가 (?:없음|없다|없어야 한다|없어야 함)[.]?$/.exec(t))) {
    const a = resolveAtom(sm[1].trim(), depth + 1);
    if (a) return `${a}，无异味、无异臭。`;
  }
  /* `연한 노랑 빛이 도는 백색 분말` — 색조 표현. */
  if ((sm = /^(.*?)([가-힣 ]+?)\s*빛이 도는\s*(.+)$/.exec(t))) {
    const tone = colorCompose(sm[2]);
    const rest = resolveAtom(sm[3].trim(), depth + 1);
    const pre = sm[1].trim() ? resolveAtom(sm[1].trim(), depth + 1) : '';
    if (tone && rest && pre !== null) return `${pre}带${tone}色调的${rest}`;
  }
  /* `연한노랑색의 분말` / `내용물을 함유한 빨간색의 타원형 연질캡슐` — 앞부분·색·제형. */
  const c = /^(.*?)\s*([가-힣 ]+?)색의?\s*(.+)$/.exec(t);
  if (c) {
    const col = colorCompose(c[2]);
    const form = resolveAtom(c[3].trim(), depth + 1);
    const pre = c[1].trim() ? resolveAtom(c[1].trim(), depth + 1) : '';
    if (col && form && pre !== null) return `${pre}${col}色${form}`;
  }
  /* 색 표기만 있는 조각(`흑갈색`). */
  if ((sm = /^([가-힣 ]+?)색$/.exec(t))) { const col = colorCompose(sm[1]); if (col) return `${col}色`; }
  return formCompose(t);
}

/* 색 표기는 수식어 + 색 어근의 조합이다. 사전 나열 대신 형태소 단위로 옮긴다. */
const CTOK_RAW = {
  연한: '浅', 옅은: '浅', 엷은: '浅', 담: '淡', 진한: '深', 짙은: '深', 어두운: '暗', 암: '暗',
  밝은: '亮', 흐린: '浑浊', 탁한: '浑浊', 맑은: '清澈', 미: '微', 짚은: '深',
  노란: '黄', 노랑: '黄', 황: '黄', 하얀: '白', 하양: '白', 흰: '白', 백: '白', 유백: '乳白',
  빨간: '红', 빨강: '红', 적: '红', 붉은: '红', 분홍: '粉红', 핑크: '粉红', 자주: '紫红',
  갈: '褐', 갈색: '褐', 밤: '棕', 흑: '黑', 검은: '黑', 검정: '黑', 회: '灰', 재: '灰',
  녹: '绿', 초록: '绿', 연두: '黄绿', 보라: '紫', 자: '紫', 주황: '橙', 오렌지: '橙',
  청: '青', 파란: '蓝', 파랑: '蓝', 크림: '奶油', 베이지: '米', 상아: '象牙', 우유: '乳',
};
const CTOK_KEYS = Object.keys(CTOK_RAW).sort((a, b) => b.length - a.length);
function colorCompose(t) {
  const s = String(t ?? '').replace(/\s+/g, '');
  if (!s || !/[가-힣]/.test(s)) return null;
  let i = 0, out = '';
  outer: while (i < s.length) {
    for (const k of CTOK_KEYS) if (s.startsWith(k, i)) { out += CTOK_RAW[k]; i += k.length; continue outer; }
    return null;
  }
  return out;
}

/* 제형 서술 — 모양·코팅·재질 수식어의 조합이다. 최장 일치로 토막 내 순서대로 잇는다. */
const FORM_RAW = {
  점도가있는: '黏稠的', 내용물을함유한: '含内容物的', 분말을함유한: '含粉末的', 과립을함유한: '含颗粒的',
  액상을함유한: '含液状内容物的', 내용물이든: '含内容物的',
  투명한: '透明', 투명의: '透明', 투명: '透明', 반투명: '半透明', 불투명: '不透明',
  장방형: '长方形', 타원형: '椭圆形', 장타원형: '长椭圆形', 원형: '圆形', 구형: '球形',
  스틱형: '棒形', 삼각형: '三角形', 사각형: '四角形', 캡슐형: '胶囊形', 아몬드형: '杏仁形',
  츄어블: '咀嚼', 제피: '包衣', 코팅: '包衣', 필름코팅: '薄膜包衣', 이중: '双层', 서방형: '缓释',
  연질캡슐: '软胶囊', 경질캡슐: '硬胶囊', 연질캅셀: '软胶囊', 경질캅셀: '硬胶囊', 캡슐: '胶囊', 캅셀: '胶囊',
  제피정제: '包衣片剂', 코팅정제: '包衣片剂', 정제: '片剂', 정: '片剂',
  젤리: '凝胶软糖', 액상: '液状', 액제: '液剂', 분말: '粉末', 과립: '颗粒', 환: '丸', 시럽: '糖浆',
  분말스틱: '粉末棒包', 바: '棒状食品', 필름: '薄膜',
  입자성이있는: '有颗粒感的', 점조성이있는: '黏稠的', 점조성: '黏稠', 유동성: '流动性',
  내용물을포함한: '含内容物的', 분말을포함한: '含粉末的', 액상제품: '液状产品', 제품: '产品',
  불투명한: '不透明', 반투명한: '半透明', 이중정제: '双层片剂', 츄어블정제: '咀嚼片剂',
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

const ATOM_MEMO = new Map();
function resolveAtom(t, depth = 0) {
  if (depth > 4) return null;
  const t0 = norm(t);
  if (!t0) return null;
  /* 규칙이 서로를 다시 부르며 같은 조각을 반복 계산한다(지수 폭발). 결정적 함수이므로 메모한다. */
  const mk = `${depth} ${t0}`;
  if (ATOM_MEMO.has(mk)) return ATOM_MEMO.get(mk);
  const r0 = resolveAtomRaw(t0, depth);
  ATOM_MEMO.set(mk, r0);
  return r0;
}
function resolveAtomRaw(t0, depth) {
  /* 한글이 없는 조각(수치·단위·로마자·기호)은 번역 대상이 아니다. 원문 표기를 그대로 둔다. */
  if (!/[가-힣]/.test(t0)) return t0;
  const hit = lookup(null, t0);
  if (hit) return hit.zh;
  /* `세 균 수` `성 상` — 기준·규격 표에서 자간을 벌린 표기. 붙여 쓴 형태로만 사전을 다시 본다. */
  if (/[가-힣]\s+[가-힣]/.test(t0)) {
    const sq = lookup(null, t0.replace(/\s+/g, ''));
    if (sq) return sq.zh;
  }
  /* 한글이 배수 접미사뿐인 조각(`300,000,000,000(3,000억) CFU/g`). 값·단위는 그대로 두고 표기만 옮긴다. */
  if (/^[^가-힣]*(?:[억만천][^가-힣]*)+$/.test(t0))
    return t0.replace(/억/g, '亿').replace(/만/g, '万').replace(/천/g, '千');
  /* `깅콜릭산(ginkgolic acid)(mg/kg)` — 뒤에 붙는 별칭·단위 괄호. 괄호 안이 한글이 아니면 표기 그대로 둔다. */
  {
    const pm = /^(.+?)((?:\s*[([]\s*[^()[\]가-힣]*\s*[)\]])+)$/.exec(t0);
    if (pm && /[가-힣]/.test(pm[1])) {
      const a = resolveAtom(pm[1].trim(), depth + 1);
      /* 괄호 안 표기(로마자 별칭·단위)는 원문 그대로 둔다. 앞쪽 공백만 정리한다. */
      if (a) return a + pm[2].replace(/^\s+/, '').replace(/\s*([([])\s*/g, '$1');
    }
  }
  /* 순수 수치 토큰. 값·단위는 그대로 두고 배수 접미사 표기만 중국어로 옮긴다(값 동일). */
  if (NUMTOK.test(t0)) return t0.replace(/\s+/g, '').replace(/억/g, '亿').replace(/만/g, '万').replace(/천/g, '千')
    .replace(/정$/, '片').replace(/캡슐$/, '粒胶囊').replace(/포$/, '袋').replace(/병$/, '瓶')
    .replace(/알$/, '粒').replace(/매$/, '张').replace(/개$/, '个').replace(/회$/, '次');
  /* `진세노사이드 Rg1, Rb1 및 Rg3의 합계로서 3~80 mg` — 지표성분 합계 표기.
     합계는 열거 전체에 걸린다. 어떤 분해 규칙보다 먼저 처리해 귀속을 마지막 원료로 좁히지 않는다(§5). */
  let mS;
  if ((mS = /^([^:：]+?)(?:으로서|로서)\s+([^:：]+)$/.exec(t0))) {
    const a = resolveAtom(mS[1].trim(), depth + 1), b = resolveAtom(mS[2].trim(), depth + 1);
    if (a && b) return `以${a}计${b}`;
  }
  if ((mS = /^(.+?)의\s*(?:합계|합)$/.exec(t0))) { const a = resolveAtom(mS[1].trim(), depth + 1); if (a) return `${a}之和`; }
  const d = dosage(t0); if (d) return d;
  const ia = ingredientAmount(t0); if (ia) return ia;
  const p = paren(t0); if (p) return p;
  const lc = labelColon(t0); if (lc) return lc;
  const dc = doseChain(t0); if (dc) return dc;
  const ik = intake(t0); if (ik) return ik;
  const hc = headingCompose(t0, depth); if (hc) return hc;
  /* 푸터·각주는 ` · ` / ` * ` (공백 포함) 로 조각이 이어진다.
     조각 안의 `예방·치료` 같이 붙어 있는 가운뎃점과 구분한다. */
  if (SPACED.test(t0)) {
    const sp = splitTop(t0, SPACED);
    const parts = sp.parts;
    const seps = sp.seps.map((x) => (x.includes('*') ? ' * ' : ' · '));
    if (parts.length > 1 && parts.every(Boolean)) {
      const zh = parts.map((s) => resolveAtom(s, depth + 1));
      if (zh.every(Boolean)) return zh.map((s, i) => (i ? seps[i - 1] + s : s)).join('');
    }
  }
  /* `아연 :` 처럼 값이 비어 있는 라벨. 라벨만 옮기고 표기는 그대로 둔다. */
  const co = /^(.+?)\s*[:：]$/.exec(t0);
  if (co) { const a = resolveAtom(co[1].trim(), depth + 1); if (a) return `${a}：`; }
  /* `* 아연` 각주 표기. 표기는 그대로 두고 본문만 옮긴다. */
  const st = /^([*※])\s*(.+)$/.exec(t0);
  if (st) { const a = resolveAtom(st[2].trim(), depth + 1); if (a) return `${st[1]} ${a}`; }
  const sc = sentenceCompose(t0, depth); if (sc) return sc;
  const fc = fragmentCompose(t0, depth); if (fc) return fc;
  /* 여러 문장이 이어진 슬롯. 문장 단위로 옮기고 모두 해석돼야 한다.
     `보관하십시오.② 어린이…` 처럼 마침표 뒤 공백 없이 마커가 이어지는 표기도 문장 경계로 본다.
     수치 소수점(`3.5g`)과 구분하기 위해 한국어 종결 어미 뒤에서만 나눈다. */
  {
    const SENT = /(?<=[다요오][.])\s*(?=\S)/;
    if (SENT.test(t0)) {
      const ss = t0.split(SENT).map((s) => s.trim()).filter(Boolean);
      if (ss.length > 1) {
        /* 조각마다 마커 접두가 다시 나타난다 — zh() 를 거쳐 마커 규칙을 그대로 태운다. */
        const zhs = ss.map((s) => zh(null, s)).map((r) => r && r.zh);
        /* 문장 경계를 잃지 않는다 — 종결 부호가 없는 조각에는 마침표를 둔다. */
        if (zhs.every(Boolean)) return zhs.map((s) => (/[。！？.:：)）]$/.test(s) ? s : `${s}。`)).join('');
      }
    }
  }
  if (/[.]\s+\S/.test(t0)) {
    const ss = t0.split(/(?<=[.])\s+/).map((s) => s.trim()).filter(Boolean);
    if (ss.length > 1) {
      const zhs = ss.map((s) => resolveAtom(s, depth + 1));
      if (zhs.every(Boolean)) return zhs.join('');
    }
  }
  /* `2g당 1억 CFU 이상` — 기준·규격 표기. 수치는 원문 토큰을 그대로 옮긴다. */
  let m2;
  if ((m2 = /^(.+?)\s*당\s*(.+?)\s*(이상|이하|미만|초과)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `每${a}${b}${{ 이상: '以上', 이하: '以下', 미만: '未满', 초과: '超过' }[m2[3]]}`;
  }
  if ((m2 = /^(.+?)\s*당\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `每${a}${b}`;
  }
  /* `1.0mg/kg 이하` `60분 이내` — 기준·규격의 한계 표기. 수치·단위는 원문 그대로 둔다. */
  const LIMIT = { 이하: '以下', 이상: '以上', 미만: '未满', 초과: '超过', 이내: '以内' };
  if ((m2 = /^(.+?)\s*(이하|이상|미만|초과|이내)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return a + LIMIT[m2[2]];
  }
  /* `60분` `12개월` — 시간 단위. */
  if ((m2 = /^(\d+(?:[.,]\d+)*)\s*(분|시간|초|주|개월|년|일)$/.exec(t0)))
    return m2[1] + { 분: '分钟', 시간: '小时', 초: '秒', 주: '周', 개월: '个月', 년: '年', 일: '日' }[m2[2]];
  /* `2,000억` — 배수 접미사만 표기를 옮긴다(값 동일). */
  if ((m2 = /^(\d[\d.,]*)\s*(억|만|천)$/.exec(t0)))
    return m2[1] + { 억: '亿', 만: '万', 천: '千' }[m2[2]];
  /* `표시량(2.55mg/500mg)의 80~150%` — 뒤가 순수 수치면 앞만 옮긴다. */
  if ((m2 = /^(.+?)의\s*([^가-힣]+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}的${m2[2].trim()}`;
  }
  /* `[기준규격]` `(시험방법: …)` — 괄호 표기는 그대로 두고 안쪽만 옮긴다. */
  if ((m2 = /^\[(.+)\]$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `[${a}]`; }
  if ((m2 = /^\((.+)\)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `（${a}）`; }
  /* `- 대장균군 : 음성` — 목록 표기. */
  if ((m2 = /^[-–]\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `- ${a}`; }
  /* `루테인 제품` — 원료명 + 제품. */
  if ((m2 = /^(.+?)\s*제품$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}产品`; }
  /* `루테인의 기능성은 아래 공식 인정 범위와 같습니다.` */
  if ((m2 = /^(.+?)의\s*(기능성|영양기능)은\s*아래\s*공식\s*인정\s*범위와\s*같습니다[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}的${m2[2] === '기능성' ? '功能性' : '营养功能'}如下方官方认定范围所示。`;
  }
  /* `표시량(36 mg/1일 섭취량)의 80~150%` — 괄호·대괄호·중괄호 + 뒤따르는 조사. */
  if ((m2 = /^([^([{｛（〔［]+)[([{｛（〔［](.+)[)\]}｝）〕］]\s*의\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1), c2 = resolveAtom(m2[3].trim(), depth + 1);
    if (a && b && c2) return `${a}（${b}）的${c2}`;
  }
  if ((m2 = /^([^([{｛（〔［]+)[([{｛（〔［](.+)[)\]}｝）〕］]$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}（${b}）`;
  }
  const ap = appearance(t0, depth); if (ap) return ap;
  /* `1일 1회(1캡슐) 섭취로 루테인 20mg` — 섭취 단위당 표시량. */
  if ((m2 = /^(.+?)\s*섭취로\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}摄取可摄入${b}`;
  }
  /* `36 mg/1일 섭취량` — 기준량 표기의 슬래시. 양쪽이 모두 해석돼야 하고 표기는 그대로 둔다. */
  if (t0.includes('/')) {
    const sl = t0.split('/').map((x) => x.trim());
    if (sl.length > 1 && sl.every(Boolean)) {
      const zs = sl.map((x) => resolveAtom(x, depth + 1));
      if (zs.every((x) => x !== null)) return zs.join('/');
    }
  }
  /* `진세노사이드 Rg1과 Rb1의 합` — 지표성분 합산 표기. 성분 표기는 원문 그대로 두고 연결어만 옮긴다. */
  if ((m2 = /^(.+)의\s*합$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}之和`; }
  /* 성분 기호 뒤의 연결어(`Rg1과 Rb1`, `Rb1 및 Rg3`). 좌변이 기호·숫자로 끝날 때만 적용한다. */
  if ((m2 = /^(.+?[A-Za-z0-9])\s*(과|와|및)\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[3].trim(), depth + 1);
    if (a && b) return `${a}${m2[2] === '및' ? '及' : '与'}${b}`;
  }
  /* ── 보관 조건·유통기한 ────────────────────────────────────────
     `직사광선을 피하여 서늘한 곳에 보관하십시오.` — 회피 대상 + 보관 장소의 조합이다.
     온도·습도 수치와 지시 강도는 그대로 옮긴다(§5). */
  /* `제품은 …` — 보관 문장의 주어. 회피 대상 규칙보다 먼저 떼어낸다. */
  if ((m2 = /^(본\s*)?제품은\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[2].trim(), depth + 1);
    if (a) return `本产品${a}`;
  }
  if ((m2 = /^(.+?)[을를]?\s*(?:피하여|피하고|피해서|피해|피하)\s*[,，]?\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `请避开${a}，${b}`;
  }
  {
    /* 보관·보존 지시. `보관 및 유통`, `보관하시고 …` 처럼 이어지는 표기까지 한 규칙으로 본다. */
    const KEEP_END = '(?:하십시오|하세요|하시기\\s*바랍니다|하여야\\s*한다|해야\\s*한다|하여야\\s*함|해야\\s*함|한다|합니다|해\\s*주십시오|해주세요|할\\s*것)?';
    const KEEP_RE = new RegExp(`^(.+?)(?:에서|에)\\s*(?:보관|보존)\\s*(?:[,，]?\\s*(?:및\\s*)?유통)?\\s*${KEEP_END}\\s*[.]?$`);
    if ((m2 = KEEP_RE.exec(t0))) {
      const a = resolveAtom(m2[1].trim(), depth + 1);
      if (a) return /유통/.test(m2[0].slice(m2[1].length)) ? `请在${a}保存及流通。` : `请在${a}保存。`;
    }
    /* `… 곳에 보관하시고, 어린이의 손에 닿지 않도록 …` — 뒤 문장이 이어지는 형태. */
    const CONT_RE = new RegExp('^(.+?)(?:에서|에)\\s*(?:보관|보존)\\s*(?:[,，]?\\s*(?:및\\s*)?유통)?\\s*(?:하시고|하고|하시며|하며)\\s*[,，]?\\s*(.+)$');
    if ((m2 = CONT_RE.exec(t0))) {
      const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
      if (a && b) return `请在${a}${/유통/.test(t0.slice(m2[1].length, t0.length - m2[2].length)) ? '保存及流通' : '保存'}，${b}`;
    }
  }
  /* `30℃ 이상` `표시량 이상` — 판정 강도 접미. 수치·단위는 그대로 둔다. */
  if ((m2 = /^(.+?)\s*(이상|이하|미만|초과|이내)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}${{ 이상: '以上', 이하: '以下', 미만: '未满', 초과: '超过', 이내: '以内' }[m2[2]]}`;
  }
  /* `제2018-4호` — 개별인정 번호. 번호는 원문 그대로 둔다(§5). */
  if ((m2 = /^제\s*([\d‐-―-]+)\s*호$/.exec(t0))) return `第${m2[1]}号`;
  /* `2g = 1포 = 하루 섭취량` — 등가 표기. 기호와 수치를 그대로 둔다. */
  if (/\s=\s/.test(t0)) {
    const ps = t0.split(/\s*=\s*/).map((s) => s.trim()).filter(Boolean);
    if (ps.length > 1) {
      const zs = ps.map((s) => resolveAtom(s, depth + 1));
      if (zs.every(Boolean)) return zs.join(' = ');
    }
  }
  /* `(가) … (나) …` — 기능성 항목의 병렬 표기. 마커는 원문 표기를 유지한다. */
  if (/[(（][가나다라마바사][)）]/.test(t0) && t0.split(/(?=[(（][가나다라마바사][)）])/).length > 2) {
    const ps = t0.split(/(?=[(（][가나다라마바사][)）])/).map((s) => s.trim()).filter(Boolean);
    const zs = ps.map((s) => { const r = zh(null, s); return r && r.zh; });
    if (zs.every(Boolean)) return zs.join(' ');
  }
  /* `제조일로부터 24개월(까지)` — 유통기한 표기. 기간 수치는 원문 그대로 둔다. */
  if ((m2 = /^제조일(?:로\s*|)부터\s*(.+?)\s*(까지)?[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `自生产之日起${a}${m2[2] ? '为止' : ''}`;
  }
  if ((m2 = /^(.+?)\s*까지$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}为止`; }
  /* `코스맥스바이오(주) 제조` — 제조사 법인명은 고유명사다. 승인된 EN 자산과 같은 계약으로
     법인명은 원문 표기를 유지하고 틀만 옮긴다(EN: `Made by 코스맥스바이오(주)`).
     중국어 상호를 지어내지 않는다. 문장·시설·공법 서술은 제외한다. */
  if ((m2 = /^(.{1,32}?)\s*제조$/.exec(t0)) && !/(시설|설비|공법|사용|천연|원료|업체|제품|하여|합니다|되었|중인)/.test(m2[1])
    && /(주\)|\(주|주식회사|유한회사|㈜|공장|사업소)/.test(m2[1]))
    return `${m2[1].replace(/\s+/g, ' ').trim()} 制造`;
  /* ── 기준·규격 표기 ────────────────────────────────────────────
     시험 항목명과 판정값은 표기 변형이 매우 많다. 수치·단위·판정 강도는 손대지 않고 틀만 옮긴다(§5). */
  /* `납(mg/kg) 1.0이하` — 콜론 없이 공백으로 값이 붙는 표기. */
  /* `1.0 이하이어야 한다.` — 판정의 강도를 낮추지 않는다. */
  if ((m2 = /^(.+?)\s*(이하|이상|미만|초과|이내)\s*(?:이어야|이여야)\s*한다[.]?$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}${{ 이하: '以下', 이상: '以上', 미만: '未满', 초과: '超过', 이내: '以内' }[m2[2]]}。`;
  }
  /* `0.5 이하.` — 문장부호만 뒤에 붙은 한계 표기. */
  if ((m2 = /^(.+?(?:이하|이상|미만|초과|이내))\s*[.]$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a}。`;
  }
  /* `1ml당` `1 ㎖ 당` — 기준량 단독 표기. */
  if ((m2 = /^([^가-힣]+)\s*당$/.exec(t0))) return `每${m2[1].replace(/\s+/g, '')}`;
  /* `일일섭취량 중 300 이하` — 범위 한정. */
  if ((m2 = /^(.+?)\s*중\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}中${b}`;
  }
  /* `초산에틸을 사용한 경우` — 조건 부기. */
  if ((m2 = /^(.+?)[을를]?\s*사용한\s*경우$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `使用${a}的情况`;
  }
  /* 붕해 시험의 판정 — `물을 시험액으로 20분 이내 적합` / `물에서 60분 이내` / `제1액에서 60분`. */
  if ((m2 = /^물을\s*시험액으로\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `以水为试验液${a}`; }
  if ((m2 = /^물에서\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `在水中${a}`; }
  if ((m2 = /^제\s*(\d+)\s*액에서\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `在第${m2[1]}液中${a}`; }
  if ((m2 = /^(\d+)\s*액에서\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `在第${m2[1]}液中${a}`; }
  if ((m2 = /^제?\s*(\d+)\s*액\s+(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `第${m2[1]}液${a}`; }
  if ((m2 = /^(\d+)\s*차\s+(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `第${m2[1]}次${a}`; }
  if ((m2 = /^(.+?)\s*(적합|붕해|확인|검출)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return a + { 적합: '符合', 붕해: '崩解', 확인: '确认', 검출: '检出' }[m2[2]];
  }
  /* `X 함량` `X 비율` `X 수` — 시험 항목명의 접미. */
  if ((m2 = /^(.+?)\s*(함량|비율|함유량|활성)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return a + { 함량: '含量', 비율: '比例', 함유량: '含量', 활성: '活性' }[m2[2]];
  }
  if ((m2 = /^(.+?[가-힣])\s*수$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}数`; }
  /* `(silybin으로서)` `(비배당체로서)` — 환산 기준 표기. */
  if ((m2 = /^(.+?)(?:으로서|로서)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `以${a}计`; }
  /* 짝이 맞지 않는 괄호(`(시험방법` / `… Rg3)`) — 표기를 그대로 두고 안쪽만 옮긴다. */
  if ((m2 = /^[(（]([^()（）]+)$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `（${a}`; }
  if ((m2 = /^([^()（）]+)[)）]$/.exec(t0))) { const a = resolveAtom(m2[1].trim(), depth + 1); if (a) return `${a}）`; }
  /* `건강기능식품공전 제 4.` — 공전 조항 표기. */
  if ((m2 = /^(.+?)\s+(제\s*[\d.]+.*)$/.exec(t0)) && !/[가-힣]/.test(m2[2].replace(/^제/, ''))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `${a} 第${m2[2].replace(/^제\s*/, '')}`;
  }
  /* 값이 없는 항목명 뒤에 괄호 설명만 붙은 표기(`2 g (표시량 이상)`). */
  if ((m2 = /^([^가-힣]+)\s*[(（](.+)[)）]$/.exec(t0))) {
    const a = resolveAtom(m2[2].trim(), depth + 1);
    if (a) return `${m2[1].trim()}（${a}）`;
  }
  /* `(20분 이내) 적합하여야 한다.` — 괄호 부기가 앞서는 표기. */
  if ((m2 = /^[(（]([^()（）]+)[)）]\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `（${a}）${b}`;
  }
  /* `진세노사이드 Rg1, Rb1 및 Rg3` `직사광선 및 고온다습한 곳` — 접속 표기.
     양쪽이 모두 해석돼야 한다(일부만 번역된 혼합 조각 금지). */
  if ((m2 = /^(.+?)\s*(및|또는|이나|와|과)\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[3].trim(), depth + 1);
    if (a && b) return `${a}${{ 및: '及', 또는: '或', 이나: '或', 와: '与', 과: '与' }[m2[2]]}${b}`;
  }
  /* `나이아신 - 체내 에너지 생성에 필요` `1일 1회 1회 1포 — 매일 챙기기 쉽게` — 구분 기호는 원문 표기를 유지한다. */
  if ((m2 = /^(.+?)\s+([-–—])\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[3].trim(), depth + 1);
    if (a && b) return `${a} ${m2[2]} ${b}`;
  }
  if ((m2 = /^([·•])\s*(.+)$/.exec(t0))) { const a = resolveAtom(m2[2].trim(), depth + 1); if (a) return `${m2[1]} ${a}`; }
  /* `(국문) … (영문) …` — 개별인정 기능성의 국·영문 병기. 영문 원문은 그대로 둔다(§5 원문 보존). */
  if ((m2 = /^[(（]국문[)）]\s*(.+?)\s*[(（]영문[)）]\s*(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1);
    if (a) return `（韩文）${a}（英文）${m2[2].trim()}`;
  }
  /* `…을 주원료로 한 4원료 복합 건강기능식품입니다.` — 앞 슬롯의 제품명을 받는 도입 문구. */
  if ((m2 = /^[을를]\s*주원료로\s*한\s*(\d+)\s*원료\s*복합\s*건강기능식품입니다[.]?\s*(.*)$/.exec(t0))) {
    const rest = m2[2].trim();
    const b = rest ? resolveAtom(rest, depth + 1) : '';
    if (b !== null) return `是以其为主原料的${m2[1]}种原料复合保健功能食品。${b}`;
  }
  /* `코엔자임 Q10은 항산화에 도움을 줄 수 있습니다.` — 주어 + 서술. 양쪽이 모두 해석돼야 한다. */
  if ((m2 = /^(.+?)[은는]\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}${b}`;
  }
  /* 법인명 단독 조각(`(주)한국인삼공사`) — 제조사 표기와 같은 계약으로 원문을 유지한다. */
  if (/(\(주\)|㈜|주식회사|유한회사)/.test(t0) && t0.length <= 32 && !/(합니다|입니다|하십시오|제품을|사용)/.test(t0))
    return t0.replace(/\s+/g, ' ').trim();
  /* 열거 — 모든 조각이 해석돼야 한다(일부만 번역된 혼합 문장을 만들지 않는다). */
  if (SPLIT.test(t0)) {
    /* 구분자를 보존한다 — 열거(·)와 병렬 문장(,)은 원문 표기를 그대로 따른다. */
    const sp = splitTop(t0, SPLIT);
    const parts = sp.parts;
    const seps = sp.seps.map((x) => (/[,，]/.test(x) ? '，' : /\//.test(x) ? '/' : '·'));
    if (parts.length > 1 && parts.every(Boolean)) {
      const zh = parts.map((s) => resolveAtom(s, depth + 1));
      if (zh.every(Boolean)) return zh.map((s, i) => (i ? seps[i - 1] + s : s)).join('');
    }
  }
  /* 최후 수단 — 공백으로 이어진 두 조각(`건강기능식품공전 진세노사이드 Rg1`).
     양쪽이 모두 해석될 때만 쓴다. 순서는 원문을 따르고 내용을 더하거나 빼지 않는다. */
  if ((m2 = /^(\S+)\s+(.+)$/.exec(t0))) {
    const a = resolveAtom(m2[1].trim(), depth + 1), b = resolveAtom(m2[2].trim(), depth + 1);
    if (a && b) return `${a}${/^[A-Za-z0-9(]/.test(b) ? ' ' : ''}${b}`;
  }
  /* 저작 대상 원자 수집 — 짧은 실패 조각이 다음 라운드의 입력이다. */
  FAILED.set(t0, (FAILED.get(t0) ?? 0) + 1);
  return null;
}

/**
 * 슬롯 번역. 해석 불가면 null 을 돌려주고 호출부가 문제 큐로 보낸다.
 * 반환된 문자열은 수치 보존 검사를 통과해야만 사용한다(호출부 계약).
 */
const ZH_MEMO = new Map();
export function zh(kind, text) {
  const t = norm(text);
  if (!t) return null;
  /* 같은 슬롯 문구가 4만 문서에 반복된다 — 결정적 함수이므로 결과를 재사용한다. */
  const mk = `${kind} ${t}`;
  if (ZH_MEMO.has(mk)) return ZH_MEMO.get(mk);
  const res = zhCompute(kind, t);
  ZH_MEMO.set(mk, res);
  return res;
}
function zhCompute(kind, t) {
  /* 한글이 없는 슬롯(수치·기호·로마자 표기)은 번역 대상이 아니다. 원문을 그대로 둔다. */
  if (!/[가-힣]/.test(t)) return { zh: t, how: 'passthrough' };
  const hit = lookup(kind, t);
  if (hit) return hit;
  /* 마커 접두는 표기다. 원문 마커를 그대로 두고 본문만 번역한다. */
  const mm = MARK_HEAD.exec(t);
  if (mm) {
    const rest = t.slice(mm[0].length);
    const r = zh(kind, rest);
    /* 가·나·다 마커는 한글 자체가 순서 기호다. 순서를 유지한 채 천간(甲乙丙…)으로 옮긴다. */
    if (r) return { zh: mm[0].replace(/\s+$/, ' ').replace(/[가나다라마바사]/g, (c) => ({ 가: '甲', 나: '乙', 다: '丙', 라: '丁', 마: '戊', 바: '己', 사: '庚' }[c])) + r.zh, how: `marker+${r.how}` };
  }
  const a = resolveAtom(t);
  if (a) return { zh: a, how: 'compose' };
  return null;
}

export const dictSize = () => Object.fromEntries(Object.entries(AUTH).map(([k, v]) => [k, Object.keys(v).length]));

/* 렌더 단계 진입 전 메모 해제 — 번역이 끝난 뒤에는 heap 만 차지한다. */
export const clearMemo = () => { ATOM_MEMO.clear(); ZH_MEMO.clear(); };
