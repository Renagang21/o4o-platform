import express from "express";
import request from "supertest";
import { sqlInjectionDetection } from "../securityMiddleware.js";
import { logSecurityEvent } from "../../services/SecurityAuditService.js";
jest.mock("../../services/SecurityAuditService.js", () => ({
  isIPBlocked: jest.fn(() => false),
  logSecurityEvent: jest.fn(),
  securityAuditService: {},
}));
const proof = "a".repeat(20) + "--" + "b".repeat(21);
function app(beforeBody = false) {
  const server = express();
  if (beforeBody) server.use(sqlInjectionDetection);
  server.use(express.json());
  if (!beforeBody) server.use(sqlInjectionDetection);
  // Actual OAuth/identity/PKCE validation remains mandatory, never authenticated by this heuristic.
  server.use((req, res) =>
    res
      .status(401)
      .json({
        code: "DELEGATION_PROOF_REQUIRED",
        query: req.query,
        body: req.body,
      }),
  );
  return server;
}
describe("external OAuth proof handling in the common SQL heuristic", () => {
  beforeEach(() => jest.clearAllMocks());
  it.each([false, true])(
    "preserves generated query proofs (security before parser=%s)",
    async (beforeBody) => {
      const auth = await request(app(beforeBody))
        .get("/authorize")
        .query({ code_challenge: proof, state: proof });
      expect(auth.status).toBe(401);
      expect(auth.body.query.code_challenge).toBe(proof);
      const consent = await request(app(beforeBody))
        .get("/api/external-ai/consent")
        .query({ request: proof });
      expect(consent.status).toBe(401);
      expect(consent.body.query.request).toBe(proof);
      expect(logSecurityEvent).not.toHaveBeenCalled();
    },
  );
  it.each(["code", "refresh_token", "code_verifier"])(
    "preserves bounded token exchange %s",
    async (field) => {
      const result = await request(app())
        .post("/token")
        .send({ [field]: proof });
      expect(result.status).toBe(401);
      expect(result.body.body[field]).toBe(proof);
    },
  );
  it.each(["/api/external-ai/consent", "/api/external-ai/consent/deny"])(
    "preserves one-use request for %s",
    async (path) => {
      expect(
        (await request(app()).post(path).send({ request: proof })).status,
      ).toBe(401);
    },
  );
  it.each([
    ["/api/v1/users", "request", proof],
    ["/authorize", "search", proof],
    ["/authorize", "code_challenge", proof + "--"],
    ["/authorize", "state", "--" + "x".repeat(2048)],
    ["/api/external-ai/consent", "request", "'; DROP TABLE users;--"],
  ])(
    "retains rejection outside the precise proof contract: %s %s",
    async (path, field, value) => {
      expect(
        (
          await request(app())
            .get(path)
            .query({ [field]: value })
        ).status,
      ).toBe(400);
    },
  );
  it("blocks unrelated suspicious fields without logging any proof or body values", async () => {
    const result = await request(app())
      .post("/token")
      .send({ code: proof, name: "select value from users" });
    expect(result.status).toBe(400);
    const logged = JSON.stringify((logSecurityEvent as jest.Mock).mock.calls);
    expect(logged).not.toContain(proof);
    expect(logged).not.toContain("select value from users");
  });
});
