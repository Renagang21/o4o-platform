# CHECK-O4O-PRODUCT-DESCRIPTION-AUTH-ACCESS-BASELINE-AMENDMENT-V1

> 성격: **완료보고(문서·결정 정비)** · 작성일 2026-07-12
> 대응 WO: `WO-O4O-PRODUCT-DESCRIPTION-AUTH-ACCESS-BASELINE-AMENDMENT-V1`
> 결정: `docs/adr/ADR-0002-o4o-product-description-authenticated-access.md`
> baseline 개정: `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT.md`

---

## 0. 결과 한 줄

F12/V2 가 전제한 상품 설명서 **공개 열람**을, 확정 정책(`O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1`)에 맞춰 **로그인 회원 전용 본문 열람**으로 baseline 개정(V3-AMENDMENT + ADR-0002)했다. 고정 URL·기본 QR 은 유지. 인증 구현은 하지 않음(후속 WO).

## 1. 무변경 선언

```
코드 변경        = 0
API 인증 구현     = 0
DB write        = 0
migration       = 0
deploy          = 0
QR 재발급        = 0
landing key 변경 = 0
기존 URL 변경     = 0
product_landings 데이터 변경 = 0
store_qr_codes 변경 = 0
IR·CHECK 역사 문서 소급 수정 = 0
Frozen baseline 원문(V1·V2) 재작성 = 0
```

> 작업 시작 시 `git pull origin main`(Already up to date, HEAD `d41e93d9e`). 워킹트리에 **본 WO 와 무관한** 로컬 변경 1건(`docs/checks/CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md`, 이전 WO 에서 발생한 conflict marker 포함 파일; 사용자 편집은 `stash@{0}` 보존)만 존재. 이번 WO 산출물과 **섞지 않았다**(커밋에서 제외).

---

## 2. 조사한 baseline 문서

| 문서 | 확인 내용 |
|---|---|
| `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md` | F12 Frozen. 불변식 #3 "Resource ID = UUID + **공개 permalink `/r/{id}`**"(:50), #4 QR 비저장·동적생성(:51). §4 거버넌스: 구조 변경은 baseline 개정 WO 필수(:79) |
| `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT.md` | `/p/{key}` Product Landing permalink 추가(:22), 여전히 **공개 URL 전제**. 불변식 #7(master당 landing/QR 1개) 신설(:50). §7 "본 개정 범위 외 구조 변경은 다시 명시적 WO"(:65) |
| `docs/baseline/O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1.md` | 1-A 상품 기본 QR = 공공재·무료·영구(:17-22); 1-B 사업용 QR = entitlement(:24-31). "무료·공공재"=과금/소유 의미 → 본 개정의 "로그인 열람"과 정합 확인 |
| `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md` | §2 로그인 전용 열람·고정 URL/QR 유지·returnUrl — **정책 SSOT 이미 정렬** |
| `docs/investigations/IR-...POLICY-CODE-AND-DOC-AUDIT-V1.md` · `docs/checks/CHECK-...POLICY-CODE-AND-DOC-AUDIT-V1.md` | 현재 `/p/{key}` API 무인증 공개(IR §7-8), F12 ③/V2 충돌(IR §14) 근거 |
| `docs/adr/README.md` · `ADR-TEMPLATE.md` · `ADR-0001` | ADR 계보(IR→ADR→Guide), `ADR-NNNN-<slug>` 명명, 1 ADR=1 결정 |

**`/p/{key}`·`/r/{id}` 실체**: `/p/{key}` = 구현됨(공개), `/r/{id}` = 미구현(F12 목표). 실제 상품 페이지·설명서 API 는 `GET /api/v1/public/product-landings/:key`(무인증). (IR/CHECK-...POLICY-CODE-AND-DOC-AUDIT-V1 근거.)

---

## 3. 최종 선택한 문서 계보

WO §13 의 3안(A 신규 ADR / B 신규 V3 amendment / C V2 후속 amendment) 중 **저장소 실제 계보에 맞춰 "V3 amendment + ADR" 병행**을 선택.

- **근거**: F12 는 Frozen baseline 이고 V1→V2 개정이 **`docs/baseline/` 의 amendment 문서**로 이뤄진 선례가 있다. 열람 접근 모델 변경은 불변식 #3 을 개정하므로 **baseline amendment(V3)** 가 load-bearing 문서로 필수다. 동시에 저장소는 결정 원장(`docs/adr/`)을 운영하므로, 이 주요 결정을 **ADR-0002** 로 등재한다(IR→ADR→Guide 계보 준수).
- WO §15 가 예시한 경로(`docs/guides/products/...V3-AMENDMENT.md`)는 **부적합** — V1/V2 가 `docs/baseline/` 에 있으므로 V3 도 `docs/baseline/` 에 배치. ADR 파일명도 WO 예시(`ADR-O4O-...-V1.md`) 대신 저장소 규칙 `ADR-NNNN-<slug>` 적용(`ADR-0002-...`).

---

