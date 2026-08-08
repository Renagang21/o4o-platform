# CHECK — WO-O4O-EASY-DRUG-EN-PUBLIC-BROWSER-SMOKE-CLOSE-V1

> LIVE 적용된 EN 19,360건의 **실제 공개 화면**에서 언어 선택·렌더링·레이아웃 회귀만 검증하고
> EN LIVE 트랙을 최종 종료한다. **번역 수정 0 · DB write 0 · 재apply 0.**
> 선행 CHECK: [`CHECK-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1.md`](CHECK-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1.md)

**결과: 13 표본 × 3 viewport = 39 케이스 전건 PASS. console error 0. DB write 0.**
→ `WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1` **최종 DONE.**

---

## 0. 선행 보고 정정

직전 보고에서 "브라우저 자동화 도구가 없어 §19 미수행"이라고 했으나, **저장소에 Playwright 와
Chromium 이 이미 설치되어 있었다** (`node_modules/playwright`, `ms-playwright/chromium-1223`).
세션 도구 목록만 보고 판단한 것이 잘못이었다. 실제 브라우저로 전 항목을 수행해 이 CHECK 로 닫는다.

---

## 1. 검증 대상 · 환경

| 항목 | 값 |
|---|---|
| 공개 URL | `https://neture.co.kr/p/:publicKey` (`ProductLandingPage`) |
| 브라우저 | Chromium (Playwright, headless) |
| viewport | mobile `390×844` · tablet `768×1024` · desktop `1440×900` |
| 계정 | `docs/local/TEST-ACCOUNTS.local.md` Neture 운영자 — 값은 **환경변수 주입**, 로그·문서·커밋에 미포함 |
| 기준 HEAD | `76c035e4c` |
| DB 접근 | `SELECT` 만 (publicKey·제품명 조회) — **write 0** |

표본은 기존 위험군 13개를 그대로 사용했다:
안과 · 가글/구강 · 외용 · 직장 · 주사 · 흡입 · 질 · `>` 수식 포함 · 최장 본문 · 최단 본문 ·
숫자 최다 · 신규 INSERT EN · hidden→canonical UPDATE EN.

---

## 2. 결과

### 2-1. 전체

```json
{ "cases": 39, "passed": 39, "failed": 0,
  "authGate": { "anonBodyHidden": true, "bodyVisibleAfterLogin": true },
  "consoleErrorCount": 0, "dbWrites": 0 }
```

### 2-2. 검사 항목별 (각 39/39)

| # | 검사 | 구현 | 결과 |
|---:|---|---|---:|
| 1 | 공개 landing 정상 load | `.store-desc-content` 렌더 대기 | 39/39 |
| 4 | KO 기본 표시 | locale 초기화 후 h2 전부 KO 고정 어휘 | 39/39 |
| — | **CSS 스코프 실제 적용** | 래퍼의 computed `--sd-bg` 토큰이 실제로 잡히는지 | 39/39 |
| 2 | KO·EN 언어 선택 UI 존재 | `한국어` 버튼 + `Other Languages` 버튼 | 39/39 |
| 3·6 | EN 선택 시 EN 표시 + 섹션 라벨 영어 | 시트에서 English 선택 → h2 전부 en-frame 고정 어휘 | 39/39 |
| 5 | 제품명·제조사 identity 한국어 유지 | artifact 의 FIXED_IDENTITY 한글 텍스트가 화면에 그대로 존재 | 39/39 |
| 7 | 타 master 콘텐츠 혼입 0 | 화면 본문에 해당 master 의 품목기준코드 존재 + h1 제품명 일치 | 39/39 |
| 8 | horizontal overflow 0 | `documentElement.scrollWidth - clientWidth ≤ 1` | 39/39 |
| 9·10 | 텍스트 겹침/잘림 0 | 스코프 내 모든 요소: `overflow:hidden/clip` 인데 내용 초과 0, 우측 경계 초과 0 | 39/39 |
| 4 | KO 복귀 정상 | EN → 한국어 재선택 후 h2 전부 KO 고정 어휘 | 39/39 |
| 11 | 로그인/비로그인 접근 계약 | 비로그인: 본문 0 + 로그인 게이트 노출 / 로그인 후: 본문 표시 | PASS |
| 12 | 3 viewport 정상 | mobile · tablet · desktop 전부 | 39/39 |

