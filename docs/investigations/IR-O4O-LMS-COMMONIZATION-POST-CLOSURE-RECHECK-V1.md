# IR-O4O-LMS-COMMONIZATION-POST-CLOSURE-RECHECK-V1

> **유형**: closure 이후 재점검 Investigation (read-only) — 코드/backend/DB/package/lock/Dockerfile **무변경**. 문서 1개만 생성.
> **목적**: 종료 고정된 LMS 공통화 Cycle 1(`CHECK-...-CLOSURE-V2`) 판정이 현재 repository 기준으로도 유효한지 재검증. "다시 공통화"가 아니라 **종료 판정 유지 여부 안전 점검**.
> **결론(요약)**: **STILL CLOSED** — 4서비스 `tsc -b` 0/0/0/0 유지, GP reusablePolicy fix 유지, 공통 manager 3서비스 적용 유지, Neture LMS 흔적 0, KPA-only advanced KPA 단독 유지. closure 이후 새 drift·회귀·혼입 없음.
> **작성일**: 2026-06-15 · HEAD `dd28a492f`(main 동기화)

---

## 1. 목적
이미 종료 고정된 LMS/강의 공통화 Cycle 1 상태가 현재 코드 기준으로도 유효한지 재점검한다. read-only — 코드 무변경, 문서만 생성. 새 공통화 시작이 아니라 종료 판정 유지 확인.

## 2. 선행 closure 요약
- `IR-O4O-LMS-COMMONIZATION-QUALITY-AUDIT-V1`: PASS with Follow-up(구조 완료, GP TS2322 1건이 차단 요인).
- `WO-O4O-LMS-GP-REUSABLE-POLICY-TYPE-ALIGNMENT-V1`(`2e7cb1fa8`): GP 로컬 mapper 로 차단 요인 해소.
- `CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V2`(`36fafa48f`): **CLOSED**(3서비스 green, KPA-only KEEP, Neture 제외, reward/AI 경계 정합).
- (참조) `CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1`: 전체 공통화 CLOSED 의 일부로 LMS 포함.

## 3. 조사 시점
- HEAD: `dd28a492f`(main, origin 동기화). working tree 의 타 세션 WIP(neture supplier migration/service, AGENTS.md 등) 미접촉.

## 4. 4서비스 typecheck 결과 (직접 재실측, HEAD `dd28a492f`)
| 서비스 | `tsc -b` | closure V2 대비 |
|--------|:--------:|:--------:|
| web-kpa-society | ✅ **0** | 동일(유지) |
| web-glycopharm | ✅ **0** | 동일(유지) |
| web-k-cosmetics | ✅ **0** | 동일(유지) |
| web-neture | ✅ **0** | 동일(유지) |
> 로컬 TS(`node services/web-<svc>/node_modules/typescript/bin/tsc -b`)로 재실행. **전부 0 — closure V2 의 green 상태 유지.**

## 5. 핵심 질문 12개 재확인
| # | 질문 | 결과 |
|---|------|------|
| 1 | KPA/GP/KCos typecheck 0? | ✅ 0/0/0 (+Neture 0) |
| 2 | Neture LMS import/route/menu 새로 생겼나? | ✅ 없음(`rg lms-ui/LmsHubTemplate/… services/web-neture` = 0) |
| 3 | `LmsHubTemplate` 적용 유지? | ✅ 3서비스 허브 thin wrapper 유지 |
| 4 | `OperatorLmsCoursesManager` 3서비스 thin 유지? | ✅ 소비 서비스 3개 확인 |
| 5 | `InstructorCoursesManager`/`FormShell`/`LessonListManager` 유지? | ✅ `InstructorCoursesManager` 3서비스 소비. KPA/GP form shell+lesson manager 유지 |
| 6 | GP reusablePolicy fix 유지? | ✅ `toGpReusablePolicy`(L38) + 적용(L383) 잔존 |
| 7 | KCos 강사 편집기 부재 의도적? | ✅ Phase 1-B(read-only) 유지 — InstructorCourseEditPage 부재 |
| 8 | LessonPlayerShell dormant=비차단? | ✅ export 보유·미소비, closure 비차단(변동 없음) |
| 9 | KPA quiz/assignment/grading/CourseStructureAi KEEP? | ✅ KPA 단독(GP/KCos import 0 — GP 매치는 주석뿐) |
| 10 | reward/payment/AI provider 혼입? | ✅ 없음(lms-ui purity 유지, 신규 import 0) |
| 11 | 새 copy/empty-state drift? | ✅ closure V2 대비 신규 drift 없음(기존 B 항목 동일) |
| 12 | CLOSURE-V2 CLOSED 판정 유지 가능? | ✅ 유지 가능 |

## 6. 영역별 재점검

### 6.1 사용자 강의 영역 — A.STILL CLOSED
- 허브: `LmsHubTemplate`(@o4o/shared-space-ui) 3서비스 thin wrapper 유지. 강의 카드/목록·진행률(`CourseProgressBar`)·레슨 목록(`LessonList`)·공개범위 badge 공유 유지.
- 결제/유료 문구: `NoPaymentNotice` 공통(O4O 강의 결제 미제공) 유지. reward 완료 정책 분리(고정 크레딧 문구 미노출) 유지.

### 6.2 운영자 강의 관리 — A.STILL CLOSED
- `OperatorLmsCoursesManager`(@o4o/operator-core-ui) **3서비스 소비 확인**. thin wrapper(27L) + api 어댑터/`detailLinkLabel` 차이만. 승인/관리 flow 유지.

