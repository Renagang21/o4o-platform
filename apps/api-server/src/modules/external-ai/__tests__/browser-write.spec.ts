import { createBrowserWriteGuard } from "../auth/browser-write.middleware.js";
import type { Request, Response } from "express";

const origin = "https://account.example.invalid";
function request(method: string, providedOrigin?: string, json = false) {
  const req = {
    method,
    headers: { origin: providedOrigin },
    is: jest.fn(() => json),
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  createBrowserWriteGuard([origin])(
    req as unknown as Request,
    res as unknown as Response,
    next,
  );
  return { res, next };
}
describe("delegation browser write boundary", () => {
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
