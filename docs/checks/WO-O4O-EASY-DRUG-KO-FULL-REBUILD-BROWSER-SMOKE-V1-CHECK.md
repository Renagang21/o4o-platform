# WO-O4O-EASY-DRUG-KO-FULL-REBUILD-BROWSER-SMOKE-V1 — CHECK

신규 KO canonical 설명서의 **실제 공개 브라우저 화면 검증**. 대표 60건 디자인 스모크 + 제품명 `h1` 전수 자동검사.

- 일자: 2026-08-05
- 대상: e약은요 기준 재조립으로 LIVE 적용된 KO canonical **19,363건** (`apply-result-live.jsonl`, 전건 `APPLIED`)
- 공개 경로: `https://neture.co.kr/p/{public_key}` (API 진입점 `https://api.neture.co.kr`)
- **DB write 0 · 설명서 본문 변경 0 · EN·ZH·JA 작업 0**
- 결과: **PASS**

---

## 1. 무엇을 검증했나

| 층 | 대상 | 방식 | 측정 수 |
|---|---|---|---|
| 대표 스모크 | 60건 × 3폭 | 실제 페이지 로드 | 180 |
| A | 19,363건 | 공개 랜딩 API 전수 호출 | 19,363 |
| B | 19,363건 × 3폭 × (본문+게이트) | 실제 랜딩 DOM·CSS 위에서 h1 텍스트 교체 측정 | 116,178 |
| C | 위험군 84건 × 3폭 | 실제 페이지 로드 | 252 |

폭: 데스크톱 1440×900 · 모바일 390×844(iPhone 12, DPR 3) · 태블릿 1024×768.

---

## 2. 발견된 결함과 수정

### 2-1. 공통 렌더러 결함 — 제품명 `h1` 가로 넘침

run1(수정 전) 대표 60건에서 `RESPONSIVE_DEFECT` **18건 / 14제품**. 나머지 판정은 전부 0.

원인을 **데이터 오류가 아니라 공통 렌더러 결함**으로 확정한 근거:

- 18건 전부 넘침 체인의 시작점이 제품명 `h1` 이었고, 조상 `div.max-w-2xl` · `div.bg-white` 는 그것을 물려받은 것뿐이다.
- 설명서 **본문은 한 건도 넘치지 않았다**.
- 모집단 19,363건의 제품명이 **전부 공백 없는 단일 토큰**(최장 134자)이다. `break-keep` 만으로는 끊을 자리가 없다.

WO 규정대로 제품별 진행을 멈추고 최소 수정했다 — [`ProductLandingPage.tsx`](services/web-neture/src/pages/ProductLandingPage.tsx):

```tsx
<h1 className="text-xl font-bold text-gray-900 break-keep [overflow-wrap:anywhere]">
```

로그인 게이트의 제품명(`p`)에도 같은 규칙을 적용했다. 커밋 `873ac46e6` · 배포 run `30977947529` success.

### 2-2. 수정 후 재검증 (run2)

동일 60건 × 3폭 = 180 로드, `byVerdict {}` · productsAllPass 60 · docOverflow 0 → **PASS**.

---

## 3. 제품명 h1 전수 자동검사

### A층 — 공개 랜딩 API 전수 (19,363)

| 항목 | 결과 |
|---|---|
| 로드 실패 (HTTP≠200 · LANDING_NOT_FOUND) | **0** |
| WRONG_PRODUCT (API 제품명 ≠ 기대 ProductMaster) | **0** |
| LANGUAGE_EXPOSURE (`languages` ≠ `['ko']`) | **0** |
| EMPTY_SECTION (canonical 없음 또는 본문 200자 미만) | **0** |
| 본문 길이 | 1,091 ~ 4,331자 |
| 비로그인 게이트 | `authRequired=true` · 본문 유출 없음 · `languages=[]` |

이전 EN·ZH 공개 노출 **0** 이 여기서 전수로 확인된다.

### B층 — 19,363 × 3폭 레이아웃 전수 측정

5.8만 페이지를 여는 대신, **실제 공개 랜딩을 폭마다 1번 열고 그 안의 진짜 `h1`** 텍스트만 19,363개 제품명으로 교체하며 쟀다. 이 치환이 페이지 로드와 동치인 이유는 구조에서 나온다 — `h1` 의 형제는 고정폭 아이콘(`w-12 shrink-0`)과 아래 줄 제조사명뿐이라 **`h1.clientWidth` 는 제품명에 의존하지 않는다**.

