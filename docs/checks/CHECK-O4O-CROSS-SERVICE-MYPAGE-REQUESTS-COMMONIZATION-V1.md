# CHECK-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1

> WO: [`docs/work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1.md`](../work-orders/WO-O4O-CROSS-SERVICE-MYPAGE-REQUESTS-COMMONIZATION-V1.md)
> 상태: **CLOSED** · 작성일: 2026-08-19

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 기준(WO 지정) | `51f5bdc9b` |
| 조사 시점 실제 origin/main | `ef5d205f2` → 작업 중 다른 세션 push 로 `d8a7ab520` |
| 구현 commit 1 | `3da990215` — 공통화 본체 (9 파일 · 375 insertions / 457 deletions) |
| 구현 commit 2 | 본 CHECK 커밋 — production browser 실측 후 잔여 2건 교정 (3 파일) |

과거 CHECK 수치는 모집단으로 재사용하지 않고 현재 main 소스에서 전수 재산출했다 (§4).

---

## 2. 5서비스 Requests 모집단

| 서비스 | Requests 화면 | route | 데이터 소스 |
|---|---|---|---|
| KPA-Society | 내 신청 내역 | `/mypage/my-requests` | `GET /kpa/mypage/my-requests` + `GET /forum/category-requests/my?serviceCode=kpa` |
| GlycoPharm | 내 신청 내역 | `/mypage/my-requests` | `GET /glycopharm/mypage/my-requests` (membership + `glycopharm_applications`) |
| GlycoPharm | 포럼 신청 내역 | `/forum/my-requests` | `GET /forum/category-requests/my?serviceCode=glycopharm` |
| GlycoPharm | 내 신청 목록 | `/apply/my-applications` | `glycopharmApi.getMyApplications()` |
| K-Cosmetics | 내 신청 내역 | `/mypage/my-requests` | 매장 입점 + LMS 수강 + **(신규 연결)** 포럼 개설 |
| Pharmacy-Hub | 가입 상태 | `/join/status` | `GET /pharmacy-hub/join/status` |
| Neture | **없음** | — | Nav·Home 어디에도 진입점 없음 → dead entry 0 |

`packages/shared-space-ui/src/forum-owner/ForumOwnerDashboard.tsx` 내장 요청 목록은
Forum owner 대시보드이지 My Page 가 아니며 이미 단일 공유 구현이므로 **OUT_OF_SCOPE** (§13·§17).
Neture `/workspace/partners/requests` 는 B2B workspace 기능으로 **OUT_OF_SCOPE**.

---

## 3. 기능 census (§5 · 14 단위)

| # | 단위 | 판정 | 근거 |
|---|---|---|---|
| 1 | 요청/신청 목록 | **FULLY_COMMON** | 목록형 4화면 전부 `MyRequestsInbox`. PH 는 단건 상태 화면 |
| 2 | 요청/신청 상세 | **FULLY_COMMON** | 공통 확장 카드 + `detailSlot` 확장 슬롯 신설. 별도 상세 route 0 |
| 3 | 상태 표시 | **FULLY_COMMON** | `RequestStatusBadge` + `overrides` (PH 포함 5서비스) |
| 4 | 신청일/처리일 표시 | **FULLY_COMMON** | 공통 View 에 신청일·처리일 행 신설 (기존엔 서비스별 자체 구현) |
| 5 | 승인/반려 결과 표시 | **FULLY_COMMON** | `reviewComment` / `revisionNote` / `resultLink` 공통 렌더 |
| 6 | 사용자 취소 | **NOT_IMPLEMENTED** | 5서비스 전부 사용자 취소 UI·API 없음 |
| 7 | 재신청 | **NOT_IMPLEMENTED** | 반려 후 재신청은 신규 신청 폼 재진입일 뿐 전용 flow 없음 |
| 8 | 보완/수정 | **NOT_IMPLEMENTED** | `revision_requested` 상태·`revisionNote` 표시는 있으나 사용자 제출 flow 없음 |
| 9 | 처리 사유/메모 | **FULLY_COMMON** | 공통 View 의 관리자 의견 블록 |
| 10 | 대상 서비스/조직 표시 | **FULLY_COMMON** | `serviceKey` / `displayTitle`(조직명) 공통 필드 |
| 11 | empty/loading/error | **FULLY_COMMON** | 공통 View 4상태 + `onRetry` |
| 12 | Home/Navigation 진입 | **FULLY_COMMON** | KPA/GP/KCos `내 신청`, PH `가입 상태`, Neture 진입점 없음(정상) |
| 13 | mobile UX | **FULLY_COMMON** | 공통 View 반응형. §13 실측표 참조 |
| 14 | 서비스별 고유 workflow | **SERVICE_SPECIFIC** | GP 신청 서비스종류/사업자번호/메모 · PH 역할별 진입점 · 포럼 결과 링크 — 전부 Extension(`detailSlot`/`resultLink`/`overrides`)으로 분리 |

