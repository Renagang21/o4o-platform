/**
 * Forum Write Shell adoption 정적 고정 — WO-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1 §14
 *
 * K-Cosmetics / GlycoPharm wrapper 가 공통 셸을 소비하고, 로컬 중복 셸이 되살아나지 않도록 고정한다.
 * (서비스 API URL · serviceKey/forum context 는 wrapper 소유로 유지)
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const WRAPPERS = [
  { name: 'K-Cosmetics', path: 'services/web-k-cosmetics/src/pages/forum/ForumWritePage.tsx', selectId: 'kcos-forum-select' },
  { name: 'GlycoPharm', path: 'services/web-glycopharm/src/pages/forum/ForumWritePage.tsx', selectId: 'gp-forum-select' },
];

describe('forum write shell adoption', () => {
  for (const w of WRAPPERS) {
    it(`${w.name} wrapper 가 공통 ForumWritePageShell + ForumWriteForm 을 사용한다`, () => {
      const src = read(w.path);
      expect(src).toContain("from '@o4o/shared-space-ui'");
      expect(src).toContain('ForumWritePageShell');
      expect(src).toContain('<ForumWritePageShell');
      expect(src).toContain('<ForumWriteForm');
    });

    it(`${w.name} wrapper 에 로컬 중복 셸이 남아있지 않다`, () => {
      const src = stripComments(read(w.path));
      // 승격 전 중복 셸의 흔적: 자체 style 시트 · 로그인 게이트 · 로딩 마크업 · 게시판 select
      expect(src).not.toContain('const styles');
      expect(src).not.toContain('CSSProperties');
      expect(src).not.toContain('<select');
      expect(src).not.toContain('loginPrompt');
    });

    it(`${w.name} wrapper 가 서비스 API 와 forum context 를 계속 소유한다`, () => {
      const src = read(w.path);
      expect(src).toContain('fetchWritableForums');
      expect(src).toContain('createForumPost');
      expect(src).toContain('updateForumPost');
      expect(src).toContain('forumId');
      expect(src).toContain(w.selectId);
    });
  }

  it('K-Cosmetics 와 GlycoPharm 의 상세 route 는 각각 유지된다', () => {
    expect(read(WRAPPERS[0].path)).toContain('/forum/post/');
    expect(read(WRAPPERS[1].path)).toContain('/forum/posts/');
  });

  it('공통 셸은 service-neutral 이다 (fetch/axios/서비스 분기 없음)', () => {
    const src = stripComments(read('packages/shared-space-ui/src/ForumWritePageShell.tsx'));
    expect(src).not.toContain('axios');
    expect(src).not.toContain('fetch(');
    expect(src).not.toContain('serviceKey');
    expect(src).not.toContain('react-router');
    expect(src).not.toMatch(/switch\s*\(\s*service/);
    expect(src).not.toMatch(/service\s*===/);
  });

  it('공통 셸이 index 에서 export 된다', () => {
    const idx = read('packages/shared-space-ui/src/index.ts');
    expect(idx).toContain("export { ForumWritePageShell } from './ForumWritePageShell';");
    expect(idx).toContain('ForumWritePageShellLabels');
  });
});
