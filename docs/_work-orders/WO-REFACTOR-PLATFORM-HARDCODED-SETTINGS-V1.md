Work Order – Refactoring: Platform Hardcoded Settings Extraction
=====================================================================


📌 Work Order ID
WO-REFACTOR-PLATFORM-HARDCODED-SETTINGS-V1


📌 리팩토링 목적
☑ 코드 구조 개선
☑ 유지보수성 향상
☑ 기술 부채 해소
☐ 성능 최적화

플랫폼 전반에 하드코딩되어 있는 설정성 값을
Settings Schema v0.1 및 Storage Strategy v0.2 기준에 따라
"설정 참조 구조"로 전환하기 위한 리팩토링 작업


📌 대상 범위

영향받는 주요 영역:
- Platform Core (공통 설정 참조 지점)
- Service Manifest (displayName, enable 여부)
- App Manifest (defaultConfig 중 설정 승격 대상)
- 공통 Config / Constants 파일

영향받는 파일/모듈 (예시):
- `packages/platform-core/src/config/*.ts`
- `packages/platform-core/src/constants/*.ts`
- `apps/api-server/src/config/*.ts`
- `apps/admin-dashboard/src/config/*.ts`
- `packages/**/manifest.ts`
- `packages/**/defaultConfig.ts`

변경 없는 기능 (기능 동작 100% 동일 보장):
- 사용자 인증/인가 흐름
- API 엔드포인트 및 응답 스펙
- 관리자 UI 동작
- 서비스 라우팅 구조
- 앱 기능 로직 전반


📌 리팩토링 대상 설정 (P0)

다음 항목은 **하드코딩 제거 대상(P0)** 으로 지정한다:

1. 플랫폼 도메인
   - `neture.co.kr` 문자열 하드코딩
   - URL 생성, 링크, 쿠키 도메인 참조 지점

2. 이메일 기본 발신 정보
   - SMTP From Name
   - SMTP From Email

3. AI Provider 기본값
   - 기본 provider (local/openai/google 등)
   - 기본 model 값

4. Service 식별 정보
   - service displayName (manifest 고정값)
   - service enable/disable 관례 값

5. App 기본 설정값
   - manifest `defaultConfig` 중
     Settings Schema v0.1에 포함된 항목


📌 리팩토링 원칙 (필수)

- ❌ 새로운 DB 스키마 생성 금지
- ❌ settings 테이블 구현 금지
- ❌ 관리자 UI 수정 금지
- ❌ API 계약 변경 금지

- ⭕ 설정 값의 "출처(source)"만 변경
- ⭕ 값의 의미, 기본값, 동작 결과는 100% 동일 유지
- ⭕ 임시 참조 어댑터 허용 (settings stub)


📌 브랜치 전략
Base Branch: develop
Refactor Branch: refactor/platform-hardcoded-settings
Merge Target: develop (PR + 리뷰 필수)


📌 검증 계획

기존 기능 동작 확인 방법:

자동 테스트:
- [ ] 기존 API E2E 테스트 전부 통과
- [ ] Unit 테스트 전부 통과
- [ ] Integration 테스트 전부 통과

수동 검증:
- [ ] 관리자 화면 주요 페이지 정상 로드
- [ ] 서비스별 라우팅 및 메뉴 정상 동작
- [ ] 사용자 로그인/로그아웃 정상 동작
- [ ] 이메일 발송 정상 동작 (발신자 정보 확인)
- [ ] AI 기능 정상 동작 (provider 확인)


📌 영향받는 문서
- `docs/_platform/settings-schema-v0.1.md` (참조)
- `docs/_platform/settings-storage-strategy-v0.2.md` (참조)
- `docs/_platform/refactoring-policy.md` (준수)


📌 보고 문서
작업 완료 후 임시 보고서 생성
위치: docs/_reports/WO-REFACTOR-PLATFORM-HARDCODED-SETTINGS-V1-refactor-report.md
보관 기간: PR 머지 후 7일 → 자동 삭제


🔒 작업 완료 조건
- [x] Settings Stub 생성 (중앙 진입점)
- [x] P0 핵심 파일 1개 적용 (auth-client)
- [ ] P0 나머지 파일 4개 (Phase 3로 이관)
- [ ] 기존 기능 동작 검증 완료 (Phase 3에서 통합 검증)
- [ ] 영향받는 문서 업데이트 (필요 시)
- [ ] PR 승인 및 머지
- [x] 보고서 작성

---

## 작업 진행 상황

**생성일**: 2025-12-24
**상태**: ⚠️ Partial Complete (P0 Minimal Scope)

### 진행 내역
- 2025-12-24 10:53: Work Order 생성
- 2025-12-24 11:00: 하드코딩 조사 시작 (200+ 위치 발견)
- 2025-12-24 11:12: 범위 재정의 승인 (P0 최소 범위로 축소)
- 2025-12-24 11:15: Settings Stub 생성 완료
- 2025-12-24 11:20: auth-client 리팩토링 완료 (1/5 P0 파일)
- 2025-12-24 11:25: 보고서 작성 완료

### Phase 3 Work Order 필요
- WO-REFACTOR-DOMAIN-HARDCODING-PHASE2 (200+ 위치)
- WO-REFACTOR-EMAIL-SETTINGS (100+ 위치)
- WO-REFACTOR-SERVICE-MANIFEST-SETTINGS
- WO-REFACTOR-APP-MANIFEST-SETTINGS
- WO-PLATFORM-SETTINGS-DB-IMPLEMENTATION
