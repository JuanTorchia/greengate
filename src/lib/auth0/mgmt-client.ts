/**
 * Typed Auth0 Management API client.
 *
 * Wraps fetch with automatic bearer-token injection. On 401 responses the
 * cached token is invalidated and the request is retried once, covering the
 * rare case where the token expires between client-side check and arrival.
 */

import {
  getManagementToken,
  invalidateManagementToken,
  managementApiBaseUrl,
} from "./mgmt";

export interface Auth0Action {
  id: string;
  name: string;
  supported_triggers: Array<{ id: string; version: string }>;
  code: string;
  deployed: boolean;
  status: string;
  updated_at: string;
}

export interface Auth0TriggerBinding {
  id: string;
  trigger_id: string;
  display_name: string;
  action: { id: string; name: string };
}

export interface MgmtFetchOptions extends Omit<RequestInit, "body"> {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

async function doFetch(path: string, opts: MgmtFetchOptions, token: string): Promise<Response> {
  const url = new URL(`${managementApiBaseUrl()}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers = new Headers(opts.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");

  return fetch(url, {
    ...opts,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export async function mgmtFetch<T>(path: string, opts: MgmtFetchOptions = {}): Promise<T> {
  let token = await getManagementToken();
  let res = await doFetch(path, opts, token);

  if (res.status === 401) {
    invalidateManagementToken();
    token = await getManagementToken();
    res = await doFetch(path, opts, token);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Management API ${opts.method ?? "GET"} ${path} failed (${res.status}): ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function listActions(params: { triggerId?: string; deployed?: boolean } = {}) {
  return mgmtFetch<{ total: number; actions: Auth0Action[] }>("/actions/actions", {
    query: { triggerId: params.triggerId, deployed: params.deployed },
  });
}

export function getTriggerBindings(triggerId: string) {
  return mgmtFetch<{ bindings: Auth0TriggerBinding[] }>(
    `/actions/triggers/${triggerId}/bindings`,
  );
}

export function updateTriggerBindings(
  triggerId: string,
  bindings: Array<{ ref: { type: "action_id" | "action_name"; value: string }; display_name?: string }>,
) {
  return mgmtFetch<{ bindings: Auth0TriggerBinding[] }>(
    `/actions/triggers/${triggerId}/bindings`,
    { method: "PATCH", body: { bindings } },
  );
}
