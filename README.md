# Notificator Dashboard

The web companion for the [Notificator Project](https://notificator-project.com). The dashboard is being built for the operational parts of a Notificator account: alerts, API keys, connected devices, and account preferences.

The dashboard connects to the same Supabase account data used by the Notificator mobile app. It provides a focused browser interface for notifications, devices, API keys, and account preferences.

**[Open the web dashboard (beta)](https://dashboard.notificator-project.com)** ·
[User guide](https://docs.notificator-project.com/guides/web-dashboard/)

Create an account in your browser or sign in with your existing Notificator
credentials. No app installation is required for the web inbox, API keys, or
device monitoring. Mobile push still requires the mobile app and permission.

## Development

Requires Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` for local authentication. Use the Supabase project URL and publishable key. Never commit `.env`, a Supabase secret key, or a service-role key.

## Checks

```bash
npm ci
npm audit --omit=dev
npm run lint
npm run build
```

The same checks run for pull requests and pushes to `main`. The workflow has
read-only repository permissions and does not receive deployment credentials.

## Netlify deployment

The dashboard is currently a beta release (`v0.1.0`). Before deploying, configure
these required environment variables in Netlify, using the values documented in
`.env.example`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

The hosted service URLs already have production defaults. Add these only when a
deployment needs to override those defaults:

- `NOTIFICATOR_API_URL`
- `WPNOTIF_API_URL`
- `FIRMWARE_MANIFEST_URL`

Only the Supabase publishable key belongs here. Never configure a Supabase secret
or service-role key in the dashboard. Supabase Authentication must also allow the
production dashboard URL and its `/auth/callback` route as redirect URLs.

The dashboard expects an existing Notificator Supabase schema with Row Level
Security enabled. It does not provision database tables or policies. Verify
cross-account isolation before connecting a production deployment.

Netlify uses `npm run build` and publishes `dist`. Vinext renders the application
through Nitro's Netlify Functions adapter, including server-rendered pages and API
routes. Run the lint and production build commands above before publishing.

## Architecture

- [Architecture and trust boundaries](docs/ARCHITECTURE.md)
- [MVP scope and milestones](docs/MVP.md)

## Status

Public beta. Supabase registration, email confirmation, sign-in, recovery, password update, MFA challenge, protected routes, and sign-out are implemented. The dashboard loads live account counts and decrypted notification details, supports search, filtering, and pagination, and lets users change read state, mark all as read, or delete notifications. It can add, pause, resume, and safely remove paused devices; automatically refresh retained MQTT status while connected; provide signed firmware checks and OTA controls for Base and Touch; and manage device metadata, profile, security, and delivery preferences.

API keys can be created for WordPress, Strapi, or Public API/Node.js integrations, optionally restricted to allowed domains, revoked, and permanently removed after revocation. The key list includes creation and last-used information. A newly generated secret is returned once and is never retrieved again by the key list.

Active API-key names and allowed domains can be edited without changing their secret or integration type.

Browser MQTT synchronization and commands use the HiveMQ settings kept in the current browser session. Device identity, weather location, timezone, idle-display defaults, firmware checks, and signed OTA updates can be managed in the dashboard. Live brightness, volume, and immediate display-mode delivery remain mobile-only.

HiveMQ Cloud settings can be entered and tested from the dashboard. Non-secret connection metadata stays in local browser storage, while the password is held only in the current tab session. Connection tests send credentials transiently through the authenticated dashboard route and do not persist them in Supabase or the hosted API.

Authenticated dashboard pages refresh their server-rendered account data every 15 seconds while visible and immediately after returning to a backgrounded tab. This updates notification lists and unread counts without a full browser reload.

## License

Released under the [MIT License](LICENSE).
