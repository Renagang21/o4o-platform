# CHECK-O4O-SUPPLIER-WORKFLOW-VERIFICATION-V1

> 상태: ACTIVE · 검증일: 2026-10-19 (Asia/Seoul)
> 기준 main: `491be1bb82c5b9788ff97020d0e0430939be11b6`
> 작업: [WO](../work-orders/WO-O4O-SUPPLIER-WORKFLOW-VERIFICATION-V1.md)

## 1. 결론과 검증 경계

공급조건·콘텐츠 분리 기능은 이전 PR로 main에 반영됐다. 이번에는 기존 commerce 통합 테스트의 오래된 fixture/기대값을 현재 정책과 맞췄다. 제품 등록만으로 기본 공급 게시를 선택한 것으로 간주하지 않고, 독립 커뮤니티 가입을 사업 가입과 합성하지 않는다. 운영 서비스 로직은 바꾸지 않았고 기본 공급 SQL의 오래된 설명 주석만 정정했다.

운영 공급자 로그인은 환경에 연결된 `O4O_TEST_SUPPLIER_EMAIL`/`O4O_TEST_SUPPLIER_PASSWORD`로 표준 `/api/v1/auth/email/login`을 한 번 호출했으나 HTTP 401 `INVALID_CREDENTIALS`였다. 자격증명 값·계정 정보·응답 원문·토큰은 저장하지 않았다. 비밀번호 추측·재설정·반복 시도·Demo 대체를 하지 않았다. 계정 기준 파일은 현재 및 기준 checkout 모두 없었고, 승인된 환경 연결을 사용했으나 로그인 성공을 확인할 수 없었다.

따라서 인증 후 운영 화면/API 읽기와 실제 공급 요청·심사·주문 업무 흐름은 **BLOCKED/NOT_RUN**이다. PostgreSQL 서비스 통합 검증과 UI 컴포넌트 검증은 실제 운영 계정 검증을 대체하지 않는다. 운영자 업무 승인은 사용자가 담당한다. 운영 업무 데이터 생성·변경은 0이다. 로그인 시도의 정상 보안·감사 기록은 보존 정책을 따르며 삭제하지 않는다.

## 2. 기존 6개 실패와 정비

표준 migration을 적용한 새 격리 PostgreSQL에서 수정 전 26개 중 20 PASS/6 FAIL을 재현했다.

| 기존 실패 | 원인 | 정비 및 보존한 검증 |
|---|---|---|
| 독립 커뮤니티와 사업 가입 | 폐기된 개별 community slug/가입 원장으로 이용을 허용한다고 기대 | 현행 `community` 서비스 회원 원장 사용. 과거 community row/가입만으로 접근 불가, 사업 정지가 독립 community 가입에 전파되지 않음, community 자체 정지는 차단하되 재활성 사업 이용에는 전파되지 않음, 사업 담당자만 게시판 생성 검증 |
| pharmacy 기본 공급 | 게시 선택 없이 기본 공급 노출을 기대하고 `service_keys`로 게시를 추론 | fixture에 `defaultSupplyEnabled`를 명시. 기본값 false, 승인 상품도 미선택이면 비노출. 명시적 true/false 저장에 따른 노출/숨김, pharmacy 가입 경계, legacy 키가 게시를 결정하지 않음 검증 |
| 장바구니 약국 조직 격리 | 기본 공급 미게시 상품으로 테스트 진입 | 해당 상품만 게시 true로 준비. A/B 약국 사이 조회·변경·checkout 격리 assertion 유지 |
| 제안 가격·결제 묶음·멱등 | 같은 주문의 기본 공급 상품 미게시 | 기본 공급 fixture만 게시 true. 제안 승인 가격·receiver별 결제 묶음·금액 및 멱등 assertion 유지 |
| 이벤트/취소/재고 부족 | 재고 부족 확인용 기본 공급 상품 미게시 | 재고 시험 상품만 게시 true. 이벤트 한도·취소 복원·재고 부족 assertion 유지 |
| 장바구니 이후 사업 정지 | 기본 공급 미게시로 담기 단계 실패 | 게시 fixture 준비 후 기존 checkout 차단 assertion 유지. 결제 직전 검사를 추가한 것이 아님 |

기본 공급 게시와 `service_keys`를 구분하는 기준은 [약국 commerce 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)의 공급 경로/등록·게시 분리 정정이다. 독립 community 서비스 기준은 [역할별 업무공간 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)의 2026-10-17 독립 서비스 전환 정정이다. 과거 본문을 현재 정책으로 재승격하지 않는다.

테스트를 skip하거나 assertion을 삭제해 통과시키지 않았다. 첫 보완 후 25 PASS/1 FAIL에서 legacy 키에 대한 옛 기대값도 발견해 현재 정책과 대조했다. 그 뒤 26/26 PASS, 다시 새 DB bootstrap·migration부터 전체 관련 검증을 실행했다.

## 3. 이번 실행 결과

