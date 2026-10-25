import type { MigrationInterface, QueryRunner } from "typeorm";

/** Additive workflow records. No membership, legacy notice or contact ownership backfill. */
export class CreateCooperationMemberWorkflows1792886400002
  implements MigrationInterface
{
  name = "CreateCooperationMemberWorkflows1792886400002";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE cooperation_work_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id uuid NOT NULL REFERENCES semi_franchises(id),
      cooperative_id uuid REFERENCES cooperatives(id),
      kind varchar(16) NOT NULL CHECK(kind IN ('notice','activity')),
      title varchar(300) NOT NULL, body text NOT NULL DEFAULT '',
      category varchar(80) NOT NULL DEFAULT '', priority varchar(12) NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','important','urgent')),
      required boolean NOT NULL DEFAULT false, due_at timestamptz,
      state varchar(16) NOT NULL DEFAULT 'draft',
      target_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(target_ids)='array'),
      starts_at timestamptz, ends_at timestamptz,
      version integer NOT NULL DEFAULT 1 CHECK(version>0),
      created_by uuid NOT NULL REFERENCES users(id), updated_by uuid NOT NULL REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK((kind='notice' AND state IN ('draft','published','archived')) OR (kind='activity' AND state IN ('draft','recruiting','active','ended','archived'))),
      CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at>starts_at),
      UNIQUE(id,kind)
    )`);
    await q.query(
      `CREATE INDEX cooperation_work_scope_idx ON cooperation_work_items(business_id,cooperative_id,kind,updated_at DESC)`,
    );
    await q.query(`CREATE TABLE cooperation_work_revisions (
      work_id uuid NOT NULL REFERENCES cooperation_work_items(id), version integer NOT NULL,
      snapshot jsonb NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(work_id,version)
    )`);
    await q.query(`CREATE TABLE cooperation_notice_recipients (
      work_id uuid NOT NULL, kind varchar(16) NOT NULL DEFAULT 'notice' CHECK(kind='notice'), version integer NOT NULL,
      subject_type varchar(16) NOT NULL CHECK(subject_type IN ('pharmacy','person')), subject_id uuid NOT NULL,
      acknowledged_by uuid REFERENCES users(id), acknowledged_at timestamptz,
      PRIMARY KEY(work_id,version,subject_type,subject_id),
      FOREIGN KEY(work_id,kind) REFERENCES cooperation_work_items(id,kind),
      FOREIGN KEY(work_id,version) REFERENCES cooperation_work_revisions(work_id,version),
      CHECK((acknowledged_by IS NULL)=(acknowledged_at IS NULL))
    )`);
    await q.query(`CREATE INDEX cooperation_notice_subject_idx ON cooperation_notice_recipients(subject_type,subject_id,work_id,version)`);
    await q.query(`CREATE TABLE cooperation_activity_applications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), work_id uuid NOT NULL,
      kind varchar(16) NOT NULL DEFAULT 'activity' CHECK(kind='activity'),
      subject_type varchar(16) NOT NULL CHECK(subject_type IN ('pharmacy','person')), subject_id uuid NOT NULL,
      state varchar(16) NOT NULL DEFAULT 'submitted' CHECK(state IN ('submitted','approved','rejected','withdrawn','completed')),
      note varchar(2000) NOT NULL DEFAULT '', decision_note varchar(2000) NOT NULL DEFAULT '',
      version integer NOT NULL DEFAULT 1, submitted_by uuid NOT NULL REFERENCES users(id), handled_by uuid REFERENCES users(id),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(work_id,subject_type,subject_id), FOREIGN KEY(work_id,kind) REFERENCES cooperation_work_items(id,kind)
    )`);
    await q.query(`ALTER TABLE semi_franchise_contents ADD COLUMN revision integer NOT NULL DEFAULT 1,
      ADD COLUMN category varchar(80) NOT NULL DEFAULT '', ADD COLUMN education_url varchar(1000)`);
    await q.query(`CREATE TABLE cooperation_material_revisions (
      content_id uuid NOT NULL REFERENCES semi_franchise_contents(id), revision integer NOT NULL,
      snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(content_id,revision)
    )`);
    await q.query(`CREATE FUNCTION cooperation_material_version_before() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        NEW.revision := OLD.revision + 1;
        RETURN NEW;
      END $$`);
    await q.query(`CREATE FUNCTION cooperation_material_version_after() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP='UPDATE' THEN
          INSERT INTO cooperation_material_revisions(content_id,revision,snapshot)
          VALUES(OLD.id,OLD.revision,to_jsonb(OLD)) ON CONFLICT DO NOTHING;
        END IF;
        INSERT INTO cooperation_material_revisions(content_id,revision,snapshot)
        VALUES(NEW.id,NEW.revision,to_jsonb(NEW));
        RETURN NEW;
      END $$`);
    await q.query(
      `CREATE TRIGGER cooperation_material_before BEFORE UPDATE ON semi_franchise_contents FOR EACH ROW EXECUTE FUNCTION cooperation_material_version_before()`,
    );
    await q.query(
      `CREATE TRIGGER cooperation_material_after AFTER INSERT OR UPDATE ON semi_franchise_contents FOR EACH ROW EXECUTE FUNCTION cooperation_material_version_after()`,
    );
    for (const table of [
      "cooperation_work_items",
      "cooperation_work_revisions",
      "cooperation_notice_recipients",
      "cooperation_activity_applications",
      "cooperation_material_revisions",
    ]) {
      await q.query(
        `CREATE TRIGGER account_erasure_write_fence BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION public.account_erasure_write_fence()`,
      );
    }
    await q.query(`ALTER TABLE contact_inquiries ADD COLUMN requester_user_id uuid REFERENCES users(id),
      ADD COLUMN requester_subject_type varchar(16) CHECK(requester_subject_type IN ('pharmacy','person')),
      ADD COLUMN requester_subject_id uuid, ADD COLUMN client_request_id uuid, ADD COLUMN assigned_to uuid REFERENCES users(id), ADD COLUMN due_at timestamptz,
      ADD CONSTRAINT cooperation_contact_owner_check CHECK(
        (requester_user_id IS NULL AND requester_subject_type IS NULL AND requester_subject_id IS NULL AND client_request_id IS NULL) OR
        (requester_user_id IS NOT NULL AND requester_subject_type IS NOT NULL AND requester_subject_id IS NOT NULL AND client_request_id IS NOT NULL))`);
    await q.query(
      `CREATE UNIQUE INDEX cooperation_contact_request_idx ON contact_inquiries(requester_user_id,client_request_id) WHERE requester_user_id IS NOT NULL`,
    );
    await q.query(
      `CREATE INDEX cooperation_contact_owner_idx ON contact_inquiries(requester_user_id,requester_subject_type,requester_subject_id,created_at DESC)`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    // Production rollback must retain workflow/ownership/version records; only a proven-empty local DB can reverse DDL.
    const [row] =
      await q.query(`SELECT (SELECT count(*) FROM cooperation_work_items)+(SELECT count(*) FROM cooperation_material_revisions)+
      (SELECT count(*) FROM contact_inquiries WHERE requester_user_id IS NOT NULL OR assigned_to IS NOT NULL OR due_at IS NOT NULL) AS count`);
    if (Number(row.count))
      throw new Error(
        "Cooperation workflow records must be retained; use a forward repair",
      );
    await q.query("DROP INDEX cooperation_contact_owner_idx");
    await q.query("DROP INDEX cooperation_contact_request_idx");
    await q.query(`ALTER TABLE contact_inquiries DROP CONSTRAINT cooperation_contact_owner_check, DROP COLUMN requester_user_id,
      DROP COLUMN requester_subject_type, DROP COLUMN requester_subject_id, DROP COLUMN client_request_id, DROP COLUMN assigned_to, DROP COLUMN due_at`);
    await q.query(
      "DROP TRIGGER cooperation_material_after ON semi_franchise_contents",
    );
    await q.query(
      "DROP TRIGGER cooperation_material_before ON semi_franchise_contents",
    );
    await q.query("DROP FUNCTION cooperation_material_version_after()");
    await q.query("DROP FUNCTION cooperation_material_version_before()");
    await q.query("DROP TABLE cooperation_material_revisions");
    await q.query(
      "ALTER TABLE semi_franchise_contents DROP COLUMN revision, DROP COLUMN category, DROP COLUMN education_url",
    );
    await q.query("DROP TABLE cooperation_activity_applications");
    await q.query("DROP TABLE cooperation_notice_recipients");
    await q.query("DROP TABLE cooperation_work_revisions");
    await q.query("DROP TABLE cooperation_work_items");
  }
}
