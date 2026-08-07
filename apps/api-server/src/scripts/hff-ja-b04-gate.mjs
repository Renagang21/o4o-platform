/**
 * WO-O4O-HFF-JA-REMAINING-16162-PHRASE-AUTHORING-STRUCTURED-COMPRESSION-AND-CONTINUOUS-SHARDS-V1 §1
 *
 * 일본어 **조립 사고** 게이트.
 *
 * 기존 게이트(수치 보존 `lostNums` · 한글 잔존 · 간체자)는 "무엇이 빠졌는가"만 본다.
 * 이 트랙에서 실측된 사고는 그 검사들을 **모두 통과하면서** 뜻을 망가뜨렸다:
 *   - 문장 경계 소실 → 서로 다른 기능성이 한 덩어리로 붙음 (§6 기능성 병합 금지 위반)
 *   - 조사 중복(`をが`) · 수식 중복 부착(`濃濃`) → 비문
 *   - 수치 문맥의 `이상`(하한)이 `異常`(이상반응)으로 옮겨져 부등호 방향이 뒤집힘
 *
 * 이 모듈은 고치지 않는다 — **막는다**. 걸린 문서는 생산하지 않고 문제 큐로 보낸다.
 * 규칙은 추측이 아니라 실측된 사고 유형만 담는다(오탐이 생기면 정상 문서를 잃기 때문).
 */

/** 조사 겹침 — 서로 다른 규칙이 같은 자리에 조사를 붙였다는 신호. 정상 일본어에는 나오지 않는 짝만 본다. */
export const PARTICLE_DUP = /をが|がを|をを|がが|をは|はを|にを/;
/** 같은 한자 즉시 반복 — 수식어가 두 번 부착됐다는 신호(`濃濃褐色` `黄黄緑色`). */
export const KANJI_DUP = /([一-龥])\1/;
/** 종결·조사 중복. */
export const END_DUP = /。。|のの/;
/** 기능성 경계 소실 — 구분 기호 없이 `役立つ` 가 두 번 이어지면 서로 다른 기능성이 붙은 것이다. */
export const CLAIM_RUN = /役立つ[^。、・]*役立つ/;
/* 수치 뒤의 `異常` — `80 이상`(以上)이 `80異常` 으로 뒤집힌 형태.
   항목 번호(`(2) 異常が生じた場合は…`)는 정상 문장이므로 잡으면 안 된다. 숫자·% 가 **바로 붙은**
   경우만 본다. 감사 초안에서 `[\d%)]\s*異常` 를 쓰자 항목 번호 1,516 건이 오탐으로 잡혔다. */
export const ABNORMAL_AFTER_NUM = /[\d%]異常/;

/** 조립 사고 유형을 돌려준다. 사고가 없으면 null. */
export function grammarDefect(s) {
  if (typeof s !== 'string' || !s) return null;
  if (PARTICLE_DUP.test(s)) return 'PARTICLE_DUP';
  if (KANJI_DUP.test(s)) return 'KANJI_DUP';
  if (END_DUP.test(s)) return 'END_DUP';
  if (CLAIM_RUN.test(s)) return 'CLAIM_RUN';
  if (ABNORMAL_AFTER_NUM.test(s)) return 'ABNORMAL_AFTER_NUM';
  return null;
}

/* 부등호 방향 보존 — **규격 값 문자열 단위로만** 쓴다.
   문서 전체에 적용하면 안 된다: 문서에는 안전 문맥의 `이상`(이상사례 → 異常)이 섞여 있어
   하한 `以上` 과 개수가 맞지 않는다. 초안이 문서 단위로 적용해 정상 문서 26,362 건을
   결함으로 잡았다. 문서 단위 판정은 ABNORMAL_AFTER_NUM 이 담당한다. */
export function directionBreak(koValue, jaValue) {
  const kU = (koValue.match(/이상/g) ?? []).length, kD = (koValue.match(/이하/g) ?? []).length;
  const jU = (jaValue.match(/以上/g) ?? []).length, jD = (jaValue.match(/以下/g) ?? []).length;
  return kU !== jU || kD !== jD;
}

/* 문서 판정 전에 태그를 경계 기호로 바꾼다.
   `<li>…役立つ</li><li>…役立つ</li>` 처럼 **항목이 나뉘어 있으면 경계 소실이 아니다**.
   태그를 지우지 않고 `・` 로 바꿔야 조사·한자 중복 검사도 태그를 넘어 잘못 매칭되지 않는다.
   (초안이 태그를 무시해 정상 문서 10,922 건을 결함으로 잡았다.) */
const tagsToBoundary = (html) => String(html ?? '').replace(/<[^>]+>/g, '・');

/** 문서 단위 판정 — HTML 본문을 훑어 조립 사고를 찾는다. */
export function scanDocument(koHtml, jaHtml) {
  return grammarDefect(tagsToBoundary(jaHtml));
}