```
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0
```

---

## 4. API / data shape

신규 endpoint **0건** (§17). 기존 계약만 연결·재사용했다.

| endpoint | 소비 | 비고 |
|---|---|---|
| `GET /api/v1/forum/category-requests/my?serviceCode=` | KPA · GP · KCos | 공용 계약. K-Cos 는 이번에 처음 소비 |
| `GET /api/v1/kpa/mypage/my-requests` | KPA | `kpa_approval_requests` 서버 정규화 |
| `GET /api/v1/glycopharm/mypage/my-requests` | GP | membership + `glycopharm_applications` 서버 정규화 |
| `GET /api/v1/cosmetics/stores/application/me` | KCos | |
| `GET /api/v1/lms/enrollments/me` | KCos | |
| `GET /api/v1/pharmacy-hub/join/status` | PH | `service_memberships` 단건 |

**공통 view model** `MyRequestItem` (최소 모델, §8):
`id · entityType · status · displayTitle · displayDescription? · reviewComment? · revisionNote? · reviewedAt? · resultEntityId? · resultMetadata? · submittedAt? · createdAt · updatedAt? · href? · serviceKey? · payload?`

backend DB 모델은 통합하지 않았다. 변환은 전부 frontend adapter 에서만 한다.

---

## 5. status mapping (§9)

서비스 backend enum 재설계 **0건**. label/tone 만 config 로 주입한다.

| 서비스 | 원본 enum | 표시 |
|---|---|---|
| 공통 기본값 | `draft/pending/submitted/approved/rejected/revision_requested/cancelled/revoked/in_progress/completed` | `DEFAULT_STATUS_CONFIG` |
| GP `/apply` | `glycopharm_applications.status` `submitted` | `overrides` → '검토 중'(amber). 같은 신청서를 보여주는 `/mypage/my-requests`(backend 가 `pending` 으로 내려줌)와 라벨·tone 을 맞추기 위함. `approved`/`rejected` 는 공통 기본값 사용 |
| PH | `service_memberships.status` `none/pending/active/rejected/suspended/withdrawn` | `overrides` → 신청 전/승인 대기/승인됨/반려됨/이용 정지/탈퇴. membership enum 미변경 |

**type label 교정 1건**: `kpa_approval_requests.entity_type = 'forum_member_join'` 이 공통 매핑에 없어
프로덕션에서 raw enum 문자열이 그대로 뱃지에 노출됐다 (실측 발견). `DEFAULT_TYPE_CONFIG` 에 `'포럼 가입'` 추가.

---

## 6. Before / After

**Before**
- GP `/forum/my-requests` — 285줄 자체 구현 (목록·상태·사유·결과 링크 전부 중복)
- GP `/apply/my-applications` — 266줄 자체 구현 (같은 `glycopharm_applications` 을 `/mypage/my-requests` 와 이중 렌더)
- KPA 페이지 안에 forum 요청 normalizer 30줄 로컬 중복
- 공통 View 안에 `/forum?category=` 라우트 하드코딩 (§10 위반)
- K-Cos 는 포럼 개설 신청을 제출할 수 있으나 사용자 상태 조회 화면 없음 (`fetchMyForumRequests` 소비처 0 — §18 dead helper)
- PH `/join/status` 는 상태 뱃지 없이 텍스트 제목만

