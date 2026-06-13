# CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1

> **유형:** Read-only CHECK (코드/DB/route/UI/API/package/Dockerfile 변경 없음, 문서 1개만 생성)
> **목적:** `@o4o/lms-ui` 가 KPA/GlycoPharm/K-Cosmetics 3서비스에서 소비되기 시작한 시점에, **Neture 가 LMS route/menu/package/Dockerfile/import 소비처에 잘못 연결되지 않았는지** 최종 확인하고 제외 상태를 공식 고정.
> **결과: PASS** — Neture 는 `@o4o/lms-ui`/`@o4o/lms-client`/`@o4o/lms-core` 미소비, LMS route/menu/page 0, Dockerfile lms-ui COPY 0. backend LMS 는 service-neutral 유지(Neture hard-block 미추가). lms-ui 소비처 = KPA/GP/KCos 정확히 3개.
> **작성일:** 2026-06-13 · 기준 HEAD `5b85c9ffd`

---

## 1. 목적

LMS 사용자 화면 공통화 1차 마일스톤(`@o4o/lms-ui` 추출 + KPA/GP/KCos adoption) 이후, Neture 가 LMS/강의 기능 공통화 대상에서 계속 제외되어 있는지 최종 확인한다. read-only — 문서만 생성.

## 2. 결론 요약

| 점검 | 결과 |
|------|:---:|
| Neture package.json 에 `@o4o/lms-ui` | **없음** ✅ |
| Neture Dockerfile 에 `packages/lms-ui` COPY | **없음** ✅ |
| Neture source 에 `@o4o/lms-ui` / `@o4o/lms-client` / `@o4o/lms-core` import | **없음** ✅ |
| Neture `/lms`·강의 수강 route | **없음** ✅ |
| Neture LMS/강의/수강 메뉴 | **없음**(operator config 에 "lms 미사용" 주석만) ✅ |
| Neture 강의 목록/상세/수강/레슨/퀴즈/수료 화면 | **없음** ✅ |
| backend LMS Neture hard-block | **미추가**(LMS service-neutral 유지) ✅ |
| `@o4o/lms-ui` 소비처 | **정확히 KPA / GlycoPharm / K-Cosmetics 3개** ✅ |

**판정: PASS.** Neture LMS 제외는 **frontend 비소비 + Dockerfile 미연결 + 문서 guard** 로 고정됨. backend 하드코딩 차단 없이(service-neutral 원칙 유지) 제외가 성립한다.

## 3. 선행 작업 요약

- `IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1` — Neture 는 LMS 대상 아님(공급자/파트너/운영 기반), 공통화 대상 = KPA/GP/KCos.
- `WO-O4O-LMS-GPKCOS-POLICY-DRIFT-ALIGNMENT-V1` · `WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`(`7020e2c4c`) · `WO-O4O-LMS-GLYCOPHARM-ADOPTION-V1`(`2f2122559`) · `WO-O4O-LMS-KCOSMETICS-ADOPTION-V1`(`5b85c9ffd`) · KPA Docker hotfix `e4a9edef1`.
- 현재: `@o4o/lms-ui` 3서비스 소비 시작. 본 CHECK 가 Neture 제외를 그 시점에 고정.

## 4. Neture package dependency 확인

- `services/web-neture/package.json` grep `@o4o/lms` → **0건**.
- `@o4o/lms-ui` / `@o4o/lms-client` / `@o4o/lms-core` 모두 dependency 미보유.

## 5. Neture Dockerfile 확인

- `services/web-neture/Dockerfile` grep `lms` → **0건**.
- `COPY packages/lms-ui ...` 없음. (source-direct 패키지 COPY 미연결 — 의도된 제외.)

## 6. Neture route 확인

- `services/web-neture/src` 전체에서 `/lms`·course/lesson/quiz/certificate/강의/수강/레슨 수강 route → **0건**(discourse/concourse 등 오탐 제외).
- App.tsx / routes / pages 에 LMS 강의 수강 진입 route 없음.

## 7. Neture menu / navigation 확인

- `services/web-neture/src/config` · `navigation` grep `lms/강의/수강/레슨` → 매치 **2건, 모두 주석**:
  - `config/operatorMenuGroups.ts:254` — *"Neture 미사용 group(resources/lms)도 안전 default 지정 — 메뉴 항목이 없으므로 노출 결과에 영향 없음."*
  - `config/operatorMenuGroups.ts:267` — `lms: 'community_content', // 미사용 — 안전 default`
