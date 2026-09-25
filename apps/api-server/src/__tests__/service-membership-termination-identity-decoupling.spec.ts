/**
 * 서비스 관계 종료 ↔ 전역 Identity 분리
 *   WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 불변식
 *
 *   **서비스와의 관계가 0개가 되어도 O4O User Identity 는 존재할 수 있다.**
 *
 *   `users.status='deleted'` · `users.isActive=false` 는 **명시적인 플랫폼 정지/탈퇴 경로**
 *   (관리자 계정 관리)에서만 발생해야 하며, **서비스 membership 종료의 부수효과로 발생해서는 안 된다.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 사고 (2026-09-25 실측)
 *
 *   테스트 계정(membership 1개)의 membership 을 회수하려 하자 아래 경로들이
 *   `UPDATE users SET status='deleted', "isActive"=false` 를 실행했다.
 *   `requireAuth` 가 매 요청 `users.isActive` 를 검사하므로 **Google 로그인까지 차단**됐다.
 *
 *     ① MembershipApprovalService hard delete STEP H4 — 남은 membership 0 이면 비활성화
 *     ② MembershipApprovalService soft delete — platform admin 분기
 *     ③ KPA member.controller hard delete — 같은 패턴
 *
 *   특히 ② 는 **요청자가 super_admin 이라는 이유만으로** 서비스 콘솔의 "탈퇴 처리" 가
 *   계정 탈퇴로 승격되는 구조였다.
 *
 * 이 spec 은 세 경로의 **부재**를 텍스트로 고정한다(DB · 네트워크 0).
 * 명시적 플랫폼 경로는 반대로 **존재**를 고정해, 이번 정리가 "계정 정지 기능 삭제" 로
 * 번지지 않았음을 함께 증명한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(p, 'utf-8');

/** 주석 제거 — 사고 경위를 적은 주석은 위반이 아니다. */
const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

const APPROVAL = path.join(SRC, 'services', 'approval', 'MembershipApprovalService.ts');
const KPA_MEMBER = path.join(SRC, 'routes', 'kpa', 'controllers', 'member.controller.ts');
const ADMIN_USER = path.join(SRC, 'controllers', 'admin', 'AdminUserController.ts');
const PLATFORM_ACCOUNTS = path.join(SRC, 'routes', 'admin', 'platform-accounts.routes.ts');

