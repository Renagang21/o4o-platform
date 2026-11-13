/**
 * OTC 설명서 번역 비교 표본 — 2026-11-13 사용자 결정(소비자 다국어 = 한국어 원본 + AI 번역 + 한국어 병기).
 *
 * 질문: 미리 만들어 둔 OTC 영문 설명(검수 번역) 대신, 한국어 원본을 운영 AI 번역 경로로 그때그때 번역해도 품질이 충분한가.
 * OTC 내용(용법 · 용량 · 금기)은 허가 정보라 원문이 같다 — 확인할 것은 번역 품질뿐이다(사용자 판단).
 *
 * 세 단계로 나눈다:
 *   extract  — 읽기 전용. 한국어 · 기존 영문 canonical 설명이 모두 있는 OTC 를 층별로 30건 고른다.
 *   translate — 표본의 한국어 원본을 운영과 같은 번역 경로(ContentTranslationService · CONTENT_TRANSLATION 정책)로 번역한다.
 *               결과는 파일에만 쓴다 — 설명 표에 저장하지 않는다. AI 사용 기록(정산 · 한도)은 운영 경로대로 남는다.
 *   compare  — 파일만 읽는다. 숫자 · 단위 · 연령 · 금지 표현을 원문 · 기존 영문 · AI 번역 사이에서 대조한다.
 * 의약품 허가 정보만 다룬다(개인정보 없음). 결과 파일은 저장소에 넣지 않는다.
 */

export const SAMPLE_PER_BUCKET = 10;
export type SampleBucket = 'pediatric' | 'nonoral' | 'general';

export interface SampleItem {
  masterId: string;
  name: string;
  bucket: SampleBucket;
  ko: string;
  savedEn: string;
  aiEn?: string | null;
  aiModel?: string | null;
}

/**
 * 층: 소아 연령 제한 · 비경구(바르는 약 · 눈 · 질 · 붙이는 약) · 그 밖의 일반 내복약. 한 품목은 한 층에만 든다(소아 우선).
 * 순서는 md5(master_id) 로 고정 — 다시 돌려도 같은 표본이 나온다.
 */
export const SAMPLE_SQL = `
WITH pairs AS (
  SELECT ko.master_id, pm.name, ko.content AS ko, en.content AS saved_en,
    CASE
      WHEN ko.content ~ '(소아|어린이|영아|유아|만 ?[0-9]+ ?세|[0-9]+ ?세 ?(미만|이하|이상))' THEN 'pediatric'
      WHEN ko.content ~ '(바르|도포|점안|눈에 넣|외용|질정|질내|좌제|항문|붙이|패치|흡입|분무|가글|양치)' THEN 'nonoral'
      ELSE 'general' END AS bucket
  FROM shared_product_descriptions ko
  JOIN shared_product_descriptions en ON en.master_id=ko.master_id AND en.language='en' AND en.status='canonical'
    AND en.description_type='STORE' AND en.deleted_at IS NULL
  JOIN product_masters pm ON pm.id=ko.master_id
  WHERE ko.source_type=$1 AND COALESCE(ko.language,'ko')='ko' AND ko.status='canonical'
    AND ko.description_type='STORE' AND ko.deleted_at IS NULL
), ranked AS (
  SELECT *, row_number() OVER (PARTITION BY bucket ORDER BY md5(master_id::text)) AS rn FROM pairs
)
SELECT master_id AS "masterId", name, bucket, ko, saved_en AS "savedEn" FROM ranked WHERE rn<=$2
ORDER BY bucket, rn`;

const text = (html: string) => html
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

