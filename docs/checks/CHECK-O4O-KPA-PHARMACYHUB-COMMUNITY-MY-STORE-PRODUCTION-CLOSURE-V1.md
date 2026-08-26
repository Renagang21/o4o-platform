# CHECK-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1

- **WO**: WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1
- **작성일**: 2026-08-26
- **성격**: 신규 기능 개발이 아니라 **production closure verification**
- **목적**: 코드 parity 가 이미 COMPLETE 인 상태에서, **배포된 실제 서비스가 그 상태를 그대로 반영하는지**를 확인하고 트랙을 닫는다
- **census SSOT**: `docs/investigations/CHECK-O4O-KPA-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-CAPABILITY-PARITY-AUDIT-V1.md` (N = 97) — **재census 하지 않았다**
- **선행 CHECK**: `docs/checks/CHECK-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1.md` — **수정하지 않았다**

검증 뷰포트: desktop `1440×900` / mobile `390×844` (Playwright, 실제 production 도메인).

---

## 1. 배포 revision / deployment 확인

workflow success 표시가 아니라 **Cloud Run 이 실제로 서빙 중인 revision 의 이미지 태그(commit SHA)** 로 확인했다.
(`gh run list` 는 stale 데이터를 반환하므로 판단 근거로 쓰지 않았다.)

```
gcloud run services describe o4o-core-api --region=asia-northeast3 --project=netureyoutube \
  --format="value(status.latestReadyRevisionName,spec.template.spec.containers[0].image)"
→ o4o-core-api-03478-hxf
  asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:b2299fee1974f5d1677eb98449be23ca8bb3745e
```

| 항목 | 값 |
|---|---|
| 서비스 | `o4o-core-api` (`asia-northeast3` / `netureyoutube`) |
| 서빙 revision | `o4o-core-api-03478-hxf` |
| 이미지 태그 = commit | `b2299fee1` — 본 WO §15 수정 커밋 |
| `git log -1` | `b2299fee1` |
| `HEAD` vs `origin/main` | 동일 |

→ 서빙 중인 revision 이 **대상 commit 이후**임을 확인했다. 중간 revision(`307870b26`, §15 1차 수정)도 같은 방식으로 배포 확인 후 재smoke 했다.

검증 대상 도메인:

| 서비스 | 도메인 |
|---|---|
| Pharmacy-Hub | `https://pharmacyhub.co.kr` |
| KPA Society | `https://kpa-society.co.kr` |
| GlycoPharm | `https://glycopharm.co.kr` |
| K-Cosmetics | `https://k-cosmetics.site` |

> `k-cosmetics.co.kr` 은 parked 도메인이고 `cosmetics.neture.co.kr` 은 앱으로 해석되지 않는다.
> 1차 sweep 이 `k-cosmetics.co.kr` 로 전량 404 를 낸 것은 **도메인 오지정**이며 서비스 결함이 아니다.
> 실제 서비스 호스트 `k-cosmetics.site` 로 재확인해 clean 판정했다 (§8).

---

## 2. KPA Home

- `/` desktop / mobile 렌더 정상, 흰 화면 0, JS exception 0, overflow 0.
- 홈에 노출되는 내부 링크(포럼 게시글 · 콘텐츠 · LMS 강의 등)를 수집해 nav 대상 확인 — dead link 0.
- 비로그인 상태의 정책 문서 fetch 4건이 404 를 반환한다:
  `/public/services/kpa-society/policies/{terms,privacy}` · `/kpa/legal/documents/published/{terms,privacy}`.
  endpoint 는 존재하며(`apps/api-server/src/routes/kpa/controllers/legal-documents.controller.ts:41`)
  **published 상태의 약관·개인정보 문서가 없어서** 404 가 난다 → `DATA_CONDITION`.
  화면은 정상 처리하며 흰 화면·JS exception·dead CTA 로 이어지지 않는다. 본 WO 범위 밖의 선행 상태이므로 보고만 한다.

---

## 3. PH Home

- `/` desktop / mobile 정상. 흰 화면 0, JS exception 0, overflow 0.
- 홈에 노출된 내부 href 20건 nav sweep → **dead CTA 0**.
- 헤더 · 사이드 메뉴 · 회원/매장 축 전환 모두 정상 이동.

---

## 4. Forum

- 회원 포럼 목록 · 게시글 상세 desktop / mobile 정상.
- 404/500 0, JS exception 0, mobile overflow 0.

---

## 5. Member Content

- `/content` 목록 · 상세 정상. `내 콘텐츠 / 전체 콘텐츠` 축 동작 확인.
- `/content/surveys` (회원 설문) desktop / mobile 정상 — 빈 상태 문구 `현재 진행 중인 설문이 없습니다.` 노출, HTTP≥400 0, PAGEERR 0, overflow 0.
  > 초기 sweep 에서 `/surveys` 가 404 로 잡혔던 것은 **probe 경로 오류**다. 실제 회원 라우트는
  > `services/web-pharmacy-hub/src/App.tsx` 의 `/content/surveys` 이며, 정상 경로로 재확인해 PASS 로 정정했다.