### 6.3 강사 영역 — A.STILL CLOSED
- `InstructorCoursesManager` **3서비스 소비**(KCos read-only Phase 1-B). KPA/GP `InstructorCourseFormShell`+`InstructorLessonListManager`(renderEditor) 유지.
- **GP reusablePolicy fix 유지**: 공통 shell `CourseFormReusablePolicy`('organization' 포함) → GP `CourseReusablePolicy`로 narrow 하는 `toGpReusablePolicy` 잔존. 공통 shell 계약 무변경.
- LessonModal render-prop 경계 유지(편집 UI=서비스 소유).

### 6.4 KPA-only advanced — C.INTENTIONAL (KEEP 유지)
- QuizBuilder·AssignmentEditor·CourseStructureAiModal·LessonSubmissionsPage(grading) = **KPA 단독**. GP/KCos 실제 import 0(GP `InstructorCourseEditPage` 매치는 line 9 JSDoc 주석 "CourseStructureAiModal 제외" 뿐). 공통화 대상으로 잘못 확장되지 않음.

### 6.5 제외/경계 — 유지
- **Neture LMS 제외**: `services/web-neture` 내 lms-ui/LmsHubTemplate/Instructor*/Operator LMS/CourseStructureAi/LessonPlayer **0건**.
- **reward/payment/AI provider 미혼입**: lms-ui purity 유지. CourseStructureAi=Gemini 고정(course-structure route, EditingSurface 밖) — Qwen 트랙과 무관(`CHECK-...-QWEN-...-SMOKE-V1` 정합).

## 7. 분류 결과
| 영역 | 분류 |
|------|------|
| 사용자 허브/운영자/강사 manager 공통화 | **A.STILL CLOSED** |
| GP reusablePolicy fix | **A.STILL CLOSED**(유지) |
| copy/empty-state(reward/감사/NoPaymentNotice 하드카피) | **B.MINOR DRIFT**(closure V2 동일, 신규 없음) |
| dormant `LessonPlayerShell` + 상세/플레이어 thick 병렬 | **B/C**(비차단, 변동 없음) |
| KPA-only advanced | **C.INTENTIONAL**(KEEP) |
| KCos 강사 편집기 부재 | **C.INTENTIONAL**(Phase 1-B) |
| Neture 제외 | **C.INTENTIONAL** |
| D.NEEDS TARGETED WO | **없음**(typecheck 실패·회귀·혼입·drift 0) |
| E.HOLD | 해당 없음(타 세션 WIP 는 LMS 무관·미접촉, 빌드 green) |

## 8. 새 drift 여부
- closure V2(`36fafa48f`) → 현재(`dd28a492f`) 사이 LMS 공통화 관련 **신규 회귀·drift·혼입 없음**. typecheck green 유지, 공통 manager 적용 유지, 제외 경계 유지.
- working tree 의 타 세션 WIP(neture supplier 온보딩 migration/service)는 LMS 와 무관하며 본 IR 미접촉, 빌드 green 에 영향 없음.

## 9. 후속 WO 필요 여부
- **즉시 필요(D): 없음.** closure V2 판정 유지.
- 후순위(B/C/E)는 closure V2 와 동일하게 제품 요구/운영 판단 시에만.

## 10. 최종 판정

```
판정: STILL CLOSED

- 4서비스 typecheck 0/0/0/0 (재실측) ✅
- GP reusablePolicy fix 유지 ✅
- 공통 manager(Operator/Instructor) 3서비스 적용 유지 ✅
- Neture LMS 흔적 0 ✅
- KPA-only advanced KPA 단독 유지(KEEP) ✅
- reward/payment/AI provider 미혼입 ✅
- closure 이후 신규 drift/회귀 0 ✅
- D.NEEDS TARGETED WO 없음

→ CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V2 의 CLOSED 판정은 현재도 유효.
```

**요지**: LMS 공통화 Cycle 1 closure 는 **현재도 닫힌 상태(STILL CLOSED)**. 강의 공통화는 더 이상 건드릴 필요가 없으며, 추가 공통화 WO 불요. 남은 항목(copy 정리·LessonPlayerShell dormant·KCos editor·quiz/assignment)은 모두 closure 비차단이며 실제 제품 요구 시에만 연다.

## 11. 후속 작업 후보 (필요할 때만)
1. `CHECK-O4O-LMS-COMMONIZATION-CYCLE1-CLOSURE-V3` — closure 를 다시 고정할 운영상 필요가 생길 때만(현재는 V2 유효로 불요).
2. `WO-O4O-LMS-COPY-AND-EMPTY-STATE-ALIGNMENT-V1` — copy/empty-state drift 가 실제 확인될 때만.
3. `IR-O4O-LMS-LESSON-PLAYER-COMMONIZATION-SCOPE-V1` — `LessonPlayerShell` dormant 해소가 제품 요구가 될 때만.
4. `IR-O4O-LMS-KCOS-INSTRUCTOR-EDITOR-PRODUCT-SCOPE-V1` — KCos 강사 편집기 요구가 생긴 경우.
5. `KEEP-O4O-LMS-KPA-ADVANCED-FEATURES-AS-REFERENCE-V1` — KPA advanced 를 별도 KEEP 문서로 고정할 필요가 있을 때.

---

*Date: 2026-06-15 · read-only post-closure recheck · 코드 무변경 · 4서비스 tsc -b 0/0/0/0 · GP fix 유지 · 공통 manager 3서비스 적용 유지 · Neture LMS 흔적 0 · KPA-only KEEP 유지 · 신규 drift 0 → STILL CLOSED(CLOSURE-V2 유효).*