| 판정 | 데스크톱 | 모바일 | 태블릿 |
|---|---:|---:|---:|
| `h1` 가로 넘침 | 0 | 0 | 0 |
| 조상 컨테이너 넘침 | 0 | 0 | 0 |
| `document` 가로 넘침 | 0 | 0 | 0 |
| 로그인 게이트 넘침 | 0 | 0 | 0 |

여유 폭 원장 (`h1-layout-slack-ledger.jsonl`, `slackAtCap` 오름차순):

| | 데스크톱 | 모바일 | 태블릿 |
|---|---:|---:|---:|
| 최대 가용 폭 | 532px | 250px | 532px |
| 최소 여유 폭 | 2.11px | **0.02px** | 2.11px |
| p1 여유 폭 | 10.95px | 2.61px | 10.95px |
| 음수(넘침) 건수 | 0 | 0 | 0 |
| 최대 줄 수 / 높이 | 4줄 / 112px | **10줄 / 280px** | 4줄 / 112px |

> `h1` 은 `min-w-0` flex 자식이라 짧은 이름에서는 내용 폭으로 줄어든다(shrink-to-fit). 그래서 원시 `slack`(= `clientWidth - 최장줄`)은 짧은 이름에서 0 에 붙어 의미가 없다. 원장의 위험 순위는 **최대 가용 폭 대비 여유(`slackAtCap`)** 로 계산했다.

제품명 분포 (`h1-population-summary.json`): 공백 없는 이름 **19,363 / 19,363 (100%)** · 최장 토큰 134자 · 길이 중앙값 11 / p99 47 · 수출명 포함 992 · 한글·영문 혼합 1,189 · 영문 연속열 12자 이상 333.

### C층 — 위험군 84건 실제 페이지 검증

축별 상위를 뽑아 중복 제거: 기존 결함 14 · 길이 상위 30 · 최장 토큰 상위 30 · 수출명 20 · 혼합 스크립트 20 · 여유 폭 최저 20 · 줄 수 최대 20 → **84건**(요구 범위 60~100).

| 항목 | 결과 |
|---|---|
| 로드 실패 | 0 / 252 |
| `h1` · 조상 · `document` 가로 넘침 | 0 |
| WRONG_PRODUCT | 0 |
| **기존 결함 14제품 재현** | **0** |
| 겹침(제목 ↔ 제조사명·구분·규격·바코드·버튼) | 0 |
| 빌드 CSS 실적용 (computed style `overflow-wrap:anywhere` + `word-break:keep-all`) | 252 / 252 |
| **하니스 교정** (B층 예측 줄 수 vs 실제) | **252 / 252 완전 일치** |

