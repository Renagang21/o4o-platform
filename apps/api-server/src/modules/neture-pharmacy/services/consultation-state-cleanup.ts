import type { DataSource } from 'typeorm';

/** Clear current delivery bodies after the existing 90-second connection expiry; never delete business assets. */
export async function cleanupConsultationState(db: Pick<DataSource, 'query'>, apply: boolean): Promise<number> {
  // 소비자 태블릿(키오스크)은 운영자 heartbeat 가 없고 상담 내용을 저장하지 않는다 — 연결 코드 · 기기 자격을 지우지 않는다.
  const expired = `mode<>'consumer-kiosk' AND (operator_seen_at IS NULL OR operator_seen_at < now() - interval '90 seconds')
    AND (active=true OR shared<>'{}'::jsonb OR translation<>'{}'::jsonb OR reply<>'{}'::jsonb OR pairing_hash IS NOT NULL)`;
  if (!apply) {
    const [row] = await db.query(`SELECT count(*)::int AS count FROM store_consultation_stations WHERE ${expired}`);
    return Number(row?.count ?? 0);
  }
  const result = await db.query(`WITH expired AS (
      SELECT id FROM store_consultation_stations WHERE ${expired}
      ORDER BY operator_seen_at NULLS FIRST,id LIMIT 200 FOR UPDATE SKIP LOCKED
    ) UPDATE store_consultation_stations s SET active=false,epoch=gen_random_uuid(),version=s.version+1,
      shared='{}'::jsonb,translation='{}'::jsonb,reply='{}'::jsonb,
      pairing_hash=NULL,pairing_expires_at=NULL,updated_at=now()
    FROM expired e WHERE s.id=e.id RETURNING s.id`);
  const rows = Array.isArray(result[0]) ? result[0] : result;
  return rows.length;
}