- Node 22.18.0/pnpm 10.25.0, frozen/offline install. 의존성·lockfile 변경 없음.
- PostgreSQL 15, loopback 전용 port 5548, 이번 작업이 만든 별도 DB만 사용. 표준 `src/migrate.ts`가 bootstrap과 incremental 34개를 적용하고 지문 `2fe675793e6f86734ed83e4317047f7b2548e02c1fea92ae39bba083f8a8f644` / 6741 lines post-assertion PASS.
- 새 DB의 API 관련 7 suites/133 tests PASS, skipped 0. 실제 PostgreSQL은 commerce 26 + 제안 조건 17 + 운영자 제품 상세 2 + 콘텐츠 요청 12 = 57개. Supplier 경계 41 + 규칙 21 + 조건 단위 14 = 76개.
- PostgreSQL의 주문/결제 테스트는 SQL order creator와 test-mode bridger를 사용하는 서비스 통합 테스트다. 실제 결제 게이트웨이·운영 결제를 실행하지 않았다.
- 공유 pharmacy-management UI 6 files/47 tests PASS. 최신 main의 공통 운영자 변경까지 포함한 현재 실행 수치다.
- 공급자 UI는 최초 실행에서 `@o4o/ui` build 산출물 누락으로 수집 실패(실행된 테스트 0). Neture 의존 패키지 빌드 후 공급자 초안/제안 2 files/8 tests가 정상 수집되어 모두 PASS했다. 최초 수집 실패를 업무 코드 오류로 처리하지 않았다.
- 공개 운영 주소 5곳 HTTP 200, API `/health/ready`는 ready 확인. 정적 응답 성공을 인증 후 업무 성공으로 간주하지 않는다.

검증 로그·가공된 결과는 저장소 밖 `/workspace/artifacts/supplier-workflow-closure/`에 보관한다. 계정/비밀번호/토큰·운영 업무 데이터는 포함하지 않는다.

## 4. 이전 인계 기록의 현재 상태

과거 COMPLETED WO/CHECK는 문서 lifecycle 규칙에 따라 소급 재작성하지 않는다. 아래는 그 이후 GitHub를 재조회한 별도 종료 연결 기록이다.

| 당시 문서/작업 | 현재 확인한 사실 |
|---|---|
| [펀딩·운영 예외 WO](../work-orders/WO-O4O-SUPPLIER-FUNDING-OPERATOR-EXCEPTIONS-TODO-V1.md)의 통합 담당 잔여 항목 | [PR #653](https://github.com/Renagang21/o4o-platform/pull/653) MERGED, merge `205064be109845e26bcf7393b5456d44b70798a3`, 2026-10-17. 아래 배포 target의 조상임을 확인 |
| [콘텐츠 목적지 WO](../work-orders/WO-O4O-SUPPLIER-CONTENT-DESTINATIONS-V1.md)의 push 단계 기록 | [PR #678](https://github.com/Renagang21/o4o-platform/pull/678) MERGED, merge `03d33dfee2d3916178b2c473ea5071845a1e0b4c`. 정책 문서 [PR #679](https://github.com/Renagang21/o4o-platform/pull/679)도 MERGED |
| [협업체 조건 WO](../work-orders/WO-O4O-SUPPLIER-BUSINESS-TERMS-V1.md)의 개발/통합 단계 기록 | [PR #693](https://github.com/Renagang21/o4o-platform/pull/693) MERGED, merge `c68f871feee2de6cbb474d4e5c2862cdd045e3f5`, 2026-10-18. CI Gate PASS 및 최종 HEAD 리뷰 완료 기록은 기존 인계/PR에 있음 |

[Promote 39097603780](https://github.com/Renagang21/o4o-platform/actions/runs/39097603780)의 target `f8a849ba6e5683f7f5620c62fd4abe27b66f6197`에 위 공급자 소스 병합이 포함된다. API migration job·readiness·트래픽 전환 후 검사 및 Neture/Store/KPA/Admin 배포 작업이 성공한 기록을 확인했다. 이번에 운영 migration을 재실행하거나 과거 사용자 승인 기록을 새로 생성하지 않았다. 전체 production status에 다른 미선택 서비스가 남은 것과 해당 배포 작업의 성공은 구분한다. 이 과거 배포 target을 현재 main 전체가 배포됐다는 근거로 사용하지 않는다.

## 5. 남은 운영 검증

유효한 공급자 테스트 인증 연결/비공개 계정 기준이 필요하다. 약국 측은 `O4O_TEST_STOREOWNER_EMAIL`만 연결돼 있고 `O4O_TEST_STOREOWNER_PASSWORD`는 없으므로 인증 후 약국 검증도 미실행이다. 값은 채팅·공개 문서로 전달하지 않고 환경의 비공개 연결로 갱신한다. 인증 복구 후 본인 역할·공급자 문맥·제품/제안/콘텐츠 목록의 읽기부터 확인한다. 요청 생성·운영자 승인·주문·결제는 사용자 담당과 테스트 데이터 완전 정리 경계를 확인한 뒤 별도 회차로 진행한다.

초안 영구 저장은 이번 미구현 결함으로 판정하지 않았다. 공급자 종료 사유 입력은 2026-10-19 사용자 결정에 따라 불필요하며 후속 정비 항목에서 제외한다. 대상 약국 active 가입 추가 검사·결제 직전 재검증은 사용자 제외 정책을 유지한다.

최종 정리: 임시 schema 잔존 0 확인, 이번 격리 DB 두 개 삭제 후 잔존 0 확인, 로컬 PostgreSQL 종료. 다른 작업공간/DB/프로세스는 변경하지 않았다.
