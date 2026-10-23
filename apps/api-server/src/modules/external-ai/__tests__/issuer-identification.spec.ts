import express from "express";
import request from "supertest";
import type { DataSource } from "typeorm";
import { createExternalAiRoutes } from "../external-ai.routes.js";
import type { ConnectionConfig } from "../auth/oauth-provider.js";
import { withIssuer } from "../auth/issuer-identification.js";

// Only the OAuth surface is under test; keep domain adapters out of the module graph.
jest.mock("../adapters/registry.js", () => ({ AdapterRegistry: class {} }));
jest.mock("../tools/tool.service.js", () => ({ ExternalAiToolService: class {} }));

const redirectUri = "https://chatgpt.example.invalid/connector_platform_oauth_redirect";
const config: ConnectionConfig = {
  issuer: new URL("https://api.example.invalid"),
  webOrigin: new URL("https://web.example.invalid"),
  adminOrigin: new URL("https://admin.example.invalid"),
  redirectUris: [redirectUri],
  credentialKey: "0".repeat(64),
};
const db = {
  query: jest.fn(async (sql: string) =>
    sql.includes("FROM external_ai_clients")
      ? [
          {
            metadata: {
              client_id: "client-1",
              redirect_uris: [redirectUri],
              token_endpoint_auth_method: "none",
            },
            secret_cipher: null,
          },
        ]
      : [],
  ),
} as unknown as DataSource;

function app() {
  const server = express();
  server.use(createExternalAiRoutes(db, config).router);
  return server;
}

function authorize(query: Record<string, string>) {
  return request(app())
    .get("/authorize")
    .query({
      client_id: "client-1",
      redirect_uri: redirectUri,
      response_type: "code",
      code_challenge: "x".repeat(43),
      code_challenge_method: "S256",
      ...query,
    });
}

function clientRedirect(location: string) {
  const url = new URL(location);
  expect(url.origin + url.pathname).toBe(redirectUri);
  expect(url.searchParams.get("iss")).toBe("https://api.example.invalid/");
  return url.searchParams;
}

describe("RFC 9207 issuer identification", () => {
  it("advertises iss support with the same issuer as the protected resource", async () => {
    const as = await request(app()).get("/.well-known/oauth-authorization-server");
    const pr = await request(app()).get(
      "/.well-known/oauth-protected-resource/api/external-ai/mcp",
    );
    expect(as.status).toBe(200);
    expect(as.body.authorization_response_iss_parameter_supported).toBe(true);
    expect(as.body.code_challenge_methods_supported).toEqual(["S256"]);
    expect(as.body.registration_endpoint).toBe("https://api.example.invalid/register");
    expect(pr.body.authorization_servers).toEqual([as.body.issuer]);
  });

  it("returns iss on authorization error redirects to the client", async () => {
    const res = await authorize({ code_challenge_method: "plain", state: "s1" });
    expect(res.status).toBe(302);
    expect(clientRedirect(res.headers.location).get("error")).toBe("invalid_request");
  });

  it("returns iss with state when the provider rejects a valid request", async () => {
    // Connection settings are absent in the mocked database, so the provider refuses.
    const res = await authorize({ state: "s1" });
    expect(res.status).toBe(302);
    const params = clientRedirect(res.headers.location);
    expect(params.get("error")).toBeTruthy();
    expect(params.get("state")).toBe("s1");
  });

  it("does not answer an unregistered redirect URI with a redirect", async () => {
    const res = await authorize({ redirect_uri: "https://attacker.example.invalid/cb" });
    expect(res.status).toBe(400);
    expect(res.headers.location).toBeUndefined();
  });

  it("adds iss only to configured client redirects", () => {
    expect(
      new URL(withIssuer(`${redirectUri}?code=c`, config.issuer, [redirectUri]))
        .searchParams.get("iss"),
    ).toBe("https://api.example.invalid/");
    const consent = "https://web.example.invalid/external-ai/connect?request=r";
    expect(withIssuer(consent, config.issuer, [redirectUri])).toBe(consent);
  });
});

describe("O4O consent responses", () => {
  it("returns iss with the denial redirect", async () => {
    const { ExternalAiOAuthProvider } = await import("../auth/oauth-provider.js");
    const manager = {
      query: jest.fn(async (sql: string) =>
        sql.includes("kind='pending'")
          ? [{ hash: "h", client_id: "client-1", data: { redirectUri, state: "s2" } }]
          : [],
      ),
    };
    const store = {
      transaction: (fn: (m: typeof manager) => unknown) => fn(manager),
    } as unknown as DataSource;
    const provider = new ExternalAiOAuthProvider(store, config, async () => {});
    const location = new URL(await provider.deny("r".repeat(43)));
    expect(location.searchParams.get("error")).toBe("access_denied");
    expect(location.searchParams.get("state")).toBe("s2");
    expect(location.searchParams.get("iss")).toBe("https://api.example.invalid/");
  });
});
