# Step 25 — Pre-Phase B: API Server Code Investigation Work Order

## O4O Platform — Backend Module Inventory & Dependency Map

**Version**: 2025-12-03
**Status**: In Progress
**Phase**: Pre-Phase B (Investigation)
**Author**: O4O Platform Team

---

## 🎯 Purpose

Step 25 Phase B (모듈 구조 정의)는 **API Server 전체의 구조를 재편성하는 단계**이다.
이전에 Phase A가 legacy/dead code를 제거하였다면,

**Pre-Phase B는 "현재 남아있는 실제 코드들의 전체 구조를 분석·인벤토리화하여
Phase B 설계를 위한 정확한 기반 자료를 만드는 단계"이다.**

> 이 조사 결과는 API Server V2의 "최종 설계도(Architecture Spec)"가 되며,
> Step 25 전체의 성공을 좌우한다.

---

## 📦 Scope (조사 범위)

아래 모든 항목을 조사해야 합니다:

- ✔ **Module Inventory** - 전체 모듈 목록 및 구조
- ✔ **Controller Inventory** - 모든 컨트롤러와 담당 라우트
- ✔ **Service Inventory** - 모든 서비스와 역할
- ✔ **Entity Inventory** - 모든 엔티티와 모듈 분류
- ✔ **Route Inventory** - 모든 라우트와 매핑
- ✔ **DTO Inventory** - DTO 구조 및 위치
- ✔ **Import Graph Analysis** - 모듈 간 의존성 분석
- ✔ **Circular Dependency Scan** - 순환 의존성 검출
- ✔ **File Structure Mapping** - 파일 구조 매핑
- ✔ **Active vs Deprecated** - 활성/폐기 모듈 구분
- ✔ **API Endpoint Map** - API 엔드포인트 전체 지도

---

## 📚 Deliverables (산출물)

조사 완료 후 반드시 다음 문서를 생성해야 한다:

```
/docs/api-server/inventory/module_inventory.md
/docs/api-server/inventory/controller_inventory.md
/docs/api-server/inventory/service_inventory.md
/docs/api-server/inventory/entity_inventory.md
/docs/api-server/inventory/route_inventory.md
/docs/api-server/inventory/dto_inventory.md
/docs/api-server/inventory/dependency_graph.md
/docs/api-server/reports/pre_phase_b_summary.md
/docs/api-server/reports/pre_phase_b_issue_report.md
```

이 문서들은 Phase B의 설계 근거자료로 사용된다.

---

## 🧭 Phase 구성

```
Phase A — 자동 스캔 스크립트 실행 (Inventory 생성)
Phase B — Controller/Service/Entity 조사
Phase C — Route 구조 조사
Phase D — Module 경계 분석 및 cross-import 검출
Phase E — Circular dependency 및 문제점 리포트
Phase F — 전체 종합 요약 문서 생성
```

---

## 🛠 Phase A — 자동 스캔 스크립트 실행

다음 스캔 스크립트들을 생성 후 실행한다.

### 1) Controller 스캔 스크립트

**파일**: `/tmp/scan_controllers.sh`

```bash
#!/bin/bash
cd /home/dev/o4o-platform/apps/api-server
echo "=== Scanning Controllers ==="
echo ""

# Find all controller files
find src -type f -name "*[Cc]ontroller.ts" | sort > /tmp/controller_files.txt

# Extract class names
echo "Controller Files Found: $(wc -l < /tmp/controller_files.txt)"
echo ""

# Create detailed inventory
echo "# Controller Inventory" > /tmp/controller_inventory.txt
echo "" >> /tmp/controller_inventory.txt
echo "**Total Controllers**: $(wc -l < /tmp/controller_files.txt)" >> /tmp/controller_inventory.txt
echo "**Scan Date**: $(date)" >> /tmp/controller_inventory.txt
echo "" >> /tmp/controller_inventory.txt
echo "## Controller List" >> /tmp/controller_inventory.txt
echo "" >> /tmp/controller_inventory.txt

while read -r file; do
    class_name=$(grep -oP "class \K\w+Controller" "$file" | head -1)
    if [ -n "$class_name" ]; then
        echo "- **$class_name** - \`$file\`" >> /tmp/controller_inventory.txt
    fi
done < /tmp/controller_files.txt

echo "Done. Output: /tmp/controller_inventory.txt"
cat /tmp/controller_inventory.txt
```

---

### 2) Service 스캔 스크립트

**파일**: `/tmp/scan_services.sh`