배포된 번들 [`assets/index-Fo046BVn.css`](https://neture.co.kr/assets/index-Fo046BVn.css) 에 `overflow-wrap:anywhere` · `word-break:keep-all` 이 실제로 포함되어 있고, 실제 화면 computed style 에서도 둘 다 적용된 것을 252건 전건 확인했다.

---

## 4. 검토했으나 결함이 아닌 것

**`CHAR_BREAK` 1건** — `메클린구강용해필름25밀리그램(메클리진염산염수화물)(오렌지향)`, 모바일에서 줄당 글자 수 `[13, 2, 12, 6]`.

화면으로 확인한 결과 결함이 아니다 (증거: [`after-fix-mobile-charbreak-review.png`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/evidence/after-fix-mobile-charbreak-review.png)). `밀리`/`그램` 분할은 한 덩어리가 250px 를 넘을 때만 `overflow-wrap:anywhere` 가 개입한 결과이고, 그 대안은 **카드를 뚫고 나가는 원래 버그**다. 낱자(1글자)로 흩어지는 현상은 전 검증 구간에서 0건이었다.

> 파일럿 단계에서 이 축을 **줄 폭 비율**로 판정했을 때 5건이 걸렸는데, 실측을 보니 전부 `keep-all` 이 한글 덩어리를 지켜 첫 줄이 짧아진 정상 동작이었다. 판정식을 **줄당 글자 수**로 교체한 뒤 남은 것이 위 1건이다.

`h1` 이 최대 10줄(280px)까지 늘어나는 경우에도 카드가 함께 늘어나 아래 항목과 겹치지 않는다 (증거: [`after-fix-mobile-worst-10lines.png`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/evidence/after-fix-mobile-worst-10lines.png), [`after-fix-desktop-worst-4lines.png`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/evidence/after-fix-desktop-worst-4lines.png)).

---

## 5. 완료 조건 대조

| 완료 조건 | 결과 |
|---|---|
| 19,363 × 3폭 로드 실패 0 | ✅ A층 전수 로드 실패 0 · B층 116,178 측정 · C층 252 로드 실패 0 |
| `h1` 및 페이지 가로 넘침 0 | ✅ 전 폭·전 층 0 |
| WRONG_PRODUCT 0 | ✅ A층 19,363 + C층 252 모두 0 |
| 기존 18건(14제품) 결함 재현 0 | ✅ 0 |
| 신규 위험 제품 시각 결함 0 | ✅ 84건 × 3폭 결함 0 (CHAR_BREAK 1건은 §4 에서 정상 판정) |
| DB write 0 | ✅ 전 스크립트 read-only (`SET default_transaction_read_only = on`) |
| 설명서 본문 변경 0 | ✅ 변경 파일에 본문 경로 없음 |
| CHECK · path-specific commit · push | ✅ 본 문서 · 아래 산출물 |

---

## 6. 산출물

스크립트 — [`apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/)

- [`select-browser-smoke.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/select-browser-smoke.mjs) · [`run-browser-smoke.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/run-browser-smoke.mjs) — 대표 60건
- [`h1-audit-collect.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/h1-audit-collect.mjs) — 모집단·위험 프로파일 수집 (read-only)
- [`h1-audit-api.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/h1-audit-api.mjs) — A층 전수 API 감사
- [`h1-audit-layout.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/h1-audit-layout.mjs) — B층 전수 레이아웃 측정
- [`select-h1-risk.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/select-h1-risk.mjs) · [`run-h1-risk-visual.mjs`](../../apps/api-server/src/scripts/easy-drug-ko-full-rebuild-live/run-h1-risk-visual.mjs) — C층 위험군 실검증

결과 — `results/` : `h1-population{,-summary}` · `h1-audit-api-*` · `h1-layout-*`(여유 폭 원장 포함) · `h1-risk-*` · `browser-smoke-run1-before-fix-*` · `browser-smoke-run2-after-fix-*`.
스크린샷 원본(`results/screenshots/`)은 용량 때문에 추적하지 않고, 대표 증거만 `evidence/` 에 커밋한다.

---

## 7. commit · push · 배포 결과

| 커밋 | 내용 | 배포 |
|---|---|---|
| `873ac46e6` | [`ProductLandingPage.tsx`](../../services/web-neture/src/pages/ProductLandingPage.tsx) 제목 가로 넘침 수정 + run1 결함 증거 | web 배포 run `30977947529` **success** |
| `dc97a5d0c` | 본 CHECK · 검증 스크립트 6종 · 결과 산출물 · 대표 증거 3장 (24 파일) | docs·scripts 전용 → 배포 불필요 |

- 두 커밋 모두 `git commit -- <파일 목록>` path-specific 으로만 스테이징했고, 타 세션 WIP 는 미접촉이다.
- 배포 반영 확인: 이후 타 세션 배포(`bfa0a3d7f`, `4274982e5`)까지 success 이며, 현재 서빙 중인 번들 `assets/index-Fo046BVn.css` 에 `overflow-wrap:anywhere` 가 그대로 남아 있다(§3 C층).
- **정정 기록** — `dc97a5d0c` 커밋 시도 중 `-F -` 를 `--` 뒤에 두어 git 이 옵션을 pathspec 으로 해석해 커밋이 실패했는데, 같은 명령줄에 이어 붙인 `git push` 는 그대로 실행되어 **타 세션이 로컬에 만들어 둔 커밋 `1fbe5ad01` 이 함께 push** 되었다. 해당 커밋 내용은 건드리지 않았고 이력 재작성도 하지 않는다.

---

## 8. 후속 (이번 범위 밖)

- HOLD KO 130건 `MANUAL_REVIEW` 유지
- 전문의약품 42건 별도 후속 감사
- EN 전량 재번역 (브라우저 검증 통과 후 착수 가능)
- `SAFE_TO_DELETE` 61건 물리 삭제
- 매장 복사 사본 감사
