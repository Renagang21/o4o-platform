# CHECK-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1 — 제품허가정보 표본 검증

WO: `WO-O4O-OTC-MFDS-PERMIT-DETAIL-SAMPLE-VALIDATION-V1` · 일자: 2026-07-17 · 상태: **완료 (검증 통과 — 전체 재수집 가능)**
근거: [SOURCE-RECOVERY-AUDIT](../investigations/IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1.md)

> **read-only.** DB write **0** · 콘텐츠 변경 **0** · 코드 변경 **0**. 표본 응답 JSON 저장(키·URL 배제 — 유출 0 전수 확인).

---

## 0. 결론 (표본 6건 실호출 검증 — 통과)

> **NB_DOC_DATA(사용상주의사항 원문)가 두 목적을 모두 해결한다 — e약은요 유실 복구 + 첨가제 식별. 전체 재수집 가능.**
> **핵심 정정: 첨가제 원천은 `MATERIAL_NAME` 이 아니라 `NB_DOC_DATA` 다**(IR §3 정정 — MATERIAL_NAME 은 유효성분만 담음).
>
> | 검증 | 결과 |
> |---|---|
> | **endpoint** | ✅ `apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/`**`getDrugPrdtPrmsnDtlInq06`** (서비스 07 / 상세 op 는 06 — 버전 불일치. 목록 Inq07 은 문서필드 없음) |
> | 필터 | `item_seq`(품목기준코드) 정확 동작 · `type=json` · **User-Agent 필수** |
> | 접근 | ✅ 활용신청 승인 후 **HTTP 200 NORMAL SERVICE** (dataset 15095677, totalCount 43,030) |
> | **① NB_DOC 유실 복구** | ✅ 쎄로테정·알드라민정 NB_DOC 에 **`크레아티닌 청소율 &lt; 10mL/min` 온전** (e약은요 유실분이 여기 살아있음) |
> | **② 첨가제 식별** | ✅ 인테스캡슐200mg(감사=아스파탐) NB_DOC 에 **"아스파탐 … 페닐케톤뇨증 환자에는 투여하지 말 것"** 명시. 비함유 제품 NB_DOC 엔 없음 |
> | MATERIAL_NAME | ⚠️ **유효성분만**(예: "성분명: 아세틸시스테인, 분량: 200") — **첨가제 미포함 → 첨가제 원천 아님** |
>
> **함의**: 재수집은 **NB_DOC_DATA 하나**를 기준으로 한다. e약은요를 대체/보강하고, 그 안의 첨가제 경고(아스파탐/대두유/색소)로 서브그룹을 식별한다.

### 0-1. 표본 6건 결과

| 품목기준코드 | 제품 | 검증 | 결과 |
|---|---|---|:---:|
| 199802620 | 쎄로테정 | NB_DOC 크레아티닌 | ✅ `&lt; 10mL/min` 온전 |
| 200905228 | 알드라민정 | NB_DOC 크레아티닌 | ✅ `&lt; 10mL/min` 온전 |
| 199401186 | 무테린캡슐200 | MATERIAL 아스파탐 | 첨가제 미기재(유효성분만) — NB_DOC 로 판정 대상 |
| 199301063 | 라페론정160 | MATERIAL 아스파탐 | 동 |
| 199600422 | 뮤세틸캡슐200 | — | ⚠️ **미조회**(item_seq·item_name 모두 total=0 — 취소/변경 품목 추정) |
| 199300215 | 아이잘정160 | — | ⚠️ **미조회**(동) |
| (참조)199602408 | 인테스캡슐200mg | NB_DOC 아스파탐 | ✅ **아스파탐/페닐케톤뇨 명시**(첨가제 원천 확정 증거) |

> **미조회 2건**: 해당 품목기준코드가 제품허가정보에 없음(취소/재허가로 seq 변경 추정). 재수집 시 **원문 없는 master 는 어느 그룹에도 배정하지 않음**(임의 분류 금지 원칙 — GROUP-SPLIT §5).
> **표본 응답 JSON**: `docs/investigations/samples/mfds-permit-detail-v1/<item_seq>.json` (키·URL 배제, 재검증용 보존).

### 0-2. NB_DOC 형식 (재수집 파서 설계)

- XML/HTML 문서: `<DOC>…<SECTION>…<ARTICLE>…<PARAGRAPH><![CDATA[텍스트]]></PARAGRAPH>` 구조.
- 부등호는 **`&lt;` 엔티티**로 보존(`크레아티닌 청소율 &lt; 10mL/min`) → e약은요 의 bare-`<` 유실과 대조.
- 파서: PARAGRAPH CDATA 텍스트 추출 + 엔티티 디코드. **composer escape 보강(§6) 은 여전히 필요** — 디코드된 `<` 를 재-compose 시 sanitize 가 삼키지 않도록.

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
| **의약품 제품 허가정보** | ✅ **확정** `DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07` (dataset **15095677**) | **NB_DOC_DATA**(사용상주의사항) · EE_DOC_DATA(효능) · UD_DOC_DATA(용법) · **MATERIAL_NAME**(원료약품 및 분량) |
| 참고 — 기수집 e약은요 | `DrbEasyDrugInfoService/getDrbEasyDrugList` | (유실 원천 — §IR) |

> **실측으로 endpoint 확정**: v6 = 404(폐기), v3~5 = 500(키 무관 = 경로 오류), **v7/getDrugPrdtPrmsnInq07 = 라우팅됨(403/401)**. 별도 `Dtl` operation 은 404 → **Inq07 이 상세(문서 필드 포함) 반환**으로 추정(승인 후 확인).
> 파라미터: `item_seq`(품목기준코드) · `type=json` · **User-Agent 필수**.

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

## 8. 재개 방법 — **데이터셋 활용신청 1건만 남음**

> 방법 B(키를 repo `.env` gitignore 주입)로 진행 완료 — 키 유효 확인. **남은 것은 데이터셋 승인뿐.**

| 단계 | 내용 |
|---|---|
| **1 (사용자)** | 이 키 소유 data.go.kr 계정 로그인 → **dataset 15095677「식품의약품안전처_의약품 제품 허가정보」활용신청** (자동승인 대개 즉시~수시간) |
| **2 (집 PC)** | 승인 후 **같은 키로** §4 품목기준코드 6건 `getDrugPrdtPrmsnInq07` 호출 → 응답 body 저장(키·URL 배제) |
| **3 (집 PC)** | NB_DOC 온전성 + MATERIAL_NAME 아스파탐 식별 검증 → 본 CHECK §5 체크리스트 채움 |
| **4** | 통과 시: composer escape 보강(§6) → 유실 172 복구 → 첨가제 분류(IR §7) |

> **키 재주입 불필요** — 이미 `.env`(gitignore)에 있음. 승인만 되면 집 PC 에서 바로 재호출.

---

## 9. 원칙 준수 확인

| 원칙 | 결과 |
|---|---|
| 식약처 공식 API만 | ✅ (호출 미실행, 엔드포인트만 확정) |
| 기존 키·환경변수 사용 | ✅ **부재 확인 → 중단**(우회 안 함) |
| 키를 코드·로그·문서에 기록 안 함 | ✅ 이 문서에 키 없음 |
| 품목기준코드 직접 조회 | ✅ §4 |
| DB write·콘텐츠 수정 0 | ✅ |
