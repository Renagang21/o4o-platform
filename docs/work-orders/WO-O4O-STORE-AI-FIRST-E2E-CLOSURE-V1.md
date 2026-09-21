# WO-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1

> **상태**: **HANDOFF / BLOCKED_BY_STORE_OWNER_ACCOUNT** — 접수만. **Gate 0(유효 store_owner smoke 계정) 확인 전 실행 금지.** 계정 준비가 확인되면 팀장 즉시 실행 승인 예정 · **접수**: 2026-09-21 · **CHECK**: (실행 후 `docs/checks/CHECK-O4O-STORE-AI-FIRST-E2E-CLOSURE-V1.md`)
> 내 매장 AI First 리팩터링 **5단계(마지막)**. 선행 WO1 [`…-AI-FIRST-EDITOR-BOUNDARY-V1`](WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1.md) · WO2 [`…-EXTERNAL-LLM-CONTENT-AUTHORING-V1`](WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1.md) · WO3 [`…-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1`](WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1.md) · WO4 [`…-INTERNAL-AI-RETIREMENT-V1`](WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1.md) 은 전부 `COMPLETE_WITH_SMOKE_PENDING` — 코드·계약 테스트·빌드·배포·bundle 은 PASS 이나 **실제 브라우저 Store smoke 가 store-owner 로그인 불가로 4건 모두 `PENDING_USER_VERIFICATION`** 이다. 이 WO 는 그 4건을 실제 사용자 흐름으로 닫는다.
>
> 실행 시 최신 `origin/main` 에서 다시 census 하고, 동일 파일에 다른 세션 WIP 가 있으면 즉시 보고 · 중지한다.

## 1. 목적

```text
WO1  showInternalAi={false}          → 브라우저 확인 PENDING
WO2  ChatGPT로 작업 · 일반 콘텐츠/제작자료 → 브라우저 확인 PENDING
WO3  Blog · POP · 상품설명 · 다국어 · QR   → 브라우저 확인 PENDING
WO4  Store 내부 AI 잔존 0                → 브라우저 확인 PENDING
WO5  (이번) 정상 인증된 실제 store_owner 문맥에서 위 4건을 실 브라우저로 일괄 검증
     · 발견된 회귀는 최소 수정 · WO1~4 CHECK 의 PENDING 열을 PASS/FAIL 로 확정
```

이 WO 는 **새 기능을 만들지 않는다.** 산출물은 ① 실사용 흐름 검증 결과 ② 회귀 최소 수정(있을 때만) ③ WO1~4 smoke closure 이다.

## 2. Gate 0 — 유효 store_owner smoke 계정 (실행 전제)

현재 증거: `STORE_OWNER_SMOKE_ACCOUNT = NOT_READY / NOT_VERIFIED`.

| 확인된 사실 | 출처 |
|---|---|
| `docs/local/TEST-ACCOUNTS.local.md` 의 store_owner 계정(`renagang21`) — KPA·PH 로그인 API `401 INVALID_USER` | WO1 CHECK §6-1 |
| 보조 계정 KPA `403` lockout(로그인 시도 과다) | WO1 CHECK §6-1 |
| `renagang21` 은 이후 Google Identity 트랙에서 **Google-only 신규 user(password NULL · role/membership 0)** 로 재정의됨 — password 로그인 경로 아님 | Google Identity CHECK smoke 2~4 |
| WO2·3·4 는 lockout 위험으로 **추가 로그인 시도 없이** PENDING 유지 | 각 CHECK §6/§7 |

**Gate 0 PASS 조건** (전부 충족):

1. **정상 인증 경로**로 로그인되는 계정 — 현행 인증 방향에 맞춰 **Google 로그인 우선**. 과거 email/password 테스트 계정 복구 · 새 seed 계정 · DB 직접 role/membership INSERT · lockout 해제 조작은 **모두 금지**(§6).
2. 그 user 가 대상 서비스에서 **`store_owner` 역할 + 매장(organization) 연결**을 정상 경로(서비스 가입 → 운영자 승인 · 사업자정보 5항목 gate 포함)로 갖는다. 서비스별로 나눠도 된다 — KPA / K-Cosmetics / PharmacyHub 중 **실제 Store Workspace 가 있는 서비스 최소 1개** 이상.
3. `store_owner_agreement` 가 실행 시점에 게시(ACTIVE)돼 있으면 Store Workspace 진입 시 `428 STORE_OWNER_AGREEMENT_REQUIRED` 가 정상이다 — 이 경우 **명시적 동의 1회**가 Gate 1 에 포함된다(현재는 DRAFT · 미게시 = gate no-op).
4. 계정 식별자 · 자격정보는 `docs/local/TEST-ACCOUNTS.local.md`(git 미추적) 에만 갱신. CHECK · 커밋 · 로그에 기록하지 않는다.

Gate 0 는 **사용자/운영자가 준비하고 확인을 알려주는 것**이며, 이 WO 실행자가 만들지 않는다. 확인 전에는 로그인 시도 자체를 하지 않는다(lockout 재발 방지).

## 3. Gate 구조 · 검증 항목

