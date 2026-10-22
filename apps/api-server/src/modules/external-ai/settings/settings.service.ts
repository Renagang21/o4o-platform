import type { DataSource, EntityManager } from "typeorm";
import {
  defaultSettings,
  ExternalAiError,
  settingsSchema,
} from "../contracts.js";

type Queryable = Pick<DataSource | EntityManager, "query">;
export async function readSettings(db: Queryable, lock = false) {
  const rows = await db.query(
    `SELECT revision,settings FROM external_ai_settings WHERE id=1${lock ? " FOR SHARE" : ""}`,
  );
  if (!rows[0])
    return { revision: 0, settings: structuredClone(defaultSettings) };
  return {
    revision: rows[0].revision as number,
    settings: settingsSchema.parse(rows[0].settings),
  };
}
export async function changeSettings(
  db: DataSource,
  revision: number,
  input: unknown,
) {
  const settings = settingsSchema.parse(input);
  if (
    Object.values(settings.targets).some((value) => value.write && !value.read)
  )
    throw new ExternalAiError("READ_REQUIRED_FOR_WRITE");
  if (
    new Set(settings.examples.map((e) => e.id)).size !==
    settings.examples.length
  )
    throw new ExternalAiError("DUPLICATE_EXAMPLE");
  return db.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO external_ai_settings(id,settings) VALUES(1,$1) ON CONFLICT DO NOTHING`,
      [defaultSettings],
    );
    const rows = await manager.query(
      "SELECT revision FROM external_ai_settings WHERE id=1 FOR UPDATE",
    );
    if (rows[0].revision !== revision)
      throw new ExternalAiError("SETTINGS_CONFLICT", 409);
    await manager.query(
      "UPDATE external_ai_settings SET settings=$1,revision=revision+1,updated_at=now() WHERE id=1",
      [settings],
    );
    return readSettings(manager);
  });
}
export async function assertEnabled(
  db: Queryable,
  write = false,
  lock = false,
) {
  const { settings } = await readSettings(db, lock);
  if (
    !settings.enabled ||
    !settings.chatgptEnabled ||
    !Object.values(settings.targets).some(
      (target) => target.read && (!write || target.write),
    )
  ) {
    throw new ExternalAiError("EXTERNAL_AI_DISABLED", 403);
  }
  return settings;
}
