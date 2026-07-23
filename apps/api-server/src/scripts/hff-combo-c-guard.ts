/**
 * Agent C — 미등록 Combo 전용 G-MULTI 가드 (runComboGuard C 변형).
 * WO-O4O-HFF-COMBO-UNREGISTERED-C-EYE-CIRCULATION-V1.
 *
 * 공용 `hff-combo-compose.runComboGuard` 의 `SRC_LABEL` 은 module-private 라 C 미등록 원료 라벨을
 * 주입할 수 없다(→ G-MULTI-AMOUNT-SOURCE 가 "라벨 원문 미검출" 로 전량 BLOCK). 본 파일은 그 가드를
 * **C 소유로 복제**하되 SRC_LABEL 을 (공용 등록 원료 + C 미등록 원료) 병합본으로 구성한다.
 * 검사 로직·문구·룰 ID 는 공용과 **동일**(byte-equivalent 의도) — 오직 SRC_LABEL 병합만 다르다.
 * 공용 코드 무편집. 나머지 검사는 공용 composeCombo 산출 HTML 을 그대로 소비.
 */
import { NUTRIENT_META, FUNCTIONAL_META } from './hff-nutrient-registry.js';
import type { ComboSeed, MultiFinding } from './hff-combo-compose.js';
import { C_SRC_LABEL } from './hff-combo-c-unreg-registry.js';

const meta = (k: string) => NUTRIENT_META[k] ?? FUNCTIONAL_META[k];
function amtStr(a: ComboSeed['ingredients'][number]['declaredAmount']): string { return `${a.value}${a.unit === 'IU' ? ' IU' : a.unit}`; }

