# 기존 상품·설명서 편집과 갱신 검토 연결 검증 V1

> **상태**: COMPLETED · **검증일**: 2026-10-25 (Asia/Seoul)
> **범위**: 조사·구현·합성 검증·push. PR·main 병합·운영 배포·실상품 수정 없음.
> **작업**: [WO](../work-orders/WO-O4O-PRODUCT-EDIT-RENEWAL-LINK-V1.md) · **현행 안내**: [운영 안내](../guides/products/O4O-PRODUCT-EDIT-RENEWAL-LINK-V1.md)

## 결과

- 일반 카탈로그 편집과 관리자 직접 설명서 저장의 실제 변경에 갱신 검토·알림을 연결했다. 기존 P2를 재사용하지만 일반 편집을 보정 승인으로 위장하지 않으며 경로·처리자·전후 값·독립 이벤트를 보존한다.
- 상품/설명서 잠금·같은 값 no-op·이벤트 ID 중복 방지·원자적 rollback을 검증했다. 이용 목적은 미지정으로 시작하고 화면에서 명시적으로 선택한다.
- 공급자 제출·다른 canonical 승격·외부 수집은 자동 확대하지 않았다. 기존 역할·보호 필드·설명서 언어/유형·공용 자산 경계를 유지한다.
- 최신 main 23717b6dc0의 전용 branch에 선행 c88dbaf014를 포함하는 merge 847e55ea75를 만들었다. startup import/stop 충돌은 양쪽 worker를 모두 유지해 해결했다. 이 merge는 개발 branch 내부이며 main 병합이 아니다.

## 검증

- API Jest: **41개 suite / 827개 통과**, 기존 환경 플래그로 비활성화된 별도 통합 4개 suite / 42개는 건너뜀. 상품 관리·Neture 서비스·공통 DB 권한·worker 관련 회귀를 실행했다. 별도 공급자/홈 참여 통합 환경을 운영 DB로 대체하지 않았다.
- 신규 실제 TypeORM + PostgreSQL 15 통합 **11개**: 실제 상품 수정·관련 유형/언어, 같은 값·updatedAt·동시 저장, DB 정규화 결과 기록, immutable 보호·미등록 설명서 검토, 상품 수정 rollback, 관리자 본문·요약·HTML 정화와 다른 유형/언어 보존, 첫 설명서의 실제 유형/언어 연결·동일 대상 재전송, 동일 내용/동시 정본 저장의 no-op, 정본 승격 rollback, 기본 공급자/승격 경로의 미확대, 이벤트 중복·되돌림 실변경 구분.
- 통합 테스트는 실제 서비스·repository·transaction을 사용한다. 테이블은 localhost correction_review의 자체 무작위 schema에서 settings.key varchar(100)/type varchar(50), 상품 FK·canonical partial unique를 적용했다. synchronize/migrationsRun/installExtensions는 끄고 finally에서 자체 schema·연결을 정리한다.
- 관리자 Vitest: **4개 파일 / 32개 통과**. 일반 편집 경로·전후 값 표시, 목적 미지정 시 저장 차단과 명시적 목적 선택을 포함한다. 기존 P1/P2·정기 작업·AI 초안 UI 회귀도 통과했다.
- Chromium 합성 fixture 1440px/390px: 실제 관리자 production CSS에서 일반 편집 경로·전후 값, 긴 합성 처리자 UUID, 목적 미지정 저장 차단, 명시적 목적 선택, 원본 충돌 메모 유지, 저장 후 조회 실패, 갱신 이력·예약·대량 제어·재진입을 확인했다. 페이지 오류·실패 자산 요청·가로 넘침 없음. 화면 fixture는 운영 API 검증을 뜻하지 않는다.
- frozen lockfile 설치, 의존 패키지 및 types build, API·관리자 TypeScript, 관리자 production build 통과. 변경 파일 ESLint 오류 0, 기존 product-master-create.controller.ts의 사용하지 않는 _dataSource 경고 1건은 HEAD에도 존재하며 이번 범위에서 임의 수정하지 않았다. 신규 코드 경고 없음.
- 문서 상대 링크·민감정보·diff 검사 확인. 테스트 계정 기준 파일은 현 worktree와 기준 checkout에 없어 운영 로그인 smoke는 수행하지 않았다. 실계정·실상품·운영 예약은 사용하지 않았다.

## 후속 경계

현재는 미배포 개발 결과다. 기존 모든 raw SQL·수집·공급자 검수까지 변경을 포착한다고 해석하지 않는다. 동일 내용 설명서 요청에서 앞서 생성한 미적용 candidate는 삭제하지 않는다. 원본과 갱신 기록의 원자성은 일반 기본정보 transaction 및 관리자 canonical 승격 transaction 단위이며 전체 신규 상품 등록 과정을 새 transaction으로 바꾸지 않았다.

PR 생성·main 병합·배포는 별도 지시 없이 진행하지 않는다. AI 기능·QR 공식 DB 채택 보류·운영 상품 보정 실행과 분리한다.
