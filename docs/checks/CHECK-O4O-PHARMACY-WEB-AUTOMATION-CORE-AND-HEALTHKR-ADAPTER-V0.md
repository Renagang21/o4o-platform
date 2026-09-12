# CHECK-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0

> **WO**: `WO-O4O-PHARMACY-WEB-AUTOMATION-CORE-AND-HEALTHKR-ADAPTER-V0`
> **상태**: 코어 · Adapter · **실 Chrome + 실 health.kr smoke 13/13** 완료 — production 왕복 = PENDING (§58 방식으로 기록, WO 종료 판단은 사용자 몫)
> **작성일**: 2026-09-12
> **선행**: `WO-O4O-SUPPLIER-SITE-ADAPTER-V0` · `WO-O4O-BROWSER-DOM-CONTROL-V0` · `WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0` ·
> `WO-O4O-AUTOMATION-EXECUTION-LAYER-REALIGNMENT-V1` · `WO-O4O-COMPUTER-USE-V0`
> **commit**: `28b288dec` (코드 · 테스트 · 등재 · 확장 결함 수정) · 본 문서

---

## 0. 한 줄 요약

약국이 반복해서 쓰는 웹사이트를 **Site + EntryPoint + Adapter 로 누적 등록하는 공통 코어**가 섰고, 첫 실사이트로
**약학정보원(health.kr)** 을 등재해 의약품 검색 · 동일성분 · 낱알 식별 · 상세 읽기 4개 EntryPoint 를 **실 Chrome +
실 사이트**로 왕복시켰다(13/13). 이후 새 사이트는 `pharmacy-web-core.ts` 의 배열 2개(Site · EntryPoint) + browser site
3 사본 + manifest 한 줄 + Adapter 파일 하나로 늘어난다 — 코어(별칭 · intent · usage · tool)는 사이트를 모른다.
첫 실사이트가 공통 DOM tool 의 결함 2건(form 제출 시 click 응답 유실 · 중첩 표 셀 오독)을 드러내 함께 고쳤다.

---

## 1. 기존 browser automation census

| 축 | 상태(착수 전) | 이번 WO 뒤 |
|---|---|---|
| browser site 등재 | `o4o.neture` 1 | + `healthkr` (3 사본 · content-script origin 표 · manifest) |
| DOM tool | `local.browser.dom.*` 8 | 불변 |
| Adapter tool | `local.supplier.product_lookup` 1 | + `local.pharmacyweb.entrypoint` 1 (EntryPoint 가 늘어도 tool 은 그대로) |
| DOM 명령 발행 공통 | `ai-tool-router.ts` 안 private | `browser-dom-executor.ts` 로 추출(동작 불변) — DOM tool · 공급처 · 약국 웹 Adapter 가 같은 경로 |
| agent action 종류 | 변경 0 (siteId 당 10 항목이 allowlist 에 자동 전개) |

## 2. Site Registry (§5·§7)

`PHARMACY_WEB_SITE_REGISTRY` — `siteId · displayName · aliases · canonicalOrigin · loginRequired · adapterId · enabled · robotsDisallow`.
정합성(`findPharmacyWebViolations`): siteId 는 등재 browser site · canonicalOrigin 은 그 allowedOrigins 와 동일 · https origin ·
별칭 ≥1 · EntryPoint 의 siteId/intent/entryPath(robots 금지 경로 아님) — 위반 0. 코드 상수, DB 0(§49).
미등재 이름은 별칭 해석 null → 이름만으로 자동 실행하지 않는다(§7). 등재 절차: 공식 origin 확인 → 약관/robots 조사 → 3 사본 등재.

## 3. Alias (§6)

`약학정보원 · 약정원 · health.kr · healthkr · 약학 정보원` → `healthkr`(공백 · 대소문자 무시). 사이트 축(열기/상태)의
`SITE_INTENT_KEYWORDS` 도 이 등재부에서 **파생**한다 — "약학정보원 열어줘" → `local.browser.open_site#healthkr`(URL 을 묻지 않는다).

## 4. EntryPoint Registry (§8·§9·§40·§41·§42)