> **CSS 스코프 검사를 따로 둔 이유**: 설명서 스타일은 `.store-desc-content` 하위로만 스코프된다.
> 래퍼가 없으면 텍스트는 보이므로 "렌더됨"으로 오판하기 쉽다. computed 토큰(`--sd-bg`)이 실제로
> 잡히는지까지 확인해야 무스타일 상태의 허위 PASS 를 막는다.

### 2-3. 육안 확인

스크린샷 19장 중 대표 3장을 직접 확인했다.

- **비로그인 게이트(mobile)** — 본문 없이 자물쇠 + `로그인` / `회원가입`. 제품명만 노출. 계약대로.
- **최단 본문(mobile, EN)** — `English` 활성, 카드·배지·경고 박스 스타일 정상, h2 전부 영어,
  제품명 `코네티비나겔` · 제조사 `(주)동인제약` 한국어 유지, 품목기준코드 `200511332`,
  하단 약사 문의 안내 유지, 가로 넘침 없음.
- **최장 본문(desktop, EN)** — 9개 섹션 전부 영어로 정상 렌더. 공백 없는 장문 제품명
  `이지엔6애니연질캡슐(이부프로펜)(비매품)` 이 카드 안에서 정상 줄바꿈. 경고 박스·주의 박스 스타일 유지.

---

## 3. 관찰 1건 (이번 WO 범위 밖 · 수정하지 않음)

**페이지 헤더의 제조사와 설명서 본문의 제조사가 다른 사례가 있다.**
예: `코네티비나겔` — 헤더 `(주)후파르마` vs 설명서 본문 `(주)동인제약`.

- 헤더는 `product_masters.manufacturer_name`, 본문은 MFDS 원문에서 온 설명서 FIXED_IDENTITY 다. **출처가 다르다.**
- **이번 EN 적용과 무관하다**: `en-render` 의 정합 검사 2단이 FIXED_IDENTITY 텍스트가 KO 와
  바이트 단위로 같음을 전 모집단에서 강제한다. 따라서 KO 화면도 같은 값을 보여준다 — 즉 **선존재 데이터 차이**다.
- 지시대로 **번역 데이터도 DB 도 건드리지 않았다.** 필요하면 ProductMaster ↔ 설명서 제조사 정합성
  별도 WO 로 분리한다(본 트랙 아님).

콘텐츠 불일치 의심은 아니다 — 공개 API 전수 검증에서 응답 본문 md5 가 `productionEnHash` 와
19,360/19,360 일치했으므로, 화면이 보여주는 본문은 production artifact 그대로다.

---

## 4. 금지 항목 준수

| 금지 | 실제 |
|---|---|
| 번역 수정 | 0건 |
| DB write · 재apply | 0건 (`SELECT` 만) |
| 화면 결함을 데이터로 해결 | 해당 없음 — 결함 0건. 관찰 1건도 수정하지 않고 분리 보고 |
| `git add .` · reset · clean · stash · amend · force push | 사용 안 함 (경로 지정 stage 만) |

---

## 5. 산출물

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/scripts/easy-drug-en-full-retranslation/live-browser-smoke.mjs` | 브라우저 smoke 전체 (13 표본 × 3 viewport) |
| `…/results/live-browser-smoke-result.json` | 케이스별 검사 결과 원장 |

스크린샷(`results/browser-smoke-shots/`, 19장 ≈ 4.5MB)은 바이너리라 커밋하지 않는다.
스크립트 재실행으로 언제든 재생성된다(`--headed` 로 육안 확인 가능).

---

## 6. 최종 상태

| 항목 | 값 |
|---|---:|
| EN canonical | 19,360 / 19,360 |
| APPLY_BLOCKED | 0 |
| UPDATE hidden→canonical | 18,980 |
| INSERT | 380 |
| 멱등 재실행 write | 0 |
| 공개 API 전수 | 19,360 / 19,360 |
| **브라우저 smoke** | **39 / 39** |
| KO·ZH·JA · ProductMaster · ProductIdentifier · schema | 불변 |
| hidden EN 잔여 101건 | 모집단 밖 · 미접촉 |

**EN LIVE 트랙 종료.**

---

*작성: 2026-08-08 · 브라우저 smoke 39/39 PASS · DB write 0*
