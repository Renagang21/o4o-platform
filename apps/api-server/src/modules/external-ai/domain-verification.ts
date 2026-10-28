import { Router } from "express";

// Public ownership challenge supplied by the OpenAI submission portal.
// This is intentionally public, and is unrelated to OAuth or account credentials.
export const OPENAI_APPS_CHALLENGE_TOKEN =
  "0V3Pwx2s8v1liCfPBExbDEOHyPxcgVveXxTvp9qbkTY";

export function createExternalAiDomainVerificationRouter(issuer?: URL) {
  const router = Router();
  if (!issuer) return router;

  router.get("/.well-known/openai-apps-challenge", (req, res, next) => {
    if (req.hostname !== issuer.hostname) {
      next();
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.type("text/plain").send(OPENAI_APPS_CHALLENGE_TOKEN);
  });
  return router;
}
