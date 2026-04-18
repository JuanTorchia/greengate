/**
 * Auth0 Client-Initiated Backchannel Authentication (CIBA) helpers.
 *
 *   1. initiateCiba(...)     → POST {tenant}/bc-authorize  → auth_req_id
 *   2. Auth0 pushes the binding_message to the user's Guardian device.
 *   3. pollCibaToken(authReqId) → POST {tenant}/oauth/token → pending | approved | denied | expired
 *
 * Verified end-to-end on tenant `greengate.us.auth0.com` (M2).
 */

const CIBA_GRANT_TYPE = "urn:openid:params:grant-type:ciba";

function tenantBaseUrl(): string {
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain) throw new Error("AUTH0_DOMAIN is not set");
  return `https://${domain}`;
}

function cibaClientCreds(): { id: string; secret: string; audience: string } {
  const id = process.env.AUTH0_CIBA_CLIENT_ID;
  const secret = process.env.AUTH0_CIBA_CLIENT_SECRET;
  const audience = process.env.AUTH0_CIBA_AUDIENCE;
  if (!id || !secret || !audience) {
    throw new Error(
      "AUTH0_CIBA_CLIENT_ID, AUTH0_CIBA_CLIENT_SECRET, AUTH0_CIBA_AUDIENCE must all be set",
    );
  }
  return { id, secret, audience };
}

export interface CibaInitiateInput {
  loginHint: string;
  bindingMessage: string;
  scope: string;
}

export interface CibaInitiateResult {
  authReqId: string;
  expiresInSeconds: number;
  intervalSeconds: number;
}

export type CibaPollStatus =
  | { status: "pending"; slowDown?: boolean; retryAfterSeconds?: number }
  | {
      status: "approved";
      accessToken: string;
      idToken?: string;
      rawResponse: Record<string, unknown>;
    }
  | { status: "denied"; error: string }
  | { status: "expired" };

export async function initiateCiba(input: CibaInitiateInput): Promise<CibaInitiateResult> {
  const { id, secret, audience } = cibaClientCreds();
  const body = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    audience,
    scope: input.scope,
    binding_message: input.bindingMessage,
    login_hint: input.loginHint,
  });

  const res = await fetch(`${tenantBaseUrl()}/bc-authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      `CIBA /bc-authorize failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }

  return {
    authReqId: String(json.auth_req_id),
    expiresInSeconds: Number(json.expires_in ?? 0),
    intervalSeconds: Number(json.interval ?? 5),
  };
}

export async function pollCibaToken(authReqId: string): Promise<CibaPollStatus> {
  const { id, secret } = cibaClientCreds();
  const body = new URLSearchParams({
    grant_type: CIBA_GRANT_TYPE,
    client_id: id,
    client_secret: secret,
    auth_req_id: authReqId,
  });

  const res = await fetch(`${tenantBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as Record<string, unknown>;

  if (res.ok && typeof json.access_token === "string") {
    return {
      status: "approved",
      accessToken: json.access_token,
      idToken: typeof json.id_token === "string" ? json.id_token : undefined,
      rawResponse: json,
    };
  }

  const error = typeof json.error === "string" ? json.error : "unknown_error";
  switch (error) {
    case "authorization_pending":
      return { status: "pending" };
    case "slow_down": {
      // Auth0 embeds the cooldown in the description: "Try again in N seconds."
      const desc = typeof json.error_description === "string" ? json.error_description : "";
      const match = desc.match(/(\d+)\s*seconds?/i);
      const retryAfterSeconds = match?.[1] ? Number.parseInt(match[1], 10) : 10;
      return { status: "pending", slowDown: true, retryAfterSeconds };
    }
    case "expired_token":
      return { status: "expired" };
    case "access_denied":
      return { status: "denied", error };
    default:
      return { status: "denied", error: `${error}: ${JSON.stringify(json)}` };
  }
}

export function buildLoginHint(auth0Sub: string): string {
  const issuer = `${tenantBaseUrl()}/`;
  return JSON.stringify({ format: "iss_sub", iss: issuer, sub: auth0Sub });
}
