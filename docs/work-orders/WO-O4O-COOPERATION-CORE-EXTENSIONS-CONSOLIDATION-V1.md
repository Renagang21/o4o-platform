# 약국 협업 사업 통합 개발 · Core + Extension 정비

> **상태**: ACTIVE
> **작성일**: 2026-10-23 (Asia/Seoul)
> **근거**: 사용자 지시 — Pharmacy·MegaPharm·Pharmcoop·CarePharm의 분리 작업을 이 공간에서 이어가고 잔여 작업을 마무리하며 core + extension으로 정리

## 현재 기준

시작 main `5a6ab8f235`. 이 클라우드 작업은 격리된 checkout `/workspace/o4o-platform`과 전용 branch `wo/pharmacy-cooperation-core-extensions`에서 진행한다. 별도 worktree를 만들거나 기존 다른 세션의 worktree를 변경하지 않는다. 사용자가 이 공간으로 네 사업 개발을 모으도록 지정한 범위다.

- PR #765는 main `772296cb6d`, PR #772는 main `8c44ffde13`에 이미 병합됐다. pull ref HEAD가 현재 main의 조상임을 Git으로 확인했다. 다시 구현하거나 중복 통합하지 않는다.
- PR #761·#763의 공통 neture 세션, 사업 UUID 범위 약관, 직원 숙지 자료, 사업 운영자 요구 집계가 이미 존재한다. 이전 조사에서 미구현으로 분류한 항목은 현 main 기준으로 재판정한다.
- GitHub REST/GraphQL 조회는 이 환경에서 Forbidden이다. Git fetch와 병합 이력 확인은 성공했다. 병합 사실과 현재 CI·운영 serving 상태를 혼동하지 않는다.

## 구조와 소비처

- `packages/shared-space-ui/src/cooperation/core.ts`: 순수 설정 계약·등록 검증·불변 스냅샷. 사업 extension을 import하지 않는다. 계정·role·약관·기능 이용권을 발급하지 않는다.
- `cooperation/extensions/{pharmacy,megapharm,carepharm,pharmcoop}.ts`: 사업별 표시명·공식 origin·회원 진입·자료 작성 도움·가입 단위. `extensions/index.ts`만 네 extension을 조합한다.
- 기존 회원 자료 UI·운영 콘텐츠 편집은 입력된 작성 도움 설정을 소비한다. CarePharm 조건문으로 공통 화면을 분기하지 않는다.
- Pharmacy/MegaPharm 공유 앱, CarePharm(Neture), Pharmcoop의 문의 진입, Neture 서비스 탐색이 같은 registry를 소비한다.
- 공통 세션은 neture이나 가입 원장은 합치지 않는다. 앞 세 사업은 약국 조직 가입, Pharmcoop는 조합별 개인 가입이다. 조합의 API·회원/역할·slug 해석은 기존 adapter에 둔다.
- 기존 Pharmacy/CarePharm handoff는 그대로 유지한다. 별도 alias가 없는 MegaPharm/Pharmcoop는 자기 공개 호스트에서 로그인하며 임의의 handoff 대상/Origin 권한을 추가하지 않는다.

## TODO

- [x] 최신 main·인계 PR·네 사업 문서·소비처 대조
- [x] 공통 계약과 네 사업 extension 분리
- [x] 공유 자료 UI의 CarePharm 하드코딩을 설정 주입으로 전환
- [x] MegaPharm 게시판 이동이 Pharmacy fallback으로 향하는 경로 보완
- [x] 공유 UI·운영 UI·Pharmacy/MegaPharm·CarePharm·Pharmcoop 회귀 검증
- [x] 영향 앱 빌드·제품 타입·lint·정적 소비처 검사. 공유 패키지 전체 tsc의 미변경 테스트 타입 오류는 CHECK에 별도 기록
- [x] 구현/병합/배포/실제 운영 준비를 구분한 [결과 기록](../checks/CHECK-O4O-COOPERATION-CORE-EXTENSIONS-CONSOLIDATION-V1.md)
- [ ] 검증한 변경만 commit·push 및 외부 접근이 허용되는 범위의 통합 절차

## 운영 준비 · 별도 결정

실제 사업 약관 두 문서와 법정정보 게시, 운영자·사업 제공 기능·직원 허용 설정은 담당자의 실제 입력이 필요하다. 코드를 위해 약관 문안을 생성하거나 동의·가입·권한을 seed하지 않는다. 테스트 계정 기준 파일의 존재를 확인하고, 없으면 실계정 검증을 완료로 표시하지 않는다. 실매장/PC·태블릿 마이크·음성 품질·실제 결제·배송은 합성 검증과 구분한다.

ERP Assistant는 확보 가능한 POS·발주 자료와 지원 업무가 확정되기 전까지 별도 검토다. 공동 상품 기획·공급 계약·펀딩 방식은 사업자 결정이며 이번 공통화에서 정책을 만들지 않는다. 운영 DB write/DDL·migration·새 의존성·배포 인프라 변경은 이 정비에 추가하지 않는다.

문서 정합: 과거 COMPLETED 기록을 재작성하지 않는다. 이 문서와 후속 CHECK에서 최신 main의 완료 근거와 실제 잔여를 연결한다.
