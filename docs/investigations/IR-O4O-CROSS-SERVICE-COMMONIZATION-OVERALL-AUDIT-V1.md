# IR-O4O-CROSS-SERVICE-COMMONIZATION-OVERALL-AUDIT-V1

> **유형**: 종합 점검 Investigation (read-only) — 코드/backend/DB/package/lock/Dockerfile **무변경**. 문서 1개만 생성.
> **목적**: O4O Platform(KPA Society / GlycoPharm / K-Cosmetics / Neture) 전체 cross-service 공통화 상태를 한 번에 점검 — 이미 닫힌 축과 남은 축을 구분(무조건 더 공통화 아님).
> **결론(요약)**: **CLOSED with MINOR FOLLOW-UP** — 주요 공통화 축(LMS·AI 편집·내 매장 실행·콘텐츠/자료실/제작자료·운영자 콘솔·법정정보·가이드·아이콘/사이드바·Contact·Order status·Forum·Mypage)이 closure/CHECK 문서 + **4서비스 `tsc -b` 0**으로 닫힘. 공통 package 레이어링 일관, Neture 제외/포함 posture 정확. 남은 것은 **제품 요구 기반(C)** + **경미 정리(B: copy/empty-state, operator-core legacy 정리, dormant primitive)** + **별도 작업선(E: Qwen live smoke·Signage/admin builder AI)**. **즉시 NEEDS-WO(빌드 실패·미적용 shell·UX drift) 없음.**
> **작성일**: 2026-06-15 · HEAD `36fafa48f`(main 동기화)

---

## 1. 목적 / 조사 기준
여러 축에서 진행한 공통화가 전체적으로 닫혔는지 read-only 로 종합 점검한다. 분류: **A.CLOSED / B.FUNCTIONAL+ / C.INTENTIONAL DIFFERENCE / D.NEEDS WO / E.HOLD**. 코드 무변경, 문서 1개만 생성.

## 2. 빌드 헬스 (직접 실측, HEAD `36fafa48f`)
| 서비스 | `tsc -b` | 비고 |
|--------|:--------:|------|
| web-kpa-society | ✅ **0** | reference |
| web-glycopharm | ✅ **0** | LMS reusablePolicy 해소 후 green |
| web-k-cosmetics | ✅ **0** | — |
| web-neture | ✅ **0** | platform/admin/supplier |
> **4서비스 전부 green** — 직전 `IR-O4O-WORKSPACE-INTERRUPTED-BUILD-STATE-AUDIT-V1`의 in-flight 빌드 실패(lms-ui 와이어링 L1·product-applications phantom P1·reward-policy L2) **전부 해소**. 전체 closure 의 핵심 신호.

## 3. 전체 공통화 요약
O4O 공통화는 **다수 축에서 closure/CHECK 문서로 닫힌 성숙 단계**다. 공통 package(@o4o/shared-space-ui·operator-core-ui·operator-ux-core·lms-ui·content-editor·store-ui-core·store-asset-policy-core·ui·types)가 3-tier 로 레이어링되어 서비스는 thin wrapper + config/api 어댑터만 주입한다. Neture 는 platform/admin/supplier 성격에 맞게 operator 콘솔·법정·가이드·콘텐츠 축에 참여하고 member-service 전용 축(LMS·store 실행)은 정확히 제외.

## 4. 축별 상태 매트릭스

