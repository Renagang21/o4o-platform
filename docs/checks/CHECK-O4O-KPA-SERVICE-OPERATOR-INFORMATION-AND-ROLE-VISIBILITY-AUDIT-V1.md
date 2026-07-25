# CHECK-O4O-KPA-SERVICE-OPERATOR-INFORMATION-AND-ROLE-VISIBILITY-AUDIT-V1

> WO: `WO-O4O-KPA-SERVICE-OPERATOR-INFORMATION-AND-ROLE-VISIBILITY-AUDIT-V1`
> Date: 2026-07-25
> Result: **PASS (기존 정보의 최소 연결 완료)**

## 1. 조사 결과

- 운영자 영역은 `KpaOperatorLayoutWrapper`가 공통 `KpaGlobalHeader`를 항상 렌더링하므로
  헤더 보완으로 사이드바와 대시보드를 포함한 모든 운영자 화면에 동일한 사용자 정보가 노출된다.
- 인증 컨텍스트에 이름, 이메일, `roles`가 이미 있으며 새 API나 모델은 필요하지 않다.
- 프로필과 설정 화면 및 보호 route가 이미 존재한다.
  - `/mypage/profile`
  - `/mypage/settings`
- 확인한 링크는 실제 route와 일치하며 존재하지 않는 프로필·계정 route는 발견하지 못했다.
- 데스크톱 헤더에는 이름과 이메일만 표시되고 서비스 역할이 누락되어 있었다.
- 모바일 `내정보` 시트도 이름과 이메일만 표시되어 데스크톱과 같은 역할 식별 정보가 없었다.
- 계정 메뉴는 마이페이지와 설정만 직접 연결되어 있었고, 기존 프로필 route의 직접 진입 항목이 없었다.

## 2. 구현 결과

- 데스크톱 헤더 사용자 메뉴와 모바일 `내정보` 시트에 최고 유효 서비스 역할을 표시한다.
  - `kpa:operator` → `KPA 서비스 · 서비스 운영자 (kpa:operator)`
  - `kpa:admin` → `KPA 서비스 · 서비스 관리자 (kpa:admin)`
  - `platform:super_admin` → `KPA 서비스 · 플랫폼 최고 관리자 (platform:super_admin)`
- 여러 역할이 있을 때 `platform:super_admin`, `kpa:admin`, `kpa:operator` 순으로 하나의 최고 유효 역할을 표시한다.
- 데스크톱과 모바일이 같은 표시 helper와 같은 계정 메뉴를 재사용한다.
- 계정 메뉴에 기존 `/mypage/profile`로 이동하는 `프로필` 항목을 추가했다.
- 기존 `/mypage`, `/mypage/settings`, 로그아웃 및 모든 기기 로그아웃 동선은 유지했다.

## 3. 정보 수정 경계

운영자가 직접 수정 가능한 기존 정보:

- 이름, 닉네임, 연락처, 이메일
- 비밀번호
- 직역 및 직역 관련 프로필 정보
- 알림 수신 설정
- 프로필 화면이 이미 허용하는 약국 경영자 사업 정보 캐시

직접 수정하지 않는 정보:

- `kpa:operator`, `kpa:admin` 및 기타 계정 역할 부여
- 운영자 권한 승격·회수
- 소속 조직의 canonical 관계
- 계정 상태와 서비스 접근 정책

이번 WO는 역할을 읽어 표시만 하며 User/Operator 모델, 권한 guard, 역할 정책, 상태 전이를 변경하지 않았다.

## 4. 변경 파일

- `services/web-kpa-society/src/components/KpaUserMenu.tsx`
- `services/web-kpa-society/src/components/KpaGlobalHeader.tsx`
- `services/web-kpa-society/src/components/MobileBottomNav.tsx`
- 본 CHECK 문서

변경하지 않은 영역:

- API, DB, entity, migration
- 인증 컨텍스트와 역할 판정 유틸리티
- route와 권한 guard
- 운영자 사이드바 항목 및 대시보드 기능
- 관리자 역할 부여 기능
- 공급자·매장 화면
- package, lockfile, 배포 설정

## 5. 검증

| 검증 | 결과 |
|---|---|
| `pnpm --filter @o4o/web-kpa-society build` | PASS (`tsc && vite build`) |
| 대상 파일 `git diff --check` | PASS |
| `/mypage/profile`, `/mypage/settings` route 정적 확인 | PASS |
| 데스크톱/모바일 공통 메뉴 및 역할 helper 연결 확인 | PASS |
| 기존 로그아웃과 모든 기기 로그아웃 동선 정적 확인 | PASS |

운영자 인증 세션이 연결된 브라우저가 없어 역할별 실제 클릭 smoke는 수행하지 않았다.

## 6. Git 및 작업공간 상태

- 이 WO는 commit, push, deploy를 명시적으로 승인하지 않았으므로 수행하지 않았다.
- 이 WO 파일은 stage하지 않았다.
- 다른 세션 소유의 기존 dirty/untracked 파일을 수정하거나 stage하지 않았다.
- 조사 중 다른 세션의 다음 staged 변경이 확인되었으며 그대로 보존했다.
  - `apps/api-server/src/scripts/data/otc-oral-combo-shardC-manifest.da.json`
  - `docs/checks/CHECK-O4O-OTC-BIGCON-HOLD-REASON-MANIFEST-SYNC-DA-V1.md`
- 기존 dirty/untracked `.codex/`, API 임시 스크립트, 환경 CHECK 문서도 보존했다.

## 7. 후속

- 신규 운영자 관리 시스템이나 역할 부여 기능은 필요하지 않다.
- 역할별 실제 계정으로 데스크톱 드롭다운과 모바일 `내정보` 시트를 확인하는 운영 smoke는
  인증 가능한 테스트 계정과 연결 브라우저가 준비될 때 수행할 수 있다.