```bash
#!/bin/bash
cd /home/dev/o4o-platform/apps/api-server
echo "=== Scanning Services ==="
echo ""

# Find all service files
find src/services -type f -name "*.ts" ! -path "*/\__tests__/*" ! -name "*.test.ts" ! -name "*.spec.ts" | sort > /tmp/service_files.txt

echo "Service Files Found: $(wc -l < /tmp/service_files.txt)"
echo ""

# Create detailed inventory
echo "# Service Inventory" > /tmp/service_inventory.txt
echo "" >> /tmp/service_inventory.txt
echo "**Total Services**: $(wc -l < /tmp/service_files.txt)" >> /tmp/service_inventory.txt
echo "**Scan Date**: $(date)" >> /tmp/service_inventory.txt
echo "" >> /tmp/service_inventory.txt
echo "## Service List" >> /tmp/service_inventory.txt
echo "" >> /tmp/service_inventory.txt

while read -r file; do
    class_name=$(grep -oP "(class|export (default )?)\K\w+Service" "$file" | head -1)
    if [ -n "$class_name" ]; then
        echo "- **$class_name** - \`$file\`" >> /tmp/service_inventory.txt
    else
        filename=$(basename "$file" .ts)
        echo "- **$filename** - \`$file\`" >> /tmp/service_inventory.txt
    fi
done < /tmp/service_files.txt

echo "Done. Output: /tmp/service_inventory.txt"
```

---

### 3) Entity 스캔 스크립트

**파일**: `/tmp/scan_entities.sh`

```bash
#!/bin/bash
cd /home/dev/o4o-platform/apps/api-server
echo "=== Scanning Entities ==="
echo ""

# Find all entity files
grep -r "@Entity" src --include="*.ts" -l | sort > /tmp/entity_files.txt

echo "Entity Files Found: $(wc -l < /tmp/entity_files.txt)"
echo ""

# Create detailed inventory
echo "# Entity Inventory" > /tmp/entity_inventory.txt
echo "" >> /tmp/entity_inventory.txt
echo "**Total Entities**: $(wc -l < /tmp/entity_files.txt)" >> /tmp/entity_inventory.txt
echo "**Scan Date**: $(date)" >> /tmp/entity_inventory.txt
echo "" >> /tmp/entity_inventory.txt
echo "## Entity List" >> /tmp/entity_inventory.txt
echo "" >> /tmp/entity_inventory.txt

while read -r file; do
    # Extract entity name and table name
    class_name=$(grep -oP "export class \K\w+" "$file" | head -1)
    table_name=$(grep -oP "@Entity\(['\"]?\K[^'\")\s]+" "$file" | head -1)

    if [ -n "$table_name" ]; then
        echo "- **$class_name** (\`$table_name\`) - \`$file\`" >> /tmp/entity_inventory.txt
    else
        echo "- **$class_name** - \`$file\`" >> /tmp/entity_inventory.txt
    fi
done < /tmp/entity_files.txt

echo "Done. Output: /tmp/entity_inventory.txt"
```

---

### 4) Route 스캔 스크립트

**파일**: `/tmp/scan_routes.sh`

```bash
#!/bin/bash
cd /home/dev/o4o-platform/apps/api-server
echo "=== Scanning Routes ==="
echo ""

# Find all route files
find src/routes -type f -name "*.ts" ! -name "*.test.ts" | sort > /tmp/route_files.txt

echo "Route Files Found: $(wc -l < /tmp/route_files.txt)"
echo ""

# Create detailed inventory
echo "# Route Inventory" > /tmp/route_inventory.txt
echo "" >> /tmp/route_inventory.txt
echo "**Total Route Files**: $(wc -l < /tmp/route_files.txt)" >> /tmp/route_inventory.txt
echo "**Scan Date**: $(date)" >> /tmp/route_inventory.txt
echo "" >> /tmp/route_inventory.txt
echo "## Route Files" >> /tmp/route_inventory.txt
echo "" >> /tmp/route_inventory.txt

while read -r file; do
    # Count routes in file
    route_count=$(grep -c "router\.\(get\|post\|put\|patch\|delete\|use\)" "$file" || echo 0)
    echo "- \`$file\` - $route_count routes" >> /tmp/route_inventory.txt
done < /tmp/route_files.txt

echo "Done. Output: /tmp/route_inventory.txt"
```

---

### 5) DTO 스캔 스크립트

**파일**: `/tmp/scan_dtos.sh`

