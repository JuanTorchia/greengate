/**
 * Auth0 Client-Initiated Backchannel Authentication (CIBA) helpers.
 *
 * Flow:
 *   1. initiateCiba({ loginHint, bindingMessage, scope, audience })
 *        → POST {tenant}/bc-authorize
 *        → returns { auth_req_id, expires_in, interval }
 *   2. Auth0 pushes the binding_message to the user's registered authenticator
 *      (Auth0 Guardian, by default).
 *   3. pollCibaToken({ authReqId })
 *        → POST {tenant}/oauth/token with
 *          grant_type=urn:openid:params:grant-type:ciba
 *        → pending | approved | denied | expired.
 *
 * VERIFY: endpoint paths, grant_type URN, error codes, and whether
 * Auth0 Guardian actually renders `binding_message` (if not, fall back
 * to MFA OOB Push per PLAN.md Risk #1).
 *   https://auth0.com/docs/get-started/authentication-and-authorization-flow/client-initiated-backchannel-authentication-flow
 *   https://auth0.com/docs/secure/multi-factor-authentication/authenticate-using-ropg-flow-with-mfa
 */

export interface CibaInitiateInput {
  loginHint: string;
  bindingMessage: string;
  scope: string;
  audience?: string;
}

export interface CibaInitiateResult {
  authReqId: string;
  expiresInSeconds: number;
  intervalSeconds: number;
}

export type CibaPollStatus =
  | { status: "pending" }
  | {
      status: "approved";
      accessToken: string;
      idToken?: string;
      rawResponse: unknown;
    }
  | { status: "denied"; error: string }
  | { status: "expired" };

export async function initiateCiba(_input: CibaInitiateInput): Promise<CibaInitiateResult> {
  throw new Error("not implemented");
}

export async function pollCibaToken(_authReqId: string): Promise<CibaPollStatus> {
  throw new Error("not implemented");
}