| entryPointId | intent | 진입(navigationStrategy) | entryPath(도착 확인) | risk |
|---|---|---|---|---|
| `healthkr.drug_search` | drug_search | `any_page` — 모든 페이지의 헤더 통합검색 | `/searchDrug/search_total_result.asp` | REVERSIBLE |
| `healthkr.same_ingredient` | same_ingredient | `any_page` — 검색 2회 | 동상 | REVERSIBLE |
| `healthkr.pill_identification` | pill_identification | `header_link` "식별검색" 클릭 | `/searchIdentity/search.asp` | REVERSIBLE |
| `healthkr.drug_detail` | drug_detail | `current_page` — 사용자가 연 상세 페이지 | `/searchDrug/result_drug.asp` | READ |

hard-coded URL 로 이동하지 않는다 — 이동은 등재 origin 안 링크/버튼 클릭뿐, `entryPath` 는 도착 확인 기준(§41). health check =
검색창/입력칸/결과표 찾기 실패 → `PHARMACY_WEB_ENTRYPOINT_OUTDATED` + `fallbackReason`(§42).

## 5. Intent resolution (§11·§12·§13)

키워드 결정론(한글은 문자열 리터럴). 구체 업무(낱알 · 동일성분 · 상세)가 일반 검색보다 우선, 구체 업무 둘 이상 → `ambiguous` →
tool 미선택 + `PHARMACY_WEB_INTENT_AMBIGUOUS` gap(되묻기). 사이트 이름이 없어도 약국 전용 업무(낱알 · 동일성분 · 상세)는 그 업무를
가진 등재 사이트가 하나면 성립("이 알약 뭐야?"); 일반 검색은 사이트 이름이 있어야 한다(공급처 · 다른 축 충돌 방지).
입력: 검색어 = 따옴표 구절 → 제품명 토큰(어미 정/캡슐/시럽… · 조사 제거 · 둘 이상이면 단정 안 함), 낱알 = `parsePillConditions`
("앞에 HMP, 뒤에 AM" · 색상/모양 어휘). AI/사용자/페이지 어느 쪽도 URL · selector 를 실을 칸이 없다(`validatePharmacyWebEntryArgs`).

## 6. Usage stats (§14·§15·§16·§50)

`buildPharmacyWebUsageEvent` → `siteId · entryPointId · intent · status · errorCode · durationMs · domCommands · timestamp` **8키뿐**.
다른 키가 섞여 들어와도 결과에 나타나지 않는다(spec 9·10). 저장소는 기존 logger(Cloud Logging) — 새 DB 0. 검색어 · 약 이름 ·
환자정보 · 페이지 텍스트 · HTML · credential 은 칸이 없다. 검색어는 `set_input` 인자로 `local_agent_commands.result_data` 에 발행→claim
사이만 실린다(기존 DOM 축과 동일).

## 7. health.kr 접근/정책 조사 (§17·§18) — 2026-09-12 실측

| 항목 | 결과 |
|---|---|
| canonical origin | `https://health.kr` (`https://www.health.kr` → apex 301) |
| 로그인 | 통합검색 · 식별검색 · 상세 · 성분정보 모두 **로그인 없이** 열림. CAPTCHA 없음 |
| robots.txt (`User-agent: *`) | Disallow `/searchDrug/ajax/` · `/searchDrug/result_sunb.asp` · `/searchDrug/search_DUR.asp` (GPTBot/ChatGPT-User/facebook 봇은 전체 차단) |
| 이용약관 · 법적책임 · 무단수집거부 | 자동화 · 스크래핑 금지 조항 **없음**. 이메일 수집 프로그램 거부 · "회원 이용 이외 목적 복제/출판/제3자 제공 금지" |
| 판단 | 사용자 자신의 Chrome 세션에서 사용자 요청으로 화면을 읽는 V0 는 회원 이용 범위. robots Disallow 3경로는 **Adapter 가 가지 않는다**(`robotsDisallow` 정책 + entryPath 정합성 + smoke 에서 미방문 실측). 동일성분 페이지(result_sunb)가 여기 포함돼 **성분명 재검색으로 대체** |

## 8. 의약품 검색 (§21·§22·§23)