```bash
#!/bin/bash
cd /home/dev/o4o-platform/apps/api-server
echo "=== Scanning DTOs ==="
echo ""

# Find all DTO files (common patterns)
find src -type f \( -name "*dto.ts" -o -name "*Dto.ts" -o -name "*DTO.ts" \) | sort > /tmp/dto_files.txt

echo "DTO Files Found: $(wc -l < /tmp/dto_files.txt)"
echo ""

# Create detailed inventory
echo "# DTO Inventory" > /tmp/dto_inventory.txt
echo "" >> /tmp/dto_inventory.txt
echo "**Total DTO Files**: $(wc -l < /tmp/dto_files.txt)" >> /tmp/dto_inventory.txt
echo "**Scan Date**: $(date)" >> /tmp/dto_inventory.txt
echo "" >> /tmp/dto_inventory.txt
echo "## DTO Files" >> /tmp/dto_inventory.txt
echo "" >> /tmp/dto_inventory.txt

while read -r file; do
    # Extract class names
    classes=$(grep -oP "export (class|interface) \K\w+" "$file" | tr '\n' ', ' | sed 's/,$//')
    echo "- \`$file\` - $classes" >> /tmp/dto_inventory.txt
done < /tmp/dto_files.txt

echo "Done. Output: /tmp/dto_inventory.txt"
```

---

### 6) Dependency Graph 생성

**도구**: madge (이미 설치됨)

```bash
#!/bin/bash
cd /home/dev/o4o-platform/apps/api-server
echo "=== Generating Dependency Graph ==="

# Check if madge is available
if ! command -v madge &> /dev/null; then
    echo "Installing madge..."
    npm install -g madge
fi

# Generate circular dependency report
echo "Checking for circular dependencies..."
madge src --circular --extensions ts,js > /tmp/circular_dependencies.txt

# Generate full dependency tree (JSON format for analysis)
madge src --json --extensions ts,js > /tmp/dependency_tree.json

# Generate image (if graphviz is installed)
if command -v dot &> /dev/null; then
    madge src --image /tmp/dependency_graph.svg --extensions ts,js
    echo "Dependency graph saved to /tmp/dependency_graph.svg"
else
    echo "Graphviz not installed - skipping image generation"
fi

echo "Done. Circular dependencies: /tmp/circular_dependencies.txt"
echo "Dependency tree: /tmp/dependency_tree.json"
```

---

## 🗂 Phase B — Controller / Service / Entity 조사

각 inventory 파일을 열고 다음 정보를 추가 조사:

### ✔ 조사 항목

1. **Controller → Route 매핑**
   - 각 Controller가 어떤 Route 파일에서 사용되는지
   - Route prefix (e.g., `/api/v2/seller`)

2. **Controller → Service 매핑**
   - 각 Controller가 어떤 Service를 호출하는지
   - Service 의존성 트리

3. **Service → Entity 매핑**
   - 각 Service가 어떤 Entity를 사용하는지
   - Repository 패턴 사용 여부

4. **Entity → Module 분류**
   - Entity가 어느 도메인/모듈에 속하는지
   - DB Relations (OneToMany/ManyToOne/ManyToMany)

5. **Module 재배치 후보**
   - 잘못된 위치의 파일 식별
   - 통합 가능한 모듈 식별

### 출력 문서

```
/docs/api-server/inventory/module_inventory.md
/docs/api-server/inventory/controller_inventory.md
/docs/api-server/inventory/service_inventory.md
/docs/api-server/inventory/entity_inventory.md
```

---

## ✳ Phase C — Route 구조 조사

`route_inventory.md`에 다음을 기록:

### ✔ 조사 항목

1. **Route 파일 목록** - 전체 라우트 파일 목록
2. **활성 vs 폐기 라우트** - 사용되는 라우트와 미사용 라우트 구분
3. **Route Prefix** - API 버전 및 모듈별 prefix (예: `/api/v2/seller`)
4. **담당 Controller** - 각 라우트를 처리하는 컨트롤러
5. **인증 요구사항** - 인증 미들웨어 사용 여부
6. **Role Guard** - 역할 기반 접근 제어
7. **Multi-instance 영향** - 멀티 인스턴스 환경에서 주의 필요한 라우트

### 출력 문서

```
/docs/api-server/inventory/route_inventory.md
```

---

## 🔀 Phase D — Module Boundary Analysis

### 작업 목표

**가장 중요한 조사 파트**

1. **모듈 간 경계 정리**
   - 명확한 모듈 경계 정의
   - 도메인별 파일 분류