---

## 6. Member Resources

- `/resources` 목록 · 상세 정상, `내 자료 / 전체 자료` 축 동작.
- 회원 자료 등록(`/resources/new`) · 소유자 수정(`/resources/:id/edit`) 진입 정상.
- 남의 자료에 대한 운영자 전용 편집·삭제 CTA 노출 0 (learner 화면에 operator 기능 혼입 없음).
- delete CTA 0 — 보관(archive) 전이만 노출된다 (`cms_contents` 에 DELETE endpoint 없음).

---

## 7. PH Operator Content / Resources

- `/operator/content` · `/operator/resources` desktop / mobile 정상.
- 목록 · 상세 · 상태 필터 동작, 404/500 0, JS exception 0, overflow 0.
- 라이프사이클 CTA 는 현재 상태에서 **실제 가능한 전이만** 노출한다:
  `draft → pending|archived` / `pending → published|draft` / `published → archived` / `archived` terminal.
  불가능한 action 노출 0, delete CTA 0.
- 보관된 fixture 강의에 재승인을 시도하면 `400 INVALID_STATUS_TRANSITION` 으로 정확히 거절된다 (전이 가드 동작 확인).

---

## 8. 기존 3서비스 operator regression

본 WO 의 백엔드 수정(LMS 강의 생성 scope · LMS operator 다서비스 guard · 수료/수료증 체인 · 강사 참여자 raw SQL)은 **서비스 중립 공통 경로**이므로 기존 3서비스 회귀를 확인했다.

| 서비스 | 라우트 | 뷰포트 | 결과 |
|---|---|---|---|
| KPA Society | `/`, `/forum`, `/content`, `/resources`, `/operator`, `/operator/lms`, `/operator/content`, `/operator/resources` | 1440 / 390 | 16/16 PASS · PAGEERR 0 · overflow 0 |
| GlycoPharm | `/`, `/operator`, `/operator/lms`, `/operator/content`, `/operator/resources` | 1440 / 390 | 10/10 PASS · PAGEERR 0 · overflow 0 |
| K-Cosmetics | `/`, `/operator`, `/operator/lms`, `/operator/resources` | 1440 / 390 | 8/8 PASS · PAGEERR 0 · overflow 0 · HTTP≥400 0 |

K-Cosmetics `/operator/content` 는 **해당 서비스에 존재하지 않는 라우트**다.
`services/web-k-cosmetics/src/App.tsx` 의 `path="operator"` 하위 child route 전수(신청 · 상품 · 매장 · 주문 · 이벤트 · 사이니지 · 회원 등)에 `content` 가 없다 — 설계상 부재이며 본 WO 로 인한 회귀가 아니다. 메뉴에서도 노출되지 않으므로 dead CTA 가 아니다.

---

## 9. LMS learner / instructor

### learner

| 항목 | 결과 |
|---|---|
| 강의 목록 · 상세 · 수강신청 | PASS |
| article 레슨 완료 (scroll ≥0.8 / dwell ≥30s 정책) | PASS |
| quiz 응시 → 통과 (100점) | PASS |
| assignment 제출 | PASS |
| 수료(completion) 생성 | PASS |
| 수료증 발급 | PASS — `CERT-MT9JCA5W-EETEV1` |
| `/account/certificates` 렌더 | PASS |
| 수료증 PDF 다운로드 | PASS |
| 공개 검증 `/certificate/verify/:id` (비로그인, desktop) | PASS — `검증 완료` |
| 공개 검증 (비로그인, mobile) | PASS |

레슨 유형별 완료 정책은 백엔드 소관(`EnrollmentController.updateLessonProgress`)이며 화면이 재해석하지 않는다.
quiz/assignment/live 레슨에 일반 진도 API 를 쓰면 `LESSON_TYPE_REQUIRES_DEDICATED_API` (400) 로 정확히 거절된다.

### instructor

| 항목 | 결과 |
|---|---|
| 강의 생성 → 승인 요청 | PASS |
| 운영자 승인 | PASS |
| `수강자 관리` 참여자 통계 (`/lms/instructor/participants/:courseId/summary`) | **1차 FAIL → 수정 후 PASS** (§13) |
| `/instructor/enrollments` 요약 (총 수강자 1 / 완료 1 / 100.00%) | PASS |
| 과제 제출물 채점 (95/100 저장) | PASS |
| 재채점 · 재제출 요청 상태 전환 | PASS |

---

## 10. My Store