| # | 축 | 공통 자산 | 근거 문서 | 분류 |
|---|----|----------|----------|------|
| 1 | LMS 공통화 Cycle 1 | LmsHubTemplate·OperatorLmsCoursesManager·Instructor*Manager·lms-ui | `CHECK-...-LMS-COMMONIZATION-CYCLE1-CLOSURE-V2` · `IR-...-LMS-COMMONIZATION-QUALITY-AUDIT-V1` | **A** |
| 2 | AI 편집 공통화 Cycle 1 | AiContentModal·EditingPreset·resolveEditingProvider | `CHECK-...-AI-EDITING-COMMONIZATION-CYCLE1-CLOSURE-V1` | **A** |
| 3 | Qwen 저위험 surface | provider×surface guardrail(정적 PASS) | `CHECK-...-AI-QWEN-LOW-RISK-SURFACE-SMOKE-V1` | **E**(live deferred) |
| 4 | 내 매장/내 약국 실행 | store-ui-core(StoreDashboardLayout·StoreSidebar·local-products·buyer-orders·event-offers·SupplyCatalogHub) | `CHECK-...-MY-STORE-EXECUTION-CROSSSERVICE-COMMONIZATION-V2/V3` · `...-PHASE5-KPA-BASELINE` | **A** |
| 5 | 콘텐츠 작성/자료실/제작자료 | content-editor·store-asset-policy-core·OperatorResources/ContentManager | `CHECK-...-OPERATOR-RESOURCES-CANONICAL-COMMONIZATION` · `IR-...-OPERATOR-CONTENT-MANAGER` · `IR-...-STORE-ASSET-DERIVATION` | **A** |
| 6 | POP/QR/블로그/제품설명 | EditingPreset(surface) + 제작자료 라우터 | AI editing closure §6 · production utils | **A** |
| 7 | 운영자 공통 콘솔 | operator-core-ui(members/forum/stores/guide/legal/contact 모듈) + operator-ux-core(Layout/Sidebar/blocks) | `CHECK-...-OPERATOR-MEMBERS/FORUM-CONSOLE/RESOURCES-COMMONIZATION` · `IR-...-OPERATOR-*-AUDIT` | **A** |
| 8 | 법정정보/약관 설정 | ServiceLegalSettingsManager·PublicLegalFooterInfo·dynamic footer | `CHECK-...-SERVICE-LEGAL-POLICY-SETTINGS-(BACKEND/UI)` · `...-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER` · `...-PUBLIC-FOOTER-LEGAL-GUARD` | **A** |
| 9 | 서비스 가이드/public guide | shared-space-ui guide-client·GuideEditableSection·GuideBackLink·GuideContentsManager | sectionKey 정책(CLAUDE.md) · `IR-...-GUIDE-HERO-SECTION-SPACING` | **A/B** |
| 10 | 아이콘/사이드바/UI 정렬 | OperatorDomainIASidebar·AxisIcon·Design Core(@o4o/ui) | `CHECK-...-OPERATOR-DASHBOARD-AXIS-ICON-LIVE-SMOKE` · `CHECK-...-DOMAIN-IA-SIDEBAR-HEADING-ICON-LIVE-SMOKE` | **A** |
| 11 | Contact/문의 관리 | operator-core-ui contact 모듈·service-contact-settings·privacy consent | `CHECK-...-CONTACT-(AUTO-REPLY/DELIVERY/INQUIRY-ADMIN/NETURE-KPA-ADAPTER)` | **A** |
| 12 | Store order/checkout status label | buyerCheckoutStatus·BuyerOrderStatusBadge | `CHECK-...-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT` | **A** |
| 13 | Forum 사용자/작성/상세 | forum-core·shared-space-ui ForumHubTemplate·공통 write/detail | `CHECK-...-FORUM-(USER-PAGE/WRITE-EDIT-FORM/DETAIL-COMMENT)-COMMONIZATION` | **A** |
| 14 | Mypage/회원관리 | mypage 공통·CommonEditUserModal·OperatorMembersConsole | `CHECK-...-MYPAGE-CROSSSERVICE-COMMONIZATION-COMPLETION` · `IR-...-MEMBER-MANAGEMENT-COMMONIZATION` | **A** |

## 5. 서비스별 상태 매트릭스

| 축 | KPA | GlycoPharm | K-Cosmetics | Neture |
|----|:---:|:---:|:---:|:---:|
| LMS 사용자/운영자/강사 | ✅ reference | ✅ thin | ✅ thin(강사 read-only Phase 1-B) | — 제외(정확) |
| 내 매장 실행 | ✅ baseline | ✅ thin wrapper | ✅ thin wrapper | — 제외(정확) |
| 콘텐츠/자료실/제작자료 | ✅ | ✅ | ✅ | ✅(supplier B2B content) |
| 운영자 콘솔 | ✅ | ✅ | ✅ | ✅(admin/supplier) |
| 법정정보/약관 | ✅ | ✅ rollout | ✅ rollout | ✅ |
| 가이드/아이콘/사이드바 | ✅ | ✅ | ✅ | ✅ |
| Contact/문의 | ✅ | ✅ | ✅ | ✅(operator notification) |
| Forum | ✅ reference | ✅ | ✅ | ✅(write form) |
| Mypage/회원 | ✅ | ✅ | ✅ | ✅(admin members) |
> 서비스 wrapper 는 대부분 thin(27~92L) + config/api 어댑터. 예외=강의 상세/레슨 플레이어(서비스별 thick, §7-B/D).