2. **Cross-Import 검출**
   - 모듈 간 상호 import 검출
   - 잘못된 의존성 식별

3. **도메인 침범 코드 찾기**
   - Service가 다른 도메인의 Entity 직접 접근
   - Controller가 다른 모듈의 Service 호출

4. **Service 의존성 분석**
   - Service가 잘못된 모듈 참조하는 곳 식별

### Anti-Pattern 예시

```typescript
❌ auth → commerce (인증이 커머스를 참조하면 안 됨)
❌ customer → admin (고객이 관리자를 참조하면 안 됨)
❌ commerce → cms (커머스가 CMS를 참조하면 안 됨)
```

### 출력 문서

```
/docs/api-server/inventory/dependency_graph.md
```

Cycle이 있는 경우 Phase B에서 분리해야 함.

---

## ⚠ Phase E — Circular Dependency & 문제점 리포트

### 조사 항목

1. **Circular Dependencies**
   - Dependency graph에서 cycle 검출
   - Cycle이 발생하는 파일 쌍 식별

2. **Multi-Module Service Import**
   - Service 파일이 2개 이상의 모듈을 import하는지 체크

3. **Entity Boundary Violation**
   - Entity가 module 경계를 침범하는지 확인

4. **Direct Entity Access from Routes**
   - Route가 Entity를 directly 접근하는지 확인 (anti-pattern)

5. **Naming Mismatch**
   - Controller vs controller naming 불일치
   - File name vs Class name 불일치

6. **Orphaned Files**
   - Import되지 않는 파일 (Phase A에서 놓친 것)

### 출력 문서

```
/docs/api-server/reports/pre_phase_b_issue_report.md
```

---

## 🧾 Phase F — Summary & Phase B Design Inputs

최종적으로 아래 문서를 생성:

```
/docs/api-server/reports/pre_phase_b_summary.md
```

### 포함 내용

1. **전체 모듈 구조 요약**
   - 현재 모듈 구조 개요
   - 파일 개수, 라인 수 통계

2. **Controller/Service/Entity 구조**
   - 각 레이어별 파일 수
   - 의존성 관계 요약

3. **Route 구조 요약**
   - API 엔드포인트 개수
   - 버전별 라우트 분포

4. **Dependency/Cycle 요약**
   - 순환 의존성 개수
   - 주요 문제점 요약

5. **Phase B 설계를 위한 Actionable Insights**
   - 재배치해야 하는 모듈 목록
   - 통합 가능한 모듈 목록
   - 분리해야 하는 모듈 목록
   - NextGen 기준 적용 방안

6. **권장 모듈 구조**
   - 이상적인 모듈 구조 제안
   - 파일 배치 가이드라인

---

## 🟩 Success Criteria (DoD)

Pre-Phase B 조사는 다음 조건이 모두 충족되어야 완료된다:

- [ ] 모든 inventory 문서 생성됨 (6개)
- [ ] Dependency 그래프 생성됨
- [ ] Circular dependency 탐지 완료
- [ ] Naming 불일치 documented
- [ ] 전체 API Server 구조 시각화됨
- [ ] Phase B 설계에 필요한 정보 완비됨
- [ ] Build 성공 (조사 과정에서 코드 변경 없음)
- [ ] Pre-Phase B Summary 문서 완성
- [ ] Issue Report 문서 완성

---

## 📊 Expected Timeline

| Phase | Estimated Time | Status |
|-------|----------------|--------|
| Phase A - Automated Scans | 30분 | Pending |
| Phase B - Controller/Service/Entity Investigation | 1-2시간 | Pending |
| Phase C - Route Investigation | 1시간 | Pending |
| Phase D - Module Boundary Analysis | 2-3시간 | Pending |
| Phase E - Circular Dependency & Issues | 1-2시간 | Pending |
| Phase F - Summary & Design Inputs | 1시간 | Pending |
| **Total** | **6-9시간** | **0% Complete** |

---

## 🚀 Next Steps After Completion

Pre-Phase B 완료 후:

1. **Phase B Work Order 생성**
   - 모듈 구조 정의 작업 지시서
   - Pre-Phase B 결과를 기반으로 작성

2. **Architecture Review Meeting**
   - Pre-Phase B 결과 공유
   - Phase B 설계 방향 논의

3. **Phase B 시작**
   - Step 25 Phase B: 모듈 구조 정의
   - NextGen Architecture 적용

---

**Document Status**: ✅ Work Order Created
**Current Phase**: Phase A (Automated Scans)
**Last Updated**: 2025-12-03