**After**
- 목록형 4화면 전부 `MyRequestsInbox` 단일 구현
- normalizer 는 `@o4o/account-ui/adapters/requestNormalizers.ts` 공통 1곳
- 결과 링크는 `resultLink` 주입 (하드코딩 제거, 기존 KPA 동작은 fallback 으로 보존)
- K-Cos 포럼 신청 상태를 기존 계약으로 연결 + `포럼 신청` 필터 탭
- PH 상태 뱃지 공통화

---

## 7. 공통 Requests View / Core

`@o4o/account-ui` 확장만 사용. **신규 package 생성 0건** (Dockerfile 선별 COPY 위험 회피).
Requests 전용 Shell/Layout 도 만들지 않고 기존 `MyPageShell` / `MyPageLayout` 안에서 동작시켰다.

| 자산 | 역할 | 상태 |
|---|---|---|
| `components/MyRequestsInbox.tsx` | 공통 목록·상세·상태·필터·4상태 View | 확장 |
| `components/RequestStatusBadge.tsx` | 상태 뱃지 + overrides | 확장 |
| `components/RequestTypeBadge.tsx` | 유형 뱃지 + overrides | 확장 |
| `adapters/requestNormalizers.ts` | forum category request → `MyRequestItem` | **신규** |

신설 확장점: `resultLink(item)` · `detailSlot(item)` · `showStats`.

---

## 8. 서비스별 adapter / Extension

| 서비스 | adapter 위치 | Extension |
|---|---|---|
| KPA | 공통 `normalizeForumCategoryRequest` + backend 정규화 | `actionSection`(포럼 개설 신청), 유형 필터 6탭, forum 결과 링크 fallback |
| GP `/forum/my-requests` | 공통 normalizer | `resultLink`(생성된 포럼 보기), `showStats=false`, 자체 헤더 |
| GP `/apply/my-applications` | 로컬 `toRequestItem` (서비스 고유 필드) | `detailSlot`(신청 서비스·사업자번호·메모), `statusOverrides`, `typeOverrides`, GuideBlock, 인증 안내 |
| K-Cos | `src/api/mypage.ts` 3소스 병합 | 유형 필터 4탭 |
| PH | 없음(단건) | `RequestStatusBadge` + `overrides` 만 |
| Neture | 해당 없음 | — |

---

## 9. 목록

4화면 전부 공통 View. 정렬은 공통 `sortRequestsByCreatedAtDesc` (createdAt DESC).
K-Cos 는 `Promise.allSettled` 3소스 병합 후 공통 정렬. KPA 는 2소스 병합 + id dedupe.

---

## 10. 상세 (§14)

목록만 공통화하고 상세 중복을 남기지 않았다. 상세는 공통 확장 카드 1개 구현이며,
서비스 고유 필드는 `detailSlot` 으로 주입한다. 별도 상세 route 는 5서비스 어디에도 없다.

SERVICE_SPECIFIC 사유:
- GP 참여 신청의 `serviceTypes`(무재고 판매/샘플 판매/디지털사이니지)·사업자번호·메모는 GP 에만 존재하는 신청 항목이다.
- PH 는 목록이 아니라 membership 단건 상태이며, 승인 시 역할별 진입점을 노출한다.

---

## 11. action (§10)

| action | 상태 |
|---|---|
| 새 신청 진입 | 공통 `actionSection` 슬롯. 실제 링크·노출 조건은 서비스가 결정 |
| 결과 보기 | 공통 `resultLink` 슬롯. 라우트 하드코딩 제거 |
| 역할별 진입 | PH 자체 (`active` + roleType 조건) |
| 취소 / 재신청 / 보완제출 | 5서비스 전부 미구현 → 노출 0 |

공통 View 안에 serviceKey/role/status 조합 하드코딩 **0건**.

---

## 12. empty / loading / error

공통 View 가 loading / error(+재시도) / empty / 목록 4상태를 담당한다.
조회 실패를 "정상 0건" 으로 삼키지 않는 계약을 유지했다 — GP 는 `response.error` 를 먼저 확인한 뒤
error 상태로 넘긴다. GP `/apply` 는 401 을 오류 UI 가 아니라 로그인 안내로 분기한다 (§15).

---

## 13. desktop / mobile

