import { Errors, createClient } from "@farcaster/quick-auth";
import type { AppConfig } from "./config";

export class AuthError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Verifies a Quick Auth JWT and returns the verified FID. Must throw AuthError on failure. */
export type Verifier = (token: string, domain: string) => Promise<{ fid: number }>;

/**
 * Production verifier: checks the Quick Auth JWT signature, issuer, expiry and audience
 * (domain) using the official @farcaster/quick-auth package. The FID is the JWT "sub".
 */
export const quickAuthVerifier: Verifier = async (token, domain) => {
  const client = createClient();
  try {
    const payload = await client.verifyJwt({ token, domain });
    const fid = Number(payload.sub);
    if (!Number.isSafeInteger(fid) || fid <= 0) {
      throw new AuthError(401, "unauthorized", "Invalid session.");
    }
    return { fid };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    if (err instanceof Errors.InvalidTokenError) {
      throw new AuthError(401, "unauthorized", "Your session is invalid or expired. Reopen the app.");
    }
    throw new AuthError(503, "auth_unavailable", "Sign-in could not be verified right now. Try again shortly.");
  }
};

/**
 * Authenticates a request. Returns the verified FID or throws AuthError.
 *
 * The development bypass (x-dev-fid header) only works when config.devAuthEnabled is true,
 * which requires NODE_ENV !== "production" AND DEV_AUTH_ENABLED=true.
 */
export async function authenticate(
  req: Request,
  deps: { config: AppConfig; verifier: Verifier }
): Promise<{ fid: number }> {
  const { config, verifier } = deps;

  if (config.devAuthEnabled) {
    const dev = req.headers.get("x-dev-fid");
    if (dev) {
      const fid = Number(dev);
      if (Number.isSafeInteger(fid) && fid > 0) return { fid };
      throw new AuthError(401, "unauthorized", "Invalid development identity.");
    }
  }

  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    throw new AuthError(401, "unauthorized", "Sign in through a Farcaster client to use this app.");
  }
  if (!config.appDomain) {
    throw new AuthError(500, "server_misconfigured", "The server is missing NEXT_PUBLIC_APP_URL.");
  }
  return verifier(match[1], config.appDomain);
}
