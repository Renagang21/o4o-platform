# CHECK-O4O-KPA-ROLE-BADGE-REMOVE-AND-USER-MENU-PARITY-RESTORE-V1

> Work Order: `WO-O4O-KPA-ROLE-BADGE-REMOVE-AND-USER-MENU-PARITY-RESTORE-V1`
>
> 목적: KPA 관리자 화면의 내부 역할 코드 노출을 제거하고, 데스크톱·모바일 사용자 메뉴의 역할별 업무 진입점을 동일하게 복원한다.

## 1. 실제 원인

- `KpaAdminDashboardPage.tsx`가 실제 권한 데이터와 무관한 하드코딩 문자열 `kpa:admin`을 시각 배지로 노출했다.
- `KpaGlobalHeader.tsx`만 `mobileUserMenuItems`를 별도로 주입해 모바일에서 마이페이지·설정만 표시했다.
- 공용 `GlobalHeader`는 `mobileUserMenuItems` 미주입 시 `userMenuItems`를 fallback으로 사용하므로, KPA의 별도 축소 주입이 데스크톱·모바일 메뉴 불일치의 직접 원인이었다.
- `StoreUserDropdown`은 동일 관리자 진입점을 `관리자 콘솔`로 표시해 글로벌 헤더의 `관리자 대시보드`와 라벨이 달랐다.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | `mobileUserMenuItems` 별도 주입 제거. 공용 fallback으로 역할별 `userMenuItems`를 모바일에서도 동일 렌더. |
| `services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx` | 하드코딩 `kpa:admin` 배지 제거. 제목·부제·권한 guard는 유지. |
| `services/web-kpa-society/src/components/store/StoreUserDropdown.tsx` | KPA 한정 `관리자 콘솔`을 `관리자 대시보드`로 통일. |

## 3. 변경 전·후

### 역할 배지

- 변경 전: `kpa:admin`
- 변경 후: 배지 없음

### 모바일 사용자 메뉴

- 변경 전: 마이페이지 / 설정 / 로그아웃
- 변경 후: 보유 역할에 따라 강의 대시보드 / 관리자 대시보드 / 운영 대시보드 / 내 매장 + 마이페이지 / 설정 / 로그아웃

### 관리자 라벨

- 변경 전: `관리자 콘솔`
- 변경 후: `관리자 대시보드`

## 4. 보존 사항

- `ROLES.KPA_ADMIN`, `AdminAuthGuard`, 역할 판정 로직 변경 0
- route 변경 0
- API 변경 0
- DB 변경 0
- 공용 `GlobalHeader` 변경 0
- 타 서비스 변경 0
- 관리자·운영자·매장·강사 기능 변경 0

## 5. 커밋

- `3e2b8f933e4e673f99ab1aba4c0da6bd670fee60` — 모바일 사용자 메뉴 parity 복원
- `1409de952a15498d10116ae4e7e13e695278362d` — `kpa:admin` 배지 제거
- `e5dae363f468a72a728333a3942bf503fb1b3fab` — 관리자 라벨 통일

## 6. 검증 상태

- GitHub default branch에 코드 반영 완료.
- 정적 타입체크, production build, 배포 및 운영 smoke는 CI/CD 결과와 운영 화면에서 후속 확인 필요.
- 운영 확인 항목:
  - `/admin/kpa-dashboard`에서 `kpa:admin` 미노출
  - 390/768/1023px 모바일 햄버거에서 보유 역할별 대시보드 진입점 노출
  - 1280px 데스크톱 사용자 드롭다운 기존 메뉴 유지
  - `StoreUserDropdown`의 관리자 라벨이 `관리자 대시보드`로 표시

## 7. 상태

코드 구현 및 push 완료. CI/CD·운영 smoke 확인 대기.
