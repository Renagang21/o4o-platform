const fs = require('fs');

const path = 'CLAUDE.md';
let content = fs.readFileSync(path, 'utf8');

const oldSection = `### 3.5 UI / Design Core 규칙 (강제)

플랫폼의 UI/디자인은 **Design Core v1.0**을 기준으로 한다.

- Design Core v1.0은 \`packages/ui\`에 정의된 코드 기준이다.
- 모든 신규 App / View / Dashboard UI는
  반드시 \`packages/ui\`의 Design Token, View Component, Layout System을 사용해야 한다.
- App 내부에서 **독자적인 디자인 시스템을 생성하는 것을 금지**한다.
- 디자인 변경은 Design Core 전용 Work Order를 통해서만 허용된다.

> ⚠ 본 규칙을 위반한 UI/디자인 변경은 **기준 위반**으로 간주한다.`;

const newSection = `### 3.5 UI / Design Core 규칙 (강제 - Phase 3 확정)

플랫폼의 UI/디자인은 **Design Core v1.0**을 기준으로 한다.

#### 3.5.1 기본 원칙

- Design Core v1.0은 \`packages/ui\`에 정의된 코드 기준이다.
- App 내부에서 **독자적인 디자인 시스템을 생성하는 것을 금지**한다.
- 디자인 변경은 Design Core 전용 Work Order를 통해서만 허용된다.

#### 3.5.2 신규 화면 규칙 (강제)

- **모든 신규 화면은 Design Core v1.0을 기본 UI로 사용**
- 신규 화면에서 default UI 생성 ❌
- 신규 화면에서 Variant 분기 ❌ (기본값이 Design Core)

#### 3.5.3 기존 화면 전환 규칙

- 기존 화면은 **Variant 방식으로만 전환**
- \`ViewVariant = 'default' | 'design-core-v1'\` 타입 사용
- 기존 UI 즉시 제거 ❌
- 암묵적 자동 전환 ❌

#### 3.5.4 확장 요청 처리

- 즉시 확장 ❌
- 별도 Work Order로만 처리 (Phase 4+)
- 서비스 요구로 임의 확장 ❌

> ⚠ 본 규칙을 위반한 UI/디자인 변경은 **기준 위반**으로 간주한다.
> 📄 상세 운영 규칙: \`docs/app-guidelines/design-core-governance.md\``;

content = content.replace(oldSection, newSection);

// Also add to template reference section
const oldTemplateSection = `| 템플릿 | 용도 |
|--------|------|
| \`work-order-standard-header.md\` | 모든 Work Order 필수 헤더 |
| \`new-service-workorder-template.md\` | 신규 서비스 생성 표준 |
| \`phase-d-new-app-checklist.md\` | 신규 앱 개발 체크리스트 |`;

const newTemplateSection = `| 템플릿 | 용도 |
|--------|------|
| \`work-order-standard-header.md\` | 모든 Work Order 필수 헤더 |
| \`new-service-workorder-template.md\` | 신규 서비스 생성 표준 |
| \`phase-d-new-app-checklist.md\` | 신규 앱 개발 체크리스트 |
| \`design-core-governance.md\` | Design Core 적용 운영 규칙 |`;

content = content.replace(oldTemplateSection, newTemplateSection);

// Update version and date
content = content.replace('*Updated: 2025-12-15*', '*Updated: 2025-12-16*');
content = content.replace('*Version: 2.0*', '*Version: 2.1*');

fs.writeFileSync(path, content);
console.log('CLAUDE.md updated successfully');