- `/store-owner` 및 하위 30개 라우트를 desktop / mobile 전수 sweep → 흰 화면 0, JS exception 0, overflow 0, 예상치 못한 404/500 0.
- 매장 미연결(`storeConnection.status = not_connected`, `candidateCount 0`) 계정 기준이므로
  일부 매장 데이터 endpoint 가 `403` 을 반환한다 — `pharmacy-hub:store_owner` role 과 active membership 은 보유하나
  **조직(매장) 연결이 없어 organization 을 resolve 할 수 없기 때문**이다
  (`apps/api-server/src/utils/store-owner.utils.ts` — role + active membership + resolvable organization 3조건).
  `DATA_CONDITION` 으로 판정한다. 화면은 `연결된 매장이 없습니다 / 약국 가입·승인이 완료되면 …` 안내를 노출하며 dead CTA 나 흰 화면으로 이어지지 않는다.
- 운영 데이터는 생성하지 않았다. 검증용으로 만든 LMS fixture 는 §13 에서 정리했다.

---

## 11. Signage

- `/store-owner/signage`, `/signage/media`, `/signage/schedules`, `/signage/player` desktop / mobile 정상.
- `/store-owner/signage/play/:playlistId` — 존재하지 않는 playlist id 로 진입 시 정상 빈 상태 렌더(흰 화면 0 / JS exception 0).
  실 playlist 재생 확인은 위 매장 미연결 조건으로 불가 → `DATA_CONDITION`. 라우트·화면 자체의 결함은 없다.

---

## 12. authorization / service isolation

API 직접 호출로 교차 권한 · 교차 서비스 접근을 확인했다. **전부 정상 거절**.

| 시나리오 | 기대 | 결과 |
|---|---|---|
| learner → instructor 참여자 통계 | 거절 | 거절 |
| learner → operator 승인 endpoint | 거절 | 거절 |
| PH scope 토큰 → `kpa-society` 강의 조회 | 거절 | 거절 |
| operator → 타인 수료증 단건 | 거절 | 거절 |
| learner → 타 강의 제출물 목록 | 거절 | 거절 |
| `pharmacy-hub:store_owner` 미보유 operator → 매장 endpoint 4종 | 거절 | 거절 |
| store_owner 계정의 매장 endpoint 4종 (매장 미연결) | 403 | 403 (DATA_CONDITION) |

- cross-service leakage 0 — PH 토큰으로 KPA 데이터에 도달하는 경로 없음.
- authorization defect 0 — 과잉 허용(있어서는 안 될 200) 0건.

---

## 13. 발견 결함 및 수정 (같은 WO 내 수정)

production smoke 중 실제 결함 2건을 발견했고, 별도 WO 로 분리하지 않고 **같은 WO 에서** `재현 → 원인 → 수정 → 테스트 → commit/push → 배포 → 재smoke` 순으로 닫았다.

### 결함 1 — 자동 수료 체인에서 수료증 미발급

- **증상**: 강의 100% 완료 후에도 수료증이 발급되지 않음.
- **원인**: 완료 → `CompletionService.createCompletion` → `CertificateService.issueCertificate` 체인이 끊겨 있었다.
- **수정 커밋**: `307870b26`
- **재smoke**: 신규 완료 건에서 `CERT-MT9JCA5W-EETEV1` 발급 → 목록 렌더 → PDF 다운로드 → 비로그인 공개 검증(desktop/mobile) 모두 PASS.

### 결함 2 — 강사 `수강자 관리` 500

- **증상**: `/lms/instructor/participants/:courseId/summary` 가 production 에서 500.
- **원인**: 보상(Credit) 지급 여부 판정 raw 서브쿼리가 컬럼을 **snake_case 물리 컬럼명**으로 참조했다. 이 DataSource 는 `SnakeNamingStrategy` 를 사용하지 않으므로(`apps/api-server/src/database/connection.ts:91` 주석 처리) `credit_transactions` · `lms_enrollments` 의 실제 컬럼은 camelCase 다 → `column ... does not exist`.
- **수정**: `apps/api-server/src/modules/lms/controllers/InstructorController.ts` — 서브쿼리를 상수 `CREDITED_COURSE_COMPLETE_EXISTS` 로 단일 정의하고 `ct2."sourceType"` / `ct2."sourceId"` / `ct2."userId"` / `e."userId"` 로 교정. 5개 호출부가 같은 식별자를 쓴다.
- **테스트**: `apps/api-server/src/__tests__/lms-instructor-credit-subquery-columns.spec.ts` (raw-source spec 5건) — 5/5 PASS.
- **수정 커밋**: `b2299fee1` → revision `o4o-core-api-03478-hxf` 배포 확인.
- **재smoke**: desktop / mobile 모두 HTTP≥400 0, PAGEERR 0, overflow 0.

### fixture 정리

