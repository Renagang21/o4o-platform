import type { DataSource } from "typeorm";
import { businessPolicyScope } from "../../services/business-policy-scope.js";
import { getEnrollmentPolicies } from "../../../policy-acceptance/service-enrollment-policy.service.js";

// Synthetic legal text belongs only in the disposable canonical fixture DB.
function assertFixture(db: DataSource) {
  const options = db.options as {
    url?: string;
    host?: string;
    port?: number;
    database?: string;
  };
  const target = options.url ? new URL(options.url) : null;
  const host = target ? target.hostname : options.host;
  const port = Number(target ? target.port : options.port);
  const name = target ? target.pathname.slice(1) : options.database;
  if (
    host !== "127.0.0.1" ||
    !(
      (port === 55432 &&
        ["o4o_feature_test", "o4o_supplier_store_integration"].includes(
          name ?? "",
        )) ||
      (port === 55438 && name === "o4o_coop_roles")
    )
  )
    throw new Error("Owned loopback fixture DB required");
}
export async function fixtureBusinessPolicies(db: DataSource, key: string) {
  assertFixture(db);
  const [business] = await db.query(
    "SELECT id FROM semi_franchises WHERE key=$1 OR id::text=$1",
    [key],
  );
  const scope = businessPolicyScope(business.id);
  if (
    !(
      await db.query(
        "SELECT id FROM service_policy_documents WHERE service_key=$1",
        [scope],
      )
    ).length
  ) {
    for (const type of ["terms", "privacy"])
      await db.query(
        `INSERT INTO service_policy_documents(service_key,document_type,title,content,slug,status,version,effective_date,published_at)
      VALUES($1,$2,'Synthetic business policy','Synthetic fixture only',$3,'published',1,'2026-01-01',NOW())`,
        [scope, type, `${scope}-service-${type}`],
      );
  }
  return (await getEnrollmentPolicies(db, scope)).map((doc) => ({
    policyDocumentId: doc.id,
    version: Number(doc.version),
    documentType: doc.document_type as "terms" | "privacy",
  }));
}
export async function cleanupFixtureBusinessPolicies(
  db: DataSource,
  ids: string[],
) {
  assertFixture(db);
  const scopes = ids.map(businessPolicyScope);
  for (const table of [
    "action_logs",
    "user_policy_acceptances",
    "service_policy_documents",
  ])
    await db.query(`DELETE FROM ${table} WHERE service_key=ANY($1::text[])`, [
      scopes,
    ]);
}
