# CHECK-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1 — 제품허가정보 표본 검증 (선행조건 미충족 → 호출 중단)

WO: `WO-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1` · 일자: 2026-07-16 · 상태: **부분 완료 (외부 호출 미실행 — 키 부재)**
근거: [SOURCE-RECOVERY-AUDIT](../investigations/IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1.md)

> **read-only.** DB write **0** · 콘텐츠 변경 **0** · 코드 변경 **0** · **외부 API 호출 0**(방침에 따라 중단).

---

## 1. 결론

> **외부 표본 호출을 실행하지 못했다 — 이 저장소·머신에 식약처 data.go.kr `serviceKey` 가 없다.**
> WO 호출 원칙("기존 키가 없거나 호출 권한이 없으면 임의로 우회하지 말고 **중단 후 보고**")에 따라 호출을 중단한다.
>
> 키 없이 가능한 부분은 완료: **① 엔드포인트·표본 확정, ② 코드 안전 점검(composer escape 필요 확인).**
> 호출은 **serviceKey 를 가진 환경**(수집이 이뤄진 회사 머신 외부 도구, 또는 이 repo `.env` 에 기존 키 주입)에서 재개하면 된다.

---

## 2. serviceKey 부재 확인 (방침 준수)

| 확인 위치 | 결과 |
|---|---|
| `apps/api-server/.env` 전체 키 이름 | DB·JWT·OAuth(Google/Kakao/Naver/FB)·TOSS·SMTP 뿐 — **data.go.kr / MFDS / serviceKey 0건** |
| drug-import `serviceKey` 매치 | 전부 **ProductCandidate 의 서비스 스코프 필드**(서비스 중립 적재)이지 API 키 아님 |
| API fetch 클라이언트 | `easy-drug-image-copy.service.ts` 의 **이미지 URL fetch** 뿐 — 데이터 API fetch 없음 |
| 수집 방식(bulk-fetch CHECK) | **저장소 밖 외부 도구**(`C:\Users\home\coding\o4o-public-data-samples\`, 회사 머신)에서 `serviceKey`(64자) + User-Agent 로 수집 → JSONL 만 G드라이브 canonical 로 이관 |

> **이 집 머신(`C:\Users\sohae\`) 에는 키도, 수집 도구도 없다.** 새 키 발급·키 노출 금지 방침상 우회 불가 → **중단**.

---

## 3. 엔드포인트 확정 (호출 준비 완료)

bulk-fetch CHECK 의 검증된 패턴(`https://apis.data.go.kr/1471000/...`, `serviceKey` + **User-Agent 필수**, `type=json`):

| 원천 | 서비스/오퍼레이션(후보) | 필드 |
|---|---|---|
| **의약품 제품 허가정보(완제의약품 허가상세)** | `DrugPrdtPrmsnInfoService06` / `getDrugPrdtPrmsnDtlInq` 계열 (data.go.kr dataset 15075057) | **NB_DOC_DATA**(사용상주의사항) · EE_DOC_DATA(효능) · UD_DOC_DATA(용법) · **MATERIAL_NAME**(원료약품 및 분량) |
| 참고 — 기수집 e약은요 | `DrbEasyDrugInfoService/getDrbEasyDrugList` | (유실 원천 — §IR) |

> ⚠️ 정확한 서비스 버전·operation 명은 data.go.kr 로그인 후 명세로 확정 필요(bulk-fetch CHECK §API4 와 동일 주의). **호출 시 첫 표본으로 응답 스키마부터 확인.**

---

## 4. 표본 품목기준코드 (호출 대상 확정)

키 확보 시 **아래 코드로 품목기준코드 직접 조회**(제품명 매칭 아님).

### 4-1. e약은요 유실 검증 표본 (NB_DOC 온전성)

| 품목기준코드 | 제품 | 검증 |
|---|---|---|
| `199802620` | 쎄로테정(세티리진염산염) | NB_DOC 에 "크레아티닌 청소율 … 10 mL/min **미만**" 온전 반환? |
| `200905228` | 알드라민정(세티리진염산염) | 동 |

> e약은요 유실 145건(크레아티닌)의 다수가 **세티리진 계열**(신부전 크레아티닌 청소율 금기). 세티리진 표본으로 대표 검증.

### 4-2. 아스파탐 우선 표본 (MATERIAL_NAME 첨가제 식별)

| 품목기준코드 | 제품 | 검증 |
|---|---|---|
| `199401186` | 무테린캡슐200밀리그램(아세틸시스테인) | MATERIAL_NAME 에 **아스파탐** 성분 식별? |
| `199600422` | 뮤세틸캡슐200mg(아세틸시스테인) | 동 |
| `199300215` | 아이잘정160밀리그람(아세트아미노펜) | 동 |
| `199301063` | 라페론정160밀리그람(아세트아미노펜) | 동 |

> 대두유·유당·황색색소 식별은 각 그룹(엘카르니틴·디오스민·색소 그룹) 표본으로 확장(4-3 후속).

---

## 5. 검증 항목 체크리스트 (호출 재개 시)

### NB_DOC

- [ ] 누락된 "크레아티닌 청소율 …" 문장 존재
- [ ] `10 mL/min 미만`(또는 `< 10`) 온전 반환
- [ ] 괄호·문장 경계 보존
- [ ] 형식(HTML/XML/텍스트) 확인 → sanitize 전략 결정

### MATERIAL_NAME

- [ ] 아스파탐 / 대두유 / 유당 / 황색색소 성분명 제품별 식별
- [ ] 유효성분 vs 첨가제 구분 가능 여부
- [ ] 품목기준코드 1:1 연결 확인

---

## 6. 코드 안전 점검 — **escape-before-sanitize 필요 확정** (완료)

키 없이 수행 가능한 부분. 재수집 원문에 `<`/`>` 가 있을 때 재유실을 막는 사전 조치를 확인.

| 지점 | 현재 | 판정 |
|---|---|---|
| `easy-drug-shared-description-derive.service.ts:60` | `` `<p><strong>${label}</strong><br/>${String(v).trim()}</p>` `` — 원문 텍스트 **esc 없이** 삽입 | ⚠️ **결함** |
| `:206` | `sanitizeDescriptionHtml(composed)` (DOMPurify) | 위 esc 누락 탓에 원문의 `<10` 을 **태그로 오인해 삼킴** |

> **결론: 재수집 apply 전 반드시 composer 에 HTML-escape 선반영 필요.** 현재는 원본이 이미 유실이라 무증상이나, **제품허가정보 NB_DOC 이 `<` 를 담아 오면 동일 유실 재발**한다.
>
> 권장 수정(후속 WO): `escapeHtml(String(v).trim())` 로 텍스트만 이스케이프한 뒤 `<p>`·`<strong>`·`<br/>` 구조는 유지. sanitize 는 그대로(2차 방어). **원시값은 candidate raw_payload 에 이미 보존되므로 재-derive 로 복구**.

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 두 원천 필드 실제 응답 확인 | ❌ **미실행 — serviceKey 부재로 호출 중단**(방침 준수) |
| 품목기준코드 연결 확인 | ✅ 표본 6종 확정(§4) · 전 대상 100% 코드 보유(IR §5) |
| 전체 재수집 가능·불가 판정 | ⏸ **키 확보 후 표본 호출로 확정** — 엔드포인트·표본·체크리스트 준비 완료 |
| DB·콘텐츠 변경 0 | ✅ |
| commit·push | ✅ |

---

## 8. 재개 방법 (택1)

| 방법 | 설명 |
|---|---|
| **A. 키 보유 환경에서 호출** | 수집 도구가 있는 회사 머신(`C:\Users\home\coding\o4o-public-data-samples\`)에서 §4 품목기준코드로 표본 호출 → 응답 JSON 을 이 repo 로 전달 |
| **B. 기존 키를 repo env 주입** | 회사 머신의 기존 serviceKey 를 이 repo `.env`(gitignore) 에 넣고 표본 스크립트 실행. **새 키 발급 아님 · commit 금지** |

> 어느 방법이든 **표본(§4)만** 호출하고 DB write 없음. 표본 통과 후: composer escape 보강(§6) → 유실 172 복구 → 첨가제 분류(IR §7).

---

## 9. 원칙 준수 확인

| 원칙 | 결과 |
|---|---|
| 식약처 공식 API만 | ✅ (호출 미실행, 엔드포인트만 확정) |
| 기존 키·환경변수 사용 | ✅ **부재 확인 → 중단**(우회 안 함) |
| 키를 코드·로그·문서에 기록 안 함 | ✅ 이 문서에 키 없음 |
| 품목기준코드 직접 조회 | ✅ §4 |
| DB write·콘텐츠 수정 0 | ✅ |
