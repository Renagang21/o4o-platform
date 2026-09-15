/**
 * Safe database error summary — never echoes connection details
 * (WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1)
 *
 * Driver errors embed the host ("getaddrinfo ENOTFOUND <host>"), the database name
 * ('database "<name>" does not exist'), the user ('password authentication failed for user
 * "<user>"') or a whole connection string. The migration job logs go to Cloud Logging, so every
 * error that reaches the log passes through here: the values of DB_HOST / DB_PORT / DB_USERNAME /
 * DB_PASSWORD / DB_NAME (and the other supported spellings) are replaced by placeholders, socket
 * paths, host:port fragments and postgres:// URLs are masked, and the whole object is never dumped.
 * (DB_PORT is not substituted by value — a short number would corrupt unrelated text — it is
 * covered by the host:port pattern and is simply never logged.)
 */

const ENV_KEYS: ReadonlyArray<readonly [key: string, placeholder: string]> = [
  ['DB_PASSWORD', '<DB_PASSWORD>'],
  ['DATABASE_PASSWORD', '<DB_PASSWORD>'],
  ['DB_HOST', '<DB_HOST>'],
  ['DATABASE_HOST', '<DB_HOST>'],
  ['DB_NAME', '<DB_NAME>'],
  ['DATABASE_NAME', '<DB_NAME>'],
  ['DB_USERNAME', '<DB_USERNAME>'],
  ['DB_USER', '<DB_USERNAME>'],
  ['DATABASE_USER', '<DB_USERNAME>'],
  ['DATABASE_URL', '<DATABASE_URL>'],
];

const CONNECTION_URL = /postgres(?:ql)?:\/\/[^\s'"]+/gi;
const CLOUD_SQL_SOCKET = /\/cloudsql\/[^\s'"]+/g;
const QUOTED_DATABASE = /(database\s+)"[^"]*"/gi;
const QUOTED_USER = /(user\s+)"[^"]*"/gi;
const QUOTED_ROLE = /(role\s+)"[^"]*"/gi;
const GETADDRINFO = /(getaddrinfo\s+[A-Z_]+\s+)\S+/g;
const HOST_PORT = /(connect\s+[A-Z_]+\s+)\S+/g;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Redact known secret / endpoint values and generic connection-shaped fragments. */
export function redactDatabaseDetails(text: string, env: NodeJS.ProcessEnv = process.env): string {
  let out = text;
  const values: Array<readonly [string, string]> = [];
  for (const [key, placeholder] of ENV_KEYS) {
    const v = env[key];
    if (v && v.length >= 2) values.push([v, placeholder]);
  }
  // longest first so that a value contained in another value is not left half-replaced
  values.sort((a, b) => b[0].length - a[0].length);
  for (const [v, placeholder] of values) out = out.replace(new RegExp(escapeRegExp(v), 'g'), placeholder);
  out = out.replace(CONNECTION_URL, '<DATABASE_URL>');
  out = out.replace(CLOUD_SQL_SOCKET, '<CLOUD_SQL_SOCKET>');
  out = out.replace(QUOTED_DATABASE, '$1"<DB_NAME>"');
  out = out.replace(QUOTED_USER, '$1"<DB_USERNAME>"');
  out = out.replace(QUOTED_ROLE, '$1"<DB_USERNAME>"');
  out = out.replace(GETADDRINFO, '$1<DB_HOST>');
  out = out.replace(HOST_PORT, '$1<DB_HOST>');
  return out;
}

export interface SafeErrorSummary {
  readonly name: string;
  readonly code: string | null;
  readonly message: string;
  /** Redacted stack frames (message line removed). */
  readonly frames: readonly string[];
}

export function summarizeDatabaseError(error: unknown, env: NodeJS.ProcessEnv = process.env): SafeErrorSummary {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const stack = typeof error.stack === 'string' ? error.stack : '';
    const frames = stack
      .split('\n')
      .slice(1)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('at '))
      .map((l) => redactDatabaseDetails(l, env));
    return {
      name: error.name || 'Error',
      code: typeof code === 'string' || typeof code === 'number' ? String(code) : null,
      message: redactDatabaseDetails(error.message, env),
      frames,
    };
  }
  return { name: 'UnknownError', code: null, message: redactDatabaseDetails(String(error), env), frames: [] };
}

export function formatSafeErrorSummary(summary: SafeErrorSummary): string {
  const head = `${summary.name}${summary.code ? ` [${summary.code}]` : ''}: ${summary.message}`;
  return summary.frames.length > 0 ? `${head}\n    ${summary.frames.join('\n    ')}` : head;
}