```text
Gate 0  Valid Store Owner Account (§2)                       ← 사용자 확인
   ↓ PASS
Gate 1  로그인 → Store Workspace 진입(서비스별 최소 1) · (게시 시) 계약 동의 1회
   ↓
Gate 2  일반 콘텐츠 · 제작 자료 — ChatGPT로 작업 → 안내 복사 → 붙여넣기 → 편집기 반영 → 기존 저장 → 재조회
   ↓
Gate 3  Blog / POP / 상품 설명 / 다국어 / QR — 각 1회 동일 흐름 + 목적별 조건 문구 확인
   ↓
Gate 4  기존 실행 회귀 — 태블릿 · 사이니지 · PDF · QR 목록 "AI 설명" 탭 · legacy QR 콘텐츠 편집 진입
   ↓
Gate 5  Store internal AI = 0 재확인 — 툴바 AI 버튼 없음 · "AI로 설명 만들기" 없음 · 저장 row generatedBy 키 부재
   ↓
WO1~4 CHECK 의 PENDING 열 → PASS / FAIL 확정
```

세부 확인 목록은 각 CHECK 의 "재개 절차"를 그대로 따른다 — WO1 CHECK §6-1(미수행 항목) · WO2 CHECK §6-3 · WO3 CHECK §7(서비스별 route 목록 · 목적별 조건 문구 5종) · WO4 CHECK §7(QR 은퇴 확인 6항목). 여기에 복제하지 않는다.

- Gate 2·3 의 "ChatGPT" 단계는 **사용자 자신의 외부 LLM 계정**으로 수행하거나, 붙여넣을 HTML 을 실행자가 임의 작성해도 무방하다(검증 대상은 O4O 쪽 안내 복사 → 붙여넣기 → 저장 계약이지 LLM 출력 품질이 아님).
- 서비스별 분담 허용: 한 계정으로 3 서비스를 억지로 검증하지 않는다. 서비스별 Store Workspace 가 있는 계정 범위 안에서 **대표 smoke** 를 나누고, 검증 못 한 서비스는 CHECK 에 `NOT_COVERED(계정 없음)` 로 남긴다.
- 실 브라우저로 한다(bundle grep · API 응답만으로 PASS 처리 금지). 저장 결과 확인은 화면 재조회 + 필요 시 read-only DB 조회.

## 4. 회귀 발견 시 처리

```text
본 트랙(WO1~4) 변경이 원인      → 최소 수정 · 같은 WO 안에서 재검증 · CHECK 에 기록
본 트랙과 무관한 기존 결함       → 수정하지 않음 · CHECK 에 보고 · 별도 WO 제안
auth · 권한 · 계정 · 정책 문제   → 수정하지 않음 · 중지 조건 · 보고
```

## 5. 완료 기준

`STORE_OWNER_SMOKE_ACCOUNT=VERIFIED` · `GATE_1..5=PASS`(NOT_COVERED 서비스는 명시) · `WO1_SMOKE=CLOSED` · `WO2_SMOKE=CLOSED` · `WO3_SMOKE=CLOSED` · `WO4_SMOKE=CLOSED` · `STORE_INTERNAL_AI_RUNTIME=0` · `NEW_FEATURE=0` · `AUTH_CHANGE=0` · `DB_MIGRATION=0` · `SEED_ACCOUNT_CREATED=0` · `CREDENTIAL_IN_REPO=0`.

트랙 종결 표기: WO1~4 CHECK 헤더 판정을 `COMPLETE_WITH_SMOKE_PENDING` → `CLOSED`(또는 FAIL 항목이 남으면 `CLOSED_WITH_REGRESSION_WO`) 로 갱신하고, 메모리/트랙 상태를 `STORE_AI_FIRST=CLOSED` 로 올린다.

## 6. 금지

```text
새 기능 · 화면 · Prompt task 추가          (회귀 최소 수정만)
seed 계정 생성 · legacy password 계정 복구 · DB 직접 role/membership/organization INSERT
lockout 해제 · 로그인 실패 반복 시도 · auth/guard 코드 수정
자격정보 · 계정 email 을 CHECK/커밋/로그에 기록
showInternalAi={true} · AiContentModal / /api/ai/content Store 재연결
content-editor 공통 AI · non-Store 화면 변경
DB migration · 데이터 삭제/백필
```

## 7. 실행 순서 · Git

```text
0. Gate 0 확인 통지 수신 (없으면 시작하지 않음)
A. git fetch → status → 최신 main 에서 WO1~4 변경 파일 census (다른 세션 WIP 충돌 확인)
B. Gate 1~5 실 브라우저 수행 · 항목별 PASS/FAIL/NOT_COVERED 기록(캡처는 민감정보 마스킹)
C. 회귀 최소 수정(있을 때만) → 기존 spec 4 suites + 관련 build → 배포 → bundle 확인 → 해당 Gate 재검증
D. CHECK 작성 + WO1~4 CHECK 헤더 판정 갱신(4 파일) + 본 WO 상태 갱신
E. path-specific stage → node scripts/git/check-staged-scope.mjs <paths> → git commit -m "…" -- <paths> → push
```

관련 파일만 stage 한다. 다른 세션의 수정·미추적 파일 불가침. 보고에 `문서 정합` 한 줄 포함.
