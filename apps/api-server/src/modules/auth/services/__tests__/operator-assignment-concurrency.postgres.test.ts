import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { DataSource, Entity, PrimaryColumn } from "typeorm";
jest.mock("../../../../database/connection.js", () => ({
  AppDataSource: { getRepository: jest.fn(), transaction: jest.fn() },
}));
import { AppDataSource } from "../../../../database/connection.js";
import { RoleAssignment } from "../../entities/RoleAssignment.js";
import { RoleAssignmentService } from "../role-assignment.service.js";
import { ServiceOperatorManagementService } from "../../../../services/admin/service-operator-management.service.js";
@Entity("users")
class User {
  @PrimaryColumn("uuid") id!: string;
}
const suite = process.env.CAREPHARM_REVIEW_DATABASE_URL
  ? describe
  : describe.skip;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
suite(
  "actual canonical writer versus service-admin preflight (isolated PostgreSQL)",
  () => {
    let db: DataSource,
      writer: RoleAssignmentService,
      service: ServiceOperatorManagementService;
    const schema = `operator_lock_${randomUUID().replace(/-/g, "")}`,
      admin = randomUUID(),
      central = randomUUID(),
      target = randomUUID();
    const role = "funding:operator",
      until = new Date("2099-01-01T00:00:00Z");
    beforeAll(async () => {
      const url = new URL(process.env.CAREPHARM_REVIEW_DATABASE_URL!);
      if (
        !["127.0.0.1", "localhost"].includes(url.hostname) ||
        url.pathname !== "/carepharm_revision"
      )
        throw Error("isolated local DB required");
      db = new DataSource({
        type: "postgres",
        url: url.href,
        entities: [RoleAssignment, User],
        extra: {
          options: `-c search_path=${schema},public`,
          application_name: schema,
        },
      });
      await db.initialize();
      await db.query(`CREATE SCHEMA ${schema}`);
      await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,name text,email text,status text,"isActive" boolean DEFAULT true,"isEmailVerified" boolean DEFAULT true);
    CREATE TABLE service_memberships(user_id uuid,service_key text,status text,UNIQUE(user_id,service_key));
    CREATE TABLE linked_accounts(id uuid DEFAULT gen_random_uuid(),"userId" uuid,provider text);
    CREATE TABLE demo_accounts(user_id uuid,is_active boolean);
    CREATE TABLE role_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,role varchar(50),is_active boolean DEFAULT true,
    valid_from timestamp DEFAULT now(),valid_until timestamp,assigned_at timestamp DEFAULT now(),assigned_by uuid,
    scope_type varchar(50) DEFAULT 'global',scope_id uuid,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
    CREATE UNIQUE INDEX one_active_operator ON role_assignments(user_id,role) WHERE is_active;
    CREATE TABLE action_logs(service_key text,user_id uuid,action_key text,source text,status text,meta jsonb);`);
      (AppDataSource.getRepository as jest.Mock).mockImplementation(() =>
        db.getRepository(RoleAssignment),
      );
      (AppDataSource.transaction as jest.Mock).mockImplementation((fn: any) =>
        db.transaction(fn),
      );
      writer = new RoleAssignmentService();
      service = new ServiceOperatorManagementService(db);
    });
    beforeEach(async () => {
      await db.query(
        "TRUNCATE users,service_memberships,linked_accounts,demo_accounts,role_assignments,action_logs",
      );
      await db.query(
        `INSERT INTO users(id,name,email,status) VALUES($1,'Service Admin','service@example.invalid','active'),($2,'Central Admin','central@example.invalid','active'),($3,'Target','target@example.invalid','active')`,
        [admin, central, target],
      );
      await db.query(
        `INSERT INTO service_memberships VALUES($1,'funding','active'),($2,'funding','active')`,
        [admin, target],
      );
      await db.query(
        `INSERT INTO linked_accounts("userId",provider) VALUES($1,'google')`,
        [target],
      );
      await db.query(
        `INSERT INTO role_assignments(user_id,role) VALUES($1,'funding:admin')`,
        [admin],
      );
    });
    afterAll(async () => {
      if (db?.isInitialized) {
        await db.query(`DROP SCHEMA ${schema} CASCADE`);
        await db.destroy();
      }
    });
    async function waitForBlockedOperator() {
      const end = Date.now() + 3000;
      while (Date.now() < end) {
        const [r] = await db.query(
          `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event='advisory') AS waiting`,
          [schema],
        );
        if (r.waiting) return;
        await new Promise((r) => setTimeout(r, 10));
      }
      throw Error("second writer did not wait for the canonical operator lock");
    }
    it("central first: service assignment waits, preserves assigner/validity, and creates no false audit", async () => {
      const held = deferred(),
        release = deferred();
      const centralWrite = db.transaction(async (m) => {
        await writer.assignRole(
          { userId: target, role, assignedBy: central, validUntil: until },
          m,
        );
        held.resolve();
        await release.promise;
      });
      await held.promise;
      const local = service.change(admin, "funding", target, true);
      try {
        await waitForBlockedOperator();
      } finally {
        release.resolve();
      }
      await centralWrite;
      expect((await local).changed).toBe(false);
      const [row] = await db.query(
        "SELECT assigned_by,valid_until FROM role_assignments WHERE user_id=$1 AND role=$2 AND is_active",
        [target, role],
      );
      expect(row.assigned_by).toBe(central);
      expect(new Date(row.valid_until).getTime()).toBe(until.getTime());
      expect(await db.query("SELECT * FROM action_logs")).toHaveLength(0);
    });
    it("service first: central standalone writer waits for its transaction and both operations finish without duplicate rows", async () => {
      const held = deferred(),
        release = deferred();
      const scoped = new ServiceOperatorManagementService({
        transaction: (fn: any) =>
          db.transaction(async (m) => {
            const result = await fn(m);
            held.resolve();
            await release.promise;
            return result;
          }),
      } as any);
      const local = scoped.change(admin, "funding", target, true);
      await held.promise;
      const centralWrite = writer.assignRole({
        userId: target,
        role,
        assignedBy: central,
        validUntil: until,
      });
      try {
        await waitForBlockedOperator();
      } finally {
        release.resolve();
      }
      expect((await local).changed).toBe(true);
      await centralWrite;
      expect(
        await db.query(
          "SELECT * FROM role_assignments WHERE user_id=$1 AND role=$2 AND is_active",
          [target, role],
        ),
      ).toHaveLength(1);
      expect(await db.query("SELECT * FROM action_logs")).toHaveLength(1);
    });
    it("standalone canonical revoke and later grant retain the canonical round trip", async () => {
      await writer.assignRole({ userId: target, role, assignedBy: central });
      await writer.removeRole(target, role);
      expect(
        await db.query(
          "SELECT * FROM role_assignments WHERE user_id=$1 AND is_active",
          [target],
        ),
      ).toHaveLength(0);
      await service.change(admin, "funding", target, true);
      expect(
        await db.query(
          "SELECT * FROM role_assignments WHERE user_id=$1 AND role=$2 AND is_active",
          [target, role],
        ),
      ).toHaveLength(1);
    });
  },
);