헤더 textbox(placeholder "제품명 또는 성분명") → `set_input` → 첫 "검 색" 버튼(공백 무시 정확 일치) → form 제출 이동 → 도착 확인 →
`read_table`(첫 표 = 결과표: 식별/포장 · 제품명 · 성분/함량 · 효능 · 회사명 · 제형 · 구분 · 약가 · 공급유무). 결과 = `DrugSearchItem`
(productName · ingredient · company · dosageForm · category · price 원문 · supplied). 매칭: 제품명 정확 일치 → 포함 1 → `MULTIPLE_MATCHES`
(후보 ≤10) → 행 0 이면 `DRUG_NOT_FOUND`. 실측 A "아모디핀정5mg" → 1건(390원/1정) · B "아모디핀" → 후보 2.

## 9. 동일성분 (§24·§25·§26)

제품 검색 → 대상 1건 확정(여럿이면 되묻기) → 성분 셀에서 함량을 뗀 성분명(`ingredientKeyOf`: "Amlodipine Camsylate 7.841mg" →
"Amlodipine Camsylate") → **같은 통합검색을 성분명으로 재실행** → 대상을 뺀 목록. 복합제("외 1")는 `SAME_INGREDIENT_UNAVAILABLE`
(V0 는 복합제 동일성분을 정의하지 않는다). 실측 C: 9건(아모잘탄 · 코자엑스큐 …), robots Disallow 경로 미방문. 렌더에 "염(salt)·함량이
다른 제품이 섞일 수 있다 · 약사가 최종 확인" 명시.

## 10. 낱알 식별 (§27~§31)

헤더 "식별검색" 링크 클릭(header_link) → 도착 확인 → textbox "문자1"/"문자2" 입력 → 폼의 **마지막** "검 색" 버튼(헤더 버튼과 구분) →
같은 경로 POST 이동 → 도착 확인 → "식별표시" 헤더가 있는 표를 `find role=table` 로 골라 `read_table(ref)`(입력 표와 구분).
2단 헤더(크기 colspan · 장축/단축/두께 행)와 첫 셀의 중첩 표를 해석(`parseHealthkrPillTable`). 결과 = `PillCandidate`(marks · dosageForm ·
size · product · company). **색상 · 모양 · 분할선 · 제형 선택은 img/span 커스텀 컨트롤이라 DOM V0 로 적용 불가** → `unapplied` 로 사용자에게
그대로 알린다(§38 fallback 후보 — 자동 전환 없음). 후보 1건이어도 "검색 결과 후보" 로만 표현(§31, spec 16 · 프롬프트 규칙).
실측 D: HMP/AM → 후보 1(아모디핀정5mg · 나정 · 8.32/6.06/3.13mm), 색상 미적용 표기.

## 11. 의약품 상세 (§32·§33·§34)

결과표의 제품명 셀은 `td onclick`(버튼/링크 아님) → DOM V0 로 열 수 없다 → **사용자가 클릭해 연 페이지를 읽는다**(current_page).
상세가 아니면 `PHARMACY_WEB_USER_ACTION_REQUIRED`("제품명을 직접 클릭해 상세를 연 뒤 다시"). 기본정보 표(행머리) → 제품명 · 성분/함량 ·
제형/성상 · 구분 · 급여(회사명은 별도 섹션이라 빈 값) + 섹션 존재 확인(`find role=heading` 효능·효과 / 용법·용량 / 주의사항).
**섹션 본문은 읽지 않는다**(`read_text` 0 — spec 19 · smoke E). 전체 설명서 dump 없음(§33). 실측 E PASS.

## 12. DOM / fallback (§37·§38·§39)

- 전 명령 `local.browser.dom.*#healthkr`(smoke 50 명령, 종류 5), `local.computer.*` 0. 상한 20/EntryPoint, 재시도 0.
- 요소/표 없음 → `ENTRYPOINT_OUTDATED` + `fallbackReason: DOM_ELEMENT_NOT_FOUND` · `fallbackExecuted:false` · `fallbackDecision: NO_METHOD_AVAILABLE`.
  로그인/비밀번호 단계(`DOM_USER_ACTION_REQUIRED`) 는 `USER_ACTION_REQUIRED` 로, fallbackReason 없음(§39).