desktop 1440×900 · mobile 390×844 실측.

| 화면 | horizontal overflow | status 잘림 | 날짜 잘림 | action 접근 | 상세 진입 | filter/tab |
|---|---|---|---|---|---|---|
| KPA `/mypage/my-requests` | 없음(-15px) | 없음 | 없음 | 가능 | 가능 | 전부 가능 |
| GP `/apply/my-applications` | 없음(-8px) | 없음 | 없음 | 가능 | 가능 | 해당 없음 |
| GP `/mypage/my-requests` | 없음 | 없음 | 없음 | 가능 | 가능 | 4탭 가능 |
| GP `/forum/my-requests` | 없음 | 없음 | 없음 | 가능 | 가능 | 해당 없음 |
| K-Cos `/mypage/my-requests` | 없음(-15px) | 없음 | 없음 | 가능 | 가능 | 4탭 가능 |
| PH `/join/status` | 없음(-15px) | 없음 | 없음 | 가능 | 해당 없음 | 해당 없음 |
| Neture `/mypage` | 없음(-15px) | — | — | — | — | — |

`scrollWidth > clientWidth` 인 말단 텍스트 노드 = 모든 화면 **0건**.

---

## 14. production browser (§22 · §24)

배포: `Deploy Web Services (Cloud Run)` run `32223244341` (`3da990215`) — 7 job 전부 `success`.
로그인은 `docs/local/TEST-ACCOUNTS.local.md` 기준 interactive login (PH 데모 계정 버튼 미사용).

| 서비스 | 결과 | 관측 |
|---|---|---|
| KPA `/mypage/my-requests` | PASS(교정 1) | 통계 1/1/0, 필터탭, 카드 확장 시 신청일 행 정상. **유형 뱃지에 raw `forum_member_join` 노출 → 교정** |
| GP `/apply/my-applications` | PASS(교정 1) | 참여 신청 · 테스트약국 · 2026년 5월 27일 · 상태 뱃지, detailSlot(무재고 판매/사업자번호) 정상. **`/mypage` 와 라벨 불일치 → 교정** |
| GP `/mypage/my-requests` | PASS | 통계 2/1/1, 승인됨·검토 중 2건 |
| GP `/forum/my-requests` | PASS | 200 · 0건 → 정상 empty |
| K-Cos `/mypage/my-requests` | PASS | `forum/category-requests/my?serviceCode=k-cosmetics` **200**, `포럼 신청` 탭 노출 |
| PH `/join/status` | PASS | 승인됨 뱃지 + 신청/승인 일시 + 역할별 진입 |
| Neture `/mypage` | PASS | Nav(홈/프로필/설정)·Hub(프로필/포럼/설정) 어디에도 Requests 진입 없음 → dead entry 0 |

§24 통과 기준: white screen 0 / JS exception 0 / 예기치 않은 401·403 0 / 404 0 / 5xx 0 /
dead link 0 / 잘못된 상태 라벨 **2건 발견 → 교정 후 0** / 잘못된 action 노출 0 /
mobile 기능 소실 0 / double shell 0.

관측된 401 은 전부 미로그인 상태의 `auth/me`·`auth/refresh` 로 의도된 동작이다.
### 교정 후 재검증 (run `32224640233` / `7892aaf0a` · 7 job 전부 success)

| 확인 | 결과 |
|---|---|
| KPA 유형 뱃지 | `forum_member_join` → **'포럼 가입'** 정상 표시 (raw enum 소멸) |
| KPA `포럼 가입` 필터 탭 | 노출 + 클릭 시 해당 건 유지 |
| GP `/apply/my-applications` | 테스트약국 · 2026년 5월 27일 · **'검토 중'** |
| GP `/mypage/my-requests` | 같은 건 · **'검토 중'** → 두 화면 라벨 일치 |
| mobile 390×844 (KPA · GP) | overflow 0 · 잘린 텍스트 0건 |


---

## 15. production write 여부

**production write 0건.** 취소/재신청/보완이 5서비스 전부 미구현이므로 write 검증 대상이 없었다.
기존 실제 신청 건은 조회만 했고 상태 전이를 일으키지 않았다 (§23).

