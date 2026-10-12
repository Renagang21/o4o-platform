/** Local-only synthetic counterexample. All writes are rolled back; no DDL/GCS/HTTP. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

if (process.env.NODE_ENV !== 'development' || process.env.DB_HOST !== '127.0.0.1' ||
    process.env.DB_PORT !== '5432' || process.env.DB_NAME !== 'o4o_platform' || process.env.ALLOW_REMOTE_DB === 'true') {
  throw new Error('Only the explicitly verified isolated local development database is allowed');
}
const client = new pg.Client({ host: '127.0.0.1', port: 5432, user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
const ids = Array.from({ length: 6 }, () => randomUUID());
const [author, target, actor, community, membership, post] = ids;
await client.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL statement_timeout = '5s'");
  for (const id of [author, target, actor]) {
    await client.query('INSERT INTO users (id,email,name) VALUES ($1,$2,$3)', [id, `${id}@fixture.invalid`, 'Synthetic privacy fixture']);
  }
  await client.query('INSERT INTO forum_post (id,title,slug,author_id) VALUES ($1,$2,$3,$4)',
    [post, 'Synthetic fixture', randomUUID(), author]);
  await client.query('SAVEPOINT hard_delete');
  try {
    await client.query('DELETE FROM users WHERE id=$1', [author]);
    assert.fail('Author FK should prevent direct deletion');
  } catch (error) {
    assert.equal(error.code, '23503');
  }
  await client.query('ROLLBACK TO SAVEPOINT hard_delete');
  // Reproduce SQL effects of the legacy fallback, not a call to the HTTP controller.
  await client.query('UPDATE users SET "isActive"=false WHERE id=$1', [author]);
  await client.query('DELETE FROM role_assignments WHERE user_id=$1', [author]);
  const remaining = await client.query('SELECT email,name,"isActive" FROM users WHERE id=$1', [author]);
  assert.equal(remaining.rowCount, 1);
  assert.equal(remaining.rows[0].isActive, false);
  assert.ok(remaining.rows[0].email && remaining.rows[0].name);
  console.log('PASS: FK fallback deactivation leaves general profile information; it is not erasure.');

  await client.query('INSERT INTO communities (id,slug,name) VALUES ($1,$2,$3)', [community, randomUUID(), 'Synthetic community']);
  await client.query('INSERT INTO community_memberships (id,community_id,user_id) VALUES ($1,$2,$3)', [membership, community, target]);
  await client.query(`INSERT INTO community_membership_changes
    (community_id,membership_id,actor_user_id,action,after_role,after_status,reason)
    VALUES ($1,$2,$3,'approve','member','active',$4)`, [community, membership, actor, 'Synthetic identifying reason']);
  await client.query('DELETE FROM users WHERE id=$1', [actor]);
  const afterActor = await client.query('SELECT actor_user_id,reason FROM community_membership_changes WHERE membership_id=$1', [membership]);
  assert.equal(afterActor.rowCount, 1);
  assert.equal(afterActor.rows[0].actor_user_id, null);
  assert.equal(afterActor.rows[0].reason, 'Synthetic identifying reason');
  console.log('PASS: actor SET NULL preserves free-text reason; it is not complete anonymization.');
  await client.query('DELETE FROM users WHERE id=$1', [target]);
  assert.equal((await client.query('SELECT 1 FROM community_membership_changes WHERE membership_id=$1', [membership])).rowCount, 0);
  assert.equal((await client.query('SELECT 1 FROM communities WHERE id=$1', [community])).rowCount, 1);
  assert.equal((await client.query('SELECT 1 FROM forum_post WHERE id=$1', [post])).rowCount, 1);
  console.log('PASS: target deletion cascades membership history immediately; community and unrelated content survive.');
} finally {
  await client.query('ROLLBACK');
  try {
    for (const [table, id] of [['users', author], ['users', target], ['users', actor], ['communities', community], ['forum_post', post]]) {
      assert.equal((await client.query(`SELECT 1 FROM ${table} WHERE id=$1`, [id])).rowCount, 0);
    }
    console.log('PASS: rollback verified; all synthetic users/community/content are absent.');
  } finally { await client.end(); }
}