## 4. 변경한 Active 문서 목록 (이번 WO 산출)

| 문서 | 변경 성격 |
|---|---|
| `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT.md` | **신규** — 불변식 #3 개정(고정 URL·인증 열람) + #8(서버 인증)·#9(열람=로그인 기본 권한) 신설, 서버 인증·공개범위·검색/캐시 보호·QR 구분·호환성 원칙 |
| `docs/adr/ADR-0002-o4o-product-description-authenticated-access.md` | **신규** — 결정 원장 등재(Accepted) |
| `docs/adr/README.md` | 목록 표에 ADR-0002 1행 추가(인덱스) |
| `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT.md` | 상단에 **V3 후속 개정 forward-pointer 1블록** 추가(원문·결정 보존, 비파괴적 링크) |

**변경하지 않은 것**: V1 원문, IR/CHECK/WO 등 역사 문서, 정책 SSOT(이미 정렬), CLAUDE.md(아래 §7).

---

## 5. 변경 전·후 정책 비교

| 항목 | 전(V1/V2) | 후(V3) |
|---|---|---|
| 설명서 본문 접근 | 공개·무인증 | **O4O 로그인 세션 전용** |
| 고정 URL / landing key | 유지 | **유지(불변)** |
| 기본 QR 주소·이미지 | 유지·동적생성 | **유지·재발급 없음** |
| 비로그인 요청 | 본문 반환 | **본문 미반환 + 로그인 CTA + returnUrl** |
| 접근 통제 기준 | 없음 | **서버 API 인증**(프론트 숨김·noindex 단독 금지) |
| 검색엔진/캐시 | 미규정 | **sitemap 제외·noindex·OG/검색 본문 미포함·공개 캐시 금지** |
| 열람 vs 구독 | 미분리 | **열람=로그인 기본 권한 / 구독=사업 기능** |
| 사업용 QR(`store_qr_codes`) | — | **변경 없음** |

---

## 6. 기존 URL·QR 유지 여부

**유지 확정.** V3 §2.2·§4 및 불변식 #3/#4 로 고정 URL·landing key·기본 QR(주소·이미지)·ProductMaster↔Landing 연결을 그대로 유지하고, 새 QR 발급·landing key 재생성·기존 URL 폐기·`product_landings`/`store_qr_codes` 데이터 변경을 금지함을 명문화. 기존 QR 스캔 → 기존 URL → 로그인/가입 → 기존 설명서 복귀 흐름.

---

## 7. 구현 미실행 확인 + 미해결/이월

- **구현 미실행**: 인증 게이트·returnUrl·noindex/OG/sitemap·API 인증 등 코드 0. §8 후속 WO 범위.
- **CLAUDE.md §14 F12 행**: 현재 V1 만 링크(V2 도입 때도 미갱신). 헌법 문서 갱신은 별도 거버넌스 판단이라 이번 WO 범위에서 제외 — V1→V2→V3 계보는 baseline 문서 간 상호 링크로 자족.
- **최소 상품 식별정보 노출 범위**: 비로그인에 허용할 식별정보 범위는 후속 구현 WO 에서 확정(본문 미포함 원칙만 V3 확정).
- **무관 로컬 파일**: `CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md` conflict 는 사용자 결정 사항(stash@{0} 보존), 본 WO 미포함.

---

## 8. 후속 구현 WO 제안

```
WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1
```
범위: `/p/{key}` 페이지 로그인 게이트 · 설명서 API 인증 · 비로그인 본문 차단 · 로그인·가입 returnUrl · 로그인 후 원래 설명서 복귀 · noindex/OG/sitemap 정비 · 공개 검색 응답 본문 제거 · 공개 캐시 방지 · 기존 QR 호환성 smoke.

---

## 9. 완료 기준 대조

| WO 완료 기준 | 충족 |
|---|---|
| 기존 F12/V2 공개 열람 원칙 확인 | ✅ §2 |
| 새 로그인 전용 정책과의 충돌 명시 | ✅ V3 §1, ADR-0002 맥락 |
| 적절한 ADR 또는 amendment 작성 | ✅ V3-AMENDMENT + ADR-0002 |
| 상품 고정 URL 유지 명시 | ✅ V3 §2.1/#3 |
| 상품 기본 QR 유지 명시 | ✅ V3 §2.2/#4 |
| 비로그인 본문 차단 원칙 명시 | ✅ V3 §2.3-2.4/#8 |
| 서버 인증 원칙 명시 | ✅ V3 §2.3/#8 |
| 로그인 후 returnUrl 복귀 명시 | ✅ V3 §2.1 |
| 설명서 열람과 구독 분리 명시 | ✅ V3 §2.6/#9 |
| 검색엔진·캐시 보호 원칙 명시 | ✅ V3 §2.5 |
| 후속 구현 WO 범위 제안 | ✅ V3 §8 / 본 §8 |
| 코드·DB·migration·deploy·QR 재발급 0 | ✅ §1 |
| commit/push | ⏳ 본 커밋으로 완료 |
