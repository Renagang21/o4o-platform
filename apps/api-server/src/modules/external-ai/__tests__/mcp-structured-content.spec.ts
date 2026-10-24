import express from "express";
import request from "supertest";
import type { DataSource } from "typeorm";
import { createMcpRouter } from "../mcp/mcp.routes.js";
import type { ExternalAiOAuthProvider } from "../auth/oauth-provider.js";

// get_material / get_content_draft return an object with a top-level `content` key.
// Sent only as JSON text, ChatGPT handed the model {} — the result must also be structuredContent.
const material = { id: "m1", title: "자료", content: "<p>본문</p>", notice: "참고 자료입니다." };
jest.mock("../tools/tool.service.js", () => ({
  ExternalAiToolService: class {
    execute = jest.fn(async () => material);
  },
}));
jest.mock("../settings/settings.service.js", () => ({ assertEnabled: jest.fn(async () => undefined) }));

const provider = {
  config: { issuer: new URL("http://127.0.0.1/"), webOrigin: new URL("https://web.example.invalid") },
  verifyAccessToken: async (token: string) => ({
    token,
    clientId: "client-1",
    scopes: ["o4o:read"],
    expiresAt: Math.floor(Date.now() / 1000) + 600,
    extra: { connectionId: "connection-1" },
  }),
} as unknown as ExternalAiOAuthProvider;

const uuid = "00000000-0000-4000-8000-000000000001";

function callTool(name: string) {
  const server = express();
  server.use(express.json());
  server.use(createMcpRouter({} as DataSource, provider));
  return request(server)
    .post("/")
    .set("Host", "127.0.0.1")
    .set("Authorization", "Bearer token-1")
    .set("Accept", "application/json, text/event-stream")
    .send({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: { workspaceId: `store:${uuid}`, materialId: uuid } },
    });
}

describe("MCP tool results", () => {
  it("return the result as structuredContent and as JSON text", async () => {
    const res = await callTool("get_material");
    expect(res.status).toBe(200);
    expect(res.body.result.isError).toBeFalsy();
    expect(res.body.result.structuredContent).toEqual(material);
    expect(JSON.parse(res.body.result.content[0].text)).toEqual(material);
  });
});
