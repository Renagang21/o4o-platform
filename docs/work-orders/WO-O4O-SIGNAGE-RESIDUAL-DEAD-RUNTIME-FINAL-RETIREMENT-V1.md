# WO-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1

> **상태: 핸드오프 (미실행)**
> 등록일: 2026-09-03 · 등록 시 `origin/main` HEAD: `81d69b703`
> 이 문서는 실행 대상 작업요청서이며, 등재 커밋 시점에는 **어떤 조사·삭제도 수행되지 않았다.**
> 실행 세션은 §3 의 시작 기준부터 수행한다.

---

## 1. 목표와 배경

Signage 축의 forced-content 는 세 단계가 모두 끝났다.

| 단계 | 결과 | 근거 |
|---|---|---|
| write/read 계약 정리 | CLOSED | `CHECK-O4O-SIGNAGE-FORCED-CONTENT-SURFACE-READ-CONTRACT-CLOSURE-V2` (PR #188 · `433a01c1c`) |
| 과거 데이터 purge | PASS | `CHECK-O4O-SIGNAGE-FORCED-CONTENT-LEGACY-DATA-PURGE-AND-FRESH-BASELINE-V1` (PR #189 · `81d69b703`) |
| fresh baseline | ESTABLISHED | 위와 동일 (3개 테이블 0건 · orphan 0건) |

따라서 다음 단계는 **계약이 정리된 뒤에도 남아 있는 Signage 축 잔여 runtime/UI/backend 를
실제 consumer 유무 기준으로 판정해 최종 은퇴**하는 것이다.

이번 작업은 신규 기능 개발도, 공통화 재설계도 아니다. **census 후 증명된 dead 만 제거**한다.

### 선행 census 대상 (등재 시점 `origin/main` 실측 — 경로 존재 확인 완료)

```text
1. /api/v1/signage/* 기반 admin 페이지 잔여
2. apps/admin-dashboard/src/pages/digital-signage/v2/MonitoringDashboard.tsx
3. packages/digital-signage-core/src/backend/controllers/**   (action/display/media/schedule 4계열)
4. packages/digital-signage-core/src/backend/lifecycle/**     (install/activate/deactivate/uninstall)
5. packages/digital-signage-core/src/backend/manifest.ts      ※ 디렉터리 아님 — 단일 파일
6. route 미등록 UI  (DigitalSignageRouter.tsx 하위 포함)
7. import-only / test-only / raw-source-only consumer
```

> **경로 정정 2건 (등재 시 실측):**
> - `digital-signage-core/src/backend/manifest` 는 **디렉터리가 아니라 파일** `manifest.ts` 다.
> - `MonitoringDashboard.tsx` 의 정확한 경로는 `apps/admin-dashboard/src/pages/digital-signage/v2/` 하위다.
>
> 위 목록은 **census 진입점**이지 삭제 대상 확정 목록이 아니다.
> `backend/services`·`entities`·`player`·`engine`·`routes.ts` 등 같은 패키지의 나머지 영역도
> 위 항목의 consumer 판정 과정에서 필연적으로 걸리므로 census 범위에 포함한다.

---

## 2. 승인 범위

### 판정 축 (모든 census 항목은 아래 5개 중 하나로 확정한다 — **미조사 0**)

| 판정 | 의미 | 처리 |
|---|---|---|
| `ACTIVE_RUNTIME` | 실제 요청/렌더 경로에서 소비됨 | **보존** |
| `DEAD_RUNTIME` | runtime consumer 0 이 증명됨 | **제거** |
| `TEST_ONLY` | 테스트만 참조 | 테스트 계약과 함께 판단 (§3-5) |
| `DOC_ONLY` | 문서/주석만 참조 | 제거 후 문서 현행화 |
| `DEFER_POLICY` | 정책·경계 판단이 필요해 이번 WO 에서 결정하지 않음 | **보존 + CHECK 에 사유 명시** |

### 허용 작업

```text
- 위 census 대상의 소스 파일 삭제 (DEAD_RUNTIME / DOC_ONLY 로 증명된 것만)
- dead file 의 존재만 강제하던 테스트의 계약 정리
- route 등록부 · barrel index · package export 정리
- 소비처 0 이 된 dependency 정리
- 관련 문서 현행화 (§16 인라인 허용 범위)
- CHECK 작성 · commit · push · PR · CI green
```

---

## 3. 실행 순서

### 3-1. 시작 기준

```bash
git fetch origin
git status -sb
git branch --show-current
```

작업트리가 clean 할 때만 `git pull --ff-only origin main`. 다른 세션 WIP 는
**수정·restore·stash·stage 금지**이며, 접촉이 불가피하면 §5 중지 조건이다.

**작업 브랜치**: `work/signage-residual-dead-runtime-v1` (본 문서 등재 브랜치와 별개)

### 3-2. census (미조사 0)

각 항목마다 **네 방향을 모두** 본다. 하나라도 빠지면 그 항목은 미조사다.

```text
① import graph      — 실제 import 하는 소스 (barrel index 경유 포함)
② route 등록        — Express mount / React Router element 로 실제 도달 가능한가
③ raw-source 소비   — readFileSync 로 문자열을 단언하는 spec (import graph 에 안 나타남)
④ 런타임 진입점     — main.ts / register-routes.ts / App.tsx 에서 실제로 닿는가
```

③ 은 CLAUDE.md **Shared Module Change Rule** 의 명문 요구사항이다. 식별자 검색만으로 소비처 0 을 선언하지 않는다.

```bash
node scripts/quality/check-literal-consumers.mjs --source <수정 대상 파일>
```

### 3-3. 삭제 전 선행 확인

`DEAD_RUNTIME` 판정마다 **삭제 근거를 CHECK 에 파일 단위로 남긴다**
(어느 방향에서 consumer 0 이 증명됐는지 ①~④ 중 무엇으로 확인했는지).

### 3-4. 제거

의존 방향의 말단부터 제거한다 (consumer → 대상 순서가 아니라 **대상이 아무것도 참조되지 않는 상태**를 먼저 만든다).

### 3-5. 테스트 계약 정리

**dead file 의 존재 자체를 강제하는 테스트가 있으면, 그 테스트도 함께 정리한다.**
단 아래는 구분한다.

| 테스트 성격 | 처리 |
|---|---|
| dead file 존재/구조를 단언 | 대상과 함께 제거 |
| **retirement guard** (retired 상태 유지를 단언) | **보존** — 이 테스트는 dead 가 아니라 계약이다 |
| forced-content surface truth table | **보존** (PR #188/#189 계약) |

### 3-6. 검증 → CHECK → commit/push → CI green

---

## 4. 제외 범위

아래는 **손대지 않는다.** 잔여 파일이 남아 있다는 사실은 제거 근거가 아니다.

```text
- Tablet ScreenSet canonical 경로               (resolver·store-public-screen-set-resolve 계열)
- signage_forced_content 및 그 reader/writer    (PR #188/#189 계약 — 회귀 0)
- Channel runtime                               (retired 유지 · 복구·부활 금지)
- production 데이터                             (DELETE·UPDATE 0건)
- DB schema / table DROP / migration            (DDL 0건)
- store_playlists · signage_media 등 살아 있는 테이블
- docs/baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1  (KEEP-LEGACY 명시 — 정책상 보존)
- KPA-SIGNAGE-STRUCTURE-V1 이 규정한 구조
- docs/checks/** · docs/investigations/** · docs/ir/** · docs/work-orders/**  (기록물 · CLAUDE.md §16-1)
```

**`DEFER_POLICY` 로 판정된 항목은 이번 WO 에서 제거하지 않는다.**

### 4-1. 선행 WO 와의 범위 충돌 (실행 전 반드시 확인)

`origin/main` 에 **WO-O4O-LEGACY-FILES-DEPENDENCIES-AND-DEAD-RUNTIME-FINAL-CLEANUP-V1**
(`519e437ff` 등재)이 이미 존재하고, 등재 시점 기준 **다른 세션이 워크트리
`C:/tmp/o4o-legacy-cleanup-v1` (브랜치 `work/o4o-legacy-final-cleanup-v1`) 에서 실행 중**이다.

해당 WO 의 아래 섹션은 본 WO 와 대상이 겹칠 수 있다.

```text
§6  소비처 0 package dependency 전수조사   → digital-signage-core 가 걸릴 수 있음
§7  package retirement 기준
§8  dashboard dead code                    → pages/digital-signage/** 가 걸릴 수 있음
§17 dead tests 정리
§21 API route 최종 residue audit           → /api/v1/signage/* 가 걸릴 수 있음
```

**따라서 본 WO 는 위 WO 가 merge 된 뒤 최신 main 에서 착수한다.**
불가피하게 병행해야 하면 착수 시점의 main 으로 census 를 **다시** 뜨고,
이미 제거된 항목은 본 WO 의 census 에서 제외한 뒤 그 사실을 CHECK 에 기록한다.
**같은 파일을 두 WO 가 동시에 삭제하려 하면 §5 중지 조건이다.**

---

## 5. 중지 조건

아래는 진행을 멈추고 사용자 판단을 요청한다.

```text
- consumer 0 을 증명하지 못한 채 삭제해야 하는 상황       (증명 못 하면 삭제하지 않는다)
- 선행 legacy cleanup WO 와 동일 파일이 동시 삭제 대상
- 다른 세션의 dirty · 미추적 파일 접촉 필요
- schema / migration / production 데이터 변경이 필요해지는 경우
- package.json · lockfile · dependency 제거가 build 를 깨는 경우
- Channel 을 되살려야만 통과하는 검증이 나오는 경우       (그 검증이 잘못된 것이다)
- Tablet ScreenSet 또는 forced-content 계약을 바꿔야 하는 경우
- Frozen Baseline(CLAUDE.md §14 · F1 Operator OS / F3 Store Layer) 변경 필요
- 이번 변경과 무관한 build · test 실패
```

---

## 6. 검증과 Git

### 검증

```text
pnpm --filter @o4o/api-server exec tsc --noEmit        PASS 필수
signage / tablet / channel / campaign / forced / playlist 관련 테스트 전체   PASS 필수
admin-dashboard build                                   PASS 필수
digital-signage-core 를 의존하는 패키지 build            PASS 필수
```

**회귀 0 을 명시 확인할 3개 축** (CHECK 에 결과를 표로 남긴다):

```text
Channel 부활 0
Tablet ScreenSet 회귀 0
forced-content 회귀 0
```

> `web-kpa-society` 등 선별 COPY Dockerfile 을 쓰는 앱은 패키지 구성을 바꾸면 빌드가 깨진다.
> 패키지 export/의존을 건드렸다면 해당 Dockerfile 도 함께 확인한다.

### Git

```text
- path-specific stage 강제 · git add . 금지
- 커밋 직전 node scripts/git/check-staged-scope.mjs <작업 경로...>
- git commit -m "..." -- <내 파일...>
- PR 생성 → CI green 확인 → merge
- 완료 조건: 이번 WO 범위의 미커밋 변경 0건 + main 반영 SHA 확인
```

---

## 7. 완료 보고

보고에 아래를 포함한다 (한국어 · 기술 식별자는 원문 유지).

```text
1. WO 제목
2. census 결과표 — 항목별 ACTIVE_RUNTIME / DEAD_RUNTIME / TEST_ONLY / DOC_ONLY / DEFER_POLICY
   (미조사 0 임을 수치로 제시)
3. 제거한 파일 목록 + 각각의 consumer 0 증명 방향(①~④)
4. 보존한 항목과 그 사유 (특히 DEFER_POLICY)
5. 정리한 테스트 계약 + 보존한 retirement guard
6. 회귀 0 확인 3축 (Channel / Tablet ScreenSet / forced-content)
7. 검증 결과 — tsc / tests / build (실패·미실행 항목을 숨기지 않는다)
8. CHECK 문서 링크
9. Git — 브랜치 · commit · PR · CI · main 반영 SHA
10. 문서 정합 한 줄 (CLAUDE.md §16-5)
```

**CHECK**: `docs/checks/CHECK-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1.md`

---

## 다음 단계 (본 WO 범위 밖)

본 WO 종료 후에는 구조 정리가 아니라 **데이터 무결성 강화**로 넘어간다.

```text
target_surface DB CHECK constraint 도입
  — fresh baseline(0건) 상태이므로 기존 데이터 위반 없이 제약을 걸 수 있는 시점이다.
  — schema 변경이므로 별도 WO + migration 계약이 필요하다.
```