const EN_WORDS: Record<string, string> = { two: '2', twice: '2', three: '3', thrice: '3', four: '4', five: '5', six: '6',
  seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', half: '1/2' };

/**
 * 용량 · 횟수 · 연령에 쓰인 숫자. 단위 표기는 언어마다 달라(mg · 밀리그램, 회 · times) 숫자 자체만 비교한다.
 * 분수 · 소수는 하나의 값으로 본다(1/2, 0.5). 1~3 같은 범위는 양 끝을 따로 센다.
 * 단독 「1」은 세지 않는다 — 한국어 「1회 · 1일」은 영어에서 「per dose · a day」로 쓰여 숫자가 사라진다.
 * 영어 수사(two · twice · half)는 숫자로 바꿔 센다.
 */
export function numbersOf(html: string): string[] {
  const plain = text(html).replace(/\b(two|twice|three|thrice|four|five|six|seven|eight|nine|ten|eleven|twelve|half)\b/gi,
    word => EN_WORDS[word.toLowerCase()]);
  const found = plain.match(/\d+(?:[.,]\d+)?(?:\/\d+)?/g) ?? [];
  return found.map(n => n.replace(',', '.')).map(n => (/^\d+\.0+$/.test(n) ? n.replace(/\.0+$/, '') : n))
    .filter(n => n !== '1').sort();
}

const KO_PROHIBIT = /(복용하지 마|사용하지 마|투여하지 마|금기|복용하지 말|사용하지 말)/g;
const EN_PROHIBIT = /\b(do not|don't|must not|should not|never|contraindicated|avoid)\b/gi;

export interface Comparison {
  masterId: string;
  name: string;
  bucket: SampleBucket;
  /** 원문 숫자 중 AI 번역에 없는 것(용량 · 연령 · 횟수 누락 의심). */
  missingNumbers: string[];
  /** AI 번역에만 있는 숫자(새로 생긴 값 의심). */
  extraNumbers: string[];
  /** 기존 영문도 같은 숫자를 빠뜨렸는지 — 원문 표기 문제와 번역 문제를 구분한다. */
  savedEnMissingNumbers: string[];
  koProhibitions: number;
  aiProhibitions: number;
  savedProhibitions: number;
  /** 한글이 번역 결과에 남았는지(번역 누락). */
  aiHangulLeft: boolean;
  lengthRatio: number | null;
  verdict: 'ok' | 'check' | 'failed';
}

const diff = (from: string[], to: string[]) => {
  const left = [...to];
  return from.filter(value => { const i = left.indexOf(value); if (i < 0) return true; left.splice(i, 1); return false; });
};

export function compareItem(item: SampleItem): Comparison {
  const base = { masterId: item.masterId, name: item.name, bucket: item.bucket };
  const ko = numbersOf(item.ko), saved = numbersOf(item.savedEn);
  const koProhibitions = (text(item.ko).match(KO_PROHIBIT) ?? []).length;
  const savedProhibitions = (text(item.savedEn).match(EN_PROHIBIT) ?? []).length;
  if (!item.aiEn) return { ...base, missingNumbers: [], extraNumbers: [], savedEnMissingNumbers: diff(ko, saved),
    koProhibitions, aiProhibitions: 0, savedProhibitions, aiHangulLeft: false, lengthRatio: null, verdict: 'failed' };
  const ai = numbersOf(item.aiEn);
  const aiText = text(item.aiEn);
  const missingNumbers = diff(ko, ai), extraNumbers = diff(ai, ko);
  const aiProhibitions = (aiText.match(EN_PROHIBIT) ?? []).length;
  const aiHangulLeft = /[가-힣]/.test(aiText);
  const lengthRatio = Math.round((aiText.length / Math.max(1, text(item.savedEn).length)) * 100) / 100;
  // 금지 표현이 원문에 있는데 번역에서 줄면 강도 약화 의심이다. 숫자 차이 · 한글 잔존도 사람이 확인한다.
  const check = missingNumbers.length > 0 || extraNumbers.length > 0 || aiHangulLeft || aiProhibitions < Math.min(koProhibitions, savedProhibitions);
  return { ...base, missingNumbers, extraNumbers, savedEnMissingNumbers: diff(ko, saved),
    koProhibitions, aiProhibitions, savedProhibitions, aiHangulLeft, lengthRatio, verdict: check ? 'check' : 'ok' };
}

export function summarize(items: SampleItem[]) {
  const rows = items.map(compareItem);
  const count = (verdict: Comparison['verdict']) => rows.filter(row => row.verdict === verdict).length;
  return { total: rows.length, ok: count('ok'), check: count('check'), failed: count('failed'), rows };
}
