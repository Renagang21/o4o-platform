import type { Request, Response, NextFunction } from "express";

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
