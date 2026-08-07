/**
 * WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §5
 *
 * 일본어 트랙 슬롯 계약. 슬롯 정의는 **언어 중립 구조 계약**이므로 HFF 공통(SLOT_RE)을 그대로 쓰고,
 * ZH 트랙에서 추가로 확정된 3개 확장(기준·규격 항목 / 매장 문의 안내 / 제목 부제)을 동일하게 승계한다.
 * 슬롯을 좁게 잡으면 번역되지 않은 한국어가 화면에 남는다 — 확장 3건은 그 대응이며 언어와 무관하다.
 */
import { SLOT_RE, norm, key } from './hff-en-batch-01-translate.mjs';

export { SLOT_RE, norm, key };

export const JA_SLOTS = [
  ...SLOT_RE,
  { kind: 'spec', re: /(<div class="sd-item">)([\s\S]*?)(<\/div>)/g },
  { kind: 'clause', re: /(<div class="sd-cta">\s*<p>)([\s\S]*?)(<\/p>)/g },
  { kind: 'label', re: /(<small>)([\s\S]*?)(<\/small>)/g },
];

export const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
/* 일본어는 한자를 정상적으로 쓰므로 "한자가 있다"로 중국어 잔존을 판정할 수 없다.
   일본어 표기에 쓰이지 않는 **간체자 전용 글자**만 모아 ZH 혼입을 본다(§6 금지 항목).
   양쪽에서 동일하게 쓰는 글자(粒·袋·瓶·片·個 등)는 넣지 않는다 — 넣으면 정상 일본어가 탈락한다. */
export const SIMPLIFIED_ONLY = /[们说这么亿产东车长门问时样张纸买卖开关无专转载观应营养颗胶剂药苏虑质图运达过还进这将带尽]/;
