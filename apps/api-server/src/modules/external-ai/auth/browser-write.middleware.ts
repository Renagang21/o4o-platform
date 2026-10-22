import type { Request, Response, NextFunction } from "express";

/** Exact deployed origins exposing the shared Neture account settings page. */
export const externalAiAccountOrigins = [
  "https://neture.co.kr",
  "https://www.neture.co.kr",
  "https://supplier.neture.co.kr",
  "https://community.neture.co.kr",
  "https://funding.neture.co.kr",
  "https://carepharm.neture.co.kr",
] as const;

/** User account origins must never authorize global management writes. */
export function createAdminBrowserWriteGuard(
  origin = "https://admin.neture.co.kr",
) {
  return createBrowserWriteGuard([origin]);
}

/** Existing browser-session authentication runs first. Bodyless DELETE still requires a trusted Origin. */
export function createBrowserWriteGuard(origins: readonly string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const needsBody = ["POST", "PUT", "PATCH"].includes(req.method);
    if (
      req.method !== "GET" &&
      (!origins.includes(req.headers.origin ?? "") ||
        (needsBody && !req.is("application/json")))
    ) {
      res.status(403).json({ success: false, code: "BROWSER_ORIGIN_REQUIRED" });
      return;
    }
    next();
  };
}
