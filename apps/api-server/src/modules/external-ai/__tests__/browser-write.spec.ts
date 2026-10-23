import {
  createBrowserWriteGuard,
  createAdminBrowserWriteGuard,
  externalAiAccountOrigins,
} from "../auth/browser-write.middleware.js";
import type { Request, Response } from "express";

const origin = "https://account.example.invalid";
function request(
  method: string,
  providedOrigin?: string,
  json = false,
  origins: readonly string[] = [origin],
  guard = createBrowserWriteGuard(origins),
) {
  const req = {
    method,
    headers: { origin: providedOrigin },
    is: jest.fn(() => json),
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  guard(req as unknown as Request, res as unknown as Response, next);
  return { res, next };
}
describe("delegation browser write boundary", () => {
  it.each(externalAiAccountOrigins)(
    "rejects admin configuration writes from account host %s",
    (host) => {
      const result = request(
        "PUT",
        host,
        true,
        [],
        createAdminBrowserWriteGuard(),
      );
      expect(result.res.status).toHaveBeenCalledWith(403);
      expect(result.next).not.toHaveBeenCalled();
    },
  );
  it("allows configuration writes only from the exact configured admin origin", () => {
    for (const host of [
      "https://admin.neture.co.kr",
      "http://localhost:4173",
    ]) {
      expect(
        request("PUT", host, true, [], createAdminBrowserWriteGuard(host)).next,
      ).toHaveBeenCalled();
      expect(
        request(
          "PUT",
          `${host}.attacker.invalid`,
          true,
          [],
          createAdminBrowserWriteGuard(host),
        ).res.status,
      ).toHaveBeenCalledWith(403);
    }
  });
  it.each(externalAiAccountOrigins)(
    "allows account connection revocation from %s",
    (host) => {
      expect(
        request("DELETE", host, false, externalAiAccountOrigins).next,
      ).toHaveBeenCalled();
      expect(
        request(
          "DELETE",
          `${host}.attacker.invalid`,
          false,
          externalAiAccountOrigins,
        ).res.status,
      ).toHaveBeenCalledWith(403);
    },
  );
  it("allows a legitimate bodyless DELETE used by Axios", () => {
    expect(request("DELETE", origin).next).toHaveBeenCalled();
  });
  it("rejects cross-site and missing-origin revocation", () => {
    for (const value of [undefined, "https://foreign.example.invalid"]) {
      const result = request("DELETE", value);
      expect(result.next).not.toHaveBeenCalled();
      expect(result.res.status).toHaveBeenCalledWith(403);
    }
  });
  it("requires JSON on consent and configuration writes", () => {
    for (const method of ["POST", "PUT", "PATCH"]) {
      expect(request(method, origin).next).not.toHaveBeenCalled();
      expect(request(method, origin, true).next).toHaveBeenCalled();
    }
  });
  it("allows authenticated reads without browser Origin", () => {
    expect(request("GET").next).toHaveBeenCalled();
  });
});
