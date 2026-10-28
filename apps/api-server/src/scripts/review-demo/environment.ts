export const REVIEW_DATABASE = "o4o_chatgpt_review_demo";
export const REVIEW_USER = "o4o_review_demo";
export const REVIEW_MARKER = "chatgpt-review-synthetic-only-v1";
export const REVIEW_PREPARED_MARKER = `${REVIEW_MARKER}:prepared-v1`;
type Queryable = { query(sql: string): Promise<any[]> };

/** No ambient production DB_* fallback. The dedicated role cannot authenticate to production. */
export function reviewDatabaseOptions(env: NodeJS.ProcessEnv) {
  if (
    env.REVIEW_DEMO_ENVIRONMENT !== "isolated" ||
    env.REVIEW_DEMO_DB_NAME !== REVIEW_DATABASE ||
    env.REVIEW_DEMO_DB_USERNAME !== REVIEW_USER ||
    !env.REVIEW_DEMO_DB_HOST ||
    !env.REVIEW_DEMO_DB_PASSWORD
  ) {
    throw new Error("ISOLATED_REVIEW_DATABASE_CONFIGURATION_REQUIRED");
  }
  if (
    !["localhost", "127.0.0.1", "::1", "review-db"].includes(
      env.REVIEW_DEMO_DB_HOST,
    ) &&
    !env.REVIEW_DEMO_DB_HOST.startsWith("/cloudsql/")
  )
    throw new Error("REVIEW_DATABASE_PRIVATE_TRANSPORT_REQUIRED");
  const port = Number(env.REVIEW_DEMO_DB_PORT || "5432");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("INVALID_REVIEW_DATABASE_PORT");
  return {
    type: "postgres" as const,
    host: env.REVIEW_DEMO_DB_HOST,
    port,
    username: REVIEW_USER,
    password: env.REVIEW_DEMO_DB_PASSWORD,
    database: REVIEW_DATABASE,
    entities: [],
    synchronize: false,
    logging: false as const,
  };
}

export async function assertReviewDatabase(db: Queryable) {
  const [identity] = await db.query(
    "SELECT current_database() AS database,current_user AS username",
  );
  if (
    identity?.database !== REVIEW_DATABASE ||
    identity?.username !== REVIEW_USER
  )
    throw new Error("REVIEW_DATABASE_IDENTITY_MISMATCH");
  const [marker] = await db.query(
    "SELECT shobj_description(oid,'pg_database') AS purpose FROM pg_database WHERE datname=current_database()",
  );
  if (![REVIEW_MARKER, REVIEW_PREPARED_MARKER].includes(marker?.purpose))
    throw new Error("REVIEW_DATABASE_MARKER_REQUIRED");
  return marker.purpose as string;
}
