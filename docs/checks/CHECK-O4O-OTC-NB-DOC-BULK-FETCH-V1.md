# CHECK-O4O-OTC-NB-DOC-BULK-FETCH-V1 — NB_DOC 대량 재수집

WO: `WO-O4O-OTC-NB-DOC-BULK-FETCH-V1` · 일자: 2026-07-17 · 상태: **완료 (수집·보존)**
근거: [SOURCE-RECOVERY IR](../investigations/IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1.md) · [SAMPLE-VALIDATION](./CHECK-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1.md) · [GROUP-SPLIT-AUDIT](./CHECK-O4O-OTC-GROUP-SPLIT-AUDIT-BATCH-13-V1.md) · [SAFETY-OMISSION-AUDIT §4](./CHECK-O4O-OTC-AUTO-CANONICAL-SAFETY-OMISSION-AUDIT-V1.md)

> **수집·보존까지만.** DB write **0** · 기존 SPD/canonical 수정 **0** · 첨가제 분리 **0** · 영문 수정 **0**. 응답 body 만 저장(키·URL 미기록).

---

## 0. 결론

> **OTC 대상 236 item_seq 의 NB_DOC 를 수집·보존 완료. 오류 0 / 키 유출 0. 유실 복구 가능 대상과 첨가제 판별 가능 대상을 확정.**
>
> - NB_DOC 확보 **197** / 취소·변경 39.
> - **크레아티닌 유실 복구 26/27** (제품허가정보 NB_DOC 에 `크레아티닌청소율이 &lt; N mL/min` 온전).
> - 괄호의심 유실 109 전건 NB_DOC 확보(복구 판정은 원문 대조로 후속).
> - 첨가제 함유 선언: 아스파탐 **1** / 대두유 2 / 유당 81 / 색소 82.

---

## 1. 대상 (read-only DB 도출 · 품목기준코드 존재분만)

| 집합 | 정의 | distinct item_seq |
|---|---|---:|
| **A. e약은요 유실** | `mfds_easy_drug` canonical 중 유실 신호 | **136** |
| └ creatinine | "크레아티닌 청소율" 뒤 수치 유실 (감사 §4: 145 master / 27 원천) | 27 |
| └ paren_suspect | 문단내 미닫힘 괄호 `[(][^)]*</p>` (`<…>` 제거 신호) | 109 |
| **B. 첨가제 13그룹** | GROUP-SPLIT 13그룹 공개 master 325 → canonical STORE(`mfds_drug_otc`)+draft groupKey → item_seq | **100** |
| **합(중복 0)** | | **236** |

> Set B 13그룹 groupKey 는 감사 §2 의 성분·함량·제형과 실측 정확 일치(master 합 325 = §2 "ko/en 공개" 합).
> 연결 키(품목기준코드) 대상 100% 보유(IR §5) → 제품명 매칭 불필요, `item_seq` 직접 조회.

---

## 2. 수집 (공식 endpoint · 멱등 · 보안)

| 항목 | 값 |
|---|---|
| endpoint | `apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnDtlInq06` |
| 필터 | `item_seq` · `type=json` · **User-Agent 필수** · 승인된 serviceKey(`.env`) |
| 멱등 | `responses/<item_seq>.json` 존재 시 재호출 skip |
| 보안 | serviceKey·요청 URL **파일·로그 미기록**, 응답 body 만 저장, 전 파일 키 유출 검사 **0** |
| 오류 처리 | 200 아니면 1회 재시도 후 error 기록. 실측 error **0** |

**산출물**: `docs/investigations/samples/nb-doc-bulk-v1/` — `targets.json`(236) · `responses/<item_seq>.json`(236) · `manifest.json`(품목별 status + 집계) · `README.md`.

---

## 3. 검증 (WO 지정 항목)

| 항목 | 결과 |
|---|---|
| 대상 수 / 조회 성공 수 | 236 / **236**(HTTP 200 전건, error 0) |
| **NB_DOC_DATA 존재 수** | **197** (no_nbdoc 0) |
| **크레아티닌 청소율 문장 복구 가능 수** | **26 / 27** (1건=201906326 엘드로캡슐: NB_DOC 은 확보했으나 크레아티닌 표현 부재 — 원문 자체가 다른 문구) |
| **아스파탐·대두유·유당·색소 경고 식별 수** | 아스파탐 **1** · 대두유 **2** · 유당 **81** · 색소 **82** (함유 선언 기준) |
| 빈 응답·취소·변경 품목 수 | **no_item 39**(totalCount 0 — item_seq 취소/재허가로 변경 추정) |
| 저장 파일 내 키 유출 | **0** (전 파일 전수 검사) |

### 3-1. 첨가제 지표 해석 (중요)

- **아스파탐 1 은 탐지 버그가 아니라 실제 결과**: 공개 아세틸시스테인200(무테린·무코테인·뮤코텍 등 15종)·아세트아미노펜160 제품은 실측 전건 아스파탐 무함유. 감사가 지목한 아스파탐 제품(인테스캡슐 등)은 **공개 master 집합에 포함되지 않음**(공개분은 별도 제품군). → 이 그룹들의 아스파탐 서브그룹은 공개분에서 매우 작을 수 있음.
- **유당 81·색소 82 는 흔한 부형제**라 높음. `함유` 근접 매칭이나, `함유하지 않음` 부정문·일반 주의문과의 정밀 구분은 **후속 첨가제 서브그룹 분리 WO** 에서 NB_DOC 원문 대조로 확정(본 WO 범위 밖).

---

## 4. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 대상 원문 수집 완료 | ✅ 236/236 |
| 성공·누락·오류 건수 확정 | ✅ ok 197 / no_item 39 / error 0 |
| 유실 복구 가능 대상 확정 | ✅ 크레아티닌 26 + 괄호의심 109 NB_DOC 확보 |
| 첨가제 판별 가능 대상 확정 | ✅ 함유 선언 아스파탐1/대두2/유당81/색소82 (정밀 판정은 후속) |
| DB·콘텐츠 변경 0 | ✅ read-only(SELECT + 외부 API GET + 파일 저장) |
| commit·push | ✅ |

---

## 5. 제외 / 다음

- 제외: DB write · 기존 SPD/canonical 수정 · 첨가제 서브그룹 분리 · 영문 수정.
- **다음**: ① 유실 SPD 를 NB_DOC 로 보강/대체(esc-before-sanitize 재사용) → 유실 복구. ② 첨가제 함유 master 식별 → 서브그룹 재승격([GROUP-SPLIT §5](./CHECK-O4O-OTC-GROUP-SPLIT-AUDIT-BATCH-13-V1.md)). no_item 39 는 원문 없음 → 어느 그룹에도 배정하지 않음.
