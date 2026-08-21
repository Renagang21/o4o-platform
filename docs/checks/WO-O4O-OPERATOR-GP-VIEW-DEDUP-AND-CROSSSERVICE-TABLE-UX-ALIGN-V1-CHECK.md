# WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1 — CHECK

- **작업일**: 2026-08-21
- **선행**: [`WO-O4O-OPERATOR-KPA-CANONICAL-CROSSSERVICE-UIUX-FULL-CENSUS-V1-CHECK`](WO-O4O-OPERATOR-KPA-CANONICAL-CROSSSERVICE-UIUX-FULL-CENSUS-V1-CHECK.md)
- **성격**: 구현 (GlycoPharm View 중복 수렴 + 공통 Table 모바일 UX)
- **DB / API / schema 변경**: **0건**

---

## 1. GP VIEW_DUPLICATED: before → after

| | before | after |
|---|---:|---:|
| GP VIEW_DUPLICATED (census 58업무 기준) | **18** | **6** |
| 이번 WO 대상(선행 census §9 "선행조건 0") | 12 | **0** |

**남은 6건**은 전부 선행 판단이 필요해 이번 범위에서 의도적으로 제외했다 (§4).

### 삭제 LOC

```
26 files changed, 598 insertions(+), 6053 deletions(-)
순감 = 5,455 LOC
```

| 업무 | before(로컬) | after(래퍼) |
|---|---:|---:|
| 사이니지 HQ 8화면 | 2,233 | 247 (config 67 포함) |
| 블로그/POP/QR 6화면 | 2,239 | 353 |
| 매장 상세 | 419 | 68 |
| 채널 관리 | 408 | 70 |
| 설문 2화면 | 494 | 76 (adapter 54 포함) |
| 운영 분석 | 329 | 60 |
| LMS 죽은 파일 | 226 | **0 (삭제)** |

---

## 2. 공통화한 업무 목록 (13)

| # | 업무 | 수렴 대상 공통 모듈 | 비고 |
|:--:|---|---|---|
| 1-4 | 사이니지 HQ 미디어/플레이리스트/템플릿/강제콘텐츠 | `@o4o/operator-core-ui/modules/signage-hq` | endpoint `/api/signage/glycopharm/*` 동일 확인 후 수렴 |
| 5-7 | 매장 HUB 블로그 / POP / QR | `hub-content-list` · `hub-content-write` · `qr-template-write` | QR 은 KPA 전용 ContentHubPicker 미주입 (GP 는 blog/cms/pop 3종 그대로) |
| 8 | 매장 상세 | `modules/store-detail` | ⚠ capability 변화 1건 → §3 |
| 9 | 채널 관리 | `modules/store-channels` | 상태머신 APPROVED↔SUSPENDED→TERMINATED 불변 |
| 10-11 | 설문 목록 / 만들기 | `OperatorSurveyListPage` · `OperatorSurveyCreatePage` | GP 는 axios 응답이라 `res.data.data` 언랩 어댑터 신설 |
| 12 | 운영 분석 | `modules/operator-analytics` | GP 고유 "분석 기능 준비 중" 안내는 `notice` 슬롯으로 보존 |
| 13 | LMS 강의 관리 | (이미 공통) | `LmsCoursesPage.tsx` 226줄이 **어디서도 import 되지 않는 죽은 파일**이었다. route 는 이미 공통 wrapper 사용 중 → 파일만 삭제 |

> **census 정정**: I1(LMS) GP 를 `VIEW_DUPLICATED` 로 적었으나 실제로는
> route 가 이미 공통 wrapper 를 쓰고 있었고 로컬 파일은 dead code 였다.
> "이중 존재" 표현은 맞았으나 판정은 과했다.

---

## 3. 의도적 동작 변화 1건 (승인 필요 시 되돌릴 수 있음)

**매장 상세 — 채널 상태 전이 UI 노출**

