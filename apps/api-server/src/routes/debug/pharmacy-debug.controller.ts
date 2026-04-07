/**
 * Pharmacy Debug — SSR HTML Page
 *
 * GET /__debug__/pharmacy           → 약국 목록 (organizations + glycopharm_pharmacies)
 * GET /__debug__/pharmacy/deactivate?id=xxx → 비활성화 (isActive=false)
 *
 * 임시 운영 도구 — 깨진 데이터 정리용
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font:14px/1.6 monospace;max-width:900px;margin:2em auto;padding:0 1em}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}
.warn{color:red;font-weight:bold}a{color:#0066cc}</style>
</head><body>${body}</body></html>`;
}

export function createPharmacyDebugRouter(dataSource: DataSource): Router {
  const router = Router();

  // GET / — 약국 목록
  router.get('/', async (_req, res) => {
    try {
      const rows = await dataSource.query(`
        SELECT
          o.id,
          o.name AS org_name,
          gp.name AS gp_name,
          o."isActive",
          o."createdAt",
          COALESCE(pc.cnt, 0)::int AS patient_count
        FROM organizations o
        JOIN organization_service_enrollments e
          ON e.organization_id = o.id
          AND e.service_code = 'glycopharm'
          AND e.status = 'active'
        LEFT JOIN glycopharm_pharmacies gp ON gp.id = o.id
        LEFT JOIN (
          SELECT organization_id, COUNT(*)::int AS cnt
          FROM glucoseview_customers
          GROUP BY organization_id
        ) pc ON pc.organization_id = o.id
        ORDER BY o."createdAt"
      `);

      const tableRows = rows.map((r: any) => `<tr>
        <td>${esc(r.id)}</td>
        <td>${esc(r.org_name)}</td>
        <td>${esc(r.gp_name)}</td>
        <td>${r.isActive ? 'YES' : '<span class="warn">NO</span>'}</td>
        <td>${r.patient_count}</td>
        <td>${esc(r.created_at)}</td>
        <td>${r.isActive ? `<a href="/__debug__/pharmacy/deactivate?id=${esc(r.id)}">비활성화</a>` : '-'}</td>
      </tr>`).join('\n');

      res.send(page('Pharmacy Debug', `
        <h1>GlycoPharm 약국 목록</h1>
        <p>총 ${rows.length}개</p>
        <table>
          <tr><th>ID</th><th>Org Name</th><th>GP Name</th><th>Active</th><th>Patients</th><th>Created</th><th>Action</th></tr>
          ${tableRows}
        </table>
        <p><a href="/__debug__/pharmacy">새로고침</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  // GET /deactivate?id=xxx — 비활성화 확인 페이지
  router.get('/deactivate', async (req, res) => {
    const id = req.query.id as string;
    if (!id) return res.status(400).send(page('Error', 'id 파라미터 필요'));

    try {
      const rows = await dataSource.query(
        `SELECT id, name, "isActive" FROM organizations WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) return res.status(404).send(page('Not Found', '해당 조직 없음'));

      const org = rows[0];
      res.send(page('비활성화 확인', `
        <h1>약국 비활성화</h1>
        <p><strong>ID:</strong> ${esc(org.id)}</p>
        <p><strong>Name:</strong> ${esc(org.name)}</p>
        <p><strong>Active:</strong> ${org.isActive ? 'YES' : 'NO'}</p>
        <form method="POST" action="/__debug__/pharmacy/deactivate">
          <input type="hidden" name="id" value="${esc(id)}" />
          <button type="submit" style="background:red;color:white;padding:8px 16px;border:none;cursor:pointer">
            비활성화 실행
          </button>
        </form>
        <p><a href="/__debug__/pharmacy">← 돌아가기</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  // POST /deactivate — 실제 비활성화
  router.post('/deactivate', async (req, res) => {
    const id = req.body?.id as string;
    if (!id) return res.status(400).send(page('Error', 'id 파라미터 필요'));

    try {
      await dataSource.query(
        `UPDATE organizations SET "isActive" = false WHERE id = $1`,
        [id],
      );
      // Also deactivate enrollment
      await dataSource.query(
        `UPDATE organization_service_enrollments SET status = 'inactive' WHERE organization_id = $1 AND service_code = 'glycopharm'`,
        [id],
      );

      res.send(page('완료', `
        <h1>비활성화 완료</h1>
        <p>Organization <strong>${esc(id)}</strong> 비활성화됨</p>
        <p><a href="/__debug__/pharmacy">← 목록으로</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  // GET /lookup?q=최고 — '최고약국' 미노출 원인 실측
  // WO-O4O-GLYCOPHARM-PHARMACY-SEARCH-DEBUG-MEASUREMENT-V1
  router.get('/lookup', async (req, res) => {
    const q = (req.query.q as string) || '';
    if (!q.trim()) {
      res.send(page('Pharmacy Lookup', `
        <h1>Pharmacy Search Lookup (실측)</h1>
        <p>WO-O4O-GLYCOPHARM-PHARMACY-SEARCH-DEBUG-MEASUREMENT-V1</p>
        <form method="GET">
          <p>검색 키워드 (organization_name / applicant_name 부분일치):</p>
          <input name="q" placeholder="최고" style="width:300px;padding:4px" />
          <button type="submit" style="padding:6px 16px;background:#0066cc;color:white;border:none;cursor:pointer">조회</button>
        </form>
        <p>예: <a href="/__debug__/pharmacy/lookup?q=최고">/__debug__/pharmacy/lookup?q=최고</a></p>
      `));
      return;
    }

    const like = `%${q}%`;
    const result: Record<string, any> = { keyword: q };

    try {
      // 1. glycopharm_applications
      result.applications = await dataSource.query(
        `SELECT id, status, organization_name, applicant_name, user_id, created_at, reviewed_at
         FROM glycopharm_applications
         WHERE organization_name ILIKE $1 OR applicant_name ILIKE $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [like],
      );

      // 2. organizations
      result.organizations = await dataSource.query(
        `SELECT id, name, "isActive", "createdAt"
         FROM organizations
         WHERE name ILIKE $1
         ORDER BY "createdAt" DESC
         LIMIT 20`,
        [like],
      );

      const orgIds: string[] = result.organizations.map((o: any) => o.id);

      // 3. organization_service_enrollments (해당 organizations 기준)
      if (orgIds.length > 0) {
        result.enrollments = await dataSource.query(
          `SELECT organization_id, service_code, status, created_at
           FROM organization_service_enrollments
           WHERE organization_id = ANY($1::uuid[])
           ORDER BY organization_id, service_code`,
          [orgIds],
        );

        // 4. glycopharm_pharmacies
        result.glycopharm_pharmacies = await dataSource.query(
          `SELECT id, name FROM glycopharm_pharmacies WHERE id = ANY($1::uuid[])`,
          [orgIds],
        );
      } else {
        result.enrollments = [];
        result.glycopharm_pharmacies = [];
      }

      // 5. 환자 검색 SoR 실제 쿼리 — 키워드와 무관하게 노출되는지 확인
      result.patient_search_includes_keyword = await dataSource.query(
        `SELECT
           o.id,
           COALESCE(gp.name, o.name) AS displayed_name,
           o.name AS org_name,
           gp.name AS gp_name,
           o."isActive" AS org_active,
           e.status AS enrollment_status
         FROM organizations o
         JOIN organization_service_enrollments e
           ON e.organization_id = o.id
           AND e.service_code = 'glycopharm'
           AND e.status = 'active'
         LEFT JOIN glycopharm_pharmacies gp ON gp.id = o.id
         WHERE o."isActive" = true
           AND (o.name ILIKE $1 OR gp.name ILIKE $1)
         ORDER BY COALESCE(gp.name, o.name)`,
        [like],
      );

      // 6. 시나리오 자동 판정
      const scenarios: string[] = [];
      if (result.applications.length === 0) {
        scenarios.push('A0: glycopharm_applications에 해당 row가 없음 (가입 자체가 안 들어감)');
      } else {
        const approved = result.applications.filter((a: any) => a.status === 'approved');
        if (approved.length === 0) {
          scenarios.push(`A1: application이 있으나 approved 없음 (현재 상태: ${result.applications.map((a: any) => a.status).join(', ')})`);
        }
      }
      if (result.organizations.length === 0) {
        scenarios.push('B: organizations row 없음 (승인 핸들러가 organization 생성 단계까지 못 갔음)');
      }
      const inactiveOrgs = result.organizations.filter((o: any) => !o.isActive);
      if (inactiveOrgs.length > 0) {
        scenarios.push(`C: organizations.isActive=false 인 row 존재 (${inactiveOrgs.length}건)`);
      }
      if (orgIds.length > 0) {
        const glycoEnrolls = (result.enrollments as any[]).filter((e) => e.service_code === 'glycopharm');
        if (glycoEnrolls.length === 0) {
          scenarios.push('D: 해당 organization에 service_code=glycopharm enrollment가 없음');
        } else {
          const inactiveEnrolls = glycoEnrolls.filter((e) => e.status !== 'active');
          if (inactiveEnrolls.length > 0) {
            scenarios.push(`E: enrollment.status가 active 아님 (${inactiveEnrolls.map((e) => e.status).join(', ')})`);
          }
        }
        if (result.glycopharm_pharmacies.length === 0) {
          scenarios.push('F: glycopharm_pharmacies row 없음 → COALESCE로 organizations.name fallback (이름 불일치 가능성)');
        }
      }
      if (result.patient_search_includes_keyword.length > 0) {
        scenarios.push('G: 환자 검색 SoR에는 키워드 매칭 결과가 존재함 → "검색 안 됨" 증상의 원인은 backend가 아니라 프론트 검색/필터일 수 있음');
      } else if (orgIds.length > 0) {
        scenarios.push('H: organizations는 있으나 환자 검색 SoR JOIN 결과는 0건 → enrollment.status 또는 isActive에서 탈락');
      }
      result.scenarios = scenarios.length > 0 ? scenarios : ['판정 불가 — 데이터 없음'];

      res.send(page('Pharmacy Lookup', `
        <h1>Pharmacy Search Lookup: <code>${esc(q)}</code></h1>
        <p>WO-O4O-GLYCOPHARM-PHARMACY-SEARCH-DEBUG-MEASUREMENT-V1</p>

        <h2>시나리오 자동 판정</h2>
        <ul>${result.scenarios.map((s: string) => `<li>${esc(s)}</li>`).join('')}</ul>

        <h2>1. glycopharm_applications (${result.applications.length})</h2>
        <pre>${esc(JSON.stringify(result.applications, null, 2))}</pre>

        <h2>2. organizations (${result.organizations.length})</h2>
        <pre>${esc(JSON.stringify(result.organizations, null, 2))}</pre>

        <h2>3. organization_service_enrollments (${result.enrollments.length})</h2>
        <pre>${esc(JSON.stringify(result.enrollments, null, 2))}</pre>

        <h2>4. glycopharm_pharmacies (${result.glycopharm_pharmacies.length})</h2>
        <pre>${esc(JSON.stringify(result.glycopharm_pharmacies, null, 2))}</pre>

        <h2>5. 환자 검색 SoR 실제 쿼리 결과 (${result.patient_search_includes_keyword.length})</h2>
        <pre>${esc(JSON.stringify(result.patient_search_includes_keyword, null, 2))}</pre>

        <p><a href="/__debug__/pharmacy/lookup">← 다시 조회</a> | <a href="/__debug__/pharmacy">전체 약국 목록</a></p>
      `));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre><pre>${esc(JSON.stringify(result, null, 2))}</pre>`));
    }
  });

  // GET /care-data — 환자별 health_readings + glucoseview_customers 진단
  router.get('/care-data', async (req, res) => {
    const email = req.query.email as string;
    const gcId = req.query.gcId as string;
    if (!email && !gcId) {
      res.send(page('Care Data Debug', `
        <h1>Care 데이터 진단</h1>
        <form method="GET">
          <p>환자 이메일: <input name="email" placeholder="patient1@o4o.com" style="width:300px;padding:4px" /></p>
          <p>또는 glucoseview_customers.id: <input name="gcId" placeholder="c57abb40-..." style="width:300px;padding:4px" /></p>
          <button type="submit" style="padding:6px 16px;background:#0066cc;color:white;border:none;cursor:pointer">조회</button>
        </form>
      `));
      return;
    }

    try {
      // 1. users 조회
      let userRows: any[] = [];
      if (email) {
        userRows = await dataSource.query(`SELECT id, email, name, status FROM users WHERE email = $1`, [email]);
      }

      // 2. glucoseview_customers 조회
      let gcRows: any[] = [];
      if (gcId) {
        gcRows = await dataSource.query(`SELECT id, user_id, organization_id, name, email FROM glucoseview_customers WHERE id = $1`, [gcId]);
        if (gcRows.length > 0 && gcRows[0].user_id) {
          userRows = await dataSource.query(`SELECT id, email, name, status FROM users WHERE id = $1`, [gcRows[0].user_id]);
        }
      } else if (userRows.length > 0) {
        gcRows = await dataSource.query(`SELECT id, user_id, organization_id, name, email FROM glucoseview_customers WHERE user_id = $1 OR email = $2`, [userRows[0].id, email]);
      }

      const userId = userRows[0]?.id || null;
      const gcCustomerId = gcRows[0]?.id || null;
      const orgId = gcRows[0]?.organization_id || null;

      // 3. health_readings 조회
      let readings: any[] = [];
      if (userId) {
        readings = await dataSource.query(
          `SELECT id, patient_id, pharmacy_id, metric_type, value_numeric, source_type, measured_at, metadata
           FROM health_readings WHERE patient_id = $1 ORDER BY measured_at DESC LIMIT 20`, [userId]);
      }
      // patient_id = glucoseview_customers.id 로 저장된 건도 조회
      let readingsByGcId: any[] = [];
      if (gcCustomerId && gcCustomerId !== userId) {
        readingsByGcId = await dataSource.query(
          `SELECT id, patient_id, pharmacy_id, metric_type, value_numeric, source_type, measured_at, metadata
           FROM health_readings WHERE patient_id = $1 ORDER BY measured_at DESC LIMIT 20`, [gcCustomerId]);
      }

      const body = `
        <h1>Care 데이터 진단</h1>
        <h2>1. users</h2>
        <pre>${esc(JSON.stringify(userRows, null, 2))}</pre>
        <p><strong>users.id:</strong> ${esc(userId)}</p>

        <h2>2. glucoseview_customers</h2>
        <pre>${esc(JSON.stringify(gcRows, null, 2))}</pre>
        <p><strong>gc.id:</strong> ${esc(gcCustomerId)}</p>
        <p><strong>gc.user_id:</strong> ${esc(gcRows[0]?.user_id)}</p>
        <p><strong>gc.organization_id:</strong> ${esc(orgId)}</p>
        <p style="color:${gcRows[0]?.user_id === userId ? 'green' : 'red'}">
          user_id == users.id: <strong>${gcRows[0]?.user_id === userId ? 'MATCH' : 'MISMATCH'}</strong>
        </p>

        <h2>3. health_readings (patient_id = users.id: ${esc(userId)})</h2>
        <p>${readings.length}건</p>
        <pre>${esc(JSON.stringify(readings.map(r => ({
          id: r.id,
          patient_id: r.patient_id,
          pharmacy_id: r.pharmacy_id,
          metric: r.metric_type,
          value: r.value_numeric,
          source: r.source_type,
          measured_at: r.measured_at,
        })), null, 2))}</pre>

        ${readingsByGcId.length > 0 ? `
        <h2 style="color:red">4. health_readings (patient_id = gc.id: ${esc(gcCustomerId)}) — 잘못된 ID!</h2>
        <p style="color:red">${readingsByGcId.length}건 — 이 데이터는 patient_id가 glucoseview_customers.id로 저장됨</p>
        <pre>${esc(JSON.stringify(readingsByGcId.map(r => ({
          id: r.id,
          patient_id: r.patient_id,
          pharmacy_id: r.pharmacy_id,
          metric: r.metric_type,
          value: r.value_numeric,
          source: r.source_type,
          measured_at: r.measured_at,
        })), null, 2))}</pre>
        ` : '<h2>4. gc.id로 저장된 잘못된 데이터: 없음 ✅</h2>'}

        <p><a href="/__debug__/pharmacy/care-data">← 다시 조회</a></p>
      `;

      res.send(page('Care Data Debug', body));
    } catch (err) {
      res.status(500).send(page('Error', `<pre>${esc(err)}</pre>`));
    }
  });

  return router;
}
