# CHECK-O4O-OTC-ADDITIVE-WARNING-APPLY-234-V2 — 첨가제 경고 적용

WO: `WO-O4O-OTC-ADDITIVE-WARNING-APPLY-234-V2` · 일자: 2026-07-17 · 상태: **완료 (적용·검증)**
근거: [WARNING-WHITELIST](./CHECK-O4O-OTC-ADDITIVE-WARNING-WHITELIST-V1.md) · [APPLY-260 중단](./CHECK-O4O-OTC-ADDITIVE-WARNING-APPLY-260-V1.md) · 화이트리스트 `additive-warning-whitelist-v2.json`

> **canonical UPDATE 234만.** INSERT/DELETE **0** · 단일 TX · 이중 게이트.

---

## 0. 결론

> **dedup 정정 117 master 의 ko·en canonical 234건에 첨가제 경고를 사용상 주의사항 금기 뒤·상담 앞 위치로 반영. UPDATE 234 / 사후검증 234/234. 중복 삽입 0, sd-warn 구조 유지, BUILDER_DRIFT 0 기반 완전 reversible.**

---

## 1. 적용 방식 (builder 재생성 — 공유 draft 미수정)

- **구조 제약**: OTC draft/translation 은 **그룹 공유**(117 master → draft ref 6). 소스 직접수정 불가 → 각 master canonical 을 **재생성 결과로 갱신**.
- **BUILDER_DRIFT 0 전제**: `buildDrugOtcConsumerHtml(draft)` === 저장 ko / `buildDrugOtcEnConsumerHtml(translation)` === 저장 en (117 전건 확인).
- **삽입**: `caution` 필드 복사본에 경고를 넣고 재생성.
  - **ko**: 단일 문단의 금기 경계(`복용하지 않습니다.` 등, 117/117 매칭) 뒤에 인라인 삽입 → sd-warn `<li>` 내.
  - **en**: en caution 첫 문장(주 금기) 뒤에 삽입 → 문장분리로 sd-warn 새 `<li>`.
- **역제거**: `newCaution` 에서 경고 문자열 제거 === 원 caution → 재생성 시 저장본 복원(완전 가역).

**삽입 위치 실측**(육안 확인):
```
ko: …영아는 복용하지 않습니다. [유당 함유…복용하지 마십시오.] 임부·수유부는 복용 전 약사와 상담하세요…
en: <li>Do not take this if…</li> <li>This product contains lactose.</li> <li>…must not take it.</li> <li>Talk to a pharmacist…</li>
```
→ **기존 금기 → 첨가제 금기·신중 → 상담·일반** 순서 충족.

---

## 2. 안전 게이트 (전건 통과)

| 게이트 | 결과 |
|---|---|
| 예상 117 master / 234 row | ✅ 일치 |
| **robust dedup 재검사**(LIKE 아스파탐·유당·색소) | ✅ 충돌 0 (이미보유 시 자동제외 아닌 **전체 ABORT** 설계) |
| BUILDER_DRIFT 0 (ko·en) | ✅ 117 전건 |
| ko 금기 경계 존재 | ✅ 117/117 |
| 역제거 === 원 caution | ✅ 234 전건 |
| INSERT/DELETE | 0 |

---

## 3. 사후검증 (독립 재조회)

| 항목 | 결과 | 판정 |
|---|---|:---:|
| UPDATE / 트랜잭션 내 검증 | **234 / 234** | ✅ |
| 유당 경고 반영 | **98 / 98** | ✅ |
| 색소 경고 반영 | **44 / 44** | ✅ |
| 아스파탐 경고 반영 | **1 / 1** | ✅ |
| 다중 함유 병기 | **26 / 26** | ✅ |
| **중복 삽입** | **0** | ✅ |
| en 반영(`This product contains`) | **117 / 117** | ✅ |
| sd-warn 구조 유지 | **234 / 234** | ✅ |
| 이중 escape(`&amp;lt;`) | **0** | ✅ |
| 강도 | 유당·아스파탐 금기(`복용하지 마십시오`) / 색소 신중(`신중히 복용하십시오`) | ✅ |
| 재실행 | **dedup 게이트 ABORT**(경고 존재 → write 0, 더블적용 방지) | ✅ |

> **재실행 동작**: 적용 후 content 에 경고가 존재하므로 robust dedup 게이트가 **전체 ABORT**(write 0). WO 의 "기존 경고 보유 대상 전체 중단" 요구와 일치 — 더블 적용을 원천 차단(= 실질 no-op).
> **렌더**: 실제 빌더(`buildDrugOtc(En)ConsumerHtml`) 출력이라 sd-* 반응형 구조·이스케이프가 기존 OTC 설명서와 동일하게 정상(구성상 보장).

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 234건 첨가제 경고 반영 | ✅ UPDATE 234 / 검증 234 |
| 허용된 문구 삽입 외 변경 0 | ✅ 역제거·BUILDER_DRIFT·중복0·이중escape0·대상외 불변 |
| 사후검증 통과 | ✅ §3 |
| commit·push | ✅ |

---

## 5. 제외 / 다음

- 제외(적용됨): 기존 색소 경고 보유 13 master · 원문없음 115 master · 근거 없는 추정 · 다른 내용 수정.
- **다음**: 원문없음 115 master 는 원천 재수집 후 재판정(보류 유지). OTC 첨가제 안전 문구 반영 **종료**.
