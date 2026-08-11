import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
await withDb(async (q) => {
  const r = await q(`SELECT u.email, ra.role, ra.is_active
                       FROM users u JOIN role_assignments ra ON ra.user_id = u.id
                      WHERE u.email IN ('sohae2100@gmail.com','renagang21@gmail.com','sohae21@naver.com')
                      ORDER BY u.email, ra.role`);
  console.log(JSON.stringify(r.rows, null, 1));
});
