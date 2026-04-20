import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Keep the session cookie under the 3.5KB chunk threshold:
// omit offline_access so the refresh token isn't stored in the cookie.
// Access tokens still live 24h (Auth0 default) which is enough for the demo.
// If we need longer sessions or API calls post-24h we can move to a stateful
// session store — out of scope for the hackathon.
export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: "openid profile email",
  },
});
