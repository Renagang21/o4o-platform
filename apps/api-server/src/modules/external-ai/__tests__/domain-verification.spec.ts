import express from "express";
import request from "supertest";
import {
  createExternalAiDomainVerificationRouter,
  OPENAI_APPS_CHALLENGE_TOKEN,
} from "../domain-verification.js";

const path = "/.well-known/openai-apps-challenge";
function app(issuer: URL | undefined) {
  const server = express();
  server.use(createExternalAiDomainVerificationRouter(issuer));
  server.get("/unrelated", (_req, res) => res.sendStatus(204));
  return server;
}
const issuer = new URL("https://api.neture.co.kr/");

describe("public OpenAI ownership challenge", () => {
  it("serves the exact plain-text token without login or a trailing newline", async () => {
    const response = await request(app(issuer))
      .get(path)
      .set("Host", issuer.hostname);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^text\/plain/);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.text).toBe(OPENAI_APPS_CHALLENGE_TOKEN);
  });

  it("does not assert ownership for another host", async () => {
    const response = await request(app(issuer))
      .get(path)
      .set("Host", "other.example.invalid");
    expect(response.status).toBe(404);
    expect(response.text).not.toContain(OPENAI_APPS_CHALLENGE_TOKEN);
  });

  it("does not expose the challenge without the canonical issuer configuration", async () => {
    expect((await request(app(undefined)).get(path)).status).toBe(404);
  });

  it("does not accept writes to the ownership endpoint", async () => {
    expect(
      (await request(app(issuer)).post(path).set("Host", issuer.hostname)).status,
    ).toBe(404);
  });

  it("leaves unrelated routes available", async () => {
    expect((await request(app(issuer)).get("/unrelated")).status).toBe(204);
  });
});