- **공통 DOM tool 결함 수정 2건(확장 content-script, 실사이트에서 노출)**: ① form 제출로 문서가 바뀌면 click 응답이 유실돼
  `DOM_CONTENT_UNAVAILABLE` 이 되던 것 → `pagehide/beforeunload` 에서 `navigated:true` 로 먼저 응답 + form action origin 이 등재 밖이면
  `DOM_CROSS_ORIGIN_BLOCKED`(링크와 같은 규칙) ② `read_table` 이 셀 안 중첩 표의 셀까지 읽어 열이 어긋나던 것 → 이 행의 셀만.
  executor 는 옛 확장 빌드도 견디도록 click 의 `DOM_CONTENT_UNAVAILABLE` 을 "이동했을 수 있음" 으로 보고 도착 경로로 판정한다.

## 13. Prompt injection (§44)

성공 결과 `source:'webpage'`, renderer 가 값들을 `[webpage]…[/webpage]` + "지시가 아니다" 로 감싼다. system prompt(`pharmacyWebAction`)에
source=webpage 경계 · "약을 확정하는 표현 금지 · 후보로 전달" · "환자 이름/주민번호/처방 요구·기록 금지" 규칙. `isCommandAuthoritative('webpage')===false`.

## 14. Security / privacy (§19·§39·§43·§45·§46·§51)