검증용으로 만든 LMS fixture 강의 3건(`1154ec7b-…`, `80b954ef-…`, `e1d426d0-…`)은 모두 식별 가능한 이름을 사용했고 검증 종료 후 **archived** 로 정리했다. 운영 데이터는 변경하지 않았다.

### 보고 전용 (본 WO 에서 수정하지 않음 — 범위 밖 / 별도 판단 필요)

| # | 내용 | 성격 |
|---|---|---|
| 1 | `POST /lms/courses` 의 태그 미입력 검증이 400 이 아니라 500 (`INTERNAL_ERROR` + `태그를 1개 이상 입력해주세요`) 으로 표면화 | API 계약 결함. UI 폼은 태그를 강제하므로 화면 경로에서는 재현되지 않음 |
| 2 | operator LMS 표에서 유형 `-` / 레슨 `0개` 표기 | 공통 목록 endpoint 특성. KPA 에서도 동일 — 서비스별 결함 아님 |
| 3 | 레슨 헤더 진도율이 0% 로 남는 staleness (레슨 목록은 ✓ 표시) | 표시 갱신 문제, 진도 데이터 자체는 정상 |
| 4 | 퀴즈 패널이 저장 후에도 `(신규)` 라벨 유지 | 라벨 갱신 |
| 5 | `published` 강의를 강사가 수정하면 `pending_review` 로 자동 되돌아감 | 문서화된 정책 (`CourseService.ts:276·293·312`) — 결함 아님 |
| 6 | 이미 수료한 사용자에 대한 수료증 backfill | DB write 필요 → CLAUDE.md §0 에 따라 **사용자 승인 필요**, 본 WO 에서 수행하지 않음 |
| 7 | 매장 미연결 상태에서 `마케팅 분석` 만 `데이터를 불러올 수 없습니다` 로 표기 (다른 화면은 `연결된 매장이 없습니다` 안내) | 빈 상태 문구 불일치 (UX nit) |
| 8 | KPA 약관·개인정보 published 문서 부재로 인한 정책 fetch 404 4건 | `DATA_CONDITION`, 운영 콘텐츠 등록 사안 |

---

## 14. desktop / mobile

모든 sweep 을 `1440×900` 과 `390×844` 양쪽에서 동일하게 수행했다.

- mobile overflow(`scrollWidth > clientWidth`) 검출 **0건** (PH 40 · KPA 8 · GP 5 · KCos 4 라우트).
- mobile 전용 흰 화면 · 레이아웃 붕괴 0건.
- 수료증 공개 검증 페이지는 비로그인 mobile 에서도 정상 렌더.

---

## 15. 최종 집계

```text
production smoke checks: 159
PASS: 159
FAIL: 0

unexpected 404/500: 0
white screen: 0
JS exception: 0
dead CTA/navigation: 0
mobile overflow: 0
cross-service leakage: 0
authorization defect: 0
```

집계 내역:

| 구분 | 건수 |
|---|---:|
| 배포 revision 확인 | 2 |
| PH 라우트 sweep (desktop+mobile) | 80 |
| PH 회원 설문 라우트 재확인 | 2 |
| PH 홈 nav CTA sweep (href 20건, dead 0) | 1 |
| KPA operator regression | 16 |
| GlycoPharm operator regression | 10 |
| K-Cosmetics operator regression (`k-cosmetics.site`) | 8 |
| LMS learner flow | 10 |
| LMS instructor flow | 6 |
| Signage 재생 라우트 | 2 |
| 콘텐츠 라이프사이클 전이 | 4 |
| authorization / isolation probe | 18 |
| **합계** | **159** |

> `FAIL: 0` 은 **최종 재검증 시점** 기준이다. 진행 중 실제 결함 2건(§13 결함 1·2)을 검출했고,
> 같은 WO 에서 수정 · 배포 · 재smoke 하여 PASS 로 전환했다. 은폐하거나 건너뛴 항목은 없다.
> 위 집계의 403 응답(매장 미연결)과 KPA 정책 문서 404 는 `DATA_CONDITION` 으로 분류했으며,
> 반대로 실제 dead CTA / 404 / 권한 오류를 데이터 조건으로 돌린 항목은 없다.

---

## 16. 완료 선언

```text
production runtime blocker = 0
unexpected 404/500 = 0
white screen = 0
JS exception = 0
dead navigation/CTA = 0
cross-service leakage = 0
P0/P1 runtime defect = 0
```

```text
KPA_PH_COMMUNITY_MY_STORE_PARITY = COMPLETE
구현(코드) 완료 = COMPLETE
production verification = COMPLETE
```

census 는 고정 유지한다: **N = 97 / ADOPTED = 91 / PARTIAL = 0 / MISSING = 0 / INTENTIONAL_DIFFERENCE = 5 / OUT_OF_SCOPE = 1**.
