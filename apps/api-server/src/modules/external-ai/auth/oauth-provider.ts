import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import type { Response } from "express";
import type { DataSource, EntityManager } from "typeorm";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
  TooManyRequestsError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { assertEnabled } from "../settings/settings.service.js";
import {
  scopes as supportedScopes,
  type Connection,
  ExternalAiError,
} from "../contracts.js";
import { resolveAccountAccess } from "../../../common/auth/account-access.policy.js";

export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(32).toString("base64url");
// The SDK also limits each IP to 20 registrations/hour. These database-wide
// bounds apply across Cloud Run replicas and direct store callers.
export const registrationLimits = {
  storedClients: 1000,
  newClientsPerHour: 100,
};
export const authorizationLimits = {
  pendingTotal: 1000,
  pendingPerClient: 100,
};
type Queryable = Pick<DataSource | EntityManager, "query">;
export interface ConnectionConfig {
  issuer: URL;
  webOrigin: URL;
  adminOrigin?: URL;
  redirectUris: string[];
  credentialKey: string;
}

/** Configured canonical URLs only: no Host/Origin reflection and no fetched client metadata. */
export function connectionConfig(
  env: NodeJS.ProcessEnv = process.env,
): ConnectionConfig | null {
  try {
    if (
      !env.EXTERNAL_AI_ISSUER_URL ||
      !env.EXTERNAL_AI_WEB_ORIGIN ||
      !env.EXTERNAL_AI_CREDENTIAL_KEY
    )
      return null;
    const issuer = new URL(env.EXTERNAL_AI_ISSUER_URL);
    const webOrigin = new URL(env.EXTERNAL_AI_WEB_ORIGIN);
    const adminOrigin = new URL(
      env.EXTERNAL_AI_ADMIN_ORIGIN || "https://admin.neture.co.kr",
    );
    const local = (u: URL) =>
      env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(u.hostname) &&
      u.protocol === "http:";
    for (const url of [issuer, webOrigin, adminOrigin]) {
      if (
        (url.protocol !== "https:" && !local(url)) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        return null;
    }
    if (!/^[a-f0-9]{64}$/i.test(env.EXTERNAL_AI_CREDENTIAL_KEY)) return null;
    const redirectUris = (env.EXTERNAL_AI_REDIRECT_URIS ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!redirectUris.length || redirectUris.length > 20) return null;
    for (const text of redirectUris) {
      const u = new URL(text);
      if (
        (u.protocol !== "https:" && !local(u)) ||
        u.username ||
        u.password ||
        u.hash
      )
        return null;
    }
    return {
      issuer,
      webOrigin,
      adminOrigin,
      redirectUris,
      credentialKey: env.EXTERNAL_AI_CREDENTIAL_KEY,
    };
  } catch {
    return null;
  }
}

export async function loadConnection(
  db: Queryable,
  id: string,
  lock = false,
): Promise<Connection> {
  const rows = await db.query(
    `SELECT id,user_id,client_id,workspaces,scopes,expires_at FROM external_ai_connections
    WHERE id=$1 AND revoked_at IS NULL AND expires_at>now()${lock ? " FOR SHARE" : ""}`,
    [id],
  );
  if (!rows[0])
    throw new InvalidTokenError("O4O connection expired or revoked");
  const row = rows[0];
  const users = await db.query(
    'SELECT status,"isActive" FROM users WHERE id=$1',
    [row.user_id],
  );
  if (!users[0]?.isActive || resolveAccountAccess(users[0].status) !== "normal")
    throw new InvalidTokenError("O4O account unavailable");
  return {
    id: row.id,
    userId: row.user_id,
    clientId: row.client_id,
    workspaces: row.workspaces,
    scopes: row.scopes,
    expiresAt: row.expires_at,
  };
}

export class ExternalAiOAuthProvider implements OAuthServerProvider {
  readonly resource: URL;
  constructor(
    readonly db: DataSource,
    readonly config: ConnectionConfig,
    readonly authorizeWorkspaces: (
      userId: string,
      workspaceIds: string[],
      write: boolean,
      db: EntityManager,
    ) => Promise<void>,
  ) {
    this.resource = new URL("/api/external-ai/mcp", config.issuer);
  }
  private encrypt(value: string) {
    const iv = randomBytes(12),
      cipher = createCipheriv(
        "aes-256-gcm",
        Buffer.from(this.config.credentialKey, "hex"),
        iv,
      );
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      "base64",
    );
  }
  private decrypt(value: string) {
    const data = Buffer.from(value, "base64");
    const cipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(this.config.credentialKey, "hex"),
      data.subarray(0, 12),
    );
    cipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([
      cipher.update(data.subarray(28)),
      cipher.final(),
    ]).toString("utf8");
  }
  readonly clientsStore = {
    getClient: async (
      id: string,
    ): Promise<OAuthClientInformationFull | undefined> => {
      const rows = await this.db.query(
        "SELECT metadata,secret_cipher FROM external_ai_clients WHERE id=$1",
        [id],
      );
      if (!rows[0]) return undefined;
      return {
        ...rows[0].metadata,
        ...(rows[0].secret_cipher
          ? { client_secret: this.decrypt(rows[0].secret_cipher) }
          : {}),
      };
    },
    registerClient: async (
      client: Omit<
        OAuthClientInformationFull,
        "client_id" | "client_id_issued_at"
      >,
    ): Promise<OAuthClientInformationFull> => {
      await assertEnabled(this.db);
      if (
        !client.redirect_uris.length ||
        client.redirect_uris.length > 5 ||
        client.redirect_uris.some((u) => !this.config.redirectUris.includes(u))
      ) {
        throw new InvalidClientMetadataError(
          "등록되지 않은 연결 반환 주소입니다.",
        );
      }
      const result: OAuthClientInformationFull = {
        ...client,
        client_id: randomUUID(),
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: (client.client_name ?? "외부 AI 연결").slice(0, 100),
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      };
      if (
        !["none", "client_secret_post", "client_secret_basic"].includes(
          result.token_endpoint_auth_method ?? "client_secret_post",
        )
      ) {
        throw new InvalidClientMetadataError("지원하지 않는 인증 방식입니다.");
      }
      const { client_secret, ...metadata } = result;
      if (JSON.stringify(metadata).length > 16000)
        throw new InvalidClientMetadataError("연결 정보가 너무 큽니다.");
      await this.db.transaction(async (db) => {
        await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          "external-ai-client-registration",
        ]);
        await assertEnabled(db);
        const [counts] = await db.query(`SELECT count(*)::int AS total,
          count(*) FILTER (WHERE created_at>now()-interval '1 hour')::int AS recent
          FROM external_ai_clients`);
        if (
          counts.total >= registrationLimits.storedClients ||
          counts.recent >= registrationLimits.newClientsPerHour
        )
          throw new TooManyRequestsError(
            "연결 등록 한도에 도달했습니다. 나중에 다시 시도해 주세요.",
          );
        await db.query(
          "INSERT INTO external_ai_clients(id,metadata,secret_cipher) VALUES($1,$2,$3)",
          [
            result.client_id,
            metadata,
            client_secret ? this.encrypt(client_secret) : null,
          ],
        );
      });
      return result;
    },
  };
  private validateScopes(input: string[] = ["o4o:read"]) {
    const values = input.length ? [...new Set(input)] : ["o4o:read"];
    if (
      !values.includes("o4o:read") ||
      values.some((v) => !(supportedScopes as readonly string[]).includes(v))
    )
      throw new InvalidScopeError("허용되지 않은 기능입니다.");
    return values;
  }
  private validateResource(resource?: URL) {
    if (resource && resource.href !== this.resource.href)
      throw new InvalidTargetError("O4O MCP 대상이 아닙니다.");
  }
  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ) {
    await assertEnabled(this.db);
    this.validateResource(params.resource);
    this.validateScopes(params.scopes);
    if (
      !this.config.redirectUris.includes(params.redirectUri) ||
      !/^[A-Za-z0-9_-]{43}$/.test(params.codeChallenge) ||
      (params.state?.length ?? 0) > 2048
    )
      throw new InvalidGrantError("연결 요청이 올바르지 않습니다.");
    const request = secret();
    await this.db.transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "external-ai-pending-authorization",
      ]);
      await assertEnabled(db);
      // Only expired, unauthenticated pending requests; consent and token rows are retained.
      await db.query(
        "DELETE FROM external_ai_credentials WHERE kind='pending' AND expires_at<=now()",
      );
      const [counts] = await db.query(
        `SELECT count(*)::int AS total,
        count(*) FILTER (WHERE client_id=$1)::int AS client FROM external_ai_credentials WHERE kind='pending'`,
        [client.client_id],
      );
      if (
        counts.total >= authorizationLimits.pendingTotal ||
        counts.client >= authorizationLimits.pendingPerClient
      )
        throw new TooManyRequestsError(
          "연결 요청 한도에 도달했습니다. 나중에 다시 시도해 주세요.",
        );
      await db.query(
        `INSERT INTO external_ai_credentials(hash,kind,client_id,data,expires_at)
        VALUES($1,'pending',$2,$3,now()+interval '10 minutes')`,
        [
          tokenHash(request),
          client.client_id,
          {
            ...params,
            resource: this.resource.href,
            scopes: this.validateScopes(params.scopes),
          },
        ],
      );
    });
    res.setHeader("Referrer-Policy", "no-referrer");
    const url = new URL("/external-ai/connect", this.config.webOrigin);
    url.searchParams.set("request", request);
    res.redirect(url.href);
  }
  async pending(request: string, db: Queryable = this.db, lock = false) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(request))
      throw new ExternalAiError("CONNECTION_REQUEST_EXPIRED", 410);
    const rows = await db.query(
      `SELECT hash,client_id,data FROM external_ai_credentials
      WHERE hash=$1 AND kind='pending' AND consumed_at IS NULL AND expires_at>now()${lock ? " FOR UPDATE" : ""}`,
      [tokenHash(request)],
    );
    if (!rows[0]) throw new ExternalAiError("CONNECTION_REQUEST_EXPIRED", 410);
    return rows[0] as {
      hash: string;
      client_id: string;
      data: {
        redirectUri: string;
        state?: string;
        scopes: string[];
        codeChallenge: string;
        resource: string;
      };
    };
  }
  async consent(
    userId: string,
    request: string,
    workspaces: string[],
    allowedScopes: string[],
  ) {
    return this.db.transaction(async (manager) => {
      await assertEnabled(
        manager,
        allowedScopes.includes("o4o:draft:write"),
        true,
      );
      const pending = await this.pending(request, manager, true);
      const chosen = this.validateScopes(allowedScopes);
      if (chosen.some((scope) => !pending.data.scopes.includes(scope)))
        throw new InvalidScopeError("요청 범위를 넘는 기능입니다.");
      if (
        !workspaces.length ||
        workspaces.length > 50 ||
        new Set(workspaces).size !== workspaces.length
      )
        throw new InvalidScopeError("작업공간을 선택해 주세요.");
      await this.authorizeWorkspaces(
        userId,
        workspaces,
        chosen.includes("o4o:draft:write"),
        manager,
      );
      const id = randomUUID(),
        code = secret();
      await manager.query(
        `INSERT INTO external_ai_connections(id,user_id,client_id,workspaces,scopes,expires_at)
        VALUES($1,$2,$3,$4,$5,now()+interval '30 days')`,
        [
          id,
          userId,
          pending.client_id,
          JSON.stringify(workspaces),
          JSON.stringify(chosen),
        ],
      );
      await manager.query(
        `UPDATE external_ai_credentials SET consumed_at=now() WHERE hash=$1`,
        [pending.hash],
      );
      await manager.query(
        `INSERT INTO external_ai_credentials(hash,kind,client_id,connection_id,data,expires_at)
        VALUES($1,'code',$2,$3,$4,now()+interval '5 minutes')`,
        [tokenHash(code), pending.client_id, id, pending.data],
      );
      const redirect = new URL(pending.data.redirectUri);
      redirect.searchParams.set("code", code);
      if (pending.data.state !== undefined)
        redirect.searchParams.set("state", pending.data.state);
      return redirect.href;
    });
  }
  async deny(request: string) {
    return this.db.transaction(async (db) => {
      const pending = await this.pending(request, db, true);
      await db.query(
        "UPDATE external_ai_credentials SET consumed_at=now() WHERE hash=$1",
        [pending.hash],
      );
      const redirect = new URL(pending.data.redirectUri);
      redirect.searchParams.set("error", "access_denied");
      if (pending.data.state !== undefined)
        redirect.searchParams.set("state", pending.data.state);
      return redirect.href;
    });
  }
  private async credential(
    db: Queryable,
    value: string,
    kind: string,
    clientId?: string,
    lock = false,
  ) {
    const rows = await db.query(
      `SELECT * FROM external_ai_credentials WHERE hash=$1 AND kind=$2
      AND expires_at>now()${clientId ? " AND client_id=$3" : ""}${lock ? " FOR UPDATE" : ""}`,
      [tokenHash(value), kind, ...(clientId ? [clientId] : [])],
    );
    if (!rows[0])
      throw new InvalidGrantError(
        "만료되었거나 올바르지 않은 접근 자격입니다.",
      );
    return rows[0];
  }
  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
  ) {
    const row = await this.credential(this.db, code, "code", client.client_id);
    if (row.consumed_at) throw new InvalidGrantError("이미 사용한 코드입니다.");
    await loadConnection(this.db, row.connection_id);
    return row.data.codeChallenge as string;
  }
  private async issue(
    db: Queryable,
    connection: Connection,
  ): Promise<OAuthTokens> {
    const access = secret(),
      refresh = secret();
    await db.query(
      `INSERT INTO external_ai_credentials(hash,kind,client_id,connection_id,expires_at) VALUES
      ($1,'access',$3,$4,LEAST(now()+interval '15 minutes',$5)),($2,'refresh',$3,$4,$5)`,
      [
        tokenHash(access),
        tokenHash(refresh),
        connection.clientId,
        connection.id,
        connection.expiresAt,
      ],
    );
    return {
      access_token: access,
      refresh_token: refresh,
      token_type: "Bearer",
      expires_in: Math.min(
        900,
        Math.floor((connection.expiresAt.getTime() - Date.now()) / 1000),
      ),
      scope: connection.scopes.join(" "),
    };
  }
  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    code: string,
    _verifier?: string,
    redirectUri?: string,
    resource?: URL,
  ) {
    this.validateResource(resource);
    return this.db.transaction(async (manager) => {
      await assertEnabled(manager, false, true);
      const row = await this.credential(
        manager,
        code,
        "code",
        client.client_id,
        true,
      );
      if (row.consumed_at || redirectUri !== row.data.redirectUri)
        throw new InvalidGrantError("코드 또는 반환 주소가 올바르지 않습니다.");
      const connection = await loadConnection(manager, row.connection_id, true);
      await manager.query(
        "UPDATE external_ai_credentials SET consumed_at=now() WHERE hash=$1",
        [row.hash],
      );
      return this.issue(manager, connection);
    });
  }
  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    value: string,
    requestedScopes?: string[],
    resource?: URL,
  ) {
    this.validateResource(resource);
    const result = await this.db.transaction(async (manager) => {
      await assertEnabled(manager, false, true);
      const row = await this.credential(
        manager,
        value,
        "refresh",
        client.client_id,
        true,
      );
      if (row.consumed_at) {
        await manager.query(
          "UPDATE external_ai_connections SET revoked_at=now() WHERE id=$1",
          [row.connection_id],
        );
        return null;
      }
      const connection = await loadConnection(manager, row.connection_id, true);
      if (
        requestedScopes &&
        (requestedScopes.length !== connection.scopes.length ||
          requestedScopes.some((s) => !connection.scopes.includes(s)))
      )
        throw new InvalidScopeError("기능 변경은 다시 연결해 주세요.");
      await manager.query(
        "UPDATE external_ai_credentials SET consumed_at=now() WHERE hash=$1",
        [row.hash],
      );
      return this.issue(manager, connection);
    });
    if (!result)
      throw new InvalidGrantError(
        "재사용한 접근 자격으로 연결이 해제되었습니다.",
      );
    return result;
  }
  async verifyAccessToken(value: string): Promise<AuthInfo> {
    await assertEnabled(this.db);
    let row;
    try {
      row = await this.credential(this.db, value, "access");
    } catch {
      // The SDK writes this message into WWW-Authenticate: keep it ASCII.
      throw new InvalidTokenError("Access credential invalid or expired");
    }
    if (row.consumed_at)
      throw new InvalidTokenError("Access credential revoked");
    const connection = await loadConnection(this.db, row.connection_id);
    return {
      token: value,
      clientId: connection.clientId,
      scopes: connection.scopes,
      resource: this.resource,
      expiresAt: Math.floor(row.expires_at.getTime() / 1000),
      extra: { connectionId: connection.id },
    };
  }
  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ) {
    await this.db.query(
      `UPDATE external_ai_connections SET revoked_at=now() WHERE client_id=$1 AND id IN
      (SELECT connection_id FROM external_ai_credentials WHERE hash=$2 AND client_id=$1)`,
      [client.client_id, tokenHash(request.token)],
    );
  }
  async cleanup() {
    await this.db.transaction(async (db) => {
      await db.query("DELETE FROM external_ai_requests WHERE expires_at<now()");
      await db.query(
        "DELETE FROM external_ai_credentials WHERE expires_at<now()",
      );
      await db.query(
        "DELETE FROM external_ai_connections WHERE expires_at<now() OR revoked_at IS NOT NULL",
      );
      await db.query(`DELETE FROM external_ai_clients c WHERE c.created_at<now()-interval '30 days'
        AND NOT EXISTS(SELECT 1 FROM external_ai_connections g WHERE g.client_id=c.id)
        AND NOT EXISTS(SELECT 1 FROM external_ai_credentials t WHERE t.client_id=c.id)`);
      await db.query(
        `DELETE FROM external_ai_errors WHERE created_at<now()-interval '1 year'`,
      );
    });
  }
}
