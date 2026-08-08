/**
 * User Debug Info — SSR HTML Page
 *
 * GET /__debug__/user              → 검색 폼
 * GET /__debug__/user?email=xxx    → 결과 페이지
 *
 * WO-O4O-DEBUG-USER-JSON-PAGE-V1
 *
 * 제약:
 * - DEBUG_MODE + /__debug__/ 경로로만 접근 가능
 * - SELECT만 실행 (UPDATE/DELETE 절대 금지)
 * - 서버사이드 렌더링 (inline JS 없음)
 * - TODO: 진단 완료 후 admin only guard 추가 예정
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';

/* ── helpers ────────────────────────────────────── */

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; background: #1a1a2e; color: #e0e0e0; padding: 20px; }
  h1 { color: #00d4ff; margin-bottom: 16px; font-size: 20px; }
  h2 { color: #ffd700; margin: 24px 0 8px; font-size: 16px; border-bottom: 1px solid #333; padding-bottom: 4px; }
  .card { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: #00d4ff; padding: 4px 8px; border-bottom: 1px solid #333; }
  td { padding: 4px 8px; border-bottom: 1px solid #222; word-break: break-all; }
  .ok { color: #00ff88; } .warn { color: #ffd700; } .err { color: #ff4444; }
  pre { background: #0d1117; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; }
  form { margin-bottom: 20px; }
  input[type=text] { background: #0d1117; border: 1px solid #0f3460; color: #e0e0e0; padding: 8px 12px; border-radius: 4px; width: 320px; font-size: 14px; }
  button { background: #0f3460; color: #00d4ff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-left: 8px; }
  button:hover { background: #1a4a8a; }
  a { color: #00d4ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
  .badge-active { background: #00ff8833; color: #00ff88; }
  .badge-pending { background: #ffd70033; color: #ffd700; }
  .badge-rejected { background: #ff444433; color: #ff4444; }
  .nav { margin-bottom: 16px; font-size: 13px; }
</style>
</head><body>${body}</body></html>`;
}

function badge(status: string): string {
  const cls = status === 'active' ? 'badge-active' : status === 'pending' ? 'badge-pending' : 'badge-rejected';
  return `<span class="badge ${cls}">${esc(status)}</span>`;
}

function tableHtml(rows: Record<string, unknown>[], highlight?: string[]): string {
  if (!rows.length) return '<p style="color:#666">No data</p>';
  const keys = Object.keys(rows[0]);
  let html = '<table><tr>';
  for (const k of keys) html += `<th>${esc(k)}</th>`;
  html += '</tr>';
  for (const row of rows) {
    html += '<tr>';
    for (const k of keys) {
      const v = row[k];
      const val = v instanceof Date ? v.toISOString() : String(v ?? '');
      const cls = highlight?.includes(k) && val === 'pending' ? 'warn' : highlight?.includes(k) && val === 'active' ? 'ok' : '';
      html += `<td class="${cls}">${esc(val)}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

/* ── router ─────────────────────────────────────── */

export function createUserDebugRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (!dataSource.isInitialized) {
      res.status(503).send(page('DB Error', '<h1>Database not initialized</h1>'));
      return;
    }

    const email = (req.query.email as string)?.trim() || '';

    // ── 검색 폼 (email 없을 때) ──
    if (!email) {
      res.send(page('User Debug', `
        <h1>User Debug — O4O Platform</h1>
        <div class="card">
          <form method="GET" action="/__debug__/user">
            <label>Email: </label>
            <input type="text" name="email" placeholder="user@example.com" autofocus />
            <button type="submit">Search</button>
          </form>
        </div>
        <div class="nav">
          <a href="/__debug__/rbac-db-audit">RBAC Audit</a> |
          <a href="/__debug__/service-users?service=neture">Service Users</a>
        </div>
      `));
      return;
    }

    try {
      // 1. User
      const users = await dataSource.query(
        `SELECT * FROM users WHERE email = $1 LIMIT 1`,
        [email],
      );
      const user = users[0] || null;

      if (!user) {
        res.send(page('User Not Found', `
          <h1>User Not Found</h1>
          <div class="card">
            <p class="err">Email: <strong>${esc(email)}</strong> — 존재하지 않음</p>
          </div>
          <a href="/__debug__/user">&larr; Back</a>
        `));
        return;
      }

      // 2. Memberships — SELECT * 로 컬럼 에러 방지
      const memberships = await dataSource.query(
        `SELECT * FROM service_memberships WHERE user_id = $1 ORDER BY created_at DESC`,
        [user.id],
      );

      // 3. Role Assignments — SELECT * 로 컬럼 에러 방지
      const roles = await dataSource.query(
        `SELECT * FROM role_assignments WHERE user_id = $1 ORDER BY is_active DESC, role`,
        [user.id],
      );

      // 4. KPA activation chain — pharmacy_owner auto-activation 진단용 (read-only)
      //   member.controller.ts:555-619 의 trigger 조건:
      //     oldStatus=pending → newStatus=active + kpa_members.activity_type='pharmacy_owner'
      //     + users.businessInfo.businessNumber + (businessName OR pharmacy_name)
      //   → ensureOrganization(code=kpa-pharm-{bizno}) + organization_members(owner) + role_assignments(kpa:store_owner)
      const kpaMembers = await dataSource.query(
        `SELECT * FROM kpa_members WHERE user_id = $1`,
        [user.id],
      );
      const pharmacistProfile = await dataSource.query(
        `SELECT * FROM kpa_pharmacist_profiles WHERE user_id = $1`,
        [user.id],
      );
      const orgMembers = await dataSource.query(
        `SELECT om.*, o.name AS organization_name, o.code AS organization_code, o.type AS organization_type
         FROM organization_members om
         LEFT JOIN organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1
         ORDER BY om.created_at DESC`,
        [user.id],
      );
      // businessNumber 에서 digits 만 추출하여 expected org code 로 lookup
      const biz = (user.businessInfo && typeof user.businessInfo === 'object')
        ? (user.businessInfo as Record<string, any>)
        : {};
      const rawBizNum: string = typeof biz.businessNumber === 'string' ? biz.businessNumber : '';
      const bizNumDigits = rawBizNum.replace(/[^0-9]/g, '');
      const expectedOrgCode = bizNumDigits.length > 0 ? `kpa-pharm-${bizNumDigits}` : null;
      const expectedOrg = expectedOrgCode
        ? await dataSource.query(
            `SELECT id, code, name, type, "isActive", "createdAt" FROM organizations WHERE code = $1 LIMIT 1`,
            [expectedOrgCode],
          )
        : [];

      // 5. Summary
      const activeRoles = roles.filter((r: any) => r.is_active).map((r: any) => r.role);
      const hasPending = memberships.some((m: any) => m.status === 'pending');

      // Activation chain 진단
      const kpaMember = kpaMembers[0] || null;
      const profile = pharmacistProfile[0] || null;
      const kmActivityType: string | null = kpaMember?.activity_type || null;
      const ppActivityType: string | null = profile?.activity_type || null;
      const hasStoreOwnerRole = activeRoles.includes('kpa:store_owner');
      const orgMemberOwner = orgMembers.find((om: any) => om.role === 'owner') || null;
      const expectedOrgRow = expectedOrg[0] || null;
      const activationChain = {
        step1_users_businessInfo_businessNumber: bizNumDigits || '(empty)',
        step1_users_businessInfo_businessName: typeof biz.businessName === 'string' ? biz.businessName : '(empty)',
        step2_kpa_members_activity_type: kmActivityType || '(null)',
        step2_kpa_pharmacist_profiles_activity_type: ppActivityType || '(null)',
        step3_expected_org_code: expectedOrgCode || '(no bizno)',
        step3_expected_org_exists: !!expectedOrgRow,
        step3_expected_org_id: expectedOrgRow?.id || null,
        step4_organization_members_owner_row: !!orgMemberOwner,
        step4_organization_members_owner_org_id: orgMemberOwner?.organization_id || null,
        step5_role_assignment_kpa_store_owner: hasStoreOwnerRole,
      };

      // 6. Raw JSON (복사용)
      const rawJson = JSON.stringify({
        user,
        memberships,
        roles,
        kpa_members: kpaMembers,
        kpa_pharmacist_profiles: pharmacistProfile,
        organization_members: orgMembers,
        expected_organization: expectedOrgRow,
        activation_chain_diagnosis: activationChain,
      }, null, 2);

      // 6. HTML 렌더링
      const body = `
        <h1>User Debug — ${esc(email)}</h1>
        <div class="nav">
          <a href="/__debug__/user">&larr; Back to Search</a> |
          <a href="/__debug__/user/sync-role?email=${encodeURIComponent(email)}" style="color:#00ff88">Sync Roles from Memberships</a> |
          <a href="/__debug__/user/missing-roles?service=neture">Missing Roles (Neture)</a>
        </div>

        <h2>Summary</h2>
        <div class="card">
          <table>
            <tr><th>항목</th><th>값</th></tr>
            <tr><td>User ID</td><td>${esc(user.id)}</td></tr>
            <tr><td>Email</td><td>${esc(user.email)}</td></tr>
            <tr><td>Name</td><td>${esc(user.name || user.firstName || '')}</td></tr>
            <tr><td>Status</td><td>${badge(user.status || 'unknown')}${
              user.status !== 'active'
                ? ` <a href="/__debug__/user/activate?email=${encodeURIComponent(email)}" style="color:#ff8800;margin-left:8px;">[Activate]</a>`
                : ''
            }</td></tr>
            <tr><td>isActive</td><td class="${user.isActive ? 'ok' : 'err'}">${user.isActive}</td></tr>
            <tr><td>Memberships</td><td>${memberships.length}개</td></tr>
            <tr><td>Active Roles</td><td class="ok">${activeRoles.join(', ') || 'none'}</td></tr>
            <tr><td>Has Pending</td><td class="${hasPending ? 'warn' : 'ok'}">${hasPending}</td></tr>
            <tr><td>Created</td><td>${esc(user.createdAt)}</td></tr>
            <tr><td>Last Login</td><td>${esc(user.lastLoginAt || 'never')}</td></tr>
          </table>
        </div>

        <h2>Service Memberships (${memberships.length})</h2>
        <div class="card">${tableHtml(memberships, ['status'])}</div>

        <h2>Role Assignments (${roles.length})</h2>
        <div class="card">${tableHtml(roles, ['is_active'])}</div>

        <h2>KPA Pharmacy Owner Activation Chain</h2>
        <div class="card">
          <table>
            <tr><th>Step</th><th>Field</th><th>Value</th></tr>
            <tr><td>1</td><td>users.businessInfo.businessNumber (digits)</td><td>${esc(activationChain.step1_users_businessInfo_businessNumber)}</td></tr>
            <tr><td>1</td><td>users.businessInfo.businessName</td><td>${esc(activationChain.step1_users_businessInfo_businessName)}</td></tr>
            <tr><td>2</td><td>kpa_members.activity_type</td><td class="${kmActivityType === 'pharmacy_owner' ? 'ok' : 'warn'}">${esc(activationChain.step2_kpa_members_activity_type)}</td></tr>
            <tr><td>2</td><td>kpa_pharmacist_profiles.activity_type</td><td class="${ppActivityType === 'pharmacy_owner' ? 'ok' : 'warn'}">${esc(activationChain.step2_kpa_pharmacist_profiles_activity_type)}</td></tr>
            <tr><td>3</td><td>expected org code</td><td>${esc(activationChain.step3_expected_org_code)}</td></tr>
            <tr><td>3</td><td>organizations row exists</td><td class="${activationChain.step3_expected_org_exists ? 'ok' : 'err'}">${activationChain.step3_expected_org_exists}</td></tr>
            <tr><td>4</td><td>organization_members(role=owner)</td><td class="${activationChain.step4_organization_members_owner_row ? 'ok' : 'err'}">${activationChain.step4_organization_members_owner_row}</td></tr>
            <tr><td>5</td><td>role_assignments(kpa:store_owner)</td><td class="${activationChain.step5_role_assignment_kpa_store_owner ? 'ok' : 'err'}">${activationChain.step5_role_assignment_kpa_store_owner}</td></tr>
          </table>
        </div>

        <h2>kpa_members (${kpaMembers.length})</h2>
        <div class="card">${tableHtml(kpaMembers)}</div>

        <h2>kpa_pharmacist_profiles (${pharmacistProfile.length})</h2>
        <div class="card">${tableHtml(pharmacistProfile)}</div>

        <h2>organization_members (${orgMembers.length})</h2>
        <div class="card">${tableHtml(orgMembers)}</div>

        <h2>expected organization (code=${esc(expectedOrgCode || 'n/a')})</h2>
        <div class="card">${expectedOrgRow ? tableHtml([expectedOrgRow]) : '<p class="warn">존재하지 않음</p>'}</div>

        <h2>Raw JSON (복사용)</h2>
        <div class="card"><pre>${esc(rawJson)}</pre></div>
      `;

      res.send(page(`Debug: ${email}`, body));
    } catch (error: any) {
      console.error('DEBUG USER ERROR:', error);
      res.status(500).send(page('Error', `
        <h1 class="err">Error</h1>
        <div class="card"><pre>${esc(error.message)}\n\n${esc(error.stack)}</pre></div>
        <a href="/__debug__/user">&larr; Back</a>
      `));
    }
  });

  // ── 상태 변경 핸들러 제거됨 (WO-O4O-DEBUG-ROUTE-LIFECYCLE-AND-GUARDRAIL-CLEANUP-V1) ──
  // GET /activate · GET /sync-role 은 GET 으로 users.status 와 role_assignments 를
  // 변경했다. 상태 변경은 GET 으로 하지 않으며, 사용자 상태·역할의 정식 경로는
  // AdminUserController(관리자 API) 다. 이 라우터는 읽기 전용 진단으로만 유지한다.

  // ── Missing Roles: 활성 멤버십 있지만 role_assignment 없는 Neture 공급자 진단 ──
  // GET /__debug__/user/missing-roles?service=neture
  router.get('/missing-roles', async (req: Request, res: Response): Promise<void> => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (!dataSource.isInitialized) {
      res.status(503).send(page('DB Error', '<h1>Database not initialized</h1>'));
      return;
    }

    const serviceKey = (req.query.service as string)?.trim() || 'neture';

    try {
      const rows = await dataSource.query(
        `SELECT u.id, u.email, u.status, sm.role AS sm_role, sm.status AS sm_status,
                ARRAY_AGG(ra.role) FILTER (WHERE ra.is_active = true) AS active_roles
         FROM users u
         JOIN service_memberships sm ON sm.user_id = u.id AND sm.service_key = $1 AND sm.status = 'active'
         LEFT JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
         GROUP BY u.id, u.email, u.status, sm.role, sm.status
         HAVING ARRAY_AGG(ra.role) FILTER (WHERE ra.is_active = true) IS NULL
            OR NOT (sm.role = ANY(ARRAY_AGG(ra.role) FILTER (WHERE ra.is_active = true)))
         ORDER BY u.email`,
        [serviceKey],
      );

      const rowsHtml = rows.map((r: any) =>
        `<tr>
          <td>${esc(r.email)}</td>
          <td>${esc(r.status)}</td>
          <td>${esc(r.sm_role)}</td>
          <td>${esc((r.active_roles || []).join(', ') || 'none')}</td>
          <td>
            <a href="/__debug__/user?email=${encodeURIComponent(r.email)}">View</a> |
            <a href="/__debug__/user/sync-role?email=${encodeURIComponent(r.email)}" style="color:#00ff88">Sync</a>
          </td>
        </tr>`
      ).join('');

      res.send(page('Missing Roles', `
        <h1>Missing Role Assignments — service: ${esc(serviceKey)}</h1>
        <p style="color:#888;margin-bottom:16px">활성 service_membership 있지만 matching role_assignment가 없는 사용자</p>
        <div class="card">
          <table>
            <tr><th>Email</th><th>User Status</th><th>Membership Role</th><th>Active RA Roles</th><th>Actions</th></tr>
            ${rows.length ? rowsHtml : '<tr><td colspan="5" class="ok">No missing roles found</td></tr>'}
          </table>
        </div>
        <div class="nav">
          <a href="/__debug__/user">&larr; User Search</a>
        </div>
      `));
    } catch (error: any) {
      console.error('DEBUG MISSING-ROLES ERROR:', error);
      res.status(500).send(page('Error', `
        <h1 class="err">Query Failed</h1>
        <div class="card"><pre>${esc(error.message)}\n\n${esc(error.stack)}</pre></div>
      `));
    }
  });

  return router;
}
