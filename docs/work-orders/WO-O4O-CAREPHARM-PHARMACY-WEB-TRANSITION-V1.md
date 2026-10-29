# WO-O4O-CAREPHARM-PHARMACY-WEB-TRANSITION-V1

> **상태**: ACTIVE · **작성일**: 2026-10-29
> **사용자 승인**: CarePharm을 약국 협업체 공통 웹으로 이전하고 기존 약국 자원을 제거하는 조사 결과에 대해 판단하여 진행. 개발·검증·main 통합·배포·CarePharm 연결 전환·옛 Run/backend/NEG 제거 및 검증까지.
> **경계**: 기존 사업·회원·자료·세션·권한 유지. DB/migration·IAM 변경·다른 사업 데이터 변경 없음.

## TODO

- [x] 현행 코드·GCP 연결·CarePharm 경로·홈 자료 계약 및 옛 자원 삭제 조건 조사
- [x] 기존 CarePharm 표시 컴포넌트 재사용과 약국 웹의 호스트·라우트·공개/회원/운영 기능 연결
- [x] CarePharm만 분리하는 계획/digest·참조 보존·검증 실패 복구를 기존 운영 CLI에 연결
- [x] Pharmacy/MegaPharm·Neture·공통 소비처 회귀와 desktop/mobile fixture 검증
- [ ] 동일 PR의 CI·리뷰 지적 보완 후 main 통합 및 웹 배포
- [ ] 새 계획 검토 후 CarePharm host만 pharmacy-business-web으로 전환·공개 검증
- [ ] 옛 자원 요청 0·완전한 참조 검사 후 kpa-society-web/backend/NEG 제거
- [ ] 현재 구조 문서와 실제 결과 정합·종료 정리

## 보존 계약

CarePharm은 `semi_franchises.key=carepharm`·약국 조직 가입·기존 scoped 운영 권한·neture 계정 세션을 유지한다. 기존 `/home-presentation/carepharm` 공개 공지/광고 자료와 `/communities/business:carepharm/forum` 진입을 보존한다. 플랫폼 관리·다른 사업·공급자 기능을 CarePharm에 노출하지 않는다.

기존 Neture의 CarePharm 어댑터는 전환 실패 시 복구할 수 있도록 공통 표시 컴포넌트의 소비처로 유지한다. 정상 도메인 연결은 약국 웹으로 전환하며, 동일 표시 구현을 복제하지 않는다. 기존 [공통 변경 정본](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)·[역할 구조 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md)·[서브도메인 의미](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md)를 따른다.

## 개발 검증 (운영 전환 전)

- Pharmacy build·169 tests PASS. 기존 Neture 전체 172 files/1,464 tests, CarePharm 집중 57 tests PASS.
- shared-space-ui 23 files/212 tests PASS. Neture·Pharmcoop build PASS.
- 운영 Python 50 tests 및 workflow gate/diff tests PASS. 전환은 CarePharm host만 분리하고 기존 pharmacy/megapharm 삭제 검사 topology를 유지한다. drift 시 쓰기 거부, 공개 검증 실패 시 이전 연결 복구, 동시 변경 시 타인의 설정 덮어쓰기 금지를 검증했다.
- 실제 빌드 산출물의 익명 desktop/mobile fixture browser 경로 검사를 수행했다. production API·로그인·업무 데이터 write는 사용하지 않았다. 실제 계정 파일은 이 checkout과 기준 checkout에 없어 실계정 로그인·역할별 운영 검증을 완료로 주장하지 않는다.
- ESLint 오류 0. App의 기존 hook dependency warning 2건은 이번 변경 밖이며 그대로 유지한다. 기존 번들 크기 warning은 build 실패가 아니다.

CI·리뷰·통합·운영 전환·삭제 결과는 후속 실행 뒤 갱신한다. 이전 조사에서 old_request_count=0이었어도 삭제 실행 직전에 새 retire-plan을 다시 검토한다.