## 6. 공통 package 역할표 (레이어링)
| Tier | 패키지 | 역할 |
|------|--------|------|
| 1 foundation | `@o4o/types` | 플랫폼 canonical 타입 SSOT |
| 1 foundation | `@o4o/ui` | Design Core v1.0 — 모든 신규 화면 필수 primitive |
| 1 foundation | `@o4o/content-editor` | RichTextEditor·ContentRenderer·AI assist |
| 2 UX primitive | `@o4o/operator-ux-core` | 5-Block Operator 대시보드 Layout/Sidebar/List/Form/blocks |
| 2 UX primitive | `@o4o/shared-space-ui` | home/HUB 템플릿·legal footer·contact·guide·SEO(전 서비스 public) |
| 3 page module | `@o4o/operator-core-ui` | operator 콘솔 페이지 모듈(members/forum/stores/lms/guide/legal/contact) |
| 3 page module | `@o4o/store-ui-core` | store owner 대시보드(local-products·buyer-orders·event-offers·supply-catalog) |
| 3 page module | `@o4o/lms-ui` | LMS presentational primitive(Neture 미소비 명시) |
| specialty | `@o4o/store-asset-policy-core` | store 자산 snapshot 정책·파생 뷰어 |
> **레이어링 일관.** 경미 마찰 2건(§7-B): ① `@o4o/operator-core`(legacy layout) ↔ `operator-ux-core`(현행) 공존 — deprecation 경로 미명시(서비스는 operator-ux-core만 사용). ② `shared-space-ui` "community" 네이밍이 실제(전 서비스 public)와 불일치(aspirational) — 문서 정정 후보.

## 7. 분류별 정리

### A. CLOSED (추가 작업 불요)
- 축 1·2·4·5·6·7·8·10·11·12·13·14 (§4). closure/CHECK 문서 + 4서비스 typecheck green + 공통 컴포넌트 thin wrapper.

### B. FUNCTIONAL+ (경미 정리 후순위)
- **copy/empty-state drift**: reward/감사 에러 문구·NoPaymentNotice copy 가 GP↔KCos 동일 하드코딩(파생 아닌 복사). 공통 상수화 여지.
- **operator-core(legacy) 정리**: operator-ux-core 로 대체됨 — deprecation/제거 경로 명시.
- **dormant lms-ui primitive**: `CourseCard`·`CourseList`·`EnrollmentButton`·`LessonPlayerShell` export 됐으나 미소비.
- **shared-space-ui 네이밍**: "community" → "cross-service public" 문서 정정.
- **가이드 hero spacing**(축 9): `IR-...-GUIDE-HERO-SECTION-SPACING` 표준 정렬 여지.

### C. INTENTIONAL DIFFERENCE (유지 타당)
- **KPA-only advanced**: QuizBuilder·AssignmentEditor·grading·CourseStructureAiModal — KPA reference KEEP.
- **KCos 강사 편집기 부재**(Phase 1-B, read-only) — 제품 요구 시만.
- **GP/KCos quiz/assignment 부재** — 제품 요구 기반.
- **Neture 제외**: lms-ui·store-ui-core 미소비(정확). store 는 operator 콘솔의 OperatorStoresList(admin list)만 — store owner mypage 아님.

### D. NEEDS WO (즉시) — **없음(hard 차단 0)**
- 빌드 실패 0 · 미적용 공통 shell로 인한 회귀 0 · 사용자 혼란 유발 route/UX drift 0.
- 준-D 후보(강의 상세/레슨 플레이어 thick 병렬, `LessonPlayerShell` dormant): 공통 shell 은 있으나 quiz/assignment/AI 유무가 서비스별로 달라 일괄 적용 비자명 → **즉시 WO 아닌 scope IR 후보**(§9-3).