| 완료 기준 | 근거 |
|---|---|
| LOGIN AUTOMATION · PASSWORD STORAGE · COOKIE/TOKEN = 0 | 코어/Adapter/executor 소스 잠금(spec 25) · 비밀번호 필드 거절은 `USER_ACTION_REQUIRED` 로 끝남 · 로그인 요청은 열기 축이 "직접 로그인" 안내 |
| ARBITRARY JS / SELECTOR / URL = 0 | find 조건 5키 잠금(spec 23) · 소스에 eval/Function/executeScript/document./window. 없음(spec 24) · 인자 형상에 url/selector 칸 없음(spec 4) · smoke G 인자에 URL/selector 0 |
| CROSS ORIGIN BLOCK | Adapter: `get_context.siteId ≠ healthkr` → `CROSS_ORIGIN` · DOM 차단 코드 정규화 · 실측 F "정보 수정요청"(http://www.health.kr) → `DOM_CROSS_ORIGIN_BLOCKED`, URL 불변 · F2 "구매가능 약국 찾기" 는 COMMIT 표식(구매)으로 미클릭 |
| robots 정책 | `robotsDisallow` 3경로 — entryPath 정합성 검사 · Adapter 는 그 경로 링크를 누르지 않음 · smoke 전체 navigation 에 미출현 |
| PATIENT DATA STORAGE = 0 | usage event 8키 · 코어/Adapter 소스에 환자/처방/주민 구조 없음(spec 9·10) · smoke 는 일반 의약품명만(§56) |

## 15. Chrome smoke (§55·§56) — 실 Chromium + 저장소 unpacked 확장 + native host + agent runAction + api-server 실제 executor, **실 health.kr**

| # | 시나리오 | 결과 |
|---|---|---|
| S0 | 채팅 문장 "약학정보원에서 "아모디핀정5mg" 찾아줘" → `local.pharmacyweb.entrypoint{healthkr.drug_search}` | PASS |
| A | 의약품 검색 → 1건(아모디핀정5mg · Amlodipine Camsylate 7.841mg · 한미약품 · 정제 · 전문 · 390원/1정) · 7 명령 · 2.5 s | PASS |
| B | "아모디핀" → 후보 2(5mg · 2.5mg) | PASS |
| C | 동일성분 → 성분명 재검색 → 9건 · 13 명령 · 4.8 s · robots Disallow 경로 미방문 | PASS |
| D | 낱알 HMP/AM(+색상) → 후보 1 · 색상 미적용 표기 · 13 명령 · 4.8 s | PASS |
| E0/E | 상세 아님 → `USER_ACTION_REQUIRED` / 상세 페이지 → 기본정보 + 섹션 3 존재 · read_text 0 | PASS |
| F/F2 | 외부 origin 링크 → `DOM_CROSS_ORIGIN_BLOCKED` / COMMIT 표식 링크 미클릭 | PASS |
| G | 50 명령 전부 `#healthkr` · computer.* 0 · 인자에 URL/selector 0 | PASS |

**13/13 PASS.** 첫 실행에서 A~C 가 `DOM_CONTENT_UNAVAILABLE`, D 가 표 오독으로 실패했고 → §12 의 결함 2건을 고친 뒤 통과. 하네스는 scratchpad(미커밋).

## 16. Production smoke (§57·§58)

| 항목 | 값 |
|---|---|
| 배포 | `28b288dec` → CI Pipeline · CodeQL · Deploy API **모두 success**, 리비전 `o4o-core-api-03627-pjm` |
| production 왕복 | **PENDING** — 이 PC 폴링 agent 의 production 페어링(`credentials.json`) 부재(사용자 계정 단계). 확장은 unpacked 재로드 필요(host_permissions 추가) |

```text
CORE                 = ESTABLISHED
HEALTHKR ADAPTER     = ESTABLISHED
REAL CHROME SMOKE    = PASS (13/13, 실 health.kr)
PRODUCTION ROUNDTRIP = PENDING
```

## 17. Tests · CI (§52·§53·§54)

| 게이트 | 결과 |
|---|---|
| `pharmacy-web-core.spec.ts` — §52 1~10 (11 test) | **11 PASS** |
| `healthkr-adapter.spec.ts` — §53 11~25 + §54 회귀 (19 test) | **19 PASS** |
| census 잠금 갱신(등재 site 2 · host_permissions 2 · browser_dom tool 10 · non-readOnly 목록) | supplier · browser-dom-control · computer-use · automation-execution-layer · ai-capability-tool-routing · agent browser-dom/native-bridge |
| 관련 api-server jest 12 스위트 | **284 PASS** |
| agent node:test 3 파일 | **59 PASS** |
| tsc(api-server) | WO 파일 오류 0 · baseline 무관(`pharmacy-hub` 2건은 stash 상태에서도 동일) |
| eslint(변경 파일) | 0 |
| CI (`28b288dec`) | CI Pipeline success(api-server jest **4323 PASS** — `pharmacy-web-core.spec` · `healthkr-adapter.spec` PASS · agent node:test 59) · CodeQL success · Deploy API success(`o4o-core-api-03627-pjm`) |

## 18. DB migration · write (§49·§50·§51)

cloud/local migration **0** · 신규 테이블/컬럼 **0** · registry 는 코드 상수 · usage 는 logger · DB write 는 기존 `local_agent_commands` envelope 범위.

## 19. Limitations

1. **색상 · 모양 · 분할선 · 제형** 은 커스텀 컨트롤이라 사이트에 적용하지 못한다 — 식별문자만 적용, 미적용 조건은 사용자에게 표기. DOM V1(커스텀 클릭 대상) 후속.
2. **상세 진입은 사용자 클릭**(제품명 셀 `td onclick`). 상세의 **섹션 본문(효능 · 용법 · 주의)은 읽지 않는다** — 존재만 확인. `read_section` 류 DOM 액션 후속.
3. DOM 계약 상한(셀 60자 · 행 50 · 열 12)으로 긴 값(성분/함량 · 급여)이 잘리고 17행 넘는 결과는 50행까지. 상세 표에서 회사명은 별도 섹션이라 빈 값.
4. 동일성분 = **성분명 재검색**(사이트 동일성분 페이지는 robots Disallow) — 염 · 함량이 다른 제품이 섞이고 복합제는 미지원.
5. 의도 인식은 키워드 결정론 — 사이트 이름 없는 일반 검색은 이 축이 아니다. 제품명 토큰 추출은 어미 표 기반.
6. 이동 확인은 `get_context` 폴링(4회 × 0.7 s) + 정착 0.7 s — 느린 회선에서는 `SITE_NOT_READY/ENTRYPOINT_OUTDATED` 가 날 수 있다.
7. 사용통계는 로그(Cloud Logging) 집계 — 대시보드 · 집계 테이블 없음.

## 20. Follow-up (§61)

1. `WO-O4O-DRUG-IMAGE-IDENTIFICATION-V0` — 이미지 → 색/모양/각인 → `healthkr.pill_identification`(식별문자 입력) 연결.
2. 두 번째 Pharmacy Web Site(약사회 · 지부/분회 · 회계 등) — Site 1 + EntryPoint n + Adapter 1 로 추가(코어 무변경 검증).
3. Browser DOM V1 — 커스텀 클릭 대상(onclick td/img/span) · `read_section` · 셀 상한 조정.
4. Supplier 실사이트 Adapter · Order Workflow V0.

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