---

## 16. backend / DB / schema

**backend · DB · migration · schema 변경 0건.**
신규 endpoint 0 · membership SSOT 미변경 · 승인 정책 미변경 · Identity 미변경.
`apps/api-server` 아래 파일은 읽기만 했다.

---

## 17. 잔존 followup (착수하지 않음)

| # | 내용 | 성격 |
|---|---|---|
| F1 | 사용자 취소 / 재신청 / 보완 제출 flow 자체가 5서비스 전부 부재 | 신규 기능 — 별도 WO |
| F2 | GP `/forum/my-requests` 를 **미로그인**으로 열면 401 이 error 가 아니라 empty 로 보인다. GP `ApiClient` 실패 계약은 정상이며 공유 auth-client 의 401→refresh 실패 경로에서 발생 | 공유 auth-client — 별도 WO |
| F3 | `kpa/mypage.service.ts listMyRequests` 의 `catch { return [] }` 가 쿼리 실패를 "정상 0건" 으로 삼킨다 | backend load-error 계약 — 별도 WO |
| F4 | `kpa_approval_requests.entity_type` 은 자유 문자열이라 미매핑 값이 또 나올 수 있다 (이번엔 `forum_member_join` 1건 교정) | 유형 카탈로그 정본화 — 별도 WO |
| F5 | `ForumOwnerDashboard` 내장 요청 목록과 `MyRequestsInbox` 의 장기 수렴 | OUT_OF_SCOPE — 별도 WO |
| F6 | WO §28 후보(Settings/Security · Membership · Notifications · Activity · Help) | 지시대로 미착수 |

---

## 18. MUST_FIX_BEFORE_CLOSE

프로덕션 실측에서 2건 발견했고 **본 WO 범위(§9 label config) 안에서 즉시 교정**했다.

| # | 내용 | 조치 | 파일 |
|---|---|---|---|
| M1 | KPA 유형 뱃지에 raw enum `forum_member_join` 노출 + 해당 유형 필터 탭 부재 | `DEFAULT_TYPE_CONFIG` 에 '포럼 가입' 추가, KPA 필터 탭 추가 | `packages/account-ui/src/components/RequestTypeBadge.tsx` · `services/web-kpa-society/src/pages/mypage/MyRequestsPage.tsx` |
| M2 | 같은 GP 신청서가 `/apply`('심사 중') 와 `/mypage`('검토 중') 에서 다른 라벨 | `/apply` override 를 '검토 중' 으로 정렬, approved/rejected override 제거(공통 기본값 사용) | `services/web-glycopharm/src/pages/apply/MyApplicationsPage.tsx` |

```
MUST_FIX_BEFORE_CLOSE = 0
```

---

## 19. CHECK / commit / push

정적 검증:

| 항목 | 결과 |
|---|---|
| `@o4o/account-ui` build | PASS |
| `tsc -b` × 5 서비스 (KPA · GP · KCos · Neture · PH) | PASS (0 error) |
| `npx vite build` (CI 실제 빌드 명령) GP · KPA · KCos · PH | PASS |
| backend test/typecheck | 해당 없음 (backend 미변경) |

1차 `tsc -b` 에서 GP `StoreSignageMainPage.tsx` TS6133 이 1건 있었으나 다른 세션 커밋(`3e801ec69`)에서
유입된 본 WO 무관 오류였고, CI 는 `npx vite build` 로 빌드하므로 배포를 막지 않았다.
이후 다른 세션이 `d8a7ab520` 에서 수정하여 rebase 후 소멸했다.

commit: `3da990215` (본체) + 본 CHECK 커밋 (교정 3파일 + CHECK 1파일).
staging 은 전부 path-specific 이며 `git add .` 를 쓰지 않았다.

---

## FINAL

```
미조사 = 0
VIEW_DUPLICATED = 0
CORE_ONLY = 0
2서비스 이상 중복 Requests UI 수렴 완료
서비스별 workflow Extension 분리 완료
dead request route/link = 0
desktop/mobile PASS
production browser PASS
MUST_FIX_BEFORE_CLOSE = 0
```

**MYPAGE REQUESTS TRACK = FINAL CLOSED**
