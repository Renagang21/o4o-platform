
# Task-000: 워드프레스 플러그인 초기화

### 구현목표
rena-multistore 플러그인의 기본 구조를 생성합니다. 워드프레스 플러그인으로 설치 가능한 형태로 초기화하고, 이후 기능 작업이 이 구조 위에 추가될 수 있도록 준비합니다.

### 세부 요구사항
- [ ] `rena-multistore.php` 플러그인 메인 파일 생성
- [ ] 워드프레스 플러그인 헤더 주석 추가
- [ ] `includes/`, `admin/`, `public/` 디렉토리 생성
- [ ] 자동 로딩 구조 또는 `require_once` 기반 로더 구현
- [ ] 플러그인 활성화 시 초기화 함수 등록 (예: 테이블 준비)
- [ ] PHP 7.4 이상, 워드프레스 5.8 이상 버전에 대응
- [ ] 다른 Task-001~n에서 이 구조 위에서 구현 가능해야 함

### 연관문서
- [requirements/01-project-overview.md](../requirements/01-project-overview.md)

### 우선순위
매우 높음 (Highest)

### 예상 산출물
- `rena-multistore.php`: 플러그인 메인 엔트리 파일
- `includes/loader.php`: 기능별 모듈 로딩 처리
- `admin/` 및 `public/` 디렉토리 생성
- 향후 task-001 ~ task-n 작업이 이 구조 위에 쌓이도록 설계

### 상태
진행 전
