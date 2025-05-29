# Task-001: 스토어 등록 기능 구현

### 구현목표
사용자가 워드프레스 관리자에서 새로운 "스토어(Store)"를 등록할 수 있는 기능을 개발합니다. 각 스토어는 고유한 정보(상호명, 주소, 사업자 등록번호 등)를 갖고, 멀티스토어 기반의 판매 단위로 사용됩니다.

### 세부 요구사항
- [ ] 관리자 메뉴에 "스토어 관리" 하위 메뉴 추가
- [ ] 새로운 스토어 등록을 위한 UI 페이지 제작
- [ ] 상호명, 주소, 연락처, 사업자등록번호 등의 필드 구성
- [ ] 등록 시 커스텀 포스트 타입(CPT)으로 저장
- [ ] 저장된 데이터는 향후 주문, 벤더, 제품과 연결될 예정

### 연관문서
- [requirements/02-feature-spec.md](../requirements/02-feature-spec.md)
- [design/01-admin-ui-wireframe.md](../design/01-admin-ui-wireframe.md)
- [design/02-database-schema.md](../design/02-database-schema.md)

### 우선순위
높음 (High)

### 예상 산출물
- `admin-menu-store.php`: 관리자 메뉴 및 UI 등록
- `cpt-store.php`: 스토어 등록용 CPT 정의
- `store-meta-fields.php`: 커스텀 필드 추가 및 저장 처리

### 상태
할당 대기

