import type { MigrationInterface, QueryRunner } from "typeorm";

/** Current consultation delivery only; no transcript history or new identity/entitlement. */
export class CreateStoreConsultationStations1792815861315
  implements MigrationInterface
{
  name = "CreateStoreConsultationStations1792815861315";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE store_consultation_stations (
      id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      station_key varchar(40) NOT NULL, name varchar(80) NOT NULL,
      operator_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      mode varchar(40) NOT NULL, language varchar(8) NOT NULL DEFAULT 'ko',
      active boolean NOT NULL DEFAULT false, epoch uuid NOT NULL,
      shared jsonb NOT NULL DEFAULT '{}', translation jsonb NOT NULL DEFAULT '{}', reply jsonb NOT NULL DEFAULT '{}',
      version bigint NOT NULL DEFAULT 0, pairing_hash varchar(64) UNIQUE, pairing_expires_at timestamptz,
      device_hash varchar(64), device_seen_at timestamptz, operator_seen_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(organization_id, station_key),
      CHECK(jsonb_typeof(shared)='object' AND jsonb_typeof(translation)='object' AND jsonb_typeof(reply)='object')
    )`);
    await q.query(
      "CREATE INDEX store_consultation_stations_operator ON store_consultation_stations(operator_user_id)",
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DO $$ BEGIN IF EXISTS(SELECT 1 FROM store_consultation_stations)
      THEN RAISE EXCEPTION 'STORE_CONSULTATION_DATA_EXISTS'; END IF; END $$`);
    await q.query("DROP TABLE store_consultation_stations");
  }
}