### E. HOLD (별도 작업선/제품 정책 미확정)
- **Qwen live smoke**: staging QWEN_API_KEY 필요 — `CHECK-...-QWEN-...-SMOKE-V1` runbook 대기. provider 선택 UI 는 live PASS 전 미개방.
- **Signage AI / admin builder AI**: AI editing closure 가 별도 파이프라인으로 명시 — 미착수.
- **PlatformInquiry 등 운영 데이터 영향 enum**(타 audit) — 별도.

## 8. 남은 리스크
1. **경미(B)만 잔존** — 제품 동작/빌드에 영향 없는 copy·네이밍·legacy 정리. closure 비차단.
2. **준-D 1건**(레슨 플레이어 중복)이 제품 확장(KCos editor·quiz 확장) 시 커질 수 있음 — 그때 scope IR 로 흡수.
3. **E 트랙(Qwen live·Signage AI)**은 의도적 미개방 — 리스크 아님(거버넌스 통제됨).
4. 동시 세션 WIP(working tree 의 store-content 용어 정렬·AGENTS.md 등)는 본 IR 미접촉 — 빌드 green 에 영향 없음.

## 9. 권장 후속 우선순위
1. **`CHECK-O4O-CROSS-SERVICE-COMMONIZATION-CYCLE1-CLOSURE-V1`** — 본 IR 결과로 전체 공통화 1차 종료 고정(권장 즉시).
2. **`WO-O4O-CROSS-SERVICE-COPY-EMPTY-STATE-ALIGNMENT-V1`**(B) — reward/감사/NoPaymentNotice copy drift 공통 상수화(소규모, 실익 확인 시).
3. **`IR-O4O-LESSON-PLAYER-COMMONIZATION-SCOPE-V1`**(준-D) — LessonPlayerShell dormant 활성/레슨 플레이어 중복 축소 필요 시.
4. **`KEEP-O4O-SERVICE-SPECIFIC-ADVANCED-FEATURES-V1`**(C) — KPA-only·Neture-only·KCos read-only 유지 고정.
5. (선택) operator-core legacy deprecation 메모 + shared-space-ui 네이밍 문서 정정(docs patch).
6. (E) `IR-O4O-SIGNAGE-ADMIN-BUILDER-AI-PIPELINE-SCOPE-V1` — 제품 요구 시.

## 10. 최종 판정

```
판정: CLOSED with MINOR FOLLOW-UP

- 주요 공통화 축(14개): A.CLOSED — closure/CHECK 문서 + 4서비스 tsc -b 0
- 공통 package 레이어링: 일관(경미 마찰 2건 = B 문서 정정)
- Neture posture: 정확(operator/legal/guide/content 포함, lms-ui/store-ui-core 제외)
- 즉시 NEEDS-WO(D): 없음 (빌드 실패/미적용 shell/UX drift 0)
- 남은 것: B(copy·legacy·네이밍 경미 정리) + C(제품 요구 기반 차이) + E(Qwen live·Signage AI 별도 작업선)
- 큰 공통화 작업은 일단 닫아도 됨 → CHECK-...-CROSS-SERVICE-...-CLOSURE-V1 로 고정 권장
```

**요지**: O4O cross-service 공통화는 **1차 종료 가능 상태**다. 사용자/운영자/강사 화면, 내 매장 실행, 콘텐츠/자료실/제작자료, 법정·가이드·아이콘·Contact·Forum·Mypage 가 공통 package thin wrapper 로 4서비스(+Neture 적정 범위) 정렬되고 모두 typecheck green 이다. 남은 것은 "공통화 실패"가 아니라 **경미한 정리(B)·의도적 차이(C)·별도 작업선(E)** 이며, 실제 제품 요구(KCos editor·quiz/assignment·레슨 플레이어 중복 축소·Signage AI)가 생기는 축만 개별적으로 열면 된다.

---

*Date: 2026-06-15 · read-only 종합 audit · 코드/backend/DB/package/lock/Dockerfile 무변경 · 4서비스 tsc -b 0 · 14개 축 A.CLOSED · Neture posture 정확 · 즉시 NEEDS-WO 0 · CLOSED with MINOR FOLLOW-UP.*