// 공용 hff-combo-compose.runComboGuard 의 SRC_LABEL(등록 원료) 1:1 복제 + C 미등록 원료 병합.
const SHARED_SRC_LABEL: Record<string, RegExp> = {
  '비타민D': /비타민\s?D/i, '비타민C': /비타민\s?C/i, '비타민A': /비타민\s?A\b|레티놀|베타카로/i, '비타민E': /비타민\s?E|토코페롤/i, '비타민K': /비타민\s?K/i,
  '비타민B1': /비타민\s?B\s?1\b|티아민/i, '비타민B2': /비타민\s?B\s?2|리보플라빈/i, '비타민B6': /비타민\s?B\s?6|피리독/i, '비타민B12': /비타민\s?B\s?12/i,
  '아연': /아연/i, '마그네슘': /마그네슘/i, '칼슘': /칼슘/i, '철': /철분|헴철|철\s*[:：(]|피로인산철/i, '셀레늄': /셀레늄|셀렌/i, '엽산': /엽산/i,
  '나이아신': /나이아신|니아신|니코틴/i, '판토텐산': /판토텐/i, '비오틴': /비오틴/i, '구리': /구리/i, '망간': /망간/i, '요오드': /요오드/i,
  'MSM': /MSM|엠에스엠|메틸설포닐|디메틸설폰/i, '글루코사민': /글루코사민/i, '루테인': /루테인|지아잔틴/i, '밀크씨슬': /실리마린|밀크씨슬/i,
  '코엔자임Q10': /코엔자임|코큐텐|Q10/i, '식이섬유': /식이섬유|차전자|난소화성/i, '옥타코사놀': /옥타코사놀/i,
  '오메가3': /EPA|DHA|정제어유/i, '가르시니아': /가르시니아|HCA|hydroxycitric|히드록시시트르/i, '녹차': /녹차|카테킨/i,
  '감마리놀렌산': /감마리놀렌/i, '프로폴리스': /프로폴리스|총\s*플라보노이드/i, '은행잎': /은행잎|플라보놀\s*배당체/i, '테아닌': /테아닌/i,
};
const SRC_LABEL: Record<string, RegExp> = { ...SHARED_SRC_LABEL, ...C_SRC_LABEL };

/** 공용 runComboGuard 와 동일 검사(SRC_LABEL 만 C 병합). */
export function runComboGuardC(seed: ComboSeed, ko: string, en: string): MultiFinding[] {
  const out: MultiFinding[] = [];
  const n = seed.ingredients.length;
  const koText = ko.replace(/<[^>]+>/g, ' '), enText = en.replace(/<[^>]+>/g, ' ');
  const koCards = (ko.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  const enCards = (en.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  if (koCards !== n || enCards !== n) out.push({ rule: 'G-MULTI-INGREDIENT-COUNT', status: 'BLOCKED', message: `원료 카드 수 불일치: grounding ${n} / ko ${koCards} / en ${enCards}` });
  for (const g of seed.ingredients) {
    if (g.functionsKo.length !== g.functionsEn.length) out.push({ rule: 'G-MULTI-BILINGUAL', status: 'BLOCKED', message: `${g.key} ko/en 기능성 개수 불일치 ${g.functionsKo.length}/${g.functionsEn.length}` });
    if (g.functionsKo.length === 0) out.push({ rule: 'G-MULTI-FUNCTION-COVERAGE', status: 'BLOCKED', message: `${g.key} 기능성 0` });
    for (const f of g.functionsKo) if (!koText.includes(f)) out.push({ rule: 'G-MULTI-FUNCTION-COVERAGE', status: 'BLOCKED', message: `${g.key} 기능성 ko 누락: ${f.slice(0, 20)}` });
  }
  for (const g of seed.ingredients) {
    const lk = meta(g.key).displayKo, amt = amtStr(g.declaredAmount), basis = `${g.declaredAmount.basisAmount}${g.declaredAmount.basisUnit}`;
    const row = new RegExp(`<b>${lk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</b> 표시량\\(${amt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${basis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
    if (!row.test(ko)) out.push({ rule: 'G-MULTI-AMOUNT-PAIRING', status: 'BLOCKED', message: `${g.key} 표시량 행 미검출/수치 혼입: ${amt}/${basis}` });
  }
  const srcNorm = (seed.source.baseStandard || '').replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)).replace(/㎎/g, 'mg').replace(/(?<=\d),(?=\d)/g, '').replace(/\s+/g, ' ');
  if (srcNorm) {
    const marks = seed.ingredients.map((g) => { const re = SRC_LABEL[g.key]; const m = re ? re.exec(srcNorm) : null; return { key: g.key, idx: m ? m.index : -1 }; });
    const positions = marks.filter((m) => m.idx >= 0).map((m) => m.idx).sort((a, b) => a - b);
    for (const g of seed.ingredients) {
      const mk = marks.find((m) => m.key === g.key)!;
      if (mk.idx < 0) { out.push({ rule: 'G-MULTI-AMOUNT-SOURCE', status: 'BLOCKED', message: `${g.key} 라벨 원문 미검출` }); continue; }
      const next = positions.find((p) => p > mk.idx) ?? srcNorm.length;
      const win = srcNorm.slice(mk.idx, Math.min(next, mk.idx + 80));
      const vStr = String(g.declaredAmount.value);
      if (!win.includes(vStr)) out.push({ rule: 'G-MULTI-AMOUNT-SOURCE', status: 'BLOCKED', message: `${g.key} 표시량 ${vStr} 이 원문 라벨 구간에 없음(수치 이동 의심)` });
    }
  }
  const keys = seed.ingredients.map((g) => g.key);
  if (new Set(keys).size !== keys.length) out.push({ rule: 'G-MULTI-DUPLICATE', status: 'BLOCKED', message: `원료 키 중복: ${keys.join(',')}` });
  const cardPos = (html: string, label: string) => html.indexOf(`<li><b>${label}</b><ul class="sd-why">`);
  const koIdx = seed.ingredients.map((g) => cardPos(ko, meta(g.key).displayKo));
  const enIdx = seed.ingredients.map((g) => cardPos(en, meta(g.key).displayEn));
  const asc = (a: number[]) => a.every((v, i) => i === 0 || (v > a[i - 1] && v >= 0));
  if (!asc(koIdx) || !asc(enIdx)) out.push({ rule: 'G-MULTI-BILINGUAL', status: 'BLOCKED', message: `원료 카드 순서 ko/en seed 불일치 (ko ${JSON.stringify(koIdx)} en ${JSON.stringify(enIdx)})` });
  return out;
}
