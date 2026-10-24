import type { Request, Response, NextFunction } from "express";
import type { OAuthMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";

/**
 * RFC 9207 authorization server issuer identification.
 *
 * ChatGPT uses its stable connector redirect only when the authorization
 * server advertises this and returns the same `iss` on every authorization
 * response, success and error alike.
 */
export const withIssuerIdentification = (
  metadata: OAuthMetadata,
): OAuthMetadata & { authorization_response_iss_parameter_supported: true } => ({
  ...metadata,
  authorization_response_iss_parameter_supported: true,
});

/** Adds `iss` to a redirect back to one of the configured client redirect URIs. */
export function withIssuer(
  location: string,
  issuer: URL,
  redirectUris: readonly string[],
): string {
  let target: URL;
  try {
    target = new URL(location);
  } catch {
    return location;
  }
  const isClientRedirect = redirectUris.some((value) => {
    const registered = new URL(value);
    return (
      registered.origin === target.origin &&
      registered.pathname === target.pathname
    );
  });
  if (!isClientRedirect) return location;
  target.searchParams.set("iss", issuer.href);
  return target.href;
}

/**
 * The SDK authorize handler redirects its own validation errors back to the
 * client. Wrap `res.redirect` there so those responses also carry `iss`.
 * Redirects to the O4O consent page are left untouched.
 */
export function issuerOnAuthorizationRedirects(
  issuer: URL,
  redirectUris: readonly string[],
) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const redirect = res.redirect.bind(res) as (...args: unknown[]) => void;
    res.redirect = ((...args: unknown[]) => {
      const index = typeof args[0] === "number" ? 1 : 0;
      if (typeof args[index] === "string")
        args[index] = withIssuer(args[index] as string, issuer, redirectUris);
      redirect(...args);
    }) as Response["redirect"];
    next();
  };
}
