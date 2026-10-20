# 관리자 현재 서비스·서브도메인 목록 개발 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20 (Asia/Seoul)
> **근거 WO/IR**: [구현 TODO](../work-orders/WO-O4O-ADMIN-SUBDOMAIN-SERVICE-DIRECTORY-V1.md)
> **관련 정본**: [서비스 탐색](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md) · [서브도메인 의미](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md)

## 1. 판정과 표시 범위

전용 branch `wo/admin-subdomain-service-directory`, 기준 main `3f584bcab186dd8676e0a79f2563166b865b71f3`의 개발·로컬 검증 결과다. 운영 반영 완료 판정이 아니다. commit/push SHA는 최종 인계 보고로 확인한다.

| 구분 | 표시 항목 | 진입 주소 |
| --- | --- | --- |
| 현재 서비스 | O4O 약국 경영지원 | `pharmacy.neture.co.kr` |
| 현재 서비스 | CarePharm · 만성질환관리 | `carepharm.neture.co.kr` |
| 현재 서비스 | MegaPharm · 창고형약국 | `megapharm.neture.co.kr` |
| 현재 서비스 | 약국·약사 협동조합 연합회 | `pharmcoop.neture.co.kr` |
| 현재 서비스 | 공급자 | `supplier.neture.co.kr` |
| 현재 서비스 | 커뮤니티 | `community.neture.co.kr` |
| 현재 서비스 | 약사회 분회 | `kpa.neture.co.kr` |
| 현재 서비스 | O4O 강의 | `study.neture.co.kr` |
| 현재 서비스 | 유통참여형 펀딩 | `funding.neture.co.kr` |
| 대표·공통 업무 공간 | O4O 대표 홈 | `neture.co.kr` |
| 대표·공통 업무 공간 | 내 매장 | `store.neture.co.kr` |
| 대표·공통 업무 공간 | 전체 관리자 | `admin.neture.co.kr` |
| 연동·도구·준비 중 | Cafe24 B2B 매장 지원 | `neture.co.kr/cafe24` |
| 연동·도구·준비 중 | 병원·약품 파일 도구 | `neture.co.kr/hospital` |
| 연동·도구·준비 중 | O4O Partner · 준비 중 | `neture.co.kr/services/partner` |

K-Cosmetics/Retail, PharmacyHub와 내부 상품 도메인 모듈을 현행 서비스로 표시하지 않는다. 기존 도구 경로를 새 서브도메인으로 만들거나 Partner 예약 호스트로 연결하지 않는다.

## 2. 데이터와 영향 범위

- 기존 관리자 router의 `requireAuth` + `requireAdmin` 아래 `GET /api/v1/admin/platform-services/directory`를 추가했다. 인증·역할 정책은 기존 `platform:super_admin` 판정을 유지한다.
- 서버의 관리자 표시 투영은 `service-catalog.ts`의 공식 origin/이름, `PHARMACY_COLLABORATORS`의 기존 사업 주소, `store-workspace.ts`의 내 매장 주소를 읽는다. 대표 홈 서비스 탐색 정본의 기타 경로도 대조했다. 이 목록은 identity/role/가입 registry가 아니다.
- Pharmacy/CarePharm/MegaPharm의 상태만 `semi_franchises`에서 key·status를 SELECT한다. `active`=사업 운영, `closed`=사업 종료, 행 없음=사업 미등록, 기타 상태=확인 필요다. 조회 실패는 503으로 표시하며 미등록으로 대체하지 않는다.
- 협동조합은 연합회 주소·역할만 설명하고 단일 사업 행이나 개별 조합·가입·운영자 상태를 읽거나 추정하지 않는다. 다른 항목의 주소 등록은 DNS/실제 서빙/가입 가능 여부를 검증한 상태가 아니다.
- 개인 계정·사용량·회원·권한 할당·운영자 목록을 조회하지 않는다. DB schema/migration/seed/write·서비스 membership·권한·handoff·DNS·배포 설정 변경은 없다.
- 기존 DB catalog GET/PATCH 및 공개 catalog는 그대로다. 관리자 페이지의 전용 client만 새 조회를 소비한다. 화면의 상태/설정 변경 기능은 추가하지 않는다.
- `PlatformSectionLayout`은 플랫폼 섹션 6화면이 소비한다. 모바일 탭 줄바꿈을 가로 스크롤로 보완했고 경로·메뉴 구성·권한은 유지했다. 전체 sidebar나 다른 서비스 layout은 바꾸지 않았다.

## 3. 실제 실행한 검증

| 검증 | 결과 |
| --- | --- |
| API Jest `platform-service-directory.spec.ts` | 7 PASS: router guard 배치, 공식 URL/퇴역 제외, 사업 상태·SELECT 범위, workspace/연합회/준비 중 구분, 기존 GET 계약, 오류 비노출, 신규 쓰기 없음 |
| 관리자 Vitest `platform-service-directory.test.tsx` | 8 PASS: client 응답·조회 경로, 상태·링크, 이름/주소 검색·구분 선택, 로딩·실패·재시도, 권한 오류 |
| Chromium `platform-service-directory.spec.ts` | 6 PASS: desktop 1280×800 / mobile 390×844의 메뉴→진입·직접 URL·필터·새로고침·오류 재시도, 비로그인 이동·서비스 운영자 거부 |
| API 타입·build | `pnpm --filter @o4o/api-server run type-check` / `run build`, PASS |
| 관리자 타입·build | `pnpm --filter @o4o/admin-dashboard run type-check` / `exec vite build`, 최종 UI 수정 후 PASS |
| 변경 구현·테스트 파일 ESLint | 오류/경고 0 |

브라우저 최종 캡처에서 데스크톱 검색 입력/카드, 모바일 한 줄 탭/검색/카드 줄바꿈을 직접 확인했다. 최초 오류 테스트는 개발 버전 배너의 alert와 충돌했으며 selector를 해당 오류 문구로 한정했다. assertion 제거·권한 완화 없이 전체 6건을 다시 통과했다.

API 테스트의 auth/DB는 fixture다. API 테스트는 15개 전체 투영을, 브라우저는 대표 7항목의 fixture를 검증했다. 실제 PostgreSQL에서 SQL을 실행하거나 실계정 Google 로그인, 운영 원장 상태, DNS/Cloud Run 서빙 또는 실제 외부 링크 이동을 검증한 것은 아니다. 브라우저의 모든 `/api/` 호출은 로컬 fixture에서 처리하고 쓰기 요청 0을 확인했다. 유료 API·운영 데이터 생성/변경·운영 로그인은 실행하지 않았다.

기존 Browserslist/브라우저 메타데이터 및 Tailwind 검색 범위 안내가 build에 남아 있으나 build는 성공했다. 의존성·lockfile·build 설정을 변경하지 않았다. PR CI·main 병합·운영 배포는 이번 개발 단계에서 미실행이다. 통합 시 새 API가 필요한 관리자 화면과 API를 함께 반영하고 API → admin 순서로 검증한다.

문서 정합: 구현 TODO와 검증 결과를 연결했다. 운영 미적용과 로컬 fixture 검증을 구분하며 정본·정책·index는 변경하지 않았다.