- → **실제 LMS/강의/수강 메뉴 항목 0건.** 위 2건은 group 기본값 안전 처리용 주석으로, 오히려 "lms 미사용"을 명시 — 제외를 뒷받침.

## 8. Neture import 확인

- `services/web-neture/src` 전체 grep `@o4o/lms-(ui|client|core)` → **0건**.
- LMS backend client 직접 소비 없음.

## 9. Neture operator / admin 확인

- operator/admin navigation 에 강의 관리 / LMS 관리 / 수강 관리 / 강사 관리 / LMS reward 설정 메뉴 **없음**(operatorMenuGroups 에 lms group 은 "미사용" 명시).
- `@o4o/lms-ui` 기반 메뉴 **없음**.
- Neture 강의 목록/상세/수강/레슨/퀴즈/수료/강사 관리 page 파일 **0건**(find).

## 10. backend service-neutral 경계 확인

- `apps/api-server/src/modules/lms` grep `neture`(주석 제외) → **0건**.
- LMS backend 는 serviceKey 기반 **service-neutral** 유지 — Neture 전용 연결도, Neture 하드코딩 차단도 **추가하지 않음**(선행 IR 원칙).
- Neture 제외는 backend block 이 아니라 **frontend 비소비 경계**로 성립. (Neture 가 LMS 강의를 만들/수강할 frontend 진입점·강사 role 운용이 없으므로 자연 제외.)

## 11. 예외 / 조건부 항목

- **`services/web-neture/src/types/participation.ts`** 에 future-proof COURSE/QUIZ 타입이 존재할 수 있으나 **어떤 tsx/page 도 import 하지 않음**(미사용 정의) → 활성 LMS 기능 아님. CONDITIONAL 사유에 해당하나 본 CHECK 판정은 활성 소비처 0 으로 **PASS**.
- **admin.neture.co.kr 의 향후 reward budget 관리**(O4O 전체 예산)는 LMS 수강 기능과 무관한 별도 작업선 — 본 제외 범위 밖(`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`).
- **forum 등 타 축**: 본 CHECK 시점 working tree 에 타 세션 forum 공통화 WIP(web-neture forum 페이지 포함)가 있으나 **forum 은 LMS 와 무관한 축** — 본 CHECK(LMS 제외)에 영향 없음, 미접촉.

## 12. 판정

**PASS.** Neture 는 LMS 수강 기능 공통화 대상에서 완전히 제외되어 있다 — package dependency / Dockerfile COPY / source import / route / menu / page 전부 0건. backend LMS 는 service-neutral 을 유지하며 Neture 하드코딩 차단을 추가하지 않았다(원칙 준수). `@o4o/lms-ui` 소비처는 KPA/GlycoPharm/K-Cosmetics 3개로 한정 확인. **Neture LMS 제외 상태가 본 문서로 공식 고정됨.**

## 13. 후속 작업

1. **`WO-O4O-LMS-LESSONLIST-ROWCLICK-OPTION-V1`** — `LessonList` full-row navigation 옵션 추가 → GP/KPA/KCos 사이드바 LessonList 수렴(현재 3서비스 모두 보류된 핵심 컴포넌트).
2. **`WO-O4O-LMS-KPA-FULLER-ADOPTION-V1`** — KPA 목록/레슨에서 미사용 공통 컴포넌트 활용 확대.
3. **`WO-O4O-LMS-GLYCOPHARM-FULLER-ADOPTION-V1`** — GlycoPharm 에서 LessonList/CourseCard 등 추가 adoption.
4. **`WO-O4O-LMS-KCOSMETICS-FULLER-ADOPTION-V1`** — K-Cosmetics 에서 LessonList/CourseCard 등 추가 adoption.
5. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선. 강사 리워드 지갑/충전/배정/처리중/ledger 조사.

> 향후 fuller adoption WO 에서도 본 CHECK 의 제외 경계(Neture 비소비)를 유지한다. Neture 에 `@o4o/lms-ui` dependency·Dockerfile COPY·route·menu 가 추가되면 본 guard 위반.

---

*End of CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1*