- before: GP 로컬 화면은 채널 상태를 **배지로 읽기만** 했다 (전이 UI 없음)
- after: 공통 콘솔이 채널 상태 전이를 포함한다
- **권한 신설이 아니다** — backend `PUT /api/v1/operator/stores/:storeId/channels/:channelId/status` 의
  guard 에 `glycopharm:operator` 가 **이미 포함**돼 있다
  ([`stores.routes.ts:27`](../../apps/api-server/src/routes/operator/stores.routes.ts#L27))
- 즉 **이미 부여된 권한을 UI 로 노출**하는 것이고, K-Cosmetics 는 같은 모듈로 이미 이 기능을 갖고 있었다
- API / DB / guard 변경 0건

되돌리려면 공통 모듈에 채널 액션 비활성 prop 을 추가해야 하므로, 유지/제거는 **판단 요청** 사항이다.

---

## 4. SERVICE_SPECIFIC / 유지 항목과 이유

| 항목 | 판정 | 이유 |
|---|---|---|
| GP 사이니지 `library` · `content` · `playlist/:id` · `media/:id` · `preview` 5 route | 유지 | HQ 8화면과 **다른 업무**(매장 측 콘텐츠 축). census G1~G4 대상 아님 |
| A4·A5 가입 신청 목록/상세 | 제외 | 승인 대상 엔티티가 서비스마다 다름(`registration_requests` / 서비스별 application / `service_memberships`) — 축 통일 IR 선행 |
| D3 이벤트 오퍼 | 제외 | KPA 는 오퍼 생성까지 포함, GP/KCos 는 승인만. `EVENT-OFFER-COMMON-DOMAIN-V1` 정렬 선행 |
| D5 매장 승인 | 제외 | GP 만 `store_approvals` 별도 축. 대응 공통 모듈 부재 |
| F2 상품 상세 | 제외 | 대응 공통 모듈 부재 |
| K4 서비스 설정 | 제외 | 설정 축 자체가 서비스별로 다름 |
| GP QR 콘텐츠 허브 선택기 | 미주입 | KPA 전용 서브시스템. GP 로컬도 blog/cms/pop 3종뿐이었다 (기존 동작 보존) |
| GP blog/POP/QR accent = blue | 보존 | GP 로컬이 쓰던 색 그대로. 시각 회귀 0 목적 |

---

## 5. DataTable mobile 수정 방식

### 5-1. 먼저 — 선행 census 의 기전 판정이 틀렸다 (정정)

프로덕션 390×844 실측 결과:

```
document.scrollWidth == clientWidth == 390   → 페이지 가로 넘침 없음
table 상위 .overflow-x-auto : scrollWidth 1025 / clientWidth 308
scrollLeft 0 → 645 (KPA) · 0 → 717 (PharmacyHub)  → 가로 스크롤 정상 동작
```

**"가로 overflow container 없음 / 화면 밖으로 잘림" 은 오진이었다.** 컨테이너는 이미 있고 스크롤된다.
선행 CHECK §2-5 에 정정 블록을 넣었다.

실제 결함은 **가독성**이다 — 상태·권한 컬럼을 보려고 가로 스크롤하면
행의 신원(이름)이 사라져 "어느 행을 보는지" 알 수 없었다. 고정된 것은 선택 체크박스뿐이었다.

### 5-2. 수정 내용 (공통 Core 만, 서비스별 CSS patch 0)

**① `packages/ui` BaseTable — 다중 sticky 컬럼 좌측 offset 계산**

기존에는 sticky 컬럼이 무조건 `left: 0` 이라 **sticky 가 2개 이상이면 서로 겹쳤다**(잠재 버그).
선행 sticky 컬럼들의 실제 렌더 폭을 `ResizeObserver` + resize 로 측정해 누적 offset 을 적용한다.
sticky 가 연속하지 않아도 된다(`[_select, 액션, 이름]` 에서 `_select`·`이름`만 sticky 가능).

> **회귀 없음 근거**: sticky 가 0~1개인 기존 소비처는 offset 이 전부 0 → 렌더 결과 동일.
> 현재 sticky 2개가 되는 화면은 이번에 `stickyOnMobile` 을 준 회원 관리(모바일 폭)뿐이다.

**② `packages/operator-ux-core` DataTable — `stickyOnMobile` 컬럼 플래그**

`ListColumnDef.stickyOnMobile` 추가. `matchMedia('(max-width: 640px)')` 가 참일 때만 `sticky` 로 승격한다.
desktop 에서는 **아무 효과가 없다** (matchMedia false → 기존 매핑 그대로).
SSR / matchMedia 미지원 환경도 false 로 떨어진다.

**③ 회원 관리 신원 컬럼에 적용**

`OperatorMembersConsolePage` 의 `name` 컬럼에 `stickyOnMobile: true`.
5개 서비스가 **모두 이 공통 콘솔을 쓰므로 한 줄로 5서비스 동시 적용**된다.

### 5-3. 하지 않은 것 (명시)

**모바일 card 뷰 전환은 하지 않았다.** 약 60개 운영자 리스트 화면 전체의 렌더 구조를 바꾸는 일이라
이번 WO 의 회귀 위험 대비 이득이 맞지 않는다. `stickyOnMobile` 은 그 방향으로 가는 첫 단계이며,
필요하면 컬럼별 우선순위(`mobilePriority`) 를 같은 자리에 얹을 수 있다.

---

## 6. 검증 결과

### 6-1. 정적 검증 — 전부 통과

| 항목 | KPA | Neture | K-Cos | GlycoPharm | PharmacyHub |
|---|:--:|:--:|:--:|:--:|:--:|
| type-check | ✅ | ✅ | ✅ | ✅ | ✅ |
| production build | ✅ | ✅ | ✅ | ✅ | ✅ |

`pnpm run build:packages` (공통 패키지 6개 변경분 포함) 통과.

### 6-2. 브라우저 검증 — **미완. 배포 필요.** (숨기지 않고 기록)

| 시도 | 결과 |
|---|---|
| 로컬 preview(`vite preview :4321`) + 프로덕션 API | ❌ **인증 불가** — 5개 화면 전부 로그인 화면. `localhost` origin 이 프로덕션 API 의 CORS/세션 경계 밖이다 |
| 프로덕션 직접 확인 | ❌ 이번 변경이 **아직 배포되지 않았다** |
| 웹 폼 로그인 | ❌ L2 `service_credentials` 비밀번호 전량 unknown (선행 CHECK §2-1) |

**따라서 이번 WO 의 브라우저 검증 항목은 통과로 기록하지 않는다.**
배포 후 아래를 실측해야 완료다:

```
GP  : 대상 13화면 × (목록 / selection / ActionBar / row action / detail / deep link+refresh)
5서비스: DataTable 대표 화면 desktop 1440×900 + mobile 390×844
        · mobile 신원 컬럼 고정 동작
        · desktop sticky 회귀 0
        · white screen 0 / JS exception 0 / unexpected 404·500 0
write fixture: selection → bulk → restore
```

---

## 7. 남은 UX_DRIFT / NOT_IMPLEMENTED (이번 WO 범위 밖)

- **UX_DRIFT 12건** — 변동 없음 (KPA 8 · Neture 1 · GP 2 · PH 1). 선행 CHECK §6
  단, GP E1(매장 관리 목록, core-ui+ux-core 혼용)은 이번에 손대지 않았다
- **NOT_IMPLEMENTED 28건** — 변동 없음. 선행 CHECK §8
- **PharmacyHub E1 매장 관리** — `NOT_IMPLEMENTED` → **`SERVICE_SPECIFIC`** 재판정
  (선행 CHECK **§8-A** 신설). 구현하지 않았다

---

## 8. 종료 조건 대비

| 조건 | 결과 |
|---|---|
| GP 대상 VIEW_DUPLICATED → 0 | ✅ 대상 12건 → 0 (전체 18 → 6, 잔여 6 은 선행 판단 필요) |
| GP service-local 중복 View 제거 | ✅ 순감 5,455 LOC · dead file 1개 삭제 |
| 공통 Table UX 채택 | ✅ 13업무 공통 모듈 채택 |
| 5서비스 mobile table 결함 해소 | ⚠ **코드 반영 완료 · 배포 후 실측 필요** (§6-2) |
| desktop regression 0 | ⚠ **정적으로는 통과**(5×typecheck·build) · **브라우저 실측 미완** |
| 미조사 0 | ✅ |
| DB/API/schema 변경 0 | ✅ |

**문서 정합**: 발견 3건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
— 선행 CHECK 정정 3건(§2-5 모바일 기전 · §8-A PH 재판정 · I1 LMS 판정)은 인라인 반영

## 9. 범위 밖 발견 (수정하지 않음)

1. **main 이 현재 red** — `CI Pipeline / Code Quality Check` 실패.
   원인은 타 세션 커밋 `d9ecc678a` 의 `pharmacy-hub-community-capability-adoption.spec.ts` 2건
   (`/forum/request` · `/forum/my-dashboard` 공개 navigation 노출 검증). 이번 변경과 무관
2. `.claude/settings.json` 허용 항목에 평문 비밀번호, `settings.local.json` 에 JWT 토큰 존재.
   두 파일 모두 git 미추적이나 `.gitignore` 명시 항목이 없어 실수 커밋 여지가 있다
3. KPA `/operator/members` 회원 1건 이름 인코딩 깨짐 (선행 CHECK 에서 이미 보고)
