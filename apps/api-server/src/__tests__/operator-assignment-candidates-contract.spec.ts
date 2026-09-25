/**
 * 운영자 직접 지정 — 후보 검색 응답 계약
 *   WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §5 · Smoke A
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 사고 (2026-09-25 · Smoke A 시작 직전)
 *
 *   Admin 화면의 "대상 사용자" 검색이 **항상 결과 0** 이었다. DB 에는 대상 user 가 있었고
 *   (`status=active` · `isActive=true` · email ILIKE 매치 1), 백엔드 쿼리에도 status 필터가 없었다.
 *   원인은 **응답 계약 불일치**였다:
 *
 *     backend  res.json({ success: true, data: { candidates } })
 *     frontend const raw = res.data?.data ?? [];            // → { candidates: [...] }
 *              setCandidates(Array.isArray(raw) ? raw : []) // → 배열이 아니므로 통째로 버림
 *
 *   후보가 몇 명이든 화면은 "결과 없음" 이었고, 그래서 **직접 지정 경로 자체가 막혀 있었다**.
 *   초대 경로(Smoke B)는 이 화면을 거치지 않아 정상 동작했으므로 드러나지 않았다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 spec 이 고정하는 것 (파일 텍스트만 본다 — DB · 네트워크 0)
 *
 *   C1 backend 는 `data.candidates` 로 내려보낸다.
 *   C2 frontend 는 그 키를 읽는다 — `data` 를 배열로 착각하지 않는다.
 *   C3 지정 요청은 **userId** 로 보낸다(email 은 Identity Key 가 아니다).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..', '..', '..');

const read = (p: string) => fs.readFileSync(p, 'utf-8');

/** 주석 제거 — 사고 경위를 적은 주석은 위반이 아니다. */
const codeOnly = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

const CONTROLLER = path.join(SRC, 'controllers', 'admin', 'OperatorAssignmentController.ts');
const OPERATORS_PAGE = path.join(
  REPO, 'apps', 'admin-dashboard', 'src', 'pages', 'operators', 'OperatorsPage.tsx',
);

describe('운영자 직접 지정 — 후보 검색 응답 계약', () => {
  it('대상 파일이 실재한다 (guard 가 빈 집합으로 통과하지 않는다)', () => {
    for (const f of [CONTROLLER, OPERATORS_PAGE]) {
      expect({ f, exists: fs.existsSync(f) }).toEqual({ f, exists: true });
    }
  });

  describe('C1 backend 는 data.candidates 로 내려보낸다', () => {
    const code = codeOnly(read(CONTROLLER));

    it('searchCandidates 응답이 { data: { candidates } } 다', () => {
      expect(code).toMatch(/data:\s*\{\s*candidates\s*\}/);
    });
  });

  describe('C2 frontend 는 그 키를 읽는다', () => {
    const code = codeOnly(read(OPERATORS_PAGE));

    it('candidates 키를 읽는다', () => {
      expect(code).toMatch(/candidates/);
      expect(code).toMatch(/\?\.candidates|\.candidates\s*\?\?|\.candidates\b/);
    });

    it('응답 data 를 곧바로 배열로 단정하지 않는다 (2026-09-25 회귀)', () => {
      // 사고 당시 형태: `const raw = res.data?.data ?? [];` 뒤에 Array.isArray(raw)
      // → data 는 객체이므로 항상 빈 배열이 됐다.
      expect(code).not.toMatch(/const\s+raw\s*=\s*res\.data\?\.data\s*\?\?\s*\[\]/);
    });
  });

  describe('C3 지정은 userId 로 한다', () => {
    const controller = codeOnly(read(CONTROLLER));
    const page = codeOnly(read(OPERATORS_PAGE));

    it('backend 가 userId 를 필수로 요구한다', () => {
      expect(controller).toMatch(/USER_ID_REQUIRED/);
      expect(controller).toMatch(/typeof userId !== 'string'/);
    });

    it('frontend 는 선택한 후보의 userId 를 전송한다 (email 을 지정 인자로 쓰지 않는다)', () => {
      expect(page).toMatch(/operator-assignments'/);
      expect(page).toMatch(/userId:/);
      // 지정 payload 에 email 을 넣지 않는다 — email 은 Identity Key 가 아니다.
      expect(page).not.toMatch(/operator-assignments',\s*\{[^}]*email/);
    });
  });
});
