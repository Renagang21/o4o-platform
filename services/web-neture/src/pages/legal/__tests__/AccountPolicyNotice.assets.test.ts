import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
it.each([
 ['DESIGN-NETURE-ACCOUNT-TERMS-V2.md', '## 부칙 및 게시 전 대조', 'neture-account-terms-v2.md'],
 ['DESIGN-NETURE-ACCOUNT-PRIVACY-V2.md', '## 9. 게시 대조 기록', 'neture-account-privacy-v2.md'],
 ['DESIGN-NETURE-SERVICE-POLICY-BODIES-V2.md', '## 내부 게시·적용 대조', 'service-policies-v2.md'],
])('public notice asset %s matches the reviewed draft and is included in Docker service COPY', (draft, end, asset) => {
 const root = process.cwd();
 const expected = readFileSync(resolve(root, 'docs/design', draft), 'utf8').split(end)[0].split('\n').filter(line => !line.startsWith('>') && !line.startsWith('# ')).join('\n').trim();
 const content = readFileSync(resolve(root, 'services/web-neture/src/content/legal', asset), 'utf8');
 expect(content.trim()).toBe(expected); expect(content).not.toContain('DRAFT');
 const page = readFileSync(resolve(root, 'services/web-neture/src/pages/legal/AccountPolicyNoticePage.tsx'), 'utf8');
 expect(page).toContain(`../../content/legal/${asset}?raw`); expect(page).not.toContain('../../../../../docs/');
 expect(readFileSync(resolve(root, 'services/web-neture/Dockerfile'), 'utf8')).toMatch(/COPY services\/web-neture\//);
});