/** users 를 비활성화하는 write (SQL · entity 양쪽) */
const DEACTIVATE_SQL = /UPDATE\s+users\s+SET[^`]*status\s*=\s*'deleted'/i;

describe('서비스 관계 종료는 전역 Identity 를 건드리지 않는다', () => {
  it('대상 파일이 실재한다 (guard 가 빈 집합으로 통과하지 않는다)', () => {
    for (const f of [APPROVAL, KPA_MEMBER, ADMIN_USER, PLATFORM_ACCOUNTS]) {
      expect({ f, exists: fs.existsSync(f) }).toEqual({ f, exists: true });
    }
  });

  it('codeOnly 가 주석만 지운다 (guard 무력화 방지)', () => {
    const fixture = [
      "// UPDATE users SET status = 'deleted'",
      "/* UPDATE users SET status = 'deleted' */",
      "await q(`UPDATE users SET status = 'deleted' WHERE id = $1`);",
    ].join('\n');
    const out = codeOnly(fixture);
    expect(out.match(/UPDATE users/g) ?? []).toHaveLength(1);
    expect(DEACTIVATE_SQL.test(out)).toBe(true);
  });

  describe('membership 종료 경로에 users 비활성화가 없다', () => {
    it('MembershipApprovalService — hard/soft 어느 분기에도 없다', () => {
      const code = codeOnly(read(APPROVAL));
      expect(DEACTIVATE_SQL.test(code)).toBe(false);
      // membership 종료 자체는 그대로 살아 있어야 한다(기능을 지운 것이 아니다).
      expect(code).toMatch(/DELETE FROM service_memberships/);
      expect(code).toMatch(/UPDATE service_memberships SET status = 'withdrawn'/);
    });

    it('KPA member.controller — hard delete 에 없다', () => {
      const code = codeOnly(read(KPA_MEMBER));
      expect(DEACTIVATE_SQL.test(code)).toBe(false);
      // KPA 관계 종료는 유지
      expect(code).toMatch(/DELETE FROM role_assignments WHERE user_id = \$1 AND role LIKE 'kpa:%'/);
    });

    it('활성 runtime 전체에 membership 유래 users 비활성화가 없다', () => {
      // 세 지점 외에 같은 패턴이 다른 곳에 남아 있지 않은지 전수로 본다.
      const walk = (dir: string, out: string[] = []): string[] => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            if (/(^|[\\/])(__tests__|migrations|node_modules|dist)([\\/]|$)/.test(full)) continue;
            walk(full, out);
          } else if (full.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(full)) {
            out.push(full);
          }
        }
        return out;
      };
      const files = walk(SRC);
      expect(files.length).toBeGreaterThan(500);
      const offenders = files.filter((f) => DEACTIVATE_SQL.test(codeOnly(read(f))));
      expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
    });
  });

  describe('호출부는 대상 서비스를 명시한다 (Authorization capability != Mutation target scope)', () => {
    /**
     * 서버는 `serviceKey` 없는 종료 요청을 400 으로 거부한다(fail-closed).
     * 그러므로 **호출부가 빠뜨리면 기능이 죽는다** — 새 호출부가 생기면 여기서 먼저 깨지게 고정한다.
     * role 해제(`/roles/:role`) 와 위험 조회(`/delete-risk`) 는 대상이 이미 특정돼 있어 제외한다.
     */
    const REPO = path.resolve(SRC, '..', '..', '..');

    const collectFrontend = (): string[] => {
      const out: string[] = [];
      const walk = (dir: string) => {
        if (!fs.existsSync(dir)) return;
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) {
            if (/(^|[\\/])(node_modules|dist|build|\.next|coverage)([\\/]|$)/.test(full)) continue;
            walk(full);
          } else if (/\.(ts|tsx)$/.test(full) && !/\.(spec|test)\.tsx?$/.test(full)) {
            out.push(full);
          }
        }
      };
      for (const top of ['services', 'packages']) walk(path.join(REPO, top));
      return out;
    };

    it('DELETE /operator/members/:id 호출에 serviceKey 가 빠진 곳이 없다', () => {
      const files = collectFrontend();
      // 가드가 빈 집합으로 통과하지 않도록 최소 규모를 함께 고정한다.
      expect(files.length).toBeGreaterThan(200);

      const offenders: string[] = [];
      for (const f of files) {
        const flat = codeOnly(read(f)).replace(/\s+/g, ' ');
        const re = /\.delete\(\s*`([^`]*operator\/members\/[^`]*)`/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(flat)) !== null) {
          const url = m[1];
          if (/\/roles\//.test(url) || /delete-risk/.test(url)) continue;
          if (!/serviceKey/.test(url)) offenders.push(`${path.relative(REPO, f)} :: ${url}`);
        }
      }
      expect(offenders).toEqual([]);
    });

    it('실제 종료 호출부를 찾아내고 있다 (정규식이 죽지 않았다)', () => {
      const hits = collectFrontend().filter((f) =>
        /\.delete\(\s*`[^`]*operator\/members\//.test(codeOnly(read(f)).replace(/\s+/g, ' ')),
      );
      expect(hits.length).toBeGreaterThan(0);
    });
  });

  describe('명시적 플랫폼 계정 관리 경로는 살아 있다', () => {
    it('관리자 화면의 상태 변경이 남아 있다', () => {
      const code = codeOnly(read(ADMIN_USER));
      expect(code).toMatch(/user\.status\s*=\s*status/);
      expect(code).toMatch(/user\.isActive\s*=\s*isActive/);
    });

    it('platform-accounts 의 활성 토글이 남아 있다', () => {
      expect(codeOnly(read(PLATFORM_ACCOUNTS))).toMatch(/user\.isActive\s*=\s*isActive/);
    });
  });
});
