/**
 * Auth0 Management API access-token provider.
 *
 * OAuth2 client_credentials grant against {tenant}/oauth/token with
 * audience={tenant}/api/v2/. Tokens are cached in-process and refreshed
 * when less than SKEW_SECONDS remain before expiry.
 *
 * Use `mgmtFetch` from ./mgmt-client instead of calling this directly
 * unless you have a specific reason (e.g. rotation tooling).
 */

const SKEW_SECONDS = 5 * 60;

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;
let inflight: Promise<string> | null = null;

function mgmtCreds(): { domain: string; id: string; secret: string; audience: string } {
  const domain = process.env.AUTH0_DOMAIN;
  const id = process.env.AUTH0_MGMT_CLIENT_ID;
  const secret = process.env.AUTH0_MGMT_CLIENT_SECRET;
  if (!domain || !id || !secret) {
    throw new Error(
      "AUTH0_DOMAIN, AUTH0_MGMT_CLIENT_ID, AUTH0_MGMT_CLIENT_SECRET must all be set",
    );
  }
  return { domain, id, secret, audience: `https://${domain}/api/v2/` };
}

async function requestNewToken(): Promise<string> {
  const { domain, id, secret, audience } = mgmtCreds();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
    audience,
  });

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok || typeof json.access_token !== "string") {
    throw new Error(
      `Management API token request failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }

  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 86400;
  cache = {
    token: json.access_token,
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
  };
  return cache.token;
}

export async function getManagementToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cache && cache.expiresAt - SKEW_SECONDS > now) {
    return cache.token;
  }
  if (inflight) return inflight;

  inflight = requestNewToken().finally(() => {
    inflight = null;
  });
  return inflight;
}

export function invalidateManagementToken(): void {
  cache = null;
}

export function managementApiBaseUrl(): string {
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) throw new Error("AUTH0_DOMAIN is not set");
  return `https://${domain}/api/v2`;
}
